import 'package:flutter/material.dart';
import '../services/workspace_service.dart';
import '../services/auth_service.dart';
import '../dao/workspace_dao.dart';
import '../config/app_config.dart';
import '../widgets/member_profile_dialog.dart';
import '../api/services/workspace_api_service.dart';
import '../api/base_api_client.dart';
import '../team/team_screen.dart';
import '../theme/app_theme.dart';

class TeamMembersScreen extends StatefulWidget {
  const TeamMembersScreen({super.key});

  @override
  State<TeamMembersScreen> createState() => _TeamMembersScreenState();
}

class _TeamMembersScreenState extends State<TeamMembersScreen> {
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final WorkspaceApiService _workspaceApiService = WorkspaceApiService();
  final WorkspaceDao _workspaceDao = WorkspaceDao();

  List<MemberPresence> _members = [];
  Map<String, String?> _avatarMap = {}; // userId -> avatar URL
  bool _isLoading = true;
  bool _isOwner = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _checkUserRole();
    _loadMembers();
  }

  void _checkUserRole() {
    // Get current workspace and check if user is owner
    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) {
      return;
    }

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

  }

  Future<void> _loadMembers() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final workspaceId = await AppConfig.getCurrentWorkspaceId();
      if (workspaceId == null) {
        throw Exception('No workspace selected');
      }

      // Fetch both members (for avatars) and presence (for status) in parallel
      final results = await Future.wait([
        _workspaceApiService.getMembers(workspaceId),
        _workspaceDao.getMembersPresence(workspaceId),
      ]);

      final membersResponse = results[0] as ApiResponse<List<WorkspaceMember>>;
      final presenceList = results[1] as List<MemberPresence>;

      // Build avatar map from members API
      if (membersResponse.isSuccess && membersResponse.data != null) {
        _avatarMap = {
          for (var member in membersResponse.data!)
            member.userId: member.avatar
        };
      }

      setState(() {
        _members = presenceList;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return Scaffold(
        backgroundColor: context.backgroundColor,
        appBar: AppBar(
          backgroundColor: context.backgroundColor,
          elevation: 0,
          leading: IconButton(
            icon: Icon(
              Icons.arrow_back,
              color: isDark ? Colors.white : Colors.black,
            ),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            'Team Members',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: context.backgroundColor,
        appBar: AppBar(
          backgroundColor: context.backgroundColor,
          elevation: 0,
          leading: IconButton(
            icon: Icon(
              Icons.arrow_back,
              color: isDark ? Colors.white : Colors.black,
            ),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            'Team Members',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text('Error loading members', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadMembers,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: context.backgroundColor,
      appBar: AppBar(
        backgroundColor: context.backgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back,
            color: isDark ? Colors.white : Colors.black,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Team Members',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(
              Icons.person_add_outlined,
              color: isDark ? Colors.white : Colors.black,
            ),
            onPressed: () {
              if (_isOwner) {
                // Navigate to TeamScreen with Invitations tab selected
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const TeamScreen(initialTabIndex: 1),
                  ),
                );
              } else {
                // Show message for non-owners
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Only workspace owner can add members'),
                    backgroundColor: Colors.orange,
                  ),
                );
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadMembers,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: context.cardColor,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.infoLight.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.people_outline,
                            size: 24,
                            color: AppTheme.infoLight,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Workspace Members',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? Colors.white : Colors.black,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${_members.length} members in this workspace',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: isDark ? Colors.white60 : Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppTheme.infoLight,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${_members.length}',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Members List
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: context.cardColor,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'All Members',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : Colors.black,
                          ),
                        ),
                        const SizedBox(height: 16),
                        if (_members.isEmpty)
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                children: [
                                  Icon(
                                    Icons.people_outline,
                                    size: 64,
                                    color: isDark ? Colors.white24 : Colors.grey[300],
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    'No members found',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: isDark ? Colors.white70 : Colors.grey[700],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                        else
                          ..._members.asMap().entries.map((entry) {
                            final index = entry.key;
                            final member = entry.value;
                            return Padding(
                              padding: EdgeInsets.only(
                                bottom: index < _members.length - 1 ? 12 : 0,
                              ),
                              child: _buildMemberCard(member, isDark),
                            );
                          }),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
  }

  Color _getAvatarColor(String name) {
    final colors = [
      AppTheme.infoLight,
      AppTheme.infoLight,
      const Color(0xFF673AB7),
      const Color(0xFF3F51B5),
      const Color(0xFF00BCD4),
      const Color(0xFF009688),
      AppTheme.successLight,
      AppTheme.warningLight,
      const Color(0xFFFF5722),
      const Color(0xFFE91E63),
    ];
    return colors[name.hashCode % colors.length];
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[parts.length - 1][0]}'.toUpperCase();
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'online':
        return Colors.green;
      case 'away':
        return Colors.orange;
      case 'busy':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Widget _buildMemberCard(MemberPresence member, bool isDark) {
    final isOwner = member.role.toLowerCase() == 'owner';
    // Get avatar from _avatarMap (fetched from members API)
    final avatar = _avatarMap[member.userId] ?? member.avatar;

    return InkWell(
      onTap: () => showMemberPresenceProfileDialog(
        context: context,
        member: member,
        avatarUrl: avatar,
      ),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.backgroundColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: context.borderColor,
          ),
        ),
        child: Row(
        children: [
          // Avatar with status indicator
          Stack(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: _getAvatarColor(member.name),
                backgroundImage: avatar != null && avatar.isNotEmpty
                    ? NetworkImage(avatar)
                    : null,
                child: avatar == null || avatar.isEmpty
                    ? Text(
                        _getInitials(member.name),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      )
                    : null,
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: _getStatusColor(member.status),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: context.backgroundColor,
                      width: 2,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),

          // Member Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        member.name,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (isOwner) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.infoLight,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Owner',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  member.email,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? Colors.white54 : Colors.grey[600],
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.05)
                            : Colors.grey.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        member.role,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: isDark ? Colors.white70 : Colors.grey[700],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getStatusColor(member.status).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: _getStatusColor(member.status),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            member.status.toUpperCase(),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: _getStatusColor(member.status),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // More options button
          IconButton(
            icon: Icon(
              Icons.more_vert,
              color: isDark ? Colors.white54 : Colors.grey[600],
              size: 20,
            ),
            onPressed: () {
              // TODO: Show member options
            },
          ),
        ],
        ),
      ),
    );
  }
}
