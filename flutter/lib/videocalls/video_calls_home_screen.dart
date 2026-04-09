import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_html/flutter_html.dart';
import 'video_call_screen.dart' as video_call;
import 'schedule_meeting_screen.dart';
import 'meeting_summary_screen.dart';
import 'meeting_note_screen.dart' as meeting_note;
import 'meeting_details_screen.dart' as meeting_details;
import '../dao/workspace_dao.dart';
import '../services/workspace_service.dart';
import '../services/video_call_service.dart';
import '../services/auth_service.dart';
import '../services/analytics_service.dart';
import '../models/videocalls/video_call_analytics.dart';
import '../models/videocalls/video_call.dart';
import '../api/base_api_client.dart';
import '../api/services/video_call_service.dart' as video_call_api;
import '../api/services/workspace_api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/member_profile_dialog.dart';
import '../widgets/deskive_toolbar.dart';
import '../widgets/deskive_search_bar.dart';

class VideoCallsHomeScreen extends StatefulWidget {
  final bool showAppBar;
  
  const VideoCallsHomeScreen({super.key, this.showAppBar = false});

  @override
  State<VideoCallsHomeScreen> createState() => _VideoCallsHomeScreenState();
}

class _VideoCallsHomeScreenState extends State<VideoCallsHomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _selectedTab = 'contacts'; // For non-appbar mode (drawer mode) - use key not translated text
  String _searchQuery = '';
  String _filterType = 'All';
  final WorkspaceDao _workspaceDao = WorkspaceDao();
  bool _isLoadingContacts = false;
  VideoCallAnalytics? _analytics;
  bool _isLoadingAnalytics = false;

  // Search mode
  bool _isSearching = false;
  
  // Call History
  final List<CallHistory> _callHistory = [
    CallHistory(
      participants: ['Alice Wilson'],
      type: CallType.video,
      duration: const Duration(minutes: 30),
      timestamp: DateTime.now().subtract(const Duration(hours: 15, minutes: 17)),
      status: CallStatus.completed,
    ),
    CallHistory(
      participants: ['Group video call (3 participants)'],
      type: CallType.video,
      duration: const Duration(minutes: 45),
      timestamp: DateTime.now().subtract(const Duration(hours: 14, minutes: 17)),
      status: CallStatus.completed,
    ),
    CallHistory(
      participants: ['Bob Martinez'],
      type: CallType.audio,
      duration: const Duration(minutes: 15),
      timestamp: DateTime.now().subtract(const Duration(hours: 16, minutes: 17)),
      status: CallStatus.completed,
    ),
  ];
  
  // Scheduled Meetings
  final List<ScheduledMeeting> _scheduledMeetings = [
    ScheduledMeeting(
      title: 'Weekly Team Standup',
      participants: ['Alice Wilson', 'Bob Martinez', 'Carol Chen'],
      scheduledTime: DateTime.now().add(const Duration(hours: 2)),
      duration: const Duration(minutes: 30),
      type: CallType.video,
      recurring: true,
    ),
    ScheduledMeeting(
      title: 'Project Review',
      participants: ['David Kumar', 'Emily Rodriguez'],
      scheduledTime: DateTime.now().add(const Duration(days: 1, hours: 3)),
      duration: const Duration(hours: 1),
      type: CallType.video,
    ),
    ScheduledMeeting(
      title: 'Client Presentation',
      participants: ['External Client', 'Sales Team'],
      scheduledTime: DateTime.now().add(const Duration(days: 2)),
      duration: const Duration(hours: 1, minutes: 30),
      type: CallType.video,
      hasNotes: true,
    ),
    ScheduledMeeting(
      title: 'Design Review',
      participants: ['Design Team'],
      scheduledTime: DateTime.now().add(const Duration(days: 3, hours: 4)),
      duration: const Duration(minutes: 45),
      type: CallType.video,
    ),
  ];

  List<Contact> _contacts = [];
  Map<String, MemberPresence> _memberPresenceMap = {};

  @override
  void initState() {
    super.initState();
    AnalyticsService.instance.logScreenView(screenName: 'VideoCallsHomeScreen');

    // Initialize TabController
    _tabController = TabController(length: 3, vsync: this);

    // Initialize VideoCallService
    VideoCallService.instance.initialize();

    // Add listener to update UI when video calls data changes
    VideoCallService.instance.addListener(_onVideoCallsUpdated);

    _fetchMembersPresence();
    _fetchAnalytics();
    _fetchVideoCalls();
  }

  @override
  void dispose() {
    // Dispose controllers
    _tabController.dispose();
    _searchController.dispose();

    // Remove listener to prevent memory leaks
    VideoCallService.instance.removeListener(_onVideoCallsUpdated);
    super.dispose();
  }

  /// Called when VideoCallService data changes
  void _onVideoCallsUpdated() {
    if (mounted) {
      setState(() {
      });
    }
  }

  /// Toggle search mode
  void _toggleSearch() {
    setState(() {
      _isSearching = !_isSearching;
      if (!_isSearching) {
        _searchController.clear();
        _searchQuery = '';
      }
    });
  }

  /// Handle search text changes
  void _onSearchChanged(String query) {
    setState(() {
      _searchQuery = query.toLowerCase();
    });
  }

  /// Fetch video calls from API
  Future<void> _fetchVideoCalls() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      return;
    }

    try {
      await VideoCallService.instance.fetchVideoCalls(workspaceId);

      // Force UI update
      if (mounted) {
        setState(() {});
      }
    } catch (e) {
      // Force UI update even on error
      if (mounted) {
        setState(() {});
      }
    }
  }

  /// Fetch video call analytics from API
  Future<void> _fetchAnalytics() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      return;
    }

    setState(() {
      _isLoadingAnalytics = true;
    });

    try {
      await VideoCallService.instance.fetchAnalytics(workspaceId);

      setState(() {
        _analytics = VideoCallService.instance.analytics;
        _isLoadingAnalytics = false;
      });

    } catch (e) {
      setState(() {
        _analytics = VideoCallAnalytics.empty();
        _isLoadingAnalytics = false;
      });
    }
  }

  /// Fetch members presence from API
  Future<void> _fetchMembersPresence() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    debugPrint('[VideoCallsHome] Fetching members presence, workspaceId: $workspaceId');
    if (workspaceId == null) {
      debugPrint('[VideoCallsHome] No workspace ID, skipping');
      return;
    }

    setState(() {
      _isLoadingContacts = true;
    });

    try {
      // Fetch both presence data and members data in parallel
      debugPrint('[VideoCallsHome] Starting parallel fetch for presence and members');
      final presenceFuture = _workspaceDao.getMembersPresence(workspaceId);
      final membersFuture = WorkspaceApiService().getMembers(workspaceId);

      final results = await Future.wait([presenceFuture, membersFuture]);
      final presenceMembers = results[0] as List<MemberPresence>;
      final membersResponse = results[1] as ApiResponse<List<WorkspaceMember>>;
      debugPrint('[VideoCallsHome] Got ${presenceMembers.length} presence members');
      debugPrint('[VideoCallsHome] Members API success: ${membersResponse.success}, count: ${membersResponse.data?.length ?? 0}');

      // Create a map of userId -> avatar from members API
      final Map<String, String?> avatarMap = {};
      if (membersResponse.success && membersResponse.data != null) {
        for (final member in membersResponse.data!) {
          avatarMap[member.userId] = member.avatar;
        }
      }

      // If presence data is empty but we have members, create MemberPresence from members
      List<MemberPresence> effectiveMembers = presenceMembers;
      if (presenceMembers.isEmpty && membersResponse.success && membersResponse.data != null && membersResponse.data!.isNotEmpty) {
        debugPrint('[VideoCallsHome] Presence empty, falling back to members data');
        effectiveMembers = membersResponse.data!.map((member) => MemberPresence(
          userId: member.userId,
          name: member.name ?? 'Unknown',
          email: member.email,
          avatar: member.avatar,
          role: member.role.value,
          status: 'offline',
          lastSeen: null,
          connectionCount: 0,
          devices: {},
        )).toList();
      }

      setState(() {
        // Store the member presence data for profile dialog
        _memberPresenceMap = {
          for (final member in effectiveMembers) member.userId: member,
        };

        _contacts = effectiveMembers.map((member) {
          // Convert API status to ContactStatus
          ContactStatus status;
          switch (member.status.toLowerCase()) {
            case 'online':
              status = ContactStatus.online;
              break;
            case 'away':
              status = ContactStatus.away;
              break;
            case 'busy':
              status = ContactStatus.inMeeting;
              break;
            default:
              status = ContactStatus.offline;
          }

          // Get initials from name
          final nameParts = member.name.split(' ');
          final initials = nameParts.length >= 2
              ? '${nameParts[0][0]}${nameParts[1][0]}'
              : nameParts.isNotEmpty
                  ? nameParts[0].substring(0, 1).toUpperCase()
                  : 'U';

          // Format last seen
          String lastActive;
          if (member.status.toLowerCase() == 'online') {
            lastActive = 'videocalls.active_now'.tr();
          } else if (member.lastSeen != null) {
            final lastSeenDate = DateTime.parse(member.lastSeen!);
            final difference = DateTime.now().difference(lastSeenDate);

            if (difference.inMinutes < 1) {
              lastActive = 'videocalls.just_now'.tr();
            } else if (difference.inMinutes < 60) {
              lastActive = 'videocalls.started_minutes_ago'.tr(args: [difference.inMinutes.toString()]);
            } else if (difference.inHours < 24) {
              lastActive = 'videocalls.started_hours_ago'.tr(args: [difference.inHours.toString()]);
            } else {
              lastActive = 'videocalls.started_days_ago'.tr(args: [difference.inDays.toString()]);
            }
          } else {
            lastActive = 'videocalls.unknown'.tr();
          }

          // Generate color based on user ID
          final colors = [
            context.primaryColor,
            AppTheme.successLight,
            const Color(0xFFFF6B6B),
            const Color(0xFF6366F1),
            const Color(0xFFEC4899),
            AppTheme.warningLight,
            const Color(0xFF00BCD4),
          ];
          final colorIndex = member.userId.hashCode % colors.length;

          // Get avatar from members API (which has avatar data)
          final avatarUrl = avatarMap[member.userId] ?? member.avatar;

          return Contact(
            name: member.name,
            email: member.email,
            userId: member.userId,
            status: status,
            lastActive: lastActive,
            initials: initials,
            color: colors[colorIndex],
            hasActiveCall: false,
            avatarUrl: avatarUrl,
          );
        }).toList();

        _isLoadingContacts = false;
      });

    } catch (e, stack) {
      debugPrint('[VideoCallsHome] Error fetching members: $e');
      debugPrint('[VideoCallsHome] Stack: $stack');
      setState(() {
        _isLoadingContacts = false;
      });
    }
  }

  List<Contact> get _filteredContacts {
    List<Contact> filtered = _contacts;

    // Filter out current user
    final currentUserEmail = AuthService.instance.currentUser?.email;
    if (currentUserEmail != null) {
      filtered = filtered.where((contact) => contact.email != currentUserEmail).toList();
    }

    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((contact) {
        return contact.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
               contact.email.toLowerCase().contains(_searchQuery.toLowerCase());
      }).toList();
    }

    // Apply status filter
    if (_filterType != 'All') {
      filtered = filtered.where((contact) {
        switch (_filterType) {
          case 'Online':
            return contact.status == ContactStatus.online;
          case 'Offline':
            return contact.status == ContactStatus.offline;
          case 'In Meeting':
            return contact.status == ContactStatus.inMeeting;
          default:
            return true;
        }
      }).toList();
    }

    return filtered;
  }

  /// Show the member profile dialog for a contact
  void _showContactProfile(Contact contact) {
    final memberPresence = _memberPresenceMap[contact.userId];
    if (memberPresence != null) {
      showMemberPresenceProfileDialog(
        context: context,
        member: memberPresence,
        avatarUrl: contact.avatarUrl, // Pass avatar from members API
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      // Use theme background color for consistency with other screens
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: widget.showAppBar ? DeskiveToolbar(
        title: 'videocalls.video_calls'.tr(),
        isSearching: _isSearching,
        searchController: _searchController,
        onSearchChanged: _onSearchChanged,
        onSearchToggle: _toggleSearch,
        searchHint: 'videocalls.search_contacts'.tr(),
        leading: _buildLeadingWidget(context),
        leadingWidth: 110,
        actions: _buildNormalModeActions(),
        customActions: _buildCustomActions(context),
        bottom: _buildTabBar(),
      ) : null,
      drawer: Drawer(
        backgroundColor: Theme.of(context).drawerTheme.backgroundColor ?? Theme.of(context).scaffoldBackgroundColor,
        shape: widget.showAppBar ? const RoundedRectangleBorder() : null,
        child: SafeArea(
          child: Column(
            children: [
              // Drawer Header - only show when not in More screen
              if (!widget.showAppBar)
              DrawerHeader(
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Icon(
                      Icons.videocam,
                      color: Colors.white,
                      size: 48,
                    ),
                    SizedBox(height: 16),
                    Text(
                      'videocalls.video_calls'.tr(),
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'videocalls.ai_powered_meetings'.tr(),
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            // Quick Actions
            Container(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                bottom: 16,
                top: widget.showAppBar ? 24 : 8, // Add extra top padding when no header
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'videocalls.quick_actions'.tr(),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.2,
                      color: isDark ? Colors.white60 : Colors.grey[600],
                    ),
                  ),
                  SizedBox(height: 16),
                  _buildQuickActionButton(
                    icon: Icons.videocam,
                    label: 'videocalls.start_video_call'.tr(),
                    onTap: () {
                      Navigator.pop(context);
                      _startVideoCall(context);
                    },
                    isPrimary: true,
                    isDark: isDark,
                  ),
                  SizedBox(height: 8),
                  _buildQuickActionButton(
                    icon: Icons.phone,
                    label: 'videocalls.audio_call'.tr(),
                    onTap: () {
                      Navigator.pop(context);
                      _startAudioCall(context);
                    },
                    isDark: isDark,
                  ),
                  SizedBox(height: 8),
                  _buildQuickActionButton(
                    icon: Icons.calendar_today,
                    label: 'videocalls.schedule_meeting'.tr(),
                    onTap: () {
                      Navigator.pop(context);
                      _scheduleMeeting(context);
                    },
                    isDark: isDark,
                  ),
                  SizedBox(height: 8),
                  _buildQuickActionButton(
                    icon: Icons.history,
                    label: 'videocalls.call_history'.tr(),
                    onTap: () {
                      Navigator.pop(context);
                      setState(() => _selectedTab = 'history');
                      _fetchVideoCalls();
                    },
                    isDark: isDark,
                  ),
                ],
              ),
            ),
            // Recent Contacts
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'videocalls.contacts'.tr().toUpperCase(),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.2,
                        color: isDark ? Colors.white60 : Colors.grey[600],
                      ),
                    ),
                  ),
                  SizedBox(height: 16),
                  Expanded(
                    child: _isLoadingContacts
                        ? Center(child: CircularProgressIndicator())
                        : _contacts.isEmpty
                            ? Center(
                                child: Text(
                                  'videocalls.no_available_contacts'.tr(),
                                  style: TextStyle(
                                    color: isDark ? Colors.white60 : Colors.grey[600],
                                  ),
                                ),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 8),
                                itemCount: _contacts.length > 3 ? 3 : _contacts.length,
                                itemBuilder: (context, index) {
                                  final contact = _contacts[index];
                                  return _buildRecentContact(contact, isDark);
                                },
                              ),
                  ),
                ],
              ),
            ),
            // // AI Features
            // Container(
            //   padding: const EdgeInsets.all(16),
            //   decoration: BoxDecoration(
            //     border: Border(
            //       top: BorderSide(
            //         color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200]!,
            //       ),
            //     ),
            //   ),
            //   child: Column(
            //     crossAxisAlignment: CrossAxisAlignment.start,
            //     children: [
            //       Text(
            //         'AI FEATURES',
            //         style: TextStyle(
            //           fontSize: 12,
            //           fontWeight: FontWeight.w600,
            //           letterSpacing: 1.2,
            //           color: isDark ? Colors.white60 : Colors.grey[600],
            //         ),
            //       ),
            //       SizedBox(height: 16),
            //       _buildAIFeature(
            //         icon: Icons.closed_caption,
            //         label: 'Real-time Transcription',
            //         isDark: isDark,
            //       ),
            //       SizedBox(height: 12),
            //       _buildAIFeature(
            //         icon: Icons.translate,
            //         label: 'Live Translation',
            //         isDark: isDark,
            //       ),
            //       SizedBox(height: 12),
            //       _buildAIFeature(
            //         icon: Icons.note_alt,
            //         label: 'Meeting Notes',
            //         isDark: isDark,
            //       ),
            //     ],
            //   ),
            // ),
          ],
        ),
        ),
      ),
      body: Column(
        children: [
          // Header
          if (!widget.showAppBar)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
                border: Border(
                  bottom: BorderSide(
                    color: Theme.of(context).dividerColor,
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header Row
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isSmallScreen = constraints.maxWidth < 800;
                      
                      if (isSmallScreen) {
                        // Stack layout for small screens
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Builder(
                                  builder: (context) => IconButton(
                                    icon: Icon(Icons.menu),
                                    onPressed: () => Scaffold.of(context).openDrawer(),
                                  ),
                                ),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'videocalls.video_calls'.tr(),
                                        style: TextStyle(
                                          fontSize: 24,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        'videocalls.ai_powered_meetings'.tr(),
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: isDark ? Colors.white60 : Colors.grey[600],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                // AI Enhanced badge only
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: context.primaryColor.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 20),
                                    border: Border.all(
                                      color: Theme.of(context).colorScheme.primary,
                                      width: 1.5,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.auto_awesome,
                                        size: 14,
                                        color: Theme.of(context).colorScheme.primary,
                                      ),
                                      SizedBox(width: 6),
                                      Text(
                                        'videocalls.ai_badge'.tr(),
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Theme.of(context).colorScheme.primary,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 16),
                            // New Meeting button below on small screens
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed: () => _createNewMeeting(context),
                                icon: Icon(Icons.add, size: 18),
                                label: Text('videocalls.new_meeting'.tr()),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Theme.of(context).colorScheme.primary,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        );
                      } else {
                        // Original layout for larger screens
                        return Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Builder(
                                  builder: (context) => IconButton(
                                    icon: Icon(Icons.menu),
                                    onPressed: () => Scaffold.of(context).openDrawer(),
                                  ),
                                ),
                                SizedBox(width: 16),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'videocalls.video_calls'.tr(),
                                      style: TextStyle(
                                        fontSize: 32,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      'videocalls.start_ai_powered_calls'.tr(),
                                      style: TextStyle(
                                        fontSize: 16,
                                        color: isDark ? Colors.white60 : Colors.grey[600],
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: context.primaryColor.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 20),
                                    border: Border.all(
                                      color: Theme.of(context).colorScheme.primary,
                                      width: 1.5,
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.auto_awesome,
                                        size: 16,
                                        color: Theme.of(context).colorScheme.primary,
                                      ),
                                      SizedBox(width: 8),
                                      Text(
                                        'videocalls.ai_features'.tr(),
                                        style: TextStyle(
                                          color: Theme.of(context).colorScheme.primary,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                SizedBox(width: 16),
                                ElevatedButton.icon(
                                  onPressed: () => _createNewMeeting(context),
                                  icon: Icon(Icons.add),
                                  label: Text('videocalls.new_meeting'.tr()),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Theme.of(context).colorScheme.primary,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        );
                      }
                    },
                  ),
                  SizedBox(height: 20),
                  // Tabs - Make responsive (History moved to drawer)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildTab('contacts', Icons.people, isDark),
                        SizedBox(width: 12),
                        // _buildTab('History', Icons.history, isDark), // Moved to drawer
                        // SizedBox(width: 12),
                        _buildTab('scheduled', Icons.calendar_today, isDark),
                        SizedBox(width: 12),
                        _buildTab('pinned', Icons.push_pin, isDark),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          // Filter dropdown - only show on Contacts tab when accessed from More screen
          if (widget.showAppBar && _tabController.index == 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Theme.of(context).scaffoldBackgroundColor,
              child: Row(
                children: [
                  Text(
                    'videocalls.filter'.tr(),
                    style: TextStyle(
                      color: isDark ? Colors.white70 : Colors.black87,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: Theme.of(context).dividerColor,
                      ),
                    ),
                    child: DropdownButton<String>(
                      value: _filterType,
                      underline: SizedBox(),
                      icon: Icon(
                        Icons.arrow_drop_down,
                        color: isDark ? Colors.white60 : Colors.grey[600],
                      ),
                      dropdownColor: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                      items: [
                        DropdownMenuItem(value: 'All', child: Text('videocalls.all'.tr())),
                        DropdownMenuItem(value: 'Online', child: Text('videocalls.online'.tr())),
                        DropdownMenuItem(value: 'Offline', child: Text('videocalls.offline'.tr())),
                        DropdownMenuItem(value: 'In Meeting', child: Text('videocalls.in_meeting'.tr())),
                      ],
                      onChanged: (value) => setState(() => _filterType = value!),
                    ),
                  ),
                ],
              ),
            ),
          // Main Content based on selected tab
          Expanded(
            child: widget.showAppBar
              ? TabBarView(
                  controller: _tabController,
                  children: [
                    _buildContactsTab(isDark),
                    _buildScheduledTab(isDark),
                    _buildPinnedTab(isDark),
                  ],
                )
              : Container(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  child: _buildTabContent(isDark),
                ),
          ),
        ],
      ),
      // Quick Video Call button at bottom center
      floatingActionButton: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [context.primaryColor, Color(0xFF8B6BFF)],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: context.primaryColor.withOpacity(0.3),
              blurRadius: 8,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: FloatingActionButton.extended(
          onPressed: () => _startVideoCall(context),
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.white,
          elevation: 0,
          icon: Icon(Icons.videocam, size: 24),
          label: Text(
            'videocalls.quick_video_call'.tr(),
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  /// Build TabBar with menu icon for bottom widget
  PreferredSizeWidget _buildTabBar() {
    return PreferredSize(
      preferredSize: const Size.fromHeight(48),
      child: Row(
        children: [
          Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(context).openDrawer(),
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
          ),
          Expanded(
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              tabs: [
                Tab(text: 'videocalls.contacts'.tr()),
                Tab(text: 'videocalls.scheduled'.tr()),
                Tab(text: 'videocalls.pinned'.tr()),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Build leading widget with back arrow and AI button
  Widget _buildLeadingWidget(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Back button
        IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
          padding: const EdgeInsets.all(8),
        ),
        // const SizedBox(width: 4),
        // // AI Features button
        // InkWell(
        //   onTap: () => _showAIFeatures(context),
        //   borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 16),
        //   child: Container(
        //     padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        //     decoration: BoxDecoration(
        //       color: context.primaryColor.withOpacity(0.1),
        //       borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 16),
        //       border: Border.all(
        //         color: context.primaryColor,
        //         width: 1,
        //       ),
        //     ),
        //     child: Row(
        //       mainAxisSize: MainAxisSize.min,
        //       children: [
        //         Icon(
        //           Icons.auto_awesome,
        //           size: 12,
        //           color: context.primaryColor,
        //         ),
        //         const SizedBox(width: 4),
        //         Text(
        //           'AI',
        //           style: TextStyle(
        //             fontSize: 10,
        //             color: context.primaryColor,
        //             fontWeight: FontWeight.w600,
        //           ),
        //         ),
        //       ],
        //     ),
        //   ),
        // ),
      ],
    );
  }

  /// Build actions for normal mode toolbar
  List<DeskiveToolbarAction> _buildNormalModeActions() {
    return [
      DeskiveToolbarAction.icon(
        icon: Icons.add,
        tooltip: 'videocalls.create_new_meeting'.tr(),
        onPressed: () => _createNewMeeting(context),
      ),
    ];
  }

  /// Build custom action widgets (complex UI elements)
  List<Widget> _buildCustomActions(BuildContext context) {
    return [
      // More options button removed
    ];
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool isPrimary = false,
    required bool isDark,
  }) {
    final backgroundColor = isPrimary
        ? null // We'll use gradient for primary buttons
        : Colors.transparent; // No background for non-primary buttons
    final foregroundColor = isPrimary
        ? Colors.white
        : isDark
            ? Colors.white70
            : Colors.grey[700]!;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: backgroundColor,
          gradient: isPrimary
              ? LinearGradient(
                  colors: [context.primaryColor, Color(0xFF8B6BFF)],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                )
              : null,
          borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: foregroundColor),
            SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                color: foregroundColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentContact(Contact contact, bool isDark) {
    return InkWell(
      onTap: () {
        Navigator.pop(context);
        _callContact(contact);
      },
      borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        child: Row(
          children: [
            GestureDetector(
              onTap: () {
                Navigator.pop(context);
                _showContactProfile(contact);
              },
              child: Stack(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: contact.color.withOpacity(0.2),
                    backgroundImage: contact.avatarUrl != null && contact.avatarUrl!.isNotEmpty
                        ? NetworkImage(contact.avatarUrl!)
                        : null,
                    child: contact.avatarUrl == null || contact.avatarUrl!.isEmpty
                        ? Text(
                            contact.initials,
                            style: TextStyle(
                              color: contact.color,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          )
                        : null,
                  ),
                  if (contact.status == ContactStatus.online)
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: Colors.green,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
                            width: 2,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    contact.name,
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  SizedBox(height: 2),
                  Row(
                    children: [
                      if (contact.status == ContactStatus.online)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'videocalls.online'.tr().toLowerCase(),
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.green,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAIFeature({
    required IconData icon,
    required String label,
    required bool isDark,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: isDark ? Colors.white38 : Colors.grey[600],
        ),
        SizedBox(width: 12),
        Text(
          label,
          style: TextStyle(
            color: isDark ? Colors.white70 : Colors.grey[700],
          ),
        ),
      ],
    );
  }

  /// Build Contacts tab content
  Widget _buildContactsTab(bool isDark) {
    // Show loading indicator while fetching contacts
    if (_isLoadingContacts) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(
                color: isDark ? Colors.white70 : Theme.of(context).primaryColor,
              ),
              const SizedBox(height: 16),
              Text(
                'videocalls.loading_contacts'.tr(),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: isDark ? Colors.white70 : Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Contact list
          _filteredContacts.isNotEmpty
            ? ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _filteredContacts.length,
                itemBuilder: (context, index) {
                  final contact = _filteredContacts[index];
                  return _buildContactListItem(contact, isDark);
                },
              )
            : Container(
                padding: const EdgeInsets.all(32),
                child: Column(
                  children: [
                    Icon(
                      Icons.search_off,
                      size: 48,
                      color: isDark ? Colors.white24 : Colors.grey[300],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'videocalls.no_contacts_found'.tr(),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'videocalls.try_adjusting_search'.tr(),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }

  /// Build Scheduled tab content
  Widget _buildScheduledTab(bool isDark) {
    final now = DateTime.now();

    // Helper to check if a meeting is ongoing (started but not ended)
    bool isOngoing(VideoCall call) {
      if (call.status == 'active') return true;
      if (call.status == 'ended') return false;
      if (call.scheduledStartTime == null) return false;

      final start = DateTime.parse(call.scheduledStartTime!);
      if (now.isBefore(start)) return false; // Not started yet

      if (call.scheduledEndTime != null) {
        final end = DateTime.parse(call.scheduledEndTime!);
        if (now.isAfter(end)) return false; // Already ended
      }
      return true; // Started and not ended
    }

    // Helper to check if a meeting is upcoming (not started yet)
    bool isUpcoming(VideoCall call) {
      if (call.status == 'ended') return false;
      if (call.status == 'active') return false;
      if (call.scheduledStartTime == null) return true;

      final start = DateTime.parse(call.scheduledStartTime!);
      return now.isBefore(start);
    }

    // Helper to check if a meeting has ended
    bool hasEnded(VideoCall call) {
      if (call.status == 'ended') return true;
      if (call.scheduledEndTime != null) {
        final end = DateTime.parse(call.scheduledEndTime!);
        return now.isAfter(end);
      }
      return false;
    }

    // Categorize calls
    final ongoingCalls = VideoCallService.instance.videoCalls
        .where((call) => isOngoing(call))
        .toList();

    final upcomingCalls = VideoCallService.instance.videoCalls
        .where((call) => isUpcoming(call) && !hasEnded(call))
        .toList();

    final endedCalls = VideoCallService.instance.videoCalls
        .where((call) => hasEnded(call))
        .toList();

    // Sort ongoing calls: most recently started first
    ongoingCalls.sort((a, b) {
      final aTime = a.actualStartTime ?? a.scheduledStartTime ?? a.createdAt;
      final bTime = b.actualStartTime ?? b.scheduledStartTime ?? b.createdAt;
      return DateTime.parse(bTime).compareTo(DateTime.parse(aTime));
    });

    // Sort upcoming calls: nearest upcoming first (by scheduledStartTime ascending)
    upcomingCalls.sort((a, b) {
      final aTime = a.scheduledStartTime != null
          ? DateTime.parse(a.scheduledStartTime!)
          : DateTime.parse(a.createdAt);
      final bTime = b.scheduledStartTime != null
          ? DateTime.parse(b.scheduledStartTime!)
          : DateTime.parse(b.createdAt);
      return aTime.compareTo(bTime);
    });

    // Sort ended calls: most recent to oldest (by actualEndTime or scheduledEndTime descending)
    endedCalls.sort((a, b) {
      final aTime = a.actualEndTime ?? a.scheduledEndTime ?? a.updatedAt;
      final bTime = b.actualEndTime ?? b.scheduledEndTime ?? b.updatedAt;
      return DateTime.parse(bTime).compareTo(DateTime.parse(aTime));
    });

    // Combine: ongoing first, then upcoming, then ended
    final allCalls = [...ongoingCalls, ...upcomingCalls, ...endedCalls];

    final isLoading = VideoCallService.instance.isLoadingVideoCalls;

    if (isLoading && VideoCallService.instance.videoCalls.isEmpty) {
      return Center(
        child: CircularProgressIndicator(),
      );
    }

    if (allCalls.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.calendar_today, size: 64, color: isDark ? Colors.white24 : Colors.grey[300]),
            SizedBox(height: 16),
            Text(
              'videocalls.no_scheduled_meetings'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            SizedBox(height: 8),
            Text(
              'videocalls.schedule_meeting_hint'.tr(),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: allCalls.length,
      itemBuilder: (context, index) => _buildScheduledCallItem(allCalls[index], isDark),
    );
  }

  /// Build Pinned tab content
  Widget _buildPinnedTab(bool isDark) {
    final pinnedCalls = VideoCallService.instance.videoCalls
        .where((call) => call.metadata['pinned'] == true)
        .toList();

    final isLoading = VideoCallService.instance.isLoadingVideoCalls;

    if (isLoading && VideoCallService.instance.videoCalls.isEmpty) {
      return Center(
        child: CircularProgressIndicator(),
      );
    }

    if (pinnedCalls.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.push_pin, size: 64, color: isDark ? Colors.white24 : Colors.grey[300]),
            SizedBox(height: 16),
            Text(
              'videocalls.no_pinned_meetings'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            SizedBox(height: 8),
            Text(
              'videocalls.pin_meetings_hint'.tr(),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: pinnedCalls.length,
      itemBuilder: (context, index) => _buildScheduledCallItem(pinnedCalls[index], isDark),
    );
  }

  Widget _buildTabContent(bool isDark) {
    // This method is only used for non-appbar mode (drawer mode)
    switch (_selectedTab) {
      case 'contacts':
        // Show loading indicator while fetching contacts
        if (_isLoadingContacts) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(
                  color: isDark ? Colors.white70 : Theme.of(context).primaryColor,
                ),
                const SizedBox(height: 16),
                Text(
                  'Loading contacts...',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: isDark ? Colors.white70 : Colors.grey[600],
                  ),
                ),
              ],
            ),
          );
        }

        // Original grid layout for main navigation (non-appbar mode)
        return GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 350,
            childAspectRatio: 1.2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: _filteredContacts.length + 2, // Changed from +3 to +2 (AI Features commented out)
          itemBuilder: (context, index) {
            if (index == 0) {
              return _buildActionCard(
                icon: Icons.videocam,
                title: 'videocalls.quick_video_call'.tr(),
                subtitle: 'videocalls.quick_video_call_desc'.tr(),
                color: AppTheme.successLight,
                onTap: () => _startVideoCall(context),
                isDark: isDark,
              );
            } else if (index == 1) {
              return _buildActionCard(
                icon: Icons.calendar_today,
                title: 'videocalls.schedule_meeting'.tr(),
                subtitle: 'videocalls.schedule_meeting_desc'.tr(),
                color: AppTheme.successLight,
                onTap: () => _scheduleMeeting(context),
                isDark: isDark,
              );
            }
            // else if (index == 2) {
            //   return _buildActionCard(
            //     icon: Icons.auto_awesome,
            //     title: 'AI Features',
            //     subtitle: 'Settings & preferences',
            //     color: const Color(0xFFFF6B6B),
            //     onTap: () => _showAIFeatures(context),
            //     isDark: isDark,
            //   );
            // }
            else {
              final contact = _filteredContacts[index - 2]; // Changed from -3 to -2
              return _buildContactCard(contact, isDark);
            }
          },
        );

      case 'history':
        // Get ended calls from API and sort by most recent
        final endedCalls = VideoCallService.instance.videoCalls
            .where((call) => call.status == 'ended')
            .toList()
          ..sort((a, b) {
            final aTime = a.actualEndTime ?? a.updatedAt;
            final bTime = b.actualEndTime ?? b.updatedAt;
            return DateTime.parse(bTime).compareTo(DateTime.parse(aTime));
          });

        final isLoading = VideoCallService.instance.isLoadingVideoCalls;

        return Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'videocalls.call_history'.tr(),
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : Colors.black,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          isLoading
                              ? 'videocalls.loading'.tr()
                              : '${endedCalls.length} ${'videocalls.recent_meetings'.tr().toLowerCase()}',
                          style: TextStyle(
                            fontSize: 14,
                            color: isDark ? Colors.white60 : Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [context.primaryColor, Color(0xFF70C8F0)],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: ElevatedButton.icon(
                      onPressed: () => _scheduleMeeting(context),
                      icon: Icon(Icons.add, size: 20, color: Colors.white),
                      label: Text(
                        'videocalls.schedule_meeting'.tr(),
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(5),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Call History List
            Expanded(
              child: isLoading && VideoCallService.instance.videoCalls.isEmpty
                  ? Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).colorScheme.primary),
                      ),
                    )
                  : endedCalls.isEmpty
                      ? RefreshIndicator(
                          onRefresh: () async {
                            final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
                            if (workspaceId != null) {
                              await _fetchVideoCalls();
                            }
                          },
                          color: Theme.of(context).colorScheme.primary,
                          child: SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            child: SizedBox(
                              height: MediaQuery.of(context).size.height - 300,
                              child: Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.history,
                                      size: 64,
                                      color: isDark ? Colors.white.withValues(alpha: 0.3) : Colors.grey[400],
                                    ),
                                    SizedBox(height: 16),
                                    Text(
                                      'videocalls.no_call_history'.tr(),
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w600,
                                        color: isDark ? Colors.white.withValues(alpha: 0.7) : Colors.grey[700],
                                      ),
                                    ),
                                    SizedBox(height: 8),
                                    Text(
                                      'videocalls.pull_down_refresh'.tr(),
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: isDark ? Colors.white.withValues(alpha: 0.5) : Colors.grey[500],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: () async {
                            final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
                            if (workspaceId != null) {
                              await _fetchVideoCalls();
                            }
                          },
                          color: Theme.of(context).colorScheme.primary,
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            physics: const AlwaysScrollableScrollPhysics(),
                            itemCount: endedCalls.length,
                            itemBuilder: (context, index) {
                              final call = endedCalls[index];
                              return _buildCallHistoryItemFromVideoCall(call, isDark);
                            },
                          ),
                        ),
            ),
          ],
        );
      case 'scheduled':
        final now = DateTime.now();

        // Helper to check if a meeting is ongoing (started but not ended)
        bool isOngoing(VideoCall call) {
          if (call.status == 'active') return true;
          if (call.status == 'ended') return false;
          if (call.scheduledStartTime == null) return false;

          final start = DateTime.parse(call.scheduledStartTime!);
          if (now.isBefore(start)) return false; // Not started yet

          if (call.scheduledEndTime != null) {
            final end = DateTime.parse(call.scheduledEndTime!);
            if (now.isAfter(end)) return false; // Already ended
          }
          return true; // Started and not ended
        }

        // Helper to check if a meeting is upcoming (not started yet)
        bool isUpcoming(VideoCall call) {
          if (call.status == 'ended') return false;
          if (call.status == 'active') return false;
          if (call.scheduledStartTime == null) return true;

          final start = DateTime.parse(call.scheduledStartTime!);
          return now.isBefore(start);
        }

        // Helper to check if a meeting has ended
        bool hasEnded(VideoCall call) {
          if (call.status == 'ended') return true;
          if (call.scheduledEndTime != null) {
            final end = DateTime.parse(call.scheduledEndTime!);
            return now.isAfter(end);
          }
          return false;
        }

        // Categorize calls
        final ongoingCalls = VideoCallService.instance.videoCalls
            .where((call) => isOngoing(call))
            .toList();

        final upcomingCalls = VideoCallService.instance.videoCalls
            .where((call) => isUpcoming(call) && !hasEnded(call))
            .toList();

        final endedCalls = VideoCallService.instance.videoCalls
            .where((call) => hasEnded(call))
            .toList();

        // Sort ongoing calls: most recently started first
        ongoingCalls.sort((a, b) {
          final aTime = a.actualStartTime ?? a.scheduledStartTime ?? a.createdAt;
          final bTime = b.actualStartTime ?? b.scheduledStartTime ?? b.createdAt;
          return DateTime.parse(bTime).compareTo(DateTime.parse(aTime));
        });

        // Sort upcoming calls: nearest upcoming first (by scheduledStartTime ascending)
        upcomingCalls.sort((a, b) {
          final aTime = a.scheduledStartTime != null
              ? DateTime.parse(a.scheduledStartTime!)
              : DateTime.parse(a.createdAt);
          final bTime = b.scheduledStartTime != null
              ? DateTime.parse(b.scheduledStartTime!)
              : DateTime.parse(b.createdAt);
          return aTime.compareTo(bTime);
        });

        // Sort ended calls: most recent to oldest (by actualEndTime or scheduledEndTime descending)
        endedCalls.sort((a, b) {
          final aTime = a.actualEndTime ?? a.scheduledEndTime ?? a.updatedAt;
          final bTime = b.actualEndTime ?? b.scheduledEndTime ?? b.updatedAt;
          return DateTime.parse(bTime).compareTo(DateTime.parse(aTime));
        });

        // Combine: ongoing first, then upcoming, then ended
        final allCalls = [...ongoingCalls, ...upcomingCalls, ...endedCalls];

        final isLoading = VideoCallService.instance.isLoadingVideoCalls;

        // Show loading state only on initial load (when we have no data at all)
        if (isLoading && VideoCallService.instance.videoCalls.isEmpty) {
          return Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(context.primaryColor),
            ),
          );
        }

        // Show empty state with refresh option
        if (allCalls.isEmpty) {
          return RefreshIndicator(
            onRefresh: () async {
              final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
              if (workspaceId != null) {
                await _fetchVideoCalls();
              }
            },
            color: context.primaryColor,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: MediaQuery.of(context).size.height - 300,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.event_busy,
                        size: 64,
                        color: isDark ? Colors.white.withValues(alpha: 0.3) : Colors.grey[400],
                      ),
                      SizedBox(height: 16),
                      Text(
                        'videocalls.no_scheduled_meetings'.tr(),
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white.withValues(alpha: 0.7) : Colors.grey[700],
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'videocalls.pull_down_refresh'.tr(),
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white.withValues(alpha: 0.5) : Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }

        // Show all calls from API with pull-to-refresh
        return RefreshIndicator(
          onRefresh: () async {
            final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
            if (workspaceId != null) {
              await _fetchVideoCalls();
            }
          },
          color: context.primaryColor,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: allCalls.length,
            itemBuilder: (context, index) {
              final call = allCalls[index];
              return _buildScheduledCallItem(call, isDark);
            },
          ),
        );
      case 'pinned':
        // Get pinned video calls from API (check metadata for pinned flag)
        final pinnedCalls = VideoCallService.instance.videoCalls
            .where((call) => call.metadata['pinned'] == true)
            .toList();

        final isLoading = VideoCallService.instance.isLoadingVideoCalls;

        // Show loading state only on initial load (when we have no data at all)
        if (isLoading && VideoCallService.instance.videoCalls.isEmpty) {
          return Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(context.primaryColor),
            ),
          );
        }

        // Show empty state with refresh option
        if (pinnedCalls.isEmpty) {
          return RefreshIndicator(
            onRefresh: () async {
              final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
              if (workspaceId != null) {
                await _fetchVideoCalls();
              }
            },
            color: context.primaryColor,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: MediaQuery.of(context).size.height - 300,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.push_pin_outlined,
                        size: 64,
                        color: isDark ? Colors.white.withValues(alpha: 0.3) : Colors.grey[400],
                      ),
                      SizedBox(height: 16),
                      Text(
                        'videocalls.no_pinned_meetings'.tr(),
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white.withValues(alpha: 0.7) : Colors.grey[700],
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'videocalls.pin_meetings_hint'.tr(),
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white.withValues(alpha: 0.5) : Colors.grey[500],
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'videocalls.pull_down_refresh'.tr(),
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.white.withValues(alpha: 0.4) : Colors.grey[400],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }

        // Show pinned calls from API with pull-to-refresh
        return RefreshIndicator(
          onRefresh: () async {
            final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
            if (workspaceId != null) {
              await _fetchVideoCalls();
            }
          },
          color: context.primaryColor,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: pinnedCalls.length,
            itemBuilder: (context, index) {
              final call = pinnedCalls[index];
              // Use appropriate builder based on call status
              if (call.status == 'scheduled') {
                return _buildScheduledCallItem(call, isDark);
              } else if (call.status == 'ended') {
                return _buildCallHistoryItemFromVideoCall(call, isDark);
              } else {
                // For active calls or other statuses
                return _buildScheduledCallItem(call, isDark);
              }
            },
          ),
        );
      default:
        return Center(child: Text('videocalls.contacts'.tr()));
    }
  }

  Widget _buildCallHistoryItem(CallHistory call, bool isDark) {
    final timeStr = _formatRelativeTime(call.timestamp);
    final durationStr = _formatDuration(call.duration);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).dividerColor,
        ),
      ),
      child: Row(
        children: [
          // Call type icon
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: call.type == CallType.video
                  ? Theme.of(context).colorScheme.primary
                  : Colors.green,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              call.type == CallType.video ? Icons.videocam : Icons.phone,
              color: Colors.white,
              size: 20,
            ),
          ),
          SizedBox(width: 12),
          // Call details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'videocalls.call_with'.tr(args: [call.type == CallType.video ? 'videocalls.video_call_type'.tr() : 'videocalls.audio_call_type'.tr(), call.participants.first]),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      durationStr,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.white60 : Colors.grey[600],
                      ),
                    ),
                    SizedBox(width: 16),
                    Text(
                      timeStr,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.white60 : Colors.grey[600],
                      ),
                    ),
                    if (call.recording) ...[
                      SizedBox(width: 8),
                      Icon(
                        Icons.circle,
                        size: 8,
                        color: Colors.red,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          // Participant avatars
          if (call.participants.length > 1)
            Row(
              children: call.participants.take(3).map((participant) {
                return Container(
                  margin: const EdgeInsets.only(left: 4),
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: context.primaryColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      participant[0].toUpperCase(),
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          SizedBox(width: 12),
          // Action buttons
          Row(
            children: [
              IconButton(
                onPressed: () {
                  if (call.type == CallType.video) {
                    _startVideoCallWithContact(Contact(
                      name: call.participants.first,
                      email: '${call.participants.first.toLowerCase().replaceAll(' ', '.')}@company.com',
                      userId: 'mock-user-id', // TODO: Replace with actual userId from call history API
                      status: ContactStatus.online,
                      lastActive: 'videocalls.active_now'.tr(),
                      initials: call.participants.first[0].toUpperCase(),
                      color: context.primaryColor,
                    ));
                  } else {
                    _startAudioCall(context);
                  }
                },
                icon: Icon(Icons.phone, size: 18),
                style: IconButton.styleFrom(
                  backgroundColor: isDark ? Colors.white.withValues(alpha: 0.1) : Colors.grey[100],
                  foregroundColor: isDark ? Colors.white70 : Colors.grey[600],
                  minimumSize: const Size(36, 36),
                ),
              ),
              SizedBox(width: 8),
              IconButton(
                onPressed: () => _scheduleMeeting(context),
                icon: Icon(Icons.schedule, size: 18),
                style: IconButton.styleFrom(
                  backgroundColor: isDark ? Colors.white.withValues(alpha: 0.1) : Colors.grey[100],
                  foregroundColor: isDark ? Colors.white70 : Colors.grey[600],
                  minimumSize: const Size(36, 36),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // NEW: Display VideoCall from API as call history item
  Widget _buildCallHistoryItemFromVideoCall(VideoCall call, bool isDark) {
    // Calculate call duration
    String durationStr = 'videocalls.unknown'.tr();
    if (call.actualStartTime != null && call.actualEndTime != null) {
      final start = DateTime.parse(call.actualStartTime!);
      final end = DateTime.parse(call.actualEndTime!);
      final duration = end.difference(start);
      durationStr = _formatDuration(duration);
    } else if (call.durationSeconds != null) {
      durationStr = _formatDuration(Duration(seconds: call.durationSeconds!));
    }

    // Format call time
    String timeStr = 'videocalls.unknown'.tr();
    if (call.actualEndTime != null) {
      timeStr = _formatRelativeTime(DateTime.parse(call.actualEndTime!));
    } else if (call.updatedAt != null) {
      timeStr = _formatRelativeTime(DateTime.parse(call.updatedAt));
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).dividerColor,
        ),
      ),
      child: Row(
        children: [
          // Call type icon
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: call.callType == 'video'
                  ? Theme.of(context).colorScheme.primary
                  : Colors.green,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              call.callType == 'video' ? Icons.videocam : Icons.phone,
              color: Colors.white,
              size: 20,
            ),
          ),
          SizedBox(width: 12),
          // Call details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  call.title.isNotEmpty ? call.title : (call.callType == 'video' ? 'videocalls.video_call'.tr() : 'videocalls.audio_call'.tr()),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      Icons.timer,
                      size: 14,
                      color: isDark ? Colors.white60 : Colors.grey[600],
                    ),
                    SizedBox(width: 4),
                    Text(
                      durationStr,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.white60 : Colors.grey[600],
                      ),
                    ),
                    SizedBox(width: 16),
                    Icon(
                      Icons.access_time,
                      size: 14,
                      color: isDark ? Colors.white60 : Colors.grey[600],
                    ),
                    SizedBox(width: 4),
                    Text(
                      timeStr,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.white60 : Colors.grey[600],
                      ),
                    ),
                    if (call.isRecording) ...[
                      SizedBox(width: 8),
                      Icon(
                        Icons.fiber_manual_record,
                        size: 12,
                        color: Colors.red,
                      ),
                      SizedBox(width: 4),
                      Text(
                        'videocalls.recorded'.tr(),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.red,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          // Participant count
          if (call.participantCount > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: context.primaryColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.people,
                    size: 16,
                    color: context.primaryColor,
                  ),
                  SizedBox(width: 4),
                  Text(
                    '${call.participantCount}',
                    style: TextStyle(
                      color: context.primaryColor,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  // NEW: Display VideoCall from API
  Widget _buildScheduledCallItem(VideoCall call, bool isDark) {
    // Parse scheduled time
    final scheduledTime = call.scheduledStartTime != null
        ? DateTime.parse(call.scheduledStartTime!)
        : DateTime.now();
    final timeStr = _formatScheduledTime(scheduledTime);

    // Calculate duration
    String durationStr = 'videocalls.default_duration'.tr(); // Default
    DateTime? scheduledEndTime;
    if (call.scheduledStartTime != null && call.scheduledEndTime != null) {
      final start = DateTime.parse(call.scheduledStartTime!);
      final end = DateTime.parse(call.scheduledEndTime!);
      scheduledEndTime = end;
      final duration = end.difference(start);
      durationStr = _formatDuration(duration);
    }

    // Check meeting status based on time
    final now = DateTime.now();
    String? timeStatus;
    Color? timeStatusColor;
    IconData? timeStatusIcon;

    if (call.scheduledStartTime != null) {
      final start = DateTime.parse(call.scheduledStartTime!);

      if (scheduledEndTime != null && now.isAfter(scheduledEndTime)) {
        // Meeting is over
        timeStatus = 'videocalls.ended'.tr();
        timeStatusColor = Colors.red;
        timeStatusIcon = Icons.event_busy;
      } else if (now.isAfter(start) || now.isAtSameMomentAs(start)) {
        // Meeting has started
        timeStatus = 'videocalls.started'.tr();
        timeStatusColor = Colors.green;
        timeStatusIcon = Icons.play_circle_filled;
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 12),
        border: Border.all(
          color: Theme.of(context).dividerColor,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: call.callType == 'video'
                  ? context.primaryColor.withValues(alpha: 0.1)
                  : Colors.green.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
            ),
            child: Icon(
              call.callType == 'video' ? Icons.videocam : Icons.phone,
              color: call.callType == 'video'
                  ? context.primaryColor
                  : Colors.green,
              size: 24,
            ),
          ),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _getTranslatedTitle(call.title),
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (call.isGroupCall) ...[
                      SizedBox(width: 8),
                      Flexible(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.blue.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'videocalls.group'.tr(),
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.blue,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                SizedBox(height: 4),
                if (call.description.isNotEmpty)
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 40),
                    child: Html(
                      data: _getTranslatedDescription(call.description),
                      shrinkWrap: true,
                      style: {
                        "body": Style(
                          margin: Margins.zero,
                          padding: HtmlPaddings.zero,
                          fontSize: FontSize(14),
                          color: isDark ? Colors.white60 : Colors.grey[600],
                        ),
                        "p": Style(
                          margin: Margins.zero,
                          padding: HtmlPaddings.zero,
                        ),
                      },
                    ),
                  ),
                SizedBox(height: 4),
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    // Show status or time based on current time
                    if (timeStatus != null)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            timeStatusIcon!,
                            size: 16,
                            color: timeStatusColor,
                          ),
                          SizedBox(width: 4),
                          Text(
                            timeStatus,
                            style: TextStyle(
                              fontSize: 14,
                              color: timeStatusColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      )
                    else
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.access_time,
                            size: 16,
                            color: isDark ? Colors.white38 : Colors.grey[500],
                          ),
                          SizedBox(width: 4),
                          Text(
                            timeStr,
                            style: TextStyle(
                              fontSize: 14,
                              color: isDark ? Colors.white60 : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    SizedBox(width: 8),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.timer,
                          size: 16,
                          color: isDark ? Colors.white38 : Colors.grey[500],
                        ),
                        SizedBox(width: 4),
                        Text(
                          durationStr,
                          style: TextStyle(
                            fontSize: 14,
                            color: isDark ? Colors.white60 : Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                    // Show joined count if meeting is active or started, otherwise show expected attendees
                    if (call.status == 'active' || timeStatus == 'videocalls.started'.tr())
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.people,
                            size: 16,
                            color: Colors.green,
                          ),
                          SizedBox(width: 4),
                          Text(
                            'videocalls.joined_count'.tr(args: [call.participantCount.toString()]),
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.green,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            ' / ${call.invitees?.length ?? 0}',
                            style: TextStyle(
                              fontSize: 14,
                              color: isDark ? Colors.white60 : Colors.grey[600],
                            ),
                          ),
                        ],
                      )
                    else
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.people,
                            size: 16,
                            color: isDark ? Colors.white38 : Colors.grey[500],
                          ),
                          SizedBox(width: 4),
                          Text(
                            // Backend already includes host in invitees list
                            'videocalls.attendees_count'.tr(args: [(call.invitees?.length ?? 0).toString()]),
                            style: TextStyle(
                              fontSize: 14,
                              color: isDark ? Colors.white60 : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ],
            ),
          ),
          // Pin/Unpin button
          IconButton(
            onPressed: () => _togglePinCall(call),
            icon: Icon(
              call.metadata['pinned'] == true
                  ? Icons.push_pin
                  : Icons.push_pin_outlined,
              color: call.metadata['pinned'] == true
                  ? context.primaryColor
                  : (isDark ? Colors.white60 : Colors.grey[600]),
            ),
            tooltip: call.metadata['pinned'] == true ? 'videocalls.unpin'.tr() : 'videocalls.pin'.tr(),
          ),
          SizedBox(width: 8),
          ElevatedButton(
            onPressed: () => _joinScheduledCall(call),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
              ),
            ),
            child: Text('videocalls.join'.tr()),
          ),
        ],
      ),
    );
  }

  /// Toggle pin status for a video call
  Future<void> _togglePinCall(VideoCall call) async {
    final isPinned = call.metadata['pinned'] == true;
    final newPinStatus = !isPinned;

    final success = await VideoCallService.instance.togglePin(call.id, newPinStatus);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(newPinStatus ? 'videocalls.meeting_pinned'.tr() : 'videocalls.meeting_unpinned'.tr()),
          duration: const Duration(seconds: 2),
        ),
      );
    } else if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(newPinStatus ? 'videocalls.failed_pin_meeting'.tr() : 'videocalls.failed_unpin_meeting'.tr()),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  // OLD: Display hardcoded ScheduledMeeting (kept for reference)
  Widget _buildScheduledMeetingItem(ScheduledMeeting meeting, bool isDark) {
    final timeStr = _formatScheduledTime(meeting.scheduledTime);
    final durationStr = _formatDuration(meeting.duration);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 12),
        border: Border.all(
          color: Theme.of(context).dividerColor,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: meeting.type == CallType.video
                  ? context.primaryColor.withValues(alpha: 0.1)
                  : Colors.green.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
            ),
            child: Icon(
              meeting.type == CallType.video ? Icons.videocam : Icons.phone,
              color: meeting.type == CallType.video
                  ? context.primaryColor
                  : Colors.green,
              size: 24,
            ),
          ),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        meeting.title,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (meeting.recurring) ...[
                      SizedBox(width: 8),
                      Flexible(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.blue.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'videocalls.recurring'.tr(),
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.blue,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                SizedBox(height: 4),
                Text(
                  meeting.participants.join(', '),
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white60 : Colors.grey[600],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 4),
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.access_time,
                          size: 16,
                          color: isDark ? Colors.white38 : Colors.grey[500],
                        ),
                        SizedBox(width: 4),
                        Text(
                          timeStr,
                          style: TextStyle(
                            fontSize: 14,
                            color: isDark ? Colors.white60 : Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                    SizedBox(width: 8),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.timer,
                          size: 16,
                          color: isDark ? Colors.white38 : Colors.grey[500],
                        ),
                        SizedBox(width: 4),
                        Text(
                          durationStr,
                          style: TextStyle(
                            fontSize: 14,
                            color: isDark ? Colors.white60 : Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                    if (meeting.hasNotes)
                      Icon(
                        Icons.note_alt,
                        size: 16,
                        color: context.primaryColor,
                      ),
                  ],
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () => _joinScheduledMeeting(meeting),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
              ),
            ),
            child: Text('videocalls.join'.tr()),
          ),
        ],
      ),
    );
  }

  // Translate known default titles from API
  String _getTranslatedTitle(String title) {
    switch (title) {
      case 'Video Call':
        return 'videocalls.video_call'.tr();
      case 'Audio Call':
        return 'videocalls.audio_call'.tr();
      default:
        return title;
    }
  }

  // Translate known default descriptions from API
  String _getTranslatedDescription(String description) {
    switch (description) {
      case 'Instant video call':
        return 'videocalls.instant_video_call'.tr();
      case 'Instant audio call':
        return 'videocalls.instant_audio_call'.tr();
      default:
        return description;
    }
  }

  String _formatRelativeTime(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inMinutes < 60) {
      return 'videocalls.minutes_ago'.tr(args: [difference.inMinutes.toString()]);
    } else if (difference.inHours < 24) {
      return 'videocalls.hours_ago'.tr(args: [difference.inHours.toString()]);
    } else if (difference.inDays < 7) {
      return 'videocalls.days_ago'.tr(args: [difference.inDays.toString()]);
    } else {
      return '${time.day}/${time.month}/${time.year}';
    }
  }

  String _formatScheduledTime(DateTime time) {
    final now = DateTime.now();
    final difference = time.difference(now);

    if (difference.inMinutes < 60) {
      return 'videocalls.in_minutes'.tr(args: [difference.inMinutes.toString()]);
    } else if (difference.inHours < 24) {
      return 'videocalls.in_hours'.tr(args: [difference.inHours.toString()]);
    } else if (difference.inDays < 7) {
      return 'videocalls.in_days'.tr(args: [difference.inDays.toString()]);
    } else {
      return '${time.day}/${time.month} at ${time.hour}:${time.minute.toString().padLeft(2, '0')}';
    }
  }

  String _formatDuration(Duration duration) {
    if (duration.inHours > 0) {
      return '${duration.inHours}h ${duration.inMinutes % 60}m';
    } else {
      return '${duration.inMinutes}m';
    }
  }

  void _showCallDetails(CallHistory call) {
    // Implement call details view
  }

  void _joinScheduledMeeting(ScheduledMeeting meeting) {
    if (meeting.type == CallType.video) {
      _startVideoCall(context);
    } else {
      _startAudioCall(context);
    }
  }

  // NEW: Join scheduled call from API
  void _joinScheduledCall(VideoCall call) async {
    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: CircularProgressIndicator(color: Theme.of(context).colorScheme.primary),
      ),
    );

    try {
      final apiService = video_call_api.VideoCallService(BaseApiClient.instance);

      // Call join API to get LiveKit token (backend will get display name from user profile)
      await apiService.joinCall(call.id);

      // Close loading dialog
      if (mounted) {
        Navigator.pop(context);
      }

      // Navigate to appropriate call screen with the correct call ID
      if (mounted) {
        final isVideoCall = call.callType.toLowerCase() == 'video';

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => video_call.VideoCallScreen(
              callId: call.id,
              channelName: call.title,
              callerName: call.title,
              isAudioOnly: !isVideoCall,
            ),
          ),
        );
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) {
        Navigator.pop(context);
      }

      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('videocalls.failed_join_call'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildTab(String label, IconData icon, bool isDark) {
    final isSelected = _selectedTab == label;
    final backgroundColor = isSelected
        ? context.primaryColor
        : Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor;
    final foregroundColor = isSelected
        ? Colors.white
        : Theme.of(context).textTheme.bodyMedium?.color ?? (isDark ? Colors.white60 : Colors.grey[600]!);

    // Translate the label
    final translatedLabel = 'videocalls.$label'.tr();

    return InkWell(
      onTap: () {
        setState(() => _selectedTab = label);
        // Refresh data when Scheduled, History, or Pinned tab is opened
        if (label == 'scheduled' || label == 'history' || label == 'pinned') {
          _fetchVideoCalls();
        }
      },
      borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: foregroundColor),
            SizedBox(width: 8),
            Text(
              translatedLabel,
              style: TextStyle(
                color: foregroundColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompactTab(String label, IconData icon, bool isDark) {
    final isSelected = _selectedTab == label;
    final backgroundColor = isSelected
        ? context.primaryColor // Fixed color for both light and dark mode
        : Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor;
    final foregroundColor = isSelected
        ? Colors.white
        : Theme.of(context).textTheme.bodyMedium?.color ?? (isDark ? Colors.white60 : Colors.grey[600]!);

    // Translate the label
    final translatedLabel = 'videocalls.$label'.tr();

    return InkWell(
      onTap: () {
        setState(() => _selectedTab = label);
        // Refresh data when Scheduled, History, or Pinned tab is opened
        if (label == 'scheduled' || label == 'history' || label == 'pinned') {
          _fetchVideoCalls();
        }
      },
      borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 6),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 14, color: foregroundColor),
            SizedBox(width: 6),
            Text(
              translatedLabel,
              style: TextStyle(
                color: foregroundColor,
                fontWeight: FontWeight.w500,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 12),
          border: Border.all(
            color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200]!,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const Spacer(),
            Text(
              title,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            SizedBox(height: 4),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.white60 : Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompactActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
          border: Border.all(
            color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200]!,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(widget.showAppBar ? 4 : 6),
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: 1),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 10,
                      color: isDark ? Colors.white60 : Colors.grey[600],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactCard(Contact contact, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 12),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200]!,
        ),
      ),
      child: Column(
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  GestureDetector(
                    onTap: () => _showContactProfile(contact),
                    child: Stack(
                      children: [
                        CircleAvatar(
                          radius: 36,
                          backgroundColor: contact.color.withOpacity(0.2),
                          backgroundImage: contact.avatarUrl != null && contact.avatarUrl!.isNotEmpty
                              ? NetworkImage(contact.avatarUrl!)
                              : null,
                          child: contact.avatarUrl == null || contact.avatarUrl!.isEmpty
                              ? Text(
                                  contact.initials,
                                  style: TextStyle(
                                    color: contact.color,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 24,
                                  ),
                                )
                              : null,
                        ),
                        if (contact.status != ContactStatus.offline)
                          Positioned(
                            right: 0,
                            bottom: 0,
                            child: Container(
                              width: 16,
                              height: 16,
                              decoration: BoxDecoration(
                                color: contact.status == ContactStatus.online
                                    ? Colors.green
                                    : Colors.orange,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
                                  width: 3,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  SizedBox(height: 16),
                  GestureDetector(
                    onTap: () => _showContactProfile(contact),
                    child: Text(
                      contact.name,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    contact.email,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white60 : Colors.grey[600],
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    contact.lastActive,
                    style: TextStyle(
                      fontSize: 12,
                      color: contact.status == ContactStatus.inMeeting
                          ? Colors.orange
                          : isDark
                              ? Colors.white38
                              : Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200]!,
                ),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => _startAudioCallWithContact(contact),
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(12),
                    ),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.1),
                        borderRadius: const BorderRadius.only(
                          bottomLeft: Radius.circular(12),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.phone,
                            size: 18,
                            color: Colors.green[700],
                          ),
                          SizedBox(width: 8),
                          Text(
                            'videocalls.audio_button'.tr(),
                            style: TextStyle(
                              color: Colors.green[700],
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                Container(
                  width: 1,
                  height: 48,
                  color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200],
                ),
                Expanded(
                  child: InkWell(
                    onTap: () => _startVideoCallWithContact(contact),
                    borderRadius: const BorderRadius.only(
                      bottomRight: Radius.circular(12),
                    ),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: context.primaryColor.withOpacity(0.1),
                        borderRadius: const BorderRadius.only(
                          bottomRight: Radius.circular(12),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.videocam,
                            size: 18,
                            color: context.primaryColor,
                          ),
                          SizedBox(width: 8),
                          Text(
                            'videocalls.video_button'.tr(),
                            style: TextStyle(
                              color: context.primaryColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactListItem(Contact contact, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 12),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200]!,
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: GestureDetector(
          onTap: () => _showContactProfile(contact),
          child: Stack(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: contact.color.withOpacity(0.2),
                backgroundImage: contact.avatarUrl != null && contact.avatarUrl!.isNotEmpty
                    ? NetworkImage(contact.avatarUrl!)
                    : null,
                child: contact.avatarUrl == null || contact.avatarUrl!.isEmpty
                    ? Text(
                        contact.initials,
                        style: TextStyle(
                          color: contact.color,
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                      )
                    : null,
              ),
              if (contact.status != ContactStatus.offline)
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: contact.status == ContactStatus.online
                          ? Colors.green
                          : Colors.orange,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
                        width: 2,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        title: GestureDetector(
          onTap: () => _showContactProfile(contact),
          child: Text(
            contact.name,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        subtitle: Text(
          contact.email,
          style: TextStyle(
            fontSize: 12,
            color: isDark ? Colors.white60 : Colors.grey[600],
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              onPressed: () => _startAudioCallWithContact(contact),
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 6),
                ),
                child: Icon(
                  Icons.phone,
                  color: Colors.green,
                  size: 18,
                ),
              ),
            ),
            IconButton(
              onPressed: () => _startVideoCallWithContact(contact),
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: context.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 6),
                ),
                child: Icon(
                  Icons.videocam,
                  color: context.primaryColor,
                  size: 18,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompactContactCard(Contact contact, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 8),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200]!,
        ),
      ),
      child: Column(
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  GestureDetector(
                    onTap: () => _showContactProfile(contact),
                    child: Stack(
                      children: [
                        CircleAvatar(
                          radius: 24,
                          backgroundColor: contact.color.withOpacity(0.2),
                          backgroundImage: contact.avatarUrl != null && contact.avatarUrl!.isNotEmpty
                              ? NetworkImage(contact.avatarUrl!)
                              : null,
                          child: contact.avatarUrl == null || contact.avatarUrl!.isEmpty
                              ? Text(
                                  contact.initials,
                                  style: TextStyle(
                                    color: contact.color,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 16,
                                  ),
                                )
                              : null,
                        ),
                        if (contact.status != ContactStatus.offline)
                          Positioned(
                            right: 0,
                            bottom: 0,
                            child: Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color: contact.status == ContactStatus.online
                                    ? Colors.green
                                    : Colors.orange,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
                                  width: 2,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  SizedBox(height: 8),
                  GestureDetector(
                    onTap: () => _showContactProfile(contact),
                    child: Text(
                      contact.name,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    contact.lastActive,
                    style: TextStyle(
                      fontSize: 9,
                      color: contact.status == ContactStatus.inMeeting
                          ? Colors.orange
                          : isDark
                              ? Colors.white38
                              : Colors.grey[500],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200]!,
                ),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => _startAudioCallWithContact(contact),
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(8),
                    ),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.1),
                        borderRadius: const BorderRadius.only(
                          bottomLeft: Radius.circular(8),
                        ),
                      ),
                      child: Icon(
                        Icons.phone,
                        size: 14,
                        color: Colors.green[700],
                      ),
                    ),
                  ),
                ),
                Container(
                  width: 1,
                  height: 32,
                  color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200],
                ),
                Expanded(
                  child: InkWell(
                    onTap: () => _startVideoCallWithContact(contact),
                    borderRadius: const BorderRadius.only(
                      bottomRight: Radius.circular(8),
                    ),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: context.primaryColor.withOpacity(0.1),
                        borderRadius: const BorderRadius.only(
                          bottomRight: Radius.circular(8),
                        ),
                      ),
                      child: Icon(
                        Icons.videocam,
                        size: 14,
                        color: context.primaryColor,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _startVideoCall(BuildContext context) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('videocalls.no_workspace_selected'.tr())),
      );
      return;
    }

    // 1. Request permissions FIRST (before loading) - gives faster experience
    final permissionsGranted = await _requestCallPermissions(isVideoCall: true);
    if (!permissionsGranted) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('videocalls.camera_mic_required'.tr())),
        );
      }
      return;
    }

    // Show loading
    if (!context.mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      // 2. Create call via backend API
      final videoCall = await VideoCallService.instance.createCall(
        workspaceId: workspaceId,
        title: 'videocalls.quick_video_call'.tr(),
        callType: 'video',
        isGroupCall: false,
      );

      // Close loading
      if (context.mounted) Navigator.pop(context);

      // 3. Navigate to VideoCallScreen with callId
      if (context.mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => video_call.VideoCallScreen(
              callId: videoCall.id,
              channelName: videoCall.title,
              isIncoming: false,
            ),
          ),
        );
      }
    } catch (e) {
      // Close loading
      if (context.mounted) Navigator.pop(context);

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('videocalls.failed_start_call'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  Future<void> _startAudioCall(BuildContext context) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('videocalls.no_workspace_selected'.tr())),
      );
      return;
    }

    // 1. Request permissions FIRST (before loading) - gives faster experience
    final permissionsGranted = await _requestCallPermissions(isVideoCall: false);
    if (!permissionsGranted) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('videocalls.mic_required'.tr())),
        );
      }
      return;
    }

    // Show loading
    if (!context.mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      // 2. Create call via backend API
      final videoCall = await VideoCallService.instance.createCall(
        workspaceId: workspaceId,
        title: 'videocalls.quick_audio_call'.tr(),
        callType: 'audio',
        isGroupCall: false,
      );

      // Close loading
      if (context.mounted) Navigator.pop(context);

      // 3. Navigate to VideoCallScreen with audio-only mode
      if (context.mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => video_call.VideoCallScreen(
              callId: videoCall.id,
              channelName: videoCall.title,
              isIncoming: false,
              isAudioOnly: true,
            ),
          ),
        );
      }
    } catch (e) {
      // Close loading
      if (context.mounted) Navigator.pop(context);

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('videocalls.failed_start_call'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  Future<void> _startVideoCallWithContact(Contact contact) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('videocalls.no_workspace_selected'.tr())),
      );
      return;
    }

    // 1. Request permissions FIRST
    final permissionsGranted = await _requestCallPermissions(isVideoCall: true);
    if (!permissionsGranted) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('videocalls.camera_mic_required'.tr())),
        );
      }
      return;
    }

    // Show loading
    if (!context.mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      // Get contact's actual user ID
      final contactUserId = contact.userId;

      // 2. Create call via backend API with participant ID for immediate call notification
      final videoCall = await VideoCallService.instance.createCall(
        workspaceId: workspaceId,
        title: 'videocalls.video_call_with'.tr(args: [contact.name]),
        callType: 'video',
        isGroupCall: false,
        participantIds: [contactUserId], // Send to contact for immediate notification
      );

      // Close loading
      if (context.mounted) Navigator.pop(context);

      // 3. Navigate to VideoCallScreen with callId
      if (context.mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => video_call.VideoCallScreen(
              callId: videoCall.id,
              channelName: videoCall.title,
              callerName: contact.name,
              callerAvatar: contact.avatarUrl ?? contact.initials,
              isIncoming: false,
            ),
          ),
        );
      }
    } catch (e) {
      // Close loading
      if (context.mounted) Navigator.pop(context);

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('videocalls.failed_start_call'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  Future<void> _startAudioCallWithContact(Contact contact) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('videocalls.no_workspace_selected'.tr())),
      );
      return;
    }

    // 1. Request permissions FIRST
    final permissionsGranted = await _requestCallPermissions(isVideoCall: false);
    if (!permissionsGranted) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('videocalls.mic_required'.tr())),
        );
      }
      return;
    }

    // Show loading
    if (!context.mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      // Get contact's actual user ID
      final contactUserId = contact.userId;

      // 2. Create call via backend API with participant ID for immediate call notification
      final audioCall = await VideoCallService.instance.createCall(
        workspaceId: workspaceId,
        title: 'videocalls.audio_call_with'.tr(args: [contact.name]),
        callType: 'audio',
        isGroupCall: false,
        participantIds: [contactUserId], // Send to contact for immediate notification
      );

      // Close loading
      if (context.mounted) Navigator.pop(context);

      // 3. Navigate to VideoCallScreen with audio-only mode
      if (context.mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => video_call.VideoCallScreen(
              callId: audioCall.id,
              channelName: audioCall.title,
              callerName: contact.name,
              callerAvatar: contact.avatarUrl ?? contact.initials,
              isIncoming: false,
              isAudioOnly: true,
            ),
          ),
        );
      }
    } catch (e) {
      // Close loading
      if (context.mounted) Navigator.pop(context);

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('videocalls.failed_start_call'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  void _scheduleMeeting(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const ScheduleMeetingScreen(),
      ),
    );
  }

  void _createNewMeeting(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const ScheduleMeetingScreen(),
      ),
    );
  }

  void _showAIFeatures(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('videocalls.ai_features'.tr()),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: Icon(Icons.closed_caption),
              title: Text('videocalls.real_time_transcription_feature'.tr()),
              subtitle: Text('videocalls.auto_transcribe_meetings'.tr()),
            ),
            ListTile(
              leading: Icon(Icons.translate),
              title: Text('videocalls.live_translation_feature'.tr()),
              subtitle: Text('videocalls.translate_conversations'.tr()),
            ),
            ListTile(
              leading: Icon(Icons.note_alt),
              title: Text('videocalls.meeting_notes_feature'.tr()),
              subtitle: Text('videocalls.ai_meeting_summaries'.tr()),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.close'.tr()),
          ),
        ],
      ),
    );
  }

  void _callContact(Contact contact) {
    // Implement contact call logic
  }

  void _showMoreOptions(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final RenderBox button = context.findRenderObject() as RenderBox;
    final RenderBox overlay = Overlay.of(context).context.findRenderObject() as RenderBox;
    // Calculate position to show menu at top-right
    final buttonPosition = button.localToGlobal(Offset.zero, ancestor: overlay);
    final RelativeRect position = RelativeRect.fromLTRB(
      overlay.size.width - 250, // Right side (250px from right edge)
      buttonPosition.dy + button.size.height + 8, // Just below button with small gap
      16, // Right margin
      0, // Bottom (not used for popup menu)
    );

    showMenu<String>(
      context: context,
      position: position,
      color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 12),
        side: BorderSide(
          color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[300]!,
        ),
      ),
      items: [
        PopupMenuItem<String>(
          value: 'analytics',
          child: _buildDropdownMenuItem(
            icon: Icons.analytics_outlined,
            title: 'videocalls.your_analytics'.tr(),
            color: context.primaryColor,
            isDark: isDark,
          ),
        ),
        PopupMenuItem<String>(
          value: 'meetings',
          child: _buildDropdownMenuItem(
            icon: Icons.videocam,
            title: 'videocalls.recent_meetings'.tr(),
            color: Colors.green,
            isDark: isDark,
          ),
        ),
        PopupMenuItem<String>(
          value: 'summaries',
          child: _buildDropdownMenuItem(
            icon: Icons.auto_awesome,
            title: 'videocalls.recent_summaries'.tr(),
            color: Colors.orange,
            isDark: isDark,
          ),
        ),
        PopupMenuItem<String>(
          value: 'notes',
          child: _buildDropdownMenuItem(
            icon: Icons.note_alt,
            title: 'videocalls.recent_notes'.tr(),
            color: context.primaryColor,
            isDark: isDark,
          ),
        ),
      ],
    ).then((String? value) {
      if (value != null && mounted) {
        switch (value) {
          case 'analytics':
            _showAnalytics(context);
            break;
          case 'meetings':
            _showRecentMeetings(context);
            break;
          case 'summaries':
            _showRecentSummaries(context);
            break;
          case 'notes':
            _showRecentNotes(context);
            break;
        }
      }
    });
  }

  Widget _buildDropdownMenuItem({
    required IconData icon,
    required String title,
    required Color color,
    required bool isDark,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 6),
          ),
          child: Icon(
            icon,
            color: color,
            size: 18,
          ),
        ),
        SizedBox(width: 12),
        Text(
          title,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
      ],
    );
  }


  void _showAnalytics(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0A0E27) : Colors.grey[50],
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
                color: isDark ? Colors.white38 : Colors.grey[400],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.analytics_outlined,
                          color: Theme.of(context).colorScheme.primary,
                          size: 24,
                        ),
                        SizedBox(width: 12),
                        Text(
                          'videocalls.your_analytics'.tr(),
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 24),
                    // Show loading or analytics cards
                    _isLoadingAnalytics
                        ? Center(
                            child: Padding(
                              padding: EdgeInsets.all(32.0),
                              child: CircularProgressIndicator(),
                            ),
                          )
                        : Column(
                            children: [
                              // Analytics Cards
                              Row(
                                children: [
                                  Expanded(
                                    child: _buildAnalyticsCard(
                                      title: 'videocalls.total_meetings'.tr(),
                                      value: '${_analytics?.totalMeetings ?? 0}',
                                      icon: Icons.videocam,
                                      color: Theme.of(context).colorScheme.primary,
                                      isDark: isDark,
                                    ),
                                  ),
                                  SizedBox(width: 12),
                                  Expanded(
                                    child: _buildAnalyticsCard(
                                      title: 'videocalls.total_time'.tr(),
                                      value: _analytics?.totalTimeFormatted ?? '0m',
                                      icon: Icons.access_time,
                                      color: Colors.green,
                                      isDark: isDark,
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: _buildAnalyticsCard(
                                      title: 'videocalls.this_week'.tr(),
                                      value: '${_analytics?.thisWeek ?? 0}',
                                      icon: Icons.calendar_today,
                                      color: Colors.purple,
                                      isDark: isDark,
                                    ),
                                  ),
                                  SizedBox(width: 12),
                                  Expanded(
                                    child: _buildAnalyticsCard(
                                      title: 'videocalls.avg_duration'.tr(),
                                      value: _analytics?.avgDurationFormatted ?? '0m',
                                      icon: Icons.timer,
                                      color: Colors.orange,
                                      isDark: isDark,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showRecentMeetings(BuildContext context) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Fetch fresh data before showing modal
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId != null) {
      VideoCallService.instance.fetchVideoCalls(workspaceId);
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          // Listen to VideoCallService updates
          VideoCallService.instance.addListener(() {
            if (context.mounted) {
              setModalState(() {});
            }
          });

          return Container(
            height: MediaQuery.of(context).size.height * 0.7,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0A0E27) : Colors.grey[50],
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
                    color: isDark ? Colors.white38 : Colors.grey[400],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.videocam,
                              color: Colors.green,
                              size: 24,
                            ),
                            SizedBox(width: 12),
                            Text(
                              'videocalls.recent_meetings'.tr(),
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const Spacer(),
                            // Refresh button
                            IconButton(
                              icon: Icon(
                                Icons.refresh,
                                color: isDark ? Colors.white70 : Colors.grey[700],
                              ),
                              onPressed: () {
                                if (workspaceId != null) {
                                  VideoCallService.instance.fetchVideoCalls(workspaceId);
                                }
                              },
                            ),
                          ],
                        ),
                        SizedBox(height: 24),
                        // Display recent meetings from API
                        VideoCallService.instance.isLoadingVideoCalls
                            ? Center(
                                child: Padding(
                                  padding: EdgeInsets.all(32.0),
                                  child: CircularProgressIndicator(),
                                ),
                              )
                            : VideoCallService.instance.recentMeetings.isEmpty
                            ? Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(32.0),
                                  child: Text(
                                    'videocalls.no_recent_meetings'.tr(),
                                    style: TextStyle(
                                      color: isDark ? Colors.white60 : Colors.grey[600],
                                    ),
                                  ),
                                ),
                              )
                            : Column(
                                children: VideoCallService.instance.recentMeetings
                                    .take(10)
                                    .map((meeting) {
                                  // Calculate time ago (convert UTC to local time)
                                  String timeAgo;
                                  if (meeting.isActive) {
                                    timeAgo = 'videocalls.active_now'.tr();
                                  } else if (meeting.actualEndTime != null) {
                                    final endTime = DateTime.parse(meeting.actualEndTime!).toLocal();
                                    final diff = DateTime.now().difference(endTime);
                                    if (diff.inMinutes < 1) {
                                      timeAgo = 'videocalls.just_now'.tr();
                                    } else if (diff.inMinutes < 60) {
                                      timeAgo = 'videocalls.started_minutes_ago'.tr(args: [diff.inMinutes.toString()]);
                                    } else if (diff.inHours < 24) {
                                      timeAgo = 'videocalls.started_hours_ago'.tr(args: [diff.inHours.toString()]);
                                    } else {
                                      timeAgo = 'videocalls.started_days_ago'.tr(args: [diff.inDays.toString()]);
                                    }
                                  } else if (meeting.actualStartTime != null) {
                                    final startTime = DateTime.parse(meeting.actualStartTime!).toLocal();
                                    final diff = DateTime.now().difference(startTime);
                                    if (diff.inMinutes < 1) {
                                      timeAgo = 'videocalls.just_started'.tr();
                                    } else if (diff.inMinutes < 60) {
                                      timeAgo = 'videocalls.started_minutes_ago'.tr(args: [diff.inMinutes.toString()]);
                                    } else if (diff.inHours < 24) {
                                      timeAgo = 'videocalls.started_hours_ago'.tr(args: [diff.inHours.toString()]);
                                    } else {
                                      timeAgo = 'videocalls.started_days_ago'.tr(args: [diff.inDays.toString()]);
                                    }
                                  } else {
                                    timeAgo = 'videocalls.recently'.tr();
                                  }

                                  return _buildRecentMeetingItem(
                                    meeting: meeting,
                                    title: meeting.title,
                                    duration: meeting.formattedDuration,
                                    participants: meeting.isGroupCall ? 'videocalls.group_call'.tr() : 'videocalls.one_on_one'.tr(),
                                    time: timeAgo,
                                    isDark: isDark,
                                    status: meeting.status,
                                  );
                                }).toList(),
                              ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showRecentSummaries(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0A0E27) : Colors.grey[50],
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
                color: isDark ? Colors.white38 : Colors.grey[400],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.auto_awesome,
                          color: Colors.orange,
                          size: 24,
                        ),
                        SizedBox(width: 12),
                        Text(
                          'videocalls.recent_summaries'.tr(),
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 24),
                    _buildSummaryItem(
                      title: 'Daily Standup - Engineering',
                      summary: 'Team discussed sprint progress, identified blockers, and planned upcoming deliverables.',
                      keyPoints: '3 key points',
                      participants: '3 participants',
                      duration: '30m meeting',
                      time: '1h ago',
                      isDark: isDark,
                    ),
                    _buildSummaryItem(
                      title: 'Client Presentation Review',
                      summary: 'Reviewed presentation materials and rehearsed client demo for upcoming pitch.',
                      keyPoints: '3 key points',
                      participants: '3 participants',
                      duration: '1h 15m meeting',
                      time: '48h ago',
                      isDark: isDark,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showRecentNotes(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0A0E27) : Colors.grey[50],
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
                color: isDark ? Colors.white38 : Colors.grey[400],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.note_alt,
                          color: Theme.of(context).colorScheme.primary,
                          size: 24,
                        ),
                        SizedBox(width: 12),
                        Text(
                          'videocalls.recent_notes'.tr(),
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 24),
                    _buildNoteItem(
                      title: 'Q4 Planning Session',
                      aiPercent: '92%',
                      content: 'Discussed quarterly objectives and resource allocation for the upcoming quarter. Key...',
                      duration: '1h 0m',
                      participants: '3 participants',
                      time: '1d ago',
                      isDark: isDark,
                    ),
                    _buildNoteItem(
                      title: 'Product Roadmap Review',
                      aiPercent: '88%',
                      content: 'Reviewed current product development status and discussed feature priorities for...',
                      duration: '45m',
                      participants: '5 participants',
                      time: '3d ago',
                      isDark: isDark,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAnalyticsCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 12),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white60 : Colors.grey[600],
                ),
              ),
              Icon(
                icon,
                color: color,
                size: 16,
              ),
            ],
          ),
          SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentMeetingItem({
    required VideoCall meeting,
    required String title,
    required String duration,
    required String participants,
    required String time,
    required bool isDark,
    String status = 'completed',
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 12),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                time,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white60 : Colors.grey[600],
                ),
              ),
            ],
          ),
          SizedBox(height: 8),
          Row(
            children: [
              Text(
                duration,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white60 : Colors.grey[600],
                ),
              ),
              SizedBox(width: 16),
              Text(
                participants,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white60 : Colors.grey[600],
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Status badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: status.toLowerCase() == 'active'
                      ? const Color(0xFFFFE5E5)
                      : const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  status.toLowerCase() == 'active' ? 'videocalls.active'.tr() : 'videocalls.completed'.tr(),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: status.toLowerCase() == 'active'
                        ? const Color(0xFFFF6B6B)
                        : AppTheme.successLight,
                  ),
                ),
              ),
              // View Details button
              TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => meeting_details.MeetingDetailsScreen(
                        meetingId: meeting.id,  // Pass meeting ID
                        callType: meeting.callType,  // Pass call type
                        title: meeting.title,
                        duration: meeting.formattedDuration,
                        date: meeting.formattedDate,
                        time: meeting.formattedTime,
                        status: meeting.status,
                        participantCount: meeting.participantCount,
                        participants: [], // Participants list will be populated from API later
                        hasNotes: false,
                        hasSummary: false,
                      ),
                    ),
                  );
                },
                child: Text(
                  'videocalls.view_details'.tr(),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.green,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem({
    required String title,
    required String summary,
    required String keyPoints,
    required String participants,
    required String duration,
    required String time,
    required bool isDark,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 12),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                time,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white60 : Colors.grey[600],
                ),
              ),
            ],
          ),
          SizedBox(height: 8),
          Text(
            summary,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white60 : Colors.grey[600],
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          SizedBox(height: 8),
          Row(
            children: [
              Text(
                keyPoints,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white60 : Colors.grey[600],
                ),
              ),
              SizedBox(width: 16),
              Text(
                participants,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white60 : Colors.grey[600],
                ),
              ),
            ],
          ),
          SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                duration,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white60 : Colors.grey[600],
                ),
              ),
              TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const MeetingSummaryScreen(
                        title: 'Client Presentation Review',
                        date: '02/08/2025',
                        duration: '1h 15m',
                        participants: 3,
                        summary: 'Reviewed presentation materials and rehearsed client demo for upcoming pitch.',
                        keyPoints: [
                          'Updated slides with metrics',
                          'Demo environment tested',
                          'Q&A scenarios prepared',
                        ],
                        participantNames: [
                          'Maria Johnson',
                          'David Lee',
                          'John Smith',
                        ],
                      ),
                    ),
                  );
                },
                child: Text(
                  'videocalls.view_full'.tr(),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.orange,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNoteItem({
    required String title,
    required String aiPercent,
    required String content,
    required String duration,
    required String participants,
    required String time,
    required bool isDark,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 12),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: context.primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(widget.showAppBar ? 5 : 12),
                    ),
                    child: Text(
                      '$aiPercent AI',
                      style: TextStyle(
                        fontSize: 10,
                        color: context.primaryColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  SizedBox(width: 8),
                  Text(
                    time,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white60 : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ],
          ),
          SizedBox(height: 8),
          Text(
            content,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white60 : Colors.grey[600],
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(
                    duration,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white60 : Colors.grey[600],
                    ),
                  ),
                  SizedBox(width: 4),
                  Text(
                    '• $participants',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white60 : Colors.grey[600],
                    ),
                  ),
                ],
              ),
              TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => meeting_note.MeetingNoteScreen(
                        title: 'Q4 Planning Session',
                        date: '03/08/2025',
                        duration: '1h 0m',
                        participants: 3,
                        content: 'Discussed quarterly objectives and resource allocation for the upcoming quarter. Key decisions made regarding budget distribution and team assignments.',
                        aiAccuracy: 92,
                        generatedDate: DateTime.now().subtract(const Duration(days: 1)),
                        participantsList: [
                          meeting_note.MeetingParticipant(
                            name: 'John Smith',
                            initials: 'JS',
                            gradientColors: [context.primaryColor, const Color(0xFF70C8F0)],
                          ),
                          meeting_note.MeetingParticipant(
                            name: 'Maria Johnson',
                            initials: 'MJ',
                            gradientColors: [const Color(0xFFFF6B9D), const Color(0xFFC44569)],
                          ),
                          meeting_note.MeetingParticipant(
                            name: 'Alex Wilson',
                            initials: 'AW',
                            gradientColors: [const Color(0xFF4ECDC4), const Color(0xFF44A08D)],
                          ),
                        ],
                      ),
                    ),
                  );
                },
                child: Text(
                  'videocalls.view_note'.tr(),
                  style: TextStyle(
                    fontSize: 12,
                    color: context.primaryColor,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Request camera/microphone permissions before starting a call
  /// Returns true if permissions are granted
  Future<bool> _requestCallPermissions({required bool isVideoCall}) async {
    // Check if already granted (fast path)
    final micStatus = await Permission.microphone.status;
    final cameraStatus = isVideoCall ? await Permission.camera.status : PermissionStatus.granted;

    if (micStatus.isGranted && cameraStatus.isGranted) {
      return true;
    }

    // Check if permanently denied - need to open settings
    final micPermanentlyDenied = micStatus.isPermanentlyDenied;
    final cameraPermanentlyDenied = isVideoCall && cameraStatus.isPermanentlyDenied;

    if (micPermanentlyDenied || cameraPermanentlyDenied) {
      // Show dialog to open settings
      if (mounted) {
        final shouldOpenSettings = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text('videocalls.permissions_required'.tr()),
            content: Text(
              isVideoCall
                  ? 'videocalls.camera_mic_permission_video'.tr()
                  : 'videocalls.mic_permission_audio'.tr(),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text('common.cancel'.tr()),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text('videocalls.open_settings'.tr()),
              ),
            ],
          ),
        );

        if (shouldOpenSettings == true) {
          await openAppSettings();
        }
      }
      return false;
    }

    // Request permissions
    final permissions = isVideoCall
        ? [Permission.camera, Permission.microphone]
        : [Permission.microphone];
    final statuses = await permissions.request();

    if (isVideoCall) {
      final cameraGranted = statuses[Permission.camera]?.isGranted == true;
      final micGranted = statuses[Permission.microphone]?.isGranted == true;

      // If denied after request, check if permanently denied
      if (!cameraGranted || !micGranted) {
        final newCameraStatus = await Permission.camera.status;
        final newMicStatus = await Permission.microphone.status;

        if (newCameraStatus.isPermanentlyDenied || newMicStatus.isPermanentlyDenied) {
          if (mounted) {
            final shouldOpenSettings = await showDialog<bool>(
              context: context,
              builder: (context) => AlertDialog(
                title: Text('videocalls.permissions_required'.tr()),
                content: Text(
                  'videocalls.camera_mic_permission_video'.tr(),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: Text('common.cancel'.tr()),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: Text('videocalls.open_settings'.tr()),
                  ),
                ],
              ),
            );

            if (shouldOpenSettings == true) {
              await openAppSettings();
            }
          }
        }
      }

      return cameraGranted && micGranted;
    } else {
      final micGranted = statuses[Permission.microphone]?.isGranted == true;

      // If denied after request, check if permanently denied
      if (!micGranted) {
        final newMicStatus = await Permission.microphone.status;

        if (newMicStatus.isPermanentlyDenied) {
          if (mounted) {
            final shouldOpenSettings = await showDialog<bool>(
              context: context,
              builder: (context) => AlertDialog(
                title: Text('videocalls.permission_required'.tr()),
                content: Text(
                  'videocalls.mic_permission_audio'.tr(),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: Text('common.cancel'.tr()),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: Text('videocalls.open_settings'.tr()),
                  ),
                ],
              ),
            );

            if (shouldOpenSettings == true) {
              await openAppSettings();
            }
          }
        }
      }

      return micGranted;
    }
  }
}

enum ContactStatus { online, offline, inMeeting, away }

enum CallType { video, audio }

enum CallStatus { completed, missed, cancelled }

class Contact {
  final String name;
  final String email;
  final String userId;
  final ContactStatus status;
  final String lastActive;
  final String initials;
  final Color color;
  final bool hasActiveCall;
  final String? avatarUrl;

  Contact({
    required this.name,
    required this.email,
    required this.userId,
    required this.status,
    required this.lastActive,
    required this.initials,
    required this.color,
    this.hasActiveCall = false,
    this.avatarUrl,
  });
}

class CallHistory {
  final List<String> participants;
  final CallType type;
  final Duration duration;
  final DateTime timestamp;
  final CallStatus status;
  final bool recording;

  CallHistory({
    required this.participants,
    required this.type,
    required this.duration,
    required this.timestamp,
    required this.status,
    this.recording = false,
  });
}

class ScheduledMeeting {
  final String title;
  final List<String> participants;
  final DateTime scheduledTime;
  final Duration duration;
  final CallType type;
  final bool recurring;
  final bool hasNotes;

  ScheduledMeeting({
    required this.title,
    required this.participants,
    required this.scheduledTime,
    required this.duration,
    required this.type,
    this.recurring = false,
    this.hasNotes = false,
  });
}