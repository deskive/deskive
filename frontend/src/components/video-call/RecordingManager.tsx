import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Circle,
  StopCircle,
  Download,
  Trash2,
  Play,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'

interface RecordingManagerProps {
  isOpen: boolean
  onClose: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  isRecording: boolean
  recordingDuration: number
}

interface RecordingFile {
  id: string
  name: string
  duration: number
  size: string
  timestamp: number
  url?: string
}

export function RecordingManager({
  isOpen,
  onClose,
  onStartRecording,
  onStopRecording,
  isRecording,
  recordingDuration
}: RecordingManagerProps) {
  const [recordings, setRecordings] = useState<RecordingFile[]>([
    {
      id: '1',
      name: 'Team Meeting - Project Kickoff',
      duration: 1800000, // 30 minutes
      size: '45.2 MB',
      timestamp: Date.now() - 86400000, // 1 day ago
      url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
    },
    {
      id: '2',
      name: 'Daily Standup Meeting',
      duration: 900000, // 15 minutes
      size: '18.7 MB',
      timestamp: Date.now() - 172800000, // 2 days ago
      url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4'
    }
  ])

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [recordingToDelete, setRecordingToDelete] = useState<string | null>(null)
  const [previewRecording, setPreviewRecording] = useState<RecordingFile | null>(null)
  const [localRecordingDuration, setLocalRecordingDuration] = useState(0)
  const [localIsRecording, setLocalIsRecording] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number>(0)

  const formatDuration = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000) % 60
    const minutes = Math.floor(ms / (1000 * 60)) % 60
    const hours = Math.floor(ms / (1000 * 60 * 60))

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }, [])

  const handleStartRecording = useCallback(async () => {
    console.log('📹 Starting recording from Recording Manager...')
    try {
      // Get screen and audio stream
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      })

      // Get microphone audio
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      })

      // Combine streams
      const combinedStream = new MediaStream([
        ...displayStream.getVideoTracks(),
        ...displayStream.getAudioTracks(),
        ...audioStream.getAudioTracks()
      ])

      // Create MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      })

      recordedChunksRef.current = []
      recordingStartTimeRef.current = Date.now()

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: 'video/webm'
        })

        const finalDuration = Date.now() - recordingStartTimeRef.current

        const newRecording: RecordingFile = {
          id: Date.now().toString(),
          name: `Call Recording - ${new Date().toLocaleDateString()}`,
          duration: finalDuration,
          size: formatFileSize(blob.size),
          timestamp: Date.now(),
          url: URL.createObjectURL(blob)
        }

        setRecordings(prev => [newRecording, ...prev])
        setLocalIsRecording(false)
        setLocalRecordingDuration(0)
        toast.success('Recording saved successfully!')
        onStopRecording()
      }

      // Handle screen share end
      displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        handleStopRecording()
      })

      mediaRecorderRef.current.start(1000) // Collect data every second
      setLocalIsRecording(true)
      onStartRecording()
      toast.success('Recording started')
      console.log('✅ Recording started successfully')

    } catch (error) {
      console.error('❌ Failed to start recording:', error)
      toast.error(`Failed to start recording: ${error instanceof Error ? error.message : 'Please check permissions.'}`)
    }
  }, [onStartRecording, onStopRecording, formatFileSize])

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()

      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())

      setLocalIsRecording(false)
      onStopRecording()
      toast.success('Recording stopped', {
        description: 'Processing in background. You will be notified when ready.',
        duration: 5000,
      })
    } else {
      toast.error('No active recording to stop')
    }
  }, [onStopRecording])

  const handleDownload = useCallback((recording: RecordingFile) => {
    if (recording.url) {
      try {
        const a = document.createElement('a')
        a.href = recording.url
        a.download = `${recording.name}.webm`
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        toast.success('Download started')
      } catch (error) {
        console.error('Download failed:', error)
        toast.error('Failed to download recording')
      }
    } else {
      toast.error('Recording file not available for download')
    }
  }, [])

  const handleDelete = useCallback((recordingId: string) => {
    setRecordingToDelete(recordingId)
    setShowConfirmDialog(true)
  }, [])

  const confirmDelete = useCallback(() => {
    if (recordingToDelete) {
      setRecordings(prev => prev.filter(r => r.id !== recordingToDelete))
      toast.success('Recording deleted')
    }
    setShowConfirmDialog(false)
    setRecordingToDelete(null)
  }, [recordingToDelete])

  const togglePlayback = useCallback((recordingId: string) => {
    const recording = recordings.find(r => r.id === recordingId)
    if (recording?.url) {
      setPreviewRecording(recording)
    } else {
      toast.error('Recording not available for playback')
    }
  }, [recordings])

  if (!isOpen) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-red-500" />
              Recording Manager
            </DialogTitle>
            <DialogDescription>
              Manage your call recordings and start new recordings
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-6 h-[500px]">
            {/* Recording Controls */}
            <div className="w-80 border-r pr-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-3">Recording Controls</h3>

                  {/* Current Recording Status */}
                  {(isRecording || localIsRecording) && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive" className="animate-pulse">
                          <Circle className="h-3 w-3 mr-1 fill-current" />
                          Recording
                        </Badge>
                      </div>
                      <div className="text-sm text-red-700">
                        Duration: {formatDuration(localRecordingDuration || recordingDuration)}
                      </div>
                    </div>
                  )}

                  {/* Recording Action */}
                  <div className="space-y-3">
                    {!(isRecording || localIsRecording) ? (
                      <Button
                        onClick={handleStartRecording}
                        className="w-full bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Circle className="h-4 w-4 mr-2" />
                        Start Recording
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStopRecording}
                        variant="outline"
                        className="w-full border-red-500 text-red-500 hover:bg-red-50"
                      >
                        <StopCircle className="h-4 w-4 mr-2" />
                        Stop Recording
                      </Button>
                    )}
                  </div>
                </div>

                {/* Recording Settings */}
                <div>
                  <h4 className="font-medium mb-2">Settings</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Quality:</span>
                      <span>1080p @ 30fps</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Audio:</span>
                      <span>System + Microphone</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Format:</span>
                      <span>WebM (VP9)</span>
                    </div>
                  </div>
                </div>

                {/* Storage Info */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium text-blue-800 mb-1">Storage</div>
                    <div className="text-blue-700">
                      Local storage: {recordings.length} recordings
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recordings List */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Previous Recordings</h3>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[400px]">
                {recordings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Circle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No recordings yet</p>
                    <p className="text-sm">Start your first recording to see it here</p>
                  </div>
                ) : (
                  recordings.map((recording) => (
                    <div
                      key={recording.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{recording.name}</h4>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Duration: {formatDuration(recording.duration)}</div>
                            <div>Size: {recording.size}</div>
                            <div>
                              {new Date(recording.timestamp).toLocaleDateString()} at{' '}
                              {new Date(recording.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 ml-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePlayback(recording.id)}
                            className="h-8 w-8 p-0"
                            title="Preview recording"
                          >
                            <Play className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(recording)}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(recording.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Preview Modal */}
      {previewRecording && (
        <Dialog open={!!previewRecording} onOpenChange={() => setPreviewRecording(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                {previewRecording.name}
              </DialogTitle>
              <DialogDescription>
                Duration: {formatDuration(previewRecording.duration)} • Size: {previewRecording.size}
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 pt-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  src={previewRecording.url}
                  controls
                  className="w-full h-auto max-h-[60vh]"
                  preload="metadata"
                >
                  Your browser does not support video playback.
                </video>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Recorded on {new Date(previewRecording.timestamp).toLocaleString()}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(previewRecording)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button onClick={() => setPreviewRecording(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recording</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recording? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
