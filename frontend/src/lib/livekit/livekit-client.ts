// src/lib/livekit/livekit-client.ts
import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  Track,
  LocalTrack,
  LocalVideoTrack,
  LocalAudioTrack,
  VideoPresets,
  RemoteTrackPublication,
  Participant,
} from 'livekit-client';

/**
 * LiveKit Client Wrapper for Video Calls
 * Integrates with deskive backend video conferencing
 */
export class LiveKitClient {
  private room: Room | null = null;
  private localVideoTrack: LocalVideoTrack | null = null;
  private localAudioTrack: LocalAudioTrack | null = null;
  private eventHandlers = new Map<string, Set<Function>>();

  /**
   * Connect to a LiveKit room
   */
  async connect(url: string, token: string, options?: any): Promise<Room> {
    if (this.room?.state === 'connected') {
      console.log('[LiveKit] Already connected to room');
      return this.room;
    }

    console.log('[LiveKit] Connecting to room...');

    // Create room instance
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
      ...options,
    });

    // Setup event listeners
    this.setupRoomEvents();

    // Connect to room
    await this.room.connect(url, token);

    console.log('✅ [LiveKit] Connected to room:', this.room.name);

    return this.room;
  }

  /**
   * Setup room event handlers
   */
  private setupRoomEvents(): void {
    if (!this.room) return;

    this.room
      .on(RoomEvent.Connected, () => {
        console.log('✅ [LiveKit] Room connected');
        this.emit('connected');
      })
      .on(RoomEvent.Disconnected, (reason) => {
        console.log('❌ [LiveKit] Room disconnected:', reason);
        this.emit('disconnected', reason);
      })
      .on(RoomEvent.Reconnecting, () => {
        console.log('🔄 [LiveKit] Reconnecting...');
        this.emit('reconnecting');
      })
      .on(RoomEvent.Reconnected, () => {
        console.log('✅ [LiveKit] Reconnected');
        this.emit('reconnected');
      })
      .on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('[LiveKit] Participant connected:', participant.identity);
        this.emit('participantConnected', participant);
      })
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('[LiveKit] Participant disconnected:', participant.identity);
        this.emit('participantDisconnected', participant);
      })
      .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('[LiveKit] Track subscribed:', track.kind, 'from', participant.identity);
        this.emit('trackSubscribed', { track, publication, participant });
      })
      .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('[LiveKit] Track unsubscribed:', track.kind, 'from', participant.identity);
        this.emit('trackUnsubscribed', { track, publication, participant });
      })
      .on(RoomEvent.LocalTrackPublished, (publication) => {
        console.log('[LiveKit] Local track published:', publication.kind);
        this.emit('localTrackPublished', publication);
      })
      .on(RoomEvent.LocalTrackUnpublished, (publication) => {
        console.log('[LiveKit] Local track unpublished:', publication.kind);
        this.emit('localTrackUnpublished', publication);
      })
      .on(RoomEvent.TrackMuted, (publication, participant) => {
        console.log('[LiveKit] Track muted:', publication.kind, 'from', participant.identity);
        this.emit('trackMuted', { publication, participant });
      })
      .on(RoomEvent.TrackUnmuted, (publication, participant) => {
        console.log('[LiveKit] Track unmuted:', publication.kind, 'from', participant.identity);
        this.emit('trackUnmuted', { publication, participant });
      })
      .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        this.emit('activeSpeakersChanged', speakers);
      })
      .on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        this.emit('connectionQualityChanged', { quality, participant });
      })
      .on(RoomEvent.DataReceived, (payload, participant) => {
        this.emit('dataReceived', { payload, participant });
      });
  }

  /**
   * Disconnect from room
   */
  async disconnect(): Promise<void> {
    if (this.room) {
      console.log('[LiveKit] Disconnecting from room...');
      await this.room.disconnect();
      this.room = null;
    }

    // Stop local tracks
    await this.stopLocalTracks();
  }

  /**
   * Enable camera
   */
  async enableCamera(enabled: boolean = true): Promise<LocalVideoTrack | null> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }

    if (enabled) {
      if (!this.localVideoTrack) {
        const publication = await this.room.localParticipant.setCameraEnabled(true);
        this.localVideoTrack = publication ? (publication.track as LocalVideoTrack) : null;
      }
      return this.localVideoTrack;
    } else {
      await this.room.localParticipant.setCameraEnabled(false);
      this.localVideoTrack = null;
      return null;
    }
  }

  /**
   * Enable microphone
   */
  async enableMicrophone(enabled: boolean = true): Promise<LocalAudioTrack | null> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }

    if (enabled) {
      if (!this.localAudioTrack) {
        const publication = await this.room.localParticipant.setMicrophoneEnabled(true);
        this.localAudioTrack = publication ? (publication.track as LocalAudioTrack) : null;
      }
      return this.localAudioTrack;
    } else {
      await this.room.localParticipant.setMicrophoneEnabled(false);
      this.localAudioTrack = null;
      return null;
    }
  }

  /**
   * Toggle camera
   */
  async toggleCamera(): Promise<boolean> {
    if (!this.room) return false;
    const enabled = this.room.localParticipant.isCameraEnabled;
    await this.enableCamera(!enabled);
    return !enabled;
  }

  /**
   * Toggle microphone
   */
  async toggleMicrophone(): Promise<boolean> {
    if (!this.room) return false;
    const enabled = this.room.localParticipant.isMicrophoneEnabled;
    await this.enableMicrophone(!enabled);
    return !enabled;
  }

  /**
   * Start screen share
   */
  async startScreenShare(): Promise<LocalTrack | null> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }

    const publication = await this.room.localParticipant.setScreenShareEnabled(true);
    const track = publication ? (publication.track as LocalTrack) : null;
    console.log('[LiveKit] Screen share started');
    return track;
  }

  /**
   * Stop screen share
   */
  async stopScreenShare(): Promise<void> {
    if (!this.room) return;
    await this.room.localParticipant.setScreenShareEnabled(false);
    console.log('[LiveKit] Screen share stopped');
  }

  /**
   * Send data message to participants
   */
  async sendDataMessage(data: string | Uint8Array, options?: { reliable?: boolean; topic?: string }): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }

    const encoder = new TextEncoder();
    const payload = typeof data === 'string' ? encoder.encode(data) : data;

    await this.room.localParticipant.publishData(payload, { reliable: options?.reliable ?? true });
  }

  /**
   * Get local participant
   */
  getLocalParticipant(): LocalParticipant | null {
    return this.room?.localParticipant ?? null;
  }

  /**
   * Get remote participants
   */
  getRemoteParticipants(): Map<string, RemoteParticipant> {
    return this.room?.remoteParticipants ?? new Map();
  }

  /**
   * Get room
   */
  getRoom(): Room | null {
    return this.room;
  }

  /**
   * Get connection state
   */
  getConnectionState(): string {
    return this.room?.state ?? 'disconnected';
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.room?.state === 'connected';
  }

  /**
   * Stop all local tracks
   */
  private async stopLocalTracks(): Promise<void> {
    if (this.localVideoTrack) {
      this.localVideoTrack.stop();
      this.localVideoTrack = null;
    }
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack = null;
    }
  }

  // ============================================
  // Event Emitter
  // ============================================

  on(event: string, callback: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    this.eventHandlers.get(event)?.delete(callback);
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((callback) => callback(data));
    }
  }
}

// Export singleton instance
export const liveKitClient = new LiveKitClient();
export default liveKitClient;
