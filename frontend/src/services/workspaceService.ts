/**
 * Workspace Service - Complete API wrapper for Workspace Management
 * Handles all workspace-related API calls to backend
 * Base Path: /api/v1/workspacess
 */

import { api } from '../lib/fetch';
import type {
  Workspace,
  CreateWorkspaceData,
  UpdateWorkspaceData,
  UpdateWorkspaceSettingsData,
  WorkspaceStats,
  WorkspaceMember,
  UpdateMemberData,
  MemberWorkload,
  TeamWorkload,
  Invitation,
  CreateInvitationData,
  AcceptInvitationData,
  MemberFilters,
  InvitationFilters,
} from '../types/workspace';

// ============================================================================
// Workspace CRUD Operations
// ============================================================================

/**
 * Create a new workspace
 * POST /api/v1/workspaces
 */
export const createWorkspace = async (data: CreateWorkspaceData): Promise<Workspace> => {
  try {
    console.log('[WorkspaceService] Creating workspace with data:', JSON.stringify(data, null, 2));
    const response = await api.post<Workspace>('/workspaces', data);
    console.log('[WorkspaceService] Workspace created successfully:', response);
    return response;
  } catch (error: any) {
    console.error('[WorkspaceService] Error creating workspace:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      fullError: error
    });
    const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create workspace';
    throw new Error(errorMessage);
  }
};

/**
 * Get all workspaces for current user
 * GET /api/v1/workspaces
 */
export const getUserWorkspaces = async (): Promise<Workspace[]> => {
  try {
    const response = await api.get<Workspace[]>('/workspaces');
    return response;
  } catch (error: any) {
    console.error('Error fetching user workspaces:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch workspaces');
  }
};

/**
 * Get workspace by ID
 * GET /api/v1/workspaces/:workspaceId
 */
export const getWorkspaceById = async (workspaceId: string): Promise<Workspace> => {
  try {
    const response = await api.get<Workspace>(`/workspaces/${workspaceId}`);
    return response;
  } catch (error: any) {
    console.error('Error fetching workspace:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch workspace');
  }
};

/**
 * Update workspace details
 * PUT /api/v1/workspaces/:workspaceId
 */
export const updateWorkspace = async (
  workspaceId: string,
  data: UpdateWorkspaceData
): Promise<Workspace> => {
  try {
    const response = await api.put<Workspace>(`/workspaces/${workspaceId}`, data);
    return response;
  } catch (error: any) {
    console.error('Error updating workspace:', error);
    throw new Error(error.response?.data?.message || 'Failed to update workspace');
  }
};

/**
 * Delete workspace
 * DELETE /api/v1/workspaces/:workspaceId
 */
export const deleteWorkspace = async (workspaceId: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete<{ message: string }>(`/workspaces/${workspaceId}`);
    return response;
  } catch (error: any) {
    console.error('Error deleting workspace:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete workspace');
  }
};

// ============================================================================
// Workspace Settings & Stats
// ============================================================================

/**
 * Update workspace settings
 * PUT /api/v1/workspaces/:workspaceId/settings
 */
export const updateWorkspaceSettings = async (
  workspaceId: string,
  data: UpdateWorkspaceSettingsData
): Promise<Workspace> => {
  try {
    const response = await api.put<Workspace>(`/workspaces/${workspaceId}/settings`, data);
    return response;
  } catch (error: any) {
    console.error('Error updating workspace settings:', error);
    throw new Error(error.response?.data?.message || 'Failed to update settings');
  }
};

/**
 * Get workspace statistics
 * GET /api/v1/workspaces/:workspaceId/stats
 */
export const getWorkspaceStats = async (workspaceId: string): Promise<WorkspaceStats> => {
  try {
    const response = await api.get<WorkspaceStats>(`/workspaces/${workspaceId}/stats`);
    return response;
  } catch (error: any) {
    console.error('Error fetching workspace stats:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch workspace stats');
  }
};

// ============================================================================
// Workspace Members Management
// ============================================================================

/**
 * Get all workspace members
 * GET /api/v1/workspaces/:workspaceId/members
 */
export const getWorkspaceMembers = async (
  workspaceId: string,
  filters?: MemberFilters
): Promise<WorkspaceMember[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.status) params.append('status', filters.status);

    const url = `/workspaces/${workspaceId}/members${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get<WorkspaceMember[]>(url);
    return response;
  } catch (error: any) {
    console.error('Error fetching workspace members:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch members');
  }
};

/**
 * Get current user's membership in workspace
 * GET /api/v1/workspaces/:workspaceId/members/me
 */
export const getCurrentUserMembership = async (workspaceId: string): Promise<WorkspaceMember> => {
  try {
    const response = await api.get<WorkspaceMember>(`/workspaces/${workspaceId}/members/me`);
    return response;
  } catch (error: any) {
    console.error('Error fetching current user membership:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch membership');
  }
};

/**
 * Get workspace member by ID
 * GET /api/v1/workspaces/:workspaceId/members/:memberId
 */
export const getWorkspaceMember = async (
  workspaceId: string,
  memberId: string
): Promise<WorkspaceMember> => {
  try {
    const response = await api.get<WorkspaceMember>(
      `/workspaces/${workspaceId}/members/${memberId}`
    );
    return response;
  } catch (error: any) {
    console.error('Error fetching workspace member:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch member');
  }
};

/**
 * Update workspace member role
 * PATCH /api/v1/workspaces/:workspaceId/members/:memberId/role
 */
export const updateMember = async (
  workspaceId: string,
  memberId: string,
  data: UpdateMemberData
): Promise<WorkspaceMember> => {
  try {
    const response = await api.patch<WorkspaceMember>(
      `/workspaces/${workspaceId}/members/${memberId}/role`,
      data
    );
    return response;
  } catch (error: any) {
    console.error('Error updating member:', error);
    throw new Error(error.response?.data?.message || 'Failed to update member');
  }
};

/**
 * Remove member from workspace
 * DELETE /api/v1/workspaces/:workspaceId/members/:memberId
 */
export const removeMember = async (
  workspaceId: string,
  memberId: string
): Promise<{ message: string }> => {
  try {
    const response = await api.delete<{ message: string }>(
      `/workspaces/${workspaceId}/members/${memberId}`
    );
    return response;
  } catch (error: any) {
    console.error('Error removing member:', error);
    throw new Error(error.response?.data?.message || 'Failed to remove member');
  }
};

// ============================================================================
// Workload Management
// ============================================================================

/**
 * Get member workload
 * GET /api/v1/workspaces/:workspaceId/members/:memberId/workload
 */
export const getMemberWorkload = async (
  workspaceId: string,
  memberId: string
): Promise<MemberWorkload> => {
  try {
    const response = await api.get<MemberWorkload>(
      `/workspaces/${workspaceId}/members/${memberId}/workload`
    );
    return response;
  } catch (error: any) {
    console.error('Error fetching member workload:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch workload');
  }
};

/**
 * Get team workload overview
 * GET /api/v1/workspaces/:workspaceId/workload
 */
export const getTeamWorkload = async (workspaceId: string): Promise<TeamWorkload> => {
  try {
    const response = await api.get<TeamWorkload>(`/workspaces/${workspaceId}/workload`);
    return response;
  } catch (error: any) {
    console.error('Error fetching team workload:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch team workload');
  }
};

// ============================================================================
// Invitation Management (Workspace-Scoped)
// ============================================================================

/**
 * Create invitation to join workspace
 * POST /api/v1/workspaces/:workspaceId/invitations
 */
export const createInvitation = async (
  workspaceId: string,
  data: CreateInvitationData
): Promise<Invitation> => {
  try {
    const response = await api.post<Invitation>(
      `/workspaces/${workspaceId}/invitations`,
      data
    );
    return response;
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    throw new Error(error.response?.data?.message || 'Failed to create invitation');
  }
};

/**
 * Get workspace invitations
 * GET /api/v1/workspaces/:workspaceId/invitations
 */
export const getWorkspaceInvitations = async (
  workspaceId: string,
  filters?: InvitationFilters
): Promise<Invitation[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);

    const url = `/workspaces/${workspaceId}/invitations${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get<Invitation[]>(url);
    return response;
  } catch (error: any) {
    console.error('Error fetching workspace invitations:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch invitations');
  }
};

/**
 * Cancel invitation
 * DELETE /api/v1/workspaces/:workspaceId/invitations/:invitationId
 */
export const cancelInvitation = async (
  workspaceId: string,
  invitationId: string
): Promise<{ message: string }> => {
  try {
    const response = await api.delete<{ message: string }>(
      `/workspaces/${workspaceId}/invitations/${invitationId}`
    );
    return response;
  } catch (error: any) {
    console.error('Error cancelling invitation:', error);
    throw new Error(error.response?.data?.message || 'Failed to cancel invitation');
  }
};

/**
 * Resend invitation
 * POST /api/v1/workspaces/:workspaceId/invitations/:invitationId/resend
 */
export const resendInvitation = async (
  workspaceId: string,
  invitationId: string
): Promise<Invitation> => {
  try {
    const response = await api.post<Invitation>(
      `/workspaces/${workspaceId}/invitations/${invitationId}/resend`
    );
    return response;
  } catch (error: any) {
    console.error('Error resending invitation:', error);
    throw new Error(error.response?.data?.message || 'Failed to resend invitation');
  }
};

// ============================================================================
// Public Invitation Endpoints (Token-Based)
// ============================================================================

/**
 * Get invitation by token
 * GET /api/v1/workspaces/invitations/:token
 */
export const getInvitationByToken = async (token: string): Promise<Invitation> => {
  try {
    const response = await api.get<Invitation>(`/workspaces/invitations/${token}`);
    return response;
  } catch (error: any) {
    console.error('Error fetching invitation by token:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch invitation');
  }
};

/**
 * Accept invitation
 * POST /api/v1/workspaces/invitations/accept/:token
 */
export const acceptInvitation = async (
  token: string,
  data: AcceptInvitationData
): Promise<WorkspaceMember> => {
  try {
    const response = await api.post<WorkspaceMember>(
      `/workspaces/invitations/accept/${token}`,
      data
    );
    return response;
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    throw new Error(error.response?.data?.message || 'Failed to accept invitation');
  }
};

/**
 * Decline invitation
 * POST /api/v1/workspaces/invitations/decline/:token
 */
export const declineInvitation = async (token: string): Promise<{ message: string }> => {
  try {
    const response = await api.post<{ message: string }>(
      `/workspaces/invitations/decline/${token}`
    );
    return response;
  } catch (error: any) {
    console.error('Error declining invitation:', error);
    throw new Error(error.response?.data?.message || 'Failed to decline invitation');
  }
};

// ============================================================================
// Billing & Plans
// ============================================================================

/**
 * Get available billing plans for a workspace
 * GET /api/v1/workspaces/:workspaceId/billing/plans
 */
export const getBillingPlans = async (workspaceId: string): Promise<any[]> => {
  try {
    const response = await api.get<{ plans: any[] }>(`/workspaces/${workspaceId}/billing/plans`);
    // API returns { plans: [...] }, extract the plans array
    return response.plans || [];
  } catch (error: any) {
    console.error('Error fetching billing plans:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch billing plans');
  }
};

// ============================================================================
// Export all functions as default object
// ============================================================================

const workspaceService = {
  // Workspace CRUD
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,

  // Settings & Stats
  updateWorkspaceSettings,
  getWorkspaceStats,

  // Members
  getWorkspaceMembers,
  getCurrentUserMembership,
  getWorkspaceMember,
  updateMember,
  removeMember,

  // Workload
  getMemberWorkload,
  getTeamWorkload,

  // Invitations (Workspace-scoped)
  createInvitation,
  getWorkspaceInvitations,
  cancelInvitation,
  resendInvitation,

  // Invitations (Public/Token-based)
  getInvitationByToken,
  acceptInvitation,
  declineInvitation,

  // Billing & Plans
  getBillingPlans,
};

export default workspaceService;
