import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:easy_localization/easy_localization.dart';
import '../utils/theme_notifier.dart';
import '../widgets/notification_badge.dart';
import '../screens/notification_center_screen.dart';
import '../screens/notification_test_screen.dart';
import '../screens/main_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/workspace_screen.dart';
import '../screens/settings_screen.dart';
import '../team/team_screen.dart';
import '../screens/workspace_settings_screen.dart';
import '../screens/workspace/create_workspace_screen.dart';
import '../providers/auth_provider.dart';
import '../services/auth_service.dart';
import '../services/workspace_service.dart';
import '../services/notification_service.dart';
import '../api/services/dashboard_api_service.dart';
import '../models/dashboard_models.dart';
import '../files/files_screen.dart';
import '../calendar/create_event_screen.dart';
import '../calendar/calendar_screen.dart';
import '../screens/project_overview_screen.dart';
import '../screens/billing_screen.dart';
import '../notes/note_editor_screen.dart';
import '../videocalls/schedule_meeting_screen.dart';
import '../theme/app_theme.dart';
import 'smart_suggestions_widget.dart';

class DashboardScreen extends StatefulWidget {
  final bool showAppBar;
  final ThemeNotifier? themeNotifier;

  const DashboardScreen({
    super.key,
    this.showAppBar = false,
    this.themeNotifier,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _currentTabIndex = 0;
  String _workspaceName = 'Dashboard';

  // Services
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final DashboardApiService _dashboardApiService = DashboardApiService();
  final NotificationService _notificationService = NotificationService.instance;

  // Dashboard data state
  DashboardData? _dashboardData;
  bool _isLoadingDashboard = false;
  String? _dashboardError;

  // Logout state to prevent double calls
  bool _isLoggingOut = false;

  // User data for avatar
  Map<String, dynamic>? _userData;

  @override
  void initState() {
    super.initState();
    _loadUserData(); // Load user data for avatar
    _tabController = TabController(length: 1, vsync: this); // Changed from 3 to 1 - only Overview tab
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) {
        setState(() {
          _currentTabIndex = _tabController.index;
        });
      }
    });

    // Listen to workspace changes
    _workspaceService.addListener(_onWorkspaceChanged);

    _initializeWorkspace();
  }

  void _onWorkspaceChanged() {
    if (mounted) {
      final currentWorkspace = _workspaceService.currentWorkspace;
      if (currentWorkspace != null) {
        setState(() {
          _workspaceName = currentWorkspace.name;
        });
        // Fetch dashboard data for new workspace
        _fetchDashboardData();
      }
    }
  }

  Future<void> _initializeWorkspace() async {
    try {
      // Initialize WorkspaceService
      _workspaceService.initialize();

      // Fetch workspaces from API
      await _workspaceService.fetchWorkspaces();

      // Load current workspace from storage
      await _workspaceService.loadCurrentWorkspaceFromStorage();

      if (mounted) {
        final currentWorkspace = _workspaceService.currentWorkspace;
        final workspaces = _workspaceService.workspaces;

        if (currentWorkspace != null) {
          setState(() {
            _workspaceName = currentWorkspace.name;
          });
          // Fetch dashboard data for current workspace
          await _fetchDashboardData();
        } else if (workspaces.isNotEmpty) {
          // If no current workspace but workspaces exist, select the first one
          await _workspaceService.setCurrentWorkspace(workspaces.first.id);

          if (mounted) {
            setState(() {
              _workspaceName = workspaces.first.name;
            });
            // Fetch dashboard data for first workspace
            await _fetchDashboardData();
          }
        } else {
        }
      }
    } catch (e) {
    }
  }

  Future<void> _fetchDashboardData() async {
    final currentWorkspace = _workspaceService.currentWorkspace;
    if (currentWorkspace == null) {
      return;
    }

    setState(() {
      _isLoadingDashboard = true;
      _dashboardError = null;
    });

    try {
      final response = await _dashboardApiService.getDashboardData(currentWorkspace.id);

      if (mounted) {
        if (response.success && response.data != null) {
          setState(() {
            _dashboardData = response.data;
            _isLoadingDashboard = false;
          });
        } else {
          setState(() {
            _dashboardError = response.message;
            _isLoadingDashboard = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _dashboardError = 'Failed to load dashboard data';
          _isLoadingDashboard = false;
        });
      }
    }

    // Also fetch notifications when dashboard data is loaded
    await _fetchNotifications();
  }

  /// Fetch notifications from API and update notification count
  Future<void> _fetchNotifications() async {
    try {
      // Force refresh to get latest notifications from API
      await _notificationService.getNotifications(forceRefresh: true);
    } catch (e) {
      // Don't block dashboard loading if notifications fail
    }
  }

  @override
  void dispose() {
    _workspaceService.removeListener(_onWorkspaceChanged);
    _tabController.dispose();
    super.dispose();
  }

  /// Load user data from API for avatar display
  Future<void> _loadUserData() async {
    try {
      final response = await AuthService.instance.dio.get('/auth/me');

      if (response.statusCode == 200) {
        final userData = response.data['user'] ?? response.data;

        if (mounted) {
          setState(() {
            _userData = userData;
          });
        }
      }
    } catch (e) {
    }
  }

  /// Build workspace avatar with logo or fallback letter
  Widget _buildWorkspaceAvatar(String? logoUrl, String name, double size, double fontSize) {
    if (logoUrl != null && logoUrl.isNotEmpty && !logoUrl.contains('example.com')) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.2),
            width: 1,
          ),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: Image.network(
            logoUrl,
            width: size,
            height: size,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return _buildFallbackAvatar(name, size, fontSize);
            },
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return _buildFallbackAvatar(name, size, fontSize);
            },
          ),
        ),
      );
    }
    return _buildFallbackAvatar(name, size, fontSize);
  }

  Widget _buildFallbackAvatar(String name, double size, double fontSize) {
    final primaryColor = context.isDarkMode ? AppTheme.primaryDark : AppTheme.primaryLight;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: primaryColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : 'W',
          style: TextStyle(
            color: context.isDarkMode ? AppTheme.primaryForegroundDark : AppTheme.primaryForegroundLight,
            fontWeight: FontWeight.bold,
            fontSize: fontSize,
          ),
        ),
      ),
    );
  }

  /// Build user avatar with dropdown menu
  Widget _buildUserAvatarMenu(bool isDark) {
    // Use _userData from API if available, otherwise fallback to AuthService
    String? avatarUrl;
    String userName = 'User';

    if (_userData != null) {
      // Get avatar from multiple possible field names
      avatarUrl = _userData!['profileImage']?.toString() ??
                 _userData!['avatar_url']?.toString() ??
                 _userData!['avatar']?.toString() ??
                 _userData!['profile_image']?.toString();

      userName = _userData!['name']?.toString() ??
                _userData!['metadata']?['full_name']?.toString() ??
                'User';

    } else {
      final currentUser = AuthService.instance.currentUser;
      if (currentUser != null) {
        userName = currentUser.name ?? 'User';
      }
    }

    // Get initials from name
    final nameParts = userName.trim().split(' ');
    String initials = '?';
    if (nameParts.isNotEmpty && nameParts[0].isNotEmpty) {
      if (nameParts.length == 1) {
        initials = nameParts[0][0].toUpperCase();
      } else {
        initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      }
    }


    return PopupMenuButton<String>(
      offset: const Offset(0, 50),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      color: context.cardColor,
      elevation: 8,
      onSelected: (value) => _handleUserMenuSelection(value),
      itemBuilder: (BuildContext context) {
        return [
          // Profile
          PopupMenuItem<String>(
            value: 'profile',
            child: Row(
              children: [
                Icon(
                  Icons.person_outline,
                  size: 20,
                  color: context.mutedForegroundColor,
                ),
                const SizedBox(width: 12),
                Text(
                  'nav.profile'.tr(),
                  style: TextStyle(
                    fontSize: 14,
                    color: context.colorScheme.onSurface,
                  ),
                ),
              ],
            ),
          ),

          // Workspace
          PopupMenuItem<String>(
            value: 'workspace',
            child: Row(
              children: [
                Icon(
                  Icons.business_outlined,
                  size: 20,
                  color: context.mutedForegroundColor,
                ),
                const SizedBox(width: 12),
                Text(
                  'workspace.title'.tr(),
                  style: TextStyle(
                    fontSize: 14,
                    color: context.colorScheme.onSurface,
                  ),
                ),
              ],
            ),
          ),

          // Team
          PopupMenuItem<String>(
            value: 'team',
            child: Row(
              children: [
                Icon(
                  Icons.people_outline,
                  size: 20,
                  color: context.mutedForegroundColor,
                ),
                const SizedBox(width: 12),
                Text(
                  'dashboard.team'.tr(),
                  style: TextStyle(
                    fontSize: 14,
                    color: context.colorScheme.onSurface,
                  ),
                ),
              ],
            ),
          ),

          // Settings
          PopupMenuItem<String>(
            value: 'settings',
            child: Row(
              children: [
                Icon(
                  Icons.settings_outlined,
                  size: 20,
                  color: context.mutedForegroundColor,
                ),
                const SizedBox(width: 12),
                Text(
                  'common.settings'.tr(),
                  style: TextStyle(
                    fontSize: 14,
                    color: context.colorScheme.onSurface,
                  ),
                ),
              ],
            ),
          ),

          // Divider
          const PopupMenuDivider(),

          // Logout
          PopupMenuItem<String>(
            value: 'logout',
            child: Row(
              children: [
                Icon(
                  Icons.logout,
                  size: 20,
                  color: context.colorScheme.error,
                ),
                const SizedBox(width: 12),
                Text(
                  'common.logout'.tr(),
                  style: TextStyle(
                    fontSize: 14,
                    color: context.colorScheme.error,
                  ),
                ),
              ],
            ),
          ),
        ];
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: context.borderColor,
            width: 2,
          ),
        ),
        child: CircleAvatar(
          radius: 18,
          backgroundColor: context.primaryColor,
          backgroundImage: avatarUrl != null && avatarUrl.isNotEmpty
              ? NetworkImage(avatarUrl)
              : null,
          child: avatarUrl == null || avatarUrl.isEmpty
              ? Text(
                  initials,
                  style: TextStyle(
                    color: context.colorScheme.onPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                )
              : null,
        ),
      ),
    );
  }

  /// Build plan badge with color coding
  Widget _buildPlanBadge(String? plan) {
    Color backgroundColor;
    Color textColor;
    String planLabel;

    // Default to free if plan is null or empty
    final planLower = (plan ?? 'free').toLowerCase();

    switch (planLower) {
      case 'free':
        backgroundColor = Colors.grey.shade100;
        textColor = Colors.grey.shade900;
        planLabel = 'billing.plan_free'.tr();
        break;
      case 'starter':
        backgroundColor = Colors.blue.shade100;
        textColor = Colors.blue.shade900;
        planLabel = 'billing.plan_starter'.tr();
        break;
      case 'professional':
        backgroundColor = Colors.purple.shade100;
        textColor = Colors.purple.shade900;
        planLabel = 'billing.plan_professional'.tr();
        break;
      case 'enterprise':
        backgroundColor = Colors.amber.shade100;
        textColor = Colors.amber.shade900;
        planLabel = 'billing.plan_enterprise'.tr();
        break;
      default:
        backgroundColor = Colors.grey.shade100;
        textColor = Colors.grey.shade900;
        planLabel = 'billing.plan_free'.tr();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        planLabel,
        style: TextStyle(
          color: textColor,
          fontSize: 9,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  /// Build workspace dropdown selector
  Widget _buildWorkspaceDropdown(bool isDark) {
    final workspaces = _workspaceService.workspaces;
    final currentWorkspace = _workspaceService.currentWorkspace;

    // Debug print

    if (workspaces.isEmpty) {
      // Show loading or empty state with dropdown style
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: context.borderColor,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: Colors.grey,
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Center(
                child: Text(
                  'D',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Flexible(
              child: Text(
                _workspaceName,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(
                  isDark ? Colors.white60 : Colors.grey.shade700,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return PopupMenuButton<String>(
      offset: const Offset(0, 50),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      color: context.cardColor,
      elevation: 8,
      onSelected: (value) async {
        // Handle special actions
        if (value == '__settings__') {
          // Navigate to Workspace Settings
          final currentWs = _workspaceService.currentWorkspace;
          if (currentWs != null) {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => WorkspaceSettingsScreen(
                  workspace: currentWs,
                ),
              ),
            );
          }
          return;
        }

        if (value == '__billing__') {
          // Navigate to Billing screen
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const BillingScreen(),
            ),
          );
          return;
        }

        if (value == '__create__') {
          // Navigate to Create Workspace
          final result = await Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const CreateWorkspaceScreen(),
            ),
          );
          // Refresh workspaces if a new one was created
          if (result == true) {
            await _workspaceService.fetchWorkspaces();
            if (mounted) {
              setState(() {});
            }
          }
          return;
        }

        // Switch to selected workspace
        await _workspaceService.setCurrentWorkspace(value);

        // Update UI
        if (mounted) {
          final workspace = _workspaceService.currentWorkspace;
          if (workspace != null) {
            setState(() {
              _workspaceName = workspace.name;
            });
          }
        }
      },
      itemBuilder: (BuildContext context) {
        final items = <PopupMenuEntry<String>>[];

        // Add workspace items
        for (final workspace in workspaces) {
          final isSelected = workspace.id == currentWorkspace?.id;

          items.add(PopupMenuItem<String>(
            value: workspace.id,
            child: Stack(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? (context.backgroundColor)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      // Workspace avatar/logo
                      _buildWorkspaceAvatar(
                        workspace.logo,
                        workspace.name,
                        32,
                        16,
                      ),
                      const SizedBox(width: 12),

                      // Workspace name and details
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              workspace.name,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : Colors.black,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (workspace.description != null)
                              Text(
                                workspace.description!,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? Colors.white38 : Colors.grey[600],
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 28), // Extra space for badge

                      // Selected indicator
                      if (isSelected)
                        Icon(
                          Icons.check_circle,
                          color: context.primaryColor,
                          size: 20,
                        ),
                    ],
                  ),
                ),
                // Plan badge at top right corner
                Positioned(
                  top: 0,
                  right: 0,
                  child: _buildPlanBadge(workspace.subscriptionPlan),
                ),
              ],
            ),
          ));
        }

        // Add divider
        items.add(const PopupMenuDivider());

        // Add Settings button
        items.add(PopupMenuItem<String>(
          value: '__settings__',
          child: Row(
            children: [
              Icon(
                Icons.settings_outlined,
                size: 20,
                color: context.mutedForegroundColor,
              ),
              const SizedBox(width: 12),
              Text(
                'workspace.workspace_settings'.tr(),
                style: TextStyle(
                  fontSize: 14,
                  color: context.colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ));

        // Add Billing button
        items.add(PopupMenuItem<String>(
          value: '__billing__',
          child: Row(
            children: [
              Icon(
                Icons.payment_outlined,
                size: 20,
                color: context.mutedForegroundColor,
              ),
              const SizedBox(width: 12),
              Text(
                'billing.title'.tr(),
                style: TextStyle(
                  fontSize: 14,
                  color: context.colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ));

        // Add Create Workspace button
        items.add(PopupMenuItem<String>(
          value: '__create__',
          child: Row(
            children: [
              Icon(
                Icons.add_circle_outline,
                size: 20,
                color: context.primaryColor,
              ),
              const SizedBox(width: 12),
              Text(
                'workspace.create_workspace'.tr(),
                style: TextStyle(
                  fontSize: 14,
                  color: context.primaryColor,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ));

        return items;
      },
      child: IntrinsicWidth(
        child: Stack(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              decoration: BoxDecoration(
                color: context.cardColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: context.borderColor,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Current workspace avatar
                  _buildWorkspaceAvatar(
                    currentWorkspace?.logo,
                    _workspaceName,
                    28,
                    14,
                  ),
                  const SizedBox(width: 10),

                  // Workspace name
                  Flexible(
                    child: Text(
                      _workspaceName,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Dropdown icon
                  Icon(
                    Icons.keyboard_arrow_down,
                    color: isDark ? Colors.white60 : Colors.grey[700],
                    size: 20,
                  ),
                ],
              ),
            ),
            // Plan badge at top right corner
            Positioned(
              top: 0,
              right: 0,
              child: _buildPlanBadge(currentWorkspace?.subscriptionPlan),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      backgroundColor: context.backgroundColor,
      appBar: AppBar(
        backgroundColor: context.backgroundColor,
        elevation: 0,
        titleSpacing: 16,
        centerTitle: false,
        title: _buildWorkspaceDropdown(isDark),
        actions: [
          NotificationAppBarBadge(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => const NotificationCenterScreen(),
                ),
              );
            },
          ),
          if (widget.themeNotifier != null)
            IconButton(
              onPressed: () {
                widget.themeNotifier!.toggleTheme();
              },
              icon: Icon(
                isDark ? Icons.light_mode : Icons.dark_mode,
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
              tooltip: isDark ? 'dashboard.switch_to_light'.tr() : 'dashboard.switch_to_dark'.tr(),
            ),

          // User Avatar Menu
          _buildUserAvatarMenu(isDark),

          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Commented out - Overview TabBar button
          // Container(
          //   color: context.backgroundColor,
          //   child: Container(
          //     margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
          //     height: 48,
          //     decoration: BoxDecoration(
          //       color: context.cardColor,
          //       borderRadius: BorderRadius.circular(12),
          //       border: Border.all(
          //         color: context.borderColor,
          //       ),
          //       boxShadow: [
          //         BoxShadow(
          //           color: isDark
          //             ? Colors.black.withValues(alpha: 0.2)
          //             : Colors.grey.withValues(alpha: 0.1),
          //           blurRadius: 10,
          //           offset: const Offset(0, 2),
          //         ),
          //       ],
          //     ),
          //     child: Theme(
          //       data: Theme.of(context).copyWith(
          //         splashColor: Colors.transparent,
          //         highlightColor: Colors.transparent,
          //       ),
          //       child: TabBar(
          //         controller: _tabController,
          //         indicator: BoxDecoration(
          //           gradient: LinearGradient(
          //             colors: [
          //               context.primaryColor,
          //               Color(0xFF1E56D8),
          //             ],
          //           ),
          //           borderRadius: BorderRadius.circular(10),
          //           boxShadow: [
          //             BoxShadow(
          //               color: AppTheme.primaryLight.withValues(alpha: 0.3),
          //               blurRadius: 8,
          //               offset: const Offset(0, 2),
          //             ),
          //           ],
          //         ),
          //         indicatorSize: TabBarIndicatorSize.tab,
          //         indicatorPadding: const EdgeInsets.all(4),
          //         labelColor: Colors.white,
          //         unselectedLabelColor: isDark ? Colors.white70 : Colors.grey[700],
          //         labelStyle: const TextStyle(
          //           fontWeight: FontWeight.w600,
          //           fontSize: 14,
          //         ),
          //         unselectedLabelStyle: const TextStyle(
          //           fontWeight: FontWeight.w500,
          //           fontSize: 14,
          //         ),
          //         dividerColor: Colors.transparent,
          //         tabs: [
          //           Tab(
          //             child: AnimatedContainer(
          //               duration: const Duration(milliseconds: 200),
          //               child: Row(
          //                 mainAxisSize: MainAxisSize.min,
          //                 children: [
          //                   Icon(
          //                     _currentTabIndex == 0
          //                       ? Icons.dashboard
          //                       : Icons.dashboard_outlined,
          //                     size: 18
          //                   ),
          //                   const SizedBox(width: 6),
          //                   const Text('Overview'),
          //                 ],
          //               ),
          //             ),
          //           ),
          //           // Commented out - Activity tab
          //           // Tab(
          //           //   child: AnimatedContainer(
          //           //     duration: const Duration(milliseconds: 200),
          //           //     child: Row(
          //           //       mainAxisSize: MainAxisSize.min,
          //           //       children: [
          //           //         Icon(
          //           //           _currentTabIndex == 1
          //           //             ? Icons.timeline
          //           //             : Icons.timeline_outlined,
          //           //           size: 18
          //           //         ),
          //           //         const SizedBox(width: 6),
          //           //         const Text('Activity'),
          //           //       ],
          //           //     ),
          //           //   ),
          //           // ),
          //           // Commented out - Analytics tab
          //           // Tab(
          //           //   child: AnimatedContainer(
          //           //     duration: const Duration(milliseconds: 200),
          //           //     child: Row(
          //           //       mainAxisSize: MainAxisSize.min,
          //           //       children: [
          //           //         Icon(
          //           //           _currentTabIndex == 2
          //           //             ? Icons.analytics
          //           //             : Icons.analytics_outlined,
          //           //           size: 18
          //           //         ),
          //           //         const SizedBox(width: 6),
          //           //         const Text('Analytics'),
          //           //       ],
          //           //     ),
          //           //   ),
          //           // ),
          //         ],
          //       ),
          //     ),
          //   ),
          // ),

          // Quick Actions Bar at Top
          _buildTopQuickActions(isDark),

          Expanded(
            child: Container(
              color: context.backgroundColor,
              child: TabBarView(
                controller: _tabController,
                physics: const BouncingScrollPhysics(),
                children: [
                  // Overview Tab
                  SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            
            // Metrics Cards
            Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _isLoadingDashboard
                      ? const Center(
                          child: Padding(
                            padding: EdgeInsets.all(32.0),
                            child: CircularProgressIndicator(),
                          ),
                        )
                      : _dashboardError != null
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.all(32.0),
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.error_outline,
                                      size: 48,
                                      color: isDark ? Colors.white38 : Colors.grey,
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      'dashboard.failed_to_load'.tr(),
                                      style: TextStyle(
                                        color: isDark ? Colors.white60 : Colors.grey[600],
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    ElevatedButton.icon(
                                      onPressed: _fetchDashboardData,
                                      icon: const Icon(Icons.refresh),
                                      label: Text('common.retry'.tr()),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          : GridView.count(
                              crossAxisCount: 3,
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                              childAspectRatio: 1.1,
                              children: [
                                _buildMetricCard(
                                  icon: Icons.people_outline,
                                  value: '${_dashboardData?.metrics.summary.totalTeamMembers ?? 0}',
                                  label: 'dashboard.total_members'.tr(),
                                  color: AppTheme.infoLight,
                                  isDark: isDark,
                                  onTap: () {
                                    // Navigate to Team screen
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (context) => const TeamScreen(),
                                      ),
                                    );
                                  },
                                ),
                                _buildMetricCard(
                                  icon: Icons.event_outlined,
                                  value: '${_dashboardData?.metrics.summary.totalEvents ?? 0}',
                                  label: 'dashboard.events'.tr(),
                                  color: AppTheme.destructiveLight,
                                  isDark: isDark,
                                  onTap: () {
                                    // Navigate to Calendar screen
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (context) => const CalendarScreen(),
                                      ),
                                    );
                                  },
                                ),
                                _buildMetricCard(
                                  icon: Icons.check_circle_outline,
                                  value: '${_dashboardData?.metrics.summary.totalTasks ?? 0}',
                                  label: 'dashboard.tasks'.tr(),
                                  color: AppTheme.successLight,
                                  isDark: isDark,
                                  onTap: () {
                                    // Navigate to Project Overview screen (All Tasks section)
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (context) => const ProjectOverviewScreen(),
                                      ),
                                    );
                                  },
                                ),
                                _buildMetricCard(
                                  icon: Icons.mail_outline,
                                  value: '${_dashboardData?.metrics.summary.totalMessages ?? 0}',
                                  label: 'dashboard.messages'.tr(),
                                  color: AppTheme.infoLight,
                                  isDark: isDark,
                                  onTap: () {
                                    // Navigate to Messages tab
                                    Navigator.of(context).pushReplacement(
                                      MaterialPageRoute(
                                        builder: (context) => MainScreen(
                                          themeNotifier: widget.themeNotifier ?? ThemeNotifier(),
                                          initialIndex: 2, // Messages tab
                                        ),
                                      ),
                                    );
                                  },
                                ),
                                _buildMetricCard(
                                  icon: Icons.folder_outlined,
                                  value: '${_dashboardData?.metrics.summary.totalFiles ?? 0}',
                                  label: 'dashboard.files'.tr(),
                                  color: AppTheme.warningLight,
                                  isDark: isDark,
                                  onTap: () {
                                    // Navigate to Files screen
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (context) => const FilesScreen(),
                                      ),
                                    );
                                  },
                                ),
                                _buildMetricCard(
                                  icon: Icons.work_outline,
                                  value: '${_dashboardData?.metrics.summary.totalProjects ?? 0}',
                                  label: 'dashboard.projects'.tr(),
                                  color: const Color(0xFF673AB7),
                                  isDark: isDark,
                                  onTap: () {
                                    // Navigate to Projects tab
                                    Navigator.of(context).pushReplacement(
                                      MaterialPageRoute(
                                        builder: (context) => MainScreen(
                                          themeNotifier: widget.themeNotifier ?? ThemeNotifier(),
                                          initialIndex: 3, // Projects tab
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ],
                            ),
                ],
              ),
            ),

            // Smart Suggestions Section
            const SizedBox(height: 16),
            _buildSmartSuggestionsSection(isDark),

            // Commented out - Activity Trend Chart
            // Container(
            //   margin: const EdgeInsets.symmetric(horizontal: 16),
            //   padding: const EdgeInsets.all(16),
            //   decoration: BoxDecoration(
            //     color: context.cardColor,
            //     borderRadius: BorderRadius.circular(8),
            //     border: Border.all(
            //       color: context.borderColor,
            //     ),
            //   ),
            //   child: Column(
            //     crossAxisAlignment: CrossAxisAlignment.start,
            //     children: [
            //       SizedBox(
            //         height: 250,
            //         child: _buildActivityChart(isDark),
            //       ),
            //     ],
            //   ),
            // ),

            // const SizedBox(height: 24),

            // Commented out - Integration Usage
            // Padding(
            //   padding: const EdgeInsets.symmetric(horizontal: 24),
            //   child: Container(
            //     padding: const EdgeInsets.all(16),
            //     decoration: BoxDecoration(
            //       color: context.cardColor,
            //       borderRadius: BorderRadius.circular(8),
            //       border: Border.all(
            //         color: context.borderColor,
            //       ),
            //     ),
            //     child: Column(
            //       crossAxisAlignment: CrossAxisAlignment.start,
            //       children: [
            //         Column(
            //           children: [
            //             _buildIntegrationCard(
            //               'Google Drive',
            //               '7 hours ago',
            //               0.82,
            //               Icons.cloud_outlined,
            //               Colors.blue,
            //               isDark,
            //             ),
            //             const SizedBox(height: 12),
            //             _buildIntegrationCard(
            //               'Slack',
            //               '11 hours ago',
            //               0.62,
            //               Icons.message_outlined,
            //               Colors.purple,
            //               isDark,
            //             ),
            //             const SizedBox(height: 12),
            //             _buildIntegrationCard(
            //               'Notion',
            //               'medium',
            //               0.43,
            //               Icons.note_outlined,
            //               Colors.orange,
            //               isDark,
            //             ),
            //             const SizedBox(height: 12),
            //             _buildIntegrationCard(
            //               'GitHub',
            //               'medium',
            //               0.65,
            //               Icons.code,
            //               Colors.green,
            //               isDark,
            //             ),
            //           ],
            //         ),
            //       ],
            //     ),
            //   ),
            // ),

            // Commented out - Top Projects
            // const SizedBox(height: 24),
            // Padding(
            //   padding: const EdgeInsets.symmetric(horizontal: 24),
            //   child: Container(
            //     padding: const EdgeInsets.all(16),
            //     decoration: BoxDecoration(
            //       color: context.cardColor,
            //       borderRadius: BorderRadius.circular(8),
            //       border: Border.all(
            //         color: context.borderColor,
            //       ),
            //     ),
            //     child: Column(
            //       crossAxisAlignment: CrossAxisAlignment.start,
            //       children: [
            //         _buildProjectItem(
            //           'workspace-suite-flutter',
            //           '100%',
            //           1.0,
            //           isDark,
            //         ),
            //         const SizedBox(height: 16),
            //         _buildProjectItem(
            //           'api-integration',
            //           '75%',
            //           0.75,
            //           isDark,
            //         ),
            //         const SizedBox(height: 16),
            //         _buildProjectItem(
            //           'mobile-app-v2',
            //           '50%',
            //           0.50,
            //           isDark,
            //         ),
            //         const SizedBox(height: 16),
            //         _buildProjectItem(
            //           'analytics-dashboard',
            //           '25%',
            //           0.25,
            //           isDark,
            //         ),
            //       ],
            //     ),
            //   ),
            // ),

            // Commented out - Upcoming Events
            // const SizedBox(height: 24),
            // Padding(
            //   padding: const EdgeInsets.symmetric(horizontal: 24),
            //   child: Container(
            //     padding: const EdgeInsets.all(16),
            //     decoration: BoxDecoration(
            //       color: context.cardColor,
            //       borderRadius: BorderRadius.circular(8),
            //       border: Border.all(
            //         color: context.borderColor,
            //       ),
            //     ),
            //     child: Column(
            //       crossAxisAlignment: CrossAxisAlignment.start,
            //       children: [
            //         _buildEventItem(
            //           'Team Standup',
            //           'Daily at 10:00 AM',
            //           Icons.groups_outlined,
            //           const Color(0xFF1F6FEB),
            //           isDark,
            //         ),
            //         const SizedBox(height: 16),
            //         _buildEventItem(
            //           'Sprint Review',
            //           'Friday at 3:00 PM',
            //           Icons.assessment_outlined,
            //           const Color(0xFF3FB950),
            //           isDark,
            //         ),
            //         const SizedBox(height: 16),
            //         _buildEventItem(
            //           'Project Kickoff',
            //           'Next Monday at 2:00 PM',
            //           Icons.rocket_launch_outlined,
            //           const Color(0xFFDB6D28),
            //           isDark,
            //         ),
            //         const SizedBox(height: 16),
            //         _buildEventItem(
            //           'Client Demo',
            //           'Next Wednesday at 4:00 PM',
            //           Icons.tv,
            //           const Color(0xFFA371F7),
            //           isDark,
            //         ),
            //       ],
            //     ),
            //   ),
            // ),

            const SizedBox(height: 24),
          ],
        ),
      ),

                // Commented out - Activity Tab
                // _buildActivityTab(isDark),

                // Commented out - Analytics Tab
                // _buildAnalyticsTab(isDark),
              ],
            ),
          ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildMetricCard({
    required IconData icon,
    required String value,
    required String label,
    required Color color,
    required bool isDark,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: context.borderColor,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(
                  icon,
                  color: color,
                  size: 20,
                ),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: isDark ? Colors.white60 : Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildLegendItem(String label, Color color, bool isDark) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: isDark ? Colors.white60 : Colors.grey[600],
          ),
        ),
      ],
    );
  }
  
  Widget _buildActivityChart(bool isDark) {
    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: true,
          horizontalInterval: 20,
          verticalInterval: 1,
          getDrawingHorizontalLine: (value) {
            return FlLine(
              color: isDark ? const Color(0xFF21262D) : const Color(0xFFE1E4E8),
              strokeWidth: 1,
            );
          },
          getDrawingVerticalLine: (value) {
            return FlLine(
              color: isDark ? const Color(0xFF21262D) : const Color(0xFFE1E4E8),
              strokeWidth: 1,
            );
          },
        ),
        titlesData: FlTitlesData(
          show: true,
          rightTitles: AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          topTitles: AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 30,
              interval: 1,
              getTitlesWidget: (value, meta) {
                final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                if (value.toInt() >= 0 && value.toInt() < days.length) {
                  return Text(
                    days[value.toInt()],
                    style: TextStyle(
                      color: isDark ? Colors.white38 : Colors.grey[500],
                      fontSize: 10,
                    ),
                  );
                }
                return const SizedBox();
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: 20,
              reservedSize: 40,
              getTitlesWidget: (value, meta) {
                return Text(
                  value.toInt().toString(),
                  style: TextStyle(
                    color: isDark ? Colors.white38 : Colors.grey[500],
                    fontSize: 10,
                  ),
                );
              },
            ),
          ),
        ),
        borderData: FlBorderData(
          show: false,
        ),
        minX: 0,
        maxX: 6,
        minY: 0,
        maxY: 100,
        lineBarsData: [
          // Messages
          LineChartBarData(
            spots: [
              const FlSpot(0, 60),
              const FlSpot(1, 65),
              const FlSpot(2, 55),
              const FlSpot(3, 70),
              const FlSpot(4, 58),
              const FlSpot(5, 52),
              const FlSpot(6, 62),
            ],
            isCurved: true,
            color: const Color(0xFF1F6FEB),
            barWidth: 2,
            isStrokeCapRound: true,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, percent, barData, index) {
                return FlDotCirclePainter(
                  radius: 3,
                  color: const Color(0xFF1F6FEB),
                  strokeWidth: 1,
                  strokeColor: const Color(0xFF0D1117),
                );
              },
            ),
            belowBarData: BarAreaData(show: false),
          ),
          // Tasks  
          LineChartBarData(
            spots: [
              const FlSpot(0, 10),
              const FlSpot(1, 15),
              const FlSpot(2, 12),
              const FlSpot(3, 18),
              const FlSpot(4, 14),
              const FlSpot(5, 11),
              const FlSpot(6, 13),
            ],
            isCurved: true,
            color: const Color(0xFF58A6FF),
            barWidth: 2,
            isStrokeCapRound: true,
            dotData: FlDotData(show: false),
            belowBarData: BarAreaData(show: false),
          ),
          // Files
          LineChartBarData(
            spots: [
              const FlSpot(0, 8),
              const FlSpot(1, 10),
              const FlSpot(2, 9),
              const FlSpot(3, 12),
              const FlSpot(4, 10),
              const FlSpot(5, 8),
              const FlSpot(6, 9),
            ],
            isCurved: true,
            color: const Color(0xFFDB6D28),
            barWidth: 2,
            isStrokeCapRound: true,
            dotData: FlDotData(show: false),
            belowBarData: BarAreaData(show: false),
          ),
          // Meetings
          LineChartBarData(
            spots: [
              const FlSpot(0, 5),
              const FlSpot(1, 7),
              const FlSpot(2, 6),
              const FlSpot(3, 8),
              const FlSpot(4, 6),
              const FlSpot(5, 5),
              const FlSpot(6, 6),
            ],
            isCurved: true,
            color: const Color(0xFFF1E05A),
            barWidth: 2,
            isStrokeCapRound: true,
            dotData: FlDotData(show: false),
            belowBarData: BarAreaData(show: false),
          ),
          // Notes
          LineChartBarData(
            spots: [
              const FlSpot(0, 3),
              const FlSpot(1, 4),
              const FlSpot(2, 3),
              const FlSpot(3, 5),
              const FlSpot(4, 4),
              const FlSpot(5, 3),
              const FlSpot(6, 4),
            ],
            isCurved: true,
            color: const Color(0xFF3FB950),
            barWidth: 2,
            isStrokeCapRound: true,
            dotData: FlDotData(show: false),
            belowBarData: BarAreaData(show: false),
          ),
          // Integrations
          LineChartBarData(
            spots: [
              const FlSpot(0, 2),
              const FlSpot(1, 3),
              const FlSpot(2, 2),
              const FlSpot(3, 3),
              const FlSpot(4, 2),
              const FlSpot(5, 2),
              const FlSpot(6, 2),
            ],
            isCurved: true,
            color: const Color(0xFFDA3633),
            barWidth: 2,
            isStrokeCapRound: true,
            dotData: FlDotData(show: false),
            belowBarData: BarAreaData(show: false),
          ),
        ],
      ),
    );
  }
  
  Widget _buildIntegrationItem(
    String name,
    String usage,
    double progress,
    IconData icon,
    Color iconColor,
    bool isDark,
  ) {
    return Column(
      children: [
        Row(
          children: [
            Container(
              width: 32,
              height: 32,
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF21262D) : const Color(0xFFE1E4E8),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Icon(icon, size: 20, color: iconColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  Text(
                    'Usage: $usage',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.white38 : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            Text(
              '${(progress * 100).toInt()}%',
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white60 : Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 4,
          child: LinearProgressIndicator(
            value: progress,
            backgroundColor: const Color(0xFF21262D),
            valueColor: AlwaysStoppedAnimation<Color>(
              progress > 0.75 ? const Color(0xFFDB6D28) : const Color(0xFF238636),
            ),
          ),
        ),
      ],
    );
  }
  
  Widget _buildIntegrationCard(
    String name,
    String usage,
    double progress,
    IconData icon,
    Color iconColor,
    bool isDark,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.backgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: context.borderColor,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF21262D) : const Color(0xFFE1E4E8),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(icon, size: 20, color: iconColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    Text(
                      'Usage: $usage',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.white38 : Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                '${(progress * 100).toInt()}%',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white60 : Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 4,
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: isDark ? const Color(0xFF21262D) : const Color(0xFFE1E4E8),
              valueColor: AlwaysStoppedAnimation<Color>(
                progress > 0.75 ? const Color(0xFFDB6D28) : const Color(0xFF238636),
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildProjectItem(
    String name,
    String percentage,
    double progress,
    bool isDark,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.backgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: context.borderColor,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.folder_outlined,
                    size: 16,
                    color: isDark ? Colors.white60 : Colors.grey[600],
                  ),
                  const SizedBox(width: 8),
                  Text(
                    name,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: progress >= 1.0 ? const Color(0xFF238636) : 
                         progress > 0.5 ? const Color(0xFF1F6FEB) : 
                         const Color(0xFFDB6D28),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  percentage,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.white : Colors.black,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            height: 6,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF21262D) : const Color(0xFFE1E4E8),
              borderRadius: BorderRadius.circular(3),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: progress,
                backgroundColor: Colors.transparent,
                valueColor: AlwaysStoppedAnimation<Color>(
                  progress >= 1.0 ? const Color(0xFF238636) : 
                  progress > 0.5 ? const Color(0xFF1F6FEB) : 
                  const Color(0xFFDB6D28),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildEventItem(
    String title,
    String time,
    IconData icon,
    Color color,
    bool isDark,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.backgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: context.borderColor,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Icon(
              icon,
              color: color,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                Text(
                  time,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.white38 : Colors.grey[500],
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.more_vert,
            size: 16,
            color: isDark ? Colors.white38 : Colors.grey[500],
          ),
        ],
      ),
    );
  }
  
  Widget _buildActivityTab(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Recent Activity',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 16),
          
          // Activity items
          ...List.generate(10, (index) => Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: context.cardColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: context.borderColor,
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: [
                      Colors.blue,
                      Colors.green,
                      Colors.orange,
                      Colors.purple,
                      Colors.red,
                    ][index % 5].withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    [
                      Icons.message,
                      Icons.check_circle,
                      Icons.folder,
                      Icons.note,
                      Icons.code,
                    ][index % 5],
                    color: [
                      Colors.blue,
                      Colors.green,
                      Colors.orange,
                      Colors.purple,
                      Colors.red,
                    ][index % 5],
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        [
                          'New message in #general',
                          'Task completed: Update UI',
                          'Project updated: Mobile App',
                          'Note created: Meeting Notes',
                          'Code pushed to repository',
                        ][index % 5],
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${index + 1} hours ago',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.white38 : Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }
  
  Widget _buildAnalyticsTab(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Performance Analytics',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 24),
          
          // Productivity Score
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: context.cardColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: context.borderColor,
              ),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Productivity Score',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        '85%',
                        style: TextStyle(
                          color: Colors.green,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                LinearProgressIndicator(
                  value: 0.85,
                  backgroundColor: isDark ? const Color(0xFF21262D) : const Color(0xFFE1E4E8),
                  valueColor: const AlwaysStoppedAnimation<Color>(Colors.green),
                  minHeight: 8,
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Stats Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 1.5,
            children: [
              _buildStatCard('Tasks/Day', '12.5', '+15%', Colors.blue, isDark),
              _buildStatCard('Avg Response', '2.3h', '-20%', Colors.green, isDark),
              _buildStatCard('Focus Time', '6.5h', '+10%', Colors.orange, isDark),
              _buildStatCard('Meetings', '4.2/day', '-5%', Colors.purple, isDark),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Weekly Performance Chart
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: context.cardColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: context.borderColor,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Weekly Performance',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 200,
                  child: _buildActivityChart(isDark),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildStatCard(String label, String value, String change, Color color, bool isDark) {
    final isPositive = change.startsWith('+');
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: context.borderColor,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white60 : Colors.grey[600],
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: (isPositive ? Colors.green : Colors.red).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  change,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isPositive ? Colors.green : Colors.red,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _handleMenuSelection(String value) {
    switch (value) {
      case 'quick_stats':
        _showQuickStatsDialog();
        break;
      case 'todays_overview':
        _showTodaysOverviewDialog();
        break;
      case 'upcoming':
        _showUpcomingDialog();
        break;
      case 'test_notifications':
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const NotificationTestScreen(),
          ),
        );
        break;
    }
  }

  /// Handle user menu selection
  Future<void> _handleUserMenuSelection(String value) async {
    switch (value) {
      case 'profile':
        // Navigate to Profile screen
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const ProfileScreen(),
          ),
        );
        break;

      case 'workspace':
        // Navigate to Workspace screen
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const WorkspaceScreen(),
          ),
        );
        break;

      case 'team':
        // Navigate to Team screen
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const TeamScreen(),
          ),
        );
        break;

      case 'settings':
        // Navigate to Settings screen
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => SettingsScreen(
              themeNotifier: widget.themeNotifier ?? ThemeNotifier(),
            ),
          ),
        );
        break;

      case 'logout':
        // Logout directly without confirmation
        _performLogout();
        break;
    }
  }

  /// Show logout confirmation dialog
  void _showLogoutConfirmationDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: context.cardColor,
        title: Text(
          'common.logout'.tr(),
          style: TextStyle(
            color: isDark ? Colors.white : Colors.black,
          ),
        ),
        content: Text(
          'dashboard.logout_confirm'.tr(),
          style: TextStyle(
            color: isDark ? Colors.white70 : Colors.grey[700],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text('common.cancel'.tr()),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(dialogContext); // Close dialog
              await _performLogout();
            },
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: Text('common.logout'.tr()),
          ),
        ],
      ),
    );
  }

  /// Perform logout action
  Future<void> _performLogout() async {
    // Prevent double logout calls
    if (_isLoggingOut) {
      return;
    }

    _isLoggingOut = true;

    try {

      // Call logout API (ignore errors as we're logging out anyway)
      try {
        await AuthService.instance.dio.post('/auth/logout');
      } catch (apiError) {
        // Continue with local sign out even if API fails
      }

      // Sign out using AuthProvider (which will notify listeners including AuthWrapper)
      await AuthProvider.instance.signOut();

      // AuthWrapper will automatically show LoginScreen when auth state changes
      // No need to navigate manually
    } catch (e) {
      _isLoggingOut = false;
      // AuthWrapper will still handle showing login if signOut succeeded partially
    }
  }
  
  void _showQuickStatsDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Quick Stats'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildStatRow('Active Projects', '24', Icons.folder_open, Colors.blue),
            const SizedBox(height: 12),
            _buildStatRow('Tasks Today', '12', Icons.task_alt, Colors.green),
            const SizedBox(height: 12),
            _buildStatRow('Messages', '51', Icons.message, Colors.purple),
            const SizedBox(height: 12),
            _buildStatRow('Team Members', '8', Icons.people, Colors.orange),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
  
  void _showTodaysOverviewDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Today's Overview"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Schedule', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _buildOverviewItem('10:00 AM', 'Team Standup'),
            _buildOverviewItem('2:00 PM', 'Client Meeting'),
            _buildOverviewItem('4:00 PM', 'Code Review'),
            const SizedBox(height: 16),
            const Text('Priorities', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _buildPriorityItem('Complete API integration', Colors.red),
            _buildPriorityItem('Review pull requests', Colors.orange),
            _buildPriorityItem('Update documentation', Colors.green),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
  
  void _showUpcomingDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Upcoming'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Next 7 Days', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildUpcomingItem('Tomorrow', 'Sprint Planning', Icons.event),
            _buildUpcomingItem('Thursday', 'Release Deploy', Icons.rocket_launch),
            _buildUpcomingItem('Friday', 'Team Retrospective', Icons.groups),
            _buildUpcomingItem('Monday', 'Project Kickoff', Icons.flag),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
  
  Widget _buildStatRow(String label, String value, IconData icon, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 8),
            Text(label),
          ],
        ),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: color,
          ),
        ),
      ],
    );
  }
  
  Widget _buildOverviewItem(String time, String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(
            time,
            style: const TextStyle(
              fontWeight: FontWeight.w500,
              color: Colors.grey,
            ),
          ),
          const SizedBox(width: 12),
          Text(title),
        ],
      ),
    );
  }
  
  Widget _buildPriorityItem(String title, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(title),
        ],
      ),
    );
  }
  
  Widget _buildUpcomingItem(String day, String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                day,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Handle suggestion tap - navigate to appropriate screen
  void _handleSuggestionTap(String type) {
    switch (type) {
      case 'workload':
      case 'deadline':
      case 'productivity':
        // Navigate to Projects tab
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => MainScreen(
              themeNotifier: widget.themeNotifier ?? ThemeNotifier(),
              initialIndex: 2, // Projects tab
            ),
          ),
        );
        break;
      case 'video_call':
        // Navigate to Schedule Meeting screen
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const ScheduleMeetingScreen(),
          ),
        );
        break;
      case 'event':
        // Navigate to Calendar/Events screen
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => CreateEventScreen(
              onEventCreated: (event) {
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Event "${event.title}" created successfully!'),
                    backgroundColor: Colors.green,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
            ),
          ),
        );
        break;
      case 'message':
        // Navigate to Messages tab
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => MainScreen(
              themeNotifier: widget.themeNotifier ?? ThemeNotifier(),
              initialIndex: 1, // Messages tab
            ),
          ),
        );
        break;
      case 'collaboration':
        // Navigate to Messages tab for team collaboration
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => MainScreen(
              themeNotifier: widget.themeNotifier ?? ThemeNotifier(),
              initialIndex: 1, // Messages tab
            ),
          ),
        );
        break;
      default:
        // Default - stay on dashboard
        break;
    }
  }

  /// Build Smart Suggestions Section - Uses real API data
  Widget _buildSmartSuggestionsSection(bool isDark) {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 16),
      child: SmartSuggestionsWidget(),
    );
  }

  /// Build top quick actions bar
  Widget _buildTopQuickActions(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: context.cardColor,
        border: Border(
          bottom: BorderSide(
            color: context.borderColor,
            width: 1,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.2)
                : Colors.grey.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildTopActionItem(
              icon: Icons.add_circle_outline,
              label: 'dashboard.new_project'.tr(),
              color: AppTheme.infoLight,
              isDark: isDark,
              onTap: () {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(
                    builder: (context) => MainScreen(
                      themeNotifier: widget.themeNotifier ?? ThemeNotifier(),
                      initialIndex: 2,
                    ),
                  ),
                );
              },
            ),
            _buildTopActionItem(
              icon: Icons.chat_bubble_outline,
              label: 'dashboard.message'.tr(),
              color: AppTheme.successLight,
              isDark: isDark,
              onTap: () {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(
                    builder: (context) => MainScreen(
                      themeNotifier: widget.themeNotifier ?? ThemeNotifier(),
                      initialIndex: 1,
                    ),
                  ),
                );
              },
            ),
            _buildTopActionItem(
              icon: Icons.upload_file_outlined,
              label: 'dashboard.upload'.tr(),
              color: AppTheme.infoLight,
              isDark: isDark,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => const FilesScreen(),
                  ),
                );
              },
            ),
            _buildTopActionItem(
              icon: Icons.video_call_outlined,
              label: 'dashboard.meeting'.tr(),
              color: AppTheme.warningLight,
              isDark: isDark,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => const ScheduleMeetingScreen(),
                  ),
                );
              },
            ),
            _buildTopActionItem(
              icon: Icons.event_outlined,
              label: 'dashboard.event'.tr(),
              color: const Color(0xFFE91E63),
              isDark: isDark,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => CreateEventScreen(
                      onEventCreated: (event) {
                        Navigator.of(context).pop();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Event "${event.title}" created successfully!'),
                            backgroundColor: Colors.green,
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      },
                    ),
                  ),
                );
              },
            ),
            _buildTopActionItem(
              icon: Icons.note_add_outlined,
              label: 'dashboard.note'.tr(),
              color: const Color(0xFF00BCD4),
              isDark: isDark,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => const NoteEditorScreen(
                      initialMode: NoteEditorMode.create,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Build individual top action item
  Widget _buildTopActionItem({
    required IconData icon,
    required String label,
    required Color color,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: color,
                size: 22,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

}