/**
 * Video Call Interface - Main in-call UI component
 * Handles all video call features with exact UI preservation from Next.js
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  Users,
  UserPlus,
  Hand,
  MoreVertical,
  Circle,
  StopCircle,
  Smile,
  MessageSquare,
  Maximize2,
  Minimize2,
  Sparkles,
  PenTool,
  Settings,
  BarChart3,
  Captions,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import useVideoCallStore from '@/stores/videoCallStore'
import type { CallParticipant } from '@/lib/api/video-call-api'
import { VideoCallChat } from './VideoCallChat'
import { AIMeetingPanel } from './AIMeetingPanel'
import { InvitePeopleModal } from './InvitePeopleModal'
import { RecordingManagerModal } from './RecordingManagerModal'
import { VideoRightSidebar } from './VideoRightSidebar'
import { RecordingManager } from './RecordingManager'
import { EmojiPicker } from './EmojiPicker'
import { LiveAIOverlay } from './LiveAIOverlay'
import { CaptionOverlay, TranscriptPanel } from './CaptionOverlay'
import { useTranscription } from '@/hooks/useTranscription'

interface VideoCallInterfaceProps {
  className?: string
}

export function VideoCallInterface({ className }: VideoCallInterfaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [reactions, setReactions] = useState<Array<{id: string, emoji: string, timestamp: number}>>([])
  const [mediaPermissionDenied, setMediaPermissionDenied] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showAnalyticsSidebar, setShowAnalyticsSidebar] = useState(false)
  const [showRecordingManager, setShowRecordingManager] = useState(false)
  const [showLiveAI, setShowLiveAI] = useState(false)

  // Video call store
  const {
    isCallActive,
    callId,
    callType,
    isGroupCall,
    participants,
    currentUser,
    callDuration,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    isHandRaised,
    isRecording,
    recordingDuration: _recordingDuration,
    showChat,
    showAIPanel,
    isCaptionsEnabled,
    showTranscriptPanel,
    gridLayout,
    isFullscreen,

    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    toggleHandRaise,
    startRecording,
    stopRecording,
    toggleChat,
    toggleAIPanel,
    toggleCaptions,
    toggleTranscriptPanel,
    setGridLayout,
    toggleFullscreen,
    leaveCall
  } = useVideoCallStore()

  // Transcription hook
  const {
    isTranscribing,
    transcripts,
    currentCaption,
    currentSpeaker,
    startTranscription,
    stopTranscription,
  } = useTranscription({
    callId,
    enabled: isCaptionsEnabled,
  })

  // Start/stop transcription when captions are toggled
  useEffect(() => {
    if (isCaptionsEnabled && callId && !isTranscribing) {
      startTranscription()
    } else if (!isCaptionsEnabled && isTranscribing) {
      stopTranscription()
    }
  }, [isCaptionsEnabled, callId, isTranscribing, startTranscription, stopTranscription])

  // Format duration helper
  const formatDuration = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000) % 60
    const minutes = Math.floor(ms / (1000 * 60)) % 60
    const hours = Math.floor(ms / (1000 * 60 * 60))

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  // Handle media access retry
  const retryMediaAccess = useCallback(async () => {
    setMediaPermissionDenied(false)
    try {
      const constraints = {
        audio: true,
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      toast.success('Media access granted successfully!')
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        setMediaPermissionDenied(true)
        toast.error('Permissions still denied. Please check your browser settings.')
      } else {
        toast.error('Failed to access media devices')
      }
    }
  }, [callType])

  // Initialize local media stream
  useEffect(() => {
    const initializeMedia = async () => {
      // Only initialize if call is active
      if (!isCallActive) return

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Media devices not supported')
        }

        const constraints = {
          audio: true,
          video: callType === 'video' ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          } : false
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)

        if (videoRef.current && isCallActive) {
          videoRef.current.srcObject = stream
          console.log('Media stream initialized with', stream.getTracks().length, 'tracks')
        } else {
          // If call ended while waiting for media, stop the tracks
          stream.getTracks().forEach(track => track.stop())
        }
      } catch (error) {
        console.error('Failed to access media devices:', error)

        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            setMediaPermissionDenied(true)
            toast.error('Camera/microphone access denied. Please allow permissions and try again.')
          } else if (error.name === 'NotFoundError') {
            toast.error('No camera/microphone found. Please check your devices.')
          } else if (error.name === 'NotSupportedError') {
            toast.error('Media access not supported in this browser.')
          } else if (error.name === 'NotReadableError') {
            toast.error('Camera/microphone is already in use by another application.')
          }
        }
      }
    }

    initializeMedia()

    // Cleanup function - runs when isCallActive changes or component unmounts
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        const trackCount = stream.getTracks().length
        stream.getTracks().forEach(track => {
          track.stop()
          console.log('🛑 Stopped media track:', track.kind, '- Call active:', isCallActive)
        })
        videoRef.current.srcObject = null
        console.log('✅ Cleaned up', trackCount, 'media tracks')
      }
    }
  }, [isCallActive, callType])

  // Handle video/audio track enable/disable when toggle states change
  useEffect(() => {
    if (!isCallActive || !videoRef.current?.srcObject) return

    const stream = videoRef.current.srcObject as MediaStream

    // Update video track enabled state
    const videoTrack = stream.getVideoTracks()[0]
    if (videoTrack && videoTrack.enabled !== !isVideoMuted) {
      videoTrack.enabled = !isVideoMuted
      console.log('Video track toggled:', videoTrack.enabled ? 'ON' : 'OFF')
    }

    // Update audio track enabled state
    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack && audioTrack.enabled !== !isAudioMuted) {
      audioTrack.enabled = !isAudioMuted
      console.log('Audio track toggled:', audioTrack.enabled ? 'ON' : 'OFF')
    }
  }, [isVideoMuted, isAudioMuted, isCallActive])

  // Handle screen sharing
  const handleToggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare()
        toast.success('Screen sharing stopped')
      } else {
        await startScreenShare()
        toast.success('Screen sharing started')
      }
    } catch (error) {
      console.error('Screen sharing failed:', error)
      toast.error('Failed to toggle screen sharing')
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare])

  // Handle recording
  const handleToggleRecording = useCallback(() => {
    try {
      if (isRecording) {
        stopRecording()
        toast.success('Recording stopped', {
          description: 'Processing in background. You will be notified when ready.',
          duration: 5000,
        })
      } else {
        startRecording()
        toast.success('Recording started')
      }
    } catch (error) {
      console.error('Recording failed:', error)
      toast.error('Failed to toggle recording')
    }
  }, [isRecording, startRecording, stopRecording])

  // Handle reactions
  const addReaction = useCallback((emoji: string) => {
    const reaction = {
      id: Math.random().toString(36).substring(2, 11),
      emoji,
      timestamp: Date.now()
    }
    setReactions(prev => [...prev, reaction])

    // Remove reaction after 3 seconds
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id))
    }, 3000)
  }, [])

  // Handle hand raise
  const handleRaiseHand = useCallback(() => {
    toggleHandRaise()
    toast.success(isHandRaised ? 'Hand lowered' : 'Hand raised')
  }, [isHandRaised, toggleHandRaise])

  // Handle whiteboard - Opens in new tab with session ID
  const handleOpenWhiteboard = useCallback(() => {
    const sessionId = Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
    const whiteboardUrl = `/whiteboard/${sessionId}`

    window.open(whiteboardUrl, '_blank')

    toast.success(
      'Whiteboard opened!',
      {
        description: 'Link shared in chat'
      }
    )
  }, [])

  // Handle leaving call with cleanup
  const handleLeaveCall = useCallback(() => {
    console.log('🔴 Ending call - cleaning up media...')

    // Immediately stop all media tracks
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      const trackCount = stream.getTracks().length
      stream.getTracks().forEach(track => {
        track.stop()
        console.log('🛑 Manually stopped track on leave:', track.kind)
      })
      videoRef.current.srcObject = null
      console.log('✅ Manually cleaned up', trackCount, 'tracks before leaving call')
    }

    // Then call the store's leaveCall
    leaveCall()
  }, [leaveCall])

  // Get grid layout classes
  const getGridLayout = useCallback(() => {
    const totalParticipants = participants.length + 1

    if (gridLayout === 'speaker') {
      return {
        containerClass: 'flex flex-col w-full h-full',
        mainVideoClass: 'flex-1 mb-4',
        thumbnailClass: 'flex gap-2 overflow-x-auto'
      }
    }

    if (gridLayout === 'sidebar') {
      return {
        containerClass: 'flex gap-4 w-full h-full',
        mainVideoClass: 'flex-1 min-w-0',
        sidebarClass: 'w-64 flex flex-col gap-2 flex-shrink-0'
      }
    }

    // Gallery view (default)
    let gridCols = 'grid-cols-1'
    if (totalParticipants === 2) gridCols = 'grid-cols-2'
    else if (totalParticipants <= 4) gridCols = 'grid-cols-2'
    else if (totalParticipants <= 9) gridCols = 'grid-cols-3'
    else gridCols = 'grid-cols-4'

    return {
      containerClass: `grid gap-4 w-full h-full ${gridCols}`,
      mainVideoClass: '',
      thumbnailClass: ''
    }
  }, [participants.length, gridLayout])

  // Render participant component
  const renderParticipant = useCallback((participant: CallParticipant, isMainView: boolean = false) => {
    const isCurrentUser = participant.id === currentUser?.id
    const avatarSize = isMainView ? "h-32 w-32" : "h-24 w-24"
    const showVideo = callType === 'video' && !participant.isVideoMuted

    return (
      <>
        {/* Video element for current user - always in DOM, hidden when muted */}
        {callType === 'video' && isCurrentUser && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={cn(
              "w-full h-full object-cover absolute inset-0",
              participant.isVideoMuted && "hidden"
            )}
          />
        )}

        {/* Video placeholder for other participants */}
        {callType === 'video' && !isCurrentUser && showVideo && (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <span className="text-gray-400">Video feed for {participant.name}</span>
          </div>
        )}

        {/* Avatar overlay - shown when video is off or for audio calls */}
        {!showVideo && (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
            <Avatar className={cn(avatarSize, "ring-4 ring-white/20")}>
              <AvatarImage src={participant.avatar} />
              <AvatarFallback className={cn(
                "text-2xl font-bold text-white",
                isCurrentUser
                  ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                  : "bg-gradient-to-br from-green-500 to-blue-600"
              )}>
                {isCurrentUser ? 'You' : (participant.name || 'U').split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Participant Indicators */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-white text-sm font-medium">
              {participant.name || (isCurrentUser ? 'You' : 'Unknown')}
              {isCurrentUser && participant.name && ' (You)'}
            </span>
          </div>
          {participant.isAudioMuted && (
            <div className="bg-red-500 rounded-full p-1.5 shadow-lg">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}
          {participant.isHandRaised && (
            <div className="bg-yellow-500 rounded-full p-1.5 shadow-lg animate-bounce">
              <Hand className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Speaking indicator */}
        {participant.isSpeaking && !participant.isAudioMuted && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-green-500 rounded-full p-2 animate-pulse shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
        )}

        {/* Screen sharing indicator */}
        {participant.isScreenSharing && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-blue-500">
              <Monitor className="h-3 w-3 mr-1" />
              Sharing
            </Badge>
          </div>
        )}
      </>
    )
  }, [callType, currentUser?.id, videoRef])

  // Render video grid
  const renderVideoGrid = useCallback((allParticipants: CallParticipant[], layout: any) => {
    if (gridLayout === 'speaker') {
      const mainSpeaker = allParticipants.find(p => p.isSpeaking) || allParticipants[0]
      const otherParticipants = allParticipants.filter(p => p.id !== mainSpeaker?.id)

      return (
        <div className={layout.containerClass}>
          {mainSpeaker && (
            <div className={cn("relative bg-gray-800 rounded-lg overflow-hidden", layout.mainVideoClass)}>
              {renderParticipant(mainSpeaker, true)}
            </div>
          )}

          {otherParticipants.length > 0 && (
            <div className={cn("h-24", layout.thumbnailClass)}>
              {otherParticipants.map((participant) => (
                <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden w-32 h-24 flex-shrink-0">
                  {renderParticipant(participant, false)}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (gridLayout === 'sidebar') {
      const mainParticipant = allParticipants.find(p => p.isSpeaking) || allParticipants[0]
      const otherParticipants = allParticipants.filter(p => p.id !== mainParticipant?.id)

      return (
        <div className={layout.containerClass}>
          {mainParticipant && (
            <div className={cn("relative bg-gray-800 rounded-lg overflow-hidden", layout.mainVideoClass)}>
              {renderParticipant(mainParticipant, true)}
            </div>
          )}

          {otherParticipants.length > 0 && (
            <div className={layout.sidebarClass}>
              {otherParticipants.map((participant) => (
                <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                  {renderParticipant(participant, false)}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Gallery view (default)
    return (
      <div className={layout.containerClass}>
        {allParticipants.map((participant) => (
          <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden">
            {renderParticipant(participant, false)}
          </div>
        ))}
      </div>
    )
  }, [gridLayout, renderParticipant])

  if (!isCallActive) return null

  const allParticipants = currentUser ? [
    {
      ...currentUser,
      isAudioMuted,
      isVideoMuted,
      isScreenSharing,
      isHandRaised
    },
    ...participants
  ] : participants

  return (
    <div className={cn(
      "fixed inset-0 bg-gray-900 z-50 flex flex-col",
      isFullscreen && "z-[100]",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 text-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {callType === 'video' ? (
              <Video className="h-5 w-5 text-green-400" />
            ) : (
              <Mic className="h-5 w-5 text-green-400" />
            )}
            <span className="font-medium">
              {isGroupCall ? `Group ${callType} call` : `${callType} call`}
            </span>
          </div>

          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              <Circle className="h-3 w-3 mr-1" />
              REC
            </Badge>
          )}

          {isCaptionsEnabled && (
            <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
              <Captions className="h-3 w-3 mr-1" />
              CC
            </Badge>
          )}

          <span className="text-sm text-gray-300">
            {formatDuration(callDuration)}
          </span>

          {/* AI Status Indicators */}
          {showAIPanel && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Active
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isGroupCall && (
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              {allParticipants.length}
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-gray-700"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Call Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4 transition-all duration-300 min-w-0 overflow-hidden">
          {(() => {
            const layout = getGridLayout()
            return renderVideoGrid(allParticipants, layout)
          })()}
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 flex-shrink-0 h-full border-l border-gray-700">
            <VideoCallChat
              currentUserId={currentUser?.id || ''}
              participants={participants}
              onClose={() => {/* Close chat */}}
            />
          </div>
        )}

        {/* AI Meeting Panel */}
        {showAIPanel && callId && (
          <div className="w-96 flex-shrink-0 h-full border-l border-gray-700">
            <AIMeetingPanel
              callId={callId}
              participants={participants}
              onClose={toggleAIPanel}
            />
          </div>
        )}

        {/* Analytics Sidebar */}
        {showAnalyticsSidebar && (
          <div className="w-80 flex-shrink-0 h-full border-l border-gray-700">
            <VideoRightSidebar />
          </div>
        )}

        {/* Transcript Panel */}
        {showTranscriptPanel && (
          <div className="w-80 flex-shrink-0 h-full border-l border-gray-700 max-w-[320px] overflow-hidden">
            <TranscriptPanel
              transcripts={transcripts}
              isOpen={showTranscriptPanel}
              onClose={toggleTranscriptPanel}
            />
          </div>
        )}

        {/* Caption Overlay */}
        <CaptionOverlay
          caption={currentCaption}
          speakerName={currentSpeaker}
          isEnabled={isCaptionsEnabled}
        />

        {/* Floating Reactions */}
        <div className="absolute top-4 right-4 pointer-events-none">
          {reactions.map((reaction) => (
            <div
              key={reaction.id}
              className="text-4xl animate-bounce"
              style={{
                animationDuration: '1s',
                animationIterationCount: 'infinite',
                transform: `translateY(-${Math.random() * 50}px)`,
                marginLeft: `${Math.random() * 20}px`
              }}
            >
              {reaction.emoji}
            </div>
          ))}
        </div>

        {/* Media Permission Denied Overlay */}
        {mediaPermissionDenied && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4 text-center text-white">
              <div className="mb-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MicOff className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Camera & Microphone Access Required</h3>
                <p className="text-gray-300 text-sm">
                  To join this call, please allow access to your camera and microphone.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={retryMediaAccess}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Retry Access
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMediaPermissionDenied(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Continue Without Media
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call Duration Indicator */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">
              {formatDuration(callDuration)}
            </span>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 text-red-400">
              <Circle className="h-3 w-3 fill-current animate-pulse" />
              <span className="text-xs">Recording</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-center gap-4 max-w-4xl mx-auto">
          {/* Audio Control */}
          <Button
            variant={isAudioMuted ? "destructive" : "secondary"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform"
            title={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {/* Video Control */}
          {callType === 'video' && (
            <Button
              variant={isVideoMuted ? "destructive" : "secondary"}
              size="lg"
              onClick={toggleVideo}
              className="rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform"
              title={isVideoMuted ? "Turn on camera" : "Turn off camera"}
            >
              {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          )}

          {/* Screen Share */}
          <Button
            variant={isScreenSharing ? "default" : "secondary"}
            size="lg"
            onClick={handleToggleScreenShare}
            className="rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform"
            title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </Button>

          {/* Reactions - Using EmojiPicker */}
          <EmojiPicker onSelect={addReaction}>
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </EmojiPicker>

          {/* Raise Hand */}
          <Button
            variant={isHandRaised ? "default" : "secondary"}
            size="lg"
            onClick={handleRaiseHand}
            className={cn(
              "rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform",
              isHandRaised && "bg-yellow-500 hover:bg-yellow-600 animate-pulse"
            )}
          >
            <Hand className="h-5 w-5" />
          </Button>

          {/* Chat Toggle */}
          <Button
            variant={showChat ? "default" : "secondary"}
            size="lg"
            onClick={toggleChat}
            className="rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>

          {/* Closed Captions Toggle */}
          <Button
            variant={isCaptionsEnabled ? "default" : "secondary"}
            size="lg"
            onClick={toggleCaptions}
            className={cn(
              "rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform",
              isCaptionsEnabled && "bg-green-600 hover:bg-green-700"
            )}
            title={isCaptionsEnabled ? "Turn off captions" : "Turn on captions"}
          >
            <Captions className="h-5 w-5" />
          </Button>

          {/* Invite People */}
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowInviteModal(true)}
            className="rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform"
            title="Invite people to call"
          >
            <Users className="h-5 w-5" />
          </Button>

          {/* AI Features */}
          <Button
            variant={showAIPanel ? "default" : "secondary"}
            size="lg"
            onClick={toggleAIPanel}
            className={cn(
              "rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform",
              showAIPanel && "gradient-primary"
            )}
            title="AI Features"
          >
            <Sparkles className="h-5 w-5" />
          </Button>

          {/* Analytics */}
          <Button
            variant={showAnalyticsSidebar ? "default" : "secondary"}
            size="lg"
            onClick={() => setShowAnalyticsSidebar(!showAnalyticsSidebar)}
            className="rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform"
            title="Meeting Analytics"
          >
            <BarChart3 className="h-5 w-5" />
          </Button>

          {/* End Call */}
          <Button
            variant="destructive"
            size="lg"
            onClick={handleLeaveCall}
            className="rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="mb-2 w-48">
              <DropdownMenuItem onClick={() => setShowRecordingManager(true)}>
                <Circle className="mr-2 h-4 w-4" />
                Recording Manager
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleOpenWhiteboard}>
                <PenTool className="mr-2 h-4 w-4" />
                Open Whiteboard
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setShowLiveAI(!showLiveAI)}>
                <Sparkles className="mr-2 h-4 w-4" />
                {showLiveAI ? 'Hide' : 'Show'} Live AI
              </DropdownMenuItem>

              <DropdownMenuItem onClick={toggleTranscriptPanel}>
                <FileText className="mr-2 h-4 w-4" />
                {showTranscriptPanel ? 'Hide' : 'Show'} Transcript
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => setGridLayout('gallery')}>
                Gallery View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGridLayout('speaker')}>
                Speaker View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGridLayout('sidebar')}>
                Sidebar View
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Invite People Modal */}
      <InvitePeopleModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {/* Recording Manager Modal - Using the new RecordingManager */}
      <RecordingManager
        isOpen={showRecordingManager}
        onClose={() => setShowRecordingManager(false)}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        isRecording={isRecording}
        recordingDuration={_recordingDuration}
      />

      {/* Live AI Overlay */}
      <LiveAIOverlay
        sessionId="current-call"
        isVisible={showLiveAI}
        onToggle={() => setShowLiveAI(false)}
      />
    </div>
  )
}
