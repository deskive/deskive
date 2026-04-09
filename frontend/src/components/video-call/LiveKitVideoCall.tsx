/**
 * LiveKit Video Call Component
 * Uses LiveKit for professional video conferencing through deskive backend
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { videoCallApi } from '@/lib/api/video-call-api';
import {
  Loader2,
  Sparkles,
  X,
  Circle,
  Square,
  Link,
  Check,
  UserPlus,
  Mic,
  Brain,
  FileText,
  CheckSquare,
  Copy,
  FileDown,
  StickyNote,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSummarize } from '@/lib/api/ai-api';
import { notesApi } from '@/lib/api/notes-api';
import { useParams } from 'react-router-dom';
import { JoinRequestModal } from './JoinRequestModal';
import { JoinRequestList } from './JoinRequestNotification';
import type { JoinRequest } from './types';
import { useAuth } from '@/contexts/AuthContext';
import { InvitePeopleModal } from './InvitePeopleModal';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/lib/config';
import { useTranscription } from '@/hooks/useTranscription';

interface LiveKitVideoCallProps {
  callId: string;
  onDisconnect?: () => void;
  className?: string;
}

export const LiveKitVideoCall: React.FC<LiveKitVideoCallProps> = ({
  callId,
  onDisconnect,
  className,
}) => {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [isTogglingRecording, setIsTogglingRecording] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Join request states
  const [showJoinRequestModal, setShowJoinRequestModal] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [socketConnection, setSocketConnection] = useState<Socket | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Use ref to track authorization status to prevent modal flashing
  const isAuthorizedRef = useRef<boolean | null>(null);

  // Get media settings from sessionStorage (set by IncomingCallModal)
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  // Get workspace ID and auth context
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();

  // Transcription state
  const [isCaptionsEnabled, setIsCaptionsEnabled] = useState(false);

  // AI Panel state
  const [activeTab, setActiveTab] = useState('live');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [localSummary, setLocalSummary] = useState<{
    summary: string;
    keyPoints: string[];
    actionItems: string[];
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mutations
  const summarizeMutation = useSummarize();

  // Transcription hook
  const {
    isTranscribing,
    transcripts,
    startTranscription,
    stopTranscription,
  } = useTranscription({
    callId,
    enabled: isCaptionsEnabled,
  });

  // Handle captions toggle (no toast notifications)
  const handleToggleCaptions = async () => {
    console.log('[CC] Toggle captions, current state:', isCaptionsEnabled);
    if (!isCaptionsEnabled) {
      setIsCaptionsEnabled(true);
      const success = await startTranscription();
      console.log('[CC] Start transcription result:', success);
      if (!success) {
        setIsCaptionsEnabled(false);
      }
    } else {
      setIsCaptionsEnabled(false);
      await stopTranscription();
    }
  };

  // Auto-scroll transcripts
  useEffect(() => {
    if (autoScroll && scrollRef.current && transcripts.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, autoScroll]);

  // Format timestamp for transcripts
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // AI Summary generation
  const handleGenerateSummary = async () => {
    if (transcripts.length === 0) return;
    setIsGeneratingSummary(true);
    try {
      const fullText = transcripts.map(t => `${t.speakerName}: ${t.text}`).join('\n');
      const result = await summarizeMutation.mutateAsync({
        content: fullText,
        summary_type: 'executive_summary',
        content_type: 'meeting_transcript',
        length: 'medium',
        include_action_items: true,
      });
      if (result.summary) {
        const actionItems: string[] = [];
        let summaryText = result.summary;
        const actionMatch = summaryText.match(/\*\*Action Items:?\*\*\s*([\s\S]*?)$/i);
        if (actionMatch) {
          const numberedItems = actionMatch[1].match(/\d+\.\s*([^0-9]+?)(?=\d+\.|$)/g);
          if (numberedItems) {
            numberedItems.forEach(item => {
              const cleanItem = item.replace(/^\d+\.\s*/, '').trim();
              if (cleanItem.length > 5) actionItems.push(cleanItem);
            });
          }
          summaryText = summaryText.replace(/\*\*Action Items:?\*\*[\s\S]*$/, '').trim();
        }
        summaryText = summaryText.replace(/\*\*Executive Summary\*\*\s*/gi, '').replace(/\*\*/g, '').trim();
        setLocalSummary({ summary: summaryText, keyPoints: [], actionItems });
        toast.success('Summary generated!');
      }
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Export handlers
  const generateExportContent = (format: 'text' | 'markdown') => {
    let content = '';
    if (format === 'markdown') {
      content += `# Meeting Notes\n\n`;
      if (localSummary) {
        content += `## Summary\n${localSummary.summary}\n\n`;
        if (localSummary.actionItems.length > 0) {
          content += `## Action Items\n`;
          localSummary.actionItems.forEach(item => content += `- [ ] ${item}\n`);
          content += '\n';
        }
      }
      content += `## Transcript\n`;
      transcripts.forEach(t => content += `**${formatTime(t.timestamp)} - ${t.speakerName}:** ${t.text}\n\n`);
    } else {
      content += `MEETING NOTES\n\n`;
      if (localSummary) {
        content += `SUMMARY\n${localSummary.summary}\n\n`;
      }
      content += `TRANSCRIPT\n`;
      transcripts.forEach(t => content += `[${formatTime(t.timestamp)}] ${t.speakerName}: ${t.text}\n`);
    }
    return content;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportText = () => {
    const content = generateExportContent('text');
    downloadFile(content, `meeting-${callId.slice(0, 8)}.txt`, 'text/plain');
    toast.success('Exported as text');
  };

  const handleExportMarkdown = () => {
    const content = generateExportContent('markdown');
    downloadFile(content, `meeting-${callId.slice(0, 8)}.md`, 'text/markdown');
    toast.success('Exported as markdown');
  };

  const handleCopy = () => {
    const content = generateExportContent('text');
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const handleSaveToNotes = async () => {
    if (!workspaceId) {
      toast.error('Workspace not found');
      return;
    }
    try {
      const content = generateExportContent('markdown');
      await notesApi.createNote(workspaceId, {
        title: `Meeting Notes - ${new Date().toLocaleDateString()}`,
        content,
      });
      toast.success('Saved to Notes!');
    } catch (error) {
      toast.error('Failed to save to Notes');
    }
  };

  useEffect(() => {
    // Check for saved media settings
    const savedSettings = sessionStorage.getItem('callMediaSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        console.log('📹 [LiveKitVideoCall] Retrieved media settings:', settings);
        setMicEnabled(settings.micEnabled ?? true);
        setCameraEnabled(settings.cameraEnabled ?? true);
        // Clear the settings after reading
        sessionStorage.removeItem('callMediaSettings');
      } catch (err) {
        console.error('Failed to parse media settings:', err);
      }
    }
  }, []);

  useEffect(() => {
    const joinCall = async () => {
      console.log('🎬 [Join Flow Started] Initial state:', {
        showJoinRequestModal,
        hasCheckedAuth,
        userId: user?.id,
      });

      // CRITICAL: Wait for user to be loaded before proceeding
      if (!user?.id) {
        console.log('⏳ [Join Flow] Waiting for user to be loaded...');
        return;
      }

      // Declare variables outside try block so they're accessible in catch
      let inviteesList: string[] = [];

      try {
        setIsLoading(true);
        setError(null);

        // First, get call details to check if user is host or invited
        const callDetails = await videoCallApi.getCall(callId);
        const userIsHost = callDetails.host_user_id === user?.id;
        setIsHost(userIsHost);

        // Check if user is in the invitees list (includes host + invited participants)
        // Handle both array and potential JSON string formats
        if (Array.isArray(callDetails.invitees)) {
          inviteesList = callDetails.invitees;
        } else if (typeof callDetails.invitees === 'string') {
          try {
            inviteesList = JSON.parse(callDetails.invitees);
          } catch (e) {
            console.error('Failed to parse invitees:', e);
          }
        }

        const isInvited = inviteesList.includes(user?.id || '');

        // Debug logging
        console.log('📋 [Join Check]', {
          userId: user?.id,
          hostId: callDetails.host_user_id,
          userIsHost,
          inviteesRaw: callDetails.invitees,
          inviteesList,
          isInvited,
        });

        // Allow automatic join if:
        // 1. User is the host, OR
        // 2. User is in the invitees list (was directly invited)
        // Otherwise, show join request modal
        if (!userIsHost && !isInvited) {
          console.log('🚫 User not invited or host - showing join request modal');
          isAuthorizedRef.current = false;
          setHasCheckedAuth(true);
          setShowJoinRequestModal(true);
          setIsLoading(false);
          return;
        }

        console.log('✅ User is authorized (host or invited) - joining automatically');
        console.log('🔒 Modal will NOT be shown - user is authorized');

        // CRITICAL: For authorized users, mark in ref and NEVER show the modal
        isAuthorizedRef.current = true;
        setShowJoinRequestModal(false);
        setHasCheckedAuth(true);

        // Call Deskive backend to join the call
        // Backend uses deskive SDK to generate LiveKit token
        const response = await videoCallApi.joinCall(callId, {});

        console.log('Join call response:', response);

        if (!response.token || !response.room_url) {
          throw new Error('Invalid response from server: missing token or room_url');
        }

        setToken(response.token);
        setServerUrl(response.room_url);
        setRoomName(response.room_name || callId);

        // Set call type from response
        const responseCallType = response.call?.call_type || 'video';
        setCallType(responseCallType);
        console.log('📹 [LiveKitVideoCall] Call type:', responseCallType);

        // For audio calls, force camera to be disabled
        if (responseCallType === 'audio') {
          console.log('🎤 [LiveKitVideoCall] Audio call detected - disabling camera');
          setCameraEnabled(false);
        }

        console.log('[Call] Connected to video call');
      } catch (err: any) {
        console.error('❌ Failed to join call:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response,
          status: err.response?.status,
        });

        // Only show join request modal if explicitly unauthorized (403)
        // AND we haven't already determined the user is authorized
        const is403Error = err.response?.status === 403;
        const hasAuthError = err.message?.includes('not invited') ||
          err.message?.includes('not authorized') ||
          err.message?.includes('forbidden');

        if (is403Error || hasAuthError) {
          // Double-check: if user IS the host or invited, this is a different error
          if (isHost || inviteesList.includes(user?.id || '')) {
            console.error('⚠️ User is authorized but got auth error - this is a bug');
            setHasCheckedAuth(true);
            setShowJoinRequestModal(false); // Ensure modal doesn't show
            setError('Failed to connect to video call. Please try again.');
            console.error('[Call] Connection failed - please refresh and try again');
          } else {
            console.log('🚫 Auth error and user not authorized - showing join request modal');
            setHasCheckedAuth(true);
            setShowJoinRequestModal(true);
          }
          setIsLoading(false);
          return;
        }

        setError(err.message || 'Failed to join video call');
        console.error('[Call] Failed to join video call');
      } finally {
        setIsLoading(false);
      }
    };

    joinCall();
  }, [callId, user?.id]);

  const handleDisconnected = async () => {
    try {
      // Notify backend that we left the call
      await videoCallApi.leaveCall(callId);
      console.log('[Call] Left video call');
    } catch (err) {
      console.error('Failed to leave call:', err);
    }

    if (onDisconnect) {
      onDisconnect();
    }
  };

  const handleToggleRecording = async () => {
    // Prevent double-clicks
    if (isTogglingRecording) return;

    try {
      setIsTogglingRecording(true);

      if (isRecording && recordingId) {
        // Optimistically update UI before API call
        const prevRecordingId = recordingId;
        setIsRecording(false);
        setRecordingId(null);

        try {
          // Stop recording
          await videoCallApi.stopRecording(callId, prevRecordingId);
          console.log('[Call] Recording stopped');
        } catch (err) {
          // Revert optimistic update on error
          setIsRecording(true);
          setRecordingId(prevRecordingId);
          throw err;
        }
      } else {
        // Optimistically update UI before API call
        setIsRecording(true);

        try {
          // Start recording
          const recording = await videoCallApi.startRecording(callId, {});
          setRecordingId(recording.id);
          console.log('[Call] Recording started');
        } catch (err) {
          // Revert optimistic update on error
          setIsRecording(false);
          setRecordingId(null);
          throw err;
        }
      }
    } catch (err: any) {
      console.error('Failed to toggle recording:', err);

      // Show a more user-friendly error message
      const errorMessage = err.message || 'Failed to toggle recording';
      if (errorMessage.includes('not currently available') || errorMessage.includes('does not support')) {
        console.error('[Call] Recording feature is not available yet');
      } else {
        console.error('[Call Error]', errorMessage);
      }
    } finally {
      setIsTogglingRecording(false);
    }
  };

  const handleCopyRoomLink = () => {
    // Construct the full room URL with workspace ID
    // Add ?popup=true to force opening in new window
    const roomUrl = `${window.location.origin}/call/${workspaceId}/${callId}`;

    navigator.clipboard.writeText(roomUrl).then(() => {
      setLinkCopied(true);
      console.log('[Call] Room link copied');

      // Reset the copied state after 3 seconds
      setTimeout(() => {
        setLinkCopied(false);
      }, 3000);
    }).catch((err) => {
      console.error('[Call] Failed to copy link:', err);
    });
  };

  // Handle join request submission
  const handleRequestJoin = async (displayName: string, message: string) => {
    try {
      // IMPORTANT: Connect to WebSocket BEFORE sending request
      // This ensures we don't miss the acceptance event if host accepts very quickly
      const socketController = setupRequesterWebSocket();

      const response = await videoCallApi.requestJoin(callId, { display_name: displayName, message });
      setShowJoinRequestModal(false);
      console.log('[Call] Join request sent');

      // Show a waiting state
      setIsLoading(true);

      // Set the request ID so the WebSocket listeners can match the response
      socketController.setRequestId(response.request_id);
    } catch (err: any) {
      console.error('[Call] Failed to send join request:', err);
    }
  };

  // Setup WebSocket connection for requester to wait for response
  const setupRequesterWebSocket = () => {
    console.log('🔌 [Requester WebSocket] Connecting to wait for response...');

    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('❌ [Requester WebSocket] No auth token found');
      throw new Error('No auth token found');
    }

    // Connect to WebSocket
    const socket = io(`${API_CONFIG.baseUrl}/video-calls`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      auth: { token },
      extraHeaders: { Authorization: `Bearer ${token}` },
    });

    socket.on('connect', () => {
      console.log('✅ [Requester WebSocket] Connected');
    });

    // Use a ref to store request ID that can be updated after socket creation
    let currentRequestId: string | null = null;

    // Listen for request accepted
    socket.on('join-request:accepted', (data: { call_id: string; request_id: string; message: string }) => {
      console.log('✅ [Requester] Join request accepted!', data);

      if (data.request_id === currentRequestId) {
        console.log('[Call] Request accepted, joining...');

        // Disconnect WebSocket
        socket.disconnect();

        // Reload the page to re-trigger the join flow
        // This time the user will be in the invitees list
        window.location.reload();
      }
    });

    // Listen for request rejected
    socket.on('join-request:rejected', (data: { call_id: string; request_id: string; message: string }) => {
      console.log('❌ [Requester] Join request rejected', data);

      if (data.request_id === currentRequestId) {
        console.log('[Call] Request rejected');

        // Disconnect WebSocket
        socket.disconnect();

        // Close the page or redirect
        setIsLoading(false);
        setError('Your request to join was rejected by the host.');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [Requester WebSocket] Connection error:', error.message);
    });

    // Return socket with method to set request ID
    return {
      setRequestId: (id: string) => {
        currentRequestId = id;
        console.log('📝 [Requester WebSocket] Request ID set:', id);
      },
      disconnect: () => socket.disconnect(),
    };
  };

  // Fetch pending join requests (for host reconnection safety)
  const fetchPendingJoinRequests = async () => {
    try {
      console.log('🔄 [Join Requests] Fetching pending requests for call:', callId);
      const pendingRequests = await videoCallApi.getJoinRequests(callId);

      if (pendingRequests && pendingRequests.length > 0) {
        console.log(`✅ [Join Requests] Found ${pendingRequests.length} pending request(s)`);

        // Add pending requests to state, avoiding duplicates
        setJoinRequests((prev) => {
          const existingIds = new Set(prev.map(req => req.id));
          const newRequests = pendingRequests
            .filter(req => !existingIds.has(req.id))
            .map(req => ({
              id: req.id,
              user_id: req.user_id,
              display_name: req.display_name,
              message: req.message,
              avatar: undefined, // API doesn't return avatar, will use fallback
              timestamp: req.requested_at,
            }));

          if (newRequests.length > 0) {
            console.log(`📥 [Join Requests] Adding ${newRequests.length} new request(s) to state`);
          }

          return [...prev, ...newRequests];
        });
      } else {
        console.log('✅ [Join Requests] No pending requests found');
      }
    } catch (err: any) {
      console.error('❌ [Join Requests] Failed to fetch pending requests:', err);
      // Don't show error to user as this is a background safety check
    }
  };

  // Debug: Track modal state changes
  useEffect(() => {
    console.log('📊 [Modal State]', {
      hasCheckedAuth,
      showJoinRequestModal,
      isHost,
      willRenderModal: hasCheckedAuth && showJoinRequestModal,
    });
  }, [hasCheckedAuth, showJoinRequestModal, isHost]);

  // WebSocket connection for real-time join requests
  useEffect(() => {
    if (!isHost || !callId) {
      return;
    }

    console.log('🔌 [WebSocket] Connecting to video-calls namespace...');

    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('❌ [WebSocket] No auth token found');
      return;
    }

    // Connect to the video-calls WebSocket namespace with auth
    const socket = io(`${API_CONFIG.baseUrl}/video-calls`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      auth: {
        token,
      },
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    socket.on('connect', () => {
      console.log('✅ [WebSocket] Connected to video-calls namespace');
      // Join the call room to receive notifications
      socket.emit('call:join', { callId });

      // IMPORTANT: Fetch any pending join requests that may have been sent while host was offline
      // This handles the corner case where host disconnects and someone sends a join request
      fetchPendingJoinRequests();
    });

    socket.on('disconnect', () => {
      console.log('❌ [WebSocket] Disconnected from video-calls namespace');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [WebSocket] Connection error:', error.message);
    });

    // Listen for join request events (match backend event names)
    socket.on('join-request:new', (data: { call_id: string; request: JoinRequest }) => {
      console.log('🔔 [WebSocket] New join request received:', data);
      setJoinRequests((prev) => {
        // Avoid duplicates
        if (prev.some(req => req.id === data.request.id)) {
          return prev;
        }
        return [...prev, data.request];
      });
      console.log(`[Call] ${data.request.display_name} wants to join`);
    });

    // Listen for accepted join request
    socket.on('join-request:accepted', (data: { call_id: string; request_id: string; message: string }) => {
      console.log('✅ [WebSocket] Join request accepted:', data.request_id);
      setJoinRequests((prev) => prev.filter(req => req.id !== data.request_id));
    });

    // Listen for rejected join request
    socket.on('join-request:rejected', (data: { call_id: string; request_id: string; message: string }) => {
      console.log('❌ [WebSocket] Join request rejected:', data.request_id);
      setJoinRequests((prev) => prev.filter(req => req.id !== data.request_id));
    });

    setSocketConnection(socket);

    return () => {
      console.log('🔌 [WebSocket] Cleaning up connection');
      socket.disconnect();
      setSocketConnection(null);
    };
  }, [isHost, callId]);

  // Handle accept join request
  const handleAcceptJoinRequest = async (requestId: string) => {
    try {
      await videoCallApi.acceptJoinRequest(callId, requestId);
      setJoinRequests((prev) => prev.filter((req) => req.id !== requestId));
      console.log('[Call] Join request accepted');
    } catch (err: any) {
      console.error('[Call] Failed to accept join request:', err);
    }
  };

  // Handle reject join request
  const handleRejectJoinRequest = async (requestId: string) => {
    try {
      await videoCallApi.rejectJoinRequest(callId, requestId);
      setJoinRequests((prev) => prev.filter((req) => req.id !== requestId));
      console.log('[Call] Join request rejected');
    } catch (err: any) {
      console.error('[Call] Failed to reject join request:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg">Connecting to video call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center max-w-md">
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-red-500 mb-2">Connection Failed</h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user needs to request access, show the modal with a background
  if (!token || !serverUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg">Checking access...</p>
        </div>

        {/* Join Request Modal - ONLY show if user is confirmed unauthorized */}
        {hasCheckedAuth && showJoinRequestModal && isAuthorizedRef.current === false ? (
          <JoinRequestModal
            isOpen={true}
            onClose={() => {
              setShowJoinRequestModal(false);
              if (onDisconnect) onDisconnect();
            }}
            onRequestJoin={handleRequestJoin}
            callType={callType}
            roomName={roomName}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('h-screen relative', className)}>
      <LiveKitRoom
        video={callType === 'video' ? cameraEnabled : false}
        audio={micEnabled ? {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        } : false}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={handleDisconnected}
        data-lk-theme="default"
        style={{ height: '100%' }}
      >
        <div className="flex h-full relative">
          {/* Main video conference UI with controls */}
          <div className={cn('w-full', showAIPanel && 'mr-96')}>
            <VideoConference />
          </div>

          {/* AI Meeting Panel - Embedded */}
          {showAIPanel && (
            <div className="absolute right-0 top-0 bottom-0 w-96 bg-gray-900 text-white border-l border-gray-700 z-50 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  <h3 className="text-sm font-medium">AI Meeting Assistant</h3>
                  {isTranscribing && (
                    <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                      <Mic className="h-3 w-3 mr-1" />
                      Live
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIPanel(false)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Tab Buttons */}
                <div className="grid grid-cols-4 gap-2 mx-3 my-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('live')}
                    className={cn(
                      "text-xs h-9",
                      activeTab === 'live'
                        ? "bg-green-600 hover:bg-green-500"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    )}
                  >
                    <Mic className="h-3 w-3 mr-1" />
                    Live
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('summary')}
                    className={cn(
                      "text-xs h-9",
                      activeTab === 'summary'
                        ? "bg-purple-600 hover:bg-purple-500"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    )}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Summary
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('actions')}
                    className={cn(
                      "text-xs h-9",
                      activeTab === 'actions'
                        ? "bg-blue-600 hover:bg-blue-500"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    )}
                  >
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Actions
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('insights')}
                    className={cn(
                      "text-xs h-9",
                      activeTab === 'insights'
                        ? "bg-orange-600 hover:bg-orange-500"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    )}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Insights
                  </Button>
                </div>

                {/* Live Tab */}
                <TabsContent value="live" className="flex-1 mt-0 flex flex-col min-h-0 overflow-hidden data-[state=inactive]:hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 flex-shrink-0">
                    <span className="text-xs text-gray-400">{transcripts.length} segments</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Auto-scroll</span>
                      <Switch checked={autoScroll} onCheckedChange={setAutoScroll} className="scale-75" />
                    </div>
                  </div>
                  <div
                    className="overflow-y-auto overflow-x-hidden"
                    ref={scrollRef}
                    style={{ flex: '1 1 auto', minHeight: 0 }}
                  >
                    {transcripts.length > 0 ? (
                      <div className="space-y-2 px-3 py-2">
                        {transcripts.map((transcript, index) => (
                          <div key={transcript.id || index} className="max-w-full">
                            <div className="flex items-start gap-2">
                              <div className="text-xs text-gray-500 min-w-[65px] flex-shrink-0">
                                {formatTime(transcript.timestamp)}
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="text-xs font-medium text-blue-400 mb-0.5 truncate">
                                  {transcript.speakerName}
                                </div>
                                <p
                                  className="text-sm text-gray-200"
                                  style={{
                                    wordBreak: 'break-word',
                                    overflowWrap: 'anywhere',
                                    whiteSpace: 'pre-wrap'
                                  }}
                                >
                                  {transcript.text}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-4">
                        <div className="flex flex-col items-center text-center">
                          <Mic className="h-10 w-10 text-green-500 mb-2" />
                          <p className="text-sm text-green-400">Listening...</p>
                          <p className="text-xs text-gray-500 mt-1">Speak to see transcription</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Summary Tab */}
                <TabsContent value="summary" className="flex-1 mt-0 flex flex-col min-h-0 overflow-hidden data-[state=inactive]:hidden">
                  <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
                    {isGeneratingSummary ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 text-purple-500 animate-spin mb-2" />
                        <p className="text-xs text-gray-400">Generating summary...</p>
                      </div>
                    ) : localSummary ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                          <h4 className="text-sm font-medium text-purple-300 mb-2">Summary</h4>
                          <p className="text-sm text-gray-200">{localSummary.summary}</p>
                        </div>
                        {localSummary.actionItems.length > 0 && (
                          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-300 mb-2">Action Items</h4>
                            <ul className="space-y-1">
                              {localSummary.actionItems.map((item, i) => (
                                <li key={i} className="text-sm text-gray-200 flex items-start gap-2">
                                  <CheckSquare className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-4">
                        <FileText className="h-10 w-10 text-gray-600 mb-2" />
                        <p className="text-sm text-gray-400 mb-2">No summary yet</p>
                        {transcripts.length > 0 && (
                          <Button
                            size="sm"
                            onClick={handleGenerateSummary}
                            className="bg-purple-600 hover:bg-purple-700 mt-2"
                          >
                            <Brain className="h-4 w-4 mr-2" />
                            Generate Summary
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Actions Tab */}
                <TabsContent value="actions" className="flex-1 mt-0 flex flex-col min-h-0 overflow-hidden data-[state=inactive]:hidden">
                  <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
                    {localSummary?.actionItems && localSummary.actionItems.length > 0 ? (
                      <div className="space-y-2">
                        {localSummary.actionItems.map((item, i) => (
                          <div key={i} className="p-3 bg-gray-800/50 rounded-lg">
                            <div className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded border-2 border-gray-500 mt-0.5" />
                              <p className="text-sm text-gray-200 flex-1">{item}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-4">
                        <CheckSquare className="h-10 w-10 text-gray-600 mb-2" />
                        <p className="text-sm text-gray-400">No action items yet</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Insights Tab */}
                <TabsContent value="insights" className="flex-1 mt-0 flex flex-col min-h-0 overflow-hidden data-[state=inactive]:hidden">
                  <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">Segments</div>
                          <div className="text-lg font-medium">{transcripts.length}</div>
                        </div>
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">Words</div>
                          <div className="text-lg font-medium">
                            {transcripts.reduce((acc, t) => acc + t.text.split(' ').length, 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Footer - Export buttons */}
              <div className="p-3 border-t border-gray-700 bg-gray-900 space-y-2 flex-shrink-0">
                {isTranscribing && (
                  <div className="flex items-center justify-center gap-2 py-2 px-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-400">Live transcription active</span>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    size="sm"
                    onClick={handleCopy}
                    disabled={transcripts.length === 0}
                    className="text-xs flex flex-col items-center gap-1 h-auto py-2 bg-gray-700 hover:bg-gray-600"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="text-[10px]">Copy</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExportText}
                    disabled={transcripts.length === 0}
                    className="text-xs flex flex-col items-center gap-1 h-auto py-2 bg-blue-600 hover:bg-blue-500"
                  >
                    <FileDown className="h-4 w-4" />
                    <span className="text-[10px]">Text</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExportMarkdown}
                    disabled={transcripts.length === 0}
                    className="text-xs flex flex-col items-center gap-1 h-auto py-2 bg-purple-600 hover:bg-purple-500"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="text-[10px]">MD</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveToNotes}
                    disabled={transcripts.length === 0}
                    className="text-xs flex flex-col items-center gap-1 h-auto py-2 bg-green-600 hover:bg-green-500"
                  >
                    <StickyNote className="h-4 w-4" />
                    <span className="text-[10px]">Notes</span>
                  </Button>
                </div>
                {transcripts.length > 0 && !localSummary && (
                  <Button
                    size="sm"
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isGeneratingSummary ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Generate AI Summary
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Control Buttons - Floating - White buttons for visibility */}
          <div className="absolute top-4 right-4 z-40 flex gap-2">
            {/* Invite Members Button - Only visible to host */}
            {isHost && (
              <Button
                size="lg"
                onClick={() => setShowInviteModal(true)}
                className="rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform cursor-pointer bg-white hover:bg-gray-100 text-green-600"
                title="Invite members to call"
              >
                <UserPlus className="h-5 w-5" />
              </Button>
            )}

            {/* Copy Room Link Button */}
            <Button
              size="lg"
              onClick={handleCopyRoomLink}
              className={cn(
                'rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform cursor-pointer',
                linkCopied
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-white hover:bg-gray-100 text-gray-700'
              )}
              title="Copy room link to invite others"
            >
              {linkCopied ? (
                <Check className="h-5 w-5" />
              ) : (
                <Link className="h-5 w-5" />
              )}
            </Button>

            {/* Recording Button */}
            <Button
              size="lg"
              onClick={handleToggleRecording}
              disabled={isTogglingRecording}
              className={cn(
                'rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform cursor-pointer',
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : 'bg-white hover:bg-gray-100 text-red-500',
                isTogglingRecording && 'opacity-50 cursor-not-allowed'
              )}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? (
                <Square className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5 fill-current" />
              )}
            </Button>

            {/* AI Meeting Assistant Button - Opens panel AND starts transcription */}
            <Button
              size="lg"
              onClick={async () => {
                const newShowAIPanel = !showAIPanel;
                setShowAIPanel(newShowAIPanel);
                // Auto-enable captions when opening AI panel
                if (newShowAIPanel && !isCaptionsEnabled) {
                  await handleToggleCaptions();
                }
              }}
              className={cn(
                'rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform cursor-pointer',
                showAIPanel
                  ? 'bg-purple-500 hover:bg-purple-600 text-white'
                  : 'bg-white hover:bg-gray-100 text-purple-600',
                isTranscribing && !showAIPanel && 'ring-2 ring-green-400'
              )}
              title={showAIPanel ? 'Close AI Assistant' : 'AI Meeting Assistant'}
            >
              {showAIPanel ? (
                <X className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Audio renderer for all participants */}
        <RoomAudioRenderer />
      </LiveKitRoom>

      {/* Join Request Notifications (for host) */}
      {isHost && joinRequests.length > 0 && (
        <JoinRequestList
          requests={joinRequests}
          onAccept={handleAcceptJoinRequest}
          onReject={handleRejectJoinRequest}
        />
      )}

      {/* Invite People Modal - Only for host */}
      {isHost && (
        <InvitePeopleModal
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
};

/**
 * Custom Video Grid Component (optional - for more control)
 */
export const CustomLiveKitVideoGrid: React.FC<LiveKitVideoCallProps> = ({
  callId,
  onDisconnect,
  className,
}) => {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');

  useEffect(() => {
    const joinCall = async () => {
      try {
        const response = await videoCallApi.joinCall(callId, {});
        setToken(response.token);
        setServerUrl(response.room_url);

        // Set call type from response
        const responseCallType = response.call?.call_type || 'video';
        setCallType(responseCallType);
      } catch (err) {
        console.error('Failed to join call:', err);
      } finally {
        setIsLoading(false);
      }
    };

    joinCall();
  }, [callId]);

  if (isLoading || !token || !serverUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={className || 'h-screen bg-gray-900'}>
      <LiveKitRoom
        video={callType === 'video'}
        audio={{
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        }}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={onDisconnect}
        data-lk-theme="default"
        style={{ height: '100%' }}
      >
        {/* Custom layout with participant tiles */}
        <MyVideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};

/**
 * Custom video conference layout
 */
function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <div className="flex flex-col h-full">
      <GridLayout tracks={tracks} style={{ flex: 1 }}>
        <ParticipantTile />
      </GridLayout>
      <ControlBar />
    </div>
  );
}
