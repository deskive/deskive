/**
 * WebRTC Call Wrapper
 * Bridges the existing VideoCallStore with new WebRTC Context
 */

import React, { useEffect } from 'react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { useVideoCallStore } from '@/stores/videoCallStore';
import { WebRTCVideoCall } from './WebRTCVideoCall';
import { IncomingCallModal } from './IncomingCallModal';

export const WebRTCCallWrapper: React.FC = () => {
  const {
    callState: webRTCState,
    incomingCall,
    startCall,
    answerCall,
    acceptIncomingCall,
    declineIncomingCall
  } = useWebRTC();
  const {
    isCallActive,
    callId,
    currentUserId,
    participants,
    callType,
    leaveCall: storeLeaveCall
  } = useVideoCallStore();

  // Sync WebRTC context with videoCallStore
  useEffect(() => {
    // If videoCallStore says there's an active call, but WebRTC context isn't initialized
    if (isCallActive && callId && !webRTCState.isInCall && !webRTCState.isConnecting) {
      // Get the remote participant (the one that's not current user)
      const remoteParticipant = participants.find(p => p.id !== currentUserId || p.user_id !== currentUserId);

      if (remoteParticipant) {
        const remoteUserId = remoteParticipant.id || remoteParticipant.user_id || '';
        const remoteUserName = remoteParticipant.name || 'Unknown User';

        console.log('🔄 [WebRTC Wrapper] Syncing call state:', {
          callId,
          remoteUserId,
          remoteUserName,
          isCaller: participants[0]?.id === currentUserId || participants[0]?.user_id === currentUserId
        });

        // Determine if we're the caller (first participant) or answerer
        const isCaller = participants[0]?.id === currentUserId || participants[0]?.user_id === currentUserId;

        if (isCaller) {
          startCall(callId, remoteUserId, remoteUserName);
        } else {
          answerCall(callId, remoteUserId, remoteUserName);
        }
      }
    }
  }, [isCallActive, callId, currentUserId, participants, webRTCState.isInCall, webRTCState.isConnecting, startCall, answerCall]);

  return (
    <>
      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          isOpen={!!incomingCall}
          callInvitation={{
            id: incomingCall.callId,
            callerId: incomingCall.from,
            callerName: incomingCall.fromName,
            callerAvatar: incomingCall.fromAvatar,
            callType: 'video',
            timestamp: Date.now(),
            isGroupCall: false,
            participants: [],
          }}
          onAccept={acceptIncomingCall}
          onDecline={declineIncomingCall}
        />
      )}

      {/* Active Call UI */}
      {(webRTCState.isInCall || webRTCState.isConnecting) && (
        <WebRTCVideoCall
          callId={webRTCState.callId || callId || ''}
          remoteUserId={webRTCState.remoteUserId || ''}
          remoteUserName={webRTCState.remoteUserName || 'Unknown User'}
          onEndCall={storeLeaveCall}
        />
      )}
    </>
  );
};
