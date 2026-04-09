/**
 * Workspace Context
 * Manages current workspace state and methods
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Workspace, WorkspaceMember } from '../types';
import { workspaceApi, useWorkspaces as useWorkspacesQuery } from '../lib/api/workspace-api';
import { useAuth } from './AuthContext';
import { useParams, useLocation } from 'react-router-dom';
import { useProjectsStore } from '../stores/useProjectsStore';

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  members: WorkspaceMember[];
  isLoading: boolean;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  refreshWorkspaces: () => Promise<void>;
  refreshCurrentWorkspace: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  createWorkspace: (data: any) => Promise<Workspace>;
  updateWorkspace: (id: string, data: any) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  inviteMember: (email: string, role?: 'admin' | 'member') => Promise<WorkspaceMember>;
  removeMember: (memberId: string) => Promise<void>;
  leaveWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  // Use React Query hook for workspaces - only fetch when authenticated
  const {
    data: workspacesData,
    isLoading: isLoadingWorkspaces,
    refetch: refetchWorkspaces
  } = useWorkspacesQuery({
    enabled: isAuthenticated && !authLoading
  });

  // Use the workspaces from React Query (with fallback to empty array)
  const workspaces = workspacesData || [];
  const isLoading = isLoadingWorkspaces;

  

  // Extract workspace ID from URL and set current workspace
  useEffect(() => {
    if (workspaces.length === 0) {
      return;
    }

    // Try to get workspace ID from URL first (e.g., /workspaces/:workspaceId/...)
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const workspaceIndex = pathSegments.indexOf('workspaces');
    const urlWorkspaceId = workspaceIndex >= 0 && pathSegments[workspaceIndex + 1]
      ? pathSegments[workspaceIndex + 1]
      : null;

    console.log('🔍 WorkspaceContext: URL workspace ID:', urlWorkspaceId);
    console.log('🔍 WorkspaceContext: Available workspaces:', workspaces.map(w => ({ id: w.id, name: w.name })));

    let targetWorkspace: Workspace | null = null;

    // Priority 1: Use workspace from URL if available
    if (urlWorkspaceId) {
      targetWorkspace = workspaces.find(w => w.id === urlWorkspaceId) || null;
      if (targetWorkspace) {
        console.log('✅ WorkspaceContext: Setting workspace from URL:', targetWorkspace.name);
      }
    }

    // Priority 2: Use workspace from localStorage if URL doesn't have one
    if (!targetWorkspace) {
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      if (savedWorkspaceId) {
        targetWorkspace = workspaces.find(w => w.id === savedWorkspaceId) || null;
        if (targetWorkspace) {
          console.log('✅ WorkspaceContext: Setting workspace from localStorage:', targetWorkspace.name);
        }
      }
    }

    // Priority 3: Auto-select first workspace if nothing else works
    if (!targetWorkspace && workspaces.length > 0) {
      targetWorkspace = workspaces[0];
      console.log('✅ WorkspaceContext: Auto-selecting first workspace:', targetWorkspace.name);
    }

    // Only update if we found a workspace and it's different from current
    if (targetWorkspace && targetWorkspace.id !== currentWorkspace?.id) {
      console.log('🔄 WorkspaceContext: Updating current workspace to:', targetWorkspace.name);

      // Only reset projects store when ACTUALLY switching between workspaces
      // Don't reset on initial load (when currentWorkspace is null) - let the data stay
      if (currentWorkspace !== null) {
        console.log('🔄 WorkspaceContext: Switching workspaces, resetting projects store');
        useProjectsStore.getState().reset();
      }

      setCurrentWorkspaceState(targetWorkspace);
      localStorage.setItem('currentWorkspaceId', targetWorkspace.id);
    }
  }, [workspaces, location.pathname]);

  // Load members when current workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      // Fetch members for the current workspace
      workspaceApi.getMembers(currentWorkspace.id)
        .then(setMembers)
        .catch(error => console.error('Failed to load workspace members:', error));
    }
  }, [currentWorkspace?.id]);

  const setCurrentWorkspace = useCallback((workspace: Workspace | null) => {
    // Reset projects store when switching workspaces to prevent showing old workspace's projects
    const resetProjectsStore = useProjectsStore.getState().reset;
    resetProjectsStore();

    setCurrentWorkspaceState(workspace);
    if (workspace) {
      localStorage.setItem('currentWorkspaceId', workspace.id);
    } else {
      localStorage.removeItem('currentWorkspaceId');
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    console.log('📡 WorkspaceContext: Refetching workspaces from API...');
    try {
      await refetchWorkspaces();
      console.log('✅ WorkspaceContext: Workspaces refetched');
    } catch (error) {
      console.error('❌ WorkspaceContext: Failed to refetch workspaces:', error);
    }
  }, [refetchWorkspaces]);

  const refreshCurrentWorkspace = useCallback(async () => {
    if (!currentWorkspace) return;

    try {
      const workspace = await workspaceApi.getWorkspace(currentWorkspace.id);
      setCurrentWorkspaceState(workspace);

      // Refetch workspaces to update the list
      await refetchWorkspaces();
    } catch (error) {
      console.error('Failed to refresh current workspace:', error);
    }
  }, [currentWorkspace, refetchWorkspaces]);

  const refreshMembers = useCallback(async () => {
    if (!currentWorkspace) return;

    try {
      const workspaceMembers = await workspaceApi.getMembers(currentWorkspace.id);
      setMembers(workspaceMembers);
    } catch (error) {
      console.error('Failed to load workspace members:', error);
    }
  }, [currentWorkspace]);

  const createWorkspace = useCallback(async (data: any): Promise<Workspace> => {
    try {
      const workspace = await workspaceApi.createWorkspace(data);
      // Refetch to update the React Query cache
      await refetchWorkspaces();
      return workspace;
    } catch (error) {
      console.error('Failed to create workspace:', error);
      throw error;
    }
  }, [refetchWorkspaces]);

  const updateWorkspace = useCallback(async (id: string, data: any): Promise<Workspace> => {
    try {
      const workspace = await workspaceApi.updateWorkspace(id, data);

      // Update current workspace if it's the one being updated
      if (currentWorkspace?.id === id) {
        setCurrentWorkspaceState(workspace);
      }

      // Refetch to update the React Query cache
      await refetchWorkspaces();

      return workspace;
    } catch (error) {
      console.error('Failed to update workspace:', error);
      throw error;
    }
  }, [currentWorkspace?.id, refetchWorkspaces]);

  const deleteWorkspace = useCallback(async (id: string): Promise<void> => {
    try {
      await workspaceApi.deleteWorkspace(id);

      // Clear current workspace if it's the one being deleted
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(null);
      }

      // Refetch to update the React Query cache
      await refetchWorkspaces();
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      throw error;
    }
  }, [currentWorkspace?.id, refetchWorkspaces, setCurrentWorkspace]);

  const inviteMember = useCallback(async (email: string, role: 'admin' | 'member' = 'member'): Promise<WorkspaceMember> => {
    if (!currentWorkspace) {
      throw new Error('No current workspace');
    }

    try {
      await workspaceApi.inviteMember(currentWorkspace.id, { email, role });
      // Refresh members after inviting
      await refreshMembers();
      // Return a placeholder member (the actual member will be in the refreshed list)
      const invitedMember = members.find(m => m.user?.email === email);
      if (!invitedMember) {
        throw new Error('Failed to find invited member');
      }
      return invitedMember;
    } catch (error) {
      console.error('Failed to invite member:', error);
      throw error;
    }
  }, [currentWorkspace, refreshMembers, members]);

  const removeMember = useCallback(async (memberId: string): Promise<void> => {
    if (!currentWorkspace) {
      throw new Error('No current workspace');
    }

    try {
      await workspaceApi.removeMember(currentWorkspace.id, memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (error) {
      console.error('Failed to remove member:', error);
      throw error;
    }
  }, [currentWorkspace]);

  const leaveWorkspace = useCallback(async (): Promise<void> => {
    if (!currentWorkspace) {
      throw new Error('No current workspace');
    }

    try {
      await workspaceApi.leaveWorkspace(currentWorkspace.id);

      // Clear current workspace
      setCurrentWorkspace(null);

      // Refetch to update the React Query cache
      await refetchWorkspaces();
    } catch (error) {
      console.error('Failed to leave workspace:', error);
      throw error;
    }
  }, [currentWorkspace, setCurrentWorkspace, refetchWorkspaces]);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const value: WorkspaceContextType = useMemo(() => ({
    currentWorkspace,
    workspaces,
    members,
    isLoading,
    setCurrentWorkspace,
    refreshWorkspaces,
    refreshCurrentWorkspace,
    refreshMembers,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    inviteMember,
    removeMember,
    leaveWorkspace,
  }), [
    currentWorkspace,
    workspaces,
    members,
    isLoading,
    setCurrentWorkspace,
    refreshWorkspaces,
    refreshCurrentWorkspace,
    refreshMembers,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    inviteMember,
    removeMember,
    leaveWorkspace,
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export default WorkspaceContext;