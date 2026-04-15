# Tool Calling Normalization

Closes #36.

Every AI provider in deskive now speaks one unified tool/function-calling
shape. Callers hand the same `ToolDefinition[]` to OpenAI, Anthropic,
Gemini, Groq, or Ollama; the provider adapter translates the request to
the vendor's native wire format, then normalizes the response back to a
single `NormalizedToolCall[]` shape. Callers never write
provider-specific branches.

## The unified shape

Defined in `backend/src/modules/ai-provider/providers/ai-provider.interface.ts`.

```ts
interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;  // JSON Schema
}

type ToolChoice = 'auto' | 'none' | 'required' | { name: string };

interface NormalizedToolCall {
  id: string;                             // provider id or synthesized
  name: string;
  arguments: Record<string, unknown> | null;
  argumentsRaw?: string;
}

type StopReason = 'stop' | 'tool_use' | 'length' | 'other';
```

`GenerateTextInput` gained two optional fields:

```ts
tools?: ToolDefinition[];
toolChoice?: ToolChoice;
```

`GenerateTextResult` gained two optional fields:

```ts
toolCalls?: NormalizedToolCall[];
stopReason?: StopReason;
```

`ChatMessage` now supports two new roles used by tool-calling loops:

```ts
{ role: 'assistant', content, toolCalls: [...] }   // model asked for tools
{ role: 'tool', toolCallId, name, content }        // caller's tool result
```

## The round-trip

```ts
const tools: ToolDefinition[] = [
  {
    name: 'get_weather',
    description: 'Get current weather for a city',
    parameters: {
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city'],
    },
  },
];

// 1. First turn: ask the model, offer it tools.
let result = await ai.generateText({
  messages: [{ role: 'user', content: 'Weather in Tokyo?' }],
  tools,
});

// 2. Loop until the model is done.
const history: ChatMessage[] = [
  { role: 'user', content: 'Weather in Tokyo?' },
];

while (result.stopReason === 'tool_use' && result.toolCalls) {
  history.push({
    role: 'assistant',
    content: result.text,
    toolCalls: result.toolCalls,
  });

  for (const call of result.toolCalls) {
    const output = await myTools[call.name](call.arguments);
    history.push({
      role: 'tool',
      toolCallId: call.id,
      name: call.name,
      content: JSON.stringify(output),
    });
  }

  result = await ai.generateText({ messages: history, tools });
}

console.log(result.text);
```

The same code works against any provider — flip `AI_PROVIDER` in `.env`
and re-run.

## Per-provider translation

| Provider  | Request (tools)                                       | Request (reply role) | Response (tool call)                | Arguments         |
| --------- | ----------------------------------------------------- | -------------------- | ----------------------------------- | ----------------- |
| OpenAI    | `tools:[{type:'function',function:{...}}]`            | `role:'tool'`, `tool_call_id` | `message.tool_calls[].function.*`  | JSON string       |
| Groq      | — inherits OpenAI —                                   | — inherits OpenAI —  | — inherits OpenAI —                 | JSON string       |
| Anthropic | `tools:[{name,description,input_schema}]`             | user `type:'tool_result'`, `tool_use_id` | content block `type:'tool_use'` | object (input)    |
| Gemini    | `tools:[{functionDeclarations:[{...}]}]`              | user `parts[].functionResponse` | `parts[].functionCall`           | object (args)     |
| Ollama    | `tools:[{type:'function',function:{...}}]`            | `role:'tool'`, `tool_call_id` | `message.tool_calls[].function.*`  | object (parsed)   |
| none      | throws `AiProviderNotConfiguredError`                 | —                    | —                                   | —                 |

Tool-choice translation:

| Unified    | OpenAI/Groq                              | Anthropic            | Gemini                               | Ollama       |
| ---------- | ---------------------------------------- | -------------------- | ------------------------------------ | ------------ |
| `auto`     | `'auto'`                                 | `{type:'auto'}`      | `{mode:'AUTO'}`                      | omitted      |
| `none`     | `'none'`                                 | (tools dropped)      | `{mode:'NONE'}`                      | omitted      |
| `required` | `'required'`                             | `{type:'any'}`       | `{mode:'ANY'}`                       | omitted      |
| `{name:x}` | `{type:'function',function:{name:x}}`    | `{type:'tool',name}` | `{mode:'ANY',allowedFunctionNames}`  | omitted      |

Notes on normalization decisions:

- **`arguments` is always a parsed object.** OpenAI returns a JSON
  string; Anthropic returns an object (`input`); Gemini returns an
  object (`args`); Ollama returns an object. We parse once at the edge
  and hand callers a `Record<string, unknown>`. If parsing fails,
  `arguments` is `null` and `argumentsRaw` holds the original text.
- **`id` is always populated.** OpenAI/Anthropic supply ids; Gemini and
  Ollama don't, so we synthesize `call_<index>_<name>` so callers can
  still correlate replies.
- **Anthropic parallel tool replies.** Consecutive `role:'tool'`
  messages are merged into a single user turn with multiple
  `tool_result` blocks — the shape Anthropic expects when multiple
  tools were called in parallel.
- **Streaming is out of scope.** The providers are request/response
  today; streaming + incremental tool-call deltas are a follow-up.
- **Ollama `toolChoice`.** The `/api/chat` endpoint has no native
  `tool_choice` parameter; we accept the option but don't forward it.
  Use `'none'` by simply omitting `tools`.

## Smoke tests

`backend/scripts/smoke-test-ai-providers.ts` adds scenarios (cases
16–20) that mock `fetch` and verify:

1. OpenAI tool request shape + response normalization.
2. Anthropic `input_schema` + `tool_use` block → `NormalizedToolCall`.
3. Gemini `functionDeclarations` + `functionCall` part normalization.
4. Ollama OpenAI-style tool request + object-args response.
5. Tool reply round-trip: OpenAI `role:'tool'` wire message.
6. Anthropic consecutive tool replies merge into one user turn.
7. Gemini tool reply → `functionResponse` part.

Run with: `npx ts-node scripts/smoke-test-ai-providers.ts`.

## What this unblocks

- **AutoPilot** can now drive tool-calling loops without caring which
  provider is configured.
- **Ai router / unified agent / calendar / task / notes / files agents**
  can switch from ad-hoc JSON prompting to true function calling — a
  follow-up PR will migrate them one at a time.
- **New providers** that ship tool calling (Mistral via La Plateforme,
  Cohere, etc.) only need to implement the translation helpers
  illustrated here — the consumer side doesn't change.

## Out of scope (tracked separately)

- Streaming + partial tool-call deltas.
- Migrating existing agents to use tools (AutoPilot, AiRouter, etc.).
- Tool result validation against the JSON Schema before sending back
  to the model.
- Parallel tool execution orchestration (currently sequential by caller
  convention).
