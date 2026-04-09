import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface TranscriptionEvent {
  type: 'delta' | 'completed' | 'error' | 'connected' | 'disconnected';
  itemId?: string;
  delta?: string;
  transcript?: string;
  language?: string;
  error?: string;
  timestamp: number;
}

export interface TranscriptionSession {
  sessionId: string;
  callId: string;
  userId: string;
  ws: WebSocket | null;
  isConnected: boolean;
  language: string;
  fullTranscript: Map<string, string>; // itemId -> full transcript
  emitter: EventEmitter;
}

@Injectable()
export class RealtimeTranscriptionService {
  private readonly logger = new Logger(RealtimeTranscriptionService.name);
  private sessions = new Map<string, TranscriptionSession>();
  private readonly openaiApiKey: string;
  private readonly model = 'gpt-4o-mini-realtime-preview'; // Realtime API model

  constructor(private readonly configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!this.openaiApiKey) {
      this.logger.warn('OPENAI_API_KEY not configured - real-time transcription will not work');
    } else {
      this.logger.log(`RealtimeTranscriptionService initialized with model: ${this.model}`);
    }
  }

  /**
   * Create a new transcription session for a video call
   */
  async createSession(
    sessionId: string,
    callId: string,
    userId: string,
    language: string = 'en',
  ): Promise<TranscriptionSession> {
    // Close existing session if any
    await this.closeSession(sessionId);

    const session: TranscriptionSession = {
      sessionId,
      callId,
      userId,
      ws: null,
      isConnected: false,
      language,
      fullTranscript: new Map(),
      emitter: new EventEmitter(),
    };

    this.sessions.set(sessionId, session);
    this.logger.log(`Created transcription session: ${sessionId} for call: ${callId}`);

    return session;
  }

  /**
   * Connect to OpenAI Realtime API for transcription
   */
  async connectToOpenAI(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.error(`Session not found: ${sessionId}`);
      return false;
    }

    if (!this.openaiApiKey) {
      this.logger.error('OpenAI API key not configured');
      return false;
    }

    try {
      // Connect to OpenAI Realtime API WebSocket
      const url = 'wss://api.openai.com/v1/realtime?model=' + this.model;

      const ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      session.ws = ws;

      ws.on('open', () => {
        this.logger.log(`OpenAI WebSocket connected for session: ${sessionId}`);
        session.isConnected = true;

        // Configure transcription session
        this.sendSessionConfig(session);

        session.emitter.emit('transcription', {
          type: 'connected',
          timestamp: Date.now(),
        } as TranscriptionEvent);
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleOpenAIMessage(session, message);
        } catch (error) {
          this.logger.error(`Failed to parse OpenAI message: ${error.message}`);
        }
      });

      ws.on('error', (error) => {
        this.logger.error(`OpenAI WebSocket error for session ${sessionId}:`, error.message);
        session.emitter.emit('transcription', {
          type: 'error',
          error: error.message,
          timestamp: Date.now(),
        } as TranscriptionEvent);
      });

      ws.on('close', (code, reason) => {
        this.logger.log(`OpenAI WebSocket closed for session ${sessionId}: ${code} - ${reason}`);
        session.isConnected = false;
        session.emitter.emit('transcription', {
          type: 'disconnected',
          timestamp: Date.now(),
        } as TranscriptionEvent);
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to connect to OpenAI: ${error.message}`);
      return false;
    }
  }

  /**
   * Send session configuration to OpenAI
   */
  private sendSessionConfig(session: TranscriptionSession) {
    if (!session.ws || session.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const config = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    };

    session.ws.send(JSON.stringify(config));
    this.logger.debug(`Sent session config for: ${session.sessionId}`);
  }

  /**
   * Handle messages from OpenAI Realtime API
   */
  private handleOpenAIMessage(session: TranscriptionSession, message: any) {
    const { type } = message;

    switch (type) {
      case 'session.created':
        this.logger.log(`Session created: ${message.session?.id}`);
        break;

      case 'session.updated':
        this.logger.debug(`Session updated: ${session.sessionId}`);
        break;

      case 'input_audio_buffer.speech_started':
        this.logger.debug(`Speech started in session: ${session.sessionId}`);
        break;

      case 'input_audio_buffer.speech_stopped':
        this.logger.debug(`Speech stopped in session: ${session.sessionId}`);
        break;

      case 'input_audio_buffer.committed':
        this.logger.debug(`Audio buffer committed: ${message.item_id}`);
        break;

      case 'conversation.item.input_audio_transcription.delta':
        // Incremental transcription (streaming)
        const deltaEvent: TranscriptionEvent = {
          type: 'delta',
          itemId: message.item_id,
          delta: message.delta,
          timestamp: Date.now(),
        };

        // Accumulate transcript
        const currentTranscript = session.fullTranscript.get(message.item_id) || '';
        session.fullTranscript.set(message.item_id, currentTranscript + message.delta);

        session.emitter.emit('transcription', deltaEvent);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // Final transcription for a speech segment
        const completedEvent: TranscriptionEvent = {
          type: 'completed',
          itemId: message.item_id,
          transcript: message.transcript,
          timestamp: Date.now(),
        };

        // Store final transcript
        session.fullTranscript.set(message.item_id, message.transcript);

        session.emitter.emit('transcription', completedEvent);
        this.logger.debug(`Transcription completed: "${message.transcript?.substring(0, 50)}..."`);
        break;

      case 'response.audio_transcript.delta':
        // Streaming transcript from response (realtime model)
        const responseTranscriptDelta: TranscriptionEvent = {
          type: 'delta',
          itemId: message.item_id || message.response_id,
          delta: message.delta,
          timestamp: Date.now(),
        };

        // Accumulate transcript
        const currentResponseTranscript = session.fullTranscript.get(message.item_id || message.response_id) || '';
        session.fullTranscript.set(message.item_id || message.response_id, currentResponseTranscript + message.delta);

        session.emitter.emit('transcription', responseTranscriptDelta);
        break;

      case 'response.audio_transcript.done':
        // Final transcript from response
        const responseTranscriptCompleted: TranscriptionEvent = {
          type: 'completed',
          itemId: message.item_id || message.response_id,
          transcript: message.transcript,
          timestamp: Date.now(),
        };

        session.fullTranscript.set(message.item_id || message.response_id, message.transcript);
        session.emitter.emit('transcription', responseTranscriptCompleted);
        this.logger.debug(`Transcription completed: "${message.transcript?.substring(0, 50)}..."`);
        break;

      case 'error':
        this.logger.error(`OpenAI error: ${message.error?.message}`);
        session.emitter.emit('transcription', {
          type: 'error',
          error: message.error?.message || 'Unknown error',
          timestamp: Date.now(),
        } as TranscriptionEvent);
        break;

      default:
        this.logger.debug(`Unhandled OpenAI message type: ${type}`);
    }
  }

  /**
   * Send audio data to OpenAI for transcription
   */
  sendAudioData(sessionId: string, audioData: Buffer | string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.ws || session.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      // Convert to base64 if Buffer
      const base64Audio = Buffer.isBuffer(audioData)
        ? audioData.toString('base64')
        : audioData;

      const message = {
        type: 'input_audio_buffer.append',
        audio: base64Audio,
      };

      session.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.logger.error(`Failed to send audio data: ${error.message}`);
      return false;
    }
  }

  /**
   * Commit the audio buffer to trigger transcription
   */
  commitAudioBuffer(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.ws || session.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      session.ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      return true;
    } catch (error) {
      this.logger.error(`Failed to commit audio buffer: ${error.message}`);
      return false;
    }
  }

  /**
   * Get session event emitter for subscribing to transcription events
   */
  getSessionEmitter(sessionId: string): EventEmitter | null {
    const session = this.sessions.get(sessionId);
    return session?.emitter || null;
  }

  /**
   * Get full transcript for a session
   */
  getFullTranscript(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return '';

    // Combine all transcript segments
    return Array.from(session.fullTranscript.values()).join(' ');
  }

  /**
   * Get transcript segments with timestamps
   */
  getTranscriptSegments(sessionId: string): Array<{ itemId: string; text: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return Array.from(session.fullTranscript.entries()).map(([itemId, text]) => ({
      itemId,
      text,
    }));
  }

  /**
   * Update session language
   */
  updateLanguage(sessionId: string, language: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.language = language;

    // Re-send config if connected
    if (session.isConnected) {
      this.sendSessionConfig(session);
    }

    return true;
  }

  /**
   * Check if session is connected
   */
  isSessionConnected(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.isConnected || false;
  }

  /**
   * Close transcription session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      if (session.ws) {
        session.ws.close();
        session.ws = null;
      }

      session.emitter.removeAllListeners();
      this.sessions.delete(sessionId);

      this.logger.log(`Closed transcription session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error closing session ${sessionId}: ${error.message}`);
    }
  }

  /**
   * Get all active sessions for a call
   */
  getSessionsForCall(callId: string): TranscriptionSession[] {
    return Array.from(this.sessions.values()).filter(s => s.callId === callId);
  }

  /**
   * Close all sessions for a call
   */
  async closeSessionsForCall(callId: string): Promise<void> {
    const sessions = this.getSessionsForCall(callId);
    for (const session of sessions) {
      await this.closeSession(session.sessionId);
    }
  }
}
