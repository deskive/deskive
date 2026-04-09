import 'dart:async';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/theme_notifier.dart';
import 'other_screens.dart';
import '../services/socket_io_chat_service.dart';
import '../services/video_call_socket_service.dart';
import '../services/incoming_call_manager.dart';
import '../services/auth_service.dart';
import '../services/tab_configuration_service.dart';
import '../config/app_config.dart';
import '../config/tab_registry.dart';
import '../models/tab_config.dart';
import '../videocalls/video_call_screen.dart';

class MainScreen extends StatefulWidget {
  final ThemeNotifier themeNotifier;
  final int initialIndex;

  const MainScreen({
    super.key,
    required this.themeNotifier,
    this.initialIndex = 0,
  });

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  late int _currentIndex;

  // Tab configuration
  final TabConfigurationService _tabConfigService = TabConfigurationService();
  TabConfiguration _tabConfig = TabConfiguration.defaultConfig();
  StreamSubscription<TabConfiguration>? _configSubscription;
  bool _isLoadingConfig = true;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;

    // Load tab configuration
    _loadTabConfiguration();

    // Listen for configuration changes
    _configSubscription = _tabConfigService.configStream.listen((config) {
      if (mounted) {
        setState(() {
          _tabConfig = config;
          // Reset index if current tab was removed
          if (_currentIndex >= config.bottomNavTabIds.length + 1) {
            _currentIndex = 0;
          }
        });
      }
    });

    // ⭐ CRITICAL: Check for pending call IMMEDIATELY before anything else
    _checkForPendingCall();

    // Initialize Socket.IO service for real-time notifications and chat
    _initializeSocketService();

    // Initialize Incoming Call Manager for video call notifications
    _initializeIncomingCallManager();
  }

  Future<void> _loadTabConfiguration() async {
    try {
      final config = await _tabConfigService.loadConfiguration();
      if (mounted) {
        setState(() {
          _tabConfig = config;
          _isLoadingConfig = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading tab configuration: $e');
      if (mounted) {
        setState(() => _isLoadingConfig = false);
      }
    }
  }

  /// Get the screen widget for a tab ID
  Widget _getScreenForTabId(String tabId) {
    return TabRegistry.getScreenForTabId(tabId, widget.themeNotifier);
  }

  /// Build list of screens based on current configuration
  List<Widget> _buildScreens() {
    final screens = _tabConfig.bottomNavTabIds
        .map((id) => _getScreenForTabId(id))
        .toList();
    // Add the "More" screen at the end
    screens.add(ProfileScreen(
      themeNotifier: widget.themeNotifier,
      moreMenuTabIds: _tabConfig.moreMenuTabIds,
    ));
    return screens;
  }

  /// Build navigation destinations based on current configuration
  List<NavigationDestination> _buildNavigationDestinations() {
    final destinations = _tabConfig.bottomNavTabIds.map((tabId) {
      final tab = TabRegistry.getTabById(tabId);
      if (tab == null) {
        return NavigationDestination(
          icon: const Icon(Icons.help_outline, size: 24),
          label: tabId,
        );
      }

      // Special styling for AutoPilot tab
      if (tabId == 'autopilot') {
        return NavigationDestination(
          icon: Icon(tab.icon, size: 24),
          selectedIcon: Icon(tab.activeIcon, size: 24, color: Colors.teal.shade600),
          label: tab.labelKey.tr(),
        );
      }

      return NavigationDestination(
        icon: Icon(tab.icon, size: 24),
        selectedIcon: Icon(tab.activeIcon, size: 24),
        label: tab.labelKey.tr(),
      );
    }).toList();

    // Add "More" tab at the end
    destinations.add(NavigationDestination(
      icon: const Icon(Icons.apps_outlined, size: 24),
      selectedIcon: const Icon(Icons.apps_rounded, size: 24),
      label: 'nav.more'.tr(),
    ));

    return destinations;
  }

  /// Check for pending call from terminated state launch
  Future<void> _checkForPendingCall() async {
    try {

      final prefs = await SharedPreferences.getInstance();

      // Check for BOTH types of pending calls:
      // 1. FCM launch call (from notification tap in terminated state)
      // 2. CallKit pending action (from CallKit notification tap)

      // Priority 1: Check FCM launch call
      final launchCallId = prefs.getString('launch_call_id');
      if (launchCallId != null && launchCallId.isNotEmpty) {
        await _navigateToLaunchCall(prefs);
        return;
      }

      // Priority 2: Check CallKit pending action
      final pendingCallId = prefs.getString('pending_call_id');
      if (pendingCallId != null && pendingCallId.isNotEmpty) {
        await _navigateToPendingCall(prefs);
        return;
      }

    } catch (e) {
    }
  }

  /// Navigate to call from FCM launch data
  Future<void> _navigateToLaunchCall(SharedPreferences prefs) async {
    try {
      final callId = prefs.getString('launch_call_id')!;
      final callType = prefs.getString('launch_call_type') ?? 'video';

      // Clear launch call data
      await prefs.remove('launch_call_id');
      await prefs.remove('launch_call_type');
      await prefs.remove('launch_caller_user_id');
      await prefs.remove('launch_caller_name');
      await prefs.remove('launch_caller_avatar');
      await prefs.remove('launch_is_group_call');
      await prefs.remove('launch_workspace_id');
      await prefs.remove('launch_call_timestamp');

      // Small delay to ensure MainScreen is fully mounted
      await Future.delayed(const Duration(milliseconds: 100));

      if (mounted) {

        // Accept call via WebSocket
        VideoCallSocketService.instance.acceptCall(callId: callId);

        // Navigate to call screen
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => VideoCallScreen(
              callId: callId,
              isIncoming: true,
              isAudioOnly: callType == 'audio',
              initialMicEnabled: true,
            ),
          ),
        );
      }
    } catch (e) {
    }
  }

  /// Navigate to call from CallKit pending action
  Future<void> _navigateToPendingCall(SharedPreferences prefs) async {
    try {
      final callId = prefs.getString('pending_call_id')!;
      final callType = prefs.getString('pending_call_type') ?? 'video';

      // Clear pending call data
      await prefs.remove('pending_call_id');
      await prefs.remove('pending_call_type');
      await prefs.remove('pending_caller_user_id');
      await prefs.remove('pending_is_group_call');
      await prefs.remove('pending_call_action');

      // Small delay to ensure MainScreen is fully mounted
      await Future.delayed(const Duration(milliseconds: 100));

      if (mounted) {

        // Accept call via WebSocket
        VideoCallSocketService.instance.acceptCall(callId: callId);

        // Navigate to call screen
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => VideoCallScreen(
              callId: callId,
              isIncoming: true,
              isAudioOnly: callType == 'audio',
              initialMicEnabled: true,
            ),
          ),
        );
      }
    } catch (e) {
    }
  }

  /// Initialize Socket.IO service for real-time features
  Future<void> _initializeSocketService() async {
    try {

      // Get user info and workspace
      final userId = await AppConfig.getCurrentUserId();
      final workspaceId = await AppConfig.getCurrentWorkspaceId();
      final userName = AuthService.instance.currentUser?.name ??
                       AuthService.instance.currentUser?.email ??
                       'User';

      if (userId == null || workspaceId == null) {
        return;
      }

      // Initialize socket service
      await SocketIOChatService.instance.initialize(
        workspaceId: workspaceId,
        userId: userId,
        userName: userName,
      );

    } catch (e) {
    }
  }

  /// Initialize Incoming Call Manager to handle video call notifications
  void _initializeIncomingCallManager() {
    try {

      // Initialize with current context and VideoCallSocketService
      IncomingCallManager().initialize(
        context,
        VideoCallSocketService.instance,
      );

    } catch (e) {
    }
  }

  @override
  void dispose() {
    _configSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Show loading indicator while configuration loads
    if (_isLoadingConfig) {
      return Scaffold(
        body: Center(
          child: CircularProgressIndicator(
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
      );
    }

    final screens = _buildScreens();
    final destinations = _buildNavigationDestinations();

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        indicatorColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
        indicatorShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.transparent,
        height: 65,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        destinations: destinations,
      ),
    );
  }
}