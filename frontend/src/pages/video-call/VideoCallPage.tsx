/**
 * Video Call Page - Main video calling interface
 * Using LiveKit through deskive backend for professional video conferencing
 *
 * Routes:
 * - /workspaces/:workspaceId/video-calls → VideoView (list/dashboard)
 * - /workspaces/:workspaceId/video-calls/:callId → LiveKitVideoCall (actual call)
 */

import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { LiveKitVideoCall } from '../../components/video-call/LiveKitVideoCall';
import { VideoView } from '../../components/video-call/VideoView';
import { useVideoCallSocket } from '../../hooks/useVideoCallSocket';
import { useAuth } from '../../contexts/AuthContext';

export function VideoCallPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { callDeclinedEvent } = useVideoCallSocket();

  // Handle call declined event - redirect caller back to video calls list
  // ONLY for one-to-one calls (not group meetings)
  useEffect(() => {
    if (callDeclinedEvent) {
      console.log('📵 [VideoCallPage] Call was declined, checking if we need to redirect');

      // Check if user is currently in a call page (has callId in URL)
      const isInCallPage = location.pathname.includes('/video-calls/') &&
                           !location.pathname.endsWith('/video-calls');

      // Only redirect for one-to-one calls, NOT group calls
      // For group calls, other attendees should stay in the call even if someone declines
      // Use isGroupCall from the decline event (sent from backend)
      const isGroupCall = callDeclinedEvent.isGroupCall;

      if (isInCallPage && !isGroupCall) {
        console.log('🔄 [VideoCallPage] One-to-one call declined, redirecting caller to video calls list');
        navigate(`/workspaces/${workspaceId}/video-calls`);
      } else if (isInCallPage && isGroupCall) {
        console.log('👥 [VideoCallPage] Group call - participant declined but not redirecting other attendees');
      }
    }
  }, [callDeclinedEvent, navigate, workspaceId, location]);

  return (
    <>
      <Routes>
        {/* Video calls list/dashboard */}
        <Route index element={<VideoView />} />

        {/* Active video call */}
        <Route
          path=":callId"
          element={
            <VideoCallWrapper
              onDisconnect={() => {
                // Navigate back to video calls list
                navigate(`/workspaces/${workspaceId}/video-calls`);
              }}
            />
          }
        />
      </Routes>
    </>
  );
}

/**
 * Wrapper component to handle callId from params
 */
function VideoCallWrapper({ onDisconnect }: { onDisconnect: () => void }) {
  const { callId } = useParams<{ callId: string }>();

  if (!callId) {
    return <VideoView />;
  }

  return (
    <LiveKitVideoCall
      callId={callId}
      onDisconnect={onDisconnect}
      className="h-full"
    />
  );
}