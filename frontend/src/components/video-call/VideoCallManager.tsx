/**
 * Video Call Manager - Global call management component
 * Handles call state, WebSocket integration, and UI coordination
 */

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useVideoCallStore } from '@/stores/videoCallStore'
import { videoCallService } from '@/lib/api/video-call-api'
import { VideoCallInterface } from './VideoCallInterface'
import { Button } from '@/components/ui/button'
import { PhoneCall, PhoneOff, Video } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface IncomingCall {
  callId: string
  from: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  type: 'audio' | 'video'
  isGroupCall: boolean
}

interface VideoCallManagerProps {
  userId: string
  userName: string
}

function IncomingCallModal({ 
  incomingCall, 
  onAccept, 
  onDecline 
}: { 
  incomingCall: IncomingCall
  onAccept: () => void
  onDecline: () => void
}) {
  const [callDuration, setCallDuration] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 max-w-sm mx-4 text-center shadow-xl">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={incomingCall.from.avatar} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                {incomingCall.from.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <h3 className="text-lg font-semibold mb-1">{incomingCall.from.name}</h3>
          <p className="text-gray-600 text-sm mb-2">
            Incoming {incomingCall.type} call
            {incomingCall.isGroupCall && ' (Group)'}
          </p>
          
          <div className="text-xs text-gray-500">
            {Math.floor(callDuration / 60).toString().padStart(2, '0')}:
            {(callDuration % 60).toString().padStart(2, '0')}
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Button
            variant="destructive"
            size="lg"
            onClick={onDecline}
            className="rounded-full h-14 w-14"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          
          <Button
            size="lg"
            onClick={onAccept}
            className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600"
          >
            {incomingCall.type === 'video' ? (
              <Video className="h-6 w-6" />
            ) : (
              <PhoneCall className="h-6 w-6" />
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          {incomingCall.type === 'video' ? 'Video call' : 'Voice call'} • 
          {incomingCall.isGroupCall ? ' Group' : ' Direct'}
        </p>
      </div>
    </div>
  )
}

export function VideoCallManager({ 
  userId, 
  userName
}: VideoCallManagerProps) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const { 
    isCallActive,
    callId: _callId,
    initializeCall 
  } = useVideoCallStore()

  // Initialize call manager
  useEffect(() => {
    if (!isInitialized && userId && userName) {
      const initialize = async () => {
        try {
          const tempCallId = `session-${userId}-${Date.now()}`
          await initializeCall(tempCallId, userId, userName)
          setIsInitialized(true)

          // DEMO CODE DISABLED: Mock incoming call simulation
          // In production, incoming calls would come from WebSocket
          // Uncomment the code below to enable demo incoming calls
          /*
          setTimeout(() => {
            if (Math.random() > 0.7) { // 30% chance of incoming call for demo
              simulateIncomingCall()
            }
          }, 10000 + Math.random() * 20000) // 10-30 seconds
          */
        } catch (error) {
          console.error('Failed to initialize video call manager:', error)
          toast.error('Failed to initialize video calling')
        }
      }

      initialize()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userName, isInitialized])

  // TODO: Incoming calls should be handled via WebSocket in production
  // Demo/simulation code has been removed

  // Accept incoming call
  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall) return

    try {
      const { joinCall } = useVideoCallStore.getState()
      await joinCall(incomingCall.callId, userId, userName)
      
      setIncomingCall(null)
      toast.success(`${incomingCall.type} call connected`)
    } catch (error) {
      console.error('Failed to accept call:', error)
      toast.error('Failed to join call')
      setIncomingCall(null)
    }
  }, [incomingCall, userId, userName])

  // Decline incoming call
  const handleDeclineCall = useCallback(() => {
    if (incomingCall) {
      setIncomingCall(null)
      toast.info('Call declined')
    }
  }, [incomingCall])

  // Handle call quality monitoring
  useEffect(() => {
    if (!isCallActive) return

    const checkCallQuality = () => {
      // In a real implementation, this would check actual WebRTC stats
      const state = useVideoCallStore.getState()
      const mockQuality = {
        sessionId: state.callId || 'mock-session',
        participantId: state.currentUserId || 'mock-participant',
        bandwidth: {
          upload: Math.floor(Math.random() * 1000) + 500, // 500-1500 kbps
          download: Math.floor(Math.random() * 2000) + 1000 // 1000-3000 kbps
        },
        latency: Math.floor(Math.random() * 100) + 50, // 50-150ms
        packetLoss: Math.random() * 2, // 0-2%
        quality: 'good' as const
      }

      // Only update if there's a significant change to avoid unnecessary re-renders
      const currentQuality = state.callQuality
      const hasSignificantChange = !currentQuality ||
        Math.abs((currentQuality.bandwidth?.upload || 0) - mockQuality.bandwidth.upload) > 200 ||
        Math.abs((currentQuality.latency || 0) - mockQuality.latency) > 30

      if (hasSignificantChange) {
        useVideoCallStore.getState().updateCallQuality(mockQuality)
      }
    }

    // Check quality immediately, then every 10 seconds (reduced frequency)
    checkCallQuality()
    const interval = setInterval(checkCallQuality, 10000)
    return () => clearInterval(interval)
  }, [isCallActive])

  // Handle network issues simulation (disabled by default for production)
  useEffect(() => {
    if (!isCallActive) return

    // DEMO CODE: Uncomment to enable network issue simulation
    /*
    const simulateNetworkIssues = () => {
      const issues = [
        'High latency detected',
        'Bandwidth fluctuation',
        'Temporary connection instability'
      ]

      if (Math.random() > 0.95) { // 5% chance per check (reduced from 10%)
        const randomIssue = issues[Math.floor(Math.random() * issues.length)]
        useVideoCallStore.getState().addNetworkIssue(randomIssue)

        // Clear after a few seconds
        setTimeout(() => {
          useVideoCallStore.getState().clearNetworkIssues()
        }, 5000)
      }
    }

    const interval = setInterval(simulateNetworkIssues, 20000) // Check every 20s (reduced frequency)
    return () => clearInterval(interval)
    */
  }, [isCallActive])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const state = useVideoCallStore.getState()
      if (state.isCallActive) {
        state.leaveCall()
      }
      // Clean up video call service if needed
    }
     
  }, [])

  return (
    <>
      {/* Active Call Interface */}
      {isCallActive && <VideoCallInterface />}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          incomingCall={incomingCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}
    </>
  )
}

export default VideoCallManager