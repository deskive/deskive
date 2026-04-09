/**
 * MessageActions and MessageReactions - Integration Example
 *
 * This example demonstrates how to use both components together
 * in a complete message component with state management.
 */

import { useState } from 'react'
import { MessageActions, type Message } from './MessageActions'
import { MessageReactions, type Reaction } from './MessageReactions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'

// Example: Complete Message Component
export function ExampleMessageComponent() {
  const currentUserId = 'user-123' // In real app: useAuth().user.id

  // Example message data
  const [message, setMessage] = useState<Message & { reactions: Reaction[] }>({
    id: 'msg-001',
    body: 'Check out these new designs! What do you think? 🎨',
    user: {
      id: 'user-456',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      image: 'https://i.pravatar.cc/150?u=alice'
    },
    timestamp: new Date(),
    reactions: [
      {
        id: 'reaction-1',
        value: '👍',
        messageId: 'msg-001',
        memberId: 'user-123',
        workspaceId: 'workspace-1',
        count: 3,
        memberIds: ['user-123', 'user-789', 'user-999'],
        users: [
          { id: 'user-123', name: 'You', image: 'https://i.pravatar.cc/150?u=you' },
          { id: 'user-789', name: 'Bob Smith', image: 'https://i.pravatar.cc/150?u=bob' },
          { id: 'user-999', name: 'Carol White', image: 'https://i.pravatar.cc/150?u=carol' }
        ],
        _creationTime: Date.now()
      },
      {
        id: 'reaction-2',
        value: '❤️',
        messageId: 'msg-001',
        memberId: 'user-789',
        workspaceId: 'workspace-1',
        count: 2,
        memberIds: ['user-789', 'user-999'],
        users: [
          { id: 'user-789', name: 'Bob Smith', image: 'https://i.pravatar.cc/150?u=bob' },
          { id: 'user-999', name: 'Carol White', image: 'https://i.pravatar.cc/150?u=carol' }
        ],
        _creationTime: Date.now()
      },
      {
        id: 'reaction-3',
        value: '🎉',
        messageId: 'msg-001',
        memberId: 'user-123',
        workspaceId: 'workspace-1',
        count: 1,
        memberIds: ['user-123'],
        users: [
          { id: 'user-123', name: 'You', image: 'https://i.pravatar.cc/150?u=you' }
        ],
        _creationTime: Date.now()
      }
    ],
    parentMessageId: undefined,
    attachments: []
  })

  // State for message actions
  const [isPinned, setIsPinned] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Handlers
  const handleEdit = () => {
    console.log('Edit message:', message.id)
    setIsEditing(true)
    // Show edit form
  }

  const handleDelete = () => {
    console.log('Delete message:', message.id)
    // Call API to delete message
  }

  const handleReply = () => {
    console.log('Reply to message:', message.id)
    // Open reply form
  }

  const handlePin = () => {
    console.log('Pin message:', message.id)
    setIsPinned(true)
    // Call API to pin message
  }

  const handleUnpin = () => {
    console.log('Unpin message:', message.id)
    setIsPinned(false)
    // Call API to unpin message
  }

  const handleBookmark = () => {
    console.log('Bookmark message:', message.id)
    setIsBookmarked(true)
    // Call API to bookmark message
  }

  const handleUnbookmark = () => {
    console.log('Unbookmark message:', message.id)
    setIsBookmarked(false)
    // Call API to unbookmark message
  }

  const handleForward = () => {
    console.log('Forward message:', message.id)
    // Open forward dialog
  }

  const handleCopyLink = () => {
    console.log('Copy link:', message.id)
    // Copy message link to clipboard (handled in component)
  }

  const handleMute = () => {
    console.log('Mute message:', message.id)
    setIsMuted(true)
    // Call API to mute message notifications
  }

  const handleUnmute = () => {
    console.log('Unmute message:', message.id)
    setIsMuted(false)
    // Call API to unmute message notifications
  }

  const handleAISummarize = () => {
    console.log('AI Summarize:', message.id)
    // Call AI API to summarize message
  }

  const handleAICreateNote = () => {
    console.log('AI Create Note:', message.id)
    // Call AI API to create note from message
  }

  const handleAICreateProject = () => {
    console.log('AI Create Project:', message.id)
    // Call AI API to create project from message
  }

  const handleAICreateEmail = () => {
    console.log('AI Create Email:', message.id)
    // Call AI API to generate email from message
  }

  const handleAddReaction = (emoji: string) => {
    console.log('Add reaction:', emoji, 'to message:', message.id)

    // Optimistic update
    setMessage(prev => {
      const existingReaction = prev.reactions.find(r => r.value === emoji)

      if (existingReaction) {
        // Add user to existing reaction
        return {
          ...prev,
          reactions: prev.reactions.map(r =>
            r.value === emoji
              ? {
                  ...r,
                  count: r.count + 1,
                  memberIds: [...r.memberIds, currentUserId],
                  users: [
                    ...(r.users || []),
                    { id: currentUserId, name: 'You', image: 'https://i.pravatar.cc/150?u=you' }
                  ]
                }
              : r
          )
        }
      } else {
        // Create new reaction
        return {
          ...prev,
          reactions: [
            ...prev.reactions,
            {
              id: `reaction-${Date.now()}`,
              value: emoji,
              messageId: message.id,
              memberId: currentUserId,
              workspaceId: 'workspace-1',
              count: 1,
              memberIds: [currentUserId],
              users: [
                { id: currentUserId, name: 'You', image: 'https://i.pravatar.cc/150?u=you' }
              ],
              _creationTime: Date.now()
            }
          ]
        }
      }
    })

    // Call API to add reaction
    // api.addReaction(message.id, emoji)
  }

  const handleRemoveReaction = (emoji: string) => {
    console.log('Remove reaction:', emoji, 'from message:', message.id)

    // Optimistic update
    setMessage(prev => ({
      ...prev,
      reactions: prev.reactions
        .map(r =>
          r.value === emoji
            ? {
                ...r,
                count: r.count - 1,
                memberIds: r.memberIds.filter((id: string) => id !== currentUserId),
                users: (r.users || []).filter((u: any) => u.id !== currentUserId)
              }
            : r
        )
        .filter(r => r.count > 0) // Remove reactions with 0 count
    }))

    // Call API to remove reaction
    // api.removeReaction(message.id, emoji)
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">MessageActions & MessageReactions Example</h1>

      {/* Example Message */}
      <div className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        {/* Message Header */}
        <div className="flex items-start gap-3 mb-2">
          <Avatar>
            <AvatarImage src={message.user.image} alt={message.user.name} />
            <AvatarFallback>{message.user.name[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm">{message.user.name}</span>
              <span className="text-xs text-muted-foreground">
                {message.timestamp ? format(message.timestamp, 'h:mm a') : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Message Body */}
        <div className="ml-12">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                className="w-full p-2 border rounded resize-none"
                rows={3}
                defaultValue={message.body}
              />
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                  onClick={() => setIsEditing(false)}
                >
                  Save
                </button>
                <button
                  className="px-3 py-1 bg-gray-300 rounded text-sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm">{message.body}</p>
          )}

          {/* Message Actions Component */}
          <MessageActions
            message={message}
            currentUserId={currentUserId}
            isPinned={isPinned}
            isBookmarked={isBookmarked}
            isMuted={isMuted}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReply={handleReply}
            onPin={handlePin}
            onUnpin={handleUnpin}
            onBookmark={handleBookmark}
            onUnbookmark={handleUnbookmark}
            onForward={handleForward}
            onCopyLink={handleCopyLink}
            onMute={handleMute}
            onUnmute={handleUnmute}
            onAISummarize={handleAISummarize}
            onAICreateNote={handleAICreateNote}
            onAICreateProject={handleAICreateProject}
            onAICreateEmail={handleAICreateEmail}
            onAddReaction={handleAddReaction}
          />

          {/* Message Reactions Component */}
          <MessageReactions
            reactions={message.reactions}
            currentUserId={currentUserId}
            onAddReaction={handleAddReaction}
            onRemoveReaction={handleRemoveReaction}
          />
        </div>
      </div>

      {/* Status Display */}
      <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="font-semibold mb-2">Message State:</h3>
        <ul className="space-y-1 text-sm">
          <li>Pinned: {isPinned ? '✅' : '❌'}</li>
          <li>Bookmarked: {isBookmarked ? '✅' : '❌'}</li>
          <li>Muted: {isMuted ? '✅' : '❌'}</li>
          <li>Editing: {isEditing ? '✅' : '❌'}</li>
          <li>Total Reactions: {message.reactions.length}</li>
          <li>
            Reaction Counts:{' '}
            {message.reactions.map(r => `${r.value} ${r.count}`).join(', ')}
          </li>
        </ul>
      </div>
    </div>
  )
}

// Example: Minimal Message Component
export function MinimalMessageExample() {
  const message: Message = {
    id: 'msg-002',
    body: 'Simple message without all the bells and whistles',
    user: {
      id: 'user-456',
      name: 'Bob Smith'
    }
  }

  return (
    <div className="group relative p-4 border rounded">
      <p>{message.body}</p>

      <MessageActions
        message={message}
        onEdit={() => console.log('Edit')}
        onDelete={() => console.log('Delete')}
        onReply={() => console.log('Reply')}
        onPin={() => console.log('Pin')}
        onUnpin={() => console.log('Unpin')}
        onBookmark={() => console.log('Bookmark')}
        onUnbookmark={() => console.log('Unbookmark')}
        onForward={() => console.log('Forward')}
        onCopyLink={() => console.log('Copy Link')}
        onMute={() => console.log('Mute')}
        onUnmute={() => console.log('Unmute')}
        onAISummarize={() => console.log('AI Summarize')}
        onAICreateNote={() => console.log('AI Note')}
        onAICreateProject={() => console.log('AI Project')}
        onAICreateEmail={() => console.log('AI Email')}
      />
    </div>
  )
}

// Example: With Custom Hook
function useMessageState(messageId: string) {
  const [isPinned, setIsPinned] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  // In real app, fetch from API
  // useEffect(() => {
  //   fetchMessageState(messageId).then(setMessageState)
  // }, [messageId])

  return {
    isPinned,
    isBookmarked,
    isMuted,
    setIsPinned,
    setIsBookmarked,
    setIsMuted
  }
}

export function MessageWithHookExample({ message }: { message: Message & { reactions: Reaction[] } }) {
  const currentUserId = 'user-123'
  const { isPinned, isBookmarked, isMuted, setIsPinned, setIsBookmarked, setIsMuted } =
    useMessageState(message.id)

  return (
    <div className="group relative p-4 border rounded">
      <p>{message.body}</p>

      <MessageActions
        message={message}
        currentUserId={currentUserId}
        isPinned={isPinned}
        isBookmarked={isBookmarked}
        isMuted={isMuted}
        onEdit={() => console.log('Edit')}
        onDelete={() => console.log('Delete')}
        onReply={() => console.log('Reply')}
        onPin={() => setIsPinned(true)}
        onUnpin={() => setIsPinned(false)}
        onBookmark={() => setIsBookmarked(true)}
        onUnbookmark={() => setIsBookmarked(false)}
        onForward={() => console.log('Forward')}
        onCopyLink={() => console.log('Copy Link')}
        onMute={() => setIsMuted(true)}
        onUnmute={() => setIsMuted(false)}
        onAISummarize={() => console.log('AI Summarize')}
        onAICreateNote={() => console.log('AI Note')}
        onAICreateProject={() => console.log('AI Project')}
        onAICreateEmail={() => console.log('AI Email')}
      />

      <MessageReactions
        reactions={message.reactions}
        currentUserId={currentUserId}
        onAddReaction={(emoji) => console.log('Add', emoji)}
        onRemoveReaction={(emoji) => console.log('Remove', emoji)}
      />
    </div>
  )
}
