import { useState, useRef, useEffect } from 'react'
import {
  X,
  Send,
  CornerUpRight,
  Smile,
  Paperclip,
  MessageSquare,
  Mic,
  Video,
  Square,
  Bold,
  Italic,
  Code,
  Download,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MessageItem, type Message } from './MessageItem'

// ============================================================================
// TYPES
// ============================================================================

export interface ThreadSidebarProps {
  /** Whether the sidebar is open */
  isOpen: boolean
  /** Parent message that started the thread */
  parentMessage: Message
  /** Array of thread reply messages */
  threadMessages: Message[]
  /** Current user ID for message ownership checks */
  currentUserId: string
  /** Called when the sidebar should be closed */
  onClose: () => void
  /** Called when a reply is sent in the thread */
  onSendReply: (content: string, files: File[]) => void
  /** Optional callback for loading more thread messages */
  onLoadMore?: () => void
  /** Whether more messages are being loaded */
  isLoadingMore?: boolean
  /** Optional callback for reacting to a thread message */
  onReact?: (messageId: string, emoji: string) => void
  /** Optional callback for editing a thread message */
  onEdit?: (messageId: string, newContent: string) => void
  /** Optional callback for deleting a thread message */
  onDelete?: (messageId: string) => void
  /** Optional callback for downloading an attachment */
  onDownloadAttachment?: (attachmentId: string, fileName: string) => void
}

// ============================================================================
// FILE PREVIEW COMPONENT
// ============================================================================

interface FilePreviewProps {
  file: File
  onRemove: () => void
}

function FilePreview({ file, onRemove }: FilePreviewProps) {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️'
    if (type.startsWith('video/')) return '🎬'
    if (type.startsWith('audio/')) return '🎵'
    if (type.includes('pdf')) return '📄'
    if (type.includes('doc')) return '📝'
    return '📎'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-background dark:bg-background/50 rounded-lg shadow-sm border border-border">
      <span className="text-lg">{getFileIcon(file.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate text-foreground">{file.name}</div>
        <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

// ============================================================================
// THREAD SIDEBAR COMPONENT
// ============================================================================

export function ThreadSidebar({
  isOpen,
  parentMessage,
  threadMessages,
  currentUserId,
  onClose,
  onSendReply,
  onLoadMore,
  isLoadingMore = false,
  onReact,
  onEdit,
  onDelete,
  onDownloadAttachment,
}: ThreadSidebarProps) {
  // ============================================================================
  // STATE
  // ============================================================================

  const [replyInput, setReplyInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  // ============================================================================
  // REFS
  // ============================================================================

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px'
    }
  }, [replyInput])

  // Auto-scroll to bottom when thread messages change
  useEffect(() => {
    const scrollToBottom = () => {
      const scrollElement = scrollRef.current
      if (scrollElement) {
        const viewport = scrollElement.querySelector('[data-radix-scroll-area-viewport]')
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight
        }
      }
    }

    setTimeout(scrollToBottom, 100)
  }, [threadMessages])

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      setRecordingTime(0)
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [isRecording])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSendReply = () => {
    if (!replyInput.trim() && selectedFiles.length === 0) return

    onSendReply(replyInput, selectedFiles)

    // Clear state
    setReplyInput('')
    setSelectedFiles([])
  }

  const handleFileUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt'
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      setSelectedFiles((prev) => [...prev, ...files])
    }
    input.click()
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleStartRecording = async (type: 'audio' | 'video') => {
    try {
      const constraints = type === 'audio' ? { audio: true } : { video: true, audio: true }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, {
          type: type === 'audio' ? 'audio/webm' : 'video/webm',
        })

        const file = new File([blob], `recording-${Date.now()}.webm`, {
          type: blob.type,
        })

        setSelectedFiles((prev) => [...prev, file])

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())

        // Reset state
        setIsRecording(false)
        setRecordingType(null)
        setMediaRecorder(null)
        setRecordingTime(0)
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingType(type)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
    }
  }

  const applyFormatting = (format: 'bold' | 'italic' | 'code') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = replyInput.substring(start, end)

    let formattedText = ''
    let markers = ''

    switch (format) {
      case 'bold':
        markers = '**'
        formattedText = `**${selectedText || 'bold text'}**`
        break
      case 'italic':
        markers = '_'
        formattedText = `_${selectedText || 'italic text'}_`
        break
      case 'code':
        markers = '`'
        formattedText = `\`${selectedText || 'code'}\``
        break
    }

    const newMessage = replyInput.substring(0, start) + formattedText + replyInput.substring(end)

    setReplyInput(newMessage)

    setTimeout(() => {
      if (selectedText) {
        textarea.setSelectionRange(start + markers.length, end + markers.length)
      } else {
        textarea.setSelectionRange(start + formattedText.length, start + formattedText.length)
      }
      textarea.focus()
    }, 0)
  }

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const newValue = replyInput.substring(0, start) + emoji + replyInput.substring(start)

    setReplyInput(newValue)

    setTimeout(() => {
      const newPosition = start + emoji.length
      textarea.setSelectionRange(newPosition, newPosition)
      textarea.focus()
    }, 0)
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const emojis = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🎉', '🔥', '👏', '💯', '🚀', '✨']

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-full w-96 bg-background border-l border-border shadow-xl z-50',
        'transform transition-transform duration-300 flex flex-col',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <CornerUpRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-semibold text-lg">Thread</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent Message */}
      <div className="p-4 border-b border-border bg-muted/30 dark:bg-muted/10">
        <Badge variant="outline" className="mb-3">
          <MessageSquare className="h-3 w-3 mr-1" />
          Original Message
        </Badge>

        <MessageItem
          message={parentMessage}
          currentUserId={currentUserId}
          showParentMessage={false}
          onDownloadAttachment={onDownloadAttachment}
          className="border-l-2 border-blue-500 dark:border-blue-400 pl-3"
        />
      </div>

      {/* Thread Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 pb-48">
        {threadMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <CornerUpRight className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-muted-foreground mb-2">Start a thread</h3>
            <p className="text-sm text-muted-foreground">
              Reply to this message to start a conversation.
            </p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            <Badge variant="secondary" className="mb-3">
              <MessageSquare className="h-3 w-3 mr-1" />
              {threadMessages.length} {threadMessages.length === 1 ? 'Reply' : 'Replies'}
            </Badge>

            {threadMessages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                showParentMessage={false}
                onEdit={onEdit}
                onDelete={onDelete}
                onReact={onReact}
                onDownloadAttachment={onDownloadAttachment}
                className="border rounded-lg"
              />
            ))}

            {/* Load More */}
            {onLoadMore && (
              <div className="flex justify-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading...' : 'Load more replies'}
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* File Preview */}
      {selectedFiles.length > 0 && (
        <div className="border-t border-border bg-muted/20 dark:bg-muted/10 p-4">
          <div className="space-y-2 max-h-32 overflow-y-auto">
            <div className="text-xs text-muted-foreground mb-2">Files to send:</div>
            {selectedFiles.map((file, index) => (
              <FilePreview key={index} file={file} onRemove={() => removeFile(index)} />
            ))}
          </div>
        </div>
      )}

      {/* Recording Status */}
      {isRecording && (
        <div className="border-t border-border bg-red-50 dark:bg-red-950/20 p-4">
          <div className="flex items-center justify-between p-2 bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-700 dark:text-red-400">
                Recording {recordingType}... {formatRecordingTime(recordingTime)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStopRecording}
              className="h-6 w-6 p-0 hover:bg-red-200 dark:hover:bg-red-900"
            >
              <Square className="h-3 w-3 text-red-600 dark:text-red-400" />
            </Button>
          </div>
        </div>
      )}

      {/* Reply Input - Fixed at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background p-4">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 mb-3 pb-2 border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyFormatting('bold')}
            className="h-8 w-8 p-0"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyFormatting('italic')}
            className="h-8 w-8 p-0"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyFormatting('code')}
            className="h-8 w-8 p-0"
            title="Code"
          >
            <Code className="h-4 w-4" />
          </Button>

          <div className="w-px h-4 bg-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleFileUpload}
            className="h-8 w-8 p-0"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {!isRecording && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStartRecording('audio')}
                className="h-8 w-8 p-0"
                title="Record audio"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStartRecording('video')}
                className="h-8 w-8 p-0"
                title="Record video"
              >
                <Video className="h-4 w-4" />
              </Button>
            </>
          )}

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Smile className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2">
              <div className="grid grid-cols-6 gap-1">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="p-2 hover:bg-muted/50 dark:hover:bg-muted/30 hover:scale-110 rounded text-lg transition-all"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Input Area */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendReply()
                }
              }}
              placeholder="Reply in thread..."
              className="min-h-[44px] max-h-[300px] resize-none text-sm overflow-hidden"
              rows={1}
            />
          </div>

          <Button
            onClick={handleSendReply}
            disabled={!replyInput.trim() && selectedFiles.length === 0}
            size="sm"
            className="h-11 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shrink-0"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
