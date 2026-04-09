import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:async';

/// Service to track app lifecycle state (foreground/background)
/// Persists state to SharedPreferences for background isolate access
class AppStateService with WidgetsBindingObserver {
  static final AppStateService _instance = AppStateService._internal();
  factory AppStateService() => _instance;
  AppStateService._internal();

  // SharedPreferences keys
  static const String _foregroundKey = 'app_is_foreground';
  static const String _foregroundTimestampKey = 'app_foreground_timestamp';

  // Stream controller for app state changes
  final _appStateController = StreamController<AppLifecycleState>.broadcast();
  Stream<AppLifecycleState> get appStateStream => _appStateController.stream;

  AppLifecycleState _currentState = AppLifecycleState.resumed;
  AppLifecycleState get currentState => _currentState;

  bool get isAppInForeground =>
      _currentState == AppLifecycleState.resumed ||
      _currentState == AppLifecycleState.inactive;

  bool get isAppInBackground =>
      _currentState == AppLifecycleState.paused ||
      _currentState == AppLifecycleState.detached;

  /// Initialize the service
  void initialize() {
    WidgetsBinding.instance.addObserver(this);
    _currentState = AppLifecycleState.resumed;
    _persistForegroundState(true);
  }

  /// Dispose the service
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _appStateController.close();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _currentState = state;
    _appStateController.add(state);

    // Persist state to SharedPreferences for background isolate access
    _persistForegroundState(isAppInForeground);

  }

  /// Persist foreground state to SharedPreferences
  Future<void> _persistForegroundState(bool isForeground) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_foregroundKey, isForeground);
      await prefs.setInt(_foregroundTimestampKey, DateTime.now().millisecondsSinceEpoch);
    } catch (e) {
    }
  }

  /// Check if app is in foreground (can be called from background isolate)
  /// Returns true if app was in foreground within the last 2 seconds
  static Future<bool> isAppInForegroundAsync() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final isForeground = prefs.getBool(_foregroundKey) ?? false;
      final timestamp = prefs.getInt(_foregroundTimestampKey) ?? 0;
      final now = DateTime.now().millisecondsSinceEpoch;

      // Consider foreground state valid only if updated within last 2 seconds
      // This handles edge cases where app state changes during notification processing
      final isRecent = (now - timestamp) < 2000;

      return isForeground && isRecent;
    } catch (e) {
      return false;
    }
  }

  /// Get a readable state description
  String getStateDescription() {
    switch (_currentState) {
      case AppLifecycleState.resumed:
        return 'App is active and visible';
      case AppLifecycleState.inactive:
        return 'App is inactive (e.g., phone call, notification shade)';
      case AppLifecycleState.paused:
        return 'App is in background';
      case AppLifecycleState.detached:
        return 'App is detached from engine';
      default:
        return 'Unknown state';
    }
  }
}
