/**
 * Video Controls - Main call control panel
 * Handles all call actions and UI controls
 */

import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  Hand,
  Smile,
  MessageSquare,
  Users,
  MoreVertical,
  Circle,
  StopCircle,
  Settings,
  Sparkles,
  PenTool,
  Captions,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import useVideoCallStore from '@/stores/videoCallStore'

interface VideoControlsProps {
  onReaction?: (emoji: string) => void
  onOpenWhiteboard?: () => void
  className?: string
}

export function VideoControls({ 
  onReaction, 
  onOpenWhiteboard,
  className 
}: VideoControlsProps) {
  const {
    callType,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    isHandRaised,
    isRecording,
    showChat,
    showAIPanel,
    isCaptionsEnabled,
    showTranscriptPanel,
    unreadChatCount,

    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    toggleHandRaise,
    startRecording,
    stopRecording,
    toggleChat,
    toggleAIPanel,
    toggleCaptions,
    toggleTranscriptPanel,
    setGridLayout,
    leaveCall
  } = useVideoCallStore()

  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare()
      } else {
        await startScreenShare()
      }
    } catch (error) {
      console.error('Screen sharing failed:', error)
    }
  }

  const handleToggleRecording = () => {
    try {
      if (isRecording) {
        stopRecording()
      } else {
        startRecording()
      }
    } catch (error) {
      console.error('Recording failed:', error)
    }
  }

  const quickReactions = ['👍', '👏', '❤️', '😂', '😮', '🎉']

  return (
    <div className={cn(
      "flex items-center justify-center gap-4 p-6 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700",
      className
    )}>
      {/* Audio Control */}
      <Button
        variant={isAudioMuted ? "destructive" : "secondary"}
        size="lg"
        onClick={toggleAudio}
        className="rounded-full h-14 w-14 shadow-lg hover:scale-105 transition-transform"
        title={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
      >
        {isAudioMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
      </Button>

      {/* Video Control - Only show in video calls */}
      {callType === 'video' && (
        <Button
          variant={isVideoMuted ? "destructive" : "secondary"}
          size="lg"
          onClick={toggleVideo}
          className="rounded-full h-14 w-14 shadow-lg hover:scale-105 transition-transform"
          title={isVideoMuted ? "Turn on camera" : "Turn off camera"}
        >
          {isVideoMuted ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </Button>
      )}

      {/* Screen Share */}
      <Button
        variant={isScreenSharing ? "default" : "secondary"}
        size="lg"
        onClick={handleToggleScreenShare}
        className="rounded-full h-14 w-14 shadow-lg hover:scale-105 transition-transform"
        title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
      >
        {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
      </Button>

      {/* Reactions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="secondary" 
            size="lg" 
            className="rounded-full h-14 w-14 shadow-lg hover:scale-105 transition-transform"
            title="Send reaction"
          >
            <Smile className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="mb-2 p-0 w-auto" sideOffset={10}>
          {/* Quick reactions */}
          <div className="p-3 border-b border-gray-200">
            <div className="text-xs font-medium text-gray-500 mb-2">Quick reactions</div>
            <div className="flex gap-2">
              {quickReactions.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  onClick={() => onReaction?.(emoji)}
                  className="h-10 w-10 p-0 text-2xl hover:bg-gray-100"
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Raise Hand */}
      <Button
        variant={isHandRaised ? "default" : "secondary"}
        size="lg"
        onClick={toggleHandRaise}
        className={cn(
          "rounded-full h-14 w-14 shadow-lg hover:scale-105 transition-transform",
          isHandRaised && "bg-yellow-500 hover:bg-yellow-600 animate-pulse"
        )}
        title={isHandRaised ? "Lower hand" : "Raise hand"}
      >
        <Hand className="h-6 w-6" />
      </Button>

      {/* Chat Toggle */}
      <div className="relative">
        <Button
          variant={showChat ? "default" : "secondary"}
          size="lg"
          onClick={toggleChat}
          className="rounded-full h-14 w-14 shadow-lg hover:scale-105 transition-transform"
          title={showChat ? "Hide chat" : "Show chat"}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
        {unreadChatCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadChatCount > 9 ? '9+' : unreadChatCount}
          </div>
        )}
      </div>

      {/* Closed Captions Toggle */}
      <Button
        variant={isCaptionsEnabled ? "default" : "secondary"}
        size="lg"
        onClick={toggleCaptions}
        className={cn(
          "rounded-full h-14 w-14 shadow-lg hover:scale-105 transition-transform",
          isCaptionsEnabled && "bg-green-600 hover:bg-green-700"
        )}
        title={isCaptionsEnabled ? "Turn off captions" : "Turn on captions"}
      >
        <Captions className="h-6 w-6" />
      </Button>

      {/* Invite People */}
      <Button
        variant="secondary"
        size="lg"
        className="rounded-full h-14 w-14 shadow-lg hover:scale-105 transition-transform"
        title="Invite people"
      >
        <Users className="h-6 w-6" />
      </Button>

      {/* AI Features Toggle */}
      <Button
        variant={showAIPanel ? "default" : "secondary"}
        size="lg"
        onClick={toggleAIPanel}
        className={cn(
          "rounded-full h-14 w-14 shadow-lg hover:scale-105 transition-transform",
          showAIPanel && "gradient-primary-active"
        )}
        title={showAIPanel ? "Hide AI features" : "Show AI features"}
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* End Call */}
      <Button
        variant="destructive"
        size="lg"
        onClick={leaveCall}
        className="rounded-full h-14 w-14 shadow-lg hover:scale-105 transition-transform bg-red-500 hover:bg-red-600"
        title="End call"
      >
        <PhoneOff className="h-6 w-6" />
      </Button>

      {/* More Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="secondary" 
            size="lg" 
            className="rounded-full h-14 w-14 shadow-lg hover:scale-105 transition-transform"
            title="More options"
          >
            <MoreVertical className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="mb-2 w-48">
          <DropdownMenuItem onClick={handleToggleRecording}>
            {isRecording ? (
              <>
                <StopCircle className="mr-2 h-4 w-4" />
                Stop Recording
              </>
            ) : (
              <>
                <Circle className="mr-2 h-4 w-4" />
                Start Recording
              </>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={onOpenWhiteboard}>
            <PenTool className="mr-2 h-4 w-4" />
            Open Whiteboard
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setGridLayout('gallery')}>
            Gallery View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setGridLayout('speaker')}>
            Speaker View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setGridLayout('sidebar')}>
            Sidebar View
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleAIPanel}>
            <Sparkles className="mr-2 h-4 w-4" />
            {showAIPanel ? "Hide AI Panel" : "Show AI Panel"}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={toggleTranscriptPanel}>
            <FileText className="mr-2 h-4 w-4" />
            {showTranscriptPanel ? "Hide Transcript" : "Show Transcript"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}