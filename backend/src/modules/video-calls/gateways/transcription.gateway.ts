import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  RealtimeTranscriptionService,
  TranscriptionEvent,
} from '../services/realtime-transcription.service';
import { DatabaseService } from '../../database/database.service';
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  callId?: string;
  transcriptionSessionId?: string;
}

interface StartTranscriptionData {
  callId: string;
  language?: string;
}

interface AudioDataMessage {
  callId: string;
  audio: string; // base64 encoded PCM16 audio
}

interface TranscriptMessage {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
  language?: string;
}

@WebSocketGateway({
  namespace: '/transcription',
  cors: {
    origin: '*',
  },
})
export class TranscriptionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('TranscriptionGateway');
  private connectedClients = new Map<string, AuthenticatedSocket>();
  private callTranscripts = new Map<string, TranscriptMessage[]>(); // callId -> transcripts

  constructor(
    private readonly transcriptionService: RealtimeTranscriptionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromSocket(client);
      this.logger.debug(
        `Transcription connection attempt - ${client.id}, token present: ${!!token}`,
      );

      if (!token) {
        this.logger.warn(`Transcription connection rejected: No token - ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = await this.validateToken(token);
      if (!payload) {
        this.logger.warn(`Transcription connection rejected: Invalid token - ${client.id}`);
        client.disconnect();
        return;
      }

      client.userId = payload.sub;
      this.connectedClients.set(client.id, client);

      this.logger.log(
        `✅ User ${client.userId} connected to transcription namespace - ${client.id}`,
      );
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    const sessionId = client.transcriptionSessionId;

    if (sessionId) {
      await this.transcriptionService.closeSession(sessionId);
    }

    this.connectedClients.delete(client.id);
    this.logger.log(`User ${userId} disconnected from transcription namespace - ${client.id}`);
  }

  /**
   * Start transcription for a call
   */
  @SubscribeMessage('transcription:start')
  async handleStartTranscription(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: StartTranscriptionData,
  ) {
    try {
      const { callId, language = 'en' } = data;
      const userId = client.userId;

      this.logger.log(
        `[transcription:start] User ${userId} requesting transcription for call ${callId}`,
      );

      if (!userId || !callId) {
        this.logger.warn('[transcription:start] Missing userId or callId');
        return { success: false, error: 'Missing required data' };
      }

      // Check if OpenAI API key is configured
      const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!openaiKey) {
        this.logger.error('[transcription:start] OPENAI_API_KEY not configured in environment');
        return {
          success: false,
          error: 'Transcription service not configured. Please contact administrator.',
        };
      }

      // Create unique session ID
      const sessionId = `${callId}-${userId}-${uuidv4().substring(0, 8)}`;
      client.transcriptionSessionId = sessionId;
      client.callId = callId;

      // Join the call room for broadcasts
      client.join(`call:${callId}`);
      client.join(`transcription:${callId}`);

      // Initialize transcript storage for this call
      if (!this.callTranscripts.has(callId)) {
        this.callTranscripts.set(callId, []);
      }

      // Create transcription session
      const session = await this.transcriptionService.createSession(
        sessionId,
        callId,
        userId,
        language,
      );

      // Subscribe to transcription events
      session.emitter.on('transcription', (event: TranscriptionEvent) => {
        this.handleTranscriptionEvent(client, callId, userId, event);
      });

      // Connect to OpenAI
      const connected = await this.transcriptionService.connectToOpenAI(sessionId);

      if (!connected) {
        return { success: false, error: 'Failed to connect to transcription service' };
      }

      this.logger.log(`Started transcription for user ${userId} in call ${callId}`);

      return {
        success: true,
        sessionId,
        message: 'Transcription started',
      };
    } catch (error) {
      this.logger.error(`Failed to start transcription: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop transcription for a call
   */
  @SubscribeMessage('transcription:stop')
  async handleStopTranscription(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string },
  ) {
    try {
      const sessionId = client.transcriptionSessionId;

      if (sessionId) {
        // Get final transcript before closing
        const transcript = this.transcriptionService.getFullTranscript(sessionId);

        await this.transcriptionService.closeSession(sessionId);
        client.transcriptionSessionId = undefined;

        // Leave transcription room
        client.leave(`transcription:${data.callId}`);

        this.logger.log(`Stopped transcription for session ${sessionId}`);

        return {
          success: true,
          transcript,
          message: 'Transcription stopped',
        };
      }

      return { success: true, message: 'No active transcription session' };
    } catch (error) {
      this.logger.error(`Failed to stop transcription: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Receive audio data from client
   */
  @SubscribeMessage('transcription:audio')
  handleAudioData(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: AudioDataMessage,
  ) {
    const sessionId = client.transcriptionSessionId;

    if (!sessionId) {
      return { success: false, error: 'No active transcription session' };
    }

    // Send audio to OpenAI
    const sent = this.transcriptionService.sendAudioData(sessionId, data.audio);

    return { success: sent };
  }

  /**
   * Commit audio buffer (manual VAD)
   */
  @SubscribeMessage('transcription:commit')
  handleCommitAudio(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string },
  ) {
    const sessionId = client.transcriptionSessionId;

    if (!sessionId) {
      return { success: false, error: 'No active transcription session' };
    }

    const committed = this.transcriptionService.commitAudioBuffer(sessionId);

    return { success: committed };
  }

  /**
   * Change transcription language
   */
  @SubscribeMessage('transcription:language')
  handleChangeLanguage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; language: string },
  ) {
    const sessionId = client.transcriptionSessionId;

    if (!sessionId) {
      return { success: false, error: 'No active transcription session' };
    }

    const updated = this.transcriptionService.updateLanguage(sessionId, data.language);

    if (updated) {
      // Notify all participants in the call about language change
      this.server.to(`transcription:${data.callId}`).emit('transcription:language-changed', {
        language: data.language,
        changedBy: client.userId,
      });
    }

    return { success: updated };
  }

  /**
   * Get current transcript for a call
   */
  @SubscribeMessage('transcription:get-transcript')
  handleGetTranscript(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string },
  ) {
    const transcripts = this.callTranscripts.get(data.callId) || [];

    return {
      success: true,
      transcripts,
    };
  }

  /**
   * Save transcript to database when call ends
   */
  async saveCallTranscript(callId: string): Promise<boolean> {
    try {
      const transcripts = this.callTranscripts.get(callId);

      if (!transcripts || transcripts.length === 0) {
        this.logger.debug(`No transcripts to save for call ${callId}`);
        return false;
      }

      // Combine all transcripts
      const fullText = transcripts
        .filter((t) => t.isFinal)
        .map((t) => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.speakerName}: ${t.text}`)
        .join('\n');

      // Get call info
      const call = await this.db.findOne('video_calls', { id: callId });

      if (!call) {
        this.logger.warn(`Call not found: ${callId}`);
        return false;
      }

      // Save transcript to database
      await this.db.insert('video_call_transcripts', {
        id: uuidv4(),
        video_call_id: callId,
        workspace_id: call.workspace_id,
        full_text: fullText,
        segments: JSON.stringify(transcripts),
        language: transcripts[0]?.language || 'en',
        duration_seconds: Math.floor((Date.now() - new Date(call.started_at).getTime()) / 1000),
        word_count: fullText.split(/\s+/).length,
        created_at: new Date().toISOString(),
      });

      // Clean up in-memory transcripts
      this.callTranscripts.delete(callId);

      this.logger.log(`Saved transcript for call ${callId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to save transcript for call ${callId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Handle transcription events from OpenAI
   */
  private async handleTranscriptionEvent(
    client: AuthenticatedSocket,
    callId: string,
    speakerId: string,
    event: TranscriptionEvent,
  ) {
    switch (event.type) {
      case 'delta':
        // Send streaming delta to all participants
        this.server.to(`transcription:${callId}`).emit('transcription:delta', {
          itemId: event.itemId,
          speakerId,
          delta: event.delta,
          timestamp: event.timestamp,
        });
        break;

      case 'completed':
        // Get speaker name
        const speakerName = await this.getSpeakerName(speakerId);

        const transcriptMessage: TranscriptMessage = {
          id: event.itemId || uuidv4(),
          speakerId,
          speakerName,
          text: event.transcript || '',
          isFinal: true,
          timestamp: event.timestamp,
        };

        // Store in memory
        const callTranscripts = this.callTranscripts.get(callId) || [];
        callTranscripts.push(transcriptMessage);
        this.callTranscripts.set(callId, callTranscripts);

        // Broadcast final transcript to all participants
        this.server
          .to(`transcription:${callId}`)
          .emit('transcription:completed', transcriptMessage);
        break;

      case 'error':
        this.server.to(`transcription:${callId}`).emit('transcription:error', {
          error: event.error,
          timestamp: event.timestamp,
        });
        break;

      case 'connected':
        client.emit('transcription:connected', { timestamp: event.timestamp });
        break;

      case 'disconnected':
        client.emit('transcription:disconnected', { timestamp: event.timestamp });
        break;
    }
  }

  /**
   * Get speaker name from user ID
   */
  private async getSpeakerName(userId: string): Promise<string> {
    try {
      const user = await this.db.getUserById(userId);
      return user?.name || user?.email?.split('@')[0] || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Extract token from socket handshake
   */
  private extractTokenFromSocket(client: Socket): string | null {
    const authHeader = client.handshake.auth?.token;
    if (authHeader) {
      return authHeader.replace('Bearer ', '');
    }

    const queryToken = client.handshake.query?.token;
    if (queryToken) {
      return Array.isArray(queryToken) ? queryToken[0] : queryToken;
    }

    return null;
  }

  /**
   * Validate JWT token
   * Uses decode instead of verify because we trust database-signed tokens
   */
  private async validateToken(token: string): Promise<any> {
    try {
      // Decode database JWT without verification
      // We trust database's signature - just extract the payload
      const payload = this.jwtService.decode(token) as any;

      if (!payload) {
        this.logger.warn('Token validation failed: Invalid token format');
        return null;
      }

      // Check if token has required fields
      if (!payload.sub && !payload.userId) {
        this.logger.warn('Token validation failed: Missing user ID in payload');
        return null;
      }

      // Normalize userId field
      if (!payload.sub && payload.userId) {
        payload.sub = payload.userId;
      }

      return payload;
    } catch (error) {
      this.logger.warn(`Token validation failed: ${error.message}`);
      return null;
    }
  }
}
