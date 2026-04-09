import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/workspace_management_service.dart';
import '../../models/workspace.dart';
import 'invite_member_screen.dart';
import 'pending_invitations_screen.dart';

/// Screen for managing workspace members (view, update roles, remove)
class MemberManagementScreen extends StatefulWidget {
  const MemberManagementScreen({super.key});

  @override
  State<MemberManagementScreen> createState() => _MemberManagementScreenState();
}

class _MemberManagementScreenState extends State<MemberManagementScreen> {
  late WorkspaceManagementService _workspaceService;
  String _searchQuery = '';
  WorkspaceRole? _roleFilter;

  @override
  void initState() {
    super.initState();
    _workspaceService = WorkspaceManagementService.instance;
    _loadMembers();
  }

  Future<void> _loadMembers() async {
    await _workspaceService.refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Manage Members'),
        centerTitle: true,
        actions: [
          if (_workspaceService.canManageMembers) ...[
            IconButton(
              icon: const Icon(Icons.pending_actions),
              onPressed: _navigateToPendingInvitations,
              tooltip: 'Pending Invitations',
            ),
            IconButton(
              icon: const Icon(Icons.person_add),
              onPressed: _navigateToInviteMember,
              tooltip: 'Invite Member',
            ),
          ],
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
                    'Error Loading Members',
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
                    onPressed: _loadMembers,
                    child: const Text('Try Again'),
                  ),
                ],
              ),
            );
          }

          final filteredMembers = _getFilteredMembers(service.currentWorkspaceMembers);

          return RefreshIndicator(
            onRefresh: _loadMembers,
            child: Column(
              children: [
                // Workspace info header
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
                        currentWorkspace.name,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Theme.of(context).colorScheme.onPrimaryContainer,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${service.currentWorkspaceMembers.length} member${service.currentWorkspaceMembers.length == 1 ? '' : 's'}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ],
                  ),
                ),

                // Search and filter
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: [
                      // Search bar
                      TextField(
                        decoration: InputDecoration(
                          hintText: 'Search members...',
                          prefixIcon: const Icon(Icons.search),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear),
                                  onPressed: () {
                                    setState(() {
                                      _searchQuery = '';
                                    });
                                  },
                                )
                              : null,
                          border: const OutlineInputBorder(),
                        ),
                        onChanged: (value) {
                          setState(() {
                            _searchQuery = value;
                          });
                        },
                      ),
                      const SizedBox(height: 12),
                      
                      // Role filter
                      Row(
                        children: [
                          const Text('Filter by role:'),
                          const SizedBox(width: 12),
                          Expanded(
                            child: SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                children: [
                                  FilterChip(
                                    label: const Text('All'),
                                    selected: _roleFilter == null,
                                    onSelected: (selected) {
                                      setState(() {
                                        _roleFilter = null;
                                      });
                                    },
                                  ),
                                  const SizedBox(width: 8),
                                  ...WorkspaceRole.values.map((role) => Padding(
                                    padding: const EdgeInsets.only(right: 8),
                                    child: FilterChip(
                                      label: Text(role.displayName),
                                      selected: _roleFilter == role,
                                      onSelected: (selected) {
                                        setState(() {
                                          _roleFilter = selected ? role : null;
                                        });
                                      },
                                    ),
                                  )),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Members list
                Expanded(
                  child: filteredMembers.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.people_outline,
                                size: 64,
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                _searchQuery.isNotEmpty || _roleFilter != null
                                    ? 'No members match the current filters'
                                    : 'No members found',
                                style: Theme.of(context).textTheme.bodyLarge,
                              ),
                              if (_searchQuery.isNotEmpty || _roleFilter != null) ...[
                                const SizedBox(height: 8),
                                TextButton(
                                  onPressed: () {
                                    setState(() {
                                      _searchQuery = '';
                                      _roleFilter = null;
                                    });
                                  },
                                  child: const Text('Clear filters'),
                                ),
                              ],
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: filteredMembers.length,
                          itemBuilder: (context, index) {
                            final member = filteredMembers[index];
                            return _buildMemberCard(member, currentWorkspace);
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

  List<WorkspaceMember> _getFilteredMembers(List<WorkspaceMember> members) {
    return members.where((member) {
      // Apply search filter
      bool matchesSearch = true;
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        matchesSearch = member.displayName.toLowerCase().contains(query) ||
            member.email.toLowerCase().contains(query);
      }

      // Apply role filter
      bool matchesRole = _roleFilter == null || member.role == _roleFilter;

      return matchesSearch && matchesRole;
    }).toList();
  }

  Widget _buildMemberCard(WorkspaceMember member, Workspace currentWorkspace) {
    final canManageThisMember = _workspaceService.canManageMembers &&
        (currentWorkspace.membership?.role.canManage(member.role) ?? false);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: _buildMemberAvatar(member),
        title: Row(
          children: [
            Expanded(
              child: Text(
                member.displayName,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            if (member.role == WorkspaceRole.owner)
              Icon(
                Icons.verified,
                size: 16,
                color: Theme.of(context).colorScheme.primary,
              ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              member.email,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Chip(
                  label: Text(member.role.displayName),
                  backgroundColor: _getRoleColor(member.role).withOpacity(0.2),
                  labelStyle: TextStyle(
                    fontSize: 12,
                    color: _getRoleColor(member.role),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Joined ${_formatJoinDate(member.joinedAt)}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ],
        ),
        trailing: canManageThisMember && member.role != WorkspaceRole.owner
            ? PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert),
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'change_role',
                    child: Row(
                      children: [
                        Icon(Icons.admin_panel_settings),
                        SizedBox(width: 12),
                        Text('Change Role'),
                      ],
                    ),
                  ),
                  if (member.role != WorkspaceRole.owner)
                    const PopupMenuItem(
                      value: 'remove',
                      child: Row(
                        children: [
                          Icon(Icons.person_remove, color: Colors.red),
                          SizedBox(width: 12),
                          Text('Remove Member', style: TextStyle(color: Colors.red)),
                        ],
                      ),
                    ),
                ],
                onSelected: (value) {
                  switch (value) {
                    case 'change_role':
                      _showChangeRoleDialog(member, currentWorkspace);
                      break;
                    case 'remove':
                      _showRemoveMemberDialog(member);
                      break;
                  }
                },
              )
            : null,
      ),
    );
  }

  Widget _buildMemberAvatar(WorkspaceMember member) {
    if (member.avatar != null && member.avatar!.startsWith('http')) {
      return CircleAvatar(
        radius: 24,
        backgroundImage: NetworkImage(member.avatar!),
        backgroundColor: Theme.of(context).colorScheme.primaryContainer,
      );
    }

    return CircleAvatar(
      radius: 24,
      backgroundColor: _getRoleColor(member.role).withOpacity(0.2),
      child: Text(
        member.avatarText,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
          color: _getRoleColor(member.role),
        ),
      ),
    );
  }

  Color _getRoleColor(WorkspaceRole role) {
    switch (role) {
      case WorkspaceRole.owner:
        return Colors.purple;
      case WorkspaceRole.admin:
        return Colors.blue;
      case WorkspaceRole.member:
        return Colors.green;
      case WorkspaceRole.viewer:
        return Colors.orange;
    }
  }

  String _formatJoinDate(DateTime joinDate) {
    final now = DateTime.now();
    final difference = now.difference(joinDate);

    if (difference.inDays < 1) {
      return 'today';
    } else if (difference.inDays < 30) {
      return '${difference.inDays} day${difference.inDays == 1 ? '' : 's'} ago';
    } else if (difference.inDays < 365) {
      final months = (difference.inDays / 30).floor();
      return '${months} month${months == 1 ? '' : 's'} ago';
    } else {
      final years = (difference.inDays / 365).floor();
      return '${years} year${years == 1 ? '' : 's'} ago';
    }
  }

  void _showChangeRoleDialog(WorkspaceMember member, Workspace currentWorkspace) {
    WorkspaceRole selectedRole = member.role;
    final currentUserRole = currentWorkspace.membership?.role ?? WorkspaceRole.member;
    
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text('Change Role for ${member.displayName}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Current role: ${member.role.displayName}'),
              const SizedBox(height: 16),
              const Text('Select new role:'),
              const SizedBox(height: 12),
              ...WorkspaceRole.values.where((role) {
                // Only show roles that current user can assign
                return currentUserRole.canManage(role);
              }).map((role) => RadioListTile<WorkspaceRole>(
                title: Text(role.displayName),
                subtitle: Text(
                  role.description,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                value: role,
                groupValue: selectedRole,
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      selectedRole = value;
                    });
                  }
                },
              )),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: selectedRole == member.role
                  ? null
                  : () {
                      Navigator.of(context).pop();
                      _changeMemberRole(member, selectedRole);
                    },
              child: const Text('Change Role'),
            ),
          ],
        ),
      ),
    );
  }

  void _showRemoveMemberDialog(WorkspaceMember member) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Member'),
        content: Text(
          'Are you sure you want to remove ${member.displayName} from this workspace? They will lose access to all workspace content.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _removeMember(member);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  Future<void> _changeMemberRole(WorkspaceMember member, WorkspaceRole newRole) async {
    final success = await _workspaceService.updateMemberRole(
      member.id,
      UpdateMemberRoleDto(role: newRole),
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Updated ${member.displayName}\'s role to ${newRole.displayName}'),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_workspaceService.error ?? 'Failed to update member role'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _removeMember(WorkspaceMember member) async {
    final success = await _workspaceService.removeMember(member.id);

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Removed ${member.displayName} from workspace'),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_workspaceService.error ?? 'Failed to remove member'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _navigateToInviteMember() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const InviteMemberScreen(),
      ),
    ).then((_) {
      // Refresh members when returning from invite screen
      _loadMembers();
    });
  }

  void _navigateToPendingInvitations() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const PendingInvitationsScreen(),
      ),
    );
  }
}