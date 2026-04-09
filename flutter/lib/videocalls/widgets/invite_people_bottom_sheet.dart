import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/services.dart';
import '../../services/workspace_service.dart';
import '../../services/auth_service.dart';
import '../../dao/workspace_dao.dart';
import '../../api/services/video_call_service.dart';
import '../../api/base_api_client.dart';
import '../../config/env_config.dart';
import '../../theme/app_theme.dart';

/// Bottom sheet modal for inviting workspace members to a video call
/// Similar to the web frontend's InvitePeopleModal
class InvitePeopleBottomSheet extends StatefulWidget {
  final String callId;
  final String workspaceId;
  final List<String>? existingInvitees;

  const InvitePeopleBottomSheet({
    super.key,
    required this.callId,
    required this.workspaceId,
    this.existingInvitees,
  });

  /// Show the bottom sheet
  static Future<void> show(
    BuildContext context, {
    required String callId,
    required String workspaceId,
    List<String>? existingInvitees,
  }) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => InvitePeopleBottomSheet(
        callId: callId,
        workspaceId: workspaceId,
        existingInvitees: existingInvitees,
      ),
    );
  }

  @override
  State<InvitePeopleBottomSheet> createState() => _InvitePeopleBottomSheetState();
}

class _InvitePeopleBottomSheetState extends State<InvitePeopleBottomSheet>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  final Set<String> _selectedUserIds = {};

  List<MemberPresence> _availableMembers = [];
  bool _isLoading = true;
  bool _isSending = false;
  String? _error;

  late VideoCallService _videoCallService;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _videoCallService = VideoCallService(BaseApiClient.instance);
    _loadWorkspaceMembers();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadWorkspaceMembers() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final currentUserId = AuthService.instance.currentUser?.id;
      final existingInvitees = Set<String>.from(widget.existingInvitees ?? []);

      // Get workspace members
      final members = await WorkspaceService.instance.getWorkspaceMembers(widget.workspaceId);

      // Filter out current user and existing invitees
      _availableMembers = members.where((member) {
        if (member.userId == currentUserId) return false;
        if (existingInvitees.contains(member.userId)) return false;
        return true;
      }).toList();

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Failed to load members: $e';
      });
    }
  }

  List<MemberPresence> get _filteredMembers {
    final query = _searchController.text.toLowerCase();
    if (query.isEmpty) return _availableMembers;

    return _availableMembers.where((member) {
      return member.name.toLowerCase().contains(query) ||
             member.email.toLowerCase().contains(query) ||
             member.role.toLowerCase().contains(query);
    }).toList();
  }

  void _toggleMember(String userId) {
    setState(() {
      if (_selectedUserIds.contains(userId)) {
        _selectedUserIds.remove(userId);
      } else {
        _selectedUserIds.add(userId);
      }
    });
  }

  Future<void> _sendInvites() async {
    if (_selectedUserIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('videocalls.select_at_least_one_contact'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isSending = true;
    });

    try {
      final result = await _videoCallService.inviteParticipants(
        widget.callId,
        _selectedUserIds.toList(),
      );

      final invitedCount = result['invited_count'] ?? _selectedUserIds.length;
      final selectedNames = _availableMembers
          .where((m) => _selectedUserIds.contains(m.userId))
          .map((m) => m.name.split(' ').first)
          .join(', ');

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('videocalls.invites_sent_to'.tr(args: [selectedNames])),
                      Text(
                        '$invitedCount participant(s) will receive a notification',
                        style: const TextStyle(fontSize: 12, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.failed_send_invites'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
      }
    }
  }

  Future<void> _copyJoinLink() async {
    final joinLink = '${EnvConfig.webAppUrl}/call/${widget.workspaceId}/${widget.callId}';

    try {
      await Clipboard.setData(ClipboardData(text: joinLink));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('videocalls.link_copied_clipboard'.tr()),
              ],
            ),
            backgroundColor: Color(0xFF6264A7),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.failed_copy_link'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final sheetBg = isDarkMode ? const Color(0xFF1C1C1E) : Colors.white;
    final handleColor = isDarkMode ? const Color(0xFF5A5A5A) : Colors.grey.shade300;
    final textColor = isDarkMode ? Colors.white : Colors.black87;
    final subtextColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black54;
    final tabBg = isDarkMode ? const Color(0xFF2C2C2E) : const Color(0xFFF5F5F5);
    final tabIndicatorBg = isDarkMode ? const Color(0xFF3A3A3C) : Colors.white;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: sheetBg,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
            ),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: handleColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Row(
                  children: [
                    const Icon(
                      Icons.people,
                      color: Color(0xFF6264A7),
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Invite People to Call',
                            style: TextStyle(
                              color: textColor,
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Invite team members to join your video call',
                            style: TextStyle(
                              color: subtextColor,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: textColor),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),

              // Tab bar
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  color: tabBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: TabBar(
                  controller: _tabController,
                  indicator: BoxDecoration(
                    color: tabIndicatorBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  labelColor: textColor,
                  unselectedLabelColor: subtextColor,
                  tabs: [
                    Tab(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.people, size: 18),
                          const SizedBox(width: 8),
                          Text('videocalls.contacts'.tr()),
                        ],
                      ),
                    ),
                    Tab(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.link, size: 18),
                          const SizedBox(width: 8),
                          Text('videocalls.share_link'.tr()),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Tab content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildContactsTab(scrollController, isDarkMode),
                    _buildShareLinkTab(isDarkMode),
                  ],
                ),
              ),

              // Footer with selected count and send button
              if (_tabController.index == 0)
                LayoutBuilder(
                  builder: (context, constraints) {
                    final isCompact = constraints.maxWidth < 360;
                    final horizontalPadding = isCompact ? 12.0 : 20.0;
                    final buttonPadding = isCompact ? 12.0 : 16.0;

                    return Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: horizontalPadding,
                        vertical: 16,
                      ),
                      decoration: BoxDecoration(
                        border: Border(
                          top: BorderSide(color: isDarkMode ? const Color(0xFF3A3A3C) : Colors.grey.shade200),
                        ),
                      ),
                      child: Row(
                        children: [
                          // Selected count - flexible to prevent overflow
                          if (_selectedUserIds.isNotEmpty)
                            Expanded(
                              child: Text(
                                '${_selectedUserIds.length} selected',
                                style: TextStyle(
                                  color: subtextColor,
                                  fontSize: isCompact ? 12 : 14,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            )
                          else
                            const Spacer(),

                          // Buttons row
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              TextButton(
                                onPressed: () => Navigator.of(context).pop(),
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.symmetric(horizontal: buttonPadding),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Text(
                                  'Cancel',
                                  style: TextStyle(
                                    color: subtextColor,
                                    fontSize: isCompact ? 13 : 14,
                                  ),
                                ),
                              ),
                              SizedBox(width: isCompact ? 4 : 8),
                              ElevatedButton(
                                onPressed: _selectedUserIds.isEmpty || _isSending
                                    ? null
                                    : _sendInvites,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF6264A7),
                                  foregroundColor: Colors.white,
                                  disabledBackgroundColor: isDarkMode ? const Color(0xFF3A3A3C) : Colors.grey.shade300,
                                  disabledForegroundColor: isDarkMode ? Colors.white54 : Colors.black38,
                                  padding: EdgeInsets.symmetric(
                                    horizontal: buttonPadding,
                                    vertical: isCompact ? 10 : 12,
                                  ),
                                  minimumSize: Size.zero,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                                child: _isSending
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.send, size: isCompact ? 16 : 18, color: Colors.white),
                                          SizedBox(width: isCompact ? 4 : 8),
                                          Text(
                                            isCompact ? 'Send' : 'Send Invites',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w600,
                                              fontSize: isCompact ? 13 : 14,
                                            ),
                                          ),
                                        ],
                                      ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildContactsTab(ScrollController scrollController, bool isDarkMode) {
    final inputBg = isDarkMode ? const Color(0xFF2C2C2E) : const Color(0xFFF5F5F5);
    final textColor = isDarkMode ? Colors.white : Colors.black87;
    final hintColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black45;
    final emptyIconColor = isDarkMode ? const Color(0xFF5A5A5A) : Colors.grey.shade400;

    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchController,
            style: TextStyle(color: textColor),
            decoration: InputDecoration(
              hintText: 'videocalls.search_contacts'.tr(),
              hintStyle: TextStyle(color: hintColor),
              prefixIcon: Icon(Icons.search, color: hintColor),
              filled: true,
              fillColor: inputBg,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            onChanged: (_) => setState(() {}),
          ),
        ),

        // Members list
        Expanded(
          child: _isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: Color(0xFF6264A7)),
                )
              : _error != null
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            color: Colors.red,
                            size: 48,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _error!,
                            style: TextStyle(color: hintColor),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: _loadWorkspaceMembers,
                            child: Text('common.retry'.tr()),
                          ),
                        ],
                      ),
                    )
                  : _filteredMembers.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.people_outline,
                                color: emptyIconColor,
                                size: 48,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                _searchController.text.isNotEmpty
                                    ? 'No contacts found'
                                    : 'No available contacts',
                                style: TextStyle(
                                  color: hintColor,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _searchController.text.isNotEmpty
                                    ? 'Try a different search term'
                                    : 'All workspace members are already invited',
                                style: TextStyle(
                                  color: emptyIconColor,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          controller: scrollController,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _filteredMembers.length,
                          itemBuilder: (context, index) {
                            final member = _filteredMembers[index];
                            final isSelected = _selectedUserIds.contains(member.userId);
                            return _buildMemberTile(member, isSelected, isDarkMode);
                          },
                        ),
        ),
      ],
    );
  }

  Widget _buildMemberTile(MemberPresence member, bool isSelected, bool isDarkMode) {
    final tileBg = isSelected
        ? const Color(0xFF6264A7).withOpacity(0.2)
        : (isDarkMode ? const Color(0xFF2C2C2E) : Colors.white);
    final borderColor = isSelected
        ? const Color(0xFF6264A7)
        : (isDarkMode ? const Color(0xFF3A3A3C) : Colors.grey.shade200);
    final nameColor = isDarkMode ? Colors.white : Colors.black87;
    final emailColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black54;
    final roleColor = isDarkMode ? const Color(0xFF5A5A5A) : Colors.black38;
    final statusBorderColor = isDarkMode ? const Color(0xFF1C1C1E) : Colors.white;
    final uncheckedBorderColor = isDarkMode ? const Color(0xFF5A5A5A) : Colors.grey.shade400;

    return GestureDetector(
      onTap: () => _toggleMember(member.userId),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: tileBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: borderColor,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            // Avatar with online indicator
            Stack(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [Color(0xFF6264A7), Color(0xFF8B8FD8)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    image: member.avatar != null
                        ? DecorationImage(
                            image: NetworkImage(member.avatar!),
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                  child: member.avatar == null
                      ? Center(
                          child: Text(
                            member.name.isNotEmpty
                                ? member.name[0].toUpperCase()
                                : '?',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        )
                      : null,
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    width: 14,
                    height: 14,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: member.status == 'online'
                          ? Colors.green
                          : member.status == 'away'
                              ? Colors.orange
                              : Colors.grey,
                      border: Border.all(
                        color: statusBorderColor,
                        width: 2,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 12),

            // Member info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    member.name,
                    style: TextStyle(
                      color: nameColor,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    member.email,
                    style: TextStyle(
                      color: emailColor,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _getRoleDisplayName(member.role),
                    style: TextStyle(
                      color: roleColor,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),

            // Selection indicator
            if (isSelected)
              Container(
                width: 24,
                height: 24,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xFF6264A7),
                ),
                child: const Icon(
                  Icons.check,
                  color: Colors.white,
                  size: 16,
                ),
              )
            else
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: uncheckedBorderColor,
                    width: 2,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _getRoleDisplayName(String role) {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Team Member';
      default:
        return role;
    }
  }

  Widget _buildShareLinkTab(bool isDarkMode) {
    final joinLink = '${EnvConfig.webAppUrl}/call/${widget.workspaceId}/${widget.callId}';
    final textColor = isDarkMode ? Colors.white : Colors.black87;
    final containerBg = isDarkMode ? const Color(0xFF2C2C2E) : const Color(0xFFF5F5F5);
    final borderColor = isDarkMode ? const Color(0xFF3A3A3C) : Colors.grey.shade200;
    final linkColor = isDarkMode ? const Color(0xFF8E8E93) : Colors.black54;
    final helpTextColor = isDarkMode ? const Color(0xFF5A5A5A) : Colors.black38;

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Meeting Link',
            style: TextStyle(
              color: textColor,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: containerBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    joinLink,
                    style: TextStyle(
                      color: linkColor,
                      fontSize: 13,
                      fontFamily: 'monospace',
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  onPressed: _copyJoinLink,
                  icon: const Icon(Icons.copy, size: 18, color: Colors.white),
                  label: const Text(
                    'Copy',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6264A7),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Share this link with anyone to let them join the call. They can open it in a browser or the Deskive app.',
            style: TextStyle(
              color: helpTextColor,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}
