/**
 * Video Call Store - Global state management for video calling
 * Uses Zustand for reactive state management
 * Integrated with real backend API, WebSocket, and LiveKit
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { videoCallApi } from '@/lib/api/video-call-api'
import { videoCallSocket } from '@/lib/socket/video-call-socket'
import { liveKitClient } from '@/lib/livekit/livekit-client'
import { toast } from 'sonner'
import type { CallParticipant, CallSettings, CallQuality } from '@/lib/api/video-call-api'

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: number
  type: 'message' | 'system' | 'reaction' | 'recording'
  replyTo?: string
  reactions?: { emoji: string; count: number; users: string[] }[]
  isPinned?: boolean
  recordingUrl?: string
}

export interface CallHistory {
  id: string
  participants: CallParticipant[]
  type: 'audio' | 'video'
  duration: number
  timestamp: number
  isGroupCall: boolean
  hasAIFeatures: boolean
  recordingUrl?: string
}

export interface VideoCallState {
  // Call state
  isCallActive: boolean
  callId: string | null
  callType: 'audio' | 'video' | null
  isGroupCall: boolean
  callStartTime: number | null
  callDuration: number
  
  // Current user
  currentUserId: string | null
  currentUser: CallParticipant | null
  
  // Participants
  participants: CallParticipant[]
  
  // Local media state
  isAudioMuted: boolean
  isVideoMuted: boolean
  isScreenSharing: boolean
  isHandRaised: boolean
  isSpeaking: boolean
  
  // Call features
  isRecording: boolean
  recordingDuration: number
  showChat: boolean
  showAIPanel: boolean

  // Transcription/Captions
  isCaptionsEnabled: boolean
  showTranscriptPanel: boolean
  
  // Chat
  chatMessages: ChatMessage[]
  unreadChatCount: number
  
  // UI state
  gridLayout: 'gallery' | 'speaker' | 'sidebar'
  isFullscreen: boolean
  showParticipants: boolean
  
  // Quality & connection
  connectionState: RTCPeerConnectionState
  callQuality: CallQuality | null
  networkIssues: string[]
  
  // Call history
  callHistory: CallHistory[]
  
  // Settings
  callSettings: CallSettings
  
  // Actions
  initializeCall: (callId: string, userId: string, userName: string) => Promise<void>
  startCall: (workspaceId: string, participants: CallParticipant[], type: 'audio' | 'video', isGroupCall?: boolean) => Promise<void>
  joinCall: (callId: string, userId: string, userName: string) => Promise<void>
  leaveCall: () => Promise<void>
  endCall: () => void
  
  // Participant management
  addParticipant: (participant: CallParticipant) => void
  removeParticipant: (participantId: string) => void
  updateParticipant: (participantId: string, updates: Partial<CallParticipant>) => void
  
  // Media controls
  toggleAudio: () => Promise<void>
  toggleVideo: () => Promise<void>
  startScreenShare: () => Promise<void>
  stopScreenShare: () => Promise<void>
  toggleHandRaise: () => void
  
  // Recording
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  
  // Chat
  sendMessage: (content: string, replyTo?: string) => void
  addChatMessage: (message: ChatMessage) => void
  markChatAsRead: () => void
  toggleChat: () => void
  
  // UI actions
  setGridLayout: (layout: 'gallery' | 'speaker' | 'sidebar') => void
  toggleFullscreen: () => void
  toggleAIPanel: () => void
  toggleParticipants: () => void

  // Transcription/Captions
  toggleCaptions: () => void
  toggleTranscriptPanel: () => void
  
  // Settings
  updateSettings: (settings: Partial<CallSettings>) => void
  
  // Utility
  updateCallDuration: () => void
  setConnectionState: (state: RTCPeerConnectionState) => void
  updateCallQuality: (quality: CallQuality) => void
  addNetworkIssue: (issue: string) => void
  clearNetworkIssues: () => void
  
  // Call history
  addToHistory: (call: CallHistory) => void
  getCallHistory: () => CallHistory[]
  clearHistory: () => void
}

export const useVideoCallStore = create<VideoCallState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isCallActive: false,
    callId: null,
    callType: null,
    isGroupCall: false,
    callStartTime: null,
    callDuration: 0,
    
    currentUserId: null,
    currentUser: null,
    
    participants: [],
    
    isAudioMuted: false,
    isVideoMuted: false,
    isScreenSharing: false,
    isHandRaised: false,
    isSpeaking: false,
    
    isRecording: false,
    recordingDuration: 0,
    showChat: false,
    showAIPanel: false,
    isCaptionsEnabled: false,
    showTranscriptPanel: false,
    
    chatMessages: [],
    unreadChatCount: 0,
    
    gridLayout: 'gallery',
    isFullscreen: false,
    showParticipants: true,
    
    connectionState: 'new' as RTCPeerConnectionState,
    callQuality: null,
    networkIssues: [],
    
    callHistory: [],
    
    callSettings: {
      video: {
        enabled: true,
        width: 1280,
        height: 720,
        frameRate: 30
      },
      audio: {
        enabled: true,
        echoCancellation: true,
        noiseSuppression: true
      },
      screen: {
        enabled: false,
        includeAudio: true
      },
      recording: {
        enabled: false,
        transcription: false
      },
      chat: {
        enabled: true,
        allowPrivate: true
      }
    },

    // Actions
    initializeCall: async (callId: string, userId: string, userName: string) => {
      const state = get()

      set({
        callId,
        currentUserId: userId,
        currentUser: {
          id: userId,
          user_id: userId,
          name: userName,
          email: `${userName.toLowerCase()}@company.com`,
          role: 'host',
          // Frontend style
          isAudioMuted: state.isAudioMuted,
          isVideoMuted: state.isVideoMuted,
          isScreenSharing: false,
          isHandRaised: false,
          isSpeaking: false,
          // Backend style (same values)
          is_audio_muted: state.isAudioMuted,
          is_video_muted: state.isVideoMuted,
          is_screen_sharing: false,
          is_hand_raised: false,
          // Optional backend fields
          video_call_id: undefined,
          created_at: new Date().toISOString()
        }
      })

      // Connect to WebSocket namespace (if not already connected)
      if (!videoCallSocket.isConnected()) {
        const token = localStorage.getItem('auth_token') || ''
        videoCallSocket.connect(token)
      }

      // Setup WebSocket event listeners for real-time updates
      videoCallSocket.on('participant:joined', (data: any) => {
        console.log('✅ Participant joined:', data.userId)
        // Fetch updated participants list from API
        videoCallApi.getParticipants(callId).then(participants => {
          const newParticipant = participants.find(p => p.user_id === data.userId)
          if (newParticipant) {
            get().addParticipant({
              id: newParticipant.user_id,
              user_id: newParticipant.user_id,
              name: newParticipant.display_name || 'User',
              email: '',
              role: newParticipant.role,
              // Frontend style
              isAudioMuted: newParticipant.is_audio_muted,
              isVideoMuted: newParticipant.is_video_muted,
              isScreenSharing: newParticipant.is_screen_sharing,
              isHandRaised: newParticipant.is_hand_raised,
              isSpeaking: false,
              // Backend style (same values)
              is_audio_muted: newParticipant.is_audio_muted,
              is_video_muted: newParticipant.is_video_muted,
              is_screen_sharing: newParticipant.is_screen_sharing,
              is_hand_raised: newParticipant.is_hand_raised,
              // Optional backend fields
              video_call_id: undefined,
              created_at: new Date().toISOString()
            })
          }
        }).catch(err => console.error('Failed to fetch participants:', err))
      })

      videoCallSocket.on('participant:left', (data: any) => {
        console.log('❌ Participant left:', data.userId)
        get().removeParticipant(data.userId)
      })

      videoCallSocket.on('participant:media_updated', (data: any) => {
        console.log('🎥 Media updated:', data)
        const updates: any = {}
        if (data.mediaType === 'audio') updates.isAudioMuted = !data.enabled
        if (data.mediaType === 'video') updates.isVideoMuted = !data.enabled
        if (data.mediaType === 'screen') updates.isScreenSharing = data.enabled

        get().updateParticipant(data.userId, updates)
      })

      videoCallSocket.on('participant:hand_updated', (data: any) => {
        console.log('✋ Hand updated:', data)
        get().updateParticipant(data.userId, { isHandRaised: data.raised })
      })

      videoCallSocket.on('chat:message_received', (message: any) => {
        // Determine message type and sender name
        const isSystemMessage = message.senderId === 'system'
        const isRecordingMessage = message.type === 'recording'

        get().addChatMessage({
          id: message.id,
          senderId: message.senderId,
          senderName: isSystemMessage ? (message.senderName || 'System') : 'User', // TODO: lookup from participants
          content: message.content,
          timestamp: new Date(message.timestamp).getTime(),
          type: isRecordingMessage ? 'recording' : (isSystemMessage ? 'system' : 'message'),
          replyTo: message.replyTo,
          recordingUrl: message.recordingUrl
        })

        // Show toast for recording messages
        if (isRecordingMessage && message.recordingUrl) {
          toast.success('Recording is ready!', {
            description: 'Check the chat for the download link',
            duration: 5000
          })
        }
      })

      videoCallSocket.on('recording:status', (data: any) => {
        set({ isRecording: data.status === 'started' })
        toast.info(`Recording ${data.status}`)
      })

      // Setup LiveKit event listeners
      liveKitClient.on('participantConnected', (participant: any) => {
        console.log('🎥 LiveKit participant connected:', participant.identity)
      })

      liveKitClient.on('trackSubscribed', (data: any) => {
        console.log('🎥 Track subscribed:', data.track.kind, 'from', data.participant.identity)
        if (data.track.kind === 'video' || data.track.kind === 'audio') {
          const mediaStream = new MediaStream([data.track.mediaStreamTrack])
          get().updateParticipant(data.participant.identity, { stream: mediaStream })
        }
      })
    },

    startCall: async (workspaceId: string, participants: CallParticipant[], type: 'audio' | 'video', isGroupCall = false) => {
      const state = get()

      try {
        console.log('🎥 Starting call...')
        console.log('📋 Participants received:', participants)

        // Validate participants
        if (!participants || participants.length === 0) {
          toast.error('No participants available for call')
          throw new Error('No participants provided')
        }

        const participantIds = participants.map(p => p.id || p.user_id || '').filter(Boolean)
        console.log('📋 Participant IDs extracted:', participantIds)

        if (participantIds.length === 0) {
          toast.error('Unable to extract participant IDs')
          throw new Error('No valid participant IDs')
        }

        // 1. Create call via API
        const call = await videoCallApi.createCall(workspaceId, {
          title: `${type === 'video' ? 'Video' : 'Audio'} Call`,
          description: `Call with ${participants.map(p => p.name).join(', ')}`,
          call_type: type,
          is_group_call: isGroupCall,
          participant_ids: participantIds,
          video_quality: 'hd',
          max_participants: 50,
          recording_enabled: false,
        })

        console.log('✅ Call created:', call.id)

        // 2. Join the call to get token
        const joinResponse = await videoCallApi.joinCall(call.id, {
          display_name: state.currentUser?.name || 'You'
        })

        console.log('✅ Got join token and room URL')

        // 3. Initialize call state and WebSocket
        await get().initializeCall(call.id, state.currentUserId || joinResponse.participant.user_id, state.currentUser?.name || 'You')

        // 4. Join WebSocket room
        await videoCallSocket.joinCall(call.id)
        console.log('✅ Joined WebSocket room')

        // 5. Connect to LiveKit room
        await liveKitClient.connect(joinResponse.room_url, joinResponse.token)
        console.log('✅ Connected to LiveKit room')

        // 6. Enable camera/microphone
        await liveKitClient.enableMicrophone(true)
        if (type === 'video') {
          await liveKitClient.enableCamera(true)
        }
        console.log('✅ Media enabled')

        // 7. Update state
        set({
          isCallActive: true,
          callId: call.id,
          callType: type,
          isGroupCall,
          participants,
          callStartTime: Date.now(),
          isVideoMuted: type === 'audio',
          isAudioMuted: false,
        })

        // 8. Add system message
        get().addChatMessage({
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          content: `${type === 'video' ? 'Video' : 'Audio'} call started`,
          timestamp: Date.now(),
          type: 'system'
        })

        toast.success(`${type} call started successfully`)
        console.log('🎉 Call fully initialized and ready')
      } catch (error) {
        console.error('❌ Failed to start call:', error)
        set({ isCallActive: false, callId: null })
        toast.error('Failed to start call')
        throw error
      }
    },

    joinCall: async (callId: string, userId: string, userName: string) => {
      try {
        console.log('🎥 Joining call:', callId)

        // 1. Join call via API to get token
        const joinResponse = await videoCallApi.joinCall(callId, {
          display_name: userName
        })

        console.log('✅ Got join token and room URL')

        // 2. Initialize call state and WebSocket
        await get().initializeCall(callId, userId, userName)

        // 3. Join WebSocket room
        await videoCallSocket.joinCall(callId)
        console.log('✅ Joined WebSocket room')

        // 4. Connect to LiveKit room
        await liveKitClient.connect(joinResponse.room_url, joinResponse.token)
        console.log('✅ Connected to LiveKit room')

        // 5. Enable camera/microphone
        await liveKitClient.enableMicrophone(true)
        await liveKitClient.enableCamera(true)
        console.log('✅ Media enabled')

        // 6. Update state
        set({
          isCallActive: true,
          callId,
          callType: joinResponse.call.call_type,
          callStartTime: Date.now(),
        })

        // 7. Add system message
        get().addChatMessage({
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          content: `${userName} joined the call`,
          timestamp: Date.now(),
          type: 'system'
        })

        toast.success('Joined call successfully')
        console.log('🎉 Call join complete')
      } catch (error) {
        console.error('❌ Failed to join call:', error)
        set({ isCallActive: false })
        toast.error('Failed to join call')
        throw error
      }
    },

    leaveCall: async () => {
      const state = get()

      if (state.isCallActive && state.callId) {
        try {
          console.log('👋 Leaving call:', state.callId)

          // 1. Leave via API
          await videoCallApi.leaveCall(state.callId)
          console.log('✅ Left call via API')

          // 2. Leave WebSocket room
          await videoCallSocket.leaveCall(state.callId)
          console.log('✅ Left WebSocket room')

          // 3. Disconnect from LiveKit
          await liveKitClient.disconnect()
          console.log('✅ Disconnected from LiveKit')

          // 4. Add to history
          if (state.callStartTime) {
            const callData: CallHistory = {
              id: state.callId,
              participants: state.participants,
              type: state.callType || 'audio',
              duration: Date.now() - state.callStartTime,
              timestamp: state.callStartTime,
              isGroupCall: state.isGroupCall,
              hasAIFeatures: state.showAIPanel,
              recordingUrl: undefined
            }
            get().addToHistory(callData)
          }

          // 5. Clear state
          get().endCall()

          toast.info('Left call')
        } catch (error) {
          console.error('❌ Failed to leave call:', error)
          // Still clear state even if API fails
          await liveKitClient.disconnect()
          get().endCall()
        }
      }
    },

    endCall: () => {
      set({
        isCallActive: false,
        callId: null,
        callType: null,
        isGroupCall: false,
        callStartTime: null,
        callDuration: 0,
        participants: [],
        isAudioMuted: false,
        isVideoMuted: false,
        isScreenSharing: false,
        isHandRaised: false,
        isSpeaking: false,
        isRecording: false,
        recordingDuration: 0,
        showChat: false,
        showAIPanel: false,
        isCaptionsEnabled: false,
        showTranscriptPanel: false,
        chatMessages: [],
        unreadChatCount: 0,
        isFullscreen: false,
        connectionState: 'new' as RTCPeerConnectionState,
        callQuality: null,
        networkIssues: []
      })
    },

    addParticipant: (participant: CallParticipant) => {
      set((state) => ({
        participants: [...state.participants, participant]
      }))
      
      get().addChatMessage({
        id: `msg-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        content: `${participant.name} joined the call`,
        timestamp: Date.now(),
        type: 'system'
      })
    },

    removeParticipant: (participantId: string) => {
      const state = get()
      const participant = state.participants.find(p => p.id === participantId)
      
      set((state) => ({
        participants: state.participants.filter(p => p.id !== participantId)
      }))
      
      if (participant) {
        get().addChatMessage({
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          content: `${participant.name} left the call`,
          timestamp: Date.now(),
          type: 'system'
        })
      }
    },

    updateParticipant: (participantId: string, updates: Partial<CallParticipant>) => {
      set((state) => ({
        participants: state.participants.map(p => 
          p.id === participantId ? { ...p, ...updates } : p
        )
      }))
    },

    toggleAudio: async () => {
      const state = get()
      const newMutedState = !state.isAudioMuted

      try {
        // 1. Toggle in LiveKit
        await liveKitClient.enableMicrophone(!newMutedState)

        // 2. Update local state
        set({ isAudioMuted: newMutedState })

        // 3. Notify other participants via WebSocket
        if (state.callId && state.currentUser?.id) {
          await videoCallSocket.toggleMedia({
            callId: state.callId,
            participantId: state.currentUser.id,
            mediaType: 'audio',
            enabled: !newMutedState,
          })
        }

        // 4. Update participant in store
        if (state.currentUser?.id) {
          get().updateParticipant(state.currentUser.id, { isAudioMuted: newMutedState })
        }

        console.log(`🎤 Audio ${newMutedState ? 'muted' : 'unmuted'}`)
      } catch (error) {
        console.error('Failed to toggle audio:', error)
        set({ isAudioMuted: !newMutedState }) // Revert on error
        toast.error('Failed to toggle audio')
        throw error
      }
    },

    toggleVideo: async () => {
      const state = get()
      const newMutedState = !state.isVideoMuted

      try {
        // 1. Toggle in LiveKit
        await liveKitClient.enableCamera(!newMutedState)

        // 2. Update local state
        set({ isVideoMuted: newMutedState })

        // 3. Notify other participants via WebSocket
        if (state.callId && state.currentUser?.id) {
          await videoCallSocket.toggleMedia({
            callId: state.callId,
            participantId: state.currentUser.id,
            mediaType: 'video',
            enabled: !newMutedState,
          })
        }

        // 4. Update participant in store
        if (state.currentUser?.id) {
          get().updateParticipant(state.currentUser.id, { isVideoMuted: newMutedState })
        }

        console.log(`📹 Video ${newMutedState ? 'muted' : 'unmuted'}`)
      } catch (error) {
        console.error('Failed to toggle video:', error)
        set({ isVideoMuted: !newMutedState }) // Revert on error
        toast.error('Failed to toggle video')
        throw error
      }
    },

    startScreenShare: async () => {
      const state = get()

      try {
        // 1. Start screen share in LiveKit
        await liveKitClient.startScreenShare()

        // 2. Update local state
        set({ isScreenSharing: true })

        // 3. Notify other participants via WebSocket
        if (state.callId && state.currentUser?.id) {
          await videoCallSocket.toggleMedia({
            callId: state.callId,
            participantId: state.currentUser.id,
            mediaType: 'screen',
            enabled: true,
          })
        }

        // 4. Update participant in store
        if (state.currentUser?.id) {
          get().updateParticipant(state.currentUser.id, { isScreenSharing: true })
        }

        console.log('🖥️ Screen sharing started')
        toast.success('Screen sharing started')
      } catch (error) {
        console.error('Failed to start screen share:', error)
        toast.error('Failed to start screen sharing')
        throw error
      }
    },

    stopScreenShare: async () => {
      const state = get()

      try {
        // 1. Stop screen share in LiveKit
        await liveKitClient.stopScreenShare()

        // 2. Update local state
        set({ isScreenSharing: false })

        // 3. Notify other participants via WebSocket
        if (state.callId && state.currentUser?.id) {
          await videoCallSocket.toggleMedia({
            callId: state.callId,
            participantId: state.currentUser.id,
            mediaType: 'screen',
            enabled: false,
          })
        }

        // 4. Update participant in store
        if (state.currentUser?.id) {
          get().updateParticipant(state.currentUser.id, { isScreenSharing: false })
        }

        console.log('🖥️ Screen sharing stopped')
      } catch (error) {
        console.error('Failed to stop screen share:', error)
        toast.error('Failed to stop screen sharing')
        throw error
      }
    },

    toggleHandRaise: () => {
      const state = get()
      const newHandRaised = !state.isHandRaised

      set({ isHandRaised: newHandRaised })

      // Notify via WebSocket
      if (state.callId && state.currentUser?.id) {
        videoCallSocket.raiseHand(state.callId, state.currentUser.id, newHandRaised).catch(error => {
          console.error('Failed to toggle hand raise:', error)
        })
      }

      if (state.currentUser?.id) {
        get().updateParticipant(state.currentUser.id, { isHandRaised: newHandRaised })
      }

      console.log(`✋ Hand ${newHandRaised ? 'raised' : 'lowered'}`)
    },

    startRecording: async () => {
      const state = get()

      if (!state.callId) {
        throw new Error('No active call')
      }

      try {
        // 1. Start recording via API
        const recording = await videoCallApi.startRecording(state.callId, {
          transcription_enabled: true,
          audio_only: false,
        })

        console.log('✅ Recording started:', recording.id)

        // 2. Update state
        set({
          isRecording: true,
          recordingDuration: 0
        })

        // 3. Add system message
        get().addChatMessage({
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          content: 'Recording started',
          timestamp: Date.now(),
          type: 'system'
        })

        toast.success('Recording started')
      } catch (error) {
        console.error('Failed to start recording:', error)
        toast.error('Failed to start recording')
        throw error
      }
    },

    stopRecording: async () => {
      const state = get()

      if (!state.callId) {
        throw new Error('No active call')
      }

      try {
        // 1. Get active recordings to find the ID
        const recordings = await videoCallApi.getRecordings(state.callId)
        const activeRecording = recordings.find(r => r.status === 'recording')

        if (!activeRecording) {
          throw new Error('No active recording found')
        }

        // 2. Stop recording via API
        await videoCallApi.stopRecording(state.callId, activeRecording.id)

        console.log('✅ Recording stopped:', activeRecording.id)

        // 3. Update state
        set({
          isRecording: false,
          recordingDuration: 0
        })

        // 4. Add system message
        get().addChatMessage({
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          content: 'Recording stopped - processing in background. You will be notified when ready.',
          timestamp: Date.now(),
          type: 'system'
        })

        toast.success('Recording stopped', {
          description: 'Processing in background. You will be notified when the recording is ready.',
          duration: 5000,
        })
      } catch (error) {
        console.error('Failed to stop recording:', error)
        toast.error('Failed to stop recording')
        throw error
      }
    },

    sendMessage: async (content: string, replyTo?: string) => {
      const state = get()

      if (!state.currentUser?.id || !state.callId) {
        return
      }

      const message: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        senderId: state.currentUser.id,
        senderName: state.currentUser.name || 'Unknown',
        senderAvatar: state.currentUser.avatar,
        content: content.trim(),
        timestamp: Date.now(),
        type: 'message',
        replyTo
      }

      try {
        // 1. Send via WebSocket (will be broadcast to all participants)
        await videoCallSocket.sendChatMessage({
          callId: state.callId,
          content: message.content,
          replyTo,
        })

        // 2. Add to local state immediately for optimistic UI
        get().addChatMessage(message)

        console.log('💬 Message sent:', content.substring(0, 50))
      } catch (error) {
        console.error('Failed to send chat message:', error)
        toast.error('Failed to send message')
      }
    },

    addChatMessage: (message: ChatMessage) => {
      set((state) => ({
        chatMessages: [...state.chatMessages, message],
        unreadChatCount: state.showChat ? state.unreadChatCount : state.unreadChatCount + 1
      }))
    },

    markChatAsRead: () => {
      set({ unreadChatCount: 0 })
    },

    toggleChat: () => {
      const state = get()
      const newShowChat = !state.showChat
      
      set({ showChat: newShowChat })
      
      if (newShowChat) {
        get().markChatAsRead()
      }
    },

    setGridLayout: (layout: 'gallery' | 'speaker' | 'sidebar') => {
      set({ gridLayout: layout })
    },

    toggleFullscreen: () => {
      set((state) => ({ isFullscreen: !state.isFullscreen }))
    },

    toggleAIPanel: () => {
      set((state) => ({ showAIPanel: !state.showAIPanel }))
    },

    toggleParticipants: () => {
      set((state) => ({ showParticipants: !state.showParticipants }))
    },

    toggleCaptions: () => {
      set((state) => ({ isCaptionsEnabled: !state.isCaptionsEnabled }))
    },

    toggleTranscriptPanel: () => {
      set((state) => ({ showTranscriptPanel: !state.showTranscriptPanel }))
    },

    updateSettings: (settings: Partial<CallSettings>) => {
      set((state) => {
        const newSettings: CallSettings = { ...state.callSettings, ...settings };

        if (settings.video) {
          newSettings.video = { ...state.callSettings.video, ...settings.video };
        }
        if (settings.audio) {
          newSettings.audio = { ...state.callSettings.audio, ...settings.audio };
        }
        if (settings.screen) {
          newSettings.screen = { ...state.callSettings.screen, ...settings.screen };
        }
        if (settings.recording) {
          newSettings.recording = { ...state.callSettings.recording, ...settings.recording };
        }
        if (settings.chat) {
          newSettings.chat = { ...state.callSettings.chat, ...settings.chat };
        }

        return { callSettings: newSettings };
      })
    },

    updateCallDuration: () => {
      const state = get()
      if (state.callStartTime) {
        set({ callDuration: Date.now() - state.callStartTime })
      }
    },

    setConnectionState: (connectionState: RTCPeerConnectionState) => {
      set({ connectionState })
    },

    updateCallQuality: (callQuality: CallQuality) => {
      set({ callQuality })
    },

    addNetworkIssue: (issue: string) => {
      set((state) => ({
        networkIssues: [...state.networkIssues, issue]
      }))
    },

    clearNetworkIssues: () => {
      set({ networkIssues: [] })
    },

    addToHistory: (call: CallHistory) => {
      set((state) => ({
        callHistory: [call, ...state.callHistory.slice(0, 49)] // Keep last 50 calls
      }))
    },

    getCallHistory: () => {
      return get().callHistory
    },

    clearHistory: () => {
      set({ callHistory: [] })
    }
  }))
)

// Auto-update call duration every second when in call
let durationInterval: NodeJS.Timeout | null = null

useVideoCallStore.subscribe(
  (state) => state.isCallActive,
  (isCallActive) => {
    if (isCallActive) {
      durationInterval = setInterval(() => {
        useVideoCallStore.getState().updateCallDuration()
      }, 1000)
    } else if (durationInterval) {
      clearInterval(durationInterval)
      durationInterval = null
    }
  }
)

// Auto-update recording duration every second when recording
let recordingInterval: NodeJS.Timeout | null = null

useVideoCallStore.subscribe(
  (state) => state.isRecording,
  (isRecording) => {
    if (isRecording) {
      recordingInterval = setInterval(() => {
        useVideoCallStore.setState((state) => ({
          recordingDuration: state.recordingDuration + 1000
        }))
      }, 1000)
    } else if (recordingInterval) {
      clearInterval(recordingInterval)
      recordingInterval = null
    }
  }
)

export default useVideoCallStore