/**
 * Video Call Types - Complete type definitions
 * Clean TypeScript types for video calling functionality
 */

// Core participant interface
export interface Contact {
  id: string
  name: string
  email: string
  avatar: string
  department: string
  status: 'online' | 'offline' | 'away' | 'busy'
  lastSeen?: Date
}

// Re-export from service to avoid conflicts
export type { CallParticipant, CallSettings, CallQuality } from '@/lib/api/video-call-api'
import type { CallParticipant } from '@/lib/api/video-call-api'

// Call state interfaces
export interface VideoCallState {
  isCallActive: boolean
  callType: 'audio' | 'video' | null
  participants: CallParticipant[]
  localStream?: MediaStream
  isRecording: boolean
  recordingStartTime?: Date
  isQuickCall: boolean
  currentLayout: 'gallery' | 'speaker' | 'sidebar'
}

export interface CallHistory {
  id: string
  participants: Contact[]
  type: 'audio' | 'video'
  duration: number
  timestamp: number
  isGroupCall: boolean
  hasAIFeatures: boolean
  recording?: string
  status: 'completed' | 'missed' | 'declined'
}

export interface ScheduledMeeting {
  id: string
  title: string
  participants: Contact[]
  startTime: Date
  duration: number
  type: 'audio' | 'video'
  recurring: boolean
  description?: string
  agenda?: string[]
  createdBy: string
  meetingRoom?: string
}

// AI-related interfaces
export interface TranscriptionEntry {
  id: string
  speakerId: string
  speakerName: string
  text: string
  timestamp: number
  confidence: number
  language?: string
}

export interface MeetingNote {
  id: string
  timestamp: number
  content: string
  author: string
  authorAvatar?: string
  type: 'note' | 'action' | 'decision'
}

export interface ActionItem {
  id: string
  description: string
  assignedTo: string
  assignedToName: string
  dueDate?: Date
  completed: boolean
  timestamp: number
  priority: 'low' | 'medium' | 'high'
}

export interface Recording {
  id: string
  title: string
  duration: number
  size: number
  timestamp: number
  participants: string[]
  thumbnail?: string
  url: string
  transcription?: TranscriptionEntry[]
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: number
  createdAt?: number | Date  // Alias for timestamp for compatibility
  type: 'text' | 'emoji' | 'file'
  reactions?: { [emoji: string]: string[] } // emoji -> user IDs
  replyTo?: string
  isPinned?: boolean
}

// Settings interfaces (device settings)
export interface VideoDeviceSettings {
  defaultMicrophone?: string
  defaultCamera?: string
  defaultSpeaker?: string
  autoJoinAudio: boolean
  autoJoinVideo: boolean
  enableNoiseCancellation: boolean
  enableEchoCancellation: boolean
  videoQuality: 'low' | 'medium' | 'high'
  recordingQuality: 'low' | 'medium' | 'high'
}

export interface AIFeatures {
  transcriptionEnabled: boolean
  translationEnabled: boolean
  notesTakingEnabled: boolean
  actionItemsEnabled: boolean
  summaryEnabled: boolean
  targetLanguage?: string
  speakerDiarization: boolean
}

export interface MeetingSummary {
  id: string
  meetingId: string
  title: string
  date: Date
  duration: number
  participants: string[]
  keyTopics: string[]
  decisions: string[]
  actionItems: ActionItem[]
  transcript?: TranscriptionEntry[]
  createdAt: Date
}

// Quality and stats interfaces
export interface VideoQuality {
  resolution: '720p' | '1080p' | '4k'
  framerate: number
  bitrate: number
}

export interface AudioQuality {
  sampleRate: number
  bitrate: number
  channels: number
}

export interface MediaStats {
  video: {
    resolution: string
    framerate: number
    bitrate: number
    packetsLost: number
    jitter: number
  }
  audio: {
    bitrate: number
    packetsLost: number
    jitter: number
    volume: number
  }
  connection: {
    ping: number
    bandwidth: number
    quality: 'excellent' | 'good' | 'fair' | 'poor'
  }
}

// Event types
export type VideoCallEvent = 
  | { type: 'call_started'; callId: string }
  | { type: 'call_ended'; callId: string; duration: number }
  | { type: 'participant_joined'; participant: CallParticipant }
  | { type: 'participant_left'; participantId: string }
  | { type: 'participant_muted'; participantId: string; mediaType: 'audio' | 'video' }
  | { type: 'participant_unmuted'; participantId: string; mediaType: 'audio' | 'video' }
  | { type: 'screen_share_started'; participantId: string }
  | { type: 'screen_share_ended'; participantId: string }
  | { type: 'recording_started'; timestamp: number }
  | { type: 'recording_ended'; timestamp: number; duration: number }
  | { type: 'hand_raised'; participantId: string }
  | { type: 'hand_lowered'; participantId: string }
  | { type: 'chat_message'; message: ChatMessage }
  | { type: 'reaction'; participantId: string; emoji: string }

export interface CallInvitation {
  id: string
  callerId: string
  callerName: string
  callerAvatar?: string
  callType: 'audio' | 'video'
  timestamp: number
  isGroupCall: boolean
  participants?: Contact[]
}

// WebRTC related types
export interface PeerConnection {
  id: string
  connection: RTCPeerConnection
  stream?: MediaStream
  dataChannel?: RTCDataChannel
}

export interface MediaDevices {
  cameras: MediaDeviceInfo[]
  microphones: MediaDeviceInfo[]
  speakers: MediaDeviceInfo[]
}

export interface CallError {
  code: string
  message: string
  timestamp: number
  participantId?: string
}

// Component Props Interfaces
export interface VideoCallInterfaceProps {
  isOpen: boolean
  onClose: () => void
  callType: 'audio' | 'video'
  isGroupCall: boolean
  participants: CallParticipant[]
  currentUserId: string
  onToggleAudio: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  onLeaveCall: () => void
  onInviteParticipants?: () => void
  onToggleRecording?: () => void
  isRecording?: boolean
}

export interface ParticipantGridProps {
  participants: CallParticipant[]
  currentUserId: string
  layout: 'gallery' | 'speaker' | 'sidebar'
  localStream?: MediaStream
  localVideoMuted: boolean
}

export interface CallControlsProps {
  isAudioMuted: boolean
  isVideoMuted: boolean
  isScreenSharing: boolean
  isHandRaised: boolean
  isRecording: boolean
  onToggleAudio: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  onToggleHandRaise: () => void
  onToggleRecording?: () => void
  onEmojiReaction: (emoji: string) => void
  onLeaveCall: () => void
  callType: 'audio' | 'video'
}

export interface VideoCallChatProps {
  participants: CallParticipant[]
  currentUserId: string
  onClose: () => void
}

export interface AIMeetingPanelProps {
  callId: string  // Active video call ID
  participants: CallParticipant[]
  onClose: () => void
}

export interface LiveAIOverlayProps {
  sessionId: string
  isVisible: boolean
  onToggle: () => void
}

export interface MediaJoinSettings {
  micEnabled: boolean
  cameraEnabled: boolean
}

export interface IncomingCallModalProps {
  isOpen: boolean
  onAccept: (settings?: MediaJoinSettings) => void
  onDecline: () => void
  callInvitation: CallInvitation | null
}

export interface VideoLeftSidebarProps {
  currentView: string
  isCollapsed: boolean
  participants?: CallParticipant[]
  onStartCall?: (participants: Contact[], type: 'audio' | 'video') => void
}

export interface VideoRightSidebarProps {
  participants?: CallParticipant[]
  currentUserId?: string
  meetingTitle?: string
  meetingId?: string
  callDuration?: number
}

// Analytics interfaces
export interface UserAnalytics {
  totalMeetings: number
  totalDuration: number
  avgMeetingDuration: number
  meetingsThisWeek: number
  meetingsThisMonth: number
  totalParticipantsInteracted: number
  aiNotesGenerated: number
  summariesCreated: number
}

export interface Meeting {
  id: string
  title: string
  duration: number
  timestamp: number
  participants: Array<{ name: string; avatar?: string | null; display_name?: string } | string>
  hasNotes: boolean
  hasSummary: boolean
  status: string
}

export interface Summary {
  id: string
  title: string
  summary: string
  keyPoints: string[]
  timestamp: number
  duration: number
  participants: string[]
}

export interface Note {
  id: string
  title: string
  content: string
  timestamp: number
  duration: number
  participants: string[]
  confidence: number
}