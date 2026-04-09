/**
 * IncomingCallModal Component - Incoming call notification
 * Clean React+Vite+TypeScript implementation
 */

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Users,
  Mic,
  MicOff
} from 'lucide-react'
import { toast } from 'sonner'
import type { IncomingCallModalProps } from '@/types/video'

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  onAccept,
  onDecline,
  callInvitation
}) => {
  const [ringDuration, setRingDuration] = useState(0)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isCameraEnabled, setIsCameraEnabled] = useState(true)

  // Ring timer
  useEffect(() => {
    if (!isOpen) {
      setRingDuration(0)
      // Reset media settings when modal closes
      setIsMicEnabled(true)
      setIsCameraEnabled(true)
      return
    }

    const interval = setInterval(() => {
      setRingDuration(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen])

  // Auto decline after 30 seconds
  useEffect(() => {
    if (!isOpen) return

    const timeout = setTimeout(() => {
      onDecline()
      toast.error('Call missed - no answer')
    }, 30000)

    return () => clearTimeout(timeout)
  }, [isOpen, onDecline])

  // Format ring duration
  const formatRingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen || !callInvitation) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-white shadow-2xl w-96 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <Avatar className="w-24 h-24 ring-4 ring-green-500 ring-opacity-50 animate-pulse">
              <AvatarImage src={callInvitation.callerAvatar} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl">
                {callInvitation.callerName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            {callInvitation.callType === 'video' && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-2">
                <Video className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          
          <h2 className="text-2xl font-semibold mt-4 mb-2">
            {callInvitation.callerName}
          </h2>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge 
              variant="outline" 
              className={cn(
                "text-sm",
                callInvitation.callType === 'video' 
                  ? "bg-green-500/20 text-green-300 border-green-500/30"
                  : "bg-blue-500/20 text-blue-300 border-blue-500/30"
              )}
            >
              {callInvitation.callType === 'video' ? (
                <>
                  <Video className="h-3 w-3 mr-1" />
                  Video Call
                </>
              ) : (
                <>
                  <Phone className="h-3 w-3 mr-1" />
                  Audio Call
                </>
              )}
            </Badge>
            
            {callInvitation.isGroupCall && (
              <Badge variant="outline" className="text-sm">
                <Users className="h-3 w-3 mr-1" />
                Group Call
              </Badge>
            )}
          </div>

          <p className="text-sm text-gray-400">
            {callInvitation.isGroupCall 
              ? `${callInvitation.participants?.length || 1} participants`
              : 'Incoming call'
            }
          </p>

          {/* Ring Duration */}
          <div className="mt-4 text-lg font-mono text-green-400">
            {formatRingTime(ringDuration)}
          </div>
        </div>

        {/* Group Call Participants Preview */}
        {callInvitation.isGroupCall && callInvitation.participants && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-3 text-center">
              Also joining:
            </p>
            <div className="flex justify-center gap-2">
              {callInvitation.participants.slice(0, 3).map((participant) => (
                <Avatar key={participant.id} className="w-10 h-10 ring-2 ring-gray-600">
                  <AvatarImage src={participant.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white text-xs">
                    {participant.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              ))}
              {callInvitation.participants.length > 3 && (
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-xs text-gray-300 ring-2 ring-gray-600">
                  +{callInvitation.participants.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Media Controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* Microphone Toggle */}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setIsMicEnabled(!isMicEnabled)
              toast.info(isMicEnabled ? 'Microphone will be off' : 'Microphone will be on')
            }}
            className={cn(
              "rounded-full p-4 h-14 w-14 transition-all",
              isMicEnabled
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            )}
            title={isMicEnabled ? 'Turn off microphone' : 'Turn on microphone'}
          >
            {isMicEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>

          {/* Camera Toggle (for video calls only) */}
          {callInvitation.callType === 'video' && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                setIsCameraEnabled(!isCameraEnabled)
                toast.info(isCameraEnabled ? 'Camera will be off' : 'Camera will be on')
              }}
              className={cn(
                "rounded-full p-4 h-14 w-14 transition-all",
                isCameraEnabled
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              )}
              title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isCameraEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-8">
          {/* Decline Button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={onDecline}
            className="rounded-full p-6 h-16 w-16 bg-red-600 hover:bg-red-700 text-white border-none"
            title="Decline call"
          >
            <PhoneOff className="h-8 w-8" />
          </Button>

          {/* Accept Button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              // For audio calls, force camera to be disabled
              const finalCameraEnabled = callInvitation.callType === 'video' ? isCameraEnabled : false;

              // Build join message based on media settings
              const messages: string[] = []
              if (!isMicEnabled) messages.push('microphone off')
              if (callInvitation.callType === 'video' && !finalCameraEnabled) messages.push('camera off')

              if (messages.length > 0) {
                toast.info(`Joining call with ${messages.join(' and ')}`)
              } else {
                toast.success('Joining call...')
              }

              // Pass media settings to parent component
              onAccept({ micEnabled: isMicEnabled, cameraEnabled: finalCameraEnabled })
            }}
            className="rounded-full p-6 h-16 w-16 bg-green-600 hover:bg-green-700 text-white border-none animate-pulse"
            title="Accept call"
          >
            {callInvitation.callType === 'video' ? (
              <Video className="h-8 w-8" />
            ) : (
              <Phone className="h-8 w-8" />
            )}
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-400">
          <button 
            onClick={() => toast.info('Quick reply feature coming soon')}
            className="hover:text-white transition-colors"
          >
            Quick Reply
          </button>
          <span>•</span>
          <button 
            onClick={() => toast.info('Callback feature coming soon')}
            className="hover:text-white transition-colors"
          >
            Call Back Later
          </button>
        </div>

        {/* Auto decline warning */}
        {ringDuration > 20 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-red-400 animate-pulse">
              Call will end in {30 - ringDuration} seconds
            </p>
          </div>
        )}
      </div>

      {/* Background pulse animation */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-green-500/5 animate-pulse" />
      </div>
    </div>
  )
}