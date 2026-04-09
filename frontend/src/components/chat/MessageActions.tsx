import { useState } from 'react'
import {
  MoreHorizontal,
  Copy,
  CornerUpRight,
  Edit,
  Trash,
  SmilePlus,
  Sparkles,
  Pin,
  Forward,
  Link,
  Volume2,
  VolumeX,
  Bookmark,
  BookmarkCheck,
  FileText,
  FolderPlus,
  Mail,
  PinOff
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// Message type interface
export interface Message {
  id: string
  body: string
  user: {
    id: string
    name: string
    email?: string
    image?: string
  }
  timestamp?: Date
  reactions?: any[]
  parentMessageId?: string
  attachments?: any[]
}

export interface MessageActionsProps {
  message: Message
  isPinned?: boolean
  isBookmarked?: boolean
  isMuted?: boolean
  onEdit: () => void
  onDelete: () => void
  onReply: () => void
  onPin: () => void
  onUnpin: () => void
  onBookmark: () => void
  onUnbookmark: () => void
  onForward: () => void
  onCopyLink: () => void
  onMute: () => void
  onUnmute: () => void
  onAISummarize: () => void
  onAICreateNote: () => void
  onAICreateProject: () => void
  onAICreateEmail: () => void
  onAddReaction?: (emoji: string) => void
  currentUserId?: string
  showQuickActions?: boolean
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  isPinned = false,
  isBookmarked = false,
  isMuted = false,
  onEdit,
  onDelete,
  onReply,
  onPin,
  onUnpin,
  onBookmark,
  onUnbookmark,
  onForward,
  onCopyLink,
  onMute,
  onUnmute,
  onAISummarize,
  onAICreateNote,
  onAICreateProject,
  onAICreateEmail,
  onAddReaction,
  currentUserId,
  showQuickActions = true
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Check if current user is the message author
  const isAuthor = currentUserId ? message.user.id === currentUserId : false

  // Quick emoji selector (common emojis)
  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🚀', '👀']

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.body)
      toast.success('Message copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy message')
    }
  }

  const handleCopyLink = async () => {
    try {
      onCopyLink()
      const messageLink = `${window.location.origin}${window.location.pathname}#message-${message.id}`
      await navigator.clipboard.writeText(messageLink)
      toast.success('Message link copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy message link')
    }
  }

  const handlePin = () => {
    if (isPinned) {
      onUnpin()
      toast.success('Message unpinned')
    } else {
      onPin()
      toast.success('Message pinned')
    }
  }

  const handleBookmark = () => {
    if (isBookmarked) {
      onUnbookmark()
      toast.success('Bookmark removed')
    } else {
      onBookmark()
      toast.success('Message bookmarked')
    }
  }

  const handleMute = () => {
    if (isMuted) {
      onUnmute()
      toast.success('Notifications unmuted')
    } else {
      onMute()
      toast.success('Notifications muted')
    }
  }

  const handleReply = () => {
    onReply()
    toast.success('Replying to message')
  }

  const handleEdit = () => {
    onEdit()
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDelete()
      toast.success('Message deleted')
    }
  }

  const handleForward = () => {
    onForward()
    toast.success('Forward message dialog opened')
  }

  const handleAISummarize = () => {
    onAISummarize()
    toast.loading('AI is summarizing...')
  }

  const handleAICreateNote = () => {
    onAICreateNote()
    toast.success('Creating note from message...')
  }

  const handleAICreateProject = () => {
    onAICreateProject()
    toast.success('Creating project from message...')
  }

  const handleAICreateEmail = () => {
    onAICreateEmail()
    toast.success('Generating email from message...')
  }

  return (
    <div className="absolute -top-4 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
      <div className="flex items-center gap-1 bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg shadow-lg p-1">
        {/* Quick action buttons */}
        {showQuickActions && (
          <>
            {/* Emoji Reaction Button */}
            <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-muted dark:hover:bg-gray-700"
                  title="Add reaction"
                >
                  <SmilePlus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-auto p-2">
                <DropdownMenuLabel className="text-xs">Quick reactions</DropdownMenuLabel>
                <div className="flex items-center gap-1 pt-1">
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        if (onAddReaction) {
                          onAddReaction(emoji)
                        }
                        setShowEmojiPicker(false)
                      }}
                      className="p-1.5 hover:bg-muted dark:hover:bg-gray-700 rounded text-lg transition-colors"
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Reply Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-muted dark:hover:bg-gray-700"
              onClick={handleReply}
              title="Reply to message"
            >
              <CornerUpRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-muted dark:hover:bg-gray-700"
              title="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Organization Actions */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organization
            </DropdownMenuLabel>

            <DropdownMenuItem onClick={handlePin}>
              {isPinned ? (
                <>
                  <PinOff className="mr-2 h-4 w-4" />
                  Unpin message
                </>
              ) : (
                <>
                  <Pin className="mr-2 h-4 w-4" />
                  Pin message
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleBookmark}>
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="mr-2 h-4 w-4" />
                  Remove bookmark
                </>
              ) : (
                <>
                  <Bookmark className="mr-2 h-4 w-4" />
                  Bookmark message
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Sharing Actions */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Sharing
            </DropdownMenuLabel>

            <DropdownMenuItem onClick={handleForward}>
              <Forward className="mr-2 h-4 w-4" />
              Forward message
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleCopyLink}>
              <Link className="mr-2 h-4 w-4" />
              Copy message link
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copy message text
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* AI Actions */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              AI Actions
            </DropdownMenuLabel>

            <DropdownMenuItem onClick={handleAISummarize}>
              <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
              AI Summarize
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleAICreateNote}>
              <FileText className="mr-2 h-4 w-4 text-blue-500" />
              Create Note
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleAICreateProject}>
              <FolderPlus className="mr-2 h-4 w-4 text-green-500" />
              Create Project
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleAICreateEmail}>
              <Mail className="mr-2 h-4 w-4 text-orange-500" />
              Generate Email
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Notification Settings */}
            <DropdownMenuItem onClick={handleMute}>
              {isMuted ? (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Unmute notifications
                </>
              ) : (
                <>
                  <VolumeX className="mr-2 h-4 w-4" />
                  Mute notifications
                </>
              )}
            </DropdownMenuItem>

            {/* Author-only actions */}
            {isAuthor && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Message actions
                </DropdownMenuLabel>

                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit message
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive dark:text-red-400 dark:focus:text-red-300"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete message
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
