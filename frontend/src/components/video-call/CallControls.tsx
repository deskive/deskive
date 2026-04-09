/**
 * CallControls Component - Reusable control buttons
 * Clean React+Vite+TypeScript implementation
 */

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger, 
  DropdownMenuItem
} from '@/components/ui/dropdown-menu'
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  PhoneOff, 
  Monitor, 
  MonitorOff, 
  Hand, 
  Circle,
  StopCircle,
  Smile,
  MoreVertical,
  Volume2,
  Settings
} from 'lucide-react'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import type { CallControlsProps } from '@/types/video'

const commonEmojis = ['👍', '👏', '❤️', '😂', '😮', '😢', '🔥', '🎉']

export const CallControls: React.FC<CallControlsProps> = ({
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  isHandRaised,
  isRecording,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHandRaise,
  onToggleRecording,
  onEmojiReaction,
  onLeaveCall,
  callType
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  return (
    <div className="bg-gray-900 border-t border-gray-700 px-6 py-4">
      <div className="flex items-center justify-center gap-4">
        {/* Audio Control */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onToggleAudio}
          className={cn(
            "rounded-full p-4 h-12 w-12",
            isAudioMuted 
              ? "bg-red-600 hover:bg-red-700 text-white" 
              : "bg-gray-700 hover:bg-gray-600 text-white"
          )}
        >
          {isAudioMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        {/* Video Control (only show in video calls) */}
        {callType === 'video' && (
          <Button
            variant="ghost"
            size="lg"
            onClick={onToggleVideo}
            className={cn(
              "rounded-full p-4 h-12 w-12",
              isVideoMuted 
                ? "bg-red-600 hover:bg-red-700 text-white" 
                : "bg-gray-700 hover:bg-gray-600 text-white"
            )}
          >
            {isVideoMuted ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>
        )}

        {/* Screen Share Control */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onToggleScreenShare}
          className={cn(
            "rounded-full p-4 h-12 w-12",
            isScreenSharing 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "bg-gray-700 hover:bg-gray-600 text-white"
          )}
        >
          {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
        </Button>

        {/* Hand Raise */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onToggleHandRaise}
          className={cn(
            "rounded-full p-4 h-12 w-12",
            isHandRaised 
              ? "bg-yellow-600 hover:bg-yellow-700 text-white" 
              : "bg-gray-700 hover:bg-gray-600 text-white"
          )}
        >
          <Hand className="h-6 w-6" />
        </Button>

        {/* Recording Control */}
        {onToggleRecording && (
          <Button
            variant="ghost"
            size="lg"
            onClick={onToggleRecording}
            className={cn(
              "rounded-full p-4 h-12 w-12",
              isRecording 
                ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" 
                : "bg-gray-700 hover:bg-gray-600 text-white"
            )}
          >
            {isRecording ? <StopCircle className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
          </Button>
        )}

        {/* Emoji Reactions */}
        <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full p-4 h-12 w-12 bg-gray-700 hover:bg-gray-600 text-white"
            >
              <Smile className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="bg-gray-800 border-gray-700">
            <div className="grid grid-cols-4 gap-2 p-2">
              {commonEmojis.map((emoji) => (
                <DropdownMenuItem
                  key={emoji}
                  className="text-2xl p-2 hover:bg-gray-700 rounded cursor-pointer text-center"
                  onClick={() => {
                    onEmojiReaction(emoji)
                    setShowEmojiPicker(false)
                  }}
                >
                  {emoji}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full p-4 h-12 w-12 bg-gray-700 hover:bg-gray-600 text-white"
            >
              <MoreVertical className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="bg-gray-800 border-gray-700">
            <DropdownMenuItem className="text-white hover:bg-gray-700">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-gray-700">
              <Volume2 className="h-4 w-4 mr-2" />
              Audio Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Leave Call */}
        <Button
          variant="ghost"
          size="lg"
          onClick={onLeaveCall}
          className="rounded-full p-4 h-12 w-12 bg-red-600 hover:bg-red-700 text-white ml-6"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}