/**
 * Anthropic (Claude) provider.
 *
 *   AI_PROVIDER=anthropic
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   AI_MODEL=claude-sonnet-4-5          # optional (default shown)
 *
 * Pure REST via fetch. Anthropic's Messages API (/v1/messages) takes
 * a separate `system` field outside the messages array, and returns
 * content as an array of blocks instead of a single string — this
 * provider translates to/from the unified `GenerateTextInput/Result`
 * shape so callers stay provider-agnostic.
 *
 * Claude is excellent at long-context reasoning and product copy.
 * Embeddings are NOT supported (Anthropic has no embeddings endpoint
 * as of this writing) — the provider throws AiProviderNotSupportedError.
 *
 * Tool calling uses Claude's `tool_use` / `tool_result` content blocks;
 * assistant turns with tool calls arrive as content blocks, and the
 * caller replies with a user message containing a `tool_result` block.
 * This provider handles the translation in both directions.
 */
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  AiProviderNotConfiguredError,
  AiProviderNotSupportedError,
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

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

/** Content block shapes used by Anthropic's Messages API. */
type AnthropicTextBlock = { type: 'text'; text: string };
type AnthropicToolUseBlock = {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
};
type AnthropicToolResultBlock = {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
};
type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock | AnthropicToolResultBlock;

type AnthropicWireMessage = {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
};

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic' as const;
  private readonly logger = new Logger('AnthropicProvider');

  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly defaultVisionModel: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('ANTHROPIC_API_KEY', '');
    this.defaultModel = config.get<string>('AI_MODEL', 'claude-sonnet-4-5');
    this.defaultVisionModel = config.get<string>('AI_VISION_MODEL', this.defaultModel);

    if (this.isAvailable()) {
      this.logger.log(`Anthropic provider configured (model=${this.defaultModel})`);
    } else {
      this.logger.warn('Anthropic provider selected but ANTHROPIC_API_KEY missing');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private async api(path: string, body: any): Promise<any> {
    if (!this.isAvailable()) {
      throw new AiProviderNotConfiguredError('anthropic', ['ANTHROPIC_API_KEY']);
    }
    const res = await fetch(`${ANTHROPIC_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic API ${path} failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const { system, messages } = translateMessagesToAnthropic(input.messages);

    // jsonMode: Anthropic doesn't have a native JSON mode, so prepend
    // a system instruction asking for JSON only.
    const systemText = input.jsonMode
      ? `${system ?? ''}\n\nRespond with ONLY a valid JSON object. No prose, no markdown code fences.`.trim()
      : system;

    const payload: any = {
      model: input.model ?? this.defaultModel,
      max_tokens: input.maxTokens ?? 2000,
      temperature: input.temperature ?? 0.7,
      system: systemText,
      messages,
    };
    if (input.tools && input.tools.length > 0) {
      payload.tools = input.tools.map(translateToolToAnthropic);
      const tc = translateToolChoiceToAnthropic(input.toolChoice);
      if (tc !== undefined) payload.tool_choice = tc;
    }

    const res = (await this.api('/messages', payload)) as {
      content: AnthropicContentBlock[];
      model: string;
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const text = (res.content ?? [])
      .filter((b): b is AnthropicTextBlock => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('');

    const toolCalls = normalizeAnthropicToolCalls(res.content);
    const stopReason = mapAnthropicStopReason(res.stop_reason, toolCalls.length > 0);

    return {
      text,
      model: res.model,
      provider: 'anthropic',
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
      ...(stopReason ? { stopReason } : {}),
      usage: res.usage
        ? {
            promptTokens: res.usage.input_tokens,
            completionTokens: res.usage.output_tokens,
            totalTokens: (res.usage.input_tokens ?? 0) + (res.usage.output_tokens ?? 0),
          }
        : undefined,
    };
  }

  async analyzeImage(input: AnalyzeImageInput): Promise<GenerateTextResult> {
    // Anthropic accepts images as `{ type: 'image', source: { type:
    // 'base64'|'url', ... } }` blocks inside a user message.
    const imageBlock = input.image.startsWith('data:')
      ? {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: this.extractDataUriMediaType(input.image) ?? 'image/jpeg',
            data: input.image.replace(/^data:[^;]+;base64,/, ''),
          },
        }
      : {
          type: 'image' as const,
          source: { type: 'url' as const, url: input.image },
        };

    const res = (await this.api('/messages', {
      model: input.model ?? this.defaultVisionModel,
      max_tokens: input.maxTokens ?? 2000,
      messages: [
        {
          role: 'user',
          content: [imageBlock, { type: 'text', text: input.prompt }],
        },
      ],
    })) as {
      content: Array<{ type: string; text?: string }>;
      model: string;
      usage?: any;
    };

    const text = (res.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('');

    return {
      text,
      model: res.model,
      provider: 'anthropic',
      usage: res.usage
        ? {
            promptTokens: res.usage.input_tokens,
            completionTokens: res.usage.output_tokens,
          }
        : undefined,
    };
  }

  async generateEmbedding(_input: GenerateEmbeddingInput): Promise<GenerateEmbeddingResult> {
    throw new AiProviderNotSupportedError(
      'anthropic',
      'generateEmbedding (Anthropic has no embeddings endpoint — use Voyage AI, OpenAI, or a local embedding model for vectors)',
    );
  }

  private extractDataUriMediaType(dataUri: string): string | null {
    const m = /^data:([^;]+);/.exec(dataUri);
    return m?.[1] ?? null;
  }
}

// ---------------------------------------------------------------------------
// Translation helpers (exported for smoke tests).
// ---------------------------------------------------------------------------

export function translateToolToAnthropic(t: ToolDefinition) {
  return {
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  };
}

export function translateToolChoiceToAnthropic(
  choice: ToolChoice | undefined,
): { type: 'auto' } | { type: 'any' } | { type: 'tool'; name: string } | undefined {
  if (choice === undefined) return undefined;
  // Anthropic has no 'none' option — callers asking for 'none' should
  // simply omit tools; for safety we return undefined here so the
  // request doesn't force a tool call.
  if (choice === 'none') return undefined;
  if (choice === 'auto') return { type: 'auto' };
  if (choice === 'required') return { type: 'any' };
  return { type: 'tool', name: choice.name };
}

/**
 * Translate the unified ChatMessage[] to Anthropic's
 * `{ system, messages: Array<{role, content blocks}> }` shape.
 *
 * - `system` turns are concatenated into the top-level `system` field.
 * - `assistant` turns with `toolCalls` become an assistant message
 *   with text + `tool_use` blocks.
 * - `tool` turns become `user` messages with `tool_result` blocks.
 *   Consecutive tool turns are merged into a single user message, which
 *   is what Anthropic expects when multiple tools were called in parallel.
 */
export function translateMessagesToAnthropic(messages: ChatMessage[]): {
  system?: string;
  messages: AnthropicWireMessage[];
} {
  const systems: string[] = [];
  const out: AnthropicWireMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systems.push(msg.content);
      continue;
    }

    if (msg.role === 'tool') {
      const block: AnthropicToolResultBlock = {
        type: 'tool_result',
        tool_use_id: msg.toolCallId ?? '',
        content: msg.content,
      };
      const last = out[out.length - 1];
      if (last && last.role === 'user' && Array.isArray(last.content)) {
        last.content.push(block);
      } else {
        out.push({ role: 'user', content: [block] });
      }
      continue;
    }

    if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
      const blocks: AnthropicContentBlock[] = [];
      if (msg.content) blocks.push({ type: 'text', text: msg.content });
      for (const tc of msg.toolCalls) {
        blocks.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: (tc.arguments ?? {}) as Record<string, unknown>,
        });
      }
      out.push({ role: 'assistant', content: blocks });
      continue;
    }

    out.push({ role: msg.role, content: msg.content });
  }

  return {
    system: systems.length > 0 ? systems.join('\n\n') : undefined,
    messages: out,
  };
}

export function normalizeAnthropicToolCalls(
  content: AnthropicContentBlock[] | undefined,
): NormalizedToolCall[] {
  if (!content) return [];
  return content
    .filter((b): b is AnthropicToolUseBlock => b.type === 'tool_use')
    .map((b) => ({
      id: b.id,
      name: b.name,
      arguments: (b.input ?? {}) as Record<string, unknown>,
      argumentsRaw: JSON.stringify(b.input ?? {}),
    }));
}

export function mapAnthropicStopReason(
  reason: string | undefined,
  hasToolCalls: boolean,
): StopReason | undefined {
  if (hasToolCalls || reason === 'tool_use') return 'tool_use';
  switch (reason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case undefined:
      return undefined;
    default:
      return 'other';
  }
}
