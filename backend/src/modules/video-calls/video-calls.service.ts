import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { LivekitVideoService } from './livekit-video.service';
import { CalendarService } from '../calendar/calendar.service';
import { EventPriority, EventStatus } from '../calendar/dto/create-event.dto';
import { VideoCallsGateway } from './gateways/video-calls.gateway';
import { AppGateway } from '../../common/gateways/app.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationPriority } from '../notifications/dto';
import { MeetingIntelligenceService } from './services/meeting-intelligence.service';
import {
  CreateVideoCallDto,
  JoinVideoCallDto,
  UpdateParticipantDto,
  StartRecordingDto,
  InviteParticipantsDto,
} from './dto';

@Injectable()
export class VideoCallsService {
  private readonly logger = new Logger(VideoCallsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly livekitVideoService: LivekitVideoService,
    @Inject(forwardRef(() => CalendarService))
    private readonly calendarService: CalendarService,
    @Inject(forwardRef(() => VideoCallsGateway))
    private readonly videoCallsGateway: VideoCallsGateway,
    @Inject(forwardRef(() => AppGateway))
    private readonly appGateway: AppGateway,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly meetingIntelligenceService: MeetingIntelligenceService,
  ) {}

  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }

  // Legacy alias used throughout the file - points at the LiveKit service
  private get dbVideoService(): LivekitVideoService {
    return this.livekitVideoService;
  }

  // ============================================
  // Video Call CRUD Operations
  // ============================================

  /**
   * Create a new video call
   * - Validates workspace membership
   * - Creates database room
   * - Stores call in database
   * - Adds initial participants
   */
  async createCall(workspaceId: string, userId: string, dto: CreateVideoCallDto) {
    this.logger.log(`Creating video call in workspace ${workspaceId} by user ${userId}`);

    // 1. Verify user is workspace member
    await this.verifyWorkspaceMembership(workspaceId, userId);

    // 2. Verify all invited participants are workspace members
    if (dto.participant_ids && dto.participant_ids.length > 0) {
      for (const participantId of dto.participant_ids) {
        await this.verifyWorkspaceMembership(workspaceId, participantId);
      }
    }

    // 3. Create database video room
    // Note: database generates room ID automatically, make roomName unique to avoid duplicates
    // Sanitize title to remove spaces and special characters for URL compatibility
    const sanitizedTitle = (dto.title || 'Video Call')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric chars with hyphens
      .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
    const uniqueRoomName = `${sanitizedTitle}_${Date.now()}`;
    this.logger.log(`Attempting to create LiveKit room: ${uniqueRoomName}`);

    let livekitRoom: any;
    try {
      livekitRoom = await this.dbVideoService.createRoom({
        roomName: uniqueRoomName,
        maxParticipants: dto.max_participants || 50,
        recordingEnabled: dto.recording_enabled || false,
      } as any);

      this.logger.log(`LiveKit room created successfully:`, livekitRoom);
    } catch (error) {
      this.logger.error(`Failed to create LiveKit room:`, error);
      throw new BadRequestException(`Failed to create video room: ${error.message}`);
    }

    if (!livekitRoom || (!livekitRoom.id && !livekitRoom.roomId)) {
      this.logger.error('LiveKit room response invalid:', livekitRoom);
      throw new BadRequestException('Failed to create video room - no room ID returned');
    }

    // Use roomId or id from response
    const roomId = livekitRoom.roomId || livekitRoom.id;
    const roomName = livekitRoom.roomName || uniqueRoomName;

    // 4. Store call in database - use roomName as livekit_room_id for compatibility
    // Build invitees array: host + attendees
    const invitees = [userId]; // Start with host
    if (dto.participant_ids && dto.participant_ids.length > 0) {
      invitees.push(...dto.participant_ids);
    }

    const callData = {
      workspace_id: workspaceId,
      livekit_room_id: roomName, // Store roomName for display/token generation
      title: dto.title,
      description: dto.description,
      host_user_id: userId,
      call_type: dto.call_type,
      is_group_call: dto.is_group_call || false,
      status: dto.scheduled_start_time ? 'scheduled' : 'active',
      is_recording: false,
      scheduled_start_time: dto.scheduled_start_time || null,
      scheduled_end_time: dto.scheduled_end_time || null,
      actual_start_time: dto.scheduled_start_time ? null : new Date().toISOString(),
      invitees, // Array of user IDs (host + attendees)
      settings: {
        video_quality: dto.video_quality || 'hd',
        max_participants: dto.max_participants || 50,
        e2ee_enabled: dto.e2ee_enabled || false,
        lock_on_join: dto.lock_on_join || false,
      },
      metadata: {
        livekit_room_id: roomId, // Store actual LiveKit room ID for API calls
        livekit_room_name: roomName, // Store room name
        livekit_join_url: livekitRoom.joinUrl,
        livekit_embed_url: livekitRoom.embedUrl,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const call = await this.db.insert('video_calls', callData);

    this.logger.log(`Video call created: ${call.id}`);

    // 5. Add host as first participant (automatically joined)
    await this.db.insert('video_call_participants', {
      video_call_id: call.id,
      user_id: userId,
      role: 'host',
      status: 'joined', // Host automatically joins
      joined_at: dto.scheduled_start_time ? null : new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    // 6. Add invited participants (status: invited)
    if (dto.participant_ids && dto.participant_ids.length > 0) {
      for (const participantId of dto.participant_ids) {
        await this.db.insert('video_call_participants', {
          video_call_id: call.id,
          user_id: participantId,
          role: 'participant',
          status: 'invited', // Default status for invitees
          created_at: new Date().toISOString(),
        });
      }
    }

    // 7. Send incoming call notifications for instant calls (not scheduled)
    if (!dto.scheduled_start_time && dto.participant_ids && dto.participant_ids.length > 0) {
      try {
        this.logger.log('📞 [VideoCallService] Instant call detected, preparing to send notifications');
        this.logger.log(`📋 [VideoCallService] Participant IDs: ${JSON.stringify(dto.participant_ids)}`);
        this.logger.log(`📋 [VideoCallService] Host User ID: ${userId}`);

        // Get host user info
        const hostUser = await this.db.getUserById(userId);
        const hostName = hostUser?.metadata?.name || (hostUser as any)?.fullName || hostUser?.name || hostUser?.email?.split('@')[0] || 'Someone';
        const hostAvatar = hostUser?.metadata?.avatarUrl || undefined;

        this.logger.log(`👤 [VideoCallService] Host info - Name: ${hostName}, Avatar: ${hostAvatar}`);

        const callNotificationData = {
          callId: call.id,
          callType: dto.call_type,
          isGroupCall: dto.is_group_call || false,
          callerUserId: userId,
          callerName: hostName,
          callerAvatar: hostAvatar,
          participantIds: dto.participant_ids,
        };

        this.logger.log(`📤 [VideoCallService] Sending notification with data: ${JSON.stringify(callNotificationData, null, 2)}`);

        // Send incoming call notification via VideoCalls WebSocket namespace (for Flutter app)
        this.videoCallsGateway.sendIncomingCallNotification(dto.participant_ids, callNotificationData);

        this.logger.log(`✅ [VideoCallService] Sent WebSocket notifications via /video-calls namespace to ${dto.participant_ids.length} participants`);

        // ALSO send via main AppGateway (for web clients on main '/' namespace)
        // This ensures both web and mobile clients receive the incoming call notification
        for (const participantId of dto.participant_ids) {
          if (participantId !== userId) { // Don't send to caller
            this.appGateway.emitToUser(participantId, 'call:incoming', {
              callId: call.id,
              callType: dto.call_type,
              isGroupCall: dto.is_group_call || false,
              from: {
                id: userId,
                name: hostName,
                avatar: hostAvatar,
              },
              participants: dto.participant_ids,
            });
          }
        }

        this.logger.log(`✅ [VideoCallService] Sent WebSocket notifications via main '/' namespace to ${dto.participant_ids.length} participants`);

        // Send data-only FCM push notification for incoming call
        // This allows Flutter app to show full-screen call UI with ringtone
        await this.notificationsService.sendIncomingCallNotification(
          dto.participant_ids,
          {
            call_id: call.id,
            call_type: dto.call_type,
            is_group_call: dto.is_group_call || false,
            caller_user_id: userId,
            caller_name: hostName,
            caller_avatar: hostAvatar,
            workspace_id: workspaceId,
          },
        );

        this.logger.log(`✅ [VideoCallService] Sent data-only FCM call notification to ${dto.participant_ids.length} participants`);
      } catch (error) {
        this.logger.error(`❌ [VideoCallService] Failed to send incoming call notifications: ${error.message}`);
        this.logger.error(`📋 [VideoCallService] Error stack: ${error.stack}`);
        // Don't fail the whole operation if notifications fail
      }
    } else {
      if (dto.scheduled_start_time) {
        this.logger.log('📅 [VideoCallService] Scheduled call - skipping instant notifications');
      } else if (!dto.participant_ids || dto.participant_ids.length === 0) {
        this.logger.log('👥 [VideoCallService] No participants - skipping notifications');
      }
    }

    // 8. Create calendar event if scheduled
    if (dto.scheduled_start_time) {
      try {
        const calendarEvent = await this.calendarService.createEvent(
          workspaceId,
          {
            title: dto.title || 'Video Call',
            description: dto.description || `${dto.call_type === 'video' ? 'Video' : 'Audio'} call`,
            start_time: dto.scheduled_start_time,
            end_time: dto.scheduled_end_time || new Date(new Date(dto.scheduled_start_time).getTime() + 3600000).toISOString(), // Default 1 hour
            all_day: false,
            location: 'Video Call',
            attendees: dto.participant_ids || [],
            meeting_url: livekitRoom.joinUrl || call.metadata?.livekit_join_url,
            visibility: 'workspace' as any,
            priority: EventPriority.NORMAL,
            status: EventStatus.CONFIRMED,
            category_id: null,
          },
          userId
        );

        // Link calendar event to video call
        await this.db.update(
          'video_calls',
          { id: call.id },
          {
            metadata: {
              ...call.metadata,
              calendar_event_id: calendarEvent.id,
            },
          }
        );

        this.logger.log(`Calendar event created for video call: ${calendarEvent.id}`);
      } catch (error) {
        this.logger.warn(`Failed to create calendar event: ${error.message}`);
        // Don't fail the whole operation if calendar sync fails
      }
    }

    // 9. Send notifications to invitees (excluding host) for scheduled meetings
    if (dto.scheduled_start_time && dto.participant_ids && dto.participant_ids.length > 0) {
      try {
        // Get host user info from auth service
        const hostUser = await this.db.getUserById(userId);
        const hostName = hostUser?.metadata?.name || (hostUser as any)?.fullName || hostUser?.name || hostUser?.email?.split('@')[0] || 'Someone';

        // Format the scheduled time
        const scheduledTime = new Date(dto.scheduled_start_time).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        // Send notification to each invitee
        await this.notificationsService.sendNotification({
          user_ids: dto.participant_ids, // Excludes host since it's participant_ids only
          type: NotificationType.CALENDAR,
          priority: NotificationPriority.NORMAL,
          title: `New Meeting: ${dto.title}`,
          message: `${hostName} has invited you to a meeting scheduled for ${scheduledTime}`,
          action_url: `/workspaces/${workspaceId}/video-calls?tab=scheduled`,
          data: {
            meeting_id: call.id,
            host_user_id: userId,
            scheduled_start_time: dto.scheduled_start_time,
            call_type: dto.call_type,
          },
          send_push: true,
          send_email: false,
        });

        this.logger.log(`Notifications sent to ${dto.participant_ids.length} invitees for meeting: ${call.id}`);
      } catch (error) {
        this.logger.warn(`Failed to send invitee notifications: ${error.message}`);
        // Don't fail the whole operation if notifications fail
      }
    }

    return {
      ...call,
      livekit_room: livekitRoom,
    };
  }

  /**
   * Get all video calls for a workspace where user is host or invitee
   */
  async getCallsByWorkspace(
    workspaceId: string,
    userId: string,
    filters?: {
      status?: string;
      call_type?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    // Verify workspace membership
    await this.verifyWorkspaceMembership(workspaceId, userId);

    const conditions: any = { workspace_id: workspaceId };
    if (filters?.status) {
      conditions.status = filters.status;
    }
    if (filters?.call_type) {
      conditions.call_type = filters.call_type;
    }

    const result = await this.db.findMany('video_calls', conditions, {
      orderBy: 'created_at',
      order: 'desc',
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    });

    const allCalls = result.data || [];

    // Filter to only return calls where user is host or invitee
    const userCalls = allCalls.filter((call: any) => {
      // User is the host
      if (call.host_user_id === userId) {
        return true;
      }

      // User is in the invitees array
      if (call.invitees && Array.isArray(call.invitees)) {
        return call.invitees.includes(userId);
      }

      return false;
    });

    // Populate participants with user information for each call
    const callsWithParticipants = await Promise.all(
      userCalls.map(async (call: any) => {
        try {
          // Get participants for this call
          const participantsResult = await this.db.findMany('video_call_participants', {
            video_call_id: call.id,
          });
          const participants = participantsResult.data || [];

          // Populate user information for each participant
          const participantsWithUserInfo = await Promise.all(
            participants.map(async (participant) => {
              try {
                const user = await this.db.getUserById(participant.user_id);
                return {
                  ...participant,
                  name: user?.metadata?.name || (user as any)?.fullName || user?.name || user?.email?.split('@')[0] || 'Unknown',
                  avatar: user?.metadata?.avatarUrl || user?.avatar_url || null,
                };
              } catch (error) {
                this.logger.warn(`Could not fetch user info for participant ${participant.user_id}: ${error.message}`);
                return {
                  ...participant,
                  name: 'Unknown',
                  avatar: null,
                };
              }
            })
          );

          return {
            ...call,
            participants: participantsWithUserInfo,
          };
        } catch (error) {
          this.logger.warn(`Could not fetch participants for call ${call.id}: ${error.message}`);
          return {
            ...call,
            participants: [],
          };
        }
      })
    );

    return callsWithParticipants;
  }

  /**
   * Get a single video call by ID
   */
  async getCallById(callId: string, userId: string) {
    const call = await this.db.findOne('video_calls', { id: callId });

    if (!call) {
      throw new NotFoundException('Video call not found');
    }

    // Verify user has access (is workspace member)
    await this.verifyWorkspaceMembership(call.workspace_id, userId);

    // Get participants
    const participantsResult = await this.db.findMany('video_call_participants', {
      video_call_id: callId,
    });
    const participants = participantsResult.data || [];

    // Populate user information for each participant
    const participantsWithUserInfo = await Promise.all(
      participants.map(async (participant) => {
        try {
          const user = await this.db.getUserById(participant.user_id);
          return {
            ...participant,
            name: user?.metadata?.name || (user as any)?.fullName || user?.name || user?.email?.split('@')[0] || 'Unknown',
            avatar: user?.metadata?.avatarUrl || user?.avatar_url || null,
          };
        } catch (error) {
          this.logger.warn(`Could not fetch user info for participant ${participant.user_id}: ${error.message}`);
          return {
            ...participant,
            name: 'Unknown',
            avatar: null,
          };
        }
      })
    );

    // Get database room details
    try {
      const livekitRoom = await this.dbVideoService.getRoom(call.livekit_room_id);
      return {
        ...call,
        participants: participantsWithUserInfo,
        livekit_room: livekitRoom,
      };
    } catch (error) {
      this.logger.warn(`Could not fetch LiveKit room details: ${error.message}`);
      return {
        ...call,
        participants: participantsWithUserInfo,
      };
    }
  }

  /**
   * End a video call
   */
  async endCall(callId: string, userId: string) {
    const call = await this.getCallById(callId, userId);

    // Only host can end the call
    if (call.host_user_id !== userId) {
      throw new ForbiddenException('Only the host can end the call');
    }

    // Update call status
    await this.db.update(
      'video_calls',
      { id: callId },
      {
        status: 'ended',
        actual_end_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    );

    // Update all participants who are still in the call
    const participantsResult = await this.db.findMany('video_call_participants', {
      video_call_id: callId,
      status: 'joined', // Only update participants currently in the call
    });
    const activeParticipants = participantsResult.data || [];

    for (const participant of activeParticipants) {
      const duration = participant.joined_at
        ? Math.floor(
            (new Date().getTime() - new Date(participant.joined_at).getTime()) / 1000,
          )
        : 0;

      await this.db.update(
        'video_call_participants',
        { id: participant.id },
        {
          status: 'left',
          left_at: new Date().toISOString(),
          duration_seconds: duration,
        },
      );
    }

    // Delete database room
    try {
      await this.dbVideoService.deleteRoom(call.livekit_room_id);
      this.logger.log(`LiveKit room deleted: ${call.livekit_room_id}`);
    } catch (error) {
      this.logger.warn(`Could not delete LiveKit room: ${error.message}`);
    }

    // Process meeting intelligence (generate summary, extract action items) - run async
    this.meetingIntelligenceService.processCallEnd(callId, call.workspace_id).catch((err) => {
      this.logger.error(`Failed to process meeting intelligence for call ${callId}: ${err.message}`);
    });

    // Get ALL participants (including invited/pending ones who haven't answered yet)
    // This is important to stop ringing on callee's device when caller ends the call
    const allParticipantsResult = await this.db.findMany('video_call_participants', {
      video_call_id: callId,
    });
    const allParticipants = allParticipantsResult.data || [];
    const participantUserIds = allParticipants.map((p) => p.user_id);

    // Get caller/host name for the notification
    const hostUser = await this.db.getUserById(userId);
    const hostName = hostUser?.metadata?.name || (hostUser as any)?.fullName || hostUser?.name || hostUser?.email?.split('@')[0] || 'Someone';

    // Notify all participants via WebSocket that the call has ended/been cancelled
    this.logger.log(`📞 [VideoCallService] Notifying ${participantUserIds.length} participants that call ${callId} has ended`);

    const endedPayload = {
      callId,
      type: 'cancelled', // Use 'cancelled' type to stop ringing on callee's device
      endedBy: userId,
      endedByName: hostName,
      timestamp: new Date().toISOString(),
    };

    // Send via VideoCallsGateway (for Flutter app connected to /video-calls namespace)
    this.videoCallsGateway.broadcastToUsers(participantUserIds, 'call:cancelled', endedPayload);

    // Also send via AppGateway (for web clients on main '/' namespace)
    for (const participantId of participantUserIds) {
      if (participantId !== userId) { // Don't send to the host who ended the call
        this.appGateway.emitToUser(participantId, 'video_call_cancelled', endedPayload);
      }
    }

    this.logger.log(`✅ [VideoCallService] Sent call ended notifications to all participants`);

    return { message: 'Call ended successfully' };
  }

  // ============================================
  // Participant Operations
  // ============================================

  /**
   * Join a video call
   * - Generates database token
   * - Adds user to participants table
   * - Returns join URL and token
   */
  async joinCall(callId: string, userId: string, dto?: JoinVideoCallDto) {
    const call = await this.getCallById(callId, userId);

    // Check if call is ended or cancelled
    if (call.status === 'ended') {
      throw new BadRequestException('This call has ended');
    }

    if (call.status === 'cancelled') {
      throw new BadRequestException('This call has been cancelled');
    }

    // Get user details including metadata
    const user = await this.db.getUserById(userId);
    const metadata = user?.metadata || {};

    // Get display name from user profile (same logic as auth.service.ts validateUser)
    const displayName = dto?.display_name ||
                       metadata.name ||
                       (user as any)?.fullName ||
                       user?.name ||
                       user?.email?.split('@')[0] ||
                       'Anonymous';

    // Check if user is already a participant
    let participant = await this.db.findOne('video_call_participants', {
      video_call_id: callId,
      user_id: userId,
    });

    if (!participant) {
      // Add as new participant
      participant = await this.db.insert('video_call_participants', {
        video_call_id: callId,
        user_id: userId,
        display_name: displayName,
        role: 'participant',
        status: 'joined',
        joined_at: new Date().toISOString(),
        metadata: dto?.metadata || {},
        created_at: new Date().toISOString(),
      });
    } else {
      // Update existing participant (rejoining or accepting invitation)
      await this.db.update(
        'video_call_participants',
        { id: participant.id },
        {
          status: 'joined',
          joined_at: new Date().toISOString(),
          left_at: null,
          display_name: displayName,
        },
      );
    }

    // Update call status to active if it was scheduled or completed
    if (call.status === 'scheduled') {
      await this.db.update(
        'video_calls',
        { id: callId },
        {
          status: 'active',
          actual_start_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      );
    } else if (call.status === 'completed' && userId === call.host_user_id) {
      // Host is rejoining a completed call - reactivate it
      this.logger.log(`Host ${userId} is rejoining completed call ${callId}, reactivating...`);
      await this.db.update(
        'video_calls',
        { id: callId },
        {
          status: 'active',
          actual_start_time: new Date().toISOString(),
          actual_end_time: null, // Clear the end time
          updated_at: new Date().toISOString(),
        },
      );
    }

    // Check if we need to convert one-to-one call to group call
    // This happens when a 3rd person joins a one-to-one call
    if (!call.is_group_call) {
      // Count all participants with status 'joined' (actively in the call)
      const result = await this.db.findMany('video_call_participants', {
        video_call_id: callId,
        status: 'joined',
      });
      const activeParticipants = result.data || [];

      this.logger.log(`One-to-one call ${callId} now has ${activeParticipants.length} active participants`);

      // If 3 or more people are in the call, convert to group call
      if (activeParticipants.length >= 3) {
        this.logger.log(`Converting one-to-one call ${callId} to group call (${activeParticipants.length} participants)`);

        await this.db.update(
          'video_calls',
          { id: callId },
          {
            is_group_call: true,
            updated_at: new Date().toISOString(),
          },
        );

        // Emit WebSocket event to notify all participants about the conversion
        this.videoCallsGateway.broadcastToCall(callId, 'call:converted-to-group', {
          call_id: callId,
          participant_count: activeParticipants.length,
          message: 'Call has been converted to a group call',
        });

        this.logger.log(`Call ${callId} successfully converted to group call`);
      }
    }

    this.logger.log(`User ${userId} joined call ${callId}`);

    // Get the room name from the call (stored as livekit_room_id but it's actually the room name)
    // We need to fetch the actual room to get the roomName
    const livekitRoom = await this.dbVideoService.getRoom(call.livekit_room_id);
    const roomName = livekitRoom?.session?.roomName || call.livekit_room_id;

    // Generate LiveKit token through database
    const tokenResponse = await this.dbVideoService.generateToken(roomName, userId, {
      name: displayName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      metadata: dto?.metadata || {},
    });

    this.logger.log(`Generated LiveKit token for user ${userId}: ${tokenResponse.token.substring(0, 20)}...`);

    return {
      token: tokenResponse.token,
      room_url: tokenResponse.url,
      room_name: tokenResponse.roomName,
      participant,
      call: {
        id: call.id,
        title: call.title,
        call_type: call.call_type,
        is_group_call: call.is_group_call,
        host_user_id: call.host_user_id,
      },
    };
  }

  /**
   * Leave a video call
   */
  async leaveCall(callId: string, userId: string) {
    const participant = await this.db.findOne('video_call_participants', {
      video_call_id: callId,
      user_id: userId,
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    // Calculate duration
    const duration = participant.joined_at
      ? Math.floor(
          (new Date().getTime() - new Date(participant.joined_at).getTime()) / 1000,
        )
      : 0;

    await this.db.update(
      'video_call_participants',
      { id: participant.id },
      {
        status: 'left',
        left_at: new Date().toISOString(),
        duration_seconds: duration,
      },
    );

    this.logger.log(`User ${userId} left call ${callId}`);

    // Get call details to check if it's a one-to-one call
    const call = await this.db.findOne('video_calls', { id: callId });

    if (!call) {
      return { message: 'Left call successfully', duration_seconds: duration };
    }

    // Check if all participants who JOINED have now left
    // This excludes participants who were invited but never joined or declined
    const activeParticipantsResult = await this.db.findMany(
      'video_call_participants',
      {
        video_call_id: callId,
        status: 'joined', // Only count participants who are currently in the call
      }
    );
    console.log("activeParticipantsResult",activeParticipantsResult)

    const activeParticipants = activeParticipantsResult.data || [];

    // For ONE-TO-ONE calls: End immediately when either participant leaves
    // For GROUP calls: Only end when all participants have left
    const shouldEndCall = !call.is_group_call
      ? true  // One-to-one: End as soon as someone leaves
      : activeParticipants.length === 0; // Group: End only when everyone left

    if (shouldEndCall && call.status === 'active') {
      const reason = !call.is_group_call
        ? 'one participant left one-to-one call'
        : 'all active participants left';

      this.logger.log(`Ending call ${callId} - ${reason}`);

      // Check if the host is the last one leaving
      const isHostLastToLeave = userId === call.host_user_id && activeParticipants.length === 0;

      if (isHostLastToLeave) {
        this.logger.log(`Host ${userId} is the last to leave call ${callId}, cleaning up invitees and join requests`);

        // Remove all invitees except the host
        const currentInvitees = Array.isArray(call.invitees) ? call.invitees : [];
        const updatedInvitees = currentInvitees.filter(inviteeId => inviteeId === call.host_user_id);

        await this.db.update(
          'video_calls',
          { id: callId },
          {
            invitees: updatedInvitees,
            status: 'completed',
            actual_end_time: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        );

        // Delete all join requests for this call
        const joinRequestsResult = await this.db.findMany('video_call_join_requests', {
          video_call_id: callId,
        });
        const joinRequests = joinRequestsResult.data || [];

        for (const request of joinRequests) {
          await this.db.delete('video_call_join_requests', request.id);
        }

        this.logger.log(`Deleted ${joinRequests.length} join requests for call ${callId}`);
      } else {
        // Normal call end without special cleanup
        await this.db.update(
          'video_calls',
          { id: callId },
          {
            status: 'completed',
            actual_end_time: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        );
      }

      // Update any remaining joined participants to 'left' status
      if (activeParticipants.length > 0) {
        for (const remainingParticipant of activeParticipants) {
          const remainingDuration = remainingParticipant.joined_at
            ? Math.floor(
                (new Date().getTime() - new Date(remainingParticipant.joined_at).getTime()) / 1000,
              )
            : 0;

          await this.db.update(
            'video_call_participants',
            { id: remainingParticipant.id },
            {
              status: 'left',
              left_at: new Date().toISOString(),
              duration_seconds: remainingDuration,
            },
          );
        }
      }

      // Try to delete the database room
      try {
        await this.dbVideoService.deleteRoom(call.livekit_room_id);
        this.logger.log(`LiveKit room deleted: ${call.livekit_room_id}`);
      } catch (error) {
        this.logger.warn(`Could not delete LiveKit room: ${error.message}`);
      }

      // Process meeting intelligence (generate summary, extract action items) - run async
      this.meetingIntelligenceService.processCallEnd(callId, call.workspace_id).catch((err) => {
        this.logger.error(`Failed to process meeting intelligence for call ${callId}: ${err.message}`);
      });

      // Get all participants for this call to broadcast to
      const allParticipantsResult = await this.db.findMany('video_call_participants', {
        video_call_id: callId,
      });
      const allParticipants = allParticipantsResult.data || [];
      const participantUserIds = allParticipants.map(p => p.user_id).filter(Boolean);

      // Broadcast call ended event to all participants
      // Use both methods to ensure delivery:
      // 1. broadcastToCall - for users in the call room
      this.videoCallsGateway.broadcastToCall(callId, 'call:ended', {
        reason: !call.is_group_call ? 'participant_left' : 'all_participants_left',
        ended_by: userId,
      });

      // 2. broadcastToUsers - for users not in the room yet (sidebar updates)
      this.videoCallsGateway.broadcastToUsers(participantUserIds, 'call:ended', {
        callId,
        reason: !call.is_group_call ? 'participant_left' : 'all_participants_left',
        ended_by: userId,
      });

      this.logger.log(`Call ${callId} automatically completed (${reason})`);
    }

    return { message: 'Left call successfully', duration_seconds: duration };
  }

  /**
   * Decline a video call invitation
   */
  async declineCall(callId: string, userId: string) {
    const participant = await this.db.findOne('video_call_participants', {
      video_call_id: callId,
      user_id: userId,
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    // Can only decline if status is 'invited'
    if (participant.status !== 'invited') {
      throw new BadRequestException(`Cannot decline call. Current status: ${participant.status}`);
    }

    // Update participant status to 'declined'
    await this.db.update(
      'video_call_participants',
      { id: participant.id },
      {
        status: 'declined',
      },
    );

    this.logger.log(`User ${userId} declined call ${callId}`);

    // Get call details to check if it's a one-to-one call
    const call = await this.db.findOne('video_calls', { id: callId });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    // For ONE-TO-ONE calls: If the invitee declines, end the call immediately
    // For GROUP calls: Just update the participant status, don't end the call
    if (!call.is_group_call && call.status === 'active') {
      this.logger.log(`One-to-one call ${callId} declined by invitee, ending call`);

      await this.db.update(
        'video_calls',
        { id: callId },
        {
          status: 'completed',
          actual_end_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      );

      // Try to delete the database room
      try {
        await this.dbVideoService.deleteRoom(call.livekit_room_id);
        this.logger.log(`LiveKit room deleted: ${call.livekit_room_id}`);
      } catch (error) {
        this.logger.warn(`Could not delete LiveKit room: ${error.message}`);
      }

      this.logger.log(`One-to-one call ${callId} automatically completed (invitee declined)`);
    } else if (call.is_group_call) {
      this.logger.log(`Group call ${callId} - participant ${userId} declined, call continues`);

      // For group calls, only end if ALL participants have declined or left
      const activeParticipantsResult = await this.db.findMany(
        'video_call_participants',
        {
          video_call_id: callId,
          status: 'joined', // Only count participants currently in the call
        }
      );

      const activeParticipants = activeParticipantsResult.data || [];

      // If no one is in the call anymore, end it
      if (activeParticipants.length === 0) {
        this.logger.log(`No active participants in group call ${callId} after decline, ending call`);

        await this.db.update(
          'video_calls',
          { id: callId },
          {
            status: 'completed',
            actual_end_time: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        );

        // Try to delete the database room
        try {
          await this.dbVideoService.deleteRoom(call.livekit_room_id);
          this.logger.log(`LiveKit room deleted: ${call.livekit_room_id}`);
        } catch (error) {
          this.logger.warn(`Could not delete LiveKit room: ${error.message}`);
        }

        this.logger.log(`Group call ${callId} automatically completed (no active participants)`);
      }
    }

    return { message: 'Call declined successfully' };
  }

  /**
   * Update participant state (mute/unmute, video on/off, etc.)
   */
  async updateParticipant(
    callId: string,
    participantId: string,
    userId: string,
    dto: UpdateParticipantDto,
  ) {
    // Verify call exists and user has access
    await this.getCallById(callId, userId);

    const participant = await this.db.findOne('video_call_participants', {
      id: participantId,
      video_call_id: callId,
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    // Users can only update their own state
    if (participant.user_id !== userId) {
      throw new ForbiddenException('You can only update your own participant state');
    }

    await this.db.update('video_call_participants', { id: participantId }, dto);

    return { message: 'Participant updated successfully' };
  }

  /**
   * Get all participants in a call
   */
  async getParticipants(callId: string, userId: string) {
    // Verify call exists and user has access
    await this.getCallById(callId, userId);

    const result = await this.db.findMany('video_call_participants', {
      video_call_id: callId,
    });

    return result.data || [];
  }

  // ============================================
  // Recording Operations
  // ============================================

  /**
   * Start recording a call
   */
  async startRecording(callId: string, userId: string, dto?: StartRecordingDto) {
    const call = await this.getCallById(callId, userId);

    // Only host can start recording
    if (call.host_user_id !== userId) {
      throw new ForbiddenException('Only the host can start recording');
    }

    if (call.is_recording) {
      throw new BadRequestException('Recording is already in progress');
    }

    // Start database recording - use actual LiveKit room ID from metadata
    const liveKitRoomId = call.metadata?.livekit_room_id || call.livekit_room_id;

    const recordingConfig: any = {
      layout: 'grid',
      outputFormat: 'mp4',
    };

    // For audio-only recordings, we can set minimal video resolution
    if (dto?.audio_only) {
      recordingConfig.width = 1;
      recordingConfig.height = 1;
      recordingConfig.videoBitrate = 1;
    }

    this.logger.log(`Starting recording with LiveKit room ID: ${liveKitRoomId}`);
    const recording = await this.dbVideoService.startRecording(
      liveKitRoomId,
      recordingConfig,
    );

    // Store recording in database
    const recordingData = await this.db.insert('video_call_recordings', {
      video_call_id: callId,
      livekit_recording_id: (recording as any).egressId || recording.id, // Use LiveKit egress ID for stopping
      status: 'recording',
      started_at: new Date().toISOString(),
      metadata: {
        transcription_enabled: dto?.transcription_enabled || false,
        audio_only: dto?.audio_only || false,
      },
      created_at: new Date().toISOString(),
    });

    // Update call recording status
    await this.db.update(
      'video_calls',
      { id: callId },
      {
        is_recording: true,
        updated_at: new Date().toISOString(),
      },
    );

    this.logger.log(`Recording started for call ${callId}`);

    return recordingData;
  }

  /**
   * Stop recording a call
   */
  async stopRecording(callId: string, recordingId: string, userId: string) {
    const call = await this.getCallById(callId, userId);

    // Only host can stop recording
    if (call.host_user_id !== userId) {
      throw new ForbiddenException('Only the host can stop recording');
    }

    const recording = await this.db.findOne('video_call_recordings', {
      id: recordingId,
      video_call_id: callId,
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    // Get LiveKit room ID from metadata or fallback to livekit_room_id
    const liveKitRoomId = call.metadata?.livekit_room_id || call.livekit_room_id;

    // Stop database recording - now requires roomId parameter
    await this.dbVideoService.stopRecording(liveKitRoomId, recording.livekit_recording_id);

    // Calculate duration
    const duration = recording.started_at
      ? Math.floor(
          (new Date().getTime() - new Date(recording.started_at).getTime()) / 1000,
        )
      : 0;

    // Update recording status to "processing" - background job will check for completion
    await this.db.update(
      'video_call_recordings',
      { id: recordingId },
      {
        status: 'processing',
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
      },
    );

    // Update call recording status
    await this.db.update(
      'video_calls',
      { id: callId },
      {
        is_recording: false,
        updated_at: new Date().toISOString(),
      },
    );

    this.logger.log(`Recording stopped for call ${callId} - processing in background`);

    return {
      message: 'Recording stopped - processing in background. You will be notified when ready.',
      duration_seconds: duration,
      status: 'processing',
    };
  }

  /**
   * Get all recordings for a call
   */
  async getRecordings(callId: string, userId: string) {
    // Verify call exists and user has access
    await this.getCallById(callId, userId);

    const result = await this.db.findMany('video_call_recordings', {
      video_call_id: callId,
    });

    return result.data || [];
  }

  // ============================================
  // Invitation Operations
  // ============================================

  /**
   * Invite participants to a call
   */
  async inviteParticipants(
    callId: string,
    userId: string,
    dto: InviteParticipantsDto,
  ) {
    const call = await this.getCallById(callId, userId);

    // Get caller info for notifications
    const callerUser = await this.db.getUserById(userId);
    const callerName = callerUser?.metadata?.name || callerUser?.name || callerUser?.email || 'Unknown User';
    const callerAvatar = callerUser?.avatar_url || undefined;

    // Get current invitees list and add new invitees
    let currentInvitees: string[] = [];
    if (Array.isArray(call.invitees)) {
      currentInvitees = call.invitees;
    } else if (typeof call.invitees === 'string') {
      try {
        currentInvitees = JSON.parse(call.invitees);
      } catch (e) {
        this.logger.warn(`Failed to parse existing invitees: ${e.message}`);
      }
    }

    // Add new invitees to the list (avoiding duplicates)
    const newInvitees = [...new Set([...currentInvitees, ...dto.user_ids])];

    // Update the video call's invitees list so they can join without request
    await this.db.update('video_calls', callId, {
      invitees: newInvitees,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`✅ [VideoCallService] Updated invitees list for call ${callId}: ${newInvitees.length} total invitees`);

    // Verify all invitees are workspace members and add as participants
    for (const inviteeId of dto.user_ids) {
      await this.verifyWorkspaceMembership(call.workspace_id, inviteeId);

      // Check if already a participant
      const existing = await this.db.findOne('video_call_participants', {
        video_call_id: callId,
        user_id: inviteeId,
      });

      if (!existing) {
        // Add as participant with invited status
        await this.db.insert('video_call_participants', {
          video_call_id: callId,
          user_id: inviteeId,
          role: 'participant',
          status: 'invited',
          created_at: new Date().toISOString(),
        });
      }
    }

    // Send WebSocket notifications to invited users
    this.videoCallsGateway.sendIncomingCallNotification(dto.user_ids, {
      callId,
      callType: call.call_type,
      isGroupCall: call.is_group_call,
      callerUserId: userId,
      callerName,
      callerAvatar,
      participantIds: dto.user_ids,
    });

    // Send data-only FCM push notification for incoming call invitation
    // This allows Flutter app to show full-screen call UI with ringtone
    try {
      await this.notificationsService.sendIncomingCallNotification(
        dto.user_ids,
        {
          call_id: callId,
          call_type: call.call_type,
          is_group_call: call.is_group_call || false,
          caller_user_id: userId,
          caller_name: callerName,
          caller_avatar: callerAvatar,
          workspace_id: call.workspace_id,
        },
      );

      this.logger.log(`✅ [VideoCallService] Sent data-only FCM call notification to ${dto.user_ids.length} invited participants`);
    } catch (fcmError) {
      this.logger.error(`❌ [VideoCallService] Failed to send FCM notification: ${fcmError.message}`);
      // Don't fail the entire operation if FCM fails
    }

    // Send email notifications to invited users
    try {
      for (const inviteeId of dto.user_ids) {
        if (inviteeId === userId) continue; // Skip caller

        const inviteeUser = await this.db.getUserById(inviteeId);
        if (inviteeUser?.email) {
          const callUrl = `${process.env.FRONTEND_URL}/video-calls/${callId}`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4F46E5;">Video Call Invitation</h2>
              <p>Hi ${inviteeUser.metadata?.name || inviteeUser.name || inviteeUser.email},</p>
              <p><strong>${callerName}</strong> has invited you to join a ${call.call_type} call.</p>
              ${call.title ? `<p><strong>Meeting:</strong> ${call.title}</p>` : ''}
              ${call.description ? `<p><strong>Description:</strong> ${call.description}</p>` : ''}
              <p style="margin: 30px 0;">
                <a href="${callUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Join Call
                </a>
              </p>
              <p style="color: #666; font-size: 12px;">
                If you're unable to click the button, copy and paste this link into your browser:<br>
                <a href="${callUrl}">${callUrl}</a>
              </p>
            </div>
          `;

          await /* TODO: use EmailService */ this.db.sendEmail(
            inviteeUser.email,
            `Video Call Invitation from ${callerName}`,
            emailHtml,
            `${callerName} has invited you to join a ${call.call_type} call. Join at: ${callUrl}`,
          );

          this.logger.log(`Sent email notification to ${inviteeUser.email} for call ${callId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send email notifications: ${error.message}`);
      // Don't fail the entire operation if email fails
    }

    // Send in-app notifications to invited users (stored in database)
    // This allows users to see the invitation even if they weren't online during the WebSocket notification
    try {
      // Use relative path for frontend navigation
      const callUrl = `/call/${call.workspace_id}/${callId}`;

      for (const inviteeId of dto.user_ids) {
        if (inviteeId === userId) continue; // Skip caller

        await this.notificationsService.sendNotification({
          user_id: inviteeId,
          type: NotificationType.VIDEO_CALL,
          title: `${callerName} invited you to a ${call.call_type} call`,
          message: call.title ? `Meeting: ${call.title}` : `Click to join the ${call.call_type} call`,
          priority: NotificationPriority.HIGH,
          action_url: callUrl,
          data: {
            call_id: callId,
            call_type: call.call_type,
            is_group_call: call.is_group_call,
            caller_user_id: userId,
            caller_name: callerName,
            caller_avatar: callerAvatar,
            workspace_id: call.workspace_id,
            meeting_title: call.title,
          },
          send_push: true,
        });

        this.logger.log(`✅ [VideoCallService] Sent in-app notification to ${inviteeId} for call ${callId}`);
      }
    } catch (inAppError) {
      this.logger.error(`❌ [VideoCallService] Failed to send in-app notifications: ${inAppError.message}`);
      // Don't fail the entire operation if in-app notifications fail
    }

    this.logger.log(`Invited ${dto.user_ids.length} participants to call ${callId}`);

    return { message: 'Participants invited successfully', invited_count: dto.user_ids.length };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Verify that a user is a member of a workspace
   */
  private async verifyWorkspaceMembership(workspaceId: string, userId: string) {
    const membership = await this.db.findOne('workspace_members', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!membership) {
      throw new ForbiddenException(
        `User ${userId} is not a member of workspace ${workspaceId}`,
      );
    }

    return membership;
  }

  // ============================================
  // Analytics
  // ============================================

  /**
   * Get video call analytics for a workspace
   * - Total meetings
   * - Total time
   * - This week count
   * - Average duration
   */
  async getAnalytics(workspaceId: string, userId: string) {
    // Verify workspace membership
    await this.verifyWorkspaceMembership(workspaceId, userId);

    // Get all calls for this workspace (including scheduled, active, ended, completed, and cancelled)
    const allCallsResult = await this.db.findMany('video_calls', {
      workspace_id: workspaceId,
    });
    const allCalls = allCallsResult.data || [];

    // Filter for completed/ended calls only for time calculations
    // Note: calls can have status 'ended' (from endCall) or 'completed' (from leaveCall)
    const finishedCalls = allCalls.filter(call =>
      call.status === 'ended' || call.status === 'completed'
    );

    // Calculate total meetings (includes all statuses)
    const totalMeetings = allCalls.length;

    // Calculate total time and average duration (only from finished calls with valid timestamps)
    let totalTimeSeconds = 0;
    let callsWithValidDuration = 0;

    for (const call of finishedCalls) {
      if (call.actual_start_time && call.actual_end_time) {
        const startTime = new Date(call.actual_start_time).getTime();
        const endTime = new Date(call.actual_end_time).getTime();

        // Only count if end time is after start time
        if (endTime > startTime) {
          const duration = Math.floor((endTime - startTime) / 1000);
          totalTimeSeconds += duration;
          callsWithValidDuration++;

          this.logger.debug(`Call ${call.id}: start=${call.actual_start_time}, end=${call.actual_end_time}, duration=${duration}s`);
        }
      }
    }

    // Calculate average duration (based on calls with valid duration only)
    const avgDurationSeconds = callsWithValidDuration > 0
      ? Math.floor(totalTimeSeconds / callsWithValidDuration)
      : 0;

    // Calculate this week count (includes all statuses)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeekCalls = allCalls.filter(call => {
      // For ended calls, use actual_start_time
      // For scheduled/active calls, use scheduled_start_time
      const callDate = call.actual_start_time
        ? new Date(call.actual_start_time)
        : call.scheduled_start_time
          ? new Date(call.scheduled_start_time)
          : null;

      return callDate && callDate >= startOfWeek;
    });

    return {
      total_meetings: totalMeetings,
      total_time_seconds: totalTimeSeconds,
      total_time_formatted: this.formatDuration(totalTimeSeconds),
      this_week: thisWeekCalls.length,
      avg_duration_seconds: avgDurationSeconds,
      avg_duration_formatted: this.formatDuration(avgDurationSeconds),
    };
  }

  /**
   * Format duration in seconds to human readable format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // ============================================
  // Pin/Unpin Operations
  // ============================================

  /**
   * Toggle pin status for a video call
   * Users can pin meetings to see them in the Pinned tab
   */
  async togglePin(callId: string, userId: string, pinned: boolean) {
    this.logger.log(`User ${userId} ${pinned ? 'pinning' : 'unpinning'} call ${callId}`);

    // Get the call and verify user has access
    const call = await this.db.findOne('video_calls', { id: callId });

    if (!call) {
      throw new NotFoundException('Video call not found');
    }

    // Verify user is host or invitee (has access to this call)
    const isHost = call.host_user_id === userId;
    const isInvitee = call.invitees && Array.isArray(call.invitees) && call.invitees.includes(userId);

    if (!isHost && !isInvitee) {
      throw new ForbiddenException('You do not have access to this video call');
    }

    // Update metadata with pinned status
    const currentMetadata = call.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      pinned,
      pinned_at: pinned ? new Date().toISOString() : null,
      pinned_by: pinned ? userId : null,
    };

    await this.db.update(
      'video_calls',
      { id: callId },
      {
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      },
    );

    this.logger.log(`Call ${callId} ${pinned ? 'pinned' : 'unpinned'} successfully`);

    return {
      success: true,
      message: `Meeting ${pinned ? 'pinned' : 'unpinned'} successfully`,
      pinned,
    };
  }

  // ============================================
  // AI Features
  // ============================================

  /**
   * Transcribe a video call recording using AI
   */
  async transcribeRecording(callId: string, recordingId: string, userId: string) {
    // Verify access to call
    const call = await this.getCallById(callId, userId);

    // Get recording
    const recording = await this.db.findOne('video_call_recordings', {
      id: recordingId,
      video_call_id: callId,
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    if (recording.status === 'recording') {
      throw new BadRequestException('Recording is still in progress. Please stop the recording first.');
    }

    // Check if transcription already exists
    if (recording.metadata?.transcription) {
      return {
        success: true,
        message: 'Transcription already exists',
        data: {
          text: recording.metadata.transcription,
          language: recording.metadata.transcription_language,
        },
      };
    }

    this.logger.log(`Starting transcription for recording ${recordingId}`);

    try {
      // Get LiveKit room ID from metadata or fallback to livekit_room_id
      const liveKitRoomId = call.metadata?.livekit_room_id || call.livekit_room_id;

      // Get recording data from database
      const recordingData = await this.dbVideoService.getRecording(liveKitRoomId);

      this.logger.log(`Recording data from database:`, JSON.stringify(recordingData, null, 2));

      if (!recordingData) {
        throw new BadRequestException('Recording not found');
      }

      // Get egressId to download the recording
      const egressId = (recordingData as any)?.egressId;
      if (!egressId) {
        throw new BadRequestException('Recording file not available yet. Please try again later.');
      }

      // Download recording using the SDK (which handles authentication internally)
      this.logger.log(`Downloading recording via database: ${egressId}`);
      const audioBuffer = await this.dbVideoService.downloadRecording(egressId);

      // Call database AI transcription service
      const transcriptionResult = await this.aiProvider.transcribeAudio(
        audioBuffer,
        {
          responseFormat: 'json',
        },
      );

      this.logger.log(`Transcription result:`, transcriptionResult);

      // If async job, return job ID
      if (transcriptionResult.jobId) {
        return {
          success: true,
          message: 'Transcription job started',
          jobId: transcriptionResult.jobId,
        };
      }

      // Store transcription in recording metadata
      await this.db.update(
        'video_call_recordings',
        { id: recordingId },
        {
          metadata: {
            ...recording.metadata,
            transcription: transcriptionResult.data?.text,
            transcription_language: transcriptionResult.data?.language || 'en',
            transcribed_at: new Date().toISOString(),
          },
        },
      );

      this.logger.log(`Transcription completed for recording ${recordingId}`);

      return {
        success: true,
        message: 'Transcription completed successfully',
        data: {
          text: transcriptionResult.data?.text,
          language: transcriptionResult.data?.language,
        },
      };
    } catch (error) {
      this.logger.error(`Transcription failed for recording ${recordingId}:`, error);
      throw new BadRequestException(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Translate a recording transcript to another language
   */
  async translateRecording(
    callId: string,
    recordingId: string,
    userId: string,
    targetLanguage: string,
  ) {
    // Verify access to call
    const call = await this.getCallById(callId, userId);

    // Get recording
    const recording = await this.db.findOne('video_call_recordings', {
      id: recordingId,
      video_call_id: callId,
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    // Check if transcription exists
    if (!recording.metadata?.transcription) {
      throw new BadRequestException(
        'No transcription available. Please transcribe the recording first.',
      );
    }

    // Check if translation already exists for this language
    const translationKey = `translation_${targetLanguage}`;
    if (recording.metadata?.[translationKey]) {
      return {
        success: true,
        message: 'Translation already exists',
        data: {
          translatedText: recording.metadata[translationKey],
          targetLanguage,
          sourceLanguage: recording.metadata.transcription_language,
        },
      };
    }

    this.logger.log(
      `Starting translation for recording ${recordingId} to ${targetLanguage}`,
    );

    try {
      // Call database AI translation service
      const translationResult = await this.aiProvider.translateText(
        recording.metadata.transcription,
        targetLanguage,
        {
          sourceLanguage: recording.metadata.transcription_language,
        },
      );

      // Store translation in recording metadata
      await this.db.update(
        'video_call_recordings',
        { id: recordingId },
        {
          metadata: {
            ...recording.metadata,
            [translationKey]: translationResult.translatedText,
            [`${translationKey}_created_at`]: new Date().toISOString(),
          },
        },
      );

      this.logger.log(
        `Translation completed for recording ${recordingId} to ${targetLanguage}`,
      );

      return {
        success: true,
        message: 'Translation completed successfully',
        data: {
          translatedText: translationResult.translatedText,
          targetLanguage,
          sourceLanguage: translationResult.detectedSourceLanguage,
        },
      };
    } catch (error) {
      this.logger.error(
        `Translation failed for recording ${recordingId}:`,
        error,
      );
      throw new BadRequestException(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Generate meeting notes/summary from recording transcript
   */
  async summarizeRecording(callId: string, recordingId: string, userId: string) {
    // Verify access to call
    const call = await this.getCallById(callId, userId);

    // Get recording
    const recording = await this.db.findOne('video_call_recordings', {
      id: recordingId,
      video_call_id: callId,
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    // Check if transcription exists
    if (!recording.metadata?.transcription) {
      throw new BadRequestException(
        'No transcription available. Please transcribe the recording first.',
      );
    }

    // Check if summary already exists
    if (recording.metadata?.summary) {
      return {
        success: true,
        message: 'Summary already exists',
        data: {
          summary: recording.metadata.summary,
          compressionRatio: recording.metadata.summary_compression_ratio,
        },
      };
    }

    this.logger.log(`Starting summarization for recording ${recordingId}`);

    try {
      // Call database AI summarization service
      const summaryResult = await this.aiProvider.summarizeText(
        recording.metadata.transcription,
        {
          length: 'medium',
        },
      );

      // Store summary in recording metadata
      await this.db.update(
        'video_call_recordings',
        { id: recordingId },
        {
          metadata: {
            ...recording.metadata,
            summary: summaryResult.summary,
            summary_compression_ratio: summaryResult.compressionRatio,
            summarized_at: new Date().toISOString(),
          },
        },
      );

      this.logger.log(`Summarization completed for recording ${recordingId}`);

      return {
        success: true,
        message: 'Summary generated successfully',
        data: {
          summary: summaryResult.summary,
          compressionRatio: summaryResult.compressionRatio,
        },
      };
    } catch (error) {
      this.logger.error(`Summarization failed for recording ${recordingId}:`, error);
      throw new BadRequestException(`Summarization failed: ${error.message}`);
    }
  }

  // ============================================
  // Join Request Management
  // ============================================

  /**
   * Request to join a video call (for uninvited users)
   */
  async requestJoin(
    callId: string,
    userId: string,
    dto: { display_name: string; message?: string },
  ) {
    this.logger.log(`User ${userId} requesting to join call ${callId}`);

    // 1. Get call details
    const call = await this.db.findOne('video_calls', { id: callId });
    if (!call) {
      throw new NotFoundException('Video call not found');
    }

    // 2. Check if call is active
    if (call.status !== 'active' && call.status !== 'scheduled') {
      throw new BadRequestException('No one is in the call');
    }

    // 3. Check if user is already a participant or has an invitee
    const existingParticipant = await this.db.findOne('video_call_participants', {
      video_call_id: callId,
      user_id: userId,
    });

    if (existingParticipant && existingParticipant.status === 'joined') {
      throw new BadRequestException('You are already in this call');
    }

    // 4. Check if there's already a pending request
    const existingRequest = await this.db.findOne('video_call_join_requests', {
      video_call_id: callId,
      user_id: userId,
      status: 'pending',
    });

    if (existingRequest) {
      throw new BadRequestException('You already have a pending join request for this call');
    }

    // 5. Create join request
    const joinRequest = await this.db.insert('video_call_join_requests', {
      video_call_id: callId,
      user_id: userId,
      display_name: dto.display_name,
      message: dto.message || null,
      status: 'pending',
      requested_at: new Date().toISOString(),
    });

    // 6. Notify host via WebSocket
    this.videoCallsGateway.emitJoinRequest(callId, call.host_user_id, {
      id: joinRequest.id,
      user_id: userId,
      display_name: dto.display_name,
      message: dto.message,
      timestamp: joinRequest.requested_at,
    });

    return {
      success: true,
      message: 'Join request sent. Waiting for host approval.',
      request_id: joinRequest.id,
    };
  }

  /**
   * Get pending join requests for a call (host only)
   */
  async getJoinRequests(callId: string, userId: string) {
    this.logger.log(`Getting join requests for call ${callId}`);

    // 1. Get call and verify user is the host
    const call = await this.getCallById(callId, userId);
    if (call.host_user_id !== userId) {
      throw new ForbiddenException('Only the host can view join requests');
    }

    // 2. Get pending join requests
    const result = await this.db.findMany('video_call_join_requests', {
      video_call_id: callId,
      status: 'pending',
    });

    const requests = result.data || [];

    return requests;
  }

  /**
   * Accept a join request (host only)
   */
  async acceptJoinRequest(callId: string, requestId: string, userId: string) {
    this.logger.log(`Host ${userId} accepting join request ${requestId} for call ${callId}`);

    // 1. Get call and verify user is the host
    const call = await this.getCallById(callId, userId);
    if (call.host_user_id !== userId) {
      throw new ForbiddenException('Only the host can accept join requests');
    }

    // 2. Get join request
    const request = await this.db.findOne('video_call_join_requests', {
      id: requestId,
      video_call_id: callId,
    });

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('This join request has already been processed');
    }

    // 3. Update request status
    await this.db.update(
      'video_call_join_requests',
      { id: requestId },
      {
        status: 'accepted',
        responded_at: new Date().toISOString(),
        responded_by: userId,
      },
    );

    // 4. Add user to invitees list
    const currentInvitees = call.invitees || [];
    if (!currentInvitees.includes(request.user_id)) {
      await this.db.update(
        'video_calls',
        { id: callId },
        {
          invitees: [...currentInvitees, request.user_id],
        },
      );
    }

    // 5. Create or update participant record
    const existingParticipant = await this.db.findOne('video_call_participants', {
      video_call_id: callId,
      user_id: request.user_id,
    });

    if (existingParticipant) {
      // Update existing participant to 'invited' status
      await this.db.update(
        'video_call_participants',
        { id: existingParticipant.id },
        {
          display_name: request.display_name,
          status: 'invited',
        },
      );
    } else {
      // Create new participant record
      await this.db.insert('video_call_participants', {
        video_call_id: callId,
        user_id: request.user_id,
        display_name: request.display_name,
        role: 'participant',
        status: 'invited',
      });
    }

    // 6. Notify requester via WebSocket
    this.videoCallsGateway.emitJoinRequestAccepted(callId, request.user_id, {
      call_id: callId,
      request_id: requestId,
      message: 'Your request to join has been accepted',
    });

    return {
      success: true,
      message: 'Join request accepted',
    };
  }

  // ============================================
  // Meeting Intelligence
  // ============================================

  /**
   * Get meeting summary for a call
   */
  async getMeetingSummary(callId: string, userId: string) {
    // Verify user has access to the call
    await this.getCallById(callId, userId);

    const summary = await this.meetingIntelligenceService.getMeetingSummary(callId);

    if (!summary) {
      return {
        success: false,
        message: 'No summary available for this call yet',
        data: null,
      };
    }

    return {
      success: true,
      data: summary,
    };
  }

  /**
   * Get transcript for a call
   */
  async getCallTranscript(callId: string, userId: string) {
    // Verify user has access to the call
    await this.getCallById(callId, userId);

    const transcript = await this.meetingIntelligenceService.getTranscript(callId);

    if (!transcript) {
      return {
        success: false,
        message: 'No transcript available for this call',
        data: null,
      };
    }

    return {
      success: true,
      data: transcript,
    };
  }

  /**
   * Create tasks from meeting action items
   */
  async createTasksFromMeeting(callId: string, userId: string, projectId?: string) {
    // Verify user has access to the call
    const call = await this.getCallById(callId, userId);

    const tasksCreated = await this.meetingIntelligenceService.createTasksFromActionItems(
      callId,
      call.workspace_id,
      projectId,
    );

    return {
      success: true,
      message: `Created ${tasksCreated} tasks from meeting action items`,
      tasksCreated,
    };
  }

  /**
   * Manually regenerate meeting summary
   */
  async regenerateMeetingSummary(callId: string, userId: string) {
    // Verify user has access to the call
    const call = await this.getCallById(callId, userId);

    // Get transcript
    const transcript = await this.meetingIntelligenceService.getTranscript(callId);

    if (!transcript || !transcript.full_text) {
      return {
        success: false,
        message: 'No transcript available to generate summary',
        data: null,
      };
    }

    // Get participants
    const participantsResult = await this.db.findMany('video_call_participants', {
      video_call_id: callId,
    });
    const participants = (participantsResult.data || [])
      .map((p) => p.display_name || 'Unknown')
      .filter(Boolean);

    // Generate new summary
    const summary = await this.meetingIntelligenceService.generateMeetingSummary(
      callId,
      call.workspace_id,
      transcript.full_text,
      participants,
    );

    if (!summary) {
      return {
        success: false,
        message: 'Failed to generate summary',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Meeting summary regenerated successfully',
      data: summary,
    };
  }

  /**
   * Reject a join request (host only)
   */
  async rejectJoinRequest(callId: string, requestId: string, userId: string) {
    this.logger.log(`Host ${userId} rejecting join request ${requestId} for call ${callId}`);

    // 1. Get call and verify user is the host
    const call = await this.getCallById(callId, userId);
    if (call.host_user_id !== userId) {
      throw new ForbiddenException('Only the host can reject join requests');
    }

    // 2. Get join request
    const request = await this.db.findOne('video_call_join_requests', {
      id: requestId,
      video_call_id: callId,
    });

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('This join request has already been processed');
    }

    // 3. Update request status
    await this.db.update(
      'video_call_join_requests',
      { id: requestId },
      {
        status: 'rejected',
        responded_at: new Date().toISOString(),
        responded_by: userId,
      },
    );

    // 4. Notify requester via WebSocket
    this.videoCallsGateway.emitJoinRequestRejected(callId, request.user_id, {
      call_id: callId,
      request_id: requestId,
      message: 'Your request to join was declined by the host',
    });

    return {
      success: true,
      message: 'Join request rejected',
    };
  }
}
