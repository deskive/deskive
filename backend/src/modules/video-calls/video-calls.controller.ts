import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VideoCallsService } from './video-calls.service';
import {
  CreateVideoCallDto,
  JoinVideoCallDto,
  UpdateParticipantDto,
  StartRecordingDto,
  InviteParticipantsDto,
  TogglePinDto,
} from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('video-calls')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard)
export class VideoCallsController {
  constructor(private readonly videoCallsService: VideoCallsService) {}

  // ============================================
  // Video Call Management
  // ============================================

  @Post('workspaces/:workspaceId/video-calls/create')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'Create a new video call' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Video call created successfully' })
  @ApiResponse({ status: 403, description: 'User is not a workspace member' })
  async createCall(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateVideoCallDto,
  ) {
    return this.videoCallsService.createCall(workspaceId, userId, dto);
  }

  @Get('workspaces/:workspaceId/video-calls')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'Get all video calls in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (scheduled, active, ended)' })
  @ApiQuery({ name: 'call_type', required: false, description: 'Filter by call type (audio, video)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit results' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination' })
  @ApiResponse({ status: 200, description: 'List of video calls' })
  async getCallsByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('status') status?: string,
    @Query('call_type') callType?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.videoCallsService.getCallsByWorkspace(workspaceId, userId, {
      status,
      call_type: callType,
      limit,
      offset,
    });
  }

  @Get('video-calls/:callId')
  @ApiOperation({ summary: 'Get video call details' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'Video call details with participants' })
  @ApiResponse({ status: 404, description: 'Video call not found' })
  async getCallById(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.getCallById(callId, userId);
  }

  @Post('video-calls/:callId/end')
  @ApiOperation({ summary: 'End a video call' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'Call ended successfully' })
  @ApiResponse({ status: 403, description: 'Only the host can end the call' })
  async endCall(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.endCall(callId, userId);
  }

  // ============================================
  // Participant Management
  // ============================================

  @Post('video-calls/:callId/join')
  @ApiOperation({ summary: 'Join a video call' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'Successfully joined call with token and room URL' })
  @ApiResponse({ status: 400, description: 'Call has ended or been cancelled' })
  async joinCall(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto?: JoinVideoCallDto,
  ) {
    return this.videoCallsService.joinCall(callId, userId, dto);
  }

  @Post('video-calls/:callId/leave')
  @ApiOperation({ summary: 'Leave a video call' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'Successfully left call' })
  async leaveCall(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.leaveCall(callId, userId);
  }

  @Post('video-calls/:callId/decline')
  @ApiOperation({ summary: 'Decline a video call invitation' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'Successfully declined call' })
  @ApiResponse({ status: 400, description: 'Cannot decline call with current status' })
  async declineCall(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.declineCall(callId, userId);
  }

  @Get('video-calls/:callId/participants')
  @ApiOperation({ summary: 'Get all participants in a call' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'List of participants' })
  async getParticipants(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.getParticipants(callId, userId);
  }

  @Post('video-calls/:callId/participants/:participantId')
  @ApiOperation({ summary: 'Update participant state (mute/unmute, video on/off, etc.)' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiParam({ name: 'participantId', description: 'Participant ID' })
  @ApiResponse({ status: 200, description: 'Participant updated successfully' })
  @ApiResponse({ status: 403, description: 'You can only update your own state' })
  async updateParticipant(
    @Param('callId') callId: string,
    @Param('participantId') participantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateParticipantDto,
  ) {
    return this.videoCallsService.updateParticipant(callId, participantId, userId, dto);
  }

  // ============================================
  // Recording Management
  // ============================================

  @Post('video-calls/:callId/recording/start')
  @ApiOperation({ summary: 'Start recording a call' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'Recording started successfully' })
  @ApiResponse({ status: 403, description: 'Only the host can start recording' })
  async startRecording(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto?: StartRecordingDto,
  ) {
    return this.videoCallsService.startRecording(callId, userId, dto);
  }

  @Post('video-calls/:callId/recording/:recordingId/stop')
  @ApiOperation({ summary: 'Stop recording a call' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiParam({ name: 'recordingId', description: 'Recording ID' })
  @ApiResponse({ status: 200, description: 'Recording stopped successfully' })
  @ApiResponse({ status: 403, description: 'Only the host can stop recording' })
  async stopRecording(
    @Param('callId') callId: string,
    @Param('recordingId') recordingId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.stopRecording(callId, recordingId, userId);
  }

  @Get('video-calls/:callId/recordings')
  @ApiOperation({ summary: 'Get all recordings for a call' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'List of recordings' })
  async getRecordings(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.getRecordings(callId, userId);
  }

  // ============================================
  // Invitation Management
  // ============================================

  @Post('video-calls/:callId/invite')
  @ApiOperation({ summary: 'Invite participants to a call' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'Participants invited successfully' })
  @ApiResponse({ status: 403, description: 'Invitee is not a workspace member' })
  async inviteParticipants(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: InviteParticipantsDto,
  ) {
    return this.videoCallsService.inviteParticipants(callId, userId, dto);
  }

  // ============================================
  // Join Request Management
  // ============================================

  @Post('video-calls/:callId/request-join')
  @ApiOperation({ summary: 'Request to join a video call (for uninvited users)' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 201, description: 'Join request sent successfully' })
  @ApiResponse({ status: 400, description: 'Already in call or request pending' })
  async requestJoin(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: { display_name: string; message?: string },
  ) {
    return this.videoCallsService.requestJoin(callId, userId, dto);
  }

  @Get('video-calls/:callId/join-requests')
  @ApiOperation({ summary: 'Get pending join requests for a call (host only)' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'List of pending join requests' })
  @ApiResponse({ status: 403, description: 'Only the host can view join requests' })
  async getJoinRequests(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.getJoinRequests(callId, userId);
  }

  @Post('video-calls/:callId/join-requests/:requestId/accept')
  @ApiOperation({ summary: 'Accept a join request (host only)' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiParam({ name: 'requestId', description: 'Join request ID' })
  @ApiResponse({ status: 200, description: 'Join request accepted' })
  @ApiResponse({ status: 403, description: 'Only the host can accept requests' })
  async acceptJoinRequest(
    @Param('callId') callId: string,
    @Param('requestId') requestId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.acceptJoinRequest(callId, requestId, userId);
  }

  @Post('video-calls/:callId/join-requests/:requestId/reject')
  @ApiOperation({ summary: 'Reject a join request (host only)' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiParam({ name: 'requestId', description: 'Join request ID' })
  @ApiResponse({ status: 200, description: 'Join request rejected' })
  @ApiResponse({ status: 403, description: 'Only the host can reject requests' })
  async rejectJoinRequest(
    @Param('callId') callId: string,
    @Param('requestId') requestId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.rejectJoinRequest(callId, requestId, userId);
  }

  // ============================================
  // AI Features
  // ============================================

  @Post('video-calls/:callId/recordings/:recordingId/transcribe')
  @ApiOperation({ summary: 'Generate AI transcription for recording' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiParam({ name: 'recordingId', description: 'Recording ID' })
  @ApiResponse({ status: 200, description: 'Transcription generated successfully' })
  async transcribeRecording(
    @Param('callId') callId: string,
    @Param('recordingId') recordingId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.transcribeRecording(callId, recordingId, userId);
  }

  @Post('video-calls/:callId/recordings/:recordingId/translate')
  @ApiOperation({ summary: 'Translate recording transcript' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiParam({ name: 'recordingId', description: 'Recording ID' })
  @ApiResponse({ status: 200, description: 'Translation generated successfully' })
  async translateRecording(
    @Param('callId') callId: string,
    @Param('recordingId') recordingId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: { target_language: string },
  ) {
    return this.videoCallsService.translateRecording(callId, recordingId, userId, dto.target_language);
  }

  @Post('video-calls/:callId/recordings/:recordingId/summarize')
  @ApiOperation({ summary: 'Generate meeting notes/summary' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiParam({ name: 'recordingId', description: 'Recording ID' })
  @ApiResponse({ status: 200, description: 'Summary generated successfully' })
  async summarizeRecording(
    @Param('callId') callId: string,
    @Param('recordingId') recordingId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.summarizeRecording(callId, recordingId, userId);
  }

  // ============================================
  // Meeting Intelligence
  // ============================================

  @Get('video-calls/:callId/summary')
  @ApiOperation({ summary: 'Get AI-generated meeting summary' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'Meeting summary retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Video call not found' })
  async getMeetingSummary(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.getMeetingSummary(callId, userId);
  }

  @Get('video-calls/:callId/transcript')
  @ApiOperation({ summary: 'Get meeting transcript' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'Transcript retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Video call not found' })
  async getCallTranscript(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.getCallTranscript(callId, userId);
  }

  @Post('video-calls/:callId/summary/regenerate')
  @ApiOperation({ summary: 'Regenerate meeting summary from transcript' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'Summary regenerated successfully' })
  @ApiResponse({ status: 400, description: 'No transcript available' })
  async regenerateMeetingSummary(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.regenerateMeetingSummary(callId, userId);
  }

  @Post('video-calls/:callId/create-tasks')
  @ApiOperation({ summary: 'Create tasks from meeting action items' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'Tasks created successfully' })
  async createTasksFromMeeting(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto?: { projectId?: string },
  ) {
    return this.videoCallsService.createTasksFromMeeting(callId, userId, dto?.projectId);
  }

  // ============================================
  // Analytics
  // ============================================

  @Get('workspaces/:workspaceId/video-calls/analytics')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'Get video call analytics for workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Analytics data' })
  async getAnalytics(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.videoCallsService.getAnalytics(workspaceId, userId);
  }

  // ============================================
  // Pin/Unpin Operations
  // ============================================

  @Patch('video-calls/:callId/pin')
  @ApiOperation({ summary: 'Pin or unpin a video call' })
  @ApiParam({ name: 'callId', description: 'Video call ID' })
  @ApiResponse({ status: 200, description: 'Pin status updated successfully' })
  @ApiResponse({ status: 403, description: 'User does not have access to this call' })
  @ApiResponse({ status: 404, description: 'Video call not found' })
  async togglePin(
    @Param('callId') callId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: TogglePinDto,
  ) {
    return this.videoCallsService.togglePin(callId, userId, dto.pinned);
  }
}
