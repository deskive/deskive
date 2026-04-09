import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../services/workspace_management_service.dart';
import '../../models/workspace.dart';

/// Screen for viewing and managing pending workspace invitations
class PendingInvitationsScreen extends StatefulWidget {
  const PendingInvitationsScreen({super.key});

  @override
  State<PendingInvitationsScreen> createState() => _PendingInvitationsScreenState();
}

class _PendingInvitationsScreenState extends State<PendingInvitationsScreen> {
  late WorkspaceManagementService _workspaceService;

  @override
  void initState() {
    super.initState();
    _workspaceService = WorkspaceManagementService.instance;
    _loadInvitations();
  }

  Future<void> _loadInvitations() async {
    await _workspaceService.refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pending Invitations'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadInvitations,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Consumer<WorkspaceManagementService>(
        builder: (context, service, child) {
          final currentWorkspace = service.currentWorkspace;
          
          if (currentWorkspace == null) {
            return const Center(
              child: Text('No workspace selected'),
            );
          }

          if (!service.canManageMembers) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.lock, size: 64),
                  SizedBox(height: 16),
                  Text(
                    'Insufficient Permissions',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 8),
                  Text('You need admin or owner permissions to view pending invitations.'),
                ],
              ),
            );
          }

          if (service.isLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (service.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Theme.of(context).colorScheme.error,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error Loading Invitations',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Text(
                      service.error!,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _loadInvitations,
                    child: const Text('Try Again'),
                  ),
                ],
              ),
            );
          }

          if (service.pendingInvitations.isEmpty) {
            return _buildEmptyState();
          }

          return RefreshIndicator(
            onRefresh: _loadInvitations,
            child: Column(
              children: [
                // Workspace context header
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Pending Invitations',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Theme.of(context).colorScheme.onPrimaryContainer,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${service.pendingInvitations.length} invitation${service.pendingInvitations.length == 1 ? '' : 's'} waiting for response',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ],
                  ),
                ),

                // Invitations list
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: service.pendingInvitations.length,
                    itemBuilder: (context, index) {
                      final invitation = service.pendingInvitations[index];
                      return _buildInvitationCard(invitation);
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.mail_outline,
              size: 64,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 24),
            Text(
              'No Pending Invitations',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'All invitations have been responded to or there are no pending invitations for this workspace.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.person_add),
              label: const Text('Invite New Members'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInvitationCard(WorkspaceInvitation invitation) {
    final isExpired = invitation.expiresAt != null && 
        invitation.expiresAt!.isBefore(DateTime.now());
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with email and status
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        invitation.email,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          _buildStatusChip(invitation.status, isExpired),
                          const SizedBox(width: 8),
                          Chip(
                            label: Text(invitation.role),
                            backgroundColor: _getRoleColor(invitation.role).withOpacity(0.2),
                            labelStyle: TextStyle(
                              fontSize: 12,
                              color: _getRoleColor(invitation.role),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert),
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'copy_link',
                      child: Row(
                        children: [
                          Icon(Icons.copy),
                          SizedBox(width: 12),
                          Text('Copy Invitation Link'),
                        ],
                      ),
                    ),
                    if (!isExpired && invitation.status == 'pending') ...[
                      const PopupMenuItem(
                        value: 'resend',
                        child: Row(
                          children: [
                            Icon(Icons.send),
                            SizedBox(width: 12),
                            Text('Resend Invitation'),
                          ],
                        ),
                      ),
                    ],
                    const PopupMenuItem(
                      value: 'cancel',
                      child: Row(
                        children: [
                          Icon(Icons.cancel, color: Colors.red),
                          SizedBox(width: 12),
                          Text('Cancel Invitation', style: TextStyle(color: Colors.red)),
                        ],
                      ),
                    ),
                  ],
                  onSelected: (value) {
                    switch (value) {
                      case 'copy_link':
                        _copyInvitationLink(invitation);
                        break;
                      case 'resend':
                        _resendInvitation(invitation);
                        break;
                      case 'cancel':
                        _showCancelInvitationDialog(invitation);
                        break;
                    }
                  },
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Invitation details
            Row(
              children: [
                Icon(
                  Icons.schedule,
                  size: 16,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 6),
                Text(
                  'Sent ${_formatDate(invitation.invitedAt)}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                if (invitation.invitedBy != null) ...[
                  const SizedBox(width: 16),
                  Icon(
                    Icons.person,
                    size: 16,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'by ${invitation.invitedBy}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
            
            if (invitation.expiresAt != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    isExpired ? Icons.warning : Icons.access_time,
                    size: 16,
                    color: isExpired ? Colors.red : Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    isExpired
                        ? 'Expired ${_formatDate(invitation.expiresAt!)}'
                        : 'Expires ${_formatDate(invitation.expiresAt!)}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: isExpired ? Colors.red : Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status, bool isExpired) {
    Color backgroundColor;
    Color textColor;
    String displayStatus;

    if (isExpired) {
      backgroundColor = Colors.red.withOpacity(0.2);
      textColor = Colors.red;
      displayStatus = 'Expired';
    } else {
      switch (status.toLowerCase()) {
        case 'pending':
          backgroundColor = Colors.orange.withOpacity(0.2);
          textColor = Colors.orange;
          displayStatus = 'Pending';
          break;
        case 'accepted':
          backgroundColor = Colors.green.withOpacity(0.2);
          textColor = Colors.green;
          displayStatus = 'Accepted';
          break;
        case 'declined':
          backgroundColor = Colors.red.withOpacity(0.2);
          textColor = Colors.red;
          displayStatus = 'Declined';
          break;
        default:
          backgroundColor = Theme.of(context).colorScheme.surfaceVariant;
          textColor = Theme.of(context).colorScheme.onSurfaceVariant;
          displayStatus = status;
      }
    }

    return Chip(
      label: Text(displayStatus),
      backgroundColor: backgroundColor,
      labelStyle: TextStyle(
        fontSize: 12,
        color: textColor,
        fontWeight: FontWeight.w500,
      ),
    );
  }

  Color _getRoleColor(String role) {
    switch (role.toLowerCase()) {
      case 'owner':
        return Colors.purple;
      case 'admin':
        return Colors.blue;
      case 'member':
        return Colors.green;
      case 'viewer':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays < 1) {
      if (difference.inHours < 1) {
        return '${difference.inMinutes} min ago';
      }
      return '${difference.inHours} hr ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} day${difference.inDays == 1 ? '' : 's'} ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  void _copyInvitationLink(WorkspaceInvitation invitation) {
    // In a real implementation, this would be the actual invitation link
    final invitationLink = 'https://deskive.com/invite/${invitation.id}';
    
    Clipboard.setData(ClipboardData(text: invitationLink));
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Invitation link copied to clipboard'),
        backgroundColor: Colors.green,
      ),
    );
  }

  Future<void> _resendInvitation(WorkspaceInvitation invitation) async {
    final success = await _workspaceService.resendInvitation(invitation.id);
    
    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Invitation resent to ${invitation.email}'),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_workspaceService.error ?? 'Failed to resend invitation'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showCancelInvitationDialog(WorkspaceInvitation invitation) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Invitation'),
        content: Text(
          'Are you sure you want to cancel the invitation for ${invitation.email}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _cancelInvitation(invitation);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Cancel Invitation'),
          ),
        ],
      ),
    );
  }

  Future<void> _cancelInvitation(WorkspaceInvitation invitation) async {
    final success = await _workspaceService.cancelInvitation(invitation.id);
    
    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Invitation cancelled for ${invitation.email}'),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_workspaceService.error ?? 'Failed to cancel invitation'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}