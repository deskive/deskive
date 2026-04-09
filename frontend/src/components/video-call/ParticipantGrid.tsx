/**
 * Participant Grid - Layout component for video call participants
 * Handles different view modes: gallery, speaker, sidebar
 */

import { useRef, useEffect } from 'react'
import { Monitor, MicOff, Hand } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CallParticipant } from '@/lib/api/video-call-api'

interface ParticipantGridProps {
  participants: CallParticipant[]
  currentUserId: string
  layout: 'gallery' | 'speaker' | 'sidebar'
  callType: 'audio' | 'video'
  localStream?: MediaStream | null
  className?: string
}

interface ParticipantVideoProps {
  participant: CallParticipant
  isCurrentUser: boolean
  isMainView: boolean
  callType: 'audio' | 'video'
  localStream?: MediaStream | null
}

function ParticipantVideo({ 
  participant, 
  isCurrentUser, 
  isMainView, 
  callType,
  localStream 
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const avatarSize = isMainView ? "h-32 w-32" : "h-24 w-24"

  // Setup video stream
  useEffect(() => {
    if (videoRef.current) {
      if (isCurrentUser && localStream) {
        videoRef.current.srcObject = localStream
      } else if (participant.stream) {
        videoRef.current.srcObject = participant.stream
      }
    }
  }, [isCurrentUser, localStream, participant.stream])

  return (
    <div className="relative w-full h-full bg-gray-800 rounded-lg overflow-hidden">
      {callType === 'video' && !participant.isVideoMuted ? (
        isCurrentUser && localStream ? (
          <video
            ref={videoRef}
            autoPlay
            muted={isCurrentUser} // Mute own audio to prevent feedback
            playsInline
            className="w-full h-full object-cover"
          />
        ) : participant.stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <div className="text-gray-400 text-center">
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-sm">Connecting...</span>
            </div>
          </div>
        )
      ) : (
        // Audio mode or video muted - show avatar
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
          <Avatar className={cn(avatarSize, "ring-4 ring-white/20")}>
            <AvatarImage src={participant.avatar} />
            <AvatarFallback className={cn(
              "text-2xl font-bold text-white",
              isCurrentUser 
                ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                : "bg-gradient-to-br from-green-500 to-blue-600"
            )}>
              {isCurrentUser ? 'You' : (participant.name || 'U').split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      {/* Participant Info Overlay */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-white text-sm font-medium">
            {isCurrentUser ? 'You' : (participant.name || 'Unknown')}
          </span>
        </div>
        
        {/* Audio muted indicator */}
        {participant.isAudioMuted && (
          <div className="bg-red-500 rounded-full p-1.5 shadow-lg">
            <MicOff className="h-3 w-3 text-white" />
          </div>
        )}
        
        {/* Hand raised indicator */}
        {participant.isHandRaised && (
          <div className="bg-yellow-500 rounded-full p-1.5 shadow-lg animate-bounce">
            <Hand className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Speaking indicator */}
      {participant.isSpeaking && !participant.isAudioMuted && (
        <div className="absolute top-2 right-2">
          <div className="bg-green-500 rounded-full p-2 animate-pulse shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>
      )}

      {/* Enhanced ring for speaking participants in audio calls */}
      {callType === 'audio' && participant.isSpeaking && !participant.isAudioMuted && (
        <div className="absolute inset-0 rounded-lg border-4 border-green-400 animate-pulse"></div>
      )}

      {/* Screen sharing indicator */}
      {participant.isScreenSharing && (
        <div className="absolute top-2 left-2">
          <Badge className="bg-blue-500 text-white">
            <Monitor className="h-3 w-3 mr-1" />
            Sharing
          </Badge>
        </div>
      )}

    </div>
  )
}

export function ParticipantGrid({
  participants,
  currentUserId,
  layout,
  callType,
  localStream,
  className
}: ParticipantGridProps) {
  // Find current user and combine with participants
  const allParticipants = participants.filter(p => p.id !== currentUserId)
  const currentUser = participants.find(p => p.id === currentUserId)

  // Gallery layout
  if (layout === 'gallery') {
    const totalParticipants = participants.length
    let gridCols = 'grid-cols-1'
    
    if (totalParticipants === 2) gridCols = 'grid-cols-2'
    else if (totalParticipants <= 4) gridCols = 'grid-cols-2'
    else if (totalParticipants <= 9) gridCols = 'grid-cols-3'
    else gridCols = 'grid-cols-4'

    return (
      <div className={cn(`grid gap-4 h-full ${gridCols}`, className)}>
        {/* Current user */}
        {currentUser && (
          <ParticipantVideo
            participant={currentUser}
            isCurrentUser={true}
            isMainView={false}
            callType={callType}
            localStream={localStream}
          />
        )}
        
        {/* Other participants */}
        {allParticipants.map((participant) => (
          <ParticipantVideo
            key={participant.id}
            participant={participant}
            isCurrentUser={false}
            isMainView={false}
            callType={callType}
            localStream={localStream}
          />
        ))}
      </div>
    )
  }

  // Speaker layout
  if (layout === 'speaker') {
    const mainSpeaker = allParticipants.find(p => p.isSpeaking) || 
                        allParticipants[0] || 
                        currentUser
    const otherParticipants = allParticipants.filter(p => p.id !== mainSpeaker?.id)
    
    // Add current user to thumbnails if not the main speaker
    if (currentUser && mainSpeaker?.id !== currentUser.id) {
      otherParticipants.unshift(currentUser)
    }

    return (
      <div className={cn("flex flex-col h-full", className)}>
        {/* Main Speaker */}
        {mainSpeaker && (
          <div className="flex-1 mb-4">
            <ParticipantVideo
              participant={mainSpeaker}
              isCurrentUser={mainSpeaker.id === currentUserId}
              isMainView={true}
              callType={callType}
              localStream={localStream}
            />
          </div>
        )}
        
        {/* Thumbnail Strip */}
        {otherParticipants.length > 0 && (
          <div className="h-24 flex gap-2 overflow-x-auto">
            {otherParticipants.map((participant) => (
              <div key={participant.id} className="w-32 h-24 flex-shrink-0">
                <ParticipantVideo
                  participant={participant}
                  isCurrentUser={participant.id === currentUserId}
                  isMainView={false}
                  callType={callType}
                  localStream={localStream}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Sidebar layout
  if (layout === 'sidebar') {
    const mainParticipant = allParticipants.find(p => p.isSpeaking) || 
                            allParticipants[0] || 
                            currentUser
    const otherParticipants = allParticipants.filter(p => p.id !== mainParticipant?.id)
    
    // Add current user to sidebar if not the main participant
    if (currentUser && mainParticipant?.id !== currentUser.id) {
      otherParticipants.unshift(currentUser)
    }

    return (
      <div className={cn("flex gap-4 h-full", className)}>
        {/* Main Video */}
        {mainParticipant && (
          <div className="flex-1">
            <ParticipantVideo
              participant={mainParticipant}
              isCurrentUser={mainParticipant.id === currentUserId}
              isMainView={true}
              callType={callType}
              localStream={localStream}
            />
          </div>
        )}
        
        {/* Sidebar Thumbnails */}
        {otherParticipants.length > 0 && (
          <div className="w-64 flex flex-col gap-2 overflow-y-auto">
            {otherParticipants.map((participant) => (
              <div key={participant.id} className="aspect-video">
                <ParticipantVideo
                  participant={participant}
                  isCurrentUser={participant.id === currentUserId}
                  isMainView={false}
                  callType={callType}
                  localStream={localStream}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}