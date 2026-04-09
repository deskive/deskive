/**
 * Public Meeting Page
 * Standalone video call page accessible via direct link without workspace
 * URL format: /video/meeting/:meetingId
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LiveKitVideoCall } from '@/components/video-call/LiveKitVideoCall';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Video, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function PublicMeetingPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [hasJoined, setHasJoined] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill display name if user is logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      const name = (user.metadata?.name as string) || user.name || user.email || '';
      setDisplayName(name);
    }
  }, [isAuthenticated, user]);

  // Validate meeting ID on mount
  useEffect(() => {
    if (!meetingId) {
      setError('Invalid meeting link');
      setIsValidating(false);
      return;
    }

    // Simple validation - meeting ID should be alphanumeric
    if (!/^[a-z0-9]+$/i.test(meetingId)) {
      setError('Invalid meeting ID format');
      setIsValidating(false);
      return;
    }

    setIsValidating(false);
  }, [meetingId]);

  const handleJoinMeeting = () => {
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setHasJoined(true);
  };

  const handleDisconnect = () => {
    setHasJoined(false);
    // Navigate to home page
    navigate('/');
  };

  // If validating, show loading
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg">Validating meeting link...</p>
        </div>
      </div>
    );
  }

  // If error, show error message
  if (error && !hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-white">Meeting Error</CardTitle>
                <CardDescription className="text-gray-400">
                  Unable to join meeting
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">{error}</p>
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If already joined, show video call interface
  if (hasJoined && meetingId) {
    return (
      <div className="h-screen w-screen bg-gray-900">
        <LiveKitVideoCall
          callId={meetingId}
          onDisconnect={handleDisconnect}
          className="h-full w-full"
        />
      </div>
    );
  }

  // Show join meeting form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white">Join Video Meeting</CardTitle>
              <CardDescription className="text-gray-400">
                Enter your details to join
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Meeting ID Display */}
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
            <p className="text-xs text-gray-400 mb-1">Meeting ID</p>
            <p className="text-sm font-mono text-white">{meetingId}</p>
          </div>

          {/* Display Name Input */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-gray-300">
              Your Name
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleJoinMeeting();
                }
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Join Button */}
          <Button
            onClick={handleJoinMeeting}
            disabled={!displayName.trim()}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
          >
            <Video className="h-4 w-4 mr-2" />
            Join Meeting
          </Button>

          {/* Login Prompt for Guests */}
          {!isAuthenticated && (
            <div className="text-center pt-2">
              <p className="text-xs text-gray-400">
                Have an account?{' '}
                <button
                  onClick={() => navigate('/auth/login', { state: { returnUrl: `/video/meeting/${meetingId}` } })}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
