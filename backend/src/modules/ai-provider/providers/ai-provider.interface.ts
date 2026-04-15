/**
 * Common interface that every AI / LLM provider implements.
 *
 * Pick a provider by setting AI_PROVIDER in your .env to one of:
 *
 *   openai     - OpenAI (https://platform.openai.com). GPT-4o family,
 *                vision, highest-quality default.
 *
 *   anthropic  - Anthropic Claude (https://console.anthropic.com).
 *                Best for long-context reasoning, product copy.
 *
 *   gemini     - Google Gemini (https://ai.google.dev). Cheap
 *                multimodal + long context.
 *
 *   ollama     - Ollama (https://ollama.com). Run LLMs on your own
 *                machine. Zero API cost, fully offline. Great for dev.
 *
 *   groq       - Groq (https://groq.com). Ultra-low latency Llama,
 *                Mixtral, DeepSeek. OpenAI-compatible API.
 *
 *   none       - AI disabled. Every method throws loudly.
 *                The default if AI_PROVIDER is unset.
 *
 * Adding a new provider: implement this interface, register it in
 * providers/index.ts, document the env vars in docs/providers/ai.md.
 *
 * Tool calling: see ToolDefinition / NormalizedToolCall below. Callers
 * pass a unified shape; each provider translates to its native wire
 * format and normalizes the response back to NormalizedToolCall[].
 */

/**
 * A tool the model may call. Uses JSON Schema for the parameter
 * schema — same shape that OpenAI, Anthropic, Gemini, and Ollama
 * accept (we translate wrappers per provider internally).
 *
 * `parameters` MUST be a valid JSON Schema object (typically
 * `{ type: 'object', properties: {...}, required: [...] }`).
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * How to constrain tool selection for a given request.
 *
 *   'auto'        — let the model decide (default when tools are provided)
 *   'none'        — force a plain text response, ignore tools
 *   'required'    — the model MUST pick some tool to call
 *   { name: 'x' } — force the model to call the named tool
 */
export type ToolChoice = 'auto' | 'none' | 'required' | { name: string };

/**
 * A single tool call emitted by the model. Arguments are already
 * parsed from JSON — callers get a plain object, not a string. If
 * the model produced invalid JSON, `arguments` is `null` and
 * `argumentsRaw` holds the original text for debugging.
 */
export interface NormalizedToolCall {
  /** Provider id (e.g. OpenAI `call_...`) or synthesized id if the
   * underlying API doesn't assign one. Always unique within a response. */
  id: string;
  name: string;
  arguments: Record<string, unknown> | null;
  /** Raw JSON string as returned by the provider, for debugging or
   * when `arguments` is null due to a parse error. */
  argumentsRaw?: string;
}

/**
 * Why the model stopped generating. Normalized across providers:
 *
 *   'stop'      — reached natural end of response
 *   'tool_use'  — stopped to emit tool calls; caller should execute
 *                  them and append a follow-up `role: 'tool'` message
 *   'length'    — hit the max_tokens limit
 *   'other'     — safety/content filter or provider-specific reason
 */
export type StopReason = 'stop' | 'tool_use' | 'length' | 'other';

/**
 * A single chat turn. For plain text dialog, pass
 * `{ role, content }`. For tool-calling loops, the assistant MAY
 * emit `toolCalls`, and the caller MUST reply with one
 * `{ role: 'tool', toolCallId, name, content }` message per call
 * (content is the stringified tool result).
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  /** Textual content. May be empty string for assistant messages
   * that only contain tool calls. */
  content: string;
  /** Only meaningful when `role === 'assistant'`. Tool calls this
   * turn asked the caller to execute. */
  toolCalls?: NormalizedToolCall[];
  /** Only meaningful when `role === 'tool'`. Id of the assistant
   * tool_call this message is responding to. */
  toolCallId?: string;
  /** Only meaningful when `role === 'tool'`. Name of the tool
   * (required by Gemini's functionResponse; optional elsewhere). */
  name?: string;
}

export interface GenerateTextInput {
  /** Messages array (system + user turns, plus assistant/tool turns
   * for tool-calling loops). */
  messages: ChatMessage[];
  /** Model id override; defaults to each provider's sensible default. */
  model?: string;
  /** Max tokens to generate. Default 2000. */
  maxTokens?: number;
  /** Sampling temperature. Default 0.7. */
  temperature?: number;
  /** If set, the provider will try to return JSON (OpenAI/Gemini support
   * this natively; others will prompt for it in the system message). */
  jsonMode?: boolean;
  /** Tool definitions the model may call. When omitted, tool-calling
   * is disabled for the request regardless of provider capability. */
  tools?: ToolDefinition[];
  /** How to constrain tool selection. Ignored when `tools` is empty. */
  toolChoice?: ToolChoice;
}

export interface GenerateTextResult {
  /** Full generated text. Empty string when the turn contains only
   * tool calls. */
  text: string;
  /** Model the provider actually used. */
  model: string;
  /** Provider name. */
  provider: string;
  /** Normalized tool calls the model emitted, if any. When present,
   * `stopReason` will be `'tool_use'`. */
  toolCalls?: NormalizedToolCall[];
  /** Why the model stopped. Useful for tool-calling loops:
   * keep round-tripping while `stopReason === 'tool_use'`. */
  stopReason?: StopReason;
  /** Token usage if the provider reports it. */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AnalyzeImageInput {
  /** Image as a publicly-reachable URL OR a base64 data URI. */
  image: string;
  /** Instruction / question about the image. */
  prompt: string;
  /** Vision model override. */
  model?: string;
  /** Max tokens for the response. */
  maxTokens?: number;
}

export interface GenerateEmbeddingInput {
  /** Text to embed. Batches are allowed — providers will split if needed. */
  text: string | string[];
  /** Embedding model override. */
  model?: string;
}

export interface GenerateEmbeddingResult {
  /** One vector per input string. */
  embeddings: number[][];
  /** Embedding model used. */
  model: string;
  /** Provider name. */
  provider: string;
  /** Dimensionality of each vector. */
  dimensions: number;
}

/**
 * Common interface implemented by every AI provider. Methods a provider
 * can't support should throw AiProviderNotSupportedError — never silently
 * no-op.
 */
export interface AiProvider {
  /** Stable provider name for logging / clients. */
  readonly name: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'groq' | 'none';

  /** True if the provider has the credentials/infra it needs. */
  isAvailable(): boolean;

  /** Generate text from a chat-message input. Supports tool calling
   * when `input.tools` is provided — the result's `toolCalls` field
   * will be populated and `stopReason === 'tool_use'`. */
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;

  /** Analyze an image. Throws NotSupported for providers without vision. */
  analyzeImage(input: AnalyzeImageInput): Promise<GenerateTextResult>;

  /** Generate an embedding vector. Throws NotSupported for providers
   * without an embeddings endpoint (e.g. Ollama without the right model). */
  generateEmbedding(input: GenerateEmbeddingInput): Promise<GenerateEmbeddingResult>;
}

/**
 * Thrown when a provider is asked to do something it can't support
 * (e.g. image analysis on a text-only model).
 */
export class AiProviderNotSupportedError extends Error {
  constructor(provider: string, operation: string) {
    super(
      `Operation "${operation}" is not supported by the "${provider}" AI provider. See docs/providers/ai.md for provider capabilities.`,
    );
    this.name = 'AiProviderNotSupportedError';
  }
}

/**
 * Thrown when a provider is selected but its credentials are missing.
 */
export class AiProviderNotConfiguredError extends Error {
  constructor(provider: string, missingVars: string[]) {
    super(
      `AI provider "${provider}" is selected but the following env vars are missing: ${missingVars.join(', ')}. See docs/providers/ai.md.`,
    );
    this.name = 'AiProviderNotConfiguredError';
  }
}
