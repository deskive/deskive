import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../models/notification.dart';
import '../api/services/notification_api_service.dart' as api;
import './socket_io_chat_service.dart';
import './app_state_service.dart';
import '../widgets/floating_notification_widget.dart';
import '../main.dart' show navigatorKey;

class NotificationService {
  static NotificationService? _instance;
  static NotificationService get instance => _instance ??= NotificationService._();

  NotificationService._();

  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  final api.NotificationApiService _apiService = api.NotificationApiService();
  
  // Stream controllers for real-time notification updates
  final StreamController<NotificationModel> _notificationStreamController = 
      StreamController<NotificationModel>.broadcast();
  final StreamController<List<NotificationModel>> _notificationsListStreamController = 
      StreamController<List<NotificationModel>>.broadcast();
  final StreamController<int> _unreadCountStreamController = 
      StreamController<int>.broadcast();
  
  // Cached data
  List<NotificationModel> _notifications = [];
  NotificationPreferences _preferences = NotificationPreferences();
  int _unreadCount = 0;
  bool _initialized = false;
  // AppAtOnceSubscription? _notificationSubscription; // Commented out - not available in SDK yet
  StreamSubscription<Map<String, dynamic>>? _socketNotificationSubscription;

  // Stream getters
  Stream<NotificationModel> get notificationStream => _notificationStreamController.stream;
  Stream<List<NotificationModel>> get notificationsListStream => _notificationsListStreamController.stream;
  Stream<int> get unreadCountStream => _unreadCountStreamController.stream;

  // Getters
  List<NotificationModel> get notifications => List.unmodifiable(_notifications);
  NotificationPreferences get preferences => _preferences;
  int get unreadCount => _unreadCount;
  bool get isInitialized => _initialized;

  // ============================================================================
  // MAPPING FUNCTIONS: Convert API models to local models
  // ============================================================================

  /// Convert API NotificationModel to local NotificationModel
  NotificationModel _mapApiToLocalNotification(api.NotificationModel apiNotification) {
    // Map category from API type field
    NotificationCategory category = _mapCategoryFromString(apiNotification.category ?? apiNotification.type);

    // Map priority
    NotificationPriority priority = _mapPriorityFromString(apiNotification.priority);

    // Determine status based on read state
    NotificationStatus status;
    if (apiNotification.metadata != null && apiNotification.metadata!['is_archived'] == true) {
      status = NotificationStatus.archived;
    } else if (apiNotification.isRead) {
      status = NotificationStatus.read;
    } else {
      status = NotificationStatus.unread;
    }

    // Build additionalData by merging metadata with top-level navigation fields
    Map<String, dynamic>? additionalData;
    if (apiNotification.metadata != null || apiNotification.actionUrl != null) {
      additionalData = <String, dynamic>{
        ...?apiNotification.metadata,
        if (apiNotification.actionUrl != null) 'action_url': apiNotification.actionUrl,
      };
    }

    return NotificationModel(
      id: apiNotification.id,
      title: apiNotification.title,
      body: apiNotification.body,
      category: category,
      priority: priority,
      status: status,
      imageUrl: apiNotification.imageUrl,
      createdAt: apiNotification.createdAt,
      readAt: apiNotification.readAt,
      archivedAt: status == NotificationStatus.archived ? apiNotification.updatedAt : null,
      metadata: additionalData != null
          ? NotificationMetadata(
              entityId: apiNotification.metadata?['entity_id'],
              entityType: apiNotification.metadata?['entity_type'],
              workspaceId: apiNotification.metadata?['workspace_id'],
              projectId: apiNotification.metadata?['project_id'],
              channelId: apiNotification.metadata?['channel_id'],
              userId: apiNotification.metadata?['user_id'],
              additionalData: additionalData,
            )
          : null,
      isPersistent: apiNotification.persistent,
    );
  }

  /// Map string to NotificationCategory enum
  NotificationCategory _mapCategoryFromString(String? categoryStr) {
    if (categoryStr == null) return NotificationCategory.other;

    switch (categoryStr.toLowerCase()) {
      case 'task':
      case 'tasks':
        return NotificationCategory.task;
      case 'project':
      case 'projects':
        return NotificationCategory.project;
      case 'calendar':
      case 'event':
        return NotificationCategory.calendar;
      case 'chat':
      case 'message':
        return NotificationCategory.chat;
      case 'file':
      case 'files':
        return NotificationCategory.file;
      case 'workspace':
        return NotificationCategory.workspace;
      case 'system':
        return NotificationCategory.system;
      case 'reminder':
        return NotificationCategory.reminder;
      case 'mention':
        return NotificationCategory.mention;
      default:
        return NotificationCategory.other;
    }
  }

  /// Map string to NotificationPriority enum
  NotificationPriority _mapPriorityFromString(String priorityStr) {
    switch (priorityStr.toLowerCase()) {
      case 'lowest':
        return NotificationPriority.lowest;
      case 'low':
        return NotificationPriority.low;
      case 'medium':
        return NotificationPriority.medium;
      case 'high':
        return NotificationPriority.high;
      case 'highest':
        return NotificationPriority.highest;
      default:
        return NotificationPriority.medium;
    }
  }

  Future<void> initialize() async {
    if (_initialized) return;

    try {

      // Initialize local notifications
      await _initializeLocalNotifications();

      // Subscribe to Socket.IO notification events
      _setupSocketIOSubscription();

      // Load initial notifications from API
      try {
        await getNotifications(forceRefresh: true, limit: 50);
      } catch (e) {
        // Continue initialization even if API call fails
      }

      _initialized = true;

    } catch (e) {
      rethrow;
    }
  }

  Future<void> _initializeLocalNotifications() async {

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestSoundPermission: true,
      requestBadgePermission: true,
      requestAlertPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Request permissions
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      await _localNotifications
          .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          );
    } else if (defaultTargetPlatform == TargetPlatform.android) {
      final androidImplementation = _localNotifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      await androidImplementation?.requestNotificationsPermission();
    }

  }

  /// Subscribe to Socket.IO notification events for real-time in-app notifications
  void _setupSocketIOSubscription() {
    try {

      // Subscribe to Socket.IO notification stream
      _socketNotificationSubscription = SocketIOChatService.instance.notificationStream.listen(
        (notificationData) {
          _handleSocketIONotification(notificationData);
        },
        onError: (error) {
        },
        cancelOnError: false,
      );

    } catch (e) {
      // Don't throw - app should continue working even without Socket.IO
    }
  }

  /// Handle notification received from Socket.IO
  void _handleSocketIONotification(Map<String, dynamic> notificationData) {
    try {

      // Backend sends: { type, data, userId, timestamp }
      // where type = 'notification' | 'notification_read' | 'notification_deleted' | 'preferences_updated'
      final eventType = notificationData['type'] as String?;
      final eventData = notificationData['data'] as Map<String, dynamic>?;

      if (eventType == null || eventData == null) {
        return;
      }


      switch (eventType) {
        case 'notification':
          // New notification created
          _handleNewSocketNotification(eventData);
          break;

        case 'notification_read':
          // Notification marked as read
          _handleNotificationReadEvent(eventData);
          break;

        case 'notification_deleted':
          // Notification deleted
          _handleNotificationDeletedEvent(eventData);
          break;

        case 'preferences_updated':
          // User preferences updated
          _handlePreferencesUpdatedEvent(eventData);
          break;

        default:
      }

    } catch (e) {
    }
  }

  /// Handle new notification from socket
  void _handleNewSocketNotification(Map<String, dynamic> eventData) {
    try {

      // Convert to API model format
      final apiNotification = api.NotificationModel.fromJson(eventData);

      // Convert API model to local model
      final notification = _mapApiToLocalNotification(apiNotification);


      // Handle the new notification (adds to cache, updates count, shows notification if enabled)
      // Mark as fromSocket = true so it won't show duplicate notification in background
      _handleNewNotification(notification, fromSocket: true);
    } catch (e) {
    }
  }

  /// Handle notification read event from socket
  void _handleNotificationReadEvent(Map<String, dynamic> eventData) {
    try {

      final notificationId = eventData['id'] as String?;
      final isRead = eventData['is_read'] as bool? ?? true;
      final readAt = eventData['read_at'] as String?;

      if (notificationId == null) {
        return;
      }

      // Update local notification
      final index = _notifications.indexWhere((n) => n.id == notificationId);
      if (index != -1) {
        final notification = _notifications[index];
        final updatedNotification = notification.copyWith(
          status: isRead ? NotificationStatus.read : NotificationStatus.unread,
          readAt: readAt != null ? DateTime.parse(readAt) : null,
        );

        _handleUpdatedNotification(updatedNotification);
      } else {
      }
    } catch (e) {
    }
  }

  /// Handle notification deleted event from socket
  void _handleNotificationDeletedEvent(Map<String, dynamic> eventData) {
    try {

      final notificationId = eventData['id'] as String?;

      if (notificationId == null) {
        return;
      }

      _handleDeletedNotification(notificationId);
    } catch (e) {
    }
  }

  /// Handle preferences updated event from socket
  void _handlePreferencesUpdatedEvent(Map<String, dynamic> eventData) {
    try {

      // TODO: Update local preferences if needed
      // This would require implementing NotificationPreferences.fromJson()
    } catch (e) {
    }
  }

  // Firebase messaging removed - using local notifications only

  Future<void> _setupAppAtOnceSubscriptions() async {
    try {

      // TODO: Implement when AppAtOnce SDK supports subscriptions
      // final workspaceId = await AppConfig.getCurrentWorkspaceId() ?? await AppConfig.getCurrentWorkspaceId();
      // final userId = await AppConfig.getCurrentUserId() ?? await AppConfig.getCurrentUserId();

      // Subscribe to notification events
      // final subscriptionQuery = SubscriptionQuery(
      //   table: 'notifications',
      //   filters: {
      //     'workspace_id': workspaceId,
      //     'user_id': userId,
      //   },
      //   events: ['INSERT', 'UPDATE', 'DELETE'],
      // );

      // _notificationSubscription = await _appAtOnceService._client.subscriptions.subscribe(
      //   subscriptionQuery,
      //   onData: _handleAppAtOnceNotification,
      // );

    } catch (e) {
      // Don't throw, as the app should still work without real-time updates
    }
  }

  void _handleAppAtOnceNotification(Map<String, dynamic> data) {
    try {

      final eventType = data['eventType'];
      final record = data['new'] ?? data['old'];

      if (record == null) return;

      final notification = NotificationModel.fromMap(record);

      switch (eventType) {
        case 'INSERT':
          _handleNewNotification(notification);
          break;
        case 'UPDATE':
          _handleUpdatedNotification(notification);
          break;
        case 'DELETE':
          _handleDeletedNotification(notification.id);
          break;
      }
    } catch (e) {
    }
  }

  void _handleNewNotification(NotificationModel notification, {bool fromSocket = false}) {

    // Add to local cache
    _notifications.insert(0, notification);

    // Update unread count
    if (!notification.isRead) {
      _unreadCount++;
      _unreadCountStreamController.add(_unreadCount);
    }

    // Emit to streams
    _notificationStreamController.add(notification);
    _notificationsListStreamController.add(_notifications);

    // Show notification UI if enabled
    if (_preferences.enableInAppNotifications && _shouldShowNotification(notification)) {
      final appStateService = AppStateService();

      if (appStateService.isAppInForeground) {
        // ✅ FOREGROUND: Show floating notification (from socket or API)
        _showFloatingNotification(notification);
      } else if (!fromSocket) {
        // 📲 BACKGROUND: Only show system notification if NOT from socket
        // (FCM already handles socket notifications in background)
        _showLocalNotification(notification);
      } else {
        // ⏭️ BACKGROUND + SOCKET: Skip notification UI (FCM already showed it)
      }
    }
  }

  void _handleUpdatedNotification(NotificationModel notification) {

    final index = _notifications.indexWhere((n) => n.id == notification.id);
    if (index != -1) {
      final oldNotification = _notifications[index];
      _notifications[index] = notification;

      // Update unread count if status changed
      if (oldNotification.isRead != notification.isRead) {
        if (notification.isRead) {
          _unreadCount--;
        } else {
          _unreadCount++;
        }
        _unreadCountStreamController.add(_unreadCount);
      }

      _notificationsListStreamController.add(_notifications);
    }
  }

  void _handleDeletedNotification(String notificationId) {

    final index = _notifications.indexWhere((n) => n.id == notificationId);
    if (index != -1) {
      final notification = _notifications[index];
      _notifications.removeAt(index);

      if (!notification.isRead) {
        _unreadCount--;
        _unreadCountStreamController.add(_unreadCount);
      }

      _notificationsListStreamController.add(_notifications);
    }
  }

  bool _shouldShowNotification(NotificationModel notification) {
    // Check if notifications are enabled
    if (!_preferences.enableInAppNotifications) return false;

    // Check category preferences
    if (!_preferences.isCategoryEnabled(notification.category)) return false;

    // Check priority preferences
    if (!_preferences.isPriorityEnabled(notification.priority)) return false;

    // Check muted entities
    if (notification.metadata != null) {
      final metadata = notification.metadata!;
      if (metadata.workspaceId != null && _preferences.isWorkspaceMuted(metadata.workspaceId!)) {
        return false;
      }
      if (metadata.channelId != null && _preferences.isChannelMuted(metadata.channelId!)) {
        return false;
      }
      if (notification.senderId != null && _preferences.isUserMuted(notification.senderId!)) {
        return false;
      }
    }

    // Check Do Not Disturb
    if (_preferences.isInDoNotDisturbWindow()) return false;

    return true;
  }

  /// Show floating in-app notification (only when app is in foreground)
  void _showFloatingNotification(NotificationModel notification) {
    try {

      final navigatorState = navigatorKey.currentState;
      if (navigatorState == null) {
        return;
      }

      FloatingNotificationManager().showWithNavigator(
        navigatorState,
        title: notification.title,
        message: notification.body,
        avatarUrl: notification.senderAvatar ?? notification.avatarUrl,
        onTap: () {
          _handleNotificationTap(notification);
        },
        duration: const Duration(seconds: 4),
      );

    } catch (e) {
    }
  }

  Future<void> _showLocalNotification(NotificationModel notification) async {
    try {
      const androidDetails = AndroidNotificationDetails(
        'notifications',
        'Notifications',
        channelDescription: 'App notifications',
        importance: Importance.high,
        priority: Priority.high,
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      const notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      await _localNotifications.show(
        notification.id.hashCode,
        notification.title,
        notification.body,
        notificationDetails,
        payload: json.encode(notification.toMap()),
      );
    } catch (e) {
    }
  }

  void _onNotificationTapped(NotificationResponse response) {
    try {
      if (response.payload != null) {
        final notificationData = json.decode(response.payload!);
        final notification = NotificationModel.fromMap(notificationData);
        
        // Mark as read
        markAsRead(notification.id);
        
        // Handle notification tap logic here
        _handleNotificationTap(notification);
      }
    } catch (e) {
    }
  }

  void _handleNotificationTap(NotificationModel notification) {
    // This can be extended to navigate to specific screens based on notification type
  }

  // Firebase messaging handlers removed - using local notifications only

  // Removed AppAtOnce API call - will implement with backend API later
  // Future<void> _loadPreferences() async {
  //   try {
  //     final userId = await AppConfig.getCurrentUserId() ?? await AppConfig.getCurrentUserId();
  //     _preferences = await _apiService.getNotificationPreferences(userId: userId);
  //   } catch (e) {
  //     _preferences = NotificationPreferences();
  //   }
  // }

  // Removed AppAtOnce API call - will implement with backend API later
  // Future<void> _loadInitialNotifications() async {
  //   try {
  //     final workspaceId = await AppConfig.getCurrentWorkspaceId() ?? await AppConfig.getCurrentWorkspaceId();
  //     final userId = await AppConfig.getCurrentUserId() ?? await AppConfig.getCurrentUserId();
  //
  //     _notifications = await _apiService.getNotifications(
  //       workspaceId: workspaceId,
  //       userId: userId,
  //       limit: 50,
  //       sortBy: 'created_at',
  //       sortOrder: 'desc',
  //     );
  //
  //     _unreadCount = _notifications.where((n) => !n.isRead).length;
  //
  //     _notificationsListStreamController.add(_notifications);
  //     _unreadCountStreamController.add(_unreadCount);
  //
  //   } catch (e) {
  //   }
  // }

  // Public methods

  Future<List<NotificationModel>> getNotifications({
    List<NotificationCategory>? categories,
    List<NotificationStatus>? statuses,
    int? limit,
    int? offset,
    bool forceRefresh = false,
  }) async {
    if (forceRefresh || _notifications.isEmpty) {
      try {
        // Build query based on status
        bool? isRead;
        bool? isArchived = false; // Default: exclude archived notifications

        if (statuses != null && statuses.isNotEmpty) {
          // If only archived, set is_archived=true
          if (statuses.contains(NotificationStatus.archived)) {
            isArchived = true;
          }
          // If only read (and not archived), set is_read=true and is_archived=false
          else if (statuses.contains(NotificationStatus.read)) {
            isRead = true;
            isArchived = false;
          }
          // If only unread, set is_read=false and is_archived=false
          else if (statuses.contains(NotificationStatus.unread)) {
            isRead = false;
            isArchived = false;
          }
        }

        final query = api.NotificationQueryDto(
          isRead: isRead,
          isArchived: isArchived,
          limit: limit ?? 100,
          offset: offset,
        );

        final response = await _apiService.getNotifications(query);

        if (response.isSuccess && response.data != null) {
          _notifications = response.data!.data
              .map((apiNotification) => _mapApiToLocalNotification(apiNotification))
              .toList();

          // Update unread count
          _unreadCount = _notifications.where((n) => !n.isRead).length;
          _unreadCountStreamController.add(_unreadCount);
          _notificationsListStreamController.add(_notifications);

        }
      } catch (e) {
        // Continue with cached data
      }
    }

    var filteredNotifications = _notifications;

    if (categories != null && categories.isNotEmpty) {
      filteredNotifications = filteredNotifications
          .where((n) => categories.contains(n.category))
          .toList();
    }

    if (statuses != null && statuses.isNotEmpty) {
      filteredNotifications = filteredNotifications
          .where((n) => statuses.contains(n.status))
          .toList();
    }

    if (offset != null && !forceRefresh) {
      filteredNotifications = filteredNotifications.skip(offset).toList();
    }

    if (limit != null && !forceRefresh) {
      filteredNotifications = filteredNotifications.take(limit).toList();
    }

    return filteredNotifications;
  }

  Future<NotificationModel> markAsRead(String notificationId) async {
    try {
      final response = await _apiService.markAsRead(notificationId);

      if (response.isSuccess && response.data != null) {
        final updatedNotification = _mapApiToLocalNotification(response.data!);
        _handleUpdatedNotification(updatedNotification);
        return updatedNotification;
      } else {
        throw Exception(response.message ?? 'Failed to mark notification as read');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<NotificationModel> markAsUnread(String notificationId) async {
    try {
      final response = await _apiService.markAsUnread(notificationId);

      if (response.isSuccess && response.data != null) {
        final updatedNotification = _mapApiToLocalNotification(response.data!);
        _handleUpdatedNotification(updatedNotification);
        return updatedNotification;
      } else {
        throw Exception(response.message ?? 'Failed to mark notification as unread');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<NotificationModel> archiveNotification(String notificationId) async {
    // Note: Backend doesn't have a separate archive endpoint, so we'll update locally
    final index = _notifications.indexWhere((n) => n.id == notificationId);
    if (index != -1) {
      final notification = _notifications[index];
      final archivedNotification = notification.copyWith(
        status: NotificationStatus.archived,
        archivedAt: DateTime.now(),
      );

      _notifications[index] = archivedNotification;
      if (!notification.isRead) {
        _unreadCount--;
        _unreadCountStreamController.add(_unreadCount);
      }
      _notificationsListStreamController.add(_notifications);

      return archivedNotification;
    } else {
      throw Exception('Notification not found');
    }
  }

  Future<void> deleteNotification(String notificationId) async {
    try {
      final response = await _apiService.deleteNotification(notificationId);

      if (response.isSuccess) {
        _handleDeletedNotification(notificationId);
      } else {
        throw Exception(response.message ?? 'Failed to delete notification');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> markAllAsRead() async {
    try {
      final response = await _apiService.markAllAsRead();

      if (response.isSuccess) {
        // Reload notifications to get updated state
        await getNotifications(forceRefresh: true);
      } else {
        throw Exception(response.message ?? 'Failed to mark all as read');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Clear all notifications (calls api/v1/notifications/clear-all)
  Future<void> clearAllNotifications() async {
    try {
      final response = await _apiService.clearAllRead();

      if (response.isSuccess) {
        // Clear local state
        _notifications.clear();
        _unreadCount = 0;
        _unreadCountStreamController.add(_unreadCount);
        _notificationsListStreamController.add(_notifications);
      } else {
        throw Exception(response.message ?? 'Failed to clear all notifications');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<List<NotificationModel>> bulkUpdateStatus(
    List<String> notificationIds,
    NotificationStatus status,
  ) async {
    try {
      if (status == NotificationStatus.read) {
        // Use bulk mark as read endpoint
        final response = await _apiService.bulkMarkAsRead(
          api.BulkActionDto(notificationIds: notificationIds),
        );

        if (response.isSuccess) {
          // Reload to get updated state
          await getNotifications(forceRefresh: true);
          return _notifications.where((n) => notificationIds.contains(n.id)).toList();
        } else {
          throw Exception(response.message ?? 'Failed to bulk update status');
        }
      } else if (status == NotificationStatus.archived) {
        // Archive locally (no backend endpoint for bulk archive)
        final updatedNotifications = <NotificationModel>[];

        for (final id in notificationIds) {
          final index = _notifications.indexWhere((n) => n.id == id);
          if (index != -1) {
            final notification = _notifications[index];
            final archivedNotification = notification.copyWith(
              status: NotificationStatus.archived,
              archivedAt: DateTime.now(),
            );
            _notifications[index] = archivedNotification;
            updatedNotifications.add(archivedNotification);

            if (!notification.isRead) {
              _unreadCount--;
            }
          }
        }

        _unreadCountStreamController.add(_unreadCount);
        _notificationsListStreamController.add(_notifications);

        return updatedNotifications;
      } else {
        throw Exception('Unsupported bulk status update');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> bulkDelete(List<String> notificationIds) async {
    try {
      // Delete one by one (no bulk delete endpoint in backend yet)
      for (final id in notificationIds) {
        await _apiService.deleteNotification(id);
        _handleDeletedNotification(id);
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<NotificationPreferences> updatePreferences(NotificationPreferences newPreferences) async {
    // Store preferences locally
    _preferences = newPreferences;
    return _preferences;
  }

  Future<Map<String, int>> getNotificationCounts() async {
    // Calculate counts from cached notifications
    return {
      'total': _notifications.length,
      'unread': _unreadCount,
      'read': _notifications.where((n) => n.isRead && !n.isArchived).length,
      'archived': _notifications.where((n) => n.isArchived).length,
    };
  }

  Future<void> executeNotificationAction(
    String notificationId,
    String actionId,
    Map<String, dynamic>? data,
  ) async {
    // Handle notification actions (mark as read, navigate, etc.)

    switch (actionId) {
      case 'mark_as_read':
        await markAsRead(notificationId);
        break;
      case 'archive':
        await archiveNotification(notificationId);
        break;
      case 'delete':
        await deleteNotification(notificationId);
        break;
      default:
    }
  }

  void dispose() {
    _notificationStreamController.close();
    _notificationsListStreamController.close();
    _unreadCountStreamController.close();
    _socketNotificationSubscription?.cancel();
    // _notificationSubscription?.unsubscribe(); // Commented out - not available yet
  }
}