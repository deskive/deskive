/**
 * Video Call WebSocket Hook
 * Manages WebSocket connection for video call events
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { getRingtone } from '@/utils/ringtone'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

// BroadcastChannel for cross-tab communication
const CALL_BROADCAST_CHANNEL = 'deskive-video-call-sync'

interface IncomingCallData {
  callId: string
  callType: 'audio' | 'video'
  isGroupCall: boolean
  from: {
    id: string
    name: string
    avatar?: string
  }
  participants?: string[]
  timestamp: string
}

interface CallDeclinedEvent {
  callId: string
  declinedBy: string
  declinedByName: string
  isGroupCall: boolean
  timestamp: string
}

// Cross-tab broadcast message types
interface CallBroadcastMessage {
  type: 'CALL_ACCEPTED' | 'CALL_DECLINED' | 'CALL_ENDED'
  callId: string
  timestamp: number
}

interface UseVideoCallSocketReturn {
  isConnected: boolean
  incomingCall: IncomingCallData | null
  callDeclinedEvent: CallDeclinedEvent | null
  clearIncomingCall: () => void
  declineCall: (callId: string, callerUserId: string) => void
  broadcastCallAccepted: (callId: string) => void
  broadcastCallDeclined: (callId: string) => void
}

export function useVideoCallSocket(): UseVideoCallSocketReturn {
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)
  const [callDeclinedEvent, setCallDeclinedEvent] = useState<CallDeclinedEvent | null>(null)

  // Ref to track current incoming call (for use in event handlers)
  const incomingCallRef = useRef<IncomingCallData | null>(null)

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null)
    incomingCallRef.current = null

    // Stop ringtone when clearing incoming call
    try {
      const ringtone = getRingtone()
      ringtone.stop()
    } catch (err) {
      // Ignore ringtone errors
    }
  }, [])

  // Broadcast call accepted to other tabs
  const broadcastCallAccepted = useCallback((callId: string) => {
    if (broadcastChannelRef.current) {
      const message: CallBroadcastMessage = {
        type: 'CALL_ACCEPTED',
        callId,
        timestamp: Date.now(),
      }
      broadcastChannelRef.current.postMessage(message)
      console.log('📢 [VideoCallSocket] Broadcasted CALL_ACCEPTED to other tabs:', callId)
    }
  }, [])

  // Broadcast call declined to other tabs
  const broadcastCallDeclined = useCallback((callId: string) => {
    if (broadcastChannelRef.current) {
      const message: CallBroadcastMessage = {
        type: 'CALL_DECLINED',
        callId,
        timestamp: Date.now(),
      }
      broadcastChannelRef.current.postMessage(message)
      console.log('📢 [VideoCallSocket] Broadcasted CALL_DECLINED to other tabs:', callId)
    }
  }, [])

  const declineCall = useCallback((callId: string, callerUserId: string) => {
    console.log('📵 [VideoCallSocket] Declining call:', callId, 'from caller:', callerUserId)
    if (socketRef.current?.connected) {
      socketRef.current.emit('call:decline', {
        callId,
        callerUserId,
      })
      console.log('✅ [VideoCallSocket] Call decline notification sent')
    } else {
      console.warn('⚠️ [VideoCallSocket] Socket not connected, cannot send decline notification')
    }
  }, [])

  // Set up BroadcastChannel for cross-tab communication
  useEffect(() => {
    // Create BroadcastChannel for cross-tab sync
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CALL_BROADCAST_CHANNEL)
      broadcastChannelRef.current = channel

      // Listen for messages from other tabs
      channel.onmessage = (event: MessageEvent<CallBroadcastMessage>) => {
        const { type, callId } = event.data
        console.log('📨 [VideoCallSocket] Received cross-tab message:', type, callId)

        const currentCall = incomingCallRef.current

        // If this message is about the current incoming call, clear it
        if (currentCall && currentCall.callId === callId) {
          console.log('🔄 [VideoCallSocket] Clearing incoming call from cross-tab sync:', callId)

          // Stop ringtone
          try {
            const ringtone = getRingtone()
            ringtone.stop()
            console.log('🔇 [VideoCallSocket] Ringtone stopped (cross-tab sync)')
          } catch (err) {
            // Ignore
          }

          // Clear state
          setIncomingCall(null)
          incomingCallRef.current = null

          // Show appropriate toast
          if (type === 'CALL_ACCEPTED') {
            toast.info('Call answered in another tab')
          } else if (type === 'CALL_DECLINED') {
            toast.info('Call declined in another tab')
          }
        }
      }

      console.log('✅ [VideoCallSocket] BroadcastChannel created for cross-tab sync')

      return () => {
        channel.close()
        broadcastChannelRef.current = null
        console.log('🔌 [VideoCallSocket] BroadcastChannel closed')
      }
    } else {
      console.warn('⚠️ [VideoCallSocket] BroadcastChannel not supported in this browser')
    }
  }, [])

  useEffect(() => {
    console.log('🔄 [VideoCallSocket] useEffect triggered, user:', user?.id)

    if (!user?.id) {
      console.warn('⚠️ [VideoCallSocket] No user ID, skipping connection')
      return
    }

    // Get JWT token from localStorage (stored as 'auth_token')
    const token = localStorage.getItem('auth_token')
    console.log('🔑 [VideoCallSocket] Token retrieved:', token ? '✅ Token exists' : '❌ No token')

    if (!token) {
      console.error('❌ [VideoCallSocket] No auth token found for WebSocket connection')
      return
    }

    console.log('🔌 [VideoCallSocket] Attempting to connect to:', `${API_URL}/video-calls`)

    // Connect to video calls namespace
    const socket = io(`${API_URL}/video-calls`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      console.log('✅ [VideoCallSocket] Connected to video calls WebSocket')
      console.log('🆔 [VideoCallSocket] Socket ID:', socket.id)
      console.log('👤 [VideoCallSocket] User ID:', user.id)
      setIsConnected(true)
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ [VideoCallSocket] Disconnected from video calls WebSocket')
      console.log('📋 [VideoCallSocket] Disconnect reason:', reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('❌ [VideoCallSocket] Connection error:', error)
      console.error('📋 [VideoCallSocket] Error details:', {
        message: error.message,
        type: error.name,
        token: token ? 'present' : 'missing',
        apiUrl: API_URL,
      })
      setIsConnected(false)
    })

    // Incoming call event
    socket.on('call:incoming', (data: IncomingCallData) => {
      console.log('📞 [VideoCallSocket] Incoming call event received!')
      console.log('📋 [VideoCallSocket] Call data:', JSON.stringify(data, null, 2))
      setIncomingCall(data)
      incomingCallRef.current = data

      // Play ringtone using Web Audio API
      try {
        const ringtone = getRingtone()
        ringtone.play()
        console.log('🔔 [VideoCallSocket] Ringtone started')
      } catch (err) {
        console.error('🔇 [VideoCallSocket] Failed to play ringtone:', err)
      }
    })

    // Call declined event (when receiver declines)
    socket.on('call:declined', (data: { callId: string; declinedBy: string; declinedByName: string; isGroupCall: boolean }) => {
      console.log('📵 [VideoCallSocket] Call declined event received!')
      console.log('📋 [VideoCallSocket] Decline data:', JSON.stringify(data, null, 2))

      // Show toast notification
      toast.info(`${data.declinedByName} declined the call`)

      // Set declined event to trigger redirect in VideoCallPage
      setCallDeclinedEvent({
        ...data,
        timestamp: new Date().toISOString(),
      })

      // Clear any incoming call state
      setIncomingCall(null)
      incomingCallRef.current = null

      // Stop ringtone if playing
      try {
        const ringtone = getRingtone()
        ringtone.stop()
        console.log('🔇 [VideoCallSocket] Ringtone stopped')
      } catch (err) {
        console.error('❌ [VideoCallSocket] Failed to stop ringtone:', err)
      }

      // Clear declined event after 5 seconds
      setTimeout(() => {
        setCallDeclinedEvent(null)
      }, 5000)
    })

    // Call ended event (when caller cancels before receiver picks up)
    socket.on('call:ended', (data: { callId: string; reason?: string }) => {
      console.log('🔚 [VideoCallSocket] Call ended event received!')
      console.log('📋 [VideoCallSocket] End data:', JSON.stringify(data, null, 2))

      // Check if this is the incoming call that was just cancelled
      const currentIncomingCall = incomingCallRef.current
      if (currentIncomingCall && currentIncomingCall.callId === data.callId) {
        console.log('📵 [VideoCallSocket] Incoming call was cancelled by caller')

        // Show toast notification
        const reason = data.reason || 'Call cancelled'
        toast.info(reason)

        // Clear incoming call state
        setIncomingCall(null)
        incomingCallRef.current = null

        // Stop ringtone if playing
        try {
          const ringtone = getRingtone()
          ringtone.stop()
          console.log('🔇 [VideoCallSocket] Ringtone stopped (call ended)')
        } catch (err) {
          console.error('❌ [VideoCallSocket] Failed to stop ringtone:', err)
        }
      }
    })

    // Debug: Log all events
    socket.onAny((eventName, ...args) => {
      console.log('📨 [VideoCallSocket] Event received:', eventName, args)
    })

    console.log('✅ [VideoCallSocket] Socket setup complete, listening for events')

    // Cleanup
    return () => {
      console.log('🔌 [VideoCallSocket] Cleanup: Disconnecting video calls WebSocket')
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)

      // Stop ringtone if playing
      try {
        const ringtone = getRingtone()
        ringtone.stop()
        console.log('🔇 [VideoCallSocket] Ringtone stopped on cleanup')
      } catch (err) {
        console.error('❌ [VideoCallSocket] Failed to stop ringtone on cleanup:', err)
      }
    }
  }, [user?.id])

  return {
    isConnected,
    incomingCall,
    callDeclinedEvent,
    clearIncomingCall,
    declineCall,
    broadcastCallAccepted,
    broadcastCallDeclined,
  }
}
