import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * Direct OpenAI provider - replaces database AI SDK methods.
 * Provides generateText, generateEmbedding, etc. matching the database API surface.
 */
@Injectable()
export class AiProviderService implements OnModuleInit {
  private readonly logger = new Logger(AiProviderService.name);
  private openai: OpenAI;
  private defaultModel: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured. AI features will be unavailable.');
      return;
    }

    this.openai = new OpenAI({ apiKey });
    this.defaultModel = this.configService.get('OPENAI_MODEL', 'gpt-4o-mini');
    this.logger.log('AI Provider (OpenAI) initialized');
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
    const messages: any[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.openai.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      response_format: options?.format === 'json' ? { type: 'json_object' } : undefined,
    });

    return {
      text: response.choices[0]?.message?.content || '',
      usage: response.usage,
    };
  }

  async generateEmbedding(text: string, options?: { model?: string }): Promise<{ embedding: number[] }> {
    const response = await this.openai.embeddings.create({
      model: options?.model || 'text-embedding-3-small',
      input: text,
    });
    return { embedding: response.data[0].embedding };
  }

  async generateEmbeddings(
    texts: string[],
    options?: { model?: string },
  ): Promise<{ embeddings: number[][] }> {
    const response = await this.openai.embeddings.create({
      model: options?.model || 'text-embedding-3-small',
      input: texts,
    });
    return { embeddings: response.data.map((d) => d.embedding) };
  }

  async generateImage(
    prompt: string,
    options?: { model?: string; size?: string; quality?: string },
  ): Promise<{ url: string }> {
    const response = await this.openai.images.generate({
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
    const response = await this.openai.audio.speech.create({
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
    const file = new File([new Uint8Array(audioBuffer)], 'audio.webm', { type: 'audio/webm' });
    const response = await this.openai.audio.transcriptions.create({
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
}
