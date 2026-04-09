import 'package:flutter/material.dart';
import '../models/tab_config.dart';
import '../utils/theme_notifier.dart';

// Screen imports
import '../dashboard/dashboard_screen.dart';
import '../screens/autopilot_screen.dart';
import '../message/messages_screen.dart';
import '../projects/project_dashboard_screen.dart';
import '../notes/notes.dart';
import '../calendar/calendar_screen.dart';
import '../videocalls/video_calls_home_screen.dart';
import '../files/files_screen.dart';
import '../email/email_screen.dart';
import '../search/global_search.dart';
import '../apps/apps_screen.dart';
import '../tools/tools_screen.dart';
import '../screens/bots/bots_screen.dart';
import '../screens/settings_screen.dart';

/// Central registry of all available tabs in the app
class TabRegistry {
  TabRegistry._();

  /// Maximum number of tabs allowed in bottom navigation
  static const int maxBottomNavTabs = 5;

  /// All available tabs in the app
  static const List<TabItem> allTabs = [
    // Home/Dashboard - Required, cannot be removed
    TabItem(
      id: 'home',
      labelKey: 'nav.home',
      icon: Icons.home_outlined,
      activeIcon: Icons.home_rounded,
      isRemovable: false,
    ),
    // AutoPilot
    TabItem(
      id: 'autopilot',
      labelKey: 'nav.autopilot',
      icon: Icons.auto_fix_high_outlined,
      activeIcon: Icons.auto_fix_high,
    ),
    // Messages
    TabItem(
      id: 'messages',
      labelKey: 'nav.messages',
      icon: Icons.forum_outlined,
      activeIcon: Icons.forum_rounded,
    ),
    // Projects
    TabItem(
      id: 'projects',
      labelKey: 'nav.projects',
      icon: Icons.folder_outlined,
      activeIcon: Icons.folder_rounded,
    ),
    // Notes
    TabItem(
      id: 'notes',
      labelKey: 'nav.notes',
      icon: Icons.sticky_note_2_outlined,
      activeIcon: Icons.sticky_note_2_rounded,
    ),
    // Calendar
    TabItem(
      id: 'calendar',
      labelKey: 'more.calendar',
      icon: Icons.calendar_month_outlined,
      activeIcon: Icons.calendar_month,
    ),
    // Video Calls
    TabItem(
      id: 'video_calls',
      labelKey: 'more.video_calls',
      icon: Icons.video_call_outlined,
      activeIcon: Icons.video_call,
    ),
    // Files
    TabItem(
      id: 'files',
      labelKey: 'more.files',
      icon: Icons.folder_open_outlined,
      activeIcon: Icons.folder_open,
    ),
    // Email
    TabItem(
      id: 'email',
      labelKey: 'more.email',
      icon: Icons.email_outlined,
      activeIcon: Icons.email,
    ),
    // Search
    TabItem(
      id: 'search',
      labelKey: 'more.search',
      icon: Icons.search_outlined,
      activeIcon: Icons.search,
    ),
    // Connectors/Apps
    TabItem(
      id: 'connectors',
      labelKey: 'more.connectors',
      icon: Icons.extension_outlined,
      activeIcon: Icons.extension,
    ),
    // Tools
    TabItem(
      id: 'tools',
      labelKey: 'more.tools',
      icon: Icons.build_outlined,
      activeIcon: Icons.build,
    ),
    // Bots
    TabItem(
      id: 'bots',
      labelKey: 'bots.title',
      icon: Icons.smart_toy_outlined,
      activeIcon: Icons.smart_toy,
    ),
    // Settings
    TabItem(
      id: 'settings',
      labelKey: 'more.settings',
      icon: Icons.settings_outlined,
      activeIcon: Icons.settings,
    ),
  ];

  /// Default tab IDs for bottom navigation
  static const List<String> defaultBottomNavIds = [
    'home',
    'autopilot',
    'messages',
    'projects',
    'notes',
  ];

  /// Get a tab by its ID
  static TabItem? getTabById(String id) {
    try {
      return allTabs.firstWhere((tab) => tab.id == id);
    } catch (_) {
      return null;
    }
  }

  /// Get tabs by their IDs (in order)
  static List<TabItem> getTabsByIds(List<String> ids) {
    return ids
        .map((id) => getTabById(id))
        .whereType<TabItem>()
        .toList();
  }

  /// Get the screen widget for a tab ID
  static Widget getScreenForTabId(String id, ThemeNotifier themeNotifier) {
    switch (id) {
      case 'home':
        return DashboardScreen(themeNotifier: themeNotifier);
      case 'autopilot':
        return const AutoPilotScreen();
      case 'messages':
        return MessagesScreen();
      case 'projects':
        return const ProjectDashboardScreen();
      case 'notes':
        return const NotesScreen();
      case 'calendar':
        return const CalendarScreen();
      case 'video_calls':
        return const VideoCallsHomeScreen(showAppBar: true);
      case 'files':
        return const FilesScreen();
      case 'email':
        return const EmailScreen();
      case 'search':
        return const GlobalSearchScreen();
      case 'connectors':
        return const AppsScreen();
      case 'tools':
        return const ToolsScreen();
      case 'bots':
        return const BotsScreen();
      case 'settings':
        return SettingsScreen(themeNotifier: themeNotifier);
      default:
        return const SizedBox.shrink();
    }
  }

  /// Validate a tab configuration
  static bool isValidConfiguration(TabConfiguration config) {
    // Check bottom nav has at most maxBottomNavTabs
    if (config.bottomNavTabIds.length > maxBottomNavTabs) {
      return false;
    }

    // Check home is in bottom nav
    if (!config.bottomNavTabIds.contains('home')) {
      return false;
    }

    // Check no duplicates within bottom nav
    if (config.bottomNavTabIds.toSet().length != config.bottomNavTabIds.length) {
      return false;
    }

    // Check no duplicates within more menu
    if (config.moreMenuTabIds.toSet().length != config.moreMenuTabIds.length) {
      return false;
    }

    // Check no overlap between bottom nav and more menu
    final bottomSet = config.bottomNavTabIds.toSet();
    final moreSet = config.moreMenuTabIds.toSet();
    if (bottomSet.intersection(moreSet).isNotEmpty) {
      return false;
    }

    // Check all IDs are valid
    final allIds = {...config.bottomNavTabIds, ...config.moreMenuTabIds};
    final validIds = allTabs.map((t) => t.id).toSet();
    if (!allIds.every((id) => validIds.contains(id))) {
      return false;
    }

    return true;
  }

  /// Get all tab IDs that are not in the given configuration
  static List<String> getMissingTabIds(TabConfiguration config) {
    final allIds = allTabs.map((t) => t.id).toSet();
    final configuredIds = {
      ...config.bottomNavTabIds,
      ...config.moreMenuTabIds,
    };
    return allIds.difference(configuredIds).toList();
  }
}
