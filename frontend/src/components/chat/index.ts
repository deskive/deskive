/**
 * Chat Components Index
 *
 * Central export point for all chat-related components
 */

export { MessageRenderer } from './MessageRenderer'
export { MessageItem } from './MessageItem'
export { MessageInput } from './MessageInput'
export { MessageActions } from './MessageActions'
export { MessageReactions } from './MessageReactions'
export { MentionDropdown, ChannelMentionDropdown } from './MentionDropdown'
export { ThreadSidebar } from './ThreadSidebar'
export { MessageSelectionAIToolbar } from './MessageSelectionAIToolbar'
export { AIActionResultModal } from './AIActionResultModal'
export { ScheduleMessageModal } from './ScheduleMessageModal'
export { ScheduledMessagesPanel } from './ScheduledMessagesPanel'
export { EditScheduledMessageModal } from './EditScheduledMessageModal'
export { default as MessageRendererExamples } from './MessageRenderer.example'

// Export types for convenience
export type { MessageRendererProps } from './MessageRenderer'
export type { MessageItemProps, Message, User, Reaction, Attachment } from './MessageItem'
export type { MessageInputProps } from './MessageInput'
export type { MessageActionsProps, Message as MessageActionsMessage } from './MessageActions'
export type { MessageReactionsProps, Reaction as MessageReaction } from './MessageReactions'
export type {
  MentionDropdownProps,
  ChannelMentionDropdownProps,
  User as MentionUser,
  Channel
} from './MentionDropdown'
export type { ThreadSidebarProps } from './ThreadSidebar'
export type { SelectedMessage, AIAction, AIActionResult } from './MessageSelectionAIToolbar'
