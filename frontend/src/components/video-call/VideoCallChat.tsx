/**
 * VideoCallChat Component - In-call messaging
 * Clean React+Vite+TypeScript implementation
 */

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Send,
  X,
  Pin,
  Reply,
  MoreVertical,
  Smile,
  Paperclip,
  Download,
  Video
} from 'lucide-react'
import { toast } from 'sonner'
import { useVideoCallStore } from '@/stores/videoCallStore'
import type { VideoCallChatProps, CallParticipant } from '@/types/video'

export const VideoCallChat: React.FC<VideoCallChatProps> = ({
  participants,
  currentUserId,
  onClose
}) => {
  const { chatMessages, sendMessage } = useVideoCallStore()
  const [newMessage, setNewMessage] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Send message
  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    sendMessage(newMessage, replyTo || undefined)
    setNewMessage('')
    setReplyTo(null)
  }

  // Handle emoji reaction (local only for now)
  const handleReaction = (messageId: string, emoji: string) => {
    // TODO: Implement reaction via WebSocket
    toast.info('Reactions coming soon!')
  }

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Get participant by ID
  const getParticipant = (id: string) => {
    return participants.find(p => p.id === id)
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Chat</h3>
          <span className="text-xs text-gray-400">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {chatMessages.map((message) => {
            const participant = getParticipant(message.senderId)
            const isCurrentUser = message.senderId === currentUserId
            const isSystemMessage = message.senderId === 'system' || message.type === 'system'
            const isRecordingMessage = message.type === 'recording'
            const replyToMessage = message.replyTo ? chatMessages.find(m => m.id === message.replyTo) : null

            // Special rendering for recording messages
            if (isRecordingMessage) {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-4 max-w-sm w-full">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-white/20 rounded-full p-2">
                        <Video className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Recording Ready</p>
                        <p className="text-white/70 text-xs">{formatTime(message.timestamp)}</p>
                      </div>
                    </div>
                    {message.recordingUrl && (
                      <a
                        href={message.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-white text-green-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors w-full"
                      >
                        <Download className="h-4 w-4" />
                        Download Recording
                      </a>
                    )}
                  </div>
                </div>
              )
            }

            // System messages (centered)
            if (isSystemMessage) {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="bg-gray-700/50 text-gray-400 text-xs px-3 py-1 rounded-full">
                    {message.content}
                  </div>
                </div>
              )
            }

            return (
              <div key={message.id} className="group">
                {/* Reply to message */}
                {replyToMessage && (
                  <div className="ml-12 mb-1 pl-3 border-l-2 border-gray-600 text-xs text-gray-400">
                    <span className="font-medium">{replyToMessage.senderName}:</span>
                    <span className="ml-1">{replyToMessage.content}</span>
                  </div>
                )}

                <div className={cn(
                  "flex gap-3",
                  isCurrentUser && "justify-end"
                )}>
                  {!isCurrentUser && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={participant?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                        {message.senderName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={cn(
                    "flex-1 max-w-xs",
                    isCurrentUser && "flex flex-col items-end"
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-300">
                        {message.senderName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>

                    <div className={cn(
                      "p-3 rounded-lg text-sm",
                      isCurrentUser
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-100"
                    )}>
                      {message.content}
                    </div>

                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {message.reactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            onClick={() => handleReaction(message.id, reaction.emoji)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                              reaction.users.includes(currentUserId)
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            )}
                          >
                            <span>{reaction.emoji}</span>
                            <span>{reaction.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Message actions (visible on hover) */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        onClick={() => handleReaction(message.id, '👍')}
                      >
                        <Smile className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        onClick={() => {
                          setReplyTo(message.id)
                          inputRef.current?.focus()
                        }}
                      >
                        <Reply className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {isCurrentUser && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white text-xs">
                        You
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              Replying to{' '}
              <span className="text-white font-medium">
                {chatMessages.find(m => m.id === replyTo)?.senderName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(null)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
            onClick={() => toast.info('File sharing coming soon')}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
            onClick={() => toast.info('Emoji picker coming soon')}
          >
            <Smile className="h-4 w-4" />
          </Button>
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage()
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="h-8 w-8 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}