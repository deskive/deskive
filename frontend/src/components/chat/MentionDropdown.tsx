import { useEffect, useRef } from 'react'
import { AtSign, Hash, Lock, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string
  name: string
  email: string
  image?: string
  role?: 'admin' | 'member' | 'moderator'
  isOnline?: boolean
  isSpecialMention?: boolean // For @channel, @here, etc.
}

export interface Channel {
  id: string
  name: string
  description?: string
  isPrivate?: boolean
  memberCount?: number
}

export interface MentionDropdownProps {
  /** Array of users available for mention */
  users: User[]
  /** Search query to filter users */
  searchQuery: string
  /** Position of the dropdown relative to the cursor/input */
  position?: { top: number; left: number }
  /** Called when a user is selected */
  onSelect: (user: User) => void
  /** Called when the dropdown should be closed */
  onClose: () => void
  /** Currently selected index for keyboard navigation */
  selectedIndex?: number
  /** Custom class name */
  className?: string
}

// ============================================================================
// MENTION DROPDOWN COMPONENT
// ============================================================================

export function MentionDropdown({
  users,
  searchQuery,
  position = { top: 0, left: 0 },
  onSelect,
  onClose,
  selectedIndex = 0,
  className,
}: MentionDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Don't render if no filtered results
  if (filteredUsers.length === 0) {
    return null
  }

  // Only apply inline position styles if position is non-zero
  const hasCustomPosition = position.top !== 0 || position.left !== 0;

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'z-50 w-80 max-h-60 bg-background border border-border rounded-lg shadow-lg overflow-hidden',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        className
      )}
      style={hasCustomPosition ? {
        position: 'absolute',
        top: position.top,
        left: position.left,
      } : undefined}
    >
      {/* Header */}
      <div className="p-2 border-b border-border bg-muted/30 dark:bg-muted/20">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <AtSign className="h-3 w-3" />
          <span>Mention user</span>
        </div>
      </div>

      {/* User List */}
      <div className="max-h-48 overflow-y-auto">
        {filteredUsers.map((user, index) => (
          <button
            key={user.id}
            className={cn(
              'w-full flex items-center gap-3 p-3 cursor-pointer transition-colors',
              'hover:bg-muted/50 dark:hover:bg-muted/30',
              'focus:outline-none focus:bg-muted/50 dark:focus:bg-muted/30',
              selectedIndex === index && 'bg-muted dark:bg-muted/40'
            )}
            onClick={() => onSelect(user)}
            onMouseEnter={() => {
              // Update parent's selected index if needed
            }}
          >
            {/* Avatar or Special Icon */}
            {user.isSpecialMention ? (
              <div className="h-8 w-8 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            ) : (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}

            {/* User Info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-medium text-sm truncate text-foreground",
                  user.isSpecialMention && "text-primary"
                )}>
                  @{user.name}
                </span>
                {user.role === 'admin' && !user.isSpecialMention && (
                  <Badge variant="outline" className="text-xs">
                    Admin
                  </Badge>
                )}
                {user.role === 'moderator' && !user.isSpecialMention && (
                  <Badge variant="outline" className="text-xs">
                    Mod
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>

            {/* Online Status - only for regular users */}
            {!user.isSpecialMention && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    user.isOnline
                      ? 'bg-green-500 dark:bg-green-400'
                      : 'bg-gray-400 dark:bg-gray-600'
                  )}
                  title={user.isOnline ? 'Online' : 'Offline'}
                />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border bg-muted/30 dark:bg-muted/20">
        <div className="text-xs text-muted-foreground">
          Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">@</kbd> to mention users
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// CHANNEL MENTION DROPDOWN (BONUS COMPONENT)
// ============================================================================

export interface ChannelMentionDropdownProps {
  /** Array of channels available for mention */
  channels: Channel[]
  /** Search query to filter channels */
  searchQuery: string
  /** Position of the dropdown relative to the cursor/input */
  position?: { top: number; left: number }
  /** Called when a channel is selected */
  onSelect: (channel: Channel) => void
  /** Called when the dropdown should be closed */
  onClose: () => void
  /** Currently selected index for keyboard navigation */
  selectedIndex?: number
  /** Custom class name */
  className?: string
}

export function ChannelMentionDropdown({
  channels,
  searchQuery,
  position = { top: 0, left: 0 },
  onSelect,
  onClose,
  selectedIndex = 0,
  className,
}: ChannelMentionDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter channels based on search query
  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Don't render if no filtered results
  if (filteredChannels.length === 0) {
    return null
  }

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'absolute z-50 w-80 max-h-60 bg-background border border-border rounded-lg shadow-lg overflow-hidden',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        className
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Header */}
      <div className="p-2 border-b border-border bg-muted/30 dark:bg-muted/20">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Hash className="h-3 w-3" />
          <span>Mention channel</span>
        </div>
      </div>

      {/* Channel List */}
      <div className="max-h-48 overflow-y-auto">
        {filteredChannels.map((channel, index) => (
          <button
            key={channel.id}
            className={cn(
              'w-full flex items-center gap-3 p-3 cursor-pointer transition-colors',
              'hover:bg-muted/50 dark:hover:bg-muted/30',
              'focus:outline-none focus:bg-muted/50 dark:focus:bg-muted/30',
              selectedIndex === index && 'bg-muted dark:bg-muted/40'
            )}
            onClick={() => onSelect(channel)}
          >
            {/* Channel Icon */}
            <div className="flex items-center justify-center w-8 h-8 bg-muted dark:bg-muted/50 rounded-lg flex-shrink-0">
              {channel.isPrivate ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Hash className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* Channel Info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate text-foreground">
                  #{channel.name}
                </span>
                {channel.isPrivate && (
                  <Badge variant="outline" className="text-xs">
                    Private
                  </Badge>
                )}
              </div>
              {channel.description && (
                <div className="text-xs text-muted-foreground truncate">{channel.description}</div>
              )}
              {channel.memberCount !== undefined && (
                <div className="text-xs text-muted-foreground">
                  {channel.memberCount} {channel.memberCount === 1 ? 'member' : 'members'}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border bg-muted/30 dark:bg-muted/20">
        <div className="text-xs text-muted-foreground">
          Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">#</kbd> to mention channels
        </div>
      </div>
    </div>
  )
}
