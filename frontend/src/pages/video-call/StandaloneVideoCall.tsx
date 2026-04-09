/**
 * Standalone Video Call Page
 * Opens in a new window for video calls
 * Contains only the LiveKitVideoCall component without workspace layout
 *
 * Security:
 * - Checks if user is authenticated
 * - Verifies user belongs to the workspace
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LiveKitVideoCall } from '../../components/video-call/LiveKitVideoCall';
import { useVideoCallSocket } from '../../hooks/useVideoCallSocket';
import { useAuth } from '../../contexts/AuthContext';
import { workspaceApi } from '../../lib/api/workspace-api';
import { toast } from 'sonner';
import { Loader2, ShieldAlert, UserX, LogIn } from 'lucide-react';
import { Button } from '../../components/ui/button';

type AccessStatus = 'checking' | 'authenticated' | 'not-authenticated' | 'not-member' | 'error';

export function StandaloneVideoCall() {
  const { workspaceId, callId } = useParams<{ workspaceId: string; callId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { callDeclinedEvent } = useVideoCallSocket();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [accessStatus, setAccessStatus] = useState<AccessStatus>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Check authentication and workspace membership
  useEffect(() => {
    const checkAccess = async () => {
      // Wait for auth to finish loading
      if (isAuthLoading) {
        return;
      }

      // Check if user is authenticated
      if (!isAuthenticated || !user) {
        console.log('🔒 [StandaloneVideoCall] User not authenticated');
        setAccessStatus('not-authenticated');
        return;
      }

      // Check if workspaceId is provided
      if (!workspaceId) {
        setAccessStatus('error');
        setErrorMessage('Workspace ID is missing');
        return;
      }

      // Verify workspace membership
      try {
        console.log('🔍 [StandaloneVideoCall] Checking workspace membership...');
        const members = await workspaceApi.getMembers(workspaceId);

        // Check if current user is a member of this workspace
        const isMember = members.some(member =>
          member.user_id === user.id ||
          member.user?.id === user.id ||
          member.user?.email === user.email
        );

        if (!isMember) {
          console.log('❌ [StandaloneVideoCall] User is not a member of this workspace');
          setAccessStatus('not-member');
          return;
        }

        console.log('✅ [StandaloneVideoCall] Access granted - user is workspace member');
        setAccessStatus('authenticated');
      } catch (error: any) {
        console.error('❌ [StandaloneVideoCall] Error checking workspace membership:', error);

        // Handle specific error cases
        if (error?.status === 403 || error?.response?.status === 403) {
          setAccessStatus('not-member');
        } else if (error?.status === 401 || error?.response?.status === 401) {
          setAccessStatus('not-authenticated');
        } else {
          setAccessStatus('error');
          setErrorMessage(error?.message || 'Failed to verify access');
        }
      }
    };

    checkAccess();
  }, [isAuthLoading, isAuthenticated, user, workspaceId]);

  // Handle call declined event - close window for one-to-one calls
  useEffect(() => {
    if (callDeclinedEvent && callDeclinedEvent.callId === callId) {
      console.log('📵 [StandaloneVideoCall] Call was declined');

      // Only close window for one-to-one calls
      if (!callDeclinedEvent.isGroupCall) {
        console.log('🔄 [StandaloneVideoCall] One-to-one call declined, closing window');
        toast.info(`${callDeclinedEvent.declinedByName} declined the call`);

        // Close window after short delay to show toast
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        console.log('👥 [StandaloneVideoCall] Group call - participant declined but keeping window open');
        toast.info(`${callDeclinedEvent.declinedByName} declined the call`);
      }
    }
  }, [callDeclinedEvent, callId]);

  // Handle redirect to login
  const handleLoginRedirect = () => {
    // Store the current URL to redirect back after login
    const returnUrl = encodeURIComponent(location.pathname);
    navigate(`/auth/login?returnUrl=${returnUrl}`);
  };

  // Handle close/go back
  const handleClose = () => {
    const isPopup = window.opener !== null || window.name === 'videoCallPopup';
    if (isPopup) {
      window.close();
    } else {
      navigate('/');
    }
  };

  // Loading state while checking auth
  if (accessStatus === 'checking' || isAuthLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Verifying Access</h1>
          <p className="text-gray-400">Please wait while we verify your access to this call...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - prompt to login
  if (accessStatus === 'not-authenticated') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="h-10 w-10 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Login Required</h1>
          <p className="text-gray-400 mb-6">
            You need to be logged in to join this video call. Please login to continue.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLoginRedirect}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Login to Join
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not a workspace member
  if (accessStatus === 'not-member') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserX className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            You are not a member of this workspace. You need to be invited to the workspace before you can join calls.
          </p>
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (accessStatus === 'error') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Something Went Wrong</h1>
          <p className="text-gray-400 mb-6">
            {errorMessage || 'Unable to verify your access to this call. Please try again later.'}
          </p>
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  // Invalid call/workspace ID
  if (!callId || !workspaceId) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid Call</h1>
          <p className="text-gray-400">Call ID is missing</p>
        </div>
      </div>
    );
  }

  const handleDisconnect = () => {
    // Check if we're in a popup window
    const isPopup = window.opener !== null || window.name === 'videoCallPopup';

    if (isPopup) {
      // Close the popup window
      console.log('🪟 [StandaloneVideoCall] Closing popup window');
      window.close();
    } else {
      // Redirect to video calls list page if in regular tab
      console.log('🔄 [StandaloneVideoCall] Redirecting to video calls list');
      navigate(`/workspaces/${workspaceId}/video-calls`);
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-900">
      <LiveKitVideoCall
        callId={callId}
        onDisconnect={handleDisconnect}
        className="h-full w-full"
      />
    </div>
  );
}
