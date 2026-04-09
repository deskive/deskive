/**
 * Team Invitation Types
 * Type definitions for the team invitation system
 */

/**
 * Invitation status enum
 */
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

/**
 * Team role type
 * Must match backend WorkspaceRole enum values
 */
export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Invitation interface
 */
export interface Invitation {
  id: string;
  workspace_id: string;
  email: string;
  name?: string;
  role: TeamRole;
  status: InvitationStatus;
  token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  invited_by: string;
  invited_by_name: string;
  message?: string;
  initial_skills: string[];
  hourly_rate?: number;
  initial_projects: string[];
  accepted_at?: string;
  declined_at?: string;
  cancelled_at?: string;
  decline_reason?: string;
  team_member_id?: string;
  sent_count: number;
  last_sent_at?: string;
  opened_at?: string;
  workspace_name: string;
  workspace_display_name: string;
}

/**
 * Send invitation data interface
 */
export interface SendInvitationData {
  email: string;
  name?: string;
  role: TeamRole;
  message?: string;
  initial_skills?: string[];
  hourly_rate?: number;
  initial_projects?: string[];
}

/**
 * Accept invitation data interface
 */
export interface AcceptInvitationData {
  token: string;
}

/**
 * Invitation details for accept page
 */
export interface InvitationDetails extends Invitation {
  workspace?: {
    id: string;
    name: string;
    description?: string;
    logo?: string;
    industry?: string;
    size?: string;
  };
}

/**
 * Resend invitation response
 */
export interface ResendInvitationResponse {
  success: boolean;
  message: string;
  expiresAt: string;
}

/**
 * Revoke invitation response
 */
export interface RevokeInvitationResponse {
  success: boolean;
  message: string;
}
