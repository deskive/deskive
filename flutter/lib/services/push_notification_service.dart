import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../models/notification.dart';
// Removed notification_api_service.dart - switching to Firebase FCM + Fluxez SDK
// import 'notification_api_service.dart';

class PushNotificationService {
  static PushNotificationService? _instance;
  static PushNotificationService get instance => _instance ??= PushNotificationService._();

  PushNotificationService._();

  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  // Removed AppAtOnce API service - was never used in this file
  // final NotificationApiService _apiService = NotificationApiService.instance;

  bool _initialized = false;

  // Notification channels for Android
  static const String _defaultChannelId = 'default_notifications';
  static const String _highPriorityChannelId = 'high_priority_notifications';
  static const String _taskChannelId = 'task_notifications';
  static const String _chatChannelId = 'chat_notifications';
  static const String _calendarChannelId = 'calendar_notifications';

  bool get isInitialized => _initialized;

  Future<void> initialize() async {
    if (_initialized) return;

    try {

      await _initializeLocalNotifications();
      await _setupNotificationChannels();
      await _requestPermissions();

      _initialized = true;
    } catch (e) {
      // Don't rethrow - allow app to continue without notifications
    }
  }

  Future<void> _initializeLocalNotifications() async {

    // Android settings
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');

    // iOS settings
    const iosSettings = DarwinInitializationSettings(
      requestSoundPermission: false,
      requestBadgePermission: false,
      requestAlertPermission: false,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

  }

  Future<void> _setupNotificationChannels() async {
    if (Platform.isAndroid) {

      final androidPlugin = _localNotifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

      if (androidPlugin != null) {
        // Default channel
        await androidPlugin.createNotificationChannel(
          const AndroidNotificationChannel(
            _defaultChannelId,
            'General Notifications',
            description: 'General app notifications',
            importance: Importance.defaultImportance,
            playSound: true,
          ),
        );

        // High priority channel
        await androidPlugin.createNotificationChannel(
          const AndroidNotificationChannel(
            _highPriorityChannelId,
            'High Priority Notifications',
            description: 'Important notifications that require immediate attention',
            importance: Importance.max,
            playSound: true,
            enableVibration: true,
          ),
        );

        // Task notifications channel
        await androidPlugin.createNotificationChannel(
          const AndroidNotificationChannel(
            _taskChannelId,
            'Task Notifications',
            description: 'Task-related notifications',
            importance: Importance.high,
            playSound: true,
          ),
        );

        // Chat notifications channel
        await androidPlugin.createNotificationChannel(
          const AndroidNotificationChannel(
            _chatChannelId,
            'Chat Notifications',
            description: 'Chat and messaging notifications',
            importance: Importance.high,
            playSound: true,
            enableVibration: true,
          ),
        );

        // Calendar notifications channel
        await androidPlugin.createNotificationChannel(
          const AndroidNotificationChannel(
            _calendarChannelId,
            'Calendar Notifications',
            description: 'Calendar and event notifications',
            importance: Importance.high,
            playSound: true,
          ),
        );

      }
    }
  }

  Future<void> _requestPermissions() async {

    if (Platform.isIOS || Platform.isMacOS) {
      final settings = await _localNotifications
          .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          );

      if (settings ?? false) {
      } else {
      }
    } else if (Platform.isAndroid) {
      final androidPlugin = _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();

      final granted = await androidPlugin?.requestNotificationsPermission();

      if (granted ?? false) {
      } else {
      }
    }
  }

  void _onNotificationTapped(NotificationResponse response) {

    if (response.payload != null) {
      try {
        final data = jsonDecode(response.payload!);
        _handleNotificationAction(data);
      } catch (e) {
      }
    }
  }

  void _handleNotificationAction(Map<String, dynamic> data) {
    // TODO: Implement navigation based on notification type
  }

  Future<void> showLocalNotification({
    required String title,
    required String body,
    Map<String, dynamic>? data,
    String? channelId,
    NotificationPriority priority = NotificationPriority.defaultPriority,
  }) async {
    try {
      final id = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      final selectedChannelId = channelId ?? _defaultChannelId;

      final androidDetails = AndroidNotificationDetails(
        selectedChannelId,
        _getChannelName(selectedChannelId),
        channelDescription: _getChannelDescription(selectedChannelId),
        importance: _getImportance(priority),
        priority: _getPriority(priority),
        playSound: true,
        enableVibration: priority == NotificationPriority.high || priority == NotificationPriority.max,
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      final details = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      await _localNotifications.show(
        id,
        title,
        body,
        details,
        payload: data != null ? jsonEncode(data) : null,
      );

    } catch (e) {
    }
  }

  String _getChannelName(String channelId) {
    switch (channelId) {
      case _taskChannelId:
        return 'Task Notifications';
      case _chatChannelId:
        return 'Chat Notifications';
      case _calendarChannelId:
        return 'Calendar Notifications';
      case _highPriorityChannelId:
        return 'High Priority Notifications';
      default:
        return 'General Notifications';
    }
  }

  String _getChannelDescription(String channelId) {
    switch (channelId) {
      case _taskChannelId:
        return 'Task-related notifications';
      case _chatChannelId:
        return 'Chat and messaging notifications';
      case _calendarChannelId:
        return 'Calendar and event notifications';
      case _highPriorityChannelId:
        return 'Important notifications that require immediate attention';
      default:
        return 'General app notifications';
    }
  }

  Importance _getImportance(NotificationPriority priority) {
    switch (priority) {
      case NotificationPriority.min:
        return Importance.min;
      case NotificationPriority.low:
        return Importance.low;
      case NotificationPriority.high:
        return Importance.high;
      case NotificationPriority.max:
        return Importance.max;
      default:
        return Importance.defaultImportance;
    }
  }

  Priority _getPriority(NotificationPriority priority) {
    switch (priority) {
      case NotificationPriority.min:
        return Priority.min;
      case NotificationPriority.low:
        return Priority.low;
      case NotificationPriority.high:
        return Priority.high;
      case NotificationPriority.max:
        return Priority.max;
      default:
        return Priority.defaultPriority;
    }
  }

  Future<void> cancelNotification(int id) async {
    await _localNotifications.cancel(id);
  }

  Future<void> cancelAllNotifications() async {
    await _localNotifications.cancelAll();
  }
}

enum NotificationPriority {
  min,
  low,
  defaultPriority,
  high,
  max,
}
