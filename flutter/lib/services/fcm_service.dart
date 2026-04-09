import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_callkit_incoming/flutter_callkit_incoming.dart';
import 'package:flutter_callkit_incoming/entities/entities.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import 'package:vibration/vibration.dart';
import '../main.dart' show navigatorKey;
import '../screens/main_screen.dart';
import '../files/files_screen.dart';
import '../calendar/calendar_screen.dart';
import '../utils/theme_notifier.dart';
import '../widgets/floating_notification_widget.dart';
import 'app_state_service.dart';
import 'navigation_service.dart';
import 'notification_service.dart';
import 'callkit_service.dart';

/// Firebase Cloud Messaging Service for testing push notifications
/// Use this to test push notifications from Firebase Console
class FCMService {
  static FCMService? _instance;
  static FCMService get instance => _instance ??= FCMService._();

  FCMService._();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  bool _initialized = false;
  String? _fcmToken;

  // Track processed call IDs to prevent duplicate CallKit notifications
  final Set<String> _processedCallIds = {};
  DateTime _lastCleanup = DateTime.now();

  String? get fcmToken => _fcmToken;
  bool get isInitialized => _initialized;

  /// Initialize FCM and request permissions
  Future<void> initialize() async {
    if (_initialized) return;

    try {

      // Request notification permissions
      final settings = await _firebaseMessaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      } else if (settings.authorizationStatus == AuthorizationStatus.provisional) {
      } else {
        return;
      }

      // Configure foreground notification presentation (iOS only)
      // On Android, we handle this in the message handler
      await _firebaseMessaging.setForegroundNotificationPresentationOptions(
        alert: false, // Don't show alert when app is in foreground
        badge: false, // Don't update badge when app is in foreground
        sound: false, // Don't play sound when app is in foreground
      );

      // Initialize local notifications for displaying notifications when app is in foreground
      await _initializeLocalNotifications();

      // Check if Firebase project changed - if so, delete old token and get new one
      // This is needed when switching Firebase projects (e.g., from deskive-dc51e to deskive-app)
      const currentProjectId = 'deskive-app'; // Update this when changing Firebase projects
      final prefs = await SharedPreferences.getInstance();
      final storedProjectId = prefs.getString('fcm_firebase_project_id');

      // Force delete token if:
      // 1. No stored project ID (first time migration from old project)
      // 2. Project ID changed
      if (storedProjectId == null || storedProjectId != currentProjectId) {
        try {
          await _firebaseMessaging.deleteToken();
        } catch (e) {
        }
      }

      // Store current project ID
      await prefs.setString('fcm_firebase_project_id', currentProjectId);

      // Get FCM token (will generate new one if deleted above)
      _fcmToken = await _firebaseMessaging.getToken();

      // Listen to token refresh
      _firebaseMessaging.onTokenRefresh.listen((newToken) {
        _fcmToken = newToken;
      });

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Handle background message taps
      FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);

      // ⭐ CRITICAL: Check if app was opened from a TERMINATED state by tapping notification
      final initialMessage = await _firebaseMessaging.getInitialMessage();
      if (initialMessage != null) {

        // For call notifications, store data for launch navigation
        if (_isIncomingCallNotification(initialMessage.data)) {
          await _storeCallNotificationForLaunch(initialMessage.data);
        } else {
          // For other notifications, handle normally
          _handleMessageOpenedApp(initialMessage);
        }
      }

      _initialized = true;
    } catch (e) {
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
      onDidReceiveNotificationResponse: (response) {
      },
    );

  }

  /// Handle messages when app is in foreground
  void _handleForegroundMessage(RemoteMessage message) {

    // ⭐ CRITICAL: Verify app is truly in foreground ⭐
    // This handler is called by Firebase for foreground messages, but we double-check
    final appLifecycleState = WidgetsBinding.instance.lifecycleState;
    final isAppInForeground = appLifecycleState == AppLifecycleState.resumed;


    // If app is NOT in foreground (edge case), skip this handler
    // Let the system/background handler deal with it
    if (!isAppInForeground) {
      return;
    }

    // ⭐ CHECK FOR INCOMING CALL DATA NOTIFICATION ⭐
    // Data-only notifications for incoming calls don't have notification payload
    // They contain call_id, call_type, caller info in data
    if (_isIncomingCallNotification(message.data)) {
      _handleIncomingCallData(message.data);
      return; // Skip normal notification handling
    }

    if (message.notification == null) {
      return;
    }

    // ⭐ APP IS IN FOREGROUND - SHOW ONLY IN-APP NOTIFICATION ⭐
    // - NO system/push notification (handled by setForegroundNotificationPresentationOptions)
    // - Socket.IO (NotificationService) is PRIMARY notification source (real-time, faster)
    // - FCM is BACKUP in case Socket.IO message is delayed/missed
    // - We show ONLY floating notification (NO system notification)

    final notificationService = NotificationService.instance;
    final conversationId = message.data['conversation_id'];
    final messageId = message.data['entity_id'];

    // Check if this notification was already shown by Socket.IO
    if (conversationId != null || messageId != null) {
      // Small delay to let Socket.IO process first
      Future.delayed(const Duration(milliseconds: 500), () {
        // Verify still in foreground after delay
        final currentState = WidgetsBinding.instance.lifecycleState;
        if (currentState != AppLifecycleState.resumed) {
          return;
        }

        // If Socket.IO already handled it, skip
        final recentNotifications = notificationService.notifications.take(5);
        final alreadyShown = recentNotifications.any((n) {
          // Check if same message by comparing entity ID or conversation in additional data
          if (messageId != null && n.metadata?.entityId == messageId) {
            return true;
          }
          // Check conversation ID in additional data
          if (conversationId != null &&
              n.metadata?.additionalData?['conversation_id'] == conversationId) {
            return true;
          }
          return false;
        });

        if (alreadyShown) {
          return;
        }

        // Socket.IO didn't show it, so we show floating notification as backup
        _showFloatingNotification(message);
      });
    } else {
      // No conversation/message ID, show immediately
      _showFloatingNotification(message);
    }
  }

  /// Handle messages when user taps notification (background or terminated)
  void _handleMessageOpenedApp(RemoteMessage message) {

    // Check for incoming call data notification
    if (_isIncomingCallNotification(message.data)) {

      // Store call data in SharedPreferences for app to pick up during launch
      _storeCallNotificationForLaunch(message.data);
      return;
    }

    // Navigate to Messages screen based on notification data
    _navigateToMessageScreen(message.data);
  }

  /// Store call notification data for app to handle during launch
  Future<void> _storeCallNotificationForLaunch(Map<String, dynamic> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Store call details
      await prefs.setString('launch_call_id', data['call_id'] ?? '');
      await prefs.setString('launch_call_type', data['call_type'] ?? 'video');
      await prefs.setString('launch_caller_user_id', data['caller_user_id'] ?? '');
      await prefs.setString('launch_caller_name', data['caller_name'] ?? '');
      await prefs.setString('launch_caller_avatar', data['caller_avatar'] ?? '');
      await prefs.setBool('launch_is_group_call', data['is_group_call'] == 'true' || data['is_group_call'] == true);
      await prefs.setString('launch_workspace_id', data['workspace_id'] ?? '');
      await prefs.setInt('launch_call_timestamp', DateTime.now().millisecondsSinceEpoch);

    } catch (e) {
    }
  }

  /// Check if there's a pending call notification from app launch
  static Future<Map<String, dynamic>?> getPendingLaunchCall() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final callId = prefs.getString('launch_call_id');

      if (callId == null || callId.isEmpty) {
        return null;
      }

      // Check if call notification is recent (within last 60 seconds)
      final timestamp = prefs.getInt('launch_call_timestamp') ?? 0;
      final now = DateTime.now().millisecondsSinceEpoch;
      if (now - timestamp > 60000) {
        await clearPendingLaunchCall();
        return null;
      }


      return {
        'call_id': callId,
        'call_type': prefs.getString('launch_call_type') ?? 'video',
        'caller_user_id': prefs.getString('launch_caller_user_id') ?? '',
        'caller_name': prefs.getString('launch_caller_name') ?? '',
        'caller_avatar': prefs.getString('launch_caller_avatar') ?? '',
        'is_group_call': prefs.getBool('launch_is_group_call') ?? false,
        'workspace_id': prefs.getString('launch_workspace_id') ?? '',
      };
    } catch (e) {
      return null;
    }
  }

  /// Clear pending launch call data
  static Future<void> clearPendingLaunchCall() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('launch_call_id');
      await prefs.remove('launch_call_type');
      await prefs.remove('launch_caller_user_id');
      await prefs.remove('launch_caller_name');
      await prefs.remove('launch_caller_avatar');
      await prefs.remove('launch_is_group_call');
      await prefs.remove('launch_workspace_id');
      await prefs.remove('launch_call_timestamp');
    } catch (e) {
    }
  }

  /// Check if this is an incoming call data notification
  bool _isIncomingCallNotification(Map<String, dynamic> data) {
    // Check for required incoming call fields from backend
    // backend/src/modules/video-calls/video-calls.service.ts line 191-202
    return data.containsKey('call_id') &&
           data.containsKey('call_type') &&
           data.containsKey('caller_user_id') &&
           data.containsKey('caller_name');
  }

  /// Handle incoming call data notification
  ///
  /// IMPORTANT: FCM is responsible for showing CallKit when app is in BACKGROUND/TERMINATED
  /// WebSocket + IncomingCallManager handle call UI when app is in FOREGROUND
  /// This prevents duplicate notifications
  void _handleIncomingCallData(Map<String, dynamic> data) {
    try {

      // Extract call details
      final callId = data['call_id'] as String?;
      final callType = data['call_type'] as String?;
      final isGroupCall = data['is_group_call'] == 'true' || data['is_group_call'] == true;
      final callerUserId = data['caller_user_id'] as String?;
      final callerName = data['caller_name'] as String?;
      final callerAvatar = data['caller_avatar'] as String?;
      final workspaceId = data['workspace_id'] as String?;

      if (callId == null || callType == null || callerUserId == null || callerName == null) {
        return;
      }

      // ⭐ DEDUPLICATION: Check if this call was already processed ⭐
      if (_processedCallIds.contains(callId)) {
        return;
      }

      // Clean up old call IDs every 5 minutes
      final now = DateTime.now();
      if (now.difference(_lastCleanup).inMinutes >= 5) {
        _processedCallIds.clear();
        _lastCleanup = now;
      }

      // Mark this call as processed
      _processedCallIds.add(callId);

      // ⭐ CRITICAL: Never show CallKit when app is in foreground ⭐
      // When app is in foreground, WebSocket + IncomingCallManager show the call UI
      // This prevents duplicate UI (CallKit notification + app's incoming call screen)
      final appLifecycleState = WidgetsBinding.instance.lifecycleState;
      final isAppInForeground = appLifecycleState == AppLifecycleState.resumed;

      if (isAppInForeground) {
        return;
      }


      // Show CallKit incoming call UI only when app is in background/terminated
      CallKitService.instance.showIncomingCall(
        callId: callId,
        callType: callType,
        isGroupCall: isGroupCall,
        callerUserId: callerUserId,
        callerName: callerName,
        callerAvatar: callerAvatar,
        workspaceId: workspaceId,
      );

    } catch (e) {
    }
  }

  /// Navigate to the Messages screen when notification is tapped
  void _navigateToMessageScreen(Map<String, dynamic> data) {
    try {

      // Get the navigator context
      final context = navigatorKey.currentContext;
      if (context == null) {
        return;
      }

      // Extract notification type and IDs from data
      final notificationType = data['type'];
      final conversationId = data['conversation_id'];
      final channelId = data['channel_id'];
      final isDirect = data['isDirect'] == 'true' || data['isDirect'] == true;


      // For now, navigate to MainScreen with Messages tab selected (index 1)
      // In the future, we can extend this to open specific conversation/channel
      navigatorKey.currentState?.pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (context) => MainScreen(
            themeNotifier: ThemeNotifier(),
            initialIndex: 1, // Messages tab
          ),
        ),
        (route) => false,
      );


      // TODO: Future enhancement - Navigate to specific conversation/channel
      // if (isDirect && conversationId != null) {
      //   // Navigate to specific direct message conversation
      // } else if (!isDirect && channelId != null) {
      //   // Navigate to specific channel
      // }
    } catch (e) {
    }
  }

  /// Extract display name from notification data
  String _getNotificationTitle(RemoteMessage message) {
    final notification = message.notification;
    final senderName = message.data['sender_name'] ?? message.data['sender'];
    final channelName = message.data['channel_name'];

    // Priority: sender_name > channel_name > extract from title > default
    if (senderName != null && senderName.isNotEmpty) {
      return senderName;
    } else if (channelName != null && channelName.isNotEmpty) {
      return channelName;
    } else if (notification?.title != null) {
      final title = notification!.title!;
      // Extract name from title if it contains "from"
      if (title.contains(' from ')) {
        final parts = title.split(' from ');
        if (parts.length > 1) {
          final extracted = parts[1].trim();
          // If it looks like an email, convert to a readable name
          if (extracted.contains('@')) {
            final namePart = extracted.split('@')[0].replaceAll('.', ' ').trim();
            // Capitalize first letter of each word
            return namePart.split(' ')
                .map((word) => word.isNotEmpty
                    ? '${word[0].toUpperCase()}${word.substring(1)}'
                    : '')
                .join(' ');
          }
          return extracted;
        }
      }
      return title;
    }
    return 'New Message';
  }

  /// Show local notification for foreground messages
  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    final displayTitle = _getNotificationTitle(message);

    // Get sound preference from notification data (sent by backend)
    final soundEnabledStr = message.data['sound_enabled'] ?? 'true';
    final soundEnabled = soundEnabledStr.toLowerCase() == 'true';


    final androidDetails = AndroidNotificationDetails(
      'fcm_notifications',
      'FCM Notifications',
      channelDescription: 'Notifications from Firebase Cloud Messaging',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      playSound: soundEnabled, // Control sound based on user preference
      enableVibration: soundEnabled, // Also control vibration
      icon: '@mipmap/ic_launcher', // Deskive logo as notification icon
    );

    final iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: soundEnabled, // Control sound based on user preference
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      notification.hashCode,
      displayTitle,
      notification.body,
      details,
    );
  }

  /// Show floating in-app notification
  void _showFloatingNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    final navigatorState = navigatorKey.currentState;
    if (navigatorState == null) {
      return;
    }

    // Extract category to determine notification type
    final category = message.data['category'] ?? '';
    final entityType = message.data['entity_type'] ?? '';

    // Get the display title
    final displayTitle = _getNotificationTitle(message);


    // Show floating notification using navigator's overlay
    FloatingNotificationManager().showWithNavigator(
      navigatorState,
      title: displayTitle,
      message: notification.body ?? '',
      onTap: () => _handleNotificationNavigation(message, category, entityType),
    );
  }

  /// Handle navigation based on notification type
  void _handleNotificationNavigation(RemoteMessage message, String category, String entityType) {
    final context = navigatorKey.currentContext;
    if (context == null) {
      return;
    }


    switch (category.toLowerCase()) {
      case 'messages':
        // Chat/Message notifications
        _navigateToChat(message);
        break;

      case 'workspace':
        // Workspace notifications (files or notes)
        if (entityType == 'file') {
          _navigateToFiles(context, message);
        } else if (entityType == 'note') {
          _navigateToNotes(context, message);
        } else {
          _navigateToWorkspace(context);
        }
        break;

      case 'calendar':
        // Calendar/Event notifications
        _navigateToCalendar(context, message);
        break;

      case 'tasks':
        // Tasks/Project notifications
        _navigateToProjects(context, message);
        break;

      default:
        // Unknown category - try to navigate based on entity_type
        _navigateToWorkspace(context);
    }
  }

  /// Navigate to chat screen
  void _navigateToChat(RemoteMessage message) {
    final conversationId = message.data['conversation_id'];
    final channelId = message.data['channel_id'];
    final senderName = message.data['sender_name'] ?? message.data['sender'];
    final channelName = message.data['channel_name'];

    final navigationService = NavigationService();
    navigationService.navigateToChatScreen(
      conversationId: conversationId,
      channelId: channelId,
      userName: senderName,
      channelName: channelName,
    );
  }

  /// Navigate to files screen
  void _navigateToFiles(BuildContext context, RemoteMessage message) {
    final fileId = message.data['file_id'] ?? message.data['entity_id'];

    // Navigate directly to FilesScreen (not a tab in bottom navigation)
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const FilesScreen(),
      ),
    );
  }

  /// Navigate to notes screen
  void _navigateToNotes(BuildContext context, RemoteMessage message) {
    final noteId = message.data['note_id'] ?? message.data['entity_id'];

    // Navigate to MainScreen with Notes tab (index 3)
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => MainScreen(
          themeNotifier: ThemeNotifier(),
          initialIndex: 3, // Notes tab
        ),
      ),
    );

    // TODO: If noteId is provided, we could navigate to the specific note editor
    // This would require importing NoteEditorScreen and handling the navigation
  }

  /// Navigate to calendar screen
  void _navigateToCalendar(BuildContext context, RemoteMessage message) {
    final eventId = message.data['event_id'] ?? message.data['entity_id'];

    // Navigate directly to CalendarScreen (not a tab in bottom navigation)
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const CalendarScreen(),
      ),
    );

    // TODO: If eventId is provided, we could navigate to the specific event details
  }

  /// Navigate to projects screen
  void _navigateToProjects(BuildContext context, RemoteMessage message) {
    final projectId = message.data['project_id'] ?? message.data['entity_id'];

    // Navigate to MainScreen with Projects tab (index 2)
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => MainScreen(
          themeNotifier: ThemeNotifier(),
          initialIndex: 2, // Projects tab
        ),
      ),
    );

    // TODO: If projectId is provided, we could navigate to the specific project details
  }

  /// Navigate to workspace/dashboard
  void _navigateToWorkspace(BuildContext context) {
    // Navigate to MainScreen with Dashboard tab (index 0)
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => MainScreen(
          themeNotifier: ThemeNotifier(),
          initialIndex: 0, // Dashboard tab
        ),
      ),
    );
  }

  /// Manually refresh FCM token
  Future<String?> refreshToken() async {
    try {
      await _firebaseMessaging.deleteToken();
      _fcmToken = await _firebaseMessaging.getToken();
      return _fcmToken;
    } catch (e) {
      return null;
    }
  }

  /// Subscribe to a topic
  Future<void> subscribeToTopic(String topic) async {
    try {
      await _firebaseMessaging.subscribeToTopic(topic);
    } catch (e) {
    }
  }

  /// Unsubscribe from a topic
  Future<void> unsubscribeFromTopic(String topic) async {
    try {
      await _firebaseMessaging.unsubscribeFromTopic(topic);
    } catch (e) {
    }
  }
}

/// Background message handler (must be top-level function)
/// Uses SharedPreferences for deduplication across isolates
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Initialize Firebase in background isolate if not already initialized
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp();
  }


  // ⭐ CRITICAL: Check if app is in foreground ⭐
  // If app is in foreground, skip background notification (foreground handler will handle it)
  final isAppInForeground = await AppStateService.isAppInForegroundAsync();
  if (isAppInForeground) {
    return;
  }

  // ⭐ CHECK FOR INCOMING CALL DATA NOTIFICATION ⭐
  final isIncomingCall = message.data.containsKey('call_id') &&
                         message.data.containsKey('call_type') &&
                         message.data.containsKey('caller_user_id') &&
                         message.data.containsKey('caller_name');

  if (isIncomingCall) {

    // ⭐ ANDROID: Skip Flutter CallKit - native DeskiveFirebaseMessagingService handles it
    // The native service (CallService + IncomingCallActivity) provides WhatsApp-like behavior
    // showing full-screen UI even when app is terminated
    if (defaultTargetPlatform == TargetPlatform.android) {

      // Just mark the call as being handled to prevent duplicates
      try {
        final callId = message.data['call_id'] as String;
        final prefs = await SharedPreferences.getInstance();
        final pendingCalls = prefs.getStringList('callkit_pending_calls') ?? [];
        if (!pendingCalls.contains(callId)) {
          pendingCalls.add(callId);
          await prefs.setStringList('callkit_pending_calls', pendingCalls);
        }
      } catch (e) {
      }
      return; // Native service handles everything
    }

    // ⭐ iOS: Use Flutter CallKit (no native service implementation for iOS yet)
    try {
      // Extract call details
      final callId = message.data['call_id'] as String;
      final callType = message.data['call_type'] as String;
      final isGroupCall = message.data['is_group_call'] == 'true' || message.data['is_group_call'] == true;
      final callerUserId = message.data['caller_user_id'] as String;
      final callerName = message.data['caller_name'] as String;
      final callerAvatar = message.data['caller_avatar'] as String?;
      final workspaceId = message.data['workspace_id'] as String?;


      // IMPORTANT: Background handler runs in separate isolate
      // Must call FlutterCallkitIncoming directly, not through service
      final uuid = const Uuid().v4();
      final params = CallKitParams(
        id: uuid,
        nameCaller: callerName,
        appName: 'Deskive',
        avatar: callerAvatar,
        handle: callerUserId,
        type: callType == 'video' ? 1 : 0,
        textAccept: 'Accept',
        textDecline: 'Decline',
        duration: 45000,
        extra: <String, dynamic>{
          'call_id': callId,
          'caller_user_id': callerUserId,
          'caller_name': callerName,
          'call_type': callType,
          'is_group_call': isGroupCall.toString(),
          'workspace_id': workspaceId ?? '',
        },
        headers: <String, dynamic>{},
        android: AndroidParams(
          isCustomNotification: false,
          isShowLogo: false,
          isShowFullLockedScreen: true,
          ringtonePath: 'system_ringtone_default',
          backgroundColor: '#6264A7',
          backgroundUrl: '',
          actionColor: '#4CAF50',
          textColor: '#ffffff',
          incomingCallNotificationChannelName: 'Incoming Calls',
          missedCallNotificationChannelName: 'Missed Calls',
          isShowCallID: false,
        ),
        ios: IOSParams(
          iconName: 'AppIcon',
          handleType: 'generic',
          supportsVideo: callType == 'video',
          maximumCallGroups: 1,
          maximumCallsPerCallGroup: 1,
          audioSessionMode: 'videoChat',
          audioSessionActive: true,
          audioSessionPreferredSampleRate: 44100.0,
          audioSessionPreferredIOBufferDuration: 0.005,
          supportsDTMF: false,
          supportsHolding: false,
          supportsGrouping: false,
          supportsUngrouping: false,
          ringtonePath: 'system_ringtone_default',
        ),
      );

      await FlutterCallkitIncoming.showCallkitIncoming(params);

      // ⭐ Start continuous vibration like a phone call
      try {
        final hasVibrator = await Vibration.hasVibrator();
        if (hasVibrator == true) {
          await Vibration.vibrate(
            pattern: [0, 1000, 1000, 1000, 1000],
            repeat: 0,
          );
        }
      } catch (vibrationError) {
      }

      // Mark call as shown in persistent storage
      try {
        final prefs = await SharedPreferences.getInstance();
        final pendingCalls = prefs.getStringList('callkit_pending_calls') ?? [];
        if (!pendingCalls.contains(callId)) {
          pendingCalls.add(callId);
          await prefs.setStringList('callkit_pending_calls', pendingCalls);
        }
      } catch (persistError) {
      }
    } catch (e, stackTrace) {
    }
    return; // Skip normal notification handling for calls
  }

  // ⭐ IMPORTANT: When app is in BACKGROUND and message has `notification` payload,
  // Android AUTOMATICALLY displays the notification in the system tray.
  // We should NOT create another local notification to avoid duplicates.
  //
  // This background handler is mainly for:
  // 1. Handling incoming call data notifications (handled above)
  // 2. Processing data-only messages that need special handling
  //
  // For regular notifications with `notification` payload:
  // - Android auto-displays them → we do nothing here
  if (message.notification != null) {
    return;
  }

  // Data-only messages (no notification payload)
  // These are not auto-displayed by Android, so we could handle them here if needed

  // Currently, we don't create notifications for data-only messages
  // (except for incoming calls which are handled above)
  // If you need to show notifications for specific data-only messages,
  // add that logic here
}
