import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/workspace_service.dart';
import '../services/auth_service.dart';
import '../api/services/workspace_api_service.dart';
import '../api/services/workspace_invitation_api_service.dart';
import '../api/base_api_client.dart';
import '../widgets/member_profile_dialog.dart';
import '../dao/workspace_dao.dart';

class TeamScreen extends StatefulWidget {
  final int initialTabIndex;

  const TeamScreen({super.key, this.initialTabIndex = 0});

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedRole = 'All Roles';

  // Services
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final WorkspaceApiService _workspaceApiService = WorkspaceApiService();
  final WorkspaceInvitationApiService _invitationApiService = WorkspaceInvitationApiService();
  final WorkspaceDao _workspaceDao = WorkspaceDao();

  // State
  bool _isOwner = false;
  bool _isLoading = false;
  String? _error;
  List<WorkspaceMember> _teamMembers = [];
  Map<String, String> _memberPresenceMap = {}; // userId -> status

  // Invitations state
  bool _isLoadingInvitations = false;
  String? _invitationsError;
  List<WorkspaceInvitation> _invitations = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTabIndex,
    );
    _tabController.addListener(_onTabChanged);
    _checkUserRole();
    _fetchMembers();
  }

  void _onTabChanged() {
    // Refresh invitations when switching to invitations tab (only for owners)
    if (_tabController.index == 1 && !_isLoadingInvitations && _isOwner) {
      _fetchInvitations();
    }
  }

  void _checkUserRole() {
    // Get current workspace and check if user is owner
    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) {
      return;
    }

    // Import auth service to get current user
    final authService = AuthService.instance;
    final currentUserId = authService.currentUser?.id;

    bool isOwner = false;

    // First check: Use membership if available
    if (currentWorkspace.membership != null) {
      isOwner = currentWorkspace.membership!.isOwner();
    }
    // Fallback check: Compare workspace ownerId with current user ID
    else if (currentUserId != null) {
      isOwner = currentWorkspace.ownerId == currentUserId;
    }

    setState(() {
      _isOwner = isOwner;
    });


    // Fetch invitations only if user is owner
    if (_isOwner) {
      _fetchInvitations();
    }
  }

  Future<void> _fetchMembers() async {
    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) {
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _workspaceApiService.getMembers(currentWorkspace.id);

      if (response.isSuccess && response.data != null) {
        setState(() {
          _teamMembers = response.data!;
          _isLoading = false;
        });

        // Fetch presence data for members
        _fetchMembersPresence();
      } else {
        setState(() {
          _error = response.message ?? 'Failed to fetch members';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = extractErrorMessage(e, fallback: 'Failed to fetch members');
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchMembersPresence() async {
    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) return;

    try {
      final presenceList = await _workspaceDao.getMembersPresence(currentWorkspace.id);

      setState(() {
        _memberPresenceMap = {
          for (var presence in presenceList)
            presence.userId: presence.status
        };
      });
    } catch (e) {
    }
  }

  Future<void> _fetchInvitations() async {
    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) {
      return;
    }

    setState(() {
      _isLoadingInvitations = true;
      _invitationsError = null;
    });

    try {
      final response = await _invitationApiService.getWorkspaceInvitations(currentWorkspace.id);

      if (response.isSuccess && response.data != null) {
        setState(() {
          _invitations = response.data!;
          _isLoadingInvitations = false;
        });
      } else {
        setState(() {
          _invitationsError = response.message ?? 'Failed to fetch invitations';
          _isLoadingInvitations = false;
        });
      }
    } catch (e) {
      setState(() {
        _invitationsError = extractErrorMessage(e, fallback: 'Failed to fetch invitations');
        _isLoadingInvitations = false;
      });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  List<WorkspaceMember> get _filteredMembers {
    return _teamMembers.where((member) {
      final name = member.name ?? '';
      final matchesSearch = name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          member.email.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesRole = _selectedRole == 'All Roles' || member.role.value == _selectedRole.toLowerCase();
      return matchesSearch && matchesRole;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('team.title'.tr()),
        actions: [
          if (_isOwner)
            IconButton(
              icon: const Icon(Icons.person_add),
              onPressed: () {
                _showInviteMemberDialog();
              },
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'team.members_tab'.tr(args: [_teamMembers.length.toString()])),
            Tab(text: 'team.invitations_tab'.tr(args: [_invitations.length.toString()])),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Members Tab
          Column(
            children: [
              // Search and Filter Bar
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  border: Border(
                    bottom: BorderSide(
                      color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        decoration: InputDecoration(
                          hintText: 'team.search_members'.tr(),
                          prefixIcon: const Icon(Icons.search),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide.none,
                          ),
                          filled: true,
                          fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                        ),
                        onChanged: (value) {
                          setState(() {
                            _searchQuery = value;
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    PopupMenuButton<String>(
                      initialValue: _selectedRole,
                      onSelected: (value) {
                        setState(() {
                          _selectedRole = value;
                        });
                      },
                      itemBuilder: (context) => [
                        PopupMenuItem(value: 'All Roles', child: Text('team.all_roles'.tr())),
                        PopupMenuItem(value: 'Owner', child: Text('workspace.owner'.tr())),
                        PopupMenuItem(value: 'Admin', child: Text('workspace.admin'.tr())),
                        PopupMenuItem(value: 'Member', child: Text('workspace.member'.tr())),
                        PopupMenuItem(value: 'Viewer', child: Text('workspace.viewer'.tr())),
                      ],
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.5),
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Text(_selectedRole == 'All Roles' ? 'team.all_roles'.tr() : _selectedRole),
                            const SizedBox(width: 4),
                            const Icon(Icons.arrow_drop_down),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              // Members List
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _error != null
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.error_outline, size: 48, color: Theme.of(context).colorScheme.error),
                                const SizedBox(height: 16),
                                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                                const SizedBox(height: 16),
                                ElevatedButton(
                                  onPressed: _fetchMembers,
                                  child: Text('common.retry'.tr()),
                                ),
                              ],
                            ),
                          )
                        : _filteredMembers.isEmpty
                            ? Center(child: Text('team.no_members_found'.tr()))
                            : ListView.builder(
                                padding: const EdgeInsets.all(16),
                                itemCount: _filteredMembers.length,
                                itemBuilder: (context, index) {
                                  final member = _filteredMembers[index];
                                  return _buildMemberCard(member);
                                },
                              ),
              ),
            ],
          ),
          
          // Invitations Tab
          !_isOwner
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.lock_outline,
                          size: 64,
                          color: Colors.red,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'team.restricted_access'.tr(),
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.orange,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'team.restricted_access_description'.tr(),
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : _isLoadingInvitations
                  ? const Center(child: CircularProgressIndicator())
                  : _invitationsError != null
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.error_outline, size: 48, color: Theme.of(context).colorScheme.error),
                              const SizedBox(height: 16),
                              Text(_invitationsError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _fetchInvitations,
                                child: Text('common.retry'.tr()),
                              ),
                            ],
                          ),
                        )
                      : _invitations.isEmpty
                          ? Center(child: Text('team.no_pending_invitations'.tr()))
                          : RefreshIndicator(
                              onRefresh: _fetchInvitations,
                              child: ListView.builder(
                                padding: const EdgeInsets.all(16),
                                itemCount: _invitations.length,
                                itemBuilder: (context, index) {
                                  final invitation = _invitations[index];
                                  return _buildInvitationCard(invitation);
                                },
                              ),
                            ),
        ],
      ),
    );
  }

  Widget _buildMemberCard(WorkspaceMember member) {
    final name = member.name ?? 'team.unknown'.tr();
    final initials = name.split(' ').map((e) => e.isNotEmpty ? e[0] : '').join().toUpperCase();
    final roleDisplay = _translateRole(member.role.value);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => showMemberProfileDialog(
          context: context,
          member: member,
          status: _memberPresenceMap[member.userId],
        ),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: _getRoleColor(member.role.value),
              backgroundImage: member.avatar != null ? NetworkImage(member.avatar!) : null,
              child: member.avatar == null
                  ? Text(
                      initials,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        name,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (!member.isActive)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.grey.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            'workspace.inactive'.tr(),
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: Colors.grey[700],
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    member.email,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _buildChip(context, roleDisplay, _getRoleColor(member.role.value)),
                      const Spacer(),
                      Text(
                        'team.joined'.tr(args: [_formatDate(member.joinedAt)]),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Commented out - Three dot menu button
            // if (_isOwner)
            //   PopupMenuButton<String>(
            //     icon: const Icon(Icons.more_vert),
            //     onSelected: (value) {
            //       _handleMemberAction(value, member);
            //     },
            //     itemBuilder: (context) => [
            //       const PopupMenuItem(value: 'edit', child: Text('Edit Role')),
            //       const PopupMenuItem(value: 'remove', child: Text('Remove from Team')),
            //       PopupMenuItem(
            //         value: member.isActive ? 'deactivate' : 'activate',
            //         child: Text(member.isActive ? 'Deactivate' : 'Activate'),
            //       ),
            //     ],
            //   ),
          ],
        ),
        ),
      ),
    );
  }

  Widget _buildInvitationCard(WorkspaceInvitation invitation) {
    final roleDisplay = _translateRole(invitation.role);
    final statusColor = invitation.status.toLowerCase() == 'pending'
        ? Colors.orange
        : invitation.status.toLowerCase() == 'accepted'
            ? Colors.green
            : Colors.red;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: const Icon(Icons.mail_outline),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    invitation.email,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      _buildChip(context, roleDisplay, _getRoleColor(invitation.role)),
                      _buildChip(context, invitation.status.toUpperCase(), statusColor),
                      if (invitation.invitedBy != null)
                        Text(
                          'team.invited_by'.tr(args: [invitation.invitedBy!]),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    invitation.expiresAt != null
                        ? 'team.sent_expires'.tr(args: [_formatDate(invitation.invitedAt), _formatDate(invitation.expiresAt!)])
                        : 'team.sent'.tr(args: [_formatDate(invitation.invitedAt)]),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ],
              ),
            ),
            if (invitation.status.toLowerCase() == 'pending')
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    onPressed: () {
                      _resendInvitation(invitation);
                    },
                    icon: const Icon(Icons.refresh),
                    tooltip: 'team.resend'.tr(),
                    iconSize: 20,
                  ),
                  IconButton(
                    onPressed: () {
                      _cancelInvitation(invitation);
                    },
                    icon: const Icon(Icons.close),
                    color: Theme.of(context).colorScheme.error,
                    tooltip: 'common.cancel'.tr(),
                    iconSize: 20,
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildChip(BuildContext context, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.bold,
        ),
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

  String _translateRole(String role) {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'workspace.role_owner'.tr();
      case 'admin':
        return 'workspace.role_admin'.tr();
      case 'member':
        return 'workspace.role_member'.tr();
      case 'viewer':
        return 'workspace.role_viewer'.tr();
      case 'guest':
        return 'workspace.role_guest'.tr();
      default:
        return role;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays < 7) {
      return 'team.days_ago'.plural(difference.inDays);
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return 'team.weeks_ago'.plural(weeks);
    } else if (difference.inDays < 365) {
      final months = (difference.inDays / 30).floor();
      return 'team.months_ago'.plural(months);
    } else {
      final years = (difference.inDays / 365).floor();
      return 'team.years_ago'.plural(years);
    }
  }

  void _showInviteMemberDialog() {
    final emailController = TextEditingController();
    final messageController = TextEditingController();
    String selectedRole = 'member';

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setState) => AlertDialog(
          title: Text('team.invite_member'.tr()),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: emailController,
                  decoration: InputDecoration(
                    labelText: 'team.email_address'.tr(),
                    hintText: 'team.enter_email'.tr(),
                    prefixIcon: const Icon(Icons.email_outlined),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: selectedRole,
                  decoration: InputDecoration(
                    labelText: 'team.role'.tr(),
                    prefixIcon: const Icon(Icons.badge_outlined),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  items: [
                    DropdownMenuItem(value: 'owner', child: Text('workspace.owner'.tr())),
                    DropdownMenuItem(value: 'admin', child: Text('workspace.admin'.tr())),
                    DropdownMenuItem(value: 'member', child: Text('workspace.member'.tr())),
                    DropdownMenuItem(value: 'viewer', child: Text('workspace.viewer'.tr())),
                  ],
                  onChanged: (value) {
                    setState(() {
                      selectedRole = value!;
                    });
                  },
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: messageController,
                  decoration: InputDecoration(
                    labelText: 'team.invitation_message'.tr(),
                    hintText: 'team.add_personal_message'.tr(),
                    prefixIcon: const Icon(Icons.message_outlined),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  maxLines: 3,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text('common.cancel'.tr()),
            ),
            ElevatedButton(
              onPressed: () async {
                final email = emailController.text.trim();
                if (email.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('team.enter_email_required'.tr())),
                  );
                  return;
                }

                // Validate email format
                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('team.enter_valid_email'.tr())),
                  );
                  return;
                }

                Navigator.pop(dialogContext);
                await _sendInvitation(email, selectedRole, messageController.text.trim());
              },
              child: Text('team.send_invite'.tr()),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _sendInvitation(String email, String role, String? message) async {
    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('team.no_workspace_selected'.tr())),
      );
      return;
    }

    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('team.sending_invitation'.tr()),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      // Map role string to WorkspaceRole enum
      WorkspaceRole workspaceRole;
      switch (role.toLowerCase()) {
        case 'owner':
          workspaceRole = WorkspaceRole.owner;
          break;
        case 'admin':
          workspaceRole = WorkspaceRole.admin;
          break;
        case 'member':
          workspaceRole = WorkspaceRole.member;
          break;
        case 'viewer':
          workspaceRole = WorkspaceRole.viewer;
          break;
        default:
          workspaceRole = WorkspaceRole.member;
      }

      final dto = InviteMemberDto(
        email: email,
        role: workspaceRole,
        message: message?.isNotEmpty == true ? message : null,
      );

      final response = await _workspaceApiService.inviteMember(
        currentWorkspace.id,
        dto,
      );

      // Close loading dialog
      if (mounted) Navigator.pop(context);

      if (response.isSuccess) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'team.invitation_sent'.tr(args: [email])),
              backgroundColor: Colors.green,
            ),
          );
          // Refresh both members and invitations
          _fetchMembers();
          _fetchInvitations();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'team.invitation_failed'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) Navigator.pop(context);

      if (mounted) {
        final errorMessage = extractErrorMessage(e, fallback: 'team.invitation_failed'.tr());
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _handleMemberAction(String action, WorkspaceMember member) {
    switch (action) {
      case 'edit':
        _showEditRoleDialog(member);
        break;
      case 'remove':
        _showRemoveMemberDialog(member);
        break;
      case 'activate':
      case 'deactivate':
        // TODO: Implement activate/deactivate API call
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              action == 'activate'
                ? 'team.member_activated'.tr(args: [member.name ?? ''])
                : 'team.member_deactivated'.tr(args: [member.name ?? ''])
            ),
          ),
        );
        break;
    }
  }

  void _showEditRoleDialog(WorkspaceMember member) {
    String selectedRole = member.role.value;

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('team.edit_role_for'.tr(args: [member.name ?? ''])),
        content: DropdownButtonFormField<String>(
          value: selectedRole,
          decoration: InputDecoration(
            labelText: 'team.role'.tr(),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          items: ['owner', 'admin', 'member', 'viewer'].map((role) {
            return DropdownMenuItem(
              value: role,
              child: Text('workspace.$role'.tr()),
            );
          }).toList(),
          onChanged: (value) {
            selectedRole = value!;
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text('common.cancel'.tr()),
          ),
          ElevatedButton(
            onPressed: () {
              // TODO: Implement update role API call
              Navigator.pop(dialogContext);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('team.role_updated'.tr(args: [member.name ?? '']))),
              );
            },
            child: Text('common.update'.tr()),
          ),
        ],
      ),
    );
  }

  void _showRemoveMemberDialog(WorkspaceMember member) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('team.remove_member'.tr()),
        content: Text('team.remove_member_confirm'.tr(args: [member.name ?? ''])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(dialogContext);
              // TODO: Implement remove member API call
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('team.member_removed'.tr(args: [member.name ?? '']))),
              );
            },
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: Text('team.remove'.tr()),
          ),
        ],
      ),
    );
  }

  Future<void> _resendInvitation(WorkspaceInvitation invitation) async {
    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) return;

    try {
      final response = await _invitationApiService.resendInvitation(
        invitation.id,
        currentWorkspace.id,
      );

      if (mounted) {
        if (response.isSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('team.invitation_resent'.tr(args: [invitation.email])),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'team.resend_failed'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        final errorMessage = extractErrorMessage(e, fallback: 'team.resend_failed'.tr());
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _cancelInvitation(WorkspaceInvitation invitation) async {
    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) return;

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('team.cancel_invitation'.tr()),
        content: Text('team.cancel_invitation_confirm'.tr(args: [invitation.email])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text('common.no'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: Text('team.yes_cancel'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final response = await _invitationApiService.cancelInvitation(
        invitation.id,
        currentWorkspace.id,
      );

      if (mounted) {
        if (response.isSuccess) {
          // Remove from local list
          setState(() {
            _invitations.removeWhere((inv) => inv.id == invitation.id);
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('team.invitation_cancelled'.tr(args: [invitation.email])),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'team.cancel_failed'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        final errorMessage = extractErrorMessage(e, fallback: 'team.cancel_failed'.tr());
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

// Removed old TeamMember and PendingInvite classes - now using API models