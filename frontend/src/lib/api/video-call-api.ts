// src/lib/api/video-call-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================
// Types (matching backend DTOs)
// ============================================

export interface VideoCall {
  id: string;
  workspace_id: string;
  deskive_room_id: string;
  title: string;
  description?: string;
  host_user_id: string;
  call_type: 'audio' | 'video';
  is_group_call: boolean;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled' | 'completed';
  is_recording: boolean;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  invitees?: string[]; // Array of user IDs (host + attendees)
  settings: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Populated fields
  participants?: CallParticipant[];
  deskive_room?: deskiveRoom;
}

export interface deskiveRoom {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'ended' | 'expired';
  maxParticipants: number;
  currentParticipants: number;
  joinUrl?: string;
  embedUrl?: string;
}

export interface CallParticipant {
  id: string;
  video_call_id?: string;  // Optional - set by backend
  user_id: string;
  deskive_participant_id?: string;
  display_name?: string;
  role: 'host' | 'participant';
  joined_at?: string;
  left_at?: string;
  duration_seconds?: number;
  is_audio_muted: boolean;
  is_video_muted: boolean;
  is_screen_sharing: boolean;
  is_hand_raised: boolean;
  connection_quality?: 'excellent' | 'good' | 'poor';
  metadata?: Record<string, any>;
  created_at?: string;  // Optional - set by backend
  // For frontend compatibility
  name?: string;
  email?: string;
  avatar?: string;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
  isSpeaking?: boolean;
  stream?: MediaStream;
}

export interface CallSettings {
  maxParticipants?: number;
  allowGuestAccess?: boolean;
  enableRecording?: boolean;
  enableChat?: boolean;
  enableScreenShare?: boolean;
  enableVirtualBackground?: boolean;
  waitingRoom?: boolean;
  muteOnEntry?: boolean;
  video?: {
    enabled: boolean;
    width?: number;
    height?: number;
    frameRate?: number;
  };
  audio?: {
    enabled: boolean;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
  };
  screen?: {
    enabled: boolean;
    includeAudio?: boolean;
  };
  recording?: {
    enabled: boolean;
    transcription?: boolean;
  };
  chat?: {
    enabled: boolean;
    allowPrivate?: boolean;
  };
}

export interface CreateCallRequest {
  title: string;
  description?: string;
  call_type: 'audio' | 'video';
  is_group_call?: boolean;
  participant_ids?: string[];
  recording_enabled?: boolean;
  video_quality?: 'low' | 'medium' | 'high' | 'hd' | '4k';
  max_participants?: number;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  e2ee_enabled?: boolean;
  lock_on_join?: boolean;
  metadata?: Record<string, any>;
}

export interface JoinCallRequest {
  display_name?: string;
  metadata?: Record<string, any>;
}

export interface JoinCallResponse {
  token: string;
  room_url: string;
  room_name: string;
  participant: CallParticipant;
  call: {
    id: string;
    title: string;
    call_type: 'audio' | 'video';
    is_group_call: boolean;
    host_user_id: string;
  };
}

export interface UpdateParticipantRequest {
  is_audio_muted?: boolean;
  is_video_muted?: boolean;
  is_screen_sharing?: boolean;
  is_hand_raised?: boolean;
  connection_quality?: 'excellent' | 'good' | 'poor';
}

export interface StartRecordingRequest {
  transcription_enabled?: boolean;
  audio_only?: boolean;
}

export interface InviteParticipantsRequest {
  user_ids: string[];
}

export interface CallRecording {
  id: string;
  video_call_id: string;
  deskive_recording_id: string;
  recording_url?: string;
  transcript_url?: string;
  duration_seconds: number;
  file_size_bytes: number;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface CallQuality {
  sessionId: string;
  participantId: string;
  bandwidth: {
    upload: number;
    download: number;
  };
  latency: number;
  packetLoss: number;
  quality: 'excellent' | 'good' | 'poor';
}

// ============================================
// Query Keys
// ============================================

export const videoCallKeys = {
  all: ['videoCalls'] as const,
  lists: () => [...videoCallKeys.all, 'list'] as const,
  list: (workspaceId: string, status?: string) => [...videoCallKeys.lists(), workspaceId, { status }] as const,
  details: () => [...videoCallKeys.all, 'detail'] as const,
  detail: (id: string) => [...videoCallKeys.details(), id] as const,
  participants: (callId: string) => [...videoCallKeys.detail(callId), 'participants'] as const,
  recordings: (callId: string) => [...videoCallKeys.detail(callId), 'recordings'] as const,
};

// ============================================
// API Functions (matching backend endpoints)
// ============================================

export const videoCallApi = {
  // ===== Call Management =====

  /**
   * Get all video calls in a workspace
   */
  async getCalls(
    workspaceId: string,
    filters?: {
      status?: 'scheduled' | 'active' | 'ended' | 'cancelled' | 'completed';
      call_type?: 'audio' | 'video';
      limit?: number;
      offset?: number;
    }
  ): Promise<VideoCall[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.call_type) params.append('call_type', filters.call_type);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    return api.get<VideoCall[]>(
      `/workspaces/${workspaceId}/video-calls${query ? `?${query}` : ''}`
    );
  },

  /**
   * Get a single video call by ID
   */
  async getCall(callId: string): Promise<VideoCall> {
    return api.get<VideoCall>(`/video-calls/${callId}`);
  },

  /**
   * Create a new video call
   */
  async createCall(workspaceId: string, data: CreateCallRequest): Promise<VideoCall> {
    return api.post<VideoCall>(`/workspaces/${workspaceId}/video-calls/create`, data);
  },

  /**
   * End a video call (only host)
   */
  async endCall(callId: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/video-calls/${callId}/end`, null);
  },

  // ===== Participant Management =====

  /**
   * Join a video call
   */
  async joinCall(callId: string, data?: JoinCallRequest): Promise<JoinCallResponse> {
    return api.post<JoinCallResponse>(`/video-calls/${callId}/join`, data || {});
  },

  /**
   * Leave a video call
   */
  async leaveCall(callId: string): Promise<{ message: string; duration_seconds: number }> {
    return api.post<{ message: string; duration_seconds: number }>(
      `/video-calls/${callId}/leave`,
      null
    );
  },

  /**
   * Get all participants in a call
   */
  async getParticipants(callId: string): Promise<CallParticipant[]> {
    return api.get<CallParticipant[]>(`/video-calls/${callId}/participants`);
  },

  /**
   * Update participant state (mute/unmute, video on/off, etc.)
   */
  async updateParticipant(
    callId: string,
    participantId: string,
    data: UpdateParticipantRequest
  ): Promise<{ message: string }> {
    return api.post<{ message: string }>(
      `/video-calls/${callId}/participants/${participantId}`,
      data
    );
  },

  /**
   * Invite participants to a call
   */
  async inviteParticipants(
    callId: string,
    data: InviteParticipantsRequest
  ): Promise<{ message: string; invited_count: number }> {
    return api.post<{ message: string; invited_count: number }>(
      `/video-calls/${callId}/invite`,
      data
    );
  },

  // ===== Join Request Management =====

  /**
   * Request to join a video call (for uninvited users)
   */
  async requestJoin(
    callId: string,
    data: { display_name: string; message?: string }
  ): Promise<{ success: boolean; message: string; request_id: string }> {
    return api.post(`/video-calls/${callId}/request-join`, data);
  },

  /**
   * Get pending join requests for a call (host only)
   */
  async getJoinRequests(callId: string): Promise<Array<{
    id: string;
    user_id: string;
    display_name: string;
    message?: string;
    status: string;
    requested_at: string;
  }>> {
    return api.get(`/video-calls/${callId}/join-requests`);
  },

  /**
   * Accept a join request (host only)
   */
  async acceptJoinRequest(
    callId: string,
    requestId: string
  ): Promise<{ success: boolean; message: string }> {
    return api.post(`/video-calls/${callId}/join-requests/${requestId}/accept`, null);
  },

  /**
   * Reject a join request (host only)
   */
  async rejectJoinRequest(
    callId: string,
    requestId: string
  ): Promise<{ success: boolean; message: string }> {
    return api.post(`/video-calls/${callId}/join-requests/${requestId}/reject`, null);
  },

  // ===== Recording Management =====

  /**
   * Start recording a call
   */
  async startRecording(
    callId: string,
    data?: StartRecordingRequest
  ): Promise<CallRecording> {
    return api.post<CallRecording>(`/video-calls/${callId}/recording/start`, data || {});
  },

  /**
   * Stop recording a call
   */
  async stopRecording(
    callId: string,
    recordingId: string
  ): Promise<{ message: string; duration_seconds: number }> {
    return api.post<{ message: string; duration_seconds: number }>(
      `/video-calls/${callId}/recording/${recordingId}/stop`,
      null
    );
  },

  /**
   * Get all recordings for a call
   */
  async getRecordings(callId: string): Promise<CallRecording[]> {
    return api.get<CallRecording[]>(`/video-calls/${callId}/recordings`);
  },

  // ===== Analytics =====

  /**
   * Get video call analytics for a workspace
   */
  async getAnalytics(workspaceId: string): Promise<{
    total_meetings: number;
    total_time_seconds: number;
    total_time_formatted: string;
    this_week: number;
    avg_duration_seconds: number;
    avg_duration_formatted: string;
  }> {
    return api.get(`/workspaces/${workspaceId}/video-calls/analytics`);
  },

  // ===== Presence =====

  /**
   * Get member presence status in a workspace
   */
  async getMembersPresence(workspaceId: string): Promise<Array<{
    user_id: string;
    status: 'online' | 'offline' | 'away' | 'busy';
    last_seen?: string;
  }>> {
    return api.get(`/workspaces/${workspaceId}/members/presence`);
  },

  // ===== AI Features =====

  /**
   * Transcribe a recording using AI
   */
  async transcribeRecording(
    callId: string,
    recordingId: string
  ): Promise<{
    success: boolean;
    message: string;
    data?: { text: string; language: string };
    jobId?: string;
  }> {
    return api.post(`/video-calls/${callId}/recordings/${recordingId}/transcribe`, {});
  },

  /**
   * Translate a recording transcript
   */
  async translateRecording(
    callId: string,
    recordingId: string,
    targetLanguage: string
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      translatedText: string;
      targetLanguage: string;
      sourceLanguage: string;
    };
  }> {
    return api.post(`/video-calls/${callId}/recordings/${recordingId}/translate`, {
      target_language: targetLanguage,
    });
  },

  /**
   * Generate meeting summary/notes from transcript
   */
  async summarizeRecording(
    callId: string,
    recordingId: string
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      summary: string;
      compressionRatio: number;
    };
  }> {
    return api.post(`/video-calls/${callId}/recordings/${recordingId}/summarize`, {});
  },
};

// ============================================
// React Query Hooks
// ============================================

/**
 * Get all calls in a workspace
 */
export function useVideoCalls(
  workspaceId: string,
  filters?: Parameters<typeof videoCallApi.getCalls>[1]
) {
  return useQuery({
    queryKey: videoCallKeys.list(workspaceId, filters?.status),
    queryFn: () => videoCallApi.getCalls(workspaceId, filters),
    enabled: !!workspaceId,
  });
}

/**
 * Get a single call
 */
export function useVideoCall(callId: string) {
  return useQuery({
    queryKey: videoCallKeys.detail(callId),
    queryFn: () => videoCallApi.getCall(callId),
    enabled: !!callId,
  });
}

/**
 * Get participants in a call
 */
export function useCallParticipants(callId: string) {
  return useQuery({
    queryKey: videoCallKeys.participants(callId),
    queryFn: () => videoCallApi.getParticipants(callId),
    enabled: !!callId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

/**
 * Get recordings for a call
 */
export function useCallRecordings(callId: string) {
  return useQuery({
    queryKey: videoCallKeys.recordings(callId),
    queryFn: () => videoCallApi.getRecordings(callId),
    enabled: !!callId,
  });
}

/**
 * Create a video call mutation
 */
export function useCreateVideoCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateCallRequest }) =>
      videoCallApi.createCall(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: videoCallKeys.list(workspaceId) });
    },
  });
}

/**
 * Join a video call mutation
 */
export function useJoinVideoCall() {
  return useMutation({
    mutationFn: ({ callId, data }: { callId: string; data?: JoinCallRequest }) =>
      videoCallApi.joinCall(callId, data),
  });
}

/**
 * Leave a video call mutation
 */
export function useLeaveVideoCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (callId: string) => videoCallApi.leaveCall(callId),
    onSuccess: (_, callId) => {
      queryClient.invalidateQueries({ queryKey: videoCallKeys.detail(callId) });
      queryClient.invalidateQueries({ queryKey: videoCallKeys.participants(callId) });
    },
  });
}

/**
 * End a video call mutation
 */
export function useEndVideoCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (callId: string) => videoCallApi.endCall(callId),
    onSuccess: (_, callId) => {
      queryClient.invalidateQueries({ queryKey: videoCallKeys.detail(callId) });
      queryClient.invalidateQueries({ queryKey: videoCallKeys.lists() });
    },
  });
}

/**
 * Start recording mutation
 */
export function useStartRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ callId, data }: { callId: string; data?: StartRecordingRequest }) =>
      videoCallApi.startRecording(callId, data),
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({ queryKey: videoCallKeys.detail(callId) });
      queryClient.invalidateQueries({ queryKey: videoCallKeys.recordings(callId) });
    },
  });
}

/**
 * Stop recording mutation
 */
export function useStopRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ callId, recordingId }: { callId: string; recordingId: string }) =>
      videoCallApi.stopRecording(callId, recordingId),
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({ queryKey: videoCallKeys.detail(callId) });
      queryClient.invalidateQueries({ queryKey: videoCallKeys.recordings(callId) });
    },
  });
}

/**
 * Update participant mutation
 */
export function useUpdateParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      callId,
      participantId,
      data,
    }: {
      callId: string;
      participantId: string;
      data: UpdateParticipantRequest;
    }) => videoCallApi.updateParticipant(callId, participantId, data),
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({ queryKey: videoCallKeys.participants(callId) });
    },
  });
}

/**
 * Invite participants mutation
 */
export function useInviteParticipants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ callId, data }: { callId: string; data: InviteParticipantsRequest }) =>
      videoCallApi.inviteParticipants(callId, data),
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({ queryKey: videoCallKeys.participants(callId) });
    },
  });
}

/**
 * Get video call analytics for workspace
 */
export function useVideoCallAnalytics(workspaceId: string) {
  return useQuery({
    queryKey: ['videoCallAnalytics', workspaceId],
    queryFn: () => videoCallApi.getAnalytics(workspaceId),
    enabled: !!workspaceId,
  });
}

/**
 * Get member presence status in workspace
 */
export function useMembersPresence(workspaceId: string) {
  return useQuery({
    queryKey: ['membersPresence', workspaceId],
    queryFn: () => videoCallApi.getMembersPresence(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Transcribe recording mutation
 */
export function useTranscribeRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ callId, recordingId }: { callId: string; recordingId: string }) =>
      videoCallApi.transcribeRecording(callId, recordingId),
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({ queryKey: videoCallKeys.recordings(callId) });
    },
  });
}

/**
 * Translate recording mutation
 */
export function useTranslateRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      callId,
      recordingId,
      targetLanguage,
    }: {
      callId: string;
      recordingId: string;
      targetLanguage: string;
    }) => videoCallApi.translateRecording(callId, recordingId, targetLanguage),
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({ queryKey: videoCallKeys.recordings(callId) });
    },
  });
}

/**
 * Summarize recording mutation
 */
export function useSummarizeRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ callId, recordingId }: { callId: string; recordingId: string }) =>
      videoCallApi.summarizeRecording(callId, recordingId),
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({ queryKey: videoCallKeys.recordings(callId) });
    },
  });
}

// ============================================
// Meeting Intelligence Types
// ============================================

export interface MeetingActionItem {
  id: string;
  task: string;
  assignee: string | null;
  assigneeId: string | null;
  deadline: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
}

export interface MeetingSummary {
  id: string;
  video_call_id: string;
  workspace_id: string;
  summary: string;
  key_points: string[];
  action_items: MeetingActionItem[];
  decisions: string[];
  topics_discussed: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  participants: string[];
  generated_by: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingTranscript {
  id: string;
  video_call_id: string;
  workspace_id: string;
  full_text: string;
  segments: Array<{
    speakerId: string;
    speakerName: string;
    text: string;
    timestamp: number;
  }>;
  language: string;
  duration_seconds: number;
  word_count: number;
  created_at: string;
}

// ============================================
// Meeting Intelligence API Functions
// ============================================

export const meetingIntelligenceApi = {
  /**
   * Get AI-generated meeting summary
   */
  async getMeetingSummary(callId: string): Promise<{
    success: boolean;
    message?: string;
    data: MeetingSummary | null;
  }> {
    return api.get(`/video-calls/${callId}/summary`);
  },

  /**
   * Get meeting transcript
   */
  async getCallTranscript(callId: string): Promise<{
    success: boolean;
    message?: string;
    data: MeetingTranscript | null;
  }> {
    return api.get(`/video-calls/${callId}/transcript`);
  },

  /**
   * Regenerate meeting summary
   */
  async regenerateMeetingSummary(callId: string): Promise<{
    success: boolean;
    message?: string;
    data: MeetingSummary | null;
  }> {
    return api.post(`/video-calls/${callId}/summary/regenerate`, {});
  },

  /**
   * Create tasks from meeting action items
   */
  async createTasksFromMeeting(
    callId: string,
    projectId?: string
  ): Promise<{
    success: boolean;
    message: string;
    tasksCreated: number;
  }> {
    return api.post(`/video-calls/${callId}/create-tasks`, { projectId });
  },
};

// ============================================
// Meeting Intelligence Query Keys
// ============================================

export const meetingIntelligenceKeys = {
  summary: (callId: string) => ['meetingSummary', callId] as const,
  transcript: (callId: string) => ['meetingTranscript', callId] as const,
};

// ============================================
// Meeting Intelligence Hooks
// ============================================

/**
 * Get meeting summary hook
 */
export function useMeetingSummary(callId: string) {
  return useQuery({
    queryKey: meetingIntelligenceKeys.summary(callId),
    queryFn: () => meetingIntelligenceApi.getMeetingSummary(callId),
    enabled: !!callId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Get meeting transcript hook
 */
export function useMeetingTranscript(callId: string) {
  return useQuery({
    queryKey: meetingIntelligenceKeys.transcript(callId),
    queryFn: () => meetingIntelligenceApi.getCallTranscript(callId),
    enabled: !!callId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Regenerate meeting summary mutation
 */
export function useRegenerateMeetingSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (callId: string) => meetingIntelligenceApi.regenerateMeetingSummary(callId),
    onSuccess: (_, callId) => {
      queryClient.invalidateQueries({ queryKey: meetingIntelligenceKeys.summary(callId) });
    },
  });
}

/**
 * Create tasks from meeting action items mutation
 */
export function useCreateTasksFromMeeting() {
  return useMutation({
    mutationFn: ({ callId, projectId }: { callId: string; projectId?: string }) =>
      meetingIntelligenceApi.createTasksFromMeeting(callId, projectId),
  });
}

// ============================================
// Export service for backward compatibility
// ============================================
export const videoCallService = videoCallApi;
