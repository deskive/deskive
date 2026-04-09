import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../api/services/chat_api_service.dart';
import '../api/services/workspace_api_service.dart';
import '../api/services/bot_api_service.dart';
import '../services/workspace_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

class ChannelSettingsScreen extends StatefulWidget {
  final String channelId;
  final String channelName;
  final String? channelDescription;
  final bool isPrivateChannel;
  final bool notificationsEnabled;
  final bool channelMuted;

  const ChannelSettingsScreen({
    super.key,
    required this.channelId,
    required this.channelName,
    this.channelDescription,
    this.isPrivateChannel = false,
    this.notificationsEnabled = true,
    this.channelMuted = false,
  });

  @override
  State<ChannelSettingsScreen> createState() => _ChannelSettingsScreenState();
}

class _ChannelSettingsScreenState extends State<ChannelSettingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late TextEditingController _channelNameController;
  late TextEditingController _channelDescController;
  late bool _isPrivateChannel;
  late bool _notificationsEnabled;
  late bool _channelMuted;
  bool _hasChanges = false;
  bool _isEditMode = false;

  // API Services
  final ChatApiService _chatApiService = ChatApiService();
  final WorkspaceApiService _workspaceApiService = WorkspaceApiService();
  final BotApiService _botApiService = BotApiService();

  // Channel members data
  List<ChannelMember> _channelMembers = [];
  bool _isLoadingMembers = false;
  String? _membersError;

  // Installed bots data
  List<BotInstallation> _installedBots = [];
  List<Bot> _availableBots = [];
  bool _isLoadingBots = false;
  String? _botsError;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _channelNameController = TextEditingController(text: widget.channelName);
    _channelDescController = TextEditingController(text: widget.channelDescription ?? '');
    _isPrivateChannel = widget.isPrivateChannel;
    _notificationsEnabled = widget.notificationsEnabled;
    _channelMuted = widget.channelMuted;

    // Fetch channel members
    _fetchChannelMembers();

    // Fetch installed bots
    _fetchBots();

    // Listen for changes
    _channelNameController.addListener(_onDataChanged);
    _channelDescController.addListener(_onDataChanged);
  }

  /// Fetch installed bots and available bots
  Future<void> _fetchBots() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() {
        _botsError = 'messages.no_workspace_selected'.tr();
      });
      return;
    }

    setState(() {
      _isLoadingBots = true;
      _botsError = null;
    });

    try {
      // Fetch all available bots
      final botsResponse = await _botApiService.getBots(workspaceId);
      if (botsResponse.success && botsResponse.data != null) {
        _availableBots = botsResponse.data!.where((bot) => bot.status == BotStatus.active).toList();
      }

      // Fetch installations for this channel
      final installationsResponse = await _botApiService.getChannelBots(
        workspaceId,
        widget.channelId,
      );

      if (installationsResponse.success && installationsResponse.data != null) {
        setState(() {
          _installedBots = installationsResponse.data!;
          _isLoadingBots = false;
        });
      } else {
        setState(() {
          _installedBots = [];
          _isLoadingBots = false;
        });
      }
    } catch (e) {
      setState(() {
        _botsError = 'Error loading bots: $e';
        _isLoadingBots = false;
      });
    }
  }

  /// Fetch channel members from API
  Future<void> _fetchChannelMembers() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() {
        _membersError = 'messages.no_workspace_selected'.tr();
      });
      return;
    }

    setState(() {
      _isLoadingMembers = true;
      _membersError = null;
    });

    try {
      final response = await _chatApiService.getChannelMembers(
        workspaceId,
        widget.channelId,
      );

      if (response.success && response.data != null) {
        setState(() {
          _channelMembers = response.data!;
          _isLoadingMembers = false;
        });
      } else {
        setState(() {
          _membersError = response.message ?? 'messages.failed_load_members'.tr(args: ['']);
          _isLoadingMembers = false;
        });
      }
    } catch (e) {
      setState(() {
        _membersError = 'messages.error'.tr(args: [e.toString()]);
        _isLoadingMembers = false;
      });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _channelNameController.dispose();
    _channelDescController.dispose();
    super.dispose();
  }

  void _onDataChanged() {
    setState(() {
      _hasChanges = _channelNameController.text != widget.channelName ||
          _channelDescController.text != (widget.channelDescription ?? '') ||
          _isPrivateChannel != widget.isPrivateChannel ||
          _notificationsEnabled != widget.notificationsEnabled ||
          _channelMuted != widget.channelMuted;
    });
  }

  void _saveSettings() {
    // Here you would save the settings to your data source
    Navigator.pop(context, {
      'channelName': _channelNameController.text,
      'channelDescription': _channelDescController.text,
      'isPrivateChannel': _isPrivateChannel,
      'notificationsEnabled': _notificationsEnabled,
      'channelMuted': _channelMuted,
    });
  }

  bool _isSaving = false;

  Future<void> _saveChannelChanges() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('messages.no_workspace_selected'.tr())),
      );
      return;
    }

    setState(() {
      _isSaving = true;
    });

    try {
      final response = await _chatApiService.updateChannel(
        workspaceId,
        widget.channelId,
        name: _channelNameController.text,
        description: _channelDescController.text,
        isPrivate: _isPrivateChannel,
      );

      if (response.success) {
        if (mounted) {
          setState(() {
            _isEditMode = false;
            _isSaving = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('messages.channel_updated'.tr()),
              backgroundColor: AppTheme.infoLight,
            ),
          );
        }
      } else {
        if (mounted) {
          setState(() {
            _isSaving = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'messages.error_updating_channel'.tr(args: [''])),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('messages.error_updating_channel'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
        appBar: AppBar(
          title: Text('messages.channel_settings'.tr()),
          bottom: TabBar(
            controller: _tabController,
            indicatorColor: AppTheme.infoLight,
            labelColor: AppTheme.infoLight,
            unselectedLabelColor: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
            tabs: [
              Tab(text: 'messages.general_tab'.tr()),
              Tab(text: 'messages.members_tab'.tr()),
              Tab(text: 'bots.title'.tr()),
            ],
          ),
        ),
        body: TabBarView(
          controller: _tabController,
          children: [
            // General Tab
            _buildGeneralTab(isDarkMode),
            // Members Tab
            _buildMembersTab(isDarkMode),
            // Bots Tab
            _buildBotsTab(isDarkMode),
          ],
        ),
    );
  }

  Widget _buildGeneralTab(bool isDarkMode) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
              // Channel Info Section
              Container(
                color: isDarkMode ? AppTheme.cardDark : AppTheme.mutedLight,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CHANNEL INFORMATION',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.infoLight,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Channel Name
                    TextField(
                      controller: _channelNameController,
                      enabled: _isEditMode,
                      decoration: InputDecoration(
                        labelText: 'messages.channel_name_label'.tr(),
                        border: const OutlineInputBorder(),
                        prefixIcon: const Icon(Icons.tag),
                        filled: true,
                        fillColor: _isEditMode 
                            ? (isDarkMode ? const Color(0xFF0F1419) : Colors.white)
                            : (isDarkMode ? const Color(0xFF0A0E15) : Colors.grey[200]),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Channel Description
                    TextField(
                      controller: _channelDescController,
                      enabled: _isEditMode,
                      decoration: InputDecoration(
                        labelText: 'messages.channel_description_label'.tr(),
                        border: const OutlineInputBorder(),
                        prefixIcon: const Icon(Icons.description),
                        hintText: 'messages.describe_channel'.tr(),
                        filled: true,
                        fillColor: _isEditMode 
                            ? (isDarkMode ? const Color(0xFF0F1419) : Colors.white)
                            : (isDarkMode ? const Color(0xFF0A0E15) : Colors.grey[200]),
                      ),
                      maxLines: 3,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              // Privacy Settings Section
              Container(
                color: isDarkMode ? AppTheme.cardDark : AppTheme.mutedLight,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'PRIVACY',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.infoLight,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    SwitchListTile(
                      title: Text(
                        'messages.private_channel_title'.tr(),
                        style: TextStyle(
                          color: _isEditMode ? null : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                        ),
                      ),
                      subtitle: Text(
                        'messages.private_channel_description'.tr(),
                        style: TextStyle(
                          color: _isEditMode ? null : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4),
                        ),
                      ),
                      value: _isPrivateChannel,
                      onChanged: _isEditMode ? (value) {
                        setState(() {
                          _isPrivateChannel = value;
                          _onDataChanged();
                        });
                      } : null,
                      secondary: Icon(
                        _isPrivateChannel ? Icons.lock : Icons.lock_open,
                        color: _isEditMode 
                            ? (_isPrivateChannel ? AppTheme.infoLight : null)
                            : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4),
                      ),
                      contentPadding: EdgeInsets.zero,
                      activeColor: AppTheme.infoLight,
                    ),
                    if (!_isEditMode)
                      Align(
                        alignment: Alignment.centerLeft,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            setState(() {
                              _isEditMode = true;
                            });
                          },
                          icon: const Icon(Icons.edit, size: 20),
                          label: Text('messages.edit_channel'.tr()),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.infoLight,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      )
                    else
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () {
                                setState(() {
                                  _isEditMode = false;
                                  // Reset values to original
                                  _channelNameController.text = widget.channelName;
                                  _channelDescController.text = widget.channelDescription ?? '';
                                  _isPrivateChannel = widget.isPrivateChannel;
                                });
                              },
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.grey[700],
                                side: BorderSide(color: Colors.grey[400]!),
                                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              child: const Text('Cancel'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _isSaving ? null : _saveChannelChanges,
                              icon: _isSaving
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(Icons.save, size: 20),
                              label: Text(_isSaving ? 'Saving...' : 'Save Changes'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.infoLight,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              // Personal Settings Section - Commented out for now
              // Container(
              //   color: isDarkMode ? AppTheme.cardDark : AppTheme.mutedLight,
              //   padding: const EdgeInsets.all(16),
              //   child: Column(
              //     crossAxisAlignment: CrossAxisAlignment.start,
              //     children: [
              //       Text(
              //         'PERSONAL SETTINGS',
              //         style: TextStyle(
              //           fontSize: 12,
              //           fontWeight: FontWeight.bold,
              //           color: AppTheme.infoLight,
              //           letterSpacing: 1.2,
              //         ),
              //       ),
              //       const SizedBox(height: 8),
              //       SwitchListTile(
              //         title: const Text('Enable Notifications'),
              //         subtitle: const Text('Get notified about new messages in this channel'),
              //         value: _notificationsEnabled && !_channelMuted,
              //         onChanged: _channelMuted ? null : (value) {
              //           setState(() {
              //             _notificationsEnabled = value;
              //             _onDataChanged();
              //           });
              //         },
              //         secondary: Icon(
              //           _notificationsEnabled && !_channelMuted
              //               ? Icons.notifications_active
              //               : Icons.notifications_off,
              //           color: _notificationsEnabled && !_channelMuted
              //               ? AppTheme.infoLight
              //               : null,
              //         ),
              //         contentPadding: EdgeInsets.zero,
              //         activeColor: AppTheme.infoLight,
              //       ),
              //       const Divider(),
              //       SwitchListTile(
              //         title: const Text('Mute Channel'),
              //         subtitle: const Text('Stop all notifications from this channel'),
              //         value: _channelMuted,
              //         onChanged: (value) {
              //           setState(() {
              //             _channelMuted = value;
              //             if (value) {
              //               _notificationsEnabled = false;
              //             }
              //             _onDataChanged();
              //           });
              //         },
              //         secondary: Icon(
              //           _channelMuted ? Icons.volume_off : Icons.volume_up,
              //           color: _channelMuted ? Colors.red : null,
              //         ),
              //         contentPadding: EdgeInsets.zero,
              //         activeColor: AppTheme.infoLight,
              //       ),
              //     ],
              //   ),
              // ),
              // const SizedBox(height: 8),

              // Danger Zone Section
              Container(
                color: isDarkMode ? AppTheme.cardDark : AppTheme.mutedLight,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CHANNEL ACTIONS (ADMIN)',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.infoLight,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Leave Channel - Commented out for now
                    // ListTile(
                    //   leading: const Icon(Icons.exit_to_app, color: Colors.orange),
                    //   title: const Text(
                    //     'Leave Channel',
                    //     style: TextStyle(color: Colors.orange),
                    //   ),
                    //   subtitle: const Text('Leave this channel'),
                    //   onTap: () {
                    //     _showLeaveChannelDialog();
                    //   },
                    //   contentPadding: EdgeInsets.zero,
                    // ),
                    // const Divider(),
                    ListTile(
                      leading: const Icon(Icons.delete_forever, color: Colors.red),
                      title: const Text(
                        'Delete Channel',
                        style: TextStyle(color: Colors.red),
                      ),
                      subtitle: const Text('Permanently delete this channel'),
                      onTap: () {
                        _showDeleteChannelDialog();
                      },
                      contentPadding: EdgeInsets.zero,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
  }

  Widget _buildMembersTab(bool isDarkMode) {
    final currentUserId = AuthService.instance.currentUser?.id;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Header with Members count and Add Member button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Members (${_channelMembers.length})',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              ElevatedButton.icon(
                onPressed: _isLoadingMembers ? null : _showAddMembersDialog,
                icon: const Icon(Icons.person_add, size: 20),
                label: const Text('Add Member'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.infoLight,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Members List
          Expanded(
            child: _isLoadingMembers
                ? const Center(child: CircularProgressIndicator())
                : _membersError != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.error_outline,
                              size: 48,
                              color: Colors.red.withOpacity(0.7),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _membersError!,
                              style: TextStyle(
                                color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                                fontSize: 14,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: _fetchChannelMembers,
                              icon: const Icon(Icons.refresh, size: 20),
                              label: const Text('Retry'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.infoLight,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      )
                    : _channelMembers.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.people_outline,
                                  size: 48,
                                  color: isDarkMode ? Colors.grey[600] : Colors.grey[400],
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No members in this channel',
                                  style: TextStyle(
                                    color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            itemCount: _channelMembers.length,
                            itemBuilder: (context, index) {
                              final member = _channelMembers[index];
                              final isCurrentUser = member.userId == currentUserId;
                              final memberName = member.name ?? member.email.split('@')[0];
                              final initials = memberName.substring(0, 1).toUpperCase() +
                                  (memberName.length > 1 ? memberName.substring(1, 2).toUpperCase() : '');

                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  leading: CircleAvatar(
                                    radius: 24,
                                    backgroundColor: isCurrentUser
                                        ? AppTheme.infoLight
                                        : Colors.primaries[index % Colors.primaries.length],
                                    child: Text(
                                      initials,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ),
                                  title: Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          memberName,
                                          style: TextStyle(
                                            color: Theme.of(context).colorScheme.onSurface,
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      if (isCurrentUser) ...[
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: AppTheme.infoLight.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: const Text(
                                            'You',
                                            style: TextStyle(
                                              color: AppTheme.infoLight,
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const SizedBox(height: 4),
                                      Text(
                                        member.email,
                                        style: TextStyle(
                                          color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                                          fontSize: 13,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 6,
                                              vertical: 2,
                                            ),
                                            decoration: BoxDecoration(
                                              color: member.role == 'admin'
                                                  ? Colors.purple.withOpacity(0.1)
                                                  : Colors.green.withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              member.role.toUpperCase(),
                                              style: TextStyle(
                                                color: member.role == 'admin' ? Colors.purple : Colors.green,
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  trailing: isCurrentUser
                                      ? null
                                      : IconButton(
                                          icon: const Icon(Icons.more_vert),
                                          onPressed: () {
                                            _showMemberOptions(member);
                                          },
                                        ),
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }

  /// Show member options (remove from channel)
  void _showMemberOptions(ChannelMember member) {
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    showModalBottomSheet(
      context: context,
      builder: (bottomSheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.person_remove, color: Colors.red),
              title: const Text('Remove from Channel'),
              onTap: () {
                Navigator.pop(bottomSheetContext);
                _showRemoveMemberConfirmation(member, scaffoldMessenger);
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Show confirmation dialog before removing member
  void _showRemoveMemberConfirmation(ChannelMember member, ScaffoldMessengerState scaffoldMessenger) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Remove Member'),
        content: Text('Are you sure you want to remove ${member.name ?? member.email} from this channel?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              _removeMember(member, scaffoldMessenger);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  /// Remove member from channel
  Future<void> _removeMember(ChannelMember member, ScaffoldMessengerState scaffoldMessenger) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('No workspace selected')),
      );
      return;
    }

    // Get current member IDs
    final currentMemberIds = _channelMembers.map((m) => m.userId).toList();

    // Show loading
    scaffoldMessenger.showSnackBar(
      SnackBar(content: Text('Removing member...')),
    );

    try {
      final response = await _chatApiService.removeChannelMember(
        workspaceId,
        widget.channelId,
        member.userId,
        currentMemberIds,
      );

      if (response.success) {
        // Refresh members list
        await _fetchChannelMembers();

        scaffoldMessenger.hideCurrentSnackBar();
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text('Removed ${member.name ?? member.email} from channel'),
            backgroundColor: AppTheme.infoLight,
          ),
        );
      } else {
        scaffoldMessenger.hideCurrentSnackBar();
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'Failed to remove member'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      scaffoldMessenger.hideCurrentSnackBar();
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text('Error removing member: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showAddMembersDialog() async {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;

    // Save references before showing dialogs to avoid "deactivated widget" errors
    final navigator = Navigator.of(context);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    if (workspaceId == null) {
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('No workspace selected')),
      );
      return;
    }

    // Fetch workspace members
    List<WorkspaceMember> workspaceMembers = [];
    bool isLoading = true;
    String? error;

    // Show loading dialog initially
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final response = await _workspaceApiService.getMembers(workspaceId);
      if (response.success && response.data != null) {
        // Filter out members who are already in the channel
        final currentMemberIds = _channelMembers.map((m) => m.userId).toSet();
        workspaceMembers = response.data!
            .where((m) => !currentMemberIds.contains(m.userId))
            .toList();
        isLoading = false;
      } else {
        error = response.message ?? 'Failed to load workspace members';
        isLoading = false;
      }
    } catch (e) {
      error = 'Error loading members: $e';
      isLoading = false;
    }

    // Close loading dialog
    navigator.pop();

    if (error != null) {
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text(error), backgroundColor: Colors.red),
      );
      return;
    }

    if (workspaceMembers.isEmpty) {
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('All workspace members are already in this channel')),
      );
      return;
    }

    // Convert to selection format
    List<Map<String, dynamic>> availableUsers = workspaceMembers.map((member) {
      final name = member.name ?? member.email.split('@')[0];
      final initials = name.substring(0, 1).toUpperCase() +
          (name.length > 1 ? name.substring(1, 2).toUpperCase() : '');

      return {
        'userId': member.userId,
        'initials': initials,
        'name': name,
        'email': member.email,
        'isOnline': true, // Can be updated with real online status
        'selected': false,
      };
    }).toList();

    String searchQuery = '';

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => Dialog(
          backgroundColor: context.cardColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: SizedBox(
            width: 500,
            height: 600,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Add Members',
                              style: TextStyle(
                                color: isDarkMode ? Colors.white : Colors.black,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Add people to dev-team',
                              style: TextStyle(
                                color: isDarkMode ? Colors.grey : Colors.grey[600],
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: Icon(
                          Icons.close, 
                          color: isDarkMode ? Colors.white : Colors.black,
                        ),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                
                // Search Field
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: TextField(
                    onChanged: (value) {
                      setState(() {
                        searchQuery = value.toLowerCase();
                      });
                    },
                    decoration: InputDecoration(
                      hintText: 'Search for people...',
                      hintStyle: TextStyle(color: isDarkMode ? Colors.grey : Colors.grey[600]),
                      prefixIcon: Icon(
                        Icons.search, 
                        color: isDarkMode ? Colors.grey : Colors.grey[600],
                      ),
                      filled: true,
                      fillColor: isDarkMode ? const Color(0xFF2A2F3A) : Colors.grey[50],
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: isDarkMode ? const Color(0xFF3A4048) : Colors.grey[300]!,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: isDarkMode ? const Color(0xFF3A4048) : Colors.grey[300]!,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: AppTheme.infoLight),
                      ),
                    ),
                    style: TextStyle(color: isDarkMode ? Colors.white : Colors.black),
                  ),
                ),
                
                // Selected Users Section
                Builder(
                  builder: (context) {
                    final selectedUsers = availableUsers.where((user) => user['selected']).toList();
                    if (selectedUsers.isEmpty) {
                      return const SizedBox.shrink();
                    }
                    
                    return Container(
                      width: double.infinity,
                      color: context.cardColor,
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Selected (${selectedUsers.length})',
                            style: TextStyle(
                              color: isDarkMode ? Colors.white : Colors.black,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: selectedUsers.map((user) {
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: isDarkMode ? const Color(0xFF3A4048) : Colors.grey[200],
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      user['name'],
                                      style: TextStyle(
                                        color: isDarkMode ? Colors.white : Colors.black,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    GestureDetector(
                                      onTap: () {
                                        setState(() {
                                          user['selected'] = false;
                                        });
                                      },
                                      child: Icon(
                                        Icons.close,
                                        size: 16,
                                        color: isDarkMode ? Colors.grey : Colors.grey[600],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                
                // Available Users Section
                Container(
                  width: double.infinity,
                  color: context.cardColor,
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
                  child: Text(
                    'Available Users',
                    style: TextStyle(
                      color: isDarkMode ? Colors.white : Colors.black,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                
                // Users List
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        decoration: BoxDecoration(
                          color: isDarkMode ? const Color(0xFF2A2F3A) : Colors.grey[50],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Builder(
                          builder: (context) {
                            // Filter users based on search query
                            final filteredUsers = availableUsers.where((user) {
                              final name = user['name'].toString().toLowerCase();
                              final email = user['email'].toString().toLowerCase();
                              return searchQuery.isEmpty || 
                                     name.contains(searchQuery) || 
                                     email.contains(searchQuery);
                            }).toList();

                            if (filteredUsers.isEmpty) {
                              return Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(24),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.search_off,
                                        size: 48,
                                        color: isDarkMode ? Colors.grey : Colors.grey[400],
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        'No users found',
                                        style: TextStyle(
                                          color: isDarkMode ? Colors.grey : Colors.grey[600],
                                          fontSize: 16,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Try adjusting your search terms',
                                        style: TextStyle(
                                          color: isDarkMode ? Colors.grey[400] : Colors.grey[500],
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }

                            return ListView.builder(
                              itemCount: filteredUsers.length,
                              itemBuilder: (context, index) {
                                final user = filteredUsers[index];
                                return Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  child: ListTile(
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    leading: CircleAvatar(
                                      backgroundColor: isDarkMode 
                                          ? const Color(0xFF3A4048) 
                                          : Colors.grey[300],
                                      child: Text(
                                        user['initials'],
                                        style: TextStyle(
                                          color: isDarkMode ? Colors.white : Colors.black,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    title: Text(
                                      user['name'],
                                      style: TextStyle(
                                        color: isDarkMode ? Colors.white : Colors.black,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    subtitle: Text(
                                      user['email'],
                                      style: TextStyle(
                                        color: isDarkMode ? Colors.grey : Colors.grey[600],
                                        fontSize: 12,
                                      ),
                                    ),
                                    trailing: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: user['isOnline'] ? Colors.green : Colors.orange,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        if (user['selected'])
                                          const Icon(
                                            Icons.check_circle,
                                            color: AppTheme.infoLight,
                                            size: 24,
                                          ),
                                      ],
                                    ),
                                    onTap: () {
                                      setState(() {
                                        user['selected'] = !user['selected'];
                                      });
                                    },
                                    tileColor: user['selected'] ? AppTheme.infoLight.withValues(alpha: 0.2) : null,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                      side: user['selected'] 
                                          ? const BorderSide(color: AppTheme.infoLight, width: 1.5)
                                          : BorderSide.none,
                                    ),
                                  ),
                                );
                              },
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                ),
                
                // Action Buttons
                Container(
                  width: double.infinity,
                  color: context.cardColor,
                  padding: const EdgeInsets.all(24),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 1,
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(
                              color: isDarkMode 
                                  ? const Color(0xFF3A4048) 
                                  : Colors.grey[400]!,
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: Text(
                            'Cancel',
                            style: TextStyle(
                              color: isDarkMode ? Colors.white : Colors.black,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: Builder(
                          builder: (context) {
                            final selectedCount = availableUsers.where((user) => user['selected']).length;
                            return ElevatedButton.icon(
                              onPressed: selectedCount > 0 ? () async {
                                final selectedUsers = availableUsers.where((user) => user['selected']).toList();
                                final selectedUserIds = selectedUsers.map((u) => u['userId'] as String).toList();

                                // Close dialog
                                navigator.pop();

                                // Show loading indicator
                                showDialog(
                                  context: this.context,
                                  barrierDismissible: false,
                                  builder: (_) => const Center(child: CircularProgressIndicator()),
                                );

                                try {
                                  // Get current member IDs and add new ones
                                  // The API replaces all members, so we need to include existing + new
                                  final currentMemberIds = _channelMembers.map((m) => m.userId).toList();
                                  final allMemberIds = [...currentMemberIds, ...selectedUserIds];

                                  // Call API to add members
                                  final response = await _chatApiService.addChannelMembers(
                                    workspaceId!,
                                    widget.channelId,
                                    allMemberIds,
                                    isPrivate: widget.isPrivateChannel,
                                  );

                                  // Close loading dialog
                                  navigator.pop();

                                  if (response.success) {
                                    // Refresh members list
                                    await _fetchChannelMembers();

                                    // Show success message
                                    scaffoldMessenger.showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          selectedCount == 1
                                              ? 'Added ${selectedUsers.first['name']} to the channel'
                                              : 'Added $selectedCount members to the channel',
                                        ),
                                        backgroundColor: AppTheme.infoLight,
                                        duration: const Duration(seconds: 3),
                                      ),
                                    );
                                  } else {
                                    // Show error message
                                    scaffoldMessenger.showSnackBar(
                                      SnackBar(
                                        content: Text(response.message ?? 'Failed to add members'),
                                        backgroundColor: Colors.red,
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  // Close loading dialog
                                  navigator.pop();

                                  // Show error
                                  scaffoldMessenger.showSnackBar(
                                    SnackBar(
                                      content: Text('Error adding members: $e'),
                                      backgroundColor: Colors.red,
                                    ),
                                  );
                                }
                              } : null,
                              icon: const Icon(Icons.person_add, size: 18),
                              label: Text(selectedCount > 0
                                  ? 'Add $selectedCount Member${selectedCount > 1 ? 's' : ''}'
                                  : 'Add Members'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: selectedCount > 0
                                    ? AppTheme.infoLight
                                    : (isDarkMode ? Colors.grey[700] : Colors.grey[300]),
                                foregroundColor: selectedCount > 0
                                    ? Colors.white
                                    : (isDarkMode ? Colors.grey[400] : Colors.grey[600]),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
                ],
            ),
          ),
        ),
      ),
    );
  }

  void _showLeaveChannelDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Leave Channel'),
        content: Text('Are you sure you want to leave "${widget.channelName}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context, {'action': 'leave'});
            },
            style: TextButton.styleFrom(foregroundColor: Colors.orange),
            child: const Text('Leave'),
          ),
        ],
      ),
    );
  }

  void _showDeleteChannelDialog() {
    final navigator = Navigator.of(context);
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    bool isDeleting = false;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Delete Channel'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Are you sure you want to delete "${widget.channelName}"?'),
              const SizedBox(height: 8),
              const Text(
                'This action cannot be undone. All messages and files will be permanently deleted.',
                style: TextStyle(color: Colors.red, fontSize: 12),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: isDeleting ? null : () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: isDeleting ? null : () async {
                final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
                if (workspaceId == null) {
                  Navigator.pop(dialogContext);
                  scaffoldMessenger.showSnackBar(
                    SnackBar(content: Text('No workspace selected')),
                  );
                  return;
                }

                setDialogState(() {
                  isDeleting = true;
                });

                try {
                  final response = await _chatApiService.deleteChannel(
                    workspaceId,
                    widget.channelId,
                  );

                  Navigator.pop(dialogContext);

                  if (response.success) {
                    scaffoldMessenger.showSnackBar(
                      SnackBar(
                        content: Text('Channel "${widget.channelName}" deleted'),
                        backgroundColor: AppTheme.infoLight,
                      ),
                    );
                    navigator.pop({'action': 'delete'});
                  } else {
                    scaffoldMessenger.showSnackBar(
                      SnackBar(
                        content: Text(response.message ?? 'Failed to delete channel'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                } catch (e) {
                  Navigator.pop(dialogContext);
                  scaffoldMessenger.showSnackBar(
                    SnackBar(
                      content: Text('Error deleting channel: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
              style: TextButton.styleFrom(
                foregroundColor: Colors.red,
                backgroundColor: Colors.red.withValues(alpha: 0.1),
              ),
              child: isDeleting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Delete'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBotsTab(bool isDarkMode) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Header with bot count and Add Bot button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Installed Bots (${_installedBots.length})',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              ElevatedButton.icon(
                onPressed: _isLoadingBots ? null : _showInstallBotDialog,
                icon: const Icon(Icons.add, size: 20),
                label: Text('bots.install_bot'.tr()),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Bots List
          Expanded(
            child: _isLoadingBots
                ? const Center(child: CircularProgressIndicator())
                : _botsError != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.error_outline,
                              size: 48,
                              color: Colors.red.withOpacity(0.7),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _botsError!,
                              style: TextStyle(
                                color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                                fontSize: 14,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: _fetchBots,
                              icon: const Icon(Icons.refresh, size: 20),
                              label: const Text('Retry'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.teal,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      )
                    : _installedBots.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.smart_toy_outlined,
                                  size: 64,
                                  color: isDarkMode ? Colors.grey[600] : Colors.grey[400],
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'bots.no_installations'.tr(),
                                  style: TextStyle(
                                    color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Install bots to automate tasks in this channel',
                                  style: TextStyle(
                                    color: isDarkMode ? Colors.grey[500] : Colors.grey[500],
                                    fontSize: 13,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            itemCount: _installedBots.length,
                            itemBuilder: (context, index) {
                              final installation = _installedBots[index];
                              return _buildInstalledBotCard(installation, isDarkMode);
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildInstalledBotCard(BotInstallation installation, bool isDarkMode) {
    // Find the bot info from available bots or use the bot from the installation
    Bot? foundBot;
    for (final b in _availableBots) {
      if (b.id == installation.botId) {
        foundBot = b;
        break;
      }
    }
    // Try to get bot from installation if available
    final bot = foundBot ?? installation.bot;

    final botName = bot?.effectiveDisplayName ?? 'Bot ${installation.botId.substring(0, 8)}';
    final botType = bot?.botType ?? BotType.custom;
    final botDescription = bot?.description;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Bot icon
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: Colors.teal.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                _getBotTypeIcon(botType),
                color: Colors.teal,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            // Bot info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    botName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    botType.displayName,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                  if (botDescription != null && botDescription.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      botDescription,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDarkMode ? Colors.grey[500] : Colors.grey[500],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            // Uninstall button
            IconButton(
              onPressed: () => _uninstallBot(installation),
              icon: const Icon(Icons.remove_circle_outline, color: Colors.red),
              tooltip: 'bots.uninstall_bot'.tr(),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getBotTypeIcon(BotType type) {
    switch (type) {
      case BotType.aiAssistant:
        return Icons.auto_awesome;
      case BotType.webhook:
        return Icons.webhook;
      case BotType.prebuilt:
        return Icons.extension;
      case BotType.custom:
        return Icons.smart_toy;
    }
  }

  void _showInstallBotDialog() {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    // Filter out already installed bots
    final installedBotIds = _installedBots.map((i) => i.botId).toSet();
    final availableToInstall = _availableBots.where((bot) => !installedBotIds.contains(bot.id)).toList();

    if (availableToInstall.isEmpty) {
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text('All available bots are already installed in this channel'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        builder: (context, scrollController) => Container(
          decoration: BoxDecoration(
            color: isDarkMode ? const Color(0xFF1A1F2B) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDarkMode ? Colors.grey[600] : Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.smart_toy, color: Colors.teal),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'bots.install_bot'.tr(),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              // Bots list
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: availableToInstall.length,
                  itemBuilder: (context, index) {
                    final bot = availableToInstall[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(12),
                        leading: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: Colors.teal.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            _getBotTypeIcon(bot.botType),
                            color: Colors.teal,
                          ),
                        ),
                        title: Text(
                          bot.effectiveDisplayName,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(bot.botType.displayName),
                            if (bot.description != null && bot.description!.isNotEmpty)
                              Text(
                                bot.description!,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                                ),
                              ),
                          ],
                        ),
                        trailing: ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            _installBot(bot);
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.teal,
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Install'),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _installBot(Bot bot) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    final scaffoldMessenger = ScaffoldMessenger.of(context);

    try {
      final response = await _botApiService.installBot(
        workspaceId,
        bot.id,
        InstallBotDto(
          channelId: widget.channelId,
        ),
      );

      if (response.success) {
        await _fetchBots();
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text('bots.bot_installed'.tr()),
            backgroundColor: Colors.teal,
          ),
        );
      } else {
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'Failed to install bot'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text('Error installing bot: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _uninstallBot(BotInstallation installation) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    final scaffoldMessenger = ScaffoldMessenger.of(context);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('bots.uninstall_bot'.tr()),
        content: const Text('Are you sure you want to uninstall this bot from this channel?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('bots.uninstall_bot'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final response = await _botApiService.uninstallBot(
        workspaceId,
        installation.botId,
        channelId: widget.channelId,
      );

      if (response.success) {
        await _fetchBots();
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text('bots.bot_uninstalled'.tr()),
            backgroundColor: Colors.teal,
          ),
        );
      } else {
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'Failed to uninstall bot'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text('Error uninstalling bot: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}