import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/tab_config.dart';
import '../config/tab_registry.dart';
import 'auth_service.dart';

/// Service for managing tab configuration persistence with backend sync
class TabConfigurationService {
  static const String _storageKey = 'user_tab_configuration';

  // Singleton pattern
  static final TabConfigurationService _instance = TabConfigurationService._internal();
  factory TabConfigurationService() => _instance;
  TabConfigurationService._internal();

  // In-memory cache
  TabConfiguration? _cachedConfig;

  // Stream for reactive updates
  final _configController = StreamController<TabConfiguration>.broadcast();

  /// Stream of configuration changes
  Stream<TabConfiguration> get configStream => _configController.stream;

  /// Current configuration (cached or default)
  TabConfiguration get currentConfig => _cachedConfig ?? TabConfiguration.defaultConfig();

  /// Load configuration from backend, falling back to SharedPreferences
  Future<TabConfiguration> loadConfiguration() async {
    if (_cachedConfig != null) {
      return _cachedConfig!;
    }

    // Try to load from backend first
    try {
      final config = await _loadFromBackend();
      if (config != null) {
        _cachedConfig = config;
        // Also save to local storage as cache
        await _saveToPrefs(config);
        return config;
      }
    } catch (e) {
      debugPrint('TabConfigurationService: Failed to load from backend: $e');
    }

    // Fall back to SharedPreferences
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonString = prefs.getString(_storageKey);

      if (jsonString != null && jsonString.isNotEmpty) {
        final config = TabConfiguration.fromJsonString(jsonString);

        // Validate the loaded configuration
        if (TabRegistry.isValidConfiguration(config)) {
          // Check for any missing tabs (new tabs added in app update)
          final missingIds = TabRegistry.getMissingTabIds(config);
          if (missingIds.isNotEmpty) {
            // Add missing tabs to more menu
            final updatedConfig = config.copyWith(
              moreMenuTabIds: [...config.moreMenuTabIds, ...missingIds],
              lastModified: DateTime.now(),
            );
            _cachedConfig = updatedConfig;
            await _saveToPrefs(updatedConfig);
            // Also sync to backend
            _syncToBackend(updatedConfig);
            return updatedConfig;
          }

          _cachedConfig = config;
          return config;
        } else {
          // Invalid config, reset to default
          debugPrint('TabConfigurationService: Invalid config found, resetting to default');
          return await resetToDefault();
        }
      }
    } catch (e) {
      debugPrint('TabConfigurationService: Error loading config from prefs: $e');
    }

    // Return default if nothing stored or error occurred
    _cachedConfig = TabConfiguration.defaultConfig();
    return _cachedConfig!;
  }

  /// Load configuration from backend API
  Future<TabConfiguration?> _loadFromBackend() async {
    try {
      final authService = AuthService.instance;
      if (!authService.isAuthenticated) {
        debugPrint('TabConfigurationService: Not authenticated, skipping backend load');
        return null;
      }

      debugPrint('TabConfigurationService: Fetching tab arrangement from backend...');
      final response = await authService.dio.get('/settings/tab-arrangement');

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;

        // Handle both wrapped and unwrapped responses
        final tabData = data['data'] ?? data;

        if (tabData['bottomNavTabIds'] != null && tabData['moreMenuTabIds'] != null) {
          final config = TabConfiguration(
            bottomNavTabIds: List<String>.from(tabData['bottomNavTabIds']),
            moreMenuTabIds: List<String>.from(tabData['moreMenuTabIds']),
            lastModified: tabData['lastModified'] != null
                ? DateTime.tryParse(tabData['lastModified'])
                : null,
          );

          // Validate the loaded configuration
          if (TabRegistry.isValidConfiguration(config)) {
            debugPrint('TabConfigurationService: Successfully loaded config from backend - bottomNav: ${config.bottomNavTabIds}');
            // Check for any missing tabs (new tabs added in app update)
            final missingIds = TabRegistry.getMissingTabIds(config);
            if (missingIds.isNotEmpty) {
              return config.copyWith(
                moreMenuTabIds: [...config.moreMenuTabIds, ...missingIds],
                lastModified: DateTime.now(),
              );
            }
            return config;
          } else {
            debugPrint('TabConfigurationService: Config from backend is invalid');
          }
        } else {
          debugPrint('TabConfigurationService: Backend response missing required fields');
        }
      } else {
        debugPrint('TabConfigurationService: Backend returned status ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('TabConfigurationService: Error loading from backend: $e');
    }
    return null;
  }

  /// Save configuration to backend API (fire and forget)
  Future<void> _syncToBackend(TabConfiguration config) async {
    try {
      final authService = AuthService.instance;
      if (!authService.isAuthenticated) {
        debugPrint('TabConfigurationService: Not authenticated, skipping backend sync');
        return;
      }

      await authService.dio.put('/settings/tab-arrangement', data: {
        'bottomNavTabIds': config.bottomNavTabIds,
        'moreMenuTabIds': config.moreMenuTabIds,
      });

      debugPrint('TabConfigurationService: Synced to backend successfully');
    } catch (e) {
      debugPrint('TabConfigurationService: Failed to sync to backend: $e');
      // Don't throw - backend sync is best-effort
    }
  }

  /// Save configuration to SharedPreferences and backend
  Future<void> saveConfiguration(TabConfiguration config) async {
    // Validate before saving
    if (!TabRegistry.isValidConfiguration(config)) {
      throw ArgumentError('Invalid tab configuration');
    }

    // Ensure home tab is in bottom nav
    if (!config.bottomNavTabIds.contains('home')) {
      throw ArgumentError('Home tab must be in bottom navigation');
    }

    // Ensure max tabs limit
    if (config.bottomNavTabIds.length > TabRegistry.maxBottomNavTabs) {
      throw ArgumentError('Cannot have more than ${TabRegistry.maxBottomNavTabs} tabs in bottom navigation');
    }

    // Save to local storage
    await _saveToPrefs(config);
    _cachedConfig = config;
    _configController.add(config);

    // Sync to backend (fire and forget)
    _syncToBackend(config);
  }

  Future<void> _saveToPrefs(TabConfiguration config) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, config.toJsonString());
  }

  /// Reset configuration to default
  Future<TabConfiguration> resetToDefault() async {
    final defaultConfig = TabConfiguration.defaultConfig();
    await _saveToPrefs(defaultConfig);
    _cachedConfig = defaultConfig;
    _configController.add(defaultConfig);

    // Sync to backend
    _syncToBackend(defaultConfig);

    return defaultConfig;
  }

  /// Move a tab from More menu to bottom nav
  Future<TabConfiguration> moveToBottomNav(String tabId) async {
    final config = await loadConfiguration();

    // Check if already in bottom nav
    if (config.bottomNavTabIds.contains(tabId)) {
      return config;
    }

    // Check if bottom nav is full
    if (config.bottomNavTabIds.length >= TabRegistry.maxBottomNavTabs) {
      throw StateError('Bottom navigation is full (max ${TabRegistry.maxBottomNavTabs} tabs)');
    }

    // Check if tab is in more menu
    if (!config.moreMenuTabIds.contains(tabId)) {
      throw ArgumentError('Tab $tabId is not in more menu');
    }

    final newBottomNav = [...config.bottomNavTabIds, tabId];
    final newMoreMenu = config.moreMenuTabIds.where((id) => id != tabId).toList();

    final newConfig = TabConfiguration(
      bottomNavTabIds: newBottomNav,
      moreMenuTabIds: newMoreMenu,
      lastModified: DateTime.now(),
    );

    await saveConfiguration(newConfig);
    return newConfig;
  }

  /// Move a tab from bottom nav to More menu
  Future<TabConfiguration> moveToMoreMenu(String tabId) async {
    final config = await loadConfiguration();

    // Check if tab can be removed
    final tab = TabRegistry.getTabById(tabId);
    if (tab != null && !tab.isRemovable) {
      throw ArgumentError('Tab $tabId cannot be removed from bottom navigation');
    }

    // Check if tab is in bottom nav
    if (!config.bottomNavTabIds.contains(tabId)) {
      return config;
    }

    final newBottomNav = config.bottomNavTabIds.where((id) => id != tabId).toList();
    final newMoreMenu = [tabId, ...config.moreMenuTabIds];

    final newConfig = TabConfiguration(
      bottomNavTabIds: newBottomNav,
      moreMenuTabIds: newMoreMenu,
      lastModified: DateTime.now(),
    );

    await saveConfiguration(newConfig);
    return newConfig;
  }

  /// Reorder tabs in bottom nav
  Future<TabConfiguration> reorderBottomNav(int oldIndex, int newIndex) async {
    final config = await loadConfiguration();

    if (oldIndex < 0 || oldIndex >= config.bottomNavTabIds.length) {
      throw RangeError('Invalid oldIndex: $oldIndex');
    }
    if (newIndex < 0 || newIndex > config.bottomNavTabIds.length) {
      throw RangeError('Invalid newIndex: $newIndex');
    }

    final tabs = List<String>.from(config.bottomNavTabIds);
    final item = tabs.removeAt(oldIndex);
    final adjustedNewIndex = newIndex > oldIndex ? newIndex - 1 : newIndex;
    tabs.insert(adjustedNewIndex, item);

    final newConfig = config.copyWith(
      bottomNavTabIds: tabs,
      lastModified: DateTime.now(),
    );

    await saveConfiguration(newConfig);
    return newConfig;
  }

  /// Reorder tabs in more menu
  Future<TabConfiguration> reorderMoreMenu(int oldIndex, int newIndex) async {
    final config = await loadConfiguration();

    if (oldIndex < 0 || oldIndex >= config.moreMenuTabIds.length) {
      throw RangeError('Invalid oldIndex: $oldIndex');
    }
    if (newIndex < 0 || newIndex > config.moreMenuTabIds.length) {
      throw RangeError('Invalid newIndex: $newIndex');
    }

    final tabs = List<String>.from(config.moreMenuTabIds);
    final item = tabs.removeAt(oldIndex);
    final adjustedNewIndex = newIndex > oldIndex ? newIndex - 1 : newIndex;
    tabs.insert(adjustedNewIndex, item);

    final newConfig = config.copyWith(
      moreMenuTabIds: tabs,
      lastModified: DateTime.now(),
    );

    await saveConfiguration(newConfig);
    return newConfig;
  }

  /// Force refresh from backend (useful after login)
  Future<TabConfiguration> refreshFromBackend() async {
    debugPrint('TabConfigurationService: refreshFromBackend called - clearing cache and fetching from backend');
    _cachedConfig = null;

    try {
      final config = await _loadFromBackend();
      if (config != null) {
        debugPrint('TabConfigurationService: refreshFromBackend succeeded - applying config');
        _cachedConfig = config;
        await _saveToPrefs(config);
        _configController.add(config);
        return config;
      } else {
        debugPrint('TabConfigurationService: refreshFromBackend - backend returned null, falling back to loadConfiguration');
      }
    } catch (e) {
      debugPrint('TabConfigurationService: Failed to refresh from backend: $e');
    }

    return await loadConfiguration();
  }

  /// Clear cache (useful for testing or logout)
  void clearCache() {
    _cachedConfig = null;
  }

  /// Dispose resources
  void dispose() {
    _configController.close();
  }
}
