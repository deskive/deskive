import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { LivekitVideoService } from '../video-calls/livekit-video.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationPriority } from '../notifications/dto';
import { VideoCallsGateway } from '../video-calls/gateways/video-calls.gateway';

/**
 * Recording Processor Service
 * Background job that monitors processing recordings and:
 * 1. Checks for completed recordings
 * 2. Creates file entries in Files/Videos section
 * 3. Sends notifications when recordings are ready
 * 4. Sends chat messages in the call (if still active)
 */
@Injectable()
export class RecordingProcessorService {
  private readonly logger = new Logger(RecordingProcessorService.name);
  private isProcessing = false;
  private processedCount = 0;

  constructor(
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => LivekitVideoService))
    private readonly livekitVideoService: LivekitVideoService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => VideoCallsGateway))
    private readonly videoCallsGateway: VideoCallsGateway,
  ) {}

  /**
   * Main cron job - runs every 30 seconds to check for completed recordings
   */
  @Cron(CronExpression.EVERY_30_SECONDS, {
    name: 'process-pending-recordings',
    timeZone: 'UTC',
  })
  async handlePendingRecordings() {
    if (this.isProcessing) {
      this.logger.debug('[Recording] Previous job still running, skipping...');
      return;
    }

    try {
      this.isProcessing = true;

      // Find all recordings with status 'processing'
      const pendingRecordings = await this.getPendingRecordings();

      if (pendingRecordings.length === 0) {
        return;
      }

      this.logger.log(`[Recording] Processing ${pendingRecordings.length} pending recording(s)`);

      for (const recording of pendingRecordings) {
        await this.processRecording(recording);
        this.processedCount++;
      }

      this.logger.log(`[Recording] Completed processing ${pendingRecordings.length} recording(s)`);
    } catch (error) {
      this.logger.error(`[Recording] Error processing recordings: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get all recordings with 'processing' status
   */
  private async getPendingRecordings(): Promise<any[]> {
    try {
      const result = await this.db.findMany('video_call_recordings', {
        status: 'processing',
      });

      return Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
    } catch (error) {
      this.logger.error(`[Recording] Error fetching pending recordings: ${error.message}`);
      return [];
    }
  }

  /**
   * Process a single recording - check status and finalize if complete
   */
  private async processRecording(recording: any): Promise<void> {
    const recordingId = recording.id;
    const egressId = recording.livekit_recording_id;

    try {
      this.logger.log(`[Recording] Checking recording ${recordingId} (egress: ${egressId})`);

      // Get the video call to get room ID and workspace info
      const call = await this.db.findOne('video_calls', {
        id: recording.video_call_id,
      });

      if (!call) {
        this.logger.warn(`[Recording] Video call not found for recording ${recordingId}, marking as failed`);
        await this.markRecordingFailed(recordingId, recording, 'Video call not found');
        return;
      }

      // Try to get recording status from database using egress ID
      let recordingUrl: string | null = null;
      let fileSize = 0;
      let notFound = false;

      try {
        // Use the new endpoint that queries by egress ID
        const livekitRecording = await this.dbVideoService.getRecordingByEgressId(egressId);
        this.logger.log(`[Recording] LiveKit recording response:`, JSON.stringify(livekitRecording, null, 2));

        if (livekitRecording) {
          recordingUrl = livekitRecording.fileUrl || null;
          fileSize = livekitRecording.fileSize || 0;
        }
      } catch (error: any) {
        // Check if it's a 404 error - recording doesn't exist in database
        if (error.response?.status === 404 || error.message?.includes('404')) {
          notFound = true;
          this.logger.warn(`[Recording] Recording ${recordingId} not found in LiveKit (404)`);
        } else {
          this.logger.debug(`[Recording] Failed to get recording from database: ${error.message}`);
        }
      }

      // If database returned 404, check how old this recording is
      // Old recordings that don't exist in database should be marked as failed
      if (notFound) {
        const createdAt = new Date(recording.created_at);
        const now = new Date();
        const minutesPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60);

        // If recording is older than 10 minutes and not found in database, mark as failed
        if (minutesPassed > 10) {
          this.logger.warn(`[Recording] Recording ${recordingId} not found in LiveKit after ${minutesPassed.toFixed(1)} mins, marking as failed`);
          await this.markRecordingFailed(recordingId, recording, 'Recording not found in LiveKit (legacy recording)');
          return;
        }
      }

      // Check timeout using created_at as fallback
      if (!recordingUrl) {
        const checkTime = recording.completed_at ? new Date(recording.completed_at) : new Date(recording.created_at);
        const now = new Date();
        const minutesPassed = (now.getTime() - checkTime.getTime()) / (1000 * 60);

        if (minutesPassed > 30) {
          this.logger.warn(`[Recording] Recording ${recordingId} timed out after ${minutesPassed.toFixed(1)} minutes`);
          await this.markRecordingFailed(recordingId, recording, 'Recording processing timed out');
        } else {
          this.logger.debug(`[Recording] Recording ${recordingId} still processing (no URL yet, ${minutesPassed.toFixed(1)} mins elapsed)`);
        }
        return;
      }

      this.logger.log(`[Recording] Recording ${recordingId} is complete! URL: ${recordingUrl}, Size: ${fileSize}`);

      // Update recording with URL and completed status
      await this.db.update('video_call_recordings', { id: recordingId }, {
        status: 'completed',
        recording_url: recordingUrl,
        file_size_bytes: fileSize.toString(),
      });

      // Create file entry in Files/Videos section
      await this.createFileEntry(recording, call, recordingUrl, fileSize);

      // Send notification to the host
      await this.sendRecordingNotification(recording, call, recordingUrl);

      // Send chat message in the call (if gateway supports it)
      try {
        this.videoCallsGateway.sendRecordingMessage(call.id, recordingUrl);
      } catch (error) {
        this.logger.debug(`[Recording] Could not send chat message (call may have ended): ${error.message}`);
      }

      this.logger.log(`[Recording] Successfully processed recording ${recordingId}`);
    } catch (error) {
      this.logger.error(`[Recording] Error processing recording ${recordingId}: ${error.message}`, error.stack);
    }
  }

  /**
   * Mark a recording as failed with a reason
   */
  private async markRecordingFailed(recordingId: string, recording: any, reason: string): Promise<void> {
    try {
      await this.db.update('video_call_recordings', { id: recordingId }, {
        status: 'failed',
        metadata: {
          ...recording.metadata,
          failure_reason: reason,
          failed_at: new Date().toISOString(),
        },
      });
      this.logger.log(`[Recording] Marked recording ${recordingId} as failed: ${reason}`);
    } catch (error) {
      this.logger.error(`[Recording] Failed to mark recording ${recordingId} as failed: ${error.message}`);
    }
  }

  /**
   * Manual cleanup - mark all old processing recordings as failed
   * Called via API endpoint for one-time cleanup
   */
  async cleanupStuckRecordings(): Promise<{ cleaned: number; ids: string[] }> {
    const pendingRecordings = await this.getPendingRecordings();
    const cleanedIds: string[] = [];

    for (const recording of pendingRecordings) {
      const createdAt = new Date(recording.created_at);
      const now = new Date();
      const minutesPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      // Mark as failed if older than 5 minutes (for cleanup)
      if (minutesPassed > 5) {
        await this.markRecordingFailed(recording.id, recording, 'Manual cleanup - legacy recording');
        cleanedIds.push(recording.id);
      }
    }

    this.logger.log(`[Recording] Cleaned up ${cleanedIds.length} stuck recordings`);
    return { cleaned: cleanedIds.length, ids: cleanedIds };
  }

  /**
   * Create a file entry in the Files system under Videos category
   */
  private async createFileEntry(
    recording: any,
    call: any,
    recordingUrl: string,
    fileSize: number,
  ): Promise<void> {
    try {
      const callTitle = call.title || 'Video Call Recording';
      const formattedDate = new Date(recording.started_at || recording.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const fileName = `${callTitle} - ${formattedDate}.mp4`;
      const storagePath = `workspaces/${call.workspace_id}/recordings/${recording.id}.mp4`;

      const fileData = {
        workspace_id: call.workspace_id,
        name: fileName,
        storage_path: storagePath,
        url: recordingUrl,
        mime_type: 'video/mp4',
        size: fileSize.toString(),
        uploaded_by: call.host_user_id,
        folder_id: null, // Root level - Videos section will filter by mime_type
        parent_folder_ids: [],
        is_ai_generated: false,
        metadata: {
          description: `Recording of video call: ${callTitle}`,
          tags: ['recording', 'video-call'],
          source: 'video-call-recording',
          video_call_id: call.id,
          recording_id: recording.id,
          duration_seconds: recording.duration_seconds,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const createdFile = await this.db.insert('files', fileData);
      this.logger.log(`[Recording] Created file entry: ${createdFile.id} for recording ${recording.id}`);
    } catch (error) {
      this.logger.error(`[Recording] Failed to create file entry: ${error.message}`, error.stack);
    }
  }

  /**
   * Send notification to the host when recording is ready
   */
  private async sendRecordingNotification(
    recording: any,
    call: any,
    recordingUrl: string,
  ): Promise<void> {
    try {
      const callTitle = call.title || 'Video Call';

      await this.notificationsService.sendNotification({
        user_id: call.host_user_id,
        type: NotificationType.VIDEO_CALL,
        title: 'Recording Ready',
        message: `Your recording of "${callTitle}" is now available to download.`,
        action_url: `/workspaces/${call.workspace_id}/files?category=videos`,
        priority: NotificationPriority.NORMAL,
        send_push: true,
        data: {
          category: 'video-call',
          entity_type: 'recording',
          entity_id: recording.id,
          video_call_id: call.id,
          workspace_id: call.workspace_id,
          recording_url: recordingUrl,
        },
      });

      this.logger.log(`[Recording] Sent notification to host ${call.host_user_id}`);

      // Also notify all participants who were in the call
      const participants = await this.getCallParticipants(call.id);
      for (const participant of participants) {
        if (participant.user_id !== call.host_user_id) {
          try {
            await this.notificationsService.sendNotification({
              user_id: participant.user_id,
              type: NotificationType.VIDEO_CALL,
              title: 'Recording Ready',
              message: `A recording of "${callTitle}" is now available.`,
              action_url: `/workspaces/${call.workspace_id}/files?category=videos`,
              priority: NotificationPriority.NORMAL,
              send_push: true,
              data: {
                category: 'video-call',
                entity_type: 'recording',
                entity_id: recording.id,
                video_call_id: call.id,
                workspace_id: call.workspace_id,
              },
            });
          } catch (error) {
            this.logger.debug(`[Recording] Failed to notify participant ${participant.user_id}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`[Recording] Failed to send notifications: ${error.message}`, error.stack);
    }
  }

  /**
   * Get all participants who were in the call
   */
  private async getCallParticipants(callId: string): Promise<any[]> {
    try {
      const result = await this.db.findMany('video_call_participants', {
        video_call_id: callId,
        status: 'joined', // Only notify users who actually joined
      });

      return Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get processing stats (for monitoring/debugging)
   */
  async getProcessingStats(): Promise<any> {
    const pendingRecordings = await this.getPendingRecordings();

    const completedResult = await this.db.findMany('video_call_recordings', {
      status: 'completed',
    });
    const completed = Array.isArray(completedResult.data) ? completedResult.data : [];

    const failedResult = await this.db.findMany('video_call_recordings', {
      status: 'failed',
    });
    const failed = Array.isArray(failedResult.data) ? failedResult.data : [];

    return {
      pending: pendingRecordings.length,
      completed: completed.length,
      failed: failed.length,
      total_processed: this.processedCount,
      is_running: this.isProcessing,
    };
  }
}
