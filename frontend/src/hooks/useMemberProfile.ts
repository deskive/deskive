/**
 * Hook for managing member profile panel state
 * Provides global state for showing/hiding member profiles
 */

import { create } from 'zustand';
import type { WorkspaceMember } from '@/types';

interface MemberProfileState {
  isOpen: boolean;
  selectedMember: WorkspaceMember | null;
  openMemberProfile: (member: WorkspaceMember) => void;
  closeMemberProfile: () => void;
}

export const useMemberProfileStore = create<MemberProfileState>((set) => ({
  isOpen: false,
  selectedMember: null,
  openMemberProfile: (member) => set({ isOpen: true, selectedMember: member }),
  closeMemberProfile: () => set({ isOpen: false, selectedMember: null }),
}));

// Convenience hook for easier usage
export function useMemberProfile() {
  const { isOpen, selectedMember, openMemberProfile, closeMemberProfile } = useMemberProfileStore();

  return {
    isOpen,
    selectedMember,
    openMemberProfile,
    closeMemberProfile,
  };
}
