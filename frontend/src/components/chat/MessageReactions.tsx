import { useState } from 'react'
import { Plus, Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

// Reaction type interface
export interface Reaction {
  id: string
  value: string // emoji
  messageId: string
  memberId: string
  workspaceId: string
  count: number
  memberIds: string[]
  users?: Array<{
    id: string
    name: string
    image?: string
    email?: string
  }>
  _creationTime: number
}

export interface MessageReactionsProps {
  reactions: Reaction[]
  currentUserId: string
  onAddReaction: (emoji: string) => void
  onRemoveReaction: (emoji: string) => void
  onShowEmojiPicker?: () => void
  maxVisibleReactions?: number
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  onShowEmojiPicker,
  maxVisibleReactions = 10
}) => {
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null)

  // Quick emoji picker options
  const quickEmojis = [
    '👍', '❤️', '😂', '😮', '😢', '🎉',
    '🚀', '👀', '🔥', '💯', '✨', '💪'
  ]

  // Group reactions by emoji value
  const groupedReactions = reactions.reduce((acc, reaction) => {
    const existing = acc.find((r) => r.value === reaction.value)
    if (existing) {
      existing.count = reaction.count
      existing.memberIds = reaction.memberIds
      existing.users = reaction.users || []
    } else {
      acc.push({
        value: reaction.value,
        count: reaction.count,
        memberIds: reaction.memberIds,
        users: reaction.users || [],
        id: reaction.id
      })
    }
    return acc
  }, [] as Array<{
    value: string
    count: number
    memberIds: string[]
    users: Array<{ id: string; name: string; image?: string; email?: string }>
    id: string
  }>)

  // Check if current user has reacted with a specific emoji
  const hasUserReacted = (memberIds: string[]) => {
    return memberIds.includes(currentUserId)
  }

  // Handle reaction toggle (add or remove)
  const handleReactionToggle = (emoji: string, memberIds: string[]) => {
    if (hasUserReacted(memberIds)) {
      onRemoveReaction(emoji)
    } else {
      onAddReaction(emoji)
    }
  }

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Format reaction tooltip text
  const getTooltipText = (users: any[], count: number) => {
    if (users.length === 0) {
      return `${count} reaction${count === 1 ? '' : 's'}`
    }

    const userNames = users.map((u) => {
      if (u.id === currentUserId) {
        return 'You'
      }
      return u.name
    })

    if (userNames.length === 1) {
      return userNames[0]
    } else if (userNames.length === 2) {
      return `${userNames[0]} and ${userNames[1]}`
    } else if (userNames.length === 3) {
      return `${userNames[0]}, ${userNames[1]}, and ${userNames[2]}`
    } else {
      const remaining = userNames.length - 2
      return `${userNames[0]}, ${userNames[1]}, and ${remaining} other${remaining === 1 ? '' : 's'}`
    }
  }

  if (reactions.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <div className="mt-2 flex items-center gap-1 flex-wrap">
        {/* Existing Reactions */}
        {groupedReactions.slice(0, maxVisibleReactions).map((reaction) => {
          const hasReacted = hasUserReacted(reaction.memberIds)
          const isHovered = hoveredReaction === reaction.value

          return (
            <Tooltip key={reaction.id}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'group relative flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200',
                    'border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    hasReacted
                      ? 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25 dark:bg-primary/20 dark:border-primary/40 dark:hover:bg-primary/30'
                      : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                  onClick={() => handleReactionToggle(reaction.value, reaction.memberIds)}
                  onMouseEnter={() => setHoveredReaction(reaction.value)}
                  onMouseLeave={() => setHoveredReaction(null)}
                  aria-label={`${reaction.value} reaction, ${reaction.count} ${reaction.count === 1 ? 'person' : 'people'}`}
                >
                  <span className="text-base leading-none">{reaction.value}</span>
                  <span className={cn(
                    'font-semibold tabular-nums',
                    hasReacted && 'text-primary dark:text-primary'
                  )}>
                    {reaction.count}
                  </span>

                  {/* Subtle hover effect indicator */}
                  {isHovered && (
                    <span className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {/* Show user avatars in tooltip */}
                {reaction.users && reaction.users.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex -space-x-2">
                      {reaction.users.slice(0, 5).map((user) => (
                        <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={user.image} alt={user.name} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {reaction.users.length > 5 && (
                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                          +{reaction.users.length - 5}
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium">
                      {getTooltipText(reaction.users, reaction.count)} reacted with {reaction.value}
                    </p>
                  </div>
                )}
                {(!reaction.users || reaction.users.length === 0) && (
                  <p className="text-xs">{getTooltipText([], reaction.count)}</p>
                )}
              </TooltipContent>
            </Tooltip>
          )
        })}

        {/* Show more indicator if there are hidden reactions */}
        {groupedReactions.length > maxVisibleReactions && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted hover:border-border transition-all">
                +{groupedReactions.length - maxVisibleReactions}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {groupedReactions.length - maxVisibleReactions} more reaction
                {groupedReactions.length - maxVisibleReactions === 1 ? '' : 's'}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Add Reaction Button with Emoji Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-full hover:bg-muted dark:hover:bg-gray-700"
              title="Add reaction"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Smile className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Pick a reaction
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onAddReaction(emoji)
                    }}
                    className="p-2 hover:bg-muted dark:hover:bg-gray-700 rounded text-xl transition-colors flex items-center justify-center"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {onShowEmojiPicker && (
                <>
                  <div className="border-t pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={onShowEmojiPicker}
                    >
                      <Smile className="h-3 w-3 mr-1.5" />
                      More emojis
                    </Button>
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  )
}
