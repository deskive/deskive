// Import types from app.gateway
import type { RealtimeEvent, UserPresence, AuthenticatedSocket } from './app.gateway';

// Re-export for convenience
export type { RealtimeEvent, UserPresence, AuthenticatedSocket };

// Notification Events
export interface NotificationEvent extends RealtimeEvent {
  type: 'notification' | 'notification_read' | 'notification_deleted' | 'preferences_updated';
  data: {
    id?: string;
    user_id?: string;
    title?: string;
    message?: string;
    is_read?: boolean;
    read_at?: string;
    is_archived?: boolean;
    action_url?: string;
    priority?: string;
    expires_at?: string;
    created_at?: string;
    notification_ids?: string[];
    bulk_update?: boolean;
  };
}

// Presence Events
export interface PresenceEvent extends RealtimeEvent {
  type: 'presence:updated' | 'presence:online' | 'presence:offline';
  data: {
    userId: string;
    status: 'online' | 'away' | 'busy' | 'offline';
    lastSeen?: string;
  };
}

// Connection Events
export interface ConnectionEvent extends RealtimeEvent {
  type: 'connection:success' | 'connection:error' | 'connection:ping' | 'connection:pong';
  data: {
    message?: string;
    userId?: string;
    error?: string;
    code?: string;
  };
}

// Room Events
export interface RoomEvent extends RealtimeEvent {
  type: 'room:joined' | 'room:left' | 'user:joined' | 'user:left';
  data: {
    room: string;
    userId?: string;
  };
}

// Activity Events (for activity streams)
export interface ActivityEvent extends RealtimeEvent {
  type: 'activity:created' | 'activity:updated' | 'activity:deleted';
  data: {
    id: string;
    user_id: string;
    activity_type: string;
    title: string;
    description?: string;
    metadata?: any;
    created_at: string;
  };
}

// System Events
export interface SystemEvent extends RealtimeEvent {
  type: 'system:maintenance' | 'system:announcement' | 'system:update';
  data: {
    message: string;
    severity?: 'info' | 'warning' | 'error';
    action_required?: boolean;
    maintenance_window?: {
      start: string;
      end: string;
    };
  };
}

// Data Sync Events (for live updates)
export interface DataSyncEvent extends RealtimeEvent {
  type: 'data:created' | 'data:updated' | 'data:deleted';
  data: {
    entity_type: string;
    entity_id: string;
    user_id: string;
    changes?: Record<string, any>;
    full_entity?: any;
  };
}

// Chat Events (if implementing chat features)
export interface ChatEvent extends RealtimeEvent {
  type: 'message:sent' | 'message:delivered' | 'message:read' | 'typing:start' | 'typing:stop';
  data: {
    conversation_id?: string;
    message_id?: string;
    sender_id: string;
    recipient_id?: string;
    content?: string;
    message_type?: 'text' | 'image' | 'file' | 'system';
    metadata?: any;
  };
}

// Health/Fitness Events
export interface HealthEvent extends RealtimeEvent {
  type: 'health:goal_achieved' | 'health:reminder' | 'health:metric_updated';
  data: {
    goal_id?: string;
    metric_type?: string;
    value?: number;
    target?: number;
    achievement_type?: string;
    message?: string;
  };
}

// Finance Events
export interface FinanceEvent extends RealtimeEvent {
  type: 'finance:transaction_added' | 'finance:budget_exceeded' | 'finance:goal_progress';
  data: {
    transaction_id?: string;
    budget_id?: string;
    goal_id?: string;
    amount?: number;
    category?: string;
    status?: string;
    alert_type?: string;
  };
}

// Travel Events
export interface TravelEvent extends RealtimeEvent {
  type: 'travel:booking_confirmed' | 'travel:itinerary_updated' | 'travel:reminder';
  data: {
    booking_id?: string;
    itinerary_id?: string;
    trip_id?: string;
    event_type?: string;
    message?: string;
    reminder_time?: string;
  };
}

// AI Events
export interface AIEvent extends RealtimeEvent {
  type: 'ai:task_completed' | 'ai:suggestion_available' | 'ai:analysis_ready';
  data: {
    task_id?: string;
    task_type?: string;
    result?: any;
    suggestion?: string;
    confidence_score?: number;
    analysis_type?: string;
  };
}

// Union type for all possible events
export type LifeOSEvent = 
  | NotificationEvent
  | PresenceEvent
  | ConnectionEvent
  | RoomEvent
  | ActivityEvent
  | SystemEvent
  | DataSyncEvent
  | ChatEvent
  | HealthEvent
  | FinanceEvent
  | TravelEvent
  | AIEvent;

// Event emission options
export interface EmissionOptions {
  userId?: string;
  userIds?: string[];
  room?: string;
  broadcast?: boolean;
  excludeUserId?: string;
  metadata?: Record<string, any>;
}

// WebSocket response wrapper
export interface WebSocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

// Room types for different features
export type RoomType = 
  | `user:${string}`                    // Personal user room
  | `user:${string}:notifications`      // User notifications
  | `user:${string}:presence`           // User presence updates
  | `conversation:${string}`            // Chat conversations
  | `group:${string}`                   // Group rooms
  | `project:${string}`                 // Project-specific rooms
  | 'authenticated'                     // All authenticated users
  | 'system'                           // System announcements
  | 'general'                          // General public room
  | string;                            // Custom room names