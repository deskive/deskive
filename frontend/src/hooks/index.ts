/**
 * Hooks Index
 * Central export for all custom hooks
 */

export { useRealTimeChat } from './useRealTimeChat';
export { useRealTimeNotifications } from './useRealTimeNotifications';
export { usePresence } from './usePresence';

export type {
  ChatMessage,
  ChatState,
  UseRealTimeChatOptions,
} from './useRealTimeChat';

export type {
  NotificationState,
  UseRealTimeNotificationsOptions,
} from './useRealTimeNotifications';

export type {
  PresenceState,
  UsePresenceOptions,
} from './usePresence';