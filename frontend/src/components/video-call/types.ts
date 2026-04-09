/**
 * Video Call Types
 * Shared types for video call components
 */

export interface JoinRequest {
  id: string;
  user_id: string;
  display_name: string;
  message?: string;
  avatar?: string;
  timestamp: string;
  requested_at?: string; // Alias for timestamp (backend format)
}
