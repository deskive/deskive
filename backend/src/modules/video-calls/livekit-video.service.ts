/**
 * Video conferencing service - delegates to a pluggable provider.
 *
 * Despite the historical filename `livekit-video.service.ts`, this is
 * actually a multi-provider façade. The active provider is selected by
 * the VIDEO_PROVIDER env var (jitsi / livekit / daily / none) - see
 * src/modules/video-calls/providers/index.ts for the factory and
 * MIGRATION.md for the env vars each provider needs.
 *
 * Existing call sites (VideoCallsService, RecordingProcessorService,
 * etc.) keep using LivekitVideoService unchanged - they don't need to
 * know which provider is active.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import {
  CreateRoomOptions,
  Participant,
  Recording,
  RecordingConfig,
  RoomToken,
  TokenOptions,
  VideoProvider,
  VideoRoom,
  createVideoProvider,
} from './providers';

@Injectable()
export class LivekitVideoService {
  private readonly logger = new Logger(LivekitVideoService.name);
  private readonly provider: VideoProvider;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    this.provider = createVideoProvider(this.config);
    this.logger.log(`Video provider initialized: ${this.provider.name} (available=${this.provider.isAvailable()})`);
  }

  /**
   * Returns true if the configured video provider can actually do work.
   * Always true for `jitsi` (uses public meet.jit.si as fallback) and
   * for `none` it's false. For `livekit` / `daily` it depends on whether
   * the API credentials are set.
   */
  isAvailable(): boolean {
    return this.provider.isAvailable();
  }

  /**
   * Frontend bootstrap info: which provider is active and the public
   * config the client SDK needs to connect. Returned over an API
   * endpoint so the frontend knows which video SDK to load.
   */
  getProviderInfo() {
    return {
      provider: this.provider.name,
      available: this.provider.isAvailable(),
      ...this.provider.getClientSdkInfo(),
    };
  }

  // ============================================
  // Room Management
  // ============================================

  /**
   * Create a new video conference room.
   * Accepts both the new CreateRoomOptions shape AND the legacy shape
   * (`{name, maxParticipants, recordingEnabled}` from older callers).
   */
  async createRoom(options: any): Promise<any> {
    const normalized: CreateRoomOptions = {
      roomName: options.roomName || options.name || `room-${Date.now()}`,
      maxParticipants: options.maxParticipants ?? 50,
      emptyTimeout: options.emptyTimeout,
      metadata: options.metadata,
      recordingEnabled: options.recordingEnabled ?? false,
    };
    this.logger.log(`Creating video room: ${normalized.roomName} (provider=${this.provider.name})`);
    const room = await this.provider.createRoom(normalized);
    // Legacy callers expect both `roomId` and `id` fields - synthesize.
    return { ...room, id: room.roomId };
  }

  async getRoom(roomId: string): Promise<VideoRoom | null> {
    return this.provider.getRoom(roomId);
  }

  async listRooms(_filters?: any): Promise<VideoRoom[]> {
    return this.provider.listRooms();
  }

  async updateRoom(_roomId: string, _options: any): Promise<VideoRoom | null> {
    // Most providers don't support in-place room updates - the typical
    // pattern is delete+recreate. Return the current room as a no-op.
    return this.provider.getRoom(_roomId);
  }

  async deleteRoom(roomId: string): Promise<void> {
    this.logger.log(`Deleting video room: ${roomId}`);
    return this.provider.deleteRoom(roomId);
  }

  // ============================================
  // Token Generation
  // ============================================

  /**
   * Generate a room access token for a participant.
   * Legacy signature: generateToken(roomId, identity, options?)
   */
  async generateToken(roomId: string, identityOrOptions: string | TokenOptions, options?: any): Promise<RoomToken> {
    const tokenOptions: TokenOptions =
      typeof identityOrOptions === 'string'
        ? {
            identity: identityOrOptions,
            name: options?.name ?? options?.userName,
            ttl: options?.ttl,
            canPublish: options?.canPublish,
            canSubscribe: options?.canSubscribe,
            canPublishData: options?.canPublishData,
            isAdmin: options?.isAdmin ?? options?.isOwner,
          }
        : identityOrOptions;
    this.logger.log(`Generating ${this.provider.name} token for ${tokenOptions.identity} on room ${roomId}`);
    return this.provider.generateToken(roomId, tokenOptions);
  }

  // ============================================
  // Participant Management
  // ============================================

  async getParticipant(roomId: string, participantId: string): Promise<Participant | null> {
    const all = await this.provider.listParticipants(roomId);
    return all.find((p) => p.identity === participantId) ?? null;
  }

  async listParticipants(roomId: string): Promise<Participant[]> {
    return this.provider.listParticipants(roomId);
  }

  async removeParticipant(roomId: string, participantId: string): Promise<void> {
    this.logger.log(`Removing ${participantId} from ${roomId} (provider=${this.provider.name})`);
    return this.provider.removeParticipant(roomId, participantId);
  }

  // ============================================
  // Recording Management
  // ============================================

  async startRecording(roomId: string, config?: RecordingConfig): Promise<Recording> {
    this.logger.log(`Starting recording for room ${roomId} (provider=${this.provider.name})`);
    return this.provider.startRecording(roomId, config);
  }

  async stopRecording(roomIdOrRecordingId: string, recordingId?: string): Promise<void> {
    // Legacy signature was stopRecording(roomId, recordingId). New providers
    // only need the recording ID.
    const id = recordingId ?? roomIdOrRecordingId;
    this.logger.log(`Stopping recording: ${id}`);
    return this.provider.stopRecording(id);
  }

  async getRecording(recordingId: string): Promise<Recording | null> {
    return this.provider.getRecording(recordingId);
  }

  async listRecordings(_roomId: string): Promise<Recording[]> {
    // Per-room recording listing is provider-specific. Return empty by
    // default; concrete providers can override via their own methods.
    return [];
  }

  /**
   * Look up a recording by its egress / job ID. This used to live in the
   * legacy LivekitVideoService and is still called by the recording
   * processor cron job.
   */
  async getRecordingByEgressId(egressId: string): Promise<Recording | null> {
    return this.provider.getRecording(egressId);
  }

  /**
   * Download a finished recording's bytes. Defers to DatabaseService's
   * generic download path (which is wired to the configured S3-compat
   * storage backend - same one used everywhere else in the app).
   */
  async downloadRecording(egressId: string): Promise<Buffer> {
    this.logger.log(`Downloading recording: ${egressId}`);
    return this.db.downloadRecording(egressId);
  }

  // ============================================
  // Session Analytics
  // ============================================

  async getSessionStats(_sessionId: string): Promise<any> {
    return null;
  }

  // ============================================
  // Streaming (legacy egress passthrough)
  // ============================================

  async startEgress(options: any): Promise<any> {
    return this.provider.startRecording(options.roomId, options);
  }

  async stopEgress(egressId: string): Promise<void> {
    return this.provider.stopRecording(egressId);
  }

  // ============================================
  // Direct provider access (escape hatch)
  // ============================================

  /**
   * Get the underlying VideoProvider instance for advanced use cases.
   * Avoid this if possible - prefer the methods above.
   */
  getProvider(): VideoProvider {
    return this.provider;
  }

  /** Legacy alias used by some call sites. */
  getClient(): VideoProvider {
    return this.provider;
  }
}
