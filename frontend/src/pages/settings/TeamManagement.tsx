/**
 * Team Management Page
 * Complete team member management interface with invitations
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  AlertCircle,
  Filter,
  X,
  Building2,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

// Components
import TeamMemberCard from '@/components/team/TeamMemberCard';
import SendInvitationModal from '@/components/invitation/SendInvitationModal';
import InvitationList from '@/components/invitation/InvitationList';
import Modal from '@/components/ui/Modal';

// Services
import {
  getUserWorkspaces,
  getWorkspaceMembers,
  getWorkspaceStats,
  updateMember,
  removeMember,
  getCurrentUserMembership,
} from '@/services/workspaceService';

// Types
import type { Workspace, WorkspaceMember, WorkspaceStats, MemberRole } from '@/types/workspace';
import type { TeamMember, TeamRole, UpdateTeamMemberData } from '@/types/teamMember';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map WorkspaceMember to TeamMember for TeamMemberCard compatibility
 */
const mapWorkspaceMemberToTeamMember = (member: WorkspaceMember): TeamMember => {
  return {
    id: member.id,
    workspace_id: member.workspace_id,
    user_id: member.user_id,
    name: member.name || member.user?.name || 'Unknown',
    email: member.email || member.user?.email || '',
    avatar: member.avatar_url || member.user?.avatar,
    role: member.role as TeamRole,
    title: member.role,
    permissions: {
      canManageTeam: member.permissions?.includes('manage_team') || false,
      canManageProjects: member.permissions?.includes('manage_projects') || false,
      canManageBilling: member.permissions?.includes('manage_billing') || false,
      canViewReports: member.permissions?.includes('view_reports') || false,
      canAssignTasks: member.permissions?.includes('assign_tasks') || false,
    },
    skills: [],
    workload_percentage: 0,
    availability: 'available',
    online_status: false,
    current_projects: 0,
    joined_date: member.joined_at,
    created_at: member.created_at,
    updated_at: member.updated_at,
    is_owner: member.role === 'owner',
  };
};

// ============================================================================
// Main Component
// ============================================================================

interface TeamManagementProps {
  workspaceId?: string;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ workspaceId: propWorkspaceId }) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const navigate = useNavigate();
  const intl = useIntl();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [currentUserMembership, setCurrentUserMembership] = useState<WorkspaceMember | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [invitationListKey, setInvitationListKey] = useState(0);

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Filter states
  const [roleFilter, setRoleFilter] = useState<TeamRole | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // ============================================================================
  // Initial Data Loading
  // ============================================================================

  useEffect(() => {
    loadWorkspaces();
  }, []);

  // Select workspace based on propWorkspaceId when workspaces are loaded
  useEffect(() => {
    if (workspaces.length > 0 && propWorkspaceId) {
      const workspace = workspaces.find(w => w.id === propWorkspaceId);
      if (workspace) {
        setSelectedWorkspace(workspace);
      } else if (!selectedWorkspace) {
        // Fallback to first workspace if propWorkspaceId not found
        setSelectedWorkspace(workspaces[0]);
      }
    } else if (workspaces.length > 0 && !selectedWorkspace) {
      // Auto-select first workspace if no propWorkspaceId provided
      setSelectedWorkspace(workspaces[0]);
    }
  }, [workspaces, propWorkspaceId]);

  useEffect(() => {
    if (selectedWorkspace) {
      loadWorkspaceData();
    }
  }, [selectedWorkspace?.id]); // Only reload when workspace ID changes

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const workspacesData = await getUserWorkspaces();
      setWorkspaces(workspacesData);
    } catch (err: any) {
      console.error('Error loading workspaces:', err);
      setError(err.message || 'Failed to load workspaces');
      toast.error(intl.formatMessage({ id: 'common.error' }), {
        description: err.message || intl.formatMessage({ id: 'team.errors.loadWorkspaces' }),
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceData = async () => {
    if (!selectedWorkspace) return;

    try {
      setLoading(true);
      setError(null);

      // Load in parallel
      const [membersData, statsData, membershipData] = await Promise.all([
        getWorkspaceMembers(selectedWorkspace.id),
        getWorkspaceStats(selectedWorkspace.id),
        getCurrentUserMembership(selectedWorkspace.id),
      ]);

      // Map WorkspaceMember[] to TeamMember[]
      const teamMembers = membersData.map(mapWorkspaceMemberToTeamMember);

      setMembers(teamMembers);
      setStats(statsData);
      setCurrentUserMembership(membershipData);

      // Force InvitationList to reload by changing its key
      setInvitationListKey(prev => prev + 1);
    } catch (err: any) {
      console.error('Error loading company data:', err);
      setError(err.message || intl.formatMessage({ id: 'team.errors.loadData' }));
      toast.error(intl.formatMessage({ id: 'common.error' }), {
        description: err.message || intl.formatMessage({ id: 'team.errors.loadData' }),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWorkspaceData();
    setRefreshing(false);
    toast.success(intl.formatMessage({ id: 'team.refreshed' }), {
      description: intl.formatMessage({ id: 'team.refreshedDescription' }),
    });
  };

  // ============================================================================
  // Permission Checks
  // ============================================================================

  const canManageTeam = (): boolean => {
    if (!currentUserMembership) return false;
    return currentUserMembership.role === 'owner' || currentUserMembership.role === 'admin';
  };

  // ============================================================================
  // Member Actions
  // ============================================================================

  const handleEditMember = (member: TeamMember) => {
    if (!canManageTeam()) {
      toast.error(intl.formatMessage({ id: 'team.errors.permissionDenied' }), {
        description: intl.formatMessage({ id: 'team.errors.onlyOwnersAdmins' }),
      });
      return;
    }

    setEditingMember(member);
    setShowEditModal(true);
  };

  const handleUpdateMember = async (data: UpdateTeamMemberData) => {
    if (!selectedWorkspace || !editingMember) return;

    try {
      const updateData = {
        role: data.role as MemberRole,
        permissions: Object.entries(data.permissions || {})
          .filter(([_, value]) => value)
          .map(([key]) => key.replace('can', '').toLowerCase()),
      };

      await updateMember(selectedWorkspace.id, editingMember.id, updateData);

      toast.success(intl.formatMessage({ id: 'team.memberUpdated' }), {
        description: intl.formatMessage({ id: 'team.memberUpdatedDescription' }, { name: editingMember.name }),
      });

      setShowEditModal(false);
      setEditingMember(null);
      await loadWorkspaceData();
    } catch (err: any) {
      console.error('Error updating member:', err);
      toast.error(intl.formatMessage({ id: 'team.errors.updateFailed' }), {
        description: err.message || intl.formatMessage({ id: 'team.errors.updateMember' }),
      });
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!selectedWorkspace) return;

    if (!canManageTeam()) {
      toast.error(intl.formatMessage({ id: 'team.errors.permissionDenied' }), {
        description: intl.formatMessage({ id: 'team.errors.onlyOwnersAdminsRemove' }),
      });
      return;
    }

    if (member.role === 'owner') {
      toast.error(intl.formatMessage({ id: 'team.errors.cannotRemove' }), {
        description: intl.formatMessage({ id: 'team.errors.cannotRemoveOwner' }),
      });
      return;
    }

    // Confirmation handled by TeamMemberCard component
    try {
      await removeMember(selectedWorkspace.id, member.id);

      toast.success(intl.formatMessage({ id: 'team.memberRemoved' }), {
        description: intl.formatMessage({ id: 'team.memberRemovedDescription' }, { name: member.name }),
      });

      await loadWorkspaceData();
    } catch (err: any) {
      console.error('Error removing member:', err);
      toast.error(intl.formatMessage({ id: 'team.errors.removeFailed' }), {
        description: err.message || intl.formatMessage({ id: 'team.errors.removeMember' }),
      });
    }
  };

  const handleViewMember = (member: TeamMember) => {
    if (!selectedWorkspace) return;
    // Navigate to user profile page
    navigate(`/workspaces/${selectedWorkspace.id}/profile/${member.user_id}`);
  };

  // ============================================================================
  // Filtering
  // ============================================================================

  const filteredMembers = members.filter((member) => {
    if (roleFilter !== 'all' && member.role !== roleFilter) {
      return false;
    }
    return true;
  });

  // ============================================================================
  // Render: Loading State
  // ============================================================================

  if (loading && workspaces.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-600 dark:text-gray-300 font-semibold">{intl.formatMessage({ id: 'team.loadingData' })}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render: Error State
  // ============================================================================

  if (error && !selectedWorkspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400 mb-4">
              <AlertCircle className="w-6 h-6" />
              <p className="font-semibold">{error}</p>
            </div>
            <button
              onClick={loadWorkspaces}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
            >
              {intl.formatMessage({ id: 'common.retry' })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render: No Companies State
  // ============================================================================

  if (workspaces.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-12 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
            <Building2 className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{intl.formatMessage({ id: 'team.noWorkspace' })}</h2>
            <p className="text-gray-600 dark:text-gray-400">{intl.formatMessage({ id: 'team.noWorkspaceDescription' })}</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render: Main UI
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
              {intl.formatMessage({ id: 'team.title' })}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{intl.formatMessage({ id: 'team.description' })}</p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </motion.div>

        {/* Stats Cards */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Total Members */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-emerald-600" />
                <span className="text-3xl font-black text-gray-900 dark:text-gray-100">{stats.total_members}</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-semibold">{intl.formatMessage({ id: 'team.stats.totalMembers' })}</p>
            </div>

            {/* Active Members */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <UserPlus className="w-8 h-8 text-green-600" />
                <span className="text-3xl font-black text-gray-900 dark:text-gray-100">{stats.active_members}</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-semibold">{intl.formatMessage({ id: 'team.stats.activeMembers' })}</p>
            </div>

            {/* Pending Invitations - Only show for admins/owners */}
            {canManageTeam() && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <Mail className="w-8 h-8 text-teal-600" />
                  <span className="text-3xl font-black text-gray-900 dark:text-gray-100">{stats.pending_invitations}</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-semibold">{intl.formatMessage({ id: 'team.stats.pendingInvitations' })}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Action Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Filters */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-semibold transition-colors text-gray-900 dark:text-gray-100"
              >
                <Filter className="w-4 h-4" />
                <span>{intl.formatMessage({ id: 'common.filters' })}</span>
                {roleFilter !== 'all' && (
                  <span className="w-2 h-2 bg-emerald-600 rounded-full" />
                )}
              </button>

              {/* Active Filters Display */}
              <AnimatePresence>
                {roleFilter !== 'all' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center space-x-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg"
                  >
                    <span className="text-sm font-semibold capitalize">{roleFilter}</span>
                    <button
                      onClick={() => setRoleFilter('all')}
                      className="hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Invite Button */}
            {canManageTeam() && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowInviteModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
              >
                <UserPlus className="w-5 h-5" />
                <span>{intl.formatMessage({ id: 'team.inviteMember' })}</span>
              </motion.button>
            )}
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{intl.formatMessage({ id: 'roles.label' })}</label>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value as TeamRole | 'all')}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-gray-900 dark:text-gray-100"
                    >
                      <option value="all">{intl.formatMessage({ id: 'roles.allRoles' })}</option>
                      <option value="owner">{intl.formatMessage({ id: 'roles.owner' })}</option>
                      <option value="admin">{intl.formatMessage({ id: 'roles.admin' })}</option>
                      <option value="member">{intl.formatMessage({ id: 'roles.member' })}</option>
                      <option value="viewer">{intl.formatMessage({ id: 'roles.viewer' })}</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Active Members Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>{intl.formatMessage({ id: 'team.activeMembers' }, { count: filteredMembers.length })}</span>
          </h2>

          {loading ? (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-gray-600 dark:text-gray-300 font-semibold">{intl.formatMessage({ id: 'team.loadingMembers' })}</span>
              </div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-12 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 font-semibold">{intl.formatMessage({ id: 'team.noMembers' })}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {roleFilter !== 'all'
                  ? intl.formatMessage({ id: 'team.adjustFilters' })
                  : intl.formatMessage({ id: 'team.inviteMembersToStart' })}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMembers.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  onEdit={canManageTeam() ? handleEditMember : undefined}
                  onRemove={canManageTeam() ? handleRemoveMember : undefined}
                  onView={handleViewMember}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Pending Invitations Section - Only show for admins/owners */}
        {selectedWorkspace && canManageTeam() && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <Mail className="w-6 h-6 text-teal-600" />
              <span>{intl.formatMessage({ id: 'invites.pendingInvitations' })}</span>
            </h2>

            <InvitationList
              key={invitationListKey}
              workspaceId={selectedWorkspace.id}
              onUpdate={loadWorkspaceData}
            />
          </motion.div>
        )}

        {/* Invite Modal */}
        {selectedWorkspace && (
          <SendInvitationModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            workspaceId={selectedWorkspace.id}
            onSuccess={loadWorkspaceData}
          />
        )}

        {/* Edit Member Modal */}
        <EditMemberModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingMember(null);
          }}
          member={editingMember}
          onUpdate={handleUpdateMember}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Edit Member Modal Component
// ============================================================================

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  onUpdate: (data: UpdateTeamMemberData) => void;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  onUpdate,
}) => {
  const intl = useIntl();
  const [selectedRole, setSelectedRole] = useState<TeamRole>('developer');

  useEffect(() => {
    if (member) {
      setSelectedRole(member.role);
    }
  }, [member]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ role: selectedRole });
  };

  if (!member) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
            {intl.formatMessage({ id: 'team.editMember' })}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{intl.formatMessage({ id: 'team.editMemberDescription' }, { name: member.name })}</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-lg font-bold">
              {member.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100">{member.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{member.email}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{intl.formatMessage({ id: 'roles.label' })}</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as TeamRole)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors font-semibold text-gray-900 dark:text-gray-100"
            disabled={member.role === 'owner'}
          >
            <option value="admin">{intl.formatMessage({ id: 'roles.admin' })}</option>
            <option value="member">{intl.formatMessage({ id: 'roles.member' })}</option>
            <option value="viewer">{intl.formatMessage({ id: 'roles.viewer' })}</option>
          </select>
          {member.role === 'owner' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{intl.formatMessage({ id: 'roles.cannotChangeOwner' })}</p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors"
          >
            {intl.formatMessage({ id: 'common.cancel' })}
          </motion.button>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={member.role === 'owner'}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {intl.formatMessage({ id: 'team.updateMember' })}
          </motion.button>
        </div>
      </form>
    </Modal>
  );
};

export default TeamManagement;
