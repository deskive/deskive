import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type {
  CreateRoomOptions,
  VideoRoom,
  RoomFilters,
  TokenOptions,
  RoomToken,
  Participant,
  RecordingConfig,
  Recording,
  SessionStats,
  UpdateRoomOptions,
  EgressOptions,
  Egress,
// TODO: Replace with livekit-server-sdk imports

/**
 * database Video Conferencing Service
 * Wraps the database's video conferencing module
 */
@Injectable()
export class LivekitVideoService {
  private readonly logger = new Logger(LivekitVideoService.name);

  constructor(private readonly db: DatabaseService) {}

  // ============================================
  // Room Management
  // ============================================

  /**
   * Create a new video conference room
   */
  async createRoom(options: any): Promise<any> {
    try {
      this.logger.log(`Creating video room: ${options.roomName || options.name}`);
      this.logger.log(`Room options:`, JSON.stringify(options, null, 2));

      // Use the SDK's video conferencing module
      const roomData = await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.createRoom(options);

      this.logger.log(`Room created successfully:`, JSON.stringify(roomData, null, 2));

      const extractedRoomId = roomData.roomId || roomData.id;
      const roomName = roomData.roomName;

      this.logger.log(`Room ID: ${extractedRoomId}, Room Name: ${roomName}`);

      return roomData;
    } catch (error) {
      this.logger.error(`Failed to create room: ${error.message}`);
      this.logger.error(`Error response:`, error.response?.data);

      // If duplicate room error, the room was actually created, try to retrieve it
      if (error.message && error.message.includes('duplicate key')) {
        this.logger.warn('Duplicate room detected, room may have been created despite error');
      }

      throw error;
    }
  }

  /**
   * Get room details by ID
   */
  async getRoom(roomId: string): Promise<VideoRoom> {
    try {
      return await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.getRoom(roomId);
    } catch (error) {
      this.logger.error(`Failed to get room ${roomId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * List all rooms with optional filters
   */
  async listRooms(filters?: RoomFilters): Promise<VideoRoom[]> {
    try {
      return await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.listRooms(filters);
    } catch (error) {
      this.logger.error(`Failed to list rooms: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update room settings
   */
  async updateRoom(roomId: string, options: UpdateRoomOptions): Promise<VideoRoom> {
    try {
      this.logger.log(`Updating room: ${roomId}`);
      return await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.updateRoom(roomId, options);
    } catch (error) {
      this.logger.error(`Failed to update room ${roomId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomId: string): Promise<void> {
    try {
      this.logger.log(`Deleting room: ${roomId}`);
      await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.deleteRoom(roomId);
      this.logger.log(`Room deleted successfully: ${roomId}`);
    } catch (error) {
      this.logger.error(`Failed to delete room ${roomId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ============================================
  // Token Generation (Access Control)
  // ============================================

  /**
   * Generate access token for a participant to join a room
   */
  async generateToken(
    roomId: string,
    identity: string,
    options?: TokenOptions,
  ): Promise<RoomToken> {
    try {
      this.logger.log(`Generating token for ${identity} to join room ${roomId}`);
      const token = await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.generateToken(
        roomId,
        identity,
        options,
      );
      this.logger.log(`Token generated successfully for ${identity}`);
      return token;
    } catch (error) {
      this.logger.error(
        `Failed to generate token for ${identity}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================
  // Participant Management
  // ============================================

  /**
   * Get participant details
   */
  async getParticipant(roomId: string, participantId: string): Promise<Participant> {
    try {
      return await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.getParticipant(
        roomId,
        participantId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to get participant ${participantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * List all participants in a room
   */
  async listParticipants(roomId: string): Promise<Participant[]> {
    try {
      return await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.listParticipants(roomId);
    } catch (error) {
      this.logger.error(`Failed to list participants: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove a participant from a room
   */
  async removeParticipant(roomId: string, participantId: string): Promise<void> {
    try {
      this.logger.log(`Removing participant ${participantId} from room ${roomId}`);
      await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.removeParticipant(
        roomId,
        participantId,
      );
      this.logger.log(`Participant removed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to remove participant ${participantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================
  // Recording Management
  // ============================================

  /**
   * Start recording a room session
   */
  async startRecording(roomId: string, config?: RecordingConfig): Promise<Recording> {
    try {
      this.logger.log(`Starting recording for room ${roomId}`);
      const recording = await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.startRecording(
        roomId,
        config,
      );
      this.logger.log(`Recording started: ${recording.id}`);
      return recording;
    } catch (error) {
      this.logger.error(`Failed to start recording: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Stop an active recording
   */
  async stopRecording(roomId: string, recordingId: string): Promise<void> {
    try {
      this.logger.log(`Stopping recording: ${recordingId} in room: ${roomId}`);
      await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.stopRecording(roomId, recordingId);
      this.logger.log(`Recording stopped successfully`);
    } catch (error) {
      this.logger.error(`Failed to stop recording: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get recording details
   */
  async getRecording(roomId: string): Promise<Recording> {
    try {
      return await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.getRecording(roomId);
    } catch (error) {
      this.logger.error(`Failed to get recording: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * List all recordings for a room
   */
  async listRecordings(roomId: string): Promise<Recording[]> {
    try {
      return await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.listRecordings(roomId);
    } catch (error) {
      this.logger.error(`Failed to list recordings: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get recording by egress ID (includes file URL when ready)
   */
  async getRecordingByEgressId(egressId: string): Promise<any> {
    try {
      this.logger.log(`Getting recording by egress ID: ${egressId}`);

      // Use the SDK's videoConferencing client to call our custom endpoint
      // The endpoint is: GET /api/v1/video-conferencing/recordings/egress/:egressId
      // But since SDK doesn't have this method, we call via HTTP directly

      // Get the API URL and key from the SDK client
      const apiUrl = process.env.LIVEKIT_HOST || 'http://localhost:7880';
      const apiKey = process.env.DATABASE_SERVICE_KEY;

      const axios = require('axios');
      const response = await axios.get(
        `${apiUrl}/api/v1/video-conferencing/recordings/egress/${egressId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Recording response:`, JSON.stringify(response.data, null, 2));
      return response.data?.data || response.data;
    } catch (error) {
      this.logger.error(`Failed to get recording by egress ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Download a recording file
   */
  async downloadRecording(egressId: string): Promise<Buffer> {
    try {
      this.logger.log(`Downloading recording: ${egressId}`);

      // Use DatabaseService's downloadRecording method which handles authentication via SDK
      const recordingBuffer = await /* TODO: use LiveKit */ this.db.downloadRecording(egressId);

      this.logger.log(`Recording downloaded successfully, size: ${recordingBuffer.length} bytes`);
      return recordingBuffer;
    } catch (error) {
      this.logger.error(`Failed to download recording: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ============================================
  // Session Analytics
  // ============================================

  /**
   * Get session statistics (quality metrics, bandwidth, latency, etc.)
   */
  async getSessionStats(sessionId: string): Promise<SessionStats> {
    try {
      return await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.getSessionStats(sessionId);
    } catch (error) {
      this.logger.error(`Failed to get session stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ============================================
  // Streaming (RTMP/HLS)
  // ============================================

  /**
   * Start egress (RTMP/HLS streaming to external platforms)
   */
  async startEgress(options: EgressOptions): Promise<Egress> {
    try {
      this.logger.log(`Starting egress for room ${options.roomId}`);
      const egress = await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.startEgress(options);
      this.logger.log(`Egress started: ${egress.id}`);
      return egress;
    } catch (error) {
      this.logger.error(`Failed to start egress: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Stop an active egress
   */
  async stopEgress(egressId: string): Promise<void> {
    try {
      this.logger.log(`Stopping egress: ${egressId}`);
      await /* TODO: use LiveKit SDK */ this.db.client.videoConferencing.stopEgress(egressId);
      this.logger.log(`Egress stopped successfully`);
    } catch (error) {
      this.logger.error(`Failed to stop egress: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get direct access to the video conferencing client (for advanced use cases)
   */
  getClient() {
    return /* TODO: use LiveKit SDK */ this.db.client.videoConferencing;
  }
}
