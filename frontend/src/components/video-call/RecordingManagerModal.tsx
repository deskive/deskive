/**
 * Recording Manager Modal - Manage call recordings
 */

import { useState } from 'react'
import {
  X,
  Circle,
  Play,
  Download,
  Trash2,
  Settings as SettingsIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

interface Recording {
  id: string
  title: string
  duration: string
  size: string
  date: string
}

interface RecordingManagerModalProps {
  open: boolean
  onClose: () => void
  isRecording?: boolean
  onStartRecording?: () => void
  onStopRecording?: () => void
}

const MOCK_RECORDINGS: Recording[] = [
  {
    id: '1',
    title: 'Team Meeting - Project Kickoff',
    duration: '30:00',
    size: '45.2 MB',
    date: '07/10/2025 at 12:16',
  },
  {
    id: '2',
    title: 'Daily Standup Meeting',
    duration: '15:00',
    size: '18.7 MB',
    date: '06/10/2025 at 12:16',
  },
]

export function RecordingManagerModal({
  open,
  onClose,
  isRecording = false,
  onStartRecording,
  onStopRecording,
}: RecordingManagerModalProps) {
  const [recordings] = useState<Recording[]>(MOCK_RECORDINGS)
  const [showSettings, setShowSettings] = useState(false)

  const handleStartRecording = () => {
    onStartRecording?.()
    toast.success('Recording started')
  }

  const handleStopRecording = () => {
    onStopRecording?.()
    toast.success('Recording stopped', {
      description: 'Processing in background. You will be notified when ready.',
      duration: 5000,
    })
  }

  const handlePlayRecording = (recording: Recording) => {
    toast.info(`Playing: ${recording.title}`)
  }

  const handleDownloadRecording = (recording: Recording) => {
    toast.success(`Downloading: ${recording.title}`)
  }

  const handleDeleteRecording = (recording: Recording) => {
    toast.success(`Deleted: ${recording.title}`)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1200px] h-[600px] p-0 gap-0 bg-gray-900 border-gray-700 text-white">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
                <Circle className="h-6 w-6 text-red-500" />
                Recording Manager
              </DialogTitle>
              <p className="text-sm text-gray-400 mt-1">
                Manage your call recordings and start new recordings
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Recording Controls */}
          <div className="w-[500px] border-r border-gray-700 p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-4">Recording Controls</h3>

            {/* Start/Stop Recording Button */}
            <Button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={cn(
                "w-full h-14 text-lg font-semibold mb-6",
                isRecording
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-red-500 hover:bg-red-600"
              )}
            >
              <Circle className={cn("h-5 w-5 mr-2", isRecording && "fill-white")} />
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>

            {/* Settings */}
            <div className="flex-1">
              <h4 className="text-base font-semibold text-white mb-4">Settings</h4>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Quality:</span>
                  <span className="text-white">1080p @ 30fps</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Audio:</span>
                  <span className="text-white">System + Microphone</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Format:</span>
                  <span className="text-white">WebM (VP9)</span>
                </div>
              </div>

              {/* Storage Info */}
              <div className="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h5 className="font-semibold text-white mb-2">Storage</h5>
                <p className="text-blue-400 text-sm">
                  Local storage: {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Previous Recordings */}
          <div className="flex-1 flex flex-col">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Previous Recordings</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-gray-400 hover:text-white"
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-3">
                {recordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-white mb-1">
                          {recording.title}
                        </h4>
                        <div className="text-sm text-gray-400 space-y-0.5">
                          <div>Duration: {recording.duration}</div>
                          <div>Size: {recording.size}</div>
                          <div>{recording.date}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePlayRecording(recording)}
                          className="h-9 w-9 text-gray-400 hover:text-white hover:bg-gray-700"
                          title="Play recording"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadRecording(recording)}
                          className="h-9 w-9 text-gray-400 hover:text-white hover:bg-gray-700"
                          title="Download recording"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRecording(recording)}
                          className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          title="Delete recording"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {recordings.length === 0 && (
                  <div className="text-center py-12">
                    <Circle className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No recordings yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Start a recording to save it here
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
