/**
 * Google Gemini provider.
 *
 *   AI_PROVIDER=gemini
 *   GEMINI_API_KEY=...
 *   AI_MODEL=gemini-2.0-flash-exp        # optional text default
 *   AI_VISION_MODEL=gemini-2.0-flash-exp # optional vision default
 *   AI_EMBEDDING_MODEL=text-embedding-004
 *
 * Pure REST via fetch. Gemini's API lives at generativelanguage.googleapis.com
 * and uses a `contents` array of `{ role, parts: [{ text } | { inlineData } | ...] }`.
 *
 * System instructions go in a separate `system_instruction` field — the
 * provider handles the translation.
 *
 * Tool calling uses `tools: [{ functionDeclarations }]` on the request
 * and `parts: [{ functionCall }]` on the response. Tool replies come
 * back as a user turn with `parts: [{ functionResponse }]`. The
 * provider translates the unified tool/result shape to/from these.
 *
 * Free tier is generous and multimodal handling is excellent. Great
 * default when cost matters and you want strong multimodal + long-
 * context support.
 */
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  AiProviderNotConfiguredError,
  AnalyzeImageInput,
  ChatMessage,
  GenerateEmbeddingInput,
  GenerateEmbeddingResult,
  GenerateTextInput,
  GenerateTextResult,
  NormalizedToolCall,
  StopReason,
  ToolChoice,
  ToolDefinition,
} from './ai-provider.interface';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | {
      functionResponse: {
        name: string;
        response: Record<string, unknown>;
      };
    };

type GeminiContent = {
  role: 'user' | 'model';
  parts: GeminiPart[];
};

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini' as const;
  private readonly logger = new Logger('GeminiProvider');

  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly defaultVisionModel: string;
  private readonly defaultEmbeddingModel: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('GEMINI_API_KEY', '');
    this.defaultModel = config.get<string>('AI_MODEL', 'gemini-2.0-flash-exp');
    this.defaultVisionModel = config.get<string>('AI_VISION_MODEL', this.defaultModel);
    this.defaultEmbeddingModel = config.get<string>('AI_EMBEDDING_MODEL', 'text-embedding-004');

    if (this.isAvailable()) {
      this.logger.log(`Gemini provider configured (model=${this.defaultModel})`);
    } else {
      this.logger.warn('Gemini provider selected but GEMINI_API_KEY missing');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private async api(model: string, endpoint: string, body: any): Promise<any> {
    if (!this.isAvailable()) {
      throw new AiProviderNotConfiguredError('gemini', ['GEMINI_API_KEY']);
    }
    const url = `${GEMINI_API_BASE}/models/${model}:${endpoint}?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini API ${endpoint}(${model}) failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const { system, contents } = translateMessagesToGemini(input.messages);
    const model = input.model ?? this.defaultModel;

    const payload: any = {
      contents,
      generationConfig: {
        temperature: input.temperature ?? 0.7,
        maxOutputTokens: input.maxTokens ?? 2000,
      },
    };
    if (system) payload.system_instruction = system;
    if (input.jsonMode) {
      payload.generationConfig.response_mime_type = 'application/json';
    }
    if (input.tools && input.tools.length > 0) {
      payload.tools = [{ functionDeclarations: input.tools.map(translateToolToGemini) }];
      const tc = translateToolChoiceToGemini(input.toolChoice);
      if (tc !== undefined) payload.toolConfig = { functionCallingConfig: tc };
    }

    const res = (await this.api(model, 'generateContent', payload)) as {
      candidates: Array<{
        content: { parts: GeminiPart[] };
        finishReason?: string;
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const candidate = res.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    const text = parts
      .filter((p): p is { text: string } => 'text' in p && typeof p.text === 'string')
      .map((p) => p.text ?? '')
      .join('');

    const toolCalls = normalizeGeminiToolCalls(parts);
    const stopReason = mapGeminiFinishReason(candidate?.finishReason, toolCalls.length > 0);

    return {
      text,
      model,
      provider: 'gemini',
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
      ...(stopReason ? { stopReason } : {}),
      usage: res.usageMetadata
        ? {
            promptTokens: res.usageMetadata.promptTokenCount,
            completionTokens: res.usageMetadata.candidatesTokenCount,
            totalTokens: res.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  async analyzeImage(input: AnalyzeImageInput): Promise<GenerateTextResult> {
    const model = input.model ?? this.defaultVisionModel;

    // Gemini image parts: either inlineData (base64) or fileData (URL).
    let imagePart: any;
    if (input.image.startsWith('data:')) {
      const m = /^data:([^;]+);base64,(.+)$/.exec(input.image);
      imagePart = {
        inlineData: {
          mimeType: m?.[1] ?? 'image/jpeg',
          data: m?.[2] ?? '',
        },
      };
    } else {
      imagePart = {
        fileData: {
          mimeType: 'image/jpeg',
          fileUri: input.image,
        },
      };
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [imagePart, { text: input.prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: input.maxTokens ?? 2000,
      },
    };

    const res = (await this.api(model, 'generateContent', payload)) as {
      candidates: Array<{ content: { parts: Array<{ text?: string }> } }>;
      usageMetadata?: any;
    };
    const text = res.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

    return {
      text,
      model,
      provider: 'gemini',
      usage: res.usageMetadata
        ? {
            promptTokens: res.usageMetadata.promptTokenCount,
            completionTokens: res.usageMetadata.candidatesTokenCount,
            totalTokens: res.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  async generateEmbedding(input: GenerateEmbeddingInput): Promise<GenerateEmbeddingResult> {
    const model = input.model ?? this.defaultEmbeddingModel;
    const texts = Array.isArray(input.text) ? input.text : [input.text];

    // Gemini embeddings uses a slightly different endpoint
    // batchEmbedContents for multi-text, embedContent for single.
    if (texts.length === 1) {
      const res = (await this.api(model, 'embedContent', {
        content: { parts: [{ text: texts[0] }] },
      })) as { embedding: { values: number[] } };
      return {
        embeddings: [res.embedding.values],
        model,
        provider: 'gemini',
        dimensions: res.embedding.values.length,
      };
    }

    const res = (await this.api(model, 'batchEmbedContents', {
      requests: texts.map((t) => ({
        model: `models/${model}`,
        content: { parts: [{ text: t }] },
      })),
    })) as { embeddings: Array<{ values: number[] }> };

    return {
      embeddings: res.embeddings.map((e) => e.values),
      model,
      provider: 'gemini',
      dimensions: res.embeddings[0]?.values.length ?? 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Translation helpers (exported for smoke tests).
// ---------------------------------------------------------------------------

export function translateToolToGemini(t: ToolDefinition) {
  return {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  };
}

export function translateToolChoiceToGemini(
  choice: ToolChoice | undefined,
):
  | { mode: 'AUTO' }
  | { mode: 'NONE' }
  | { mode: 'ANY' }
  | { mode: 'ANY'; allowedFunctionNames: string[] }
  | undefined {
  if (choice === undefined) return undefined;
  if (choice === 'auto') return { mode: 'AUTO' };
  if (choice === 'none') return { mode: 'NONE' };
  if (choice === 'required') return { mode: 'ANY' };
  return { mode: 'ANY', allowedFunctionNames: [choice.name] };
}

/**
 * Translate ChatMessage[] to Gemini's `{ system_instruction, contents }`.
 *
 * - `system` messages fold into the `system` field.
 * - `assistant` turns (with or without tool calls) map to `role: 'model'`.
 *   Tool calls become `functionCall` parts.
 * - `tool` turns map to `role: 'user'` with a `functionResponse` part.
 *   Gemini requires the tool result content to be a JSON object; we
 *   attempt to parse the content string, otherwise wrap it in
 *   `{ result: "<string>" }`.
 */
export function translateMessagesToGemini(messages: ChatMessage[]): {
  system?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
} {
  const systems: string[] = [];
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systems.push(msg.content);
      continue;
    }

    if (msg.role === 'tool') {
      let response: Record<string, unknown>;
      try {
        const parsed = JSON.parse(msg.content);
        response =
          parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : { result: parsed };
      } catch {
        response = { result: msg.content };
      }
      const part: GeminiPart = {
        functionResponse: {
          name: msg.name ?? '',
          response,
        },
      };
      const last = contents[contents.length - 1];
      if (last && last.role === 'user') {
        last.parts.push(part);
      } else {
        contents.push({ role: 'user', parts: [part] });
      }
      continue;
    }

    if (msg.role === 'assistant') {
      const parts: GeminiPart[] = [];
      if (msg.content) parts.push({ text: msg.content });
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: (tc.arguments ?? {}) as Record<string, unknown>,
            },
          });
        }
      }
      contents.push({ role: 'model', parts: parts.length > 0 ? parts : [{ text: '' }] });
      continue;
    }

    contents.push({ role: 'user', parts: [{ text: msg.content }] });
  }

  return {
    system: systems.length > 0 ? { parts: [{ text: systems.join('\n\n') }] } : undefined,
    contents,
  };
}

export function normalizeGeminiToolCalls(parts: GeminiPart[] | undefined): NormalizedToolCall[] {
  if (!parts) return [];
  return parts
    .filter(
      (p): p is { functionCall: { name: string; args: Record<string, unknown> } } =>
        'functionCall' in p,
    )
    .map((p, i) => ({
      // Gemini doesn't return a per-call id, so we synthesize one.
      id: `call_${i}_${p.functionCall.name}`,
      name: p.functionCall.name,
      arguments: (p.functionCall.args ?? {}) as Record<string, unknown>,
      argumentsRaw: JSON.stringify(p.functionCall.args ?? {}),
    }));
}

export function mapGeminiFinishReason(
  reason: string | undefined,
  hasToolCalls: boolean,
): StopReason | undefined {
  if (hasToolCalls) return 'tool_use';
  switch (reason) {
    case 'STOP':
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case undefined:
      return undefined;
    default:
      return 'other';
  }
}
