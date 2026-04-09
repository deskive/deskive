/**
 * Invitation List Component
 * Display and manage sent team invitations
 */

import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  AlertCircle,
  User,
  Calendar,
  Shield,
  Code,
  Palette,
  Bug,
  Crown,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getInvitations,
  revokeInvitation,
  resendInvitation,
  getTimeRemaining,
  isInvitationExpired,
} from '@/services/invitationService';
import type { Invitation, TeamRole } from '@/types/invitation';
import { InvitationStatus } from '@/types/invitation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InvitationListProps {
  workspaceId: string;
  onUpdate?: () => void;
}

const InvitationList: React.FC<InvitationListProps> = ({ workspaceId, onUpdate }) => {
  const intl = useIntl();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState<Invitation | null>(null);

  useEffect(() => {
    loadInvitations();
  }, [workspaceId]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInvitations(workspaceId);
      setInvitations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    try {
      setProcessingId(invitationId);
      const result = await resendInvitation(workspaceId, invitationId);
      await loadInvitations();
      onUpdate?.();
      toast.success(intl.formatMessage({ id: 'invites.toast.resent.title' }), {
        description: intl.formatMessage({ id: 'invites.toast.resent.description' })
      });
    } catch (err: any) {
      toast.error(intl.formatMessage({ id: 'invites.toast.resentFailed.title' }), {
        description: err.message || intl.formatMessage({ id: 'invites.toast.resentFailed.description' })
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openDeleteDialog = (invitation: Invitation) => {
    setInvitationToDelete(invitation);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!invitationToDelete) return;

    try {
      setProcessingId(invitationToDelete.id);
      await revokeInvitation(workspaceId, invitationToDelete.id);
      await loadInvitations();
      onUpdate?.();
      toast.success(intl.formatMessage({ id: 'invites.toast.deleted.title' }), {
        description: intl.formatMessage({ id: 'invites.toast.deleted.description' })
      });
    } catch (err: any) {
      toast.error(intl.formatMessage({ id: 'invites.toast.deletedFailed.title' }), {
        description: err.message || intl.formatMessage({ id: 'invites.toast.deletedFailed.description' })
      });
    } finally {
      setProcessingId(null);
      setDeleteDialogOpen(false);
      setInvitationToDelete(null);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    // This method is now replaced by openDeleteDialog
    // Keeping for backward compatibility
    const invitation = invitations.find(inv => inv.id === invitationId);
    if (invitation) {
      openDeleteDialog(invitation);
    }
  };

  const getRoleIcon = (role: TeamRole) => {
    switch (role) {
      case 'owner':
        return Crown;
      case 'admin':
        return Shield;
      case 'member':
        return Code;
      case 'viewer':
      default:
        return User;
    }
  };

  const getRoleColor = (role: TeamRole) => {
    switch (role) {
      case 'owner':
        return 'from-yellow-500 to-orange-500';
      case 'admin':
        return 'from-blue-500 to-indigo-600';
      case 'member':
        return 'from-blue-500 to-cyan-500';
      case 'viewer':
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getRoleLabel = (role: TeamRole) => {
    switch (role) {
      case 'owner':
        return intl.formatMessage({ id: 'roles.owner' });
      case 'admin':
        return intl.formatMessage({ id: 'roles.admin' });
      case 'member':
        return intl.formatMessage({ id: 'roles.member' });
      case 'viewer':
      default:
        return intl.formatMessage({ id: 'roles.viewer' });
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    const expired = isInvitationExpired(invitation.expires_at);

    switch (invitation.status) {
      case InvitationStatus.PENDING:
        if (expired) {
          return (
            <span className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
              <Clock className="w-3 h-3" />
              <span>{intl.formatMessage({ id: 'invites.status.expired' })}</span>
            </span>
          );
        }
        return (
          <span className="flex items-center space-x-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
            <Clock className="w-3 h-3" />
            <span>{intl.formatMessage({ id: 'invites.status.pending' })}</span>
          </span>
        );
      case InvitationStatus.ACCEPTED:
        return (
          <span className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
            <CheckCircle className="w-3 h-3" />
            <span>{intl.formatMessage({ id: 'invites.status.accepted' })}</span>
          </span>
        );
      case InvitationStatus.REVOKED:
        return (
          <span className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
            <XCircle className="w-3 h-3" />
            <span>{intl.formatMessage({ id: 'invites.status.revoked' })}</span>
          </span>
        );
      case InvitationStatus.EXPIRED:
        return (
          <span className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
            <Clock className="w-3 h-3" />
            <span>{intl.formatMessage({ id: 'invites.status.expired' })}</span>
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-lg border border-gray-200">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-gray-600 font-semibold">{intl.formatMessage({ id: 'invites.loading' })}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-gray-200">
        <div className="flex items-center space-x-3 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-semibold">{error}</p>
        </div>
        <button
          onClick={loadInvitations}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          {intl.formatMessage({ id: 'invites.retry' })}
        </button>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-lg border border-gray-200 text-center">
        <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-semibold">{intl.formatMessage({ id: 'invites.empty.title' })}</p>
        <p className="text-sm text-gray-500 mt-1">
          {intl.formatMessage({ id: 'invites.empty.message' })}
        </p>
      </div>
    );
  }

  const pendingInvitations = invitations.filter(
    (inv) => inv.status === InvitationStatus.PENDING && !isInvitationExpired(inv.expires_at)
  );
  const otherInvitations = invitations.filter(
    (inv) => inv.status !== InvitationStatus.PENDING || isInvitationExpired(inv.expires_at)
  );

  return (
    <div className="space-y-6">
      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span>{intl.formatMessage({ id: 'invites.pending' })} ({pendingInvitations.length})</span>
          </h3>
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => {
              const RoleIcon = getRoleIcon(invitation.role);
              const isProcessing = processingId === invitation.id;

              return (
                <motion.div
                  key={invitation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-bold text-gray-900">{invitation.email}</p>
                          <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${getRoleColor(invitation.role)} flex items-center justify-center`}>
                            <RoleIcon className="w-3 h-3 text-white" />
                          </div>
                          <span className="px-2 py-0.5 bg-gradient-to-r text-white text-xs font-bold rounded">
                            {getRoleLabel(invitation.role)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{intl.formatMessage({ id: 'invites.by' })} {invitation.invited_by_name}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(invitation.created_at).toLocaleDateString()}</span>
                          </span>
                          <span className="flex items-center space-x-1 text-yellow-600 font-semibold">
                            <Clock className="w-3 h-3" />
                            <span>{getTimeRemaining(invitation.expires_at)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {getStatusBadge(invitation)}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleResend(invitation.id)}
                        disabled={isProcessing}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
                        title="Resend invitation"
                      >
                        <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRevoke(invitation.id)}
                        disabled={isProcessing}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50"
                        title="Revoke invitation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  {invitation.initial_skills && invitation.initial_skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {invitation.initial_skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {invitation.message && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 italic">"{invitation.message}"</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Invitations (Accepted, Revoked, Expired) */}
      {otherInvitations.length > 0 && (
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {intl.formatMessage({ id: 'invites.history' })} ({otherInvitations.length})
          </h3>
          <div className="space-y-3">
            {otherInvitations.map((invitation) => {
              const RoleIcon = getRoleIcon(invitation.role);

              return (
                <motion.div
                  key={invitation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gray-300 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-bold text-gray-700">{invitation.email}</p>
                          <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${getRoleColor(invitation.role)} flex items-center justify-center opacity-50`}>
                            <RoleIcon className="w-3 h-3 text-white" />
                          </div>
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-bold rounded">
                            {getRoleLabel(invitation.role)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(invitation.created_at).toLocaleDateString()}</span>
                          </span>
                          {invitation.accepted_at && (
                            <span className="text-green-600 font-semibold">
                              {intl.formatMessage({ id: 'invites.accepted' })} {new Date(invitation.accepted_at).toLocaleDateString()}
                            </span>
                          )}
                          {invitation.declined_at && (
                            <span className="text-red-600 font-semibold">
                              {intl.formatMessage({ id: 'invites.declined' })} {new Date(invitation.declined_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">{getStatusBadge(invitation)}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              {intl.formatMessage({ id: 'invites.deleteDialog.title' })}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {intl.formatMessage({ id: 'invites.deleteDialog.description' })}{' '}
                <span className="font-semibold text-foreground">
                  {invitationToDelete?.email}
                </span>
                ?
              </p>
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'invites.deleteDialog.warning' })}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{intl.formatMessage({ id: 'invites.deleteDialog.cancel' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {intl.formatMessage({ id: 'invites.deleteDialog.confirm' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InvitationList;
