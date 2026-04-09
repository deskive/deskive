import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../utils/theme_notifier.dart';
import '../widgets/profile_widgets.dart';
import '../config/tab_registry.dart';
import '../services/tab_configuration_service.dart';
import 'settings_screen.dart';
import '../calendar/calendar_screen.dart';
import '../files/files_screen.dart';
import '../search/global_search.dart';
import '../videocalls/video_calls_home_screen.dart';
import '../apps/apps_screen.dart';
import '../email/email_screen.dart';
import '../tools/tools_screen.dart';
import 'bots/bots_screen.dart';


// NotesScreen is now provided by the notes package
// No need to define it here anymore as it's imported from '../notes/notes.dart'


class ProfileScreen extends StatefulWidget {
  final ThemeNotifier themeNotifier;
  final List<String>? moreMenuTabIds;

  const ProfileScreen({
    super.key,
    required this.themeNotifier,
    this.moreMenuTabIds,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  List<String> _menuTabIds = [];

  @override
  void initState() {
    super.initState();
    _loadMenuTabs();
  }

  @override
  void didUpdateWidget(ProfileScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.moreMenuTabIds != oldWidget.moreMenuTabIds) {
      _loadMenuTabs();
    }
  }

  void _loadMenuTabs() {
    if (widget.moreMenuTabIds != null) {
      setState(() => _menuTabIds = widget.moreMenuTabIds!);
    } else {
      // Load from service if not provided
      TabConfigurationService().loadConfiguration().then((config) {
        if (mounted) {
          setState(() => _menuTabIds = config.moreMenuTabIds);
        }
      });
    }
  }

  Widget _buildMenuItemForTabId(String tabId) {
    final tab = TabRegistry.getTabById(tabId);
    if (tab == null) return const SizedBox.shrink();

    return ProfileOption(
      icon: tab.icon,
      title: tab.labelKey.tr(),
      onTap: () {
        _navigateToScreen(tabId);
      },
    );
  }

  void _navigateToScreen(String tabId) {
    // Handle settings specially to refresh on return
    if (tabId == 'settings') {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => SettingsScreen(themeNotifier: widget.themeNotifier),
        ),
      ).then((_) {
        // Rebuild when returning from settings to reflect changes
        if (mounted) {
          setState(() {});
          _loadMenuTabs(); // Reload in case tabs were rearranged
        }
      });
      return;
    }

    // Get the screen for the tab
    final screen = _getScreenForTabId(tabId);

    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => screen),
    );
  }

  Widget _getScreenForTabId(String tabId) {
    switch (tabId) {
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
      default:
        // For tabs that might be moved from bottom nav (autopilot, messages, etc.)
        return TabRegistry.getScreenForTabId(tabId, widget.themeNotifier);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('more.title'.tr()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: _menuTabIds.map(_buildMenuItemForTabId).toList(),
        ),
      ),
    );
  }
}