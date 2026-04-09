import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Mic, MicOff, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

type RecordingState = 'idle' | 'recording' | 'processing' | 'completed';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (transcript: string) => void;
}

// Check if browser supports Web Speech API
const isSpeechRecognitionSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

export function VoiceSearchModal({ isOpen, onClose, onTranscript }: VoiceSearchModalProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [duration, setDuration] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);

  const recognition = useRef<any>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Check browser support on mount
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      setBrowserSupported(false);
    }
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!browserSupported) return;

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setBrowserSupported(false);
        return;
      }

      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = 'en-US';
      recognition.current.maxAlternatives = 1;

      // Handle recognition results
      recognition.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            setConfidence(result[0].confidence);
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        } else if (interimTranscript) {
          setTranscript((prev) => prev + interimTranscript);
        }
      };

      // Handle recognition end
      recognition.current.onend = () => {
        if (recordingState === 'recording') {
          // Auto-restart if still in recording state
          try {
            recognition.current?.start();
          } catch (e) {
            // Ignore if already started
          }
        }
      };

      // Handle errors
      recognition.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);

        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setPermissionDenied(true);
          setRecordingState('idle');
        } else if (event.error === 'no-speech') {
          // Continue listening
        } else {
          setRecordingState('idle');
        }
      };

      // Handle start
      recognition.current.onstart = () => {
        setRecordingState('recording');
      };

    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      setBrowserSupported(false);
    }

    // Cleanup
    return () => {
      if (recognition.current) {
        try {
          recognition.current.stop();
        } catch (e) {
          // Ignore
        }
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [browserSupported]);

  // Duration timer
  useEffect(() => {
    if (recordingState === 'recording') {
      durationInterval.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [recordingState]);

  const startRecording = async () => {
    if (!browserSupported) {
      return;
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionDenied(false);

      // Reset state
      setTranscript('');
      setConfidence(0);
      setDuration(0);

      // Start recognition
      if (recognition.current) {
        recognition.current.start();
      }
    } catch (error) {
      console.error('Microphone access error:', error);
      setPermissionDenied(true);
    }
  };

  const stopRecording = () => {
    if (recognition.current) {
      recognition.current.stop();
    }
    setRecordingState('completed');
  };

  const resetRecording = () => {
    setRecordingState('idle');
    setTranscript('');
    setConfidence(0);
    setDuration(0);
    setPermissionDenied(false);
  };

  const handleUseTranscript = () => {
    if (transcript.trim()) {
      onTranscript(transcript.trim());
      resetRecording();
      onClose();
    }
  };

  const handleClose = () => {
    if (recognition.current && recordingState === 'recording') {
      recognition.current.stop();
    }
    resetRecording();
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Voice Search</DialogTitle>
          <DialogDescription>
            Speak clearly to search across your workspace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Browser Support Warning */}
          {!browserSupported && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="p-4 flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-semibold text-destructive mb-1">
                    Browser Not Supported
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Your browser doesn't support voice recognition. Please try Chrome, Edge, or Safari.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Permission Denied Warning */}
          {permissionDenied && (
            <Card className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-1">
                    Microphone Permission Denied
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Please allow microphone access in your browser settings to use voice search.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recording Interface */}
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            {/* Recording Button */}
            <div className="relative">
              <Button
                size="lg"
                variant={recordingState === 'recording' ? 'destructive' : 'default'}
                className={cn(
                  'h-24 w-24 rounded-full',
                  recordingState === 'recording' && 'animate-pulse'
                )}
                onClick={recordingState === 'idle' ? startRecording : stopRecording}
                disabled={!browserSupported || recordingState === 'processing'}
              >
                {recordingState === 'idle' && <Mic className="h-10 w-10" />}
                {recordingState === 'recording' && <MicOff className="h-10 w-10" />}
                {recordingState === 'processing' && <Loader2 className="h-10 w-10 animate-spin" />}
                {recordingState === 'completed' && <CheckCircle className="h-10 w-10" />}
              </Button>

              {/* Pulse Animation Ring */}
              {recordingState === 'recording' && (
                <div className="absolute inset-0 rounded-full border-4 border-destructive animate-ping opacity-75" />
              )}
            </div>

            {/* Status Text */}
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                {recordingState === 'idle' && 'Click to start recording'}
                {recordingState === 'recording' && 'Listening...'}
                {recordingState === 'processing' && 'Processing...'}
                {recordingState === 'completed' && 'Recording completed'}
              </p>

              {/* Duration Timer */}
              {recordingState === 'recording' && (
                <Badge variant="secondary" className="text-base px-4 py-1">
                  {formatDuration(duration)}
                </Badge>
              )}
            </div>
          </div>

          {/* Transcript Display */}
          {transcript && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Transcript</h4>
                  {confidence > 0 && (
                    <Badge
                      variant={confidence > 0.8 ? 'default' : confidence > 0.5 ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {Math.round(confidence * 100)}% confidence
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground bg-muted p-3 rounded-md min-h-[60px]">
                  {transcript}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tips Section */}
          {recordingState === 'idle' && !transcript && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
                  Tips for better results:
                </h4>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1.5">
                  <li>• Speak clearly and at a normal pace</li>
                  <li>• Minimize background noise</li>
                  <li>• Use natural language (e.g., "find budget reports from last month")</li>
                  <li>• You can pause and continue - just keep the modal open</li>
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 pt-2">
            <Button
              variant="outline"
              onClick={resetRecording}
              disabled={recordingState === 'idle' || recordingState === 'recording'}
            >
              Reset
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleUseTranscript}
                disabled={!transcript.trim() || recordingState === 'recording'}
              >
                Use This Search
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
