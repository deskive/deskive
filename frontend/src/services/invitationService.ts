/**
 * Invitation Service
 * Service for managing team invitations
 */

import { api } from '@/lib/fetch';
import type {
  Invitation,
  SendInvitationData,
  AcceptInvitationData,
  InvitationDetails,
  ResendInvitationResponse,
  RevokeInvitationResponse,
} from '@/types/invitation';

/**
 * Send team invitation
 * @param workspaceId - Workspace ID to send invitation for
 * @param data - Invitation data
 * @returns Promise with created invitation
 */
export const sendInvitation = async (
  workspaceId: string,
  data: SendInvitationData
): Promise<Invitation> => {
  try {
    const response = await api.post<Invitation>(
      `/workspaces/${workspaceId}/members/invite`,
      data
    );
    return response;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send invitation');
  }
};

/**
 * Get all invitations for a workspace
 * @param workspaceId - Workspace ID
 * @returns Promise with array of invitations
 */
export const getInvitations = async (workspaceId: string): Promise<Invitation[]> => {
  try {
    const response = await api.get<Invitation[]>(
      `/workspaces/${workspaceId}/invitations`
    );
    return Array.isArray(response) ? response : [];
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch invitations');
  }
};

/**
 * Get invitation details by token
 * @param token - Invitation token
 * @returns Promise with invitation details
 */
export const getInvitationByToken = async (token: string): Promise<InvitationDetails> => {
  try {
    const response = await api.get<any>(
      `/invitations/${token}`
    );
    return response.invitation || response.data || response;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch invitation details');
  }
};

/**
 * Accept invitation
 * @param data - Accept invitation data with token
 * @returns Promise with success response
 */
export const acceptInvitation = async (data: AcceptInvitationData): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post<{ success: boolean; message: string }>(
      `/invitations/${data.token}/accept`,
      {}
    );
    return response;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to accept invitation');
  }
};

/**
 * Decline invitation
 * @param token - Invitation token
 * @returns Promise with success response
 */
export const declineInvitation = async (token: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post<{ success: boolean; message: string }>(
      `/invitations/${token}/decline`,
      {}
    );
    return response;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to decline invitation');
  }
};

/**
 * Revoke invitation
 * @param workspaceId - Workspace ID
 * @param invitationId - Invitation ID to revoke
 * @returns Promise with revoke response
 */
export const revokeInvitation = async (
  workspaceId: string,
  invitationId: string
): Promise<RevokeInvitationResponse> => {
  try {
    const response = await api.delete<RevokeInvitationResponse>(
      `/workspaces/${workspaceId}/invitations/${invitationId}`
    );
    return response;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to revoke invitation');
  }
};

/**
 * Resend invitation
 * @param workspaceId - Workspace ID
 * @param invitationId - Invitation ID to resend
 * @returns Promise with resend response
 */
export const resendInvitation = async (
  workspaceId: string,
  invitationId: string
): Promise<ResendInvitationResponse> => {
  try {
    const response = await api.post<ResendInvitationResponse>(
      `/workspaces/${workspaceId}/invitations/${invitationId}/resend`,
      {}
    );
    return response;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to resend invitation');
  }
};

/**
 * Check if invitation is expired
 * @param expiresAt - Expiration date string
 * @returns Boolean indicating if invitation is expired
 */
export const isInvitationExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

/**
 * Get time remaining for invitation
 * @param expiresAt - Expiration date string
 * @returns String representation of time remaining
 */
export const getTimeRemaining = (expiresAt: string): string => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) {
    return 'Expired';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
  }
};

export default {
  sendInvitation,
  getInvitations,
  getInvitationByToken,
  acceptInvitation,
  declineInvitation,
  revokeInvitation,
  resendInvitation,
  isInvitationExpired,
  getTimeRemaining,
};
