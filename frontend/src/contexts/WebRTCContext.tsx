/**
 * WebRTC Context for P2P Video Calling
 * Handles peer connections, media streams, and signaling via WebSocket
 */

import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useAuth } from './AuthContext';

// ============================================================================
// TYPES
// ============================================================================

export interface MediaStreamState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenStream: MediaStream | null;
}

export interface CallState {
  callId: string | null;
  isInCall: boolean;
  isConnecting: boolean;
  isCaller: boolean;
  remoteUserId: string | null;
  remoteUserName: string | null;
  startedAt: Date | null;
  connectionState: RTCPeerConnectionState;
}

export interface MediaControls {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
}

export interface RemoteMediaState {
  userId: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
}

export interface IncomingCall {
  callId: string;
  from: string;
  fromName: string;
  fromAvatar?: string;
  offer: RTCSessionDescriptionInit;
}

interface WebRTCContextType {
  // State
  callState: CallState;
  mediaStreams: MediaStreamState;
  mediaControls: MediaControls;
  remoteMediaState: RemoteMediaState | null;
  incomingCall: IncomingCall | null;

  // Call actions
  startCall: (callId: string, remoteUserId: string, remoteUserName: string) => Promise<void>;
  answerCall: (callId: string, remoteUserId: string, remoteUserName: string) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => void;
  endCall: () => void;

  // Media controls
  toggleAudio: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;

  // Utility
  getCallDuration: () => number;
}

// ============================================================================
// CONTEXT
// ============================================================================

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within WebRTCProvider');
  }
  return context;
};

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket: websocketService, isConnected } = useWebSocket();
  const { user } = useAuth();

  // Get the actual socket.io instance from the service
  const socket = (websocketService as any)?.socket || websocketService;

  // ============================================================================
  // STATE
  // ============================================================================

  const [callState, setCallState] = useState<CallState>({
    callId: null,
    isInCall: false,
    isConnecting: false,
    isCaller: false,
    remoteUserId: null,
    remoteUserName: null,
    startedAt: null,
    connectionState: 'new',
  });

  const [mediaStreams, setMediaStreams] = useState<MediaStreamState>({
    localStream: null,
    remoteStream: null,
    screenStream: null,
  });

  const [mediaControls, setMediaControls] = useState<MediaControls>({
    isAudioEnabled: true,
    isVideoEnabled: true,
    isScreenSharing: false,
  });

  const [remoteMediaState, setRemoteMediaState] = useState<RemoteMediaState | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  // ============================================================================
  // REFS
  // ============================================================================

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<{ offer: RTCSessionDescriptionInit; from: string; callId: string } | null>(null);

  // ============================================================================
  // WEBRTC CONFIGURATION
  // ============================================================================

  const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  };

  // ============================================================================
  // PEER CONNECTION SETUP
  // ============================================================================

  const createPeerConnection = useCallback((callId: string, remoteUserId: string) => {
    console.log('🔗 [WebRTC] Creating peer connection for call:', callId);

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('🧊 [WebRTC] Sending ICE candidate to:', remoteUserId);
        socket.emit('video:ice-candidate', {
          candidate: event.candidate.toJSON(),
          to: remoteUserId,
          callId,
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('📡 [WebRTC] Connection state:', pc.connectionState);
      setCallState((prev) => ({
        ...prev,
        connectionState: pc.connectionState,
      }));

      if (pc.connectionState === 'connected') {
        console.log('✅ [WebRTC] Peer connection established!');
        setCallState((prev) => ({
          ...prev,
          isConnecting: false,
          isInCall: true,
          startedAt: new Date(),
        }));
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log('❌ [WebRTC] Connection failed or disconnected');
        // Auto-retry or cleanup
      }
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('🧊 [WebRTC] ICE connection state:', pc.iceConnectionState);
    };

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      console.log('📹 [WebRTC] Received remote track:', event.track.kind);
      const [remoteStream] = event.streams;
      setMediaStreams((prev) => ({
        ...prev,
        remoteStream,
      }));
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socket]);

  // ============================================================================
  // MEDIA STREAM MANAGEMENT
  // ============================================================================

  const getLocalMediaStream = useCallback(async () => {
    try {
      console.log('🎥 [WebRTC] Requesting local media stream...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log('✅ [WebRTC] Local media stream obtained');
      localStreamRef.current = stream;
      setMediaStreams((prev) => ({
        ...prev,
        localStream: stream,
      }));

      return stream;
    } catch (error) {
      console.error('❌ [WebRTC] Failed to get local media:', error);
      throw new Error('Failed to access camera/microphone. Please check permissions.');
    }
  }, []);

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
      setMediaStreams((prev) => ({
        ...prev,
        localStream: null,
      }));
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      screenStreamRef.current = null;
      setMediaStreams((prev) => ({
        ...prev,
        screenStream: null,
      }));
      setMediaControls((prev) => ({
        ...prev,
        isScreenSharing: false,
      }));
    }
  }, []);

  // ============================================================================
  // CALL INITIATION (CALLER)
  // ============================================================================

  const startCall = useCallback(
    async (callId: string, remoteUserId: string, remoteUserName: string) => {
      console.log('📞 [WebRTC] startCall called with:', { callId, remoteUserId, remoteUserName });
      console.log('📡 [WebRTC] Socket status:', { hasSocket: !!socket, isConnected, socketType: typeof socket });

      if (!isConnected) {
        console.error('❌ [WebRTC] WebSocket not connected');
        throw new Error('WebSocket not connected. Please refresh the page.');
      }

      if (!socket) {
        console.error('❌ [WebRTC] Socket instance not available');
        throw new Error('WebSocket not initialized. Please refresh the page.');
      }

      try {
        console.log('📞 [WebRTC] Starting call:', { callId, remoteUserId, remoteUserName });

        setCallState({
          callId,
          isInCall: false,
          isConnecting: true,
          isCaller: true,
          remoteUserId,
          remoteUserName,
          startedAt: null,
          connectionState: 'new',
        });

        // Get local media
        const localStream = await getLocalMediaStream();

        // Create peer connection
        const pc = createPeerConnection(callId, remoteUserId);

        // Add local tracks to peer connection
        localStream.getTracks().forEach((track) => {
          console.log('➕ [WebRTC] Adding local track to peer connection:', track.kind);
          pc.addTrack(track, localStream);
        });

        // Create and send offer
        console.log('📤 [WebRTC] Creating offer...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        console.log('📤 [WebRTC] Sending offer to:', remoteUserId);
        socket.emit('video:offer', {
          offer: pc.localDescription?.toJSON(),
          to: remoteUserId,
          callId,
          fromName: remoteUserName, // Send caller name for incoming call modal
        });

        // Join call room for notifications
        socket.emit('video:join-call', {
          callId,
          roomName: `call:${callId}`,
        });
      } catch (error) {
        console.error('❌ [WebRTC] Start call failed:', error);
        setCallState((prev) => ({
          ...prev,
          isConnecting: false,
        }));
        throw error;
      }
    },
    [socket, isConnected, getLocalMediaStream, createPeerConnection]
  );

  // ============================================================================
  // CALL ANSWERING (RECEIVER)
  // ============================================================================

  const answerCall = useCallback(
    async (callId: string, remoteUserId: string, remoteUserName: string) => {
      console.log('📞 [WebRTC] answerCall called with:', { callId, remoteUserId, remoteUserName });
      console.log('📡 [WebRTC] Socket status:', { hasSocket: !!socket, isConnected });

      if (!isConnected) {
        console.error('❌ [WebRTC] WebSocket not connected');
        throw new Error('WebSocket not connected. Please refresh the page.');
      }

      if (!socket) {
        console.error('❌ [WebRTC] Socket instance not available');
        throw new Error('WebSocket not initialized. Please refresh the page.');
      }

      try {
        console.log('📞 [WebRTC] Answering call:', { callId, remoteUserId, remoteUserName });

        setCallState({
          callId,
          isInCall: false,
          isConnecting: true,
          isCaller: false,
          remoteUserId,
          remoteUserName,
          startedAt: null,
          connectionState: 'new',
        });

        // Get local media
        const localStream = await getLocalMediaStream();

        // Create peer connection
        const pc = createPeerConnection(callId, remoteUserId);

        // Add local tracks to peer connection
        localStream.getTracks().forEach((track) => {
          console.log('➕ [WebRTC] Adding local track to peer connection:', track.kind);
          pc.addTrack(track, localStream);
        });

        // Join call room for notifications
        socket.emit('video:join-call', {
          callId,
          roomName: `call:${callId}`,
        });

        console.log('✅ [WebRTC] Ready to receive offer');
      } catch (error) {
        console.error('❌ [WebRTC] Answer call failed:', error);
        setCallState((prev) => ({
          ...prev,
          isConnecting: false,
        }));
        throw error;
      }
    },
    [socket, isConnected, getLocalMediaStream, createPeerConnection]
  );

  // ============================================================================
  // CALL TERMINATION
  // ============================================================================

  const endCall = useCallback(() => {
    console.log('📴 [WebRTC] Ending call');

    // Notify remote peer
    if (socket && callState.callId && callState.remoteUserId) {
      socket.emit('video:leave-call', {
        callId: callState.callId,
        roomName: `call:${callState.callId}`,
      });
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop all media streams
    stopLocalStream();
    stopScreenShare();

    // Reset state
    setCallState({
      callId: null,
      isInCall: false,
      isConnecting: false,
      isCaller: false,
      remoteUserId: null,
      remoteUserName: null,
      startedAt: null,
      connectionState: 'closed',
    });

    setMediaStreams({
      localStream: null,
      remoteStream: null,
      screenStream: null,
    });

    setMediaControls({
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
    });

    setRemoteMediaState(null);

    console.log('✅ [WebRTC] Call ended and cleaned up');
  }, [socket, callState.callId, callState.remoteUserId, stopLocalStream, stopScreenShare]);

  // ============================================================================
  // MEDIA CONTROLS
  // ============================================================================

  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const newState = audioTrack.enabled;

      setMediaControls((prev) => ({
        ...prev,
        isAudioEnabled: newState,
      }));

      // Notify remote peer
      if (socket && callState.callId) {
        socket.emit('video:toggle-audio', {
          callId: callState.callId,
          roomName: `call:${callState.callId}`,
          enabled: newState,
        });
      }

      console.log(`🎤 [WebRTC] Audio ${newState ? 'enabled' : 'muted'}`);
    }
  }, [socket, callState.callId]);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const newState = videoTrack.enabled;

      setMediaControls((prev) => ({
        ...prev,
        isVideoEnabled: newState,
      }));

      // Notify remote peer
      if (socket && callState.callId) {
        socket.emit('video:toggle-video', {
          callId: callState.callId,
          roomName: `call:${callState.callId}`,
          enabled: newState,
        });
      }

      console.log(`📹 [WebRTC] Video ${newState ? 'enabled' : 'disabled'}`);
    }
  }, [socket, callState.callId]);

  const startScreenShare = useCallback(async () => {
    if (!peerConnectionRef.current) return;

    try {
      console.log('🖥️ [WebRTC] Starting screen share...');

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      } as any); // Cursor option not in TS types but supported by browsers

      screenStreamRef.current = screenStream;
      setMediaStreams((prev) => ({
        ...prev,
        screenStream,
      }));

      // Replace video track with screen track
      const screenTrack = screenStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current
        .getSenders()
        .find((s) => s.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

      setMediaControls((prev) => ({
        ...prev,
        isScreenSharing: true,
      }));

      // Notify remote peer
      if (socket && callState.callId) {
        socket.emit('video:screen-share-started', {
          callId: callState.callId,
          roomName: `call:${callState.callId}`,
        });
      }

      // Handle when user stops sharing via browser UI
      screenTrack.onended = () => {
        stopScreenShare();
      };

      console.log('✅ [WebRTC] Screen share started');
    } catch (error) {
      console.error('❌ [WebRTC] Screen share failed:', error);
      throw error;
    }
  }, [socket, callState.callId]);

  const stopScreenShareInternal = useCallback(async () => {
    if (!peerConnectionRef.current || !localStreamRef.current) return;

    console.log('🖥️ [WebRTC] Stopping screen share...');

    // Replace screen track with camera track
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    const sender = peerConnectionRef.current
      .getSenders()
      .find((s) => s.track?.kind === 'video');

    if (sender && videoTrack) {
      await sender.replaceTrack(videoTrack);
    }

    // Stop screen stream
    stopScreenShare();

    // Notify remote peer
    if (socket && callState.callId) {
      socket.emit('video:screen-share-stopped', {
        callId: callState.callId,
        roomName: `call:${callState.callId}`,
      });
    }

    console.log('✅ [WebRTC] Screen share stopped');
  }, [socket, callState.callId, stopScreenShare]);

  // ============================================================================
  // INCOMING CALL NOTIFICATION
  // ============================================================================

  // Listen for incoming call offers - auto-prepare to receive
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleIncomingCallOffer = async (data: { offer: RTCSessionDescriptionInit; from: string; callId: string; fromName?: string }) => {
      console.log('📞 [WebRTC] Incoming call from:', data.from, 'Call ID:', data.callId);

      // If we're already in a call, reject
      if (callState.isInCall || callState.isConnecting) {
        console.log('⚠️ [WebRTC] Already in a call, ignoring incoming call');
        return;
      }

      // Store pending offer
      pendingOfferRef.current = data;

      // Show incoming call modal
      setIncomingCall({
        callId: data.callId,
        from: data.from,
        fromName: data.fromName || 'Unknown User',
        fromAvatar: undefined,
        offer: data.offer,
      });

      console.log('🔔 [WebRTC] Showing incoming call modal...');
    };

    socket.on('video:offer', handleIncomingCallOffer);

    return () => {
      socket.off('video:offer', handleIncomingCallOffer);
    };
  }, [socket, isConnected, callState.isInCall, callState.isConnecting]);

  // ============================================================================
  // WEBSOCKET EVENT HANDLERS
  // ============================================================================

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Handle incoming offer
    const handleOffer = async (data: { offer: RTCSessionDescriptionInit; from: string; callId: string }) => {
      console.log('📥 [WebRTC] Received offer from:', data.from);

      if (!peerConnectionRef.current) {
        console.warn('⚠️ [WebRTC] No peer connection when offer received');
        return;
      }

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        console.log('✅ [WebRTC] Remote description set');

        // Create answer
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        // Send answer back
        console.log('📤 [WebRTC] Sending answer to:', data.from);
        socket.emit('video:answer', {
          answer: peerConnectionRef.current.localDescription?.toJSON(),
          to: data.from,
          callId: data.callId,
        });
      } catch (error) {
        console.error('❌ [WebRTC] Failed to handle offer:', error);
      }
    };

    // Handle incoming answer
    const handleAnswer = async (data: { answer: RTCSessionDescriptionInit; from: string; callId: string }) => {
      console.log('📥 [WebRTC] Received answer from:', data.from);

      if (!peerConnectionRef.current) {
        console.warn('⚠️ [WebRTC] No peer connection when answer received');
        return;
      }

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('✅ [WebRTC] Remote description set from answer');
      } catch (error) {
        console.error('❌ [WebRTC] Failed to handle answer:', error);
      }
    };

    // Handle incoming ICE candidate
    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit; from: string; callId: string }) => {
      console.log('🧊 [WebRTC] Received ICE candidate from:', data.from);

      if (!peerConnectionRef.current) {
        console.warn('⚠️ [WebRTC] No peer connection when ICE candidate received');
        return;
      }

      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('✅ [WebRTC] ICE candidate added');
      } catch (error) {
        console.error('❌ [WebRTC] Failed to add ICE candidate:', error);
      }
    };

    // Handle remote user left
    const handleUserLeft = (data: { userId: string; callId: string }) => {
      console.log('👋 [WebRTC] Remote user left:', data.userId);
      if (data.callId === callState.callId) {
        endCall();
      }
    };

    // Handle remote media state changes
    const handleAudioToggled = (data: { userId: string; enabled: boolean }) => {
      console.log('🎤 [WebRTC] Remote user audio:', data.enabled ? 'enabled' : 'muted');
      setRemoteMediaState((prev) => (prev ? { ...prev, isAudioEnabled: data.enabled } : null));
    };

    const handleVideoToggled = (data: { userId: string; enabled: boolean }) => {
      console.log('📹 [WebRTC] Remote user video:', data.enabled ? 'enabled' : 'disabled');
      setRemoteMediaState((prev) => (prev ? { ...prev, isVideoEnabled: data.enabled } : null));
    };

    const handleScreenSharing = (data: { userId: string; sharing: boolean }) => {
      console.log('🖥️ [WebRTC] Remote user screen sharing:', data.sharing);
      setRemoteMediaState((prev) => (prev ? { ...prev, isScreenSharing: data.sharing } : null));
    };

    // Register event listeners
    socket.on('video:offer', handleOffer);
    socket.on('video:answer', handleAnswer);
    socket.on('video:ice-candidate', handleIceCandidate);
    socket.on('video:user-left', handleUserLeft);
    socket.on('video:audio-toggled', handleAudioToggled);
    socket.on('video:video-toggled', handleVideoToggled);
    socket.on('video:user-screen-sharing', handleScreenSharing);

    // Cleanup
    return () => {
      socket.off('video:offer', handleOffer);
      socket.off('video:answer', handleAnswer);
      socket.off('video:ice-candidate', handleIceCandidate);
      socket.off('video:user-left', handleUserLeft);
      socket.off('video:audio-toggled', handleAudioToggled);
      socket.off('video:video-toggled', handleVideoToggled);
      socket.off('video:user-screen-sharing', handleScreenSharing);
    };
  }, [socket, isConnected, callState.callId, createPeerConnection, endCall]);

  // ============================================================================
  // CLEANUP ON UNMOUNT
  // ============================================================================

  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      stopLocalStream();
      stopScreenShare();
    };
  }, [stopLocalStream, stopScreenShare]);

  // ============================================================================
  // INCOMING CALL ACTIONS
  // ============================================================================

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall || !pendingOfferRef.current) {
      console.warn('⚠️ [WebRTC] No incoming call to accept');
      return;
    }

    try {
      console.log('✅ [WebRTC] Accepting incoming call from:', incomingCall.from);

      // Answer the call with the stored offer data
      await answerCall(incomingCall.callId, incomingCall.from, incomingCall.fromName);

      // Process the pending offer now that peer connection is created
      if (peerConnectionRef.current && pendingOfferRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(pendingOfferRef.current.offer)
        );
        console.log('✅ [WebRTC] Remote description set from pending offer');

        // Create answer
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        // Send answer back
        console.log('📤 [WebRTC] Sending answer to:', pendingOfferRef.current.from);
        socket?.emit('video:answer', {
          answer: peerConnectionRef.current.localDescription?.toJSON(),
          to: pendingOfferRef.current.from,
          callId: pendingOfferRef.current.callId,
        });
      }

      // Clear incoming call state
      setIncomingCall(null);
      pendingOfferRef.current = null;
    } catch (error) {
      console.error('❌ [WebRTC] Failed to accept call:', error);
      setIncomingCall(null);
      pendingOfferRef.current = null;
      throw error;
    }
  }, [incomingCall, answerCall, socket]);

  const declineIncomingCall = useCallback(() => {
    console.log('❌ [WebRTC] Declining incoming call');

    // TODO: Notify caller that call was declined
    if (socket && incomingCall) {
      socket.emit('video:call-declined', {
        callId: incomingCall.callId,
        to: incomingCall.from,
      });
    }

    setIncomingCall(null);
    pendingOfferRef.current = null;
  }, [socket, incomingCall]);

  // ============================================================================
  // UTILITY
  // ============================================================================

  const getCallDuration = useCallback(() => {
    if (!callState.startedAt) return 0;
    return Math.floor((Date.now() - callState.startedAt.getTime()) / 1000);
  }, [callState.startedAt]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: WebRTCContextType = {
    callState,
    mediaStreams,
    mediaControls,
    remoteMediaState,
    incomingCall,
    startCall,
    answerCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare: stopScreenShareInternal,
    getCallDuration,
  };

  return <WebRTCContext.Provider value={value}>{children}</WebRTCContext.Provider>;
};
