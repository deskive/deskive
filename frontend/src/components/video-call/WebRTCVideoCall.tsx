/**
 * WebRTC Video Call Component
 * Simple P2P video calling using WebRTC
 */

import React, { useRef, useEffect, useState } from 'react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebRTCVideoCallProps {
  callId: string;
  remoteUserId: string;
  remoteUserName: string;
  onEndCall?: () => void;
  className?: string;
}

export const WebRTCVideoCall: React.FC<WebRTCVideoCallProps> = ({
  callId,
  remoteUserId,
  remoteUserName,
  onEndCall,
  className,
}) => {
  const {
    callState,
    mediaStreams,
    mediaControls,
    remoteMediaState,
    endCall,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    getCallDuration,
  } = useWebRTC();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [duration, setDuration] = useState(0);

  // Update local video element
  useEffect(() => {
    if (localVideoRef.current && mediaStreams.localStream) {
      localVideoRef.current.srcObject = mediaStreams.localStream;
    }
  }, [mediaStreams.localStream]);

  // Update remote video element
  useEffect(() => {
    if (remoteVideoRef.current && mediaStreams.remoteStream) {
      remoteVideoRef.current.srcObject = mediaStreams.remoteStream;
    }
  }, [mediaStreams.remoteStream]);

  // Update screen share on local video
  useEffect(() => {
    if (localVideoRef.current && mediaStreams.screenStream) {
      localVideoRef.current.srcObject = mediaStreams.screenStream;
    } else if (localVideoRef.current && !mediaStreams.screenStream && mediaStreams.localStream) {
      localVideoRef.current.srcObject = mediaStreams.localStream;
    }
  }, [mediaStreams.screenStream, mediaStreams.localStream]);

  // Call duration timer
  useEffect(() => {
    if (!callState.isInCall) return;

    const interval = setInterval(() => {
      setDuration(getCallDuration());
    }, 1000);

    return () => clearInterval(interval);
  }, [callState.isInCall, getCallDuration]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    endCall();
    onEndCall?.();
  };

  const handleToggleScreenShare = async () => {
    if (mediaControls.isScreenSharing) {
      stopScreenShare();
    } else {
      try {
        await startScreenShare();
      } catch (error) {
        console.error('Screen share failed:', error);
      }
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-gray-900 rounded-lg p-4 shadow-xl w-80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">
                Call with {remoteUserName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(false)}
              className="text-white hover:bg-white/20"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-gray-400 text-xs">{formatDuration(duration)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('fixed inset-0 z-50 bg-gray-900', className)}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                {remoteUserName.split(' ').map((n) => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-white font-medium">{remoteUserName}</h3>
              <p className="text-gray-300 text-sm">
                {callState.connectionState === 'connected' ? formatDuration(duration) : 'Connecting...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  callState.connectionState === 'connected' && 'bg-green-500 animate-pulse',
                  callState.connectionState === 'connecting' && 'bg-yellow-500 animate-pulse',
                  callState.connectionState === 'failed' && 'bg-red-500'
                )}
              />
              <span className="text-white text-sm capitalize">{callState.connectionState}</span>
            </div>

            {/* Minimize Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="text-white hover:bg-white/20"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Remote Video (Main/Large) */}
        <div className="absolute inset-0">
          {mediaStreams.remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center">
                <Avatar className="w-32 h-32 mx-auto mb-4">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-4xl">
                    {remoteUserName.split(' ').map((n) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-white text-lg font-medium">{remoteUserName}</p>
                <p className="text-gray-400 text-sm mt-1">
                  {remoteMediaState?.isVideoEnabled === false ? 'Camera off' : 'Connecting...'}
                </p>
              </div>
            </div>
          )}

          {/* Remote user muted indicator */}
          {remoteMediaState && !remoteMediaState.isAudioEnabled && (
            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
              <MicOff className="h-4 w-4" />
              <span className="text-sm">Muted</span>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-20 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden shadow-xl border-2 border-white/20">
          {mediaStreams.localStream && mediaControls.isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl">
                  You
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Local muted indicator */}
          {!mediaControls.isAudioEnabled && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <MicOff className="h-3 w-3" />
              Muted
            </div>
          )}
        </div>
      </div>

      {/* Call Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-center gap-4">
          {/* Toggle Audio */}
          <Button
            size="lg"
            onClick={toggleAudio}
            className={cn(
              'rounded-full h-14 w-14',
              !mediaControls.isAudioEnabled
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-700 hover:bg-gray-600'
            )}
          >
            {mediaControls.isAudioEnabled ? (
              <Mic className="h-6 w-6 text-white" />
            ) : (
              <MicOff className="h-6 w-6 text-white" />
            )}
          </Button>

          {/* Toggle Video */}
          <Button
            size="lg"
            onClick={toggleVideo}
            className={cn(
              'rounded-full h-14 w-14',
              !mediaControls.isVideoEnabled
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-700 hover:bg-gray-600'
            )}
          >
            {mediaControls.isVideoEnabled ? (
              <Video className="h-6 w-6 text-white" />
            ) : (
              <VideoOff className="h-6 w-6 text-white" />
            )}
          </Button>

          {/* End Call */}
          <Button
            size="lg"
            onClick={handleEndCall}
            className="rounded-full h-16 w-16 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="h-7 w-7 text-white" />
          </Button>

          {/* Screen Share */}
          <Button
            size="lg"
            onClick={handleToggleScreenShare}
            className={cn(
              'rounded-full h-14 w-14',
              mediaControls.isScreenSharing
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-gray-700 hover:bg-gray-600'
            )}
          >
            {mediaControls.isScreenSharing ? (
              <MonitorOff className="h-6 w-6 text-white" />
            ) : (
              <Monitor className="h-6 w-6 text-white" />
            )}
          </Button>
        </div>

        {/* Call Info */}
        <div className="text-center mt-4 text-white text-sm">
          {callState.isConnecting && 'Connecting...'}
          {callState.connectionState === 'connected' && `Call duration: ${formatDuration(duration)}`}
          {callState.connectionState === 'failed' && 'Connection failed'}
        </div>
      </div>
    </div>
  );
};
