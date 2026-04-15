/**
 * Ollama provider — local LLMs, fully offline, zero API cost.
 *
 *   AI_PROVIDER=ollama
 *   OLLAMA_BASE_URL=http://localhost:11434    # default
 *   AI_MODEL=llama3.2                         # text model
 *   AI_VISION_MODEL=llava                     # vision model
 *   AI_EMBEDDING_MODEL=nomic-embed-text       # embeddings model
 *
 * Ollama (https://ollama.com) is a local LLM runner. Install it,
 * `ollama pull llama3.2 && ollama pull llava && ollama pull nomic-embed-text`,
 * and set `AI_PROVIDER=ollama`. You get unlimited offline text
 * generation, vision, and embeddings for free.
 *
 * This is the recommended default for local development — new
 * contributors don't need an OpenAI API key to run the app.
 *
 * Run via `docker compose --profile ollama up -d` (once install PR #27 lands).
 *
 * Tool calling: Ollama's /api/chat endpoint accepts OpenAI-style
 * `tools` for models that advertise tool support (Llama 3.1+, Mistral
 * Nemo, Qwen 2.5+, and a growing list). Unlike OpenAI, Ollama returns
 * tool_calls with `arguments` as a parsed object (not a JSON string)
 * and doesn't assign per-call ids. The provider normalizes both.
 *
 * Pure REST via fetch — no SDK needed.
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

type OllamaWireMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{
    function: { name: string; arguments: Record<string, unknown> };
  }>;
  tool_call_id?: string;
  name?: string;
  images?: string[];
};

type OllamaWireToolCall = {
  function?: { name?: string; arguments?: Record<string, unknown> | string };
};

export class OllamaProvider implements AiProvider {
  readonly name = 'ollama' as const;
  private readonly logger = new Logger('OllamaProvider');

  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultVisionModel: string;
  private readonly defaultEmbeddingModel: string;

  constructor(config: ConfigService) {
    this.baseUrl = (
      config.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434') || 'http://localhost:11434'
    ).replace(/\/+$/, '');
    this.defaultModel = config.get<string>('AI_MODEL', 'llama3.2');
    this.defaultVisionModel = config.get<string>('AI_VISION_MODEL', 'llava');
    this.defaultEmbeddingModel = config.get<string>('AI_EMBEDDING_MODEL', 'nomic-embed-text');

    this.logger.log(`Ollama provider configured (${this.baseUrl}, model=${this.defaultModel})`);
  }

  isAvailable(): boolean {
    // Always reportable-available; actual reachability is checked on
    // first call. Unlike a cloud provider, there's no "credential"
    // that could be missing — just a local HTTP server that might or
    // might not be running.
    return true;
  }

  private async api(path: string, body: any): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ollama API ${path} failed: ${res.status} ${text}`);
      }
      return res.json();
    } catch (e: any) {
      if (e.cause?.code === 'ECONNREFUSED' || /ECONNREFUSED/.test(e.message)) {
        throw new AiProviderNotConfiguredError('ollama', [
          `OLLAMA_BASE_URL (${this.baseUrl} unreachable — start with "ollama serve" or "docker compose --profile ollama up -d")`,
        ]);
      }
      throw e;
    }
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const model = input.model ?? this.defaultModel;
    // Ollama's /api/chat endpoint accepts { messages } in the same
    // shape as OpenAI, except `options.temperature` instead of
    // top-level temperature, and `num_predict` instead of max_tokens.
    const payload: any = {
      model,
      messages: input.messages.map(translateMessageToOllama),
      stream: false,
      options: {
        temperature: input.temperature ?? 0.7,
        num_predict: input.maxTokens ?? 2000,
      },
    };
    if (input.jsonMode) {
      payload.format = 'json';
    }
    if (input.tools && input.tools.length > 0) {
      payload.tools = input.tools.map(translateToolToOllama);
      // Ollama doesn't expose a native tool_choice parameter; the
      // closest we can do for 'none' is omit tools. 'required' is
      // approximated via a system-level nudge — or just leave to the
      // model (docs say the behavior matches the model's training).
      // For now we silently accept toolChoice but don't attach it.
    }

    const res = (await this.api('/api/chat', payload)) as {
      message: { content: string; tool_calls?: OllamaWireToolCall[] };
      model: string;
      done_reason?: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    const toolCalls = normalizeOllamaToolCalls(res.message?.tool_calls);
    const stopReason = mapOllamaDoneReason(res.done_reason, toolCalls.length > 0);

    return {
      text: res.message?.content ?? '',
      model: res.model,
      provider: 'ollama',
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
      ...(stopReason ? { stopReason } : {}),
      usage: {
        promptTokens: res.prompt_eval_count,
        completionTokens: res.eval_count,
        totalTokens: (res.prompt_eval_count ?? 0) + (res.eval_count ?? 0),
      },
    };
  }

  async analyzeImage(input: AnalyzeImageInput): Promise<GenerateTextResult> {
    const model = input.model ?? this.defaultVisionModel;

    // Ollama expects base64 images (without data: prefix) in an
    // `images` array on the user message.
    let base64: string;
    if (input.image.startsWith('data:')) {
      base64 = input.image.replace(/^data:[^;]+;base64,/, '');
    } else if (/^https?:\/\//.test(input.image)) {
      // Fetch the URL and base64-encode locally. Ollama doesn't
      // accept remote URLs directly.
      const res = await fetch(input.image);
      if (!res.ok) {
        throw new Error(`Ollama provider: failed to fetch image URL ${input.image}: ${res.status}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      base64 = buf.toString('base64');
    } else {
      // Assume it's already base64.
      base64 = input.image;
    }

    const payload = {
      model,
      messages: [
        {
          role: 'user',
          content: input.prompt,
          images: [base64],
        },
      ],
      stream: false,
      options: {
        num_predict: input.maxTokens ?? 2000,
      },
    };

    const res = (await this.api('/api/chat', payload)) as {
      message: { content: string };
      model: string;
    };

    return {
      text: res.message?.content ?? '',
      model: res.model,
      provider: 'ollama',
    };
  }

  async generateEmbedding(input: GenerateEmbeddingInput): Promise<GenerateEmbeddingResult> {
    const model = input.model ?? this.defaultEmbeddingModel;
    const texts = Array.isArray(input.text) ? input.text : [input.text];

    // Ollama's /api/embed takes `input: string | string[]` and
    // returns `{ embeddings: number[][] }`.
    const res = (await this.api('/api/embed', {
      model,
      input: texts,
    })) as { embeddings: number[][] };

    return {
      embeddings: res.embeddings ?? [],
      model,
      provider: 'ollama',
      dimensions: res.embeddings?.[0]?.length ?? 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Translation helpers (exported for smoke tests).
// ---------------------------------------------------------------------------

export function translateToolToOllama(t: ToolDefinition) {
  return {
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  };
}

export function translateMessageToOllama(msg: ChatMessage): OllamaWireMessage {
  if (msg.role === 'tool') {
    return {
      role: 'tool',
      content: msg.content,
      ...(msg.toolCallId ? { tool_call_id: msg.toolCallId } : {}),
      ...(msg.name ? { name: msg.name } : {}),
    };
  }
  if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
    return {
      role: 'assistant',
      content: msg.content ?? '',
      tool_calls: msg.toolCalls.map((tc) => ({
        function: {
          name: tc.name,
          // Ollama expects arguments as a parsed object, not a JSON
          // string. Fall back to {} if the caller preserved only a raw
          // argument string (shouldn't happen in practice).
          arguments: (tc.arguments ?? {}) as Record<string, unknown>,
        },
      })),
    };
  }
  return { role: msg.role, content: msg.content };
}

export function normalizeOllamaToolCalls(
  calls: OllamaWireToolCall[] | undefined,
): NormalizedToolCall[] {
  if (!calls || calls.length === 0) return [];
  return calls.map((c, i) => {
    const args = c.function?.arguments;
    let parsed: Record<string, unknown> | null = {};
    let raw: string | undefined;
    if (args && typeof args === 'object') {
      parsed = args as Record<string, unknown>;
      raw = JSON.stringify(args);
    } else if (typeof args === 'string') {
      raw = args;
      try {
        parsed = JSON.parse(args) as Record<string, unknown>;
      } catch {
        parsed = null;
      }
    }
    return {
      // Ollama doesn't assign per-call ids; synthesize one so callers
      // can still correlate tool replies.
      id: `call_${i}_${c.function?.name ?? 'unnamed'}`,
      name: c.function?.name ?? '',
      arguments: parsed,
      argumentsRaw: raw,
    };
  });
}

export function mapOllamaDoneReason(
  reason: string | undefined,
  hasToolCalls: boolean,
): StopReason | undefined {
  if (hasToolCalls) return 'tool_use';
  switch (reason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case undefined:
      return undefined;
    default:
      return 'other';
  }
}
