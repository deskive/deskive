import { useState } from 'react'
import { CornerUpRight, Download, MoreVertical, Pencil, Trash2, Reply, Smile, Loader2, FileText, Calendar, FolderOpen, ExternalLink, Check, HardDrive, BarChart2, Video, Lock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageRenderer } from './MessageRenderer'
import { PollMessage } from './PollMessage'
import { cn } from '@/lib/utils'

// Helper to strip HTML tags for plain text display (e.g., reply previews)
const stripHtml = (html: string): string => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

// Message types
export interface User {
  id: string
  name: string
  image?: string
  email?: string
}

export interface Reaction {
  id: string
  value: string
  count: number
  memberIds: string[]
}

export interface Attachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  isPending?: boolean // Flag to show skeleton while uploading
}

// Poll types for linked content
export interface PollOption {
  id: string
  text: string
  voteCount: number
}

export interface Poll {
  id: string
  question: string
  options: PollOption[]
  isOpen: boolean
  showResultsBeforeVoting: boolean
  createdBy: string
  totalVotes: number
  userVotedOptionId?: string
}

export interface LinkedContent {
  id: string
  title?: string
  name?: string
  type: 'notes' | 'events' | 'files' | 'drive' | 'poll' | 'youtube'
  subtitle?: string
  url?: string
  thumbnail?: string
  metadata?: any
  // Drive-specific fields
  driveFileUrl?: string
  driveThumbnailUrl?: string
  driveMimeType?: string
  driveFileSize?: number
  // Poll-specific fields
  poll?: Poll
}

export interface Message {
  id: string
  body: string
  user: User
  timestamp: Date
  image?: string
  audio?: string
  video?: string
  fileName?: string
  attachments?: Attachment[]
  linked_content?: LinkedContent[]
  reactions?: Reaction[]
  parentMessageId?: string
  threadCount?: number
  updatedAt?: Date
  isEdited?: boolean
  isOptimistic?: boolean // Flag for optimistic UI (reduces opacity)
  read_by_count?: number // Number of users who read this message
}

// Member info for reaction tooltips
export interface MemberInfo {
  id: string
  name: string
  avatarUrl?: string
}

export interface MessageItemProps {
  message: Message
  messages?: Message[]
  currentUserId?: string
  isSelectionMode?: boolean
  isSelected?: boolean
  isPinned?: boolean
  isMuted?: boolean
  isBookmarked?: boolean
  showParentMessage?: boolean
  getMemberInfo?: (userId: string) => MemberInfo | null
  onEdit?: (messageId: string, newContent: string) => void
  onDelete?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onReply?: (message: Message) => void
  onOpenThread?: (message: Message) => void
  onPin?: (messageId: string) => void
  onUnpin?: (messageId: string) => void
  onForward?: (message: Message) => void
  onMute?: (messageId: string) => void
  onUnmute?: (messageId: string) => void
  onBookmark?: (messageId: string) => void
  onUnbookmark?: (messageId: string) => void
  onSelect?: (messageId: string) => void
  onLinkedContentClick?: (content: LinkedContent) => void
  onDownloadAttachment?: (attachmentId: string, fileName: string) => void
  className?: string
}

export function MessageItem({
  message,
  messages = [],
  currentUserId,
  isSelectionMode = false,
  isSelected = false,
  isPinned = false,
  isMuted = false,
  isBookmarked = false,
  showParentMessage = true,
  getMemberInfo,
  onEdit,
  onDelete,
  onReact,
  onReply,
  onOpenThread,
  onPin,
  onUnpin,
  onForward,
  onMute,
  onUnmute,
  onBookmark,
  onUnbookmark,
  onSelect,
  onLinkedContentClick,
  onDownloadAttachment,
  className,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.body)
  const [isHovered, setIsHovered] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Common emoji reactions
  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥']

  // Find parent message if this is a reply
  const parentMessage = showParentMessage && message.parentMessageId
    ? messages.find(m => m.id === message.parentMessageId)
    : null

  // Count thread replies
  const threadReplies = messages.filter(m => m.parentMessageId === message.id)
  const threadCount = message.threadCount || threadReplies.length

  // Format timestamp
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Download handler for attachments
  const handleDownload = (attachment: Attachment) => {
    // If we have a proper download handler (uses files API), use it
    if (onDownloadAttachment && attachment.id) {
      onDownloadAttachment(attachment.id, attachment.name)
      return
    }

    // Fallback: direct URL download (for legacy or external URLs)
    try {
      const link = document.createElement('a')
      link.href = attachment.url
      link.download = attachment.name
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Download failed:', error)
      window.open(attachment.url, '_blank')
    }
  }

  // Handle edit save
  const handleEditSave = () => {
    if (editContent.trim() && editContent !== message.body) {
      onEdit?.(message.id, editContent)
    }
    setIsEditing(false)
  }

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditContent(message.body)
    setIsEditing(false)
  }

  // Handle message click in selection mode
  const handleClick = () => {
    if (isSelectionMode) {
      onSelect?.(message.id)
    }
  }

  // Check if message is from current user
  const isCurrentUser = currentUserId === message.user.id;

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        'flex gap-3 group p-3 rounded-lg transition-all duration-200',
        isCurrentUser
          ? 'flex-row-reverse hover:bg-muted/30 dark:hover:bg-muted/20'
          : 'hover:bg-muted/30 dark:hover:bg-muted/20',
        isSelectionMode && 'cursor-pointer select-none',
        isSelected && 'border-2 border-blue-200 dark:border-blue-800',
        message.isOptimistic && 'opacity-50', // Reduce opacity for optimistic messages
        className
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Selection Checkbox - shown when in selection mode */}
      {isSelectionMode && (
        <div className="flex items-center justify-center flex-shrink-0">
          <div
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
              isSelected
                ? "bg-blue-500 border-blue-500 text-white"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            )}
          >
            {isSelected && <Check className="w-3.5 h-3.5" />}
          </div>
        </div>
      )}

      {/* Avatar */}
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarImage src={message.user.image} alt={message.user.name} />
        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
          {message.user.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn(
        "flex-1 min-w-0",
        isCurrentUser && "flex flex-col items-end" // Align right for current user
      )}>
        {/* Header: Name, Timestamp, and Actions */}
        <div className={cn(
          "flex items-baseline gap-2 mb-1",
          isCurrentUser && "flex-row-reverse" // Reverse for current user
        )}>
          <div className={cn(
            "flex items-baseline gap-2 flex-wrap",
            isCurrentUser && "flex-row-reverse" // Reverse for current user
          )}>
            <span className="font-semibold text-sm text-foreground">
              {message.user.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
              {message.isEdited && ' (edited)'}
            </span>

            {/* Message Actions Dropdown - moved here */}
            {!isSelectionMode && (
              <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsDropdownOpen(true)
                    }}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onReply?.(message)}>
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </DropdownMenuItem>
                {currentUserId === message.user.id && (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete?.(message.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                {isPinned ? (
                  <DropdownMenuItem onClick={() => onUnpin?.(message.id)}>
                    Unpin Message
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onPin?.(message.id)}>
                    Pin Message
                  </DropdownMenuItem>
                )}
                {isBookmarked ? (
                  <DropdownMenuItem onClick={() => onUnbookmark?.(message.id)}>
                    Remove Bookmark
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onBookmark?.(message.id)}>
                    Bookmark
                  </DropdownMenuItem>
                )}
                {onForward && (
                  <DropdownMenuItem onClick={() => onForward(message)}>
                    Forward
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            )}

            {isPinned && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                📌 Pinned
              </span>
            )}
            {isBookmarked && (
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                🔖 Bookmarked
              </span>
            )}
            {(message as any).isEncrypted && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Encrypted
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This message is end-to-end encrypted</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Algorithm: {(message as any).encryptionMetadata?.algorithm || 'x25519-xsalsa20-poly1305'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Parent Message (Reply Indicator) */}
        {parentMessage && (
          <div className="mb-2 pl-3 border-l-2 border-muted-foreground/30 dark:border-muted-foreground/20">
            <div className="text-xs text-muted-foreground mb-1">
              Replying to {parentMessage.user.name}
            </div>
            <div className="text-xs text-muted-foreground line-clamp-2">
              {stripHtml(parentMessage.body)}
            </div>
          </div>
        )}

        {/* Edit Mode */}
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleEditSave()
                } else if (e.key === 'Escape') {
                  handleEditCancel()
                }
              }}
              className="w-full"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEditSave}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleEditCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Message Body with Rich Text Formatting */}
            <MessageRenderer
              text={message.body}
            />

            {/* Attachments - Modern Array Format */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment, index) => (
                  <div key={attachment.id || index} className="border rounded-lg p-3 bg-muted/20 dark:bg-muted/10">
                    {attachment.isPending ? (
                      // Show skeleton while uploading
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Uploading {attachment.name}...</span>
                        </div>
                        <Skeleton className="h-32 w-full max-w-sm" />
                      </div>
                    ) : attachment.type?.startsWith('image/') ? (
                      <div>
                        <div className="relative group">
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="max-w-sm rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(attachment.url, '_blank')}
                            onError={(e) => {
                              console.error('Image failed to load:', attachment.name)
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                            onClick={() => handleDownload(attachment)}
                            title="Download image"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          📎 {attachment.name} ({(attachment.size / 1024 / 1024).toFixed(1)} MB)
                        </div>
                      </div>
                    ) : attachment.type?.startsWith('video/') ? (
                      <div>
                        <div className="relative group">
                          <video
                            controls
                            className="max-w-sm rounded-lg border"
                            preload="metadata"
                          >
                            <source src={attachment.url} type={attachment.type} />
                            Your browser does not support video playback.
                          </video>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                            onClick={() => handleDownload(attachment)}
                            title="Download video"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          📎 {attachment.name} ({(attachment.size / 1024 / 1024).toFixed(1)} MB)
                        </div>
                      </div>
                    ) : attachment.type?.startsWith('audio/') ? (
                      <div>
                        <div className="relative group">
                          <audio controls className="w-full max-w-sm" preload="metadata">
                            <source src={attachment.url} type={attachment.type} />
                            Your browser does not support audio playback.
                          </audio>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                            onClick={() => handleDownload(attachment)}
                            title="Download audio"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          📎 {attachment.name} ({(attachment.size / 1024 / 1024).toFixed(1)} MB)
                        </div>
                      </div>
                    ) : (
                      // Generic file attachment
                      <div className="group flex items-center gap-3 p-2 bg-background dark:bg-background rounded border hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="text-2xl">📄</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{attachment.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(attachment.size / 1024 / 1024).toFixed(1)} MB • {attachment.type}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(attachment)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Legacy Single File Support */}
            {!message.attachments && (
              <>
                {message.image && (
                  <div className="mt-2">
                    <div className="relative group max-w-sm">
                      <img
                        src={message.image}
                        alt="Uploaded image"
                        className="rounded-lg border cursor-pointer hover:opacity-90 transition-opacity w-full"
                        onClick={() => window.open(message.image, '_blank')}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                        onClick={() => {
                          // Legacy image format - direct URL download
                          const link = document.createElement('a')
                          link.href = message.image!
                          link.download = 'image'
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        }}
                        title="Download image"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {message.audio && (
                  <div className="mt-2 max-w-sm">
                    <audio controls className="w-full" preload="metadata">
                      <source src={message.audio} type="audio/webm" />
                      <source src={message.audio} type="audio/ogg" />
                      Your browser does not support audio playback.
                    </audio>
                    <div className="text-xs text-muted-foreground mt-2">
                      📎 {message.fileName || 'Audio recording'}
                    </div>
                  </div>
                )}

                {message.video && (
                  <div className="mt-2 max-w-sm">
                    <video controls className="w-full rounded-lg border" preload="metadata">
                      <source src={message.video} type="video/webm" />
                      <source src={message.video} type="video/mp4" />
                      Your browser does not support video playback.
                    </video>
                    <div className="text-xs text-muted-foreground mt-2">
                      📎 {message.fileName || 'Video recording'}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Linked Content (Notes, Events, Files) */}
            {message.linked_content && message.linked_content.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.linked_content.map((item, index) => {
                  // Get icon and colors based on content type
                  const getContentStyle = () => {
                    switch (item.type) {
                      case 'notes':
                        return {
                          icon: <FileText className="h-4 w-4" />,
                          bgColor: 'bg-blue-50 dark:bg-blue-950/50',
                          borderColor: 'border-blue-200 dark:border-blue-800',
                          iconColor: 'text-blue-500',
                          label: 'Note'
                        }
                      case 'events':
                        return {
                          icon: <Calendar className="h-4 w-4" />,
                          bgColor: 'bg-orange-50 dark:bg-orange-950/50',
                          borderColor: 'border-orange-200 dark:border-orange-800',
                          iconColor: 'text-orange-500',
                          label: 'Event'
                        }
                      case 'files':
                        return {
                          icon: <FolderOpen className="h-4 w-4" />,
                          bgColor: 'bg-purple-50 dark:bg-purple-950/50',
                          borderColor: 'border-purple-200 dark:border-purple-800',
                          iconColor: 'text-purple-500',
                          label: 'File'
                        }
                      case 'drive':
                        return {
                          icon: <HardDrive className="h-4 w-4" />,
                          bgColor: 'bg-green-50 dark:bg-green-950/50',
                          borderColor: 'border-green-200 dark:border-green-800',
                          iconColor: 'text-green-600',
                          label: 'Drive'
                        }
                      case 'poll':
                        return {
                          icon: <BarChart2 className="h-4 w-4" />,
                          bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
                          borderColor: 'border-indigo-200 dark:border-indigo-800',
                          iconColor: 'text-indigo-600',
                          label: 'Poll'
                        }
                      case 'youtube':
                        return {
                          icon: <Video className="h-4 w-4" />,
                          bgColor: 'bg-red-50 dark:bg-red-950/50',
                          borderColor: 'border-red-200 dark:border-red-800',
                          iconColor: 'text-red-600',
                          label: 'YouTube'
                        }
                      default:
                        return {
                          icon: <FileText className="h-4 w-4" />,
                          bgColor: 'bg-gray-50 dark:bg-gray-950/50',
                          borderColor: 'border-gray-200 dark:border-gray-800',
                          iconColor: 'text-gray-500',
                          label: 'Content'
                        }
                    }
                  }

                  const style = getContentStyle()

                  // Render poll using PollMessage component
                  if (item.type === 'poll' && item.poll) {
                    return (
                      <div key={`poll-${item.id}-${index}`}>
                        <PollMessage
                          poll={item.poll}
                          messageId={message.id}
                          currentUserId={currentUserId || ''}
                          userVotedOptionId={item.poll.userVotedOptionId}
                        />
                      </div>
                    )
                  }

                  // Render other linked content types
                  return (
                    <div
                      key={`${item.type}-${item.id}-${index}`}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all',
                        style.bgColor,
                        style.borderColor
                      )}
                      onClick={() => {
                        if (onLinkedContentClick) {
                          onLinkedContentClick(item)
                        }
                      }}
                    >
                      <div className={cn('flex-shrink-0 p-2 rounded-md', style.bgColor, style.iconColor)}>
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded', style.bgColor, style.iconColor)}>
                            {style.label}
                          </span>
                          <span className="font-medium text-sm truncate">{item.title || item.name}</span>
                        </div>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
                        )}
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Message Reactions */}
            <div className="flex flex-wrap gap-1 mt-2 items-center">
              {message.reactions && message.reactions.length > 0 && (
                <TooltipProvider delayDuration={300}>
                  {message.reactions.map((reaction) => {
                    // Get names of users who reacted
                    const reactedUsers = reaction.memberIds.map(memberId => {
                      if (memberId === currentUserId) return 'You'
                      const memberInfo = getMemberInfo?.(memberId)
                      return memberInfo?.name || 'Unknown'
                    })

                    // Format the tooltip text
                    const formatReactedUsers = () => {
                      if (reactedUsers.length === 0) return ''
                      if (reactedUsers.length === 1) return reactedUsers[0]
                      if (reactedUsers.length === 2) return `${reactedUsers[0]} and ${reactedUsers[1]}`
                      if (reactedUsers.length === 3) return `${reactedUsers[0]}, ${reactedUsers[1]}, and ${reactedUsers[2]}`
                      return `${reactedUsers[0]}, ${reactedUsers[1]}, and ${reactedUsers.length - 2} others`
                    }

                    return (
                      <Tooltip key={reaction.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onReact?.(message.id, reaction.value)}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm',
                              'border border-border bg-muted/30 dark:bg-muted/20',
                              'hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors',
                              reaction.memberIds.includes(currentUserId || '') &&
                                'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                            )}
                          >
                            <span>{reaction.value}</span>
                            <span className="text-xs text-muted-foreground">{reaction.count}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm font-medium">{formatReactedUsers()}</p>
                          <p className="text-xs text-muted-foreground">reacted with {reaction.value}</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </TooltipProvider>
              )}

              {/* Add Reaction Button */}
              {!isSelectionMode && (
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 rounded-full",
                        isHovered || showEmojiPicker ? "opacity-100" : "opacity-0",
                        "transition-opacity"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowEmojiPicker(true)
                      }}
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80 p-3"
                    align="start"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Quick Reactions</h4>
                        <div className="grid grid-cols-8 gap-1">
                          {quickEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                onReact?.(message.id, emoji)
                                setShowEmojiPicker(false)
                              }}
                              className="h-10 w-10 flex items-center justify-center text-2xl rounded-md hover:bg-muted transition-colors"
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <h4 className="text-sm font-medium mb-2">More Reactions</h4>
                        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                          {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
                            '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
                            '😘', '😗', '😙', '😚', '🤗', '🤩', '🤔', '🤨',
                            '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮',
                            '🤐', '😯', '😪', '😫', '🥱', '😴', '😌', '😛',
                            '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙁',
                            '☹️', '😖', '😞', '😟', '😤', '😢', '😭', '😦',
                            '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                onReact?.(message.id, emoji)
                                setShowEmojiPicker(false)
                              }}
                              className="h-10 w-10 flex items-center justify-center text-2xl rounded-md hover:bg-muted transition-colors"
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Thread Reply Count */}
            {threadCount > 0 && onOpenThread && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-auto p-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors"
                onClick={() => onOpenThread(message)}
              >
                <CornerUpRight className="h-3 w-3 mr-1" />
                <span className="font-medium">
                  {threadCount} {threadCount === 1 ? 'reply' : 'replies'}
                </span>
                {threadReplies.length > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    Last reply {formatTime(new Date(threadReplies[threadReplies.length - 1].timestamp))}
                  </span>
                )}
              </Button>
            )}

            {/* Read Receipts */}
            {message.read_by_count !== undefined && message.read_by_count > 0 && message.user.id === currentUserId && (
              <div className="mt-1 text-xs text-muted-foreground">
                Read by {message.read_by_count} {message.read_by_count === 1 ? 'person' : 'people'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
