import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { createAiProvider, AiProvider, ChatMessage } from './providers';

/**
 * AiProviderService — façade over the pluggable AI adapter.
 *
 * Text generation and embeddings are delegated to the provider selected
 * by `AI_PROVIDER` (openai / anthropic / gemini / ollama / groq / none).
 * Legacy behavior: if `AI_PROVIDER` is unset but `OPENAI_API_KEY` is set
 * the factory selects openai, so existing deployments keep working.
 *
 * Image / audio / transcription stay on a private OpenAI client because
 * they're OpenAI-only features and not part of the pluggable interface.
 *
 * See `./providers/` and `docs/providers/ai.md`.
 */
@Injectable()
export class AiProviderService implements OnModuleInit {
  private readonly logger = new Logger(AiProviderService.name);
  private provider!: AiProvider;
  private openai?: OpenAI;
  private defaultModel: string = 'gpt-4o-mini';

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.provider = createAiProvider(this.configService);
    this.logger.log(
      `AI provider initialized: ${this.provider.name} (available=${this.provider.isAvailable()})`,
    );

    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.defaultModel = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini')!;
    } else {
      this.logger.warn(
        'OPENAI_API_KEY not configured. Image/audio/transcription features will be unavailable.',
      );
    }
  }

  getProviderName(): string {
    return this.provider?.name ?? 'none';
  }

  isAvailable(): boolean {
    return !!this.provider && this.provider.isAvailable();
  }

  getProvider(): AiProvider {
    return this.provider;
  }

  async generateText(
    prompt: string,
    options?: {
      model?: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      format?: 'text' | 'json';
    },
  ): Promise<{ text: string; usage?: any }> {
    const messages: ChatMessage[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const result = await this.provider.generateText({
      messages,
      model: options?.model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      jsonMode: options?.format === 'json',
    });

    return { text: result.text, usage: result.usage };
  }

  async generateEmbedding(
    text: string,
    options?: { model?: string },
  ): Promise<{ embedding: number[] }> {
    const result = await this.provider.generateEmbedding({
      text,
      model: options?.model,
    });
    return { embedding: result.embeddings[0] };
  }

  async generateEmbeddings(
    texts: string[],
    options?: { model?: string },
  ): Promise<{ embeddings: number[][] }> {
    const result = await this.provider.generateEmbedding({
      text: texts,
      model: options?.model,
    });
    return { embeddings: result.embeddings };
  }

  // --- OpenAI-only features below. These remain on the direct OpenAI
  // client because there's no common abstraction for them yet. ---

  async generateImage(
    prompt: string,
    options?: { model?: string; size?: string; quality?: string },
  ): Promise<{ url: string }> {
    this.requireOpenai('generateImage');
    const response = await this.openai!.images.generate({
      model: options?.model || 'dall-e-3',
      prompt,
      size: (options?.size as any) || '1024x1024',
      quality: (options?.quality as any) || 'standard',
      n: 1,
    });
    return { url: response.data[0]?.url || '' };
  }

  async generateAudio(
    text: string,
    options?: { model?: string; voice?: string },
  ): Promise<{ audio: Buffer }> {
    this.requireOpenai('generateAudio');
    const response = await this.openai!.audio.speech.create({
      model: options?.model || 'tts-1',
      voice: (options?.voice as any) || 'alloy',
      input: text,
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    return { audio: buffer };
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    options?: { model?: string; language?: string },
  ): Promise<{ text: string }> {
    this.requireOpenai('transcribeAudio');
    const file = new File([new Uint8Array(audioBuffer)], 'audio.webm', { type: 'audio/webm' });
    const response = await this.openai!.audio.transcriptions.create({
      model: options?.model || 'whisper-1',
      file,
      language: options?.language,
    });
    return { text: response.text };
  }

  async translateText(
    text: string,
    targetLanguage: string,
    options?: { model?: string },
  ): Promise<{ text: string }> {
    const result = await this.generateText(
      `Translate the following text to ${targetLanguage}. Return only the translation, nothing else.\n\n${text}`,
      { model: options?.model },
    );
    return { text: result.text };
  }

  async summarizeText(
    text: string,
    options?: { model?: string; maxLength?: number },
  ): Promise<{ text: string }> {
    const result = await this.generateText(
      `Summarize the following text concisely${options?.maxLength ? ` in under ${options.maxLength} words` : ''}:\n\n${text}`,
      { model: options?.model },
    );
    return { text: result.text };
  }

  private requireOpenai(op: string): void {
    if (!this.openai) {
      throw new Error(
        `AiProviderService.${op}() requires OPENAI_API_KEY. This method is OpenAI-specific and not covered by the pluggable AI provider interface.`,
      );
    }
  }
}
