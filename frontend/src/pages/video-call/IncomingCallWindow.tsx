/**
 * Incoming Call Notification Window
 * Opens as a popup window to show incoming call notifications
 * Works even when main app tab is inactive
 */

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video, Mic, MicOff, Camera, CameraOff } from 'lucide-react';
import { getRingtone } from '@/utils/ringtone';
import { io, Socket } from 'socket.io-client';

// BroadcastChannel for cross-tab communication (same as in useVideoCallSocket)
const CALL_BROADCAST_CHANNEL = 'deskive-video-call-sync';

export function IncomingCallWindow() {
  const [searchParams] = useSearchParams();
  const callId = searchParams.get('callId');
  const workspaceId = searchParams.get('workspaceId');
  const callerName = searchParams.get('callerName') || 'Unknown Caller';
  const callerAvatar = searchParams.get('callerAvatar') || '';
  const callType = searchParams.get('callType') as 'audio' | 'video' || 'video';
  const isGroupCall = searchParams.get('isGroupCall') === 'true';

  const [autoCloseTimer, setAutoCloseTimer] = useState(45); // 45 seconds auto-decline
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(callType === 'video');
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Set up BroadcastChannel for cross-tab communication
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CALL_BROADCAST_CHANNEL);
      broadcastChannelRef.current = channel;

      // Listen for messages from other tabs (e.g., if call was answered/declined elsewhere)
      channel.onmessage = (event) => {
        const { type, callId: eventCallId } = event.data;
        console.log('📨 [IncomingCallWindow] Received cross-tab message:', type, eventCallId);

        // If this is our call being handled elsewhere, close this window
        if (eventCallId === callId && (type === 'CALL_ACCEPTED' || type === 'CALL_DECLINED')) {
          console.log('🔄 [IncomingCallWindow] Call handled in another tab, closing window');

          // Stop ringtone
          try {
            const ringtone = getRingtone();
            ringtone.stop();
          } catch (err) {
            // Ignore
          }

          // Close this window
          window.close();
        }
      };

      console.log('✅ [IncomingCallWindow] BroadcastChannel set up for cross-tab sync');

      return () => {
        channel.close();
        broadcastChannelRef.current = null;
      };
    }
  }, [callId]);

  // Auto-close timer
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoCloseTimer((prev) => {
        if (prev <= 1) {
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleAccept();
      } else if (e.key === 'Escape') {
        handleDecline();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [micEnabled, cameraEnabled]);

  // Play ringtone using Web Audio API
  useEffect(() => {
    try {
      const ringtone = getRingtone();
      ringtone.play();
      console.log('🔔 [IncomingCallWindow] Ringtone started');
    } catch (err) {
      console.error('🔇 [IncomingCallWindow] Failed to play ringtone:', err);
    }

    return () => {
      try {
        const ringtone = getRingtone();
        ringtone.stop();
        console.log('🔇 [IncomingCallWindow] Ringtone stopped on unmount');
      } catch (err) {
        console.error('❌ [IncomingCallWindow] Failed to stop ringtone:', err);
      }
    };
  }, []);

  // Listen for call:ended event (when caller cancels)
  useEffect(() => {
    if (!callId) return;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    const token = localStorage.getItem('auth_token');

    if (!token) {
      console.warn('⚠️ [IncomingCallWindow] No auth token found');
      return;
    }

    // Connect to video calls namespace
    const socket: Socket = io(`${API_URL}/video-calls`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    // Listen for call ended event
    socket.on('call:ended', (data: { callId: string; reason?: string }) => {
      console.log('🔚 [IncomingCallWindow] Call ended event received:', data);

      if (data.callId === callId) {
        console.log('📵 [IncomingCallWindow] This call was cancelled by caller');

        // Stop ringtone
        try {
          const ringtone = getRingtone();
          ringtone.stop();
        } catch (err) {
          console.error('❌ Failed to stop ringtone:', err);
        }

        // Close the window
        window.close();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [callId]);

  // Show browser notification
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Incoming ${callType} call from ${callerName}`, {
        icon: callerAvatar || 'https://cdn.deskive.com/deskive/logo.png',
        body: isGroupCall ? 'Group call' : 'Direct call',
        tag: callId || 'incoming-call',
      });
    }
  }, [callId, callerName, callerAvatar, callType, isGroupCall]);

  const handleAccept = () => {
    console.log('✅ [IncomingCallWindow] Accepting call with settings:', { micEnabled, cameraEnabled });

    // Stop ringtone
    try {
      const ringtone = getRingtone();
      ringtone.stop();
      console.log('🔇 [IncomingCallWindow] Ringtone stopped on accept');
    } catch (err) {
      console.error('❌ [IncomingCallWindow] Failed to stop ringtone:', err);
    }

    // Broadcast to all tabs that call was accepted
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'CALL_ACCEPTED',
        callId,
        timestamp: Date.now(),
      });
      console.log('📢 [IncomingCallWindow] Broadcasted CALL_ACCEPTED to all tabs');
    }

    // Send accept message to main window (opener)
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'CALL_ACCEPTED',
        callId,
        workspaceId,
        settings: { micEnabled, cameraEnabled },
      }, window.location.origin);
    }

    // Open call in new window
    const callUrl = `/call/${workspaceId}/${callId}`;
    const windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no';
    window.open(callUrl, `video-call-${callId}`, windowFeatures);

    // Close this notification window
    window.close();
  };

  const handleDecline = () => {
    console.log('❌ [IncomingCallWindow] Declining call');

    // Stop ringtone
    try {
      const ringtone = getRingtone();
      ringtone.stop();
      console.log('🔇 [IncomingCallWindow] Ringtone stopped on decline');
    } catch (err) {
      console.error('❌ [IncomingCallWindow] Failed to stop ringtone:', err);
    }

    // Broadcast to all tabs that call was declined
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'CALL_DECLINED',
        callId,
        timestamp: Date.now(),
      });
      console.log('📢 [IncomingCallWindow] Broadcasted CALL_DECLINED to all tabs');
    }

    // Send decline message to main window (opener)
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'CALL_DECLINED',
        callId,
        workspaceId,
      }, window.location.origin);
    }

    // Close this notification window
    window.close();
  };

  if (!callId || !workspaceId) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid Call</h1>
          <p className="text-gray-400">Call information is missing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600">
      <div className="w-full max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-2xl">
        {/* Caller Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
              <AvatarImage src={callerAvatar} alt={callerName} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-4xl">
                {callerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Call type indicator */}
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
              {callType === 'video' ? (
                <Video className="h-6 w-6 text-teal-600" />
              ) : (
                <Phone className="h-6 w-6 text-emerald-600" />
              )}
            </div>
          </div>

          {/* Caller Info */}
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{callerName}</h2>
          <p className="text-gray-600">
            {isGroupCall ? 'Group ' : ''}
            {callType === 'video' ? 'Video' : 'Audio'} call
          </p>
        </div>

        {/* Media Controls (only shown for video calls) */}
        {callType === 'video' && (
          <div className="flex justify-center gap-4 mb-6">
            <Button
              variant={micEnabled ? 'default' : 'destructive'}
              size="icon"
              className="rounded-full h-12 w-12"
              onClick={() => setMicEnabled(!micEnabled)}
            >
              {micEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant={cameraEnabled ? 'default' : 'destructive'}
              size="icon"
              className="rounded-full h-12 w-12"
              onClick={() => setCameraEnabled(!cameraEnabled)}
            >
              {cameraEnabled ? (
                <Camera className="h-5 w-5" />
              ) : (
                <CameraOff className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}

        {/* Call Actions */}
        <div className="flex gap-4 mb-4">
          <Button
            onClick={handleDecline}
            variant="destructive"
            size="lg"
            className="flex-1 rounded-full h-14"
          >
            <PhoneOff className="h-5 w-5 mr-2" />
            Decline
          </Button>

          <Button
            onClick={handleAccept}
            className="flex-1 rounded-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            size="lg"
          >
            <Phone className="h-5 w-5 mr-2" />
            Accept
          </Button>
        </div>

        {/* Auto-decline timer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Auto-declining in <span className="font-semibold text-gray-700">{autoCloseTimer}s</span>
          </p>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            Press <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">Enter</kbd> to accept or <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">Esc</kbd> to decline
          </p>
        </div>
      </div>
    </div>
  );
}
