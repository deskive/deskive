import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_quill/flutter_quill.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:app_links/app_links.dart';
import 'dart:async';
import 'dart:io';
import 'utils/theme_notifier.dart';
import 'widgets/auth_wrapper.dart';
import 'screens/splash_screen.dart';
import 'screens/onboarding_screen.dart';
import 'services/app_at_once_service.dart';
import 'services/auth_service.dart';
import 'services/workspace_management_service.dart';
import 'services/notification_service.dart';
import 'services/push_notification_service.dart';
import 'services/fcm_service.dart' show FCMService, firebaseMessagingBackgroundHandler;
import 'services/app_state_service.dart';
import 'services/navigation_service.dart';
import 'services/message_cache_service.dart';
import 'services/onboarding_service.dart';
import 'services/video_call_socket_service.dart';
import 'services/incoming_call_manager.dart';
import 'services/callkit_service.dart';
import 'services/native_call_service.dart';
import 'services/analytics_service.dart';
import 'videocalls/video_call_screen.dart';
import 'videocalls/video_call_join_screen.dart';
import 'email/email_screen.dart';
import 'services/workspace_service.dart';
import 'providers/auth_provider.dart';
import 'models/note.dart';
import 'config/app_config.dart';
import 'config/env_config.dart';
import 'config/api_config.dart';
import 'firebase_options.dart';
import 'theme/app_theme.dart';

// Global navigator key for navigation from services
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

// Global variable to store pending native call (checked before UI starts)
// This enables WhatsApp-like behavior: skip splash and go directly to call screen
Map<String, dynamic>? _pendingNativeAcceptedCall;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();

  // ⭐ Configure system UI overlay style for iOS status bar visibility
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark, // Dark icons for light theme
    statusBarBrightness: Brightness.light, // iOS: light background = dark icons
    systemNavigationBarColor: Colors.transparent,
    systemNavigationBarIconBrightness: Brightness.dark,
  ));

  // Ensure status bar and navigation bar are visible
  SystemChrome.setEnabledSystemUIMode(
    SystemUiMode.edgeToEdge,
    overlays: [SystemUiOverlay.top, SystemUiOverlay.bottom],
  );

  // ⭐ CRITICAL: Check for native pending call IMMEDIATELY (before any UI)
  // This enables WhatsApp-like behavior when app launches from accepted call notification
  // We read directly from SharedPreferences because method channels aren't ready yet
  //
  // NOTE: Flutter's SharedPreferences adds 'flutter.' prefix internally.
  // Native code stores to 'flutter.pending_accepted_call_id', so we read 'pending_accepted_call_id'
  try {
    if (Platform.isAndroid) {
      final prefs = await SharedPreferences.getInstance();
      // Read WITHOUT 'flutter.' prefix - SharedPreferences adds it internally
      final callId = prefs.getString('pending_accepted_call_id');

      if (callId != null && callId.isNotEmpty) {
        _pendingNativeAcceptedCall = {
          'call_id': callId,
          'call_type': prefs.getString('pending_accepted_call_type') ?? 'video',
          'caller_user_id': prefs.getString('pending_accepted_caller_user_id') ?? '',
          'caller_name': prefs.getString('pending_accepted_caller_name') ?? '',
          'caller_avatar': prefs.getString('pending_accepted_caller_avatar') ?? '',
          'is_group_call': prefs.getBool('pending_accepted_is_group_call') ?? false,
        };

        // Clear the pending call data immediately
        await prefs.remove('pending_accepted_call_id');
        await prefs.remove('pending_accepted_call_type');
        await prefs.remove('pending_accepted_caller_user_id');
        await prefs.remove('pending_accepted_caller_name');
        await prefs.remove('pending_accepted_caller_avatar');
        await prefs.remove('pending_accepted_is_group_call');

      }
    }
  } catch (e) {
  }

  // Initialize Firebase (MUST be first)
  try {
    // Check if Firebase is already initialized to avoid duplicate-app error
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    } else {
    }

    // Set up background message handler (from fcm_service.dart with CallKit support)
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    // Initialize Firebase Analytics
    await AnalyticsService.instance.initialize();
  } catch (e) {
  }

  // Initialize Environment Configuration
  try {
    await EnvConfig.initialize();
    // Debug: Print the API URL being used
    debugPrint('🔧 API_BASE_URL: ${EnvConfig.apiBaseUrl}');
    debugPrint('🔧 WEBSOCKET_URL: ${EnvConfig.websocketUrl}');
  } catch (e) {
    debugPrint('❌ EnvConfig error: $e');
  }
  
  // Initialize App at Once services
  try {
    
    // Initialize the main AppAtOnce service (for data operations)
    await AppAtOnceService.instance.initialize();
    
    // Initialize the auth service
    await AuthService.instance.initialize();
    
    // Initialize workspace management service
    await WorkspaceManagementService.instance.initialize();
    
    // Initialize push notification service
    await PushNotificationService.instance.initialize();

    // Initialize notification service (depends on others)
    await NotificationService.instance.initialize();

    // Initialize Firebase Cloud Messaging for testing
    await FCMService.instance.initialize();

    // Initialize App State Service for tracking app lifecycle
    AppStateService().initialize();

    // Initialize Message Cache Service for fast message loading
    await MessageCacheService.instance.initialize();

    // Initialize Video Call WebSocket Service (must be after AuthService)
    // Note: Socket.io uses http/https URLs, not ws/wss - the library handles WebSocket upgrade
    await VideoCallSocketService.initialize(
      serverUrl: ApiConfig.websocketUrl,
      getToken: () => AuthService.instance.accessToken ?? '',
    );

    // Initialize CallKit Service for native incoming call UI
    await CallKitService.instance.initialize();

    // Listen for CallKit actions (accept/decline/timeout)
    CallKitService.instance.onCallAction.listen((action) {
      _handleCallKitAction(action);
    });

    // Listen for native call accepted events (from IncomingCallActivity when app was in background)
    NativeCallService.instance.onCallAccepted.listen((callData) {
      _handleNativeCallAccepted(callData);
    });

    // Listen for app lifecycle changes to reconnect VideoCallSocketService
    AppStateService().appStateStream.listen((state) {
      if (state == AppLifecycleState.resumed) {
        try {
          VideoCallSocketService.instance.reconnectIfNeeded();
        } catch (e) {
        }
      }
    });

    // Skip the demo usage for now to avoid errors
    // await _demonstrateNotesUsage();
  } catch (e, stackTrace) {
  }

  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('en'), Locale('ja')],
      path: 'assets/translations',
      fallbackLocale: const Locale('en'),
      child: const DeskiveApp(),
    ),
  );
}

/// Handle CallKit actions (accept/decline/timeout)
void _handleCallKitAction(CallKitAction action) async {
  final context = navigatorKey.currentContext;

  switch (action.action) {
    case CallKitActionType.accept:
      // User accepted the call

      if (context == null) {
        // App is still initializing - store action for later
        await _storePendingCallAction(action);
        return;
      }

      _navigateToVideoCall(context, action);
      break;

    case CallKitActionType.decline:
      // User declined the call - send decline message to backend
      _handleCallDecline(action);
      break;

    case CallKitActionType.timeout:
      // Call timed out - no action needed
      break;

    case CallKitActionType.ended:
      // Call ended - clean up
      break;

    case CallKitActionType.callback:
      // User wants to call back

      if (context == null) {
        await _storePendingCallAction(action);
        return;
      }

      _navigateToVideoCall(context, action);
      break;
  }
}

/// Store pending call action in SharedPreferences
Future<void> _storePendingCallAction(CallKitAction action) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('pending_call_id', action.callId);
    await prefs.setString('pending_call_type', action.callType ?? 'video');
    await prefs.setString('pending_caller_user_id', action.callerUserId ?? '');
    await prefs.setBool('pending_is_group_call', action.isGroupCall ?? false);
    await prefs.setString('pending_call_action', 'accept');
  } catch (e) {
  }
}

/// Check for and handle pending call action
Future<void> handlePendingCallAction(BuildContext context) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final pendingCallId = prefs.getString('pending_call_id');

    if (pendingCallId == null) {
      return;
    }


    // Retrieve stored call data
    final callType = prefs.getString('pending_call_type') ?? 'video';
    final callerUserId = prefs.getString('pending_caller_user_id') ?? '';
    final isGroupCall = prefs.getBool('pending_is_group_call') ?? false;

    // Clear the pending action
    await prefs.remove('pending_call_id');
    await prefs.remove('pending_call_type');
    await prefs.remove('pending_caller_user_id');
    await prefs.remove('pending_is_group_call');
    await prefs.remove('pending_call_action');


    // Notify backend that call was accepted
    VideoCallSocketService.instance.acceptCall(callId: pendingCallId);

    // Navigate to video call screen
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => VideoCallScreen(
          callId: pendingCallId,
          isIncoming: true,
          isAudioOnly: callType == 'audio',
          initialMicEnabled: true,
        ),
      ),
    );

  } catch (e) {
  }
}

/// Navigate to video call screen when user accepts call
void _navigateToVideoCall(BuildContext context, CallKitAction action) {
  try {

    // First, dismiss the CallKit notification
    CallKitService.instance.endCall(action.callId);

    // Notify backend that call was accepted via WebSocket
    VideoCallSocketService.instance.acceptCall(callId: action.callId);

    // Navigate to video call screen
    // The screen will automatically join the call in initState
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => VideoCallScreen(
          callId: action.callId,
          isIncoming: true, // This is an incoming call
          isAudioOnly: action.callType == 'audio',
          initialMicEnabled: true, // Enable mic by default for accepted calls
        ),
      ),
    );

  } catch (e) {
  }
}

/// Handle call decline - notify backend via WebSocket
void _handleCallDecline(CallKitAction action) {
  try {

    // Send decline event via WebSocket
    final socketService = VideoCallSocketService.instance;
    socketService.declineCall(
      callId: action.callId,
      callerUserId: action.callerUserId ?? '',
    );

  } catch (e) {
  }
}

/// Handle call accepted from native IncomingCallActivity
/// This is triggered when the app was in background and user accepted via native UI
void _handleNativeCallAccepted(Map<String, dynamic> callData) {
  try {
    final callId = callData['call_id'] as String?;
    final callType = callData['call_type'] as String? ?? 'video';
    final callerUserId = callData['caller_user_id'] as String? ?? '';

    if (callId == null || callId.isEmpty) {
      return;
    }


    final context = navigatorKey.currentContext;

    if (context == null) {
      // Store for later handling
      _storePendingNativeCall(callData);
      return;
    }

    // Accept the call via WebSocket (notify backend)
    VideoCallSocketService.instance.acceptCall(callId: callId);

    // Navigate to video call screen
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

  } catch (e) {
  }
}

/// Store pending native call for later navigation
Future<void> _storePendingNativeCall(Map<String, dynamic> callData) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('pending_native_call_id', callData['call_id'] as String? ?? '');
    await prefs.setString('pending_native_call_type', callData['call_type'] as String? ?? 'video');
    await prefs.setString('pending_native_caller_user_id', callData['caller_user_id'] as String? ?? '');
  } catch (e) {
  }
}

/// AppLinks instance for deep link handling
late AppLinks _appLinks;

/// Stream subscription for deep links
StreamSubscription<Uri>? _deepLinkSubscription;

/// Initialize deep link handling for video call join links
Future<void> _initializeDeepLinks() async {
  try {
    _appLinks = AppLinks();

    // Handle initial deep link if app was launched via link
    final initialUri = await _appLinks.getInitialLink();
    if (initialUri != null) {
      await _storePendingDeepLink(initialUri);
    }

    // Listen for incoming deep links when app is running
    _deepLinkSubscription = _appLinks.uriLinkStream.listen(
      (Uri uri) {
        _handleDeepLink(uri);
      },
      onError: (err) {
      },
    );

  } catch (e) {
  }
}

/// Store pending deep link in SharedPreferences for later handling
Future<void> _storePendingDeepLink(Uri uri) async {
  try {
    final callData = _parseVideoCallDeepLink(uri);
    if (callData != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('pending_deep_link_call_id', callData['callId']!);
      await prefs.setString('pending_deep_link_workspace_id', callData['workspaceId']!);
    }
  } catch (e) {
  }
}

/// Handle incoming deep link and navigate to appropriate screen
void _handleDeepLink(Uri uri) {
  // Check for Google Calendar OAuth callback
  final calendarData = _parseCalendarDeepLink(uri);
  if (calendarData != null) {
    final context = navigatorKey.currentContext;
    if (context != null) {
      _handleCalendarDeepLink(context, calendarData);
    } else {
      _storePendingCalendarDeepLink(uri);
    }
    return;
  }

  // Check for email OAuth callback
  final emailData = _parseEmailDeepLink(uri);
  if (emailData != null) {
    final context = navigatorKey.currentContext;
    if (context != null) {
      _navigateToEmailScreen(context, emailData);
    } else {
      _storePendingEmailDeepLink(uri);
    }
    return;
  }

  // Check for video call deep link
  final callData = _parseVideoCallDeepLink(uri);
  if (callData != null) {
    final callId = callData['callId']!;
    final workspaceId = callData['workspaceId']!;


    // Navigate to video call screen
    final context = navigatorKey.currentContext;
    if (context != null) {
      _navigateToDeepLinkCall(context, callId, workspaceId);
    } else {
      _storePendingDeepLink(uri);
    }
  } else {
  }
}

/// Parse email OAuth callback deep link
/// Expected format: deskive://email/callback?emailConnected=true&email=xxx&workspaceId=yyy
Map<String, String>? _parseEmailDeepLink(Uri uri) {
  try {
    // Check if it's an email callback link
    if (uri.scheme == 'deskive' && uri.host == 'email' && uri.path.contains('callback')) {
      final emailConnected = uri.queryParameters['emailConnected'] == 'true';
      final email = uri.queryParameters['email'];
      final workspaceId = uri.queryParameters['workspaceId'];
      final error = uri.queryParameters['emailError'];

      return {
        'emailConnected': emailConnected.toString(),
        'email': email ?? '',
        'workspaceId': workspaceId ?? '',
        'error': error ?? '',
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

/// Store pending email deep link for later handling
Future<void> _storePendingEmailDeepLink(Uri uri) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('pending_email_deep_link', uri.toString());
  } catch (e) {
    // Ignore errors
  }
}

/// Navigate to email screen from deep link
void _navigateToEmailScreen(BuildContext context, Map<String, String> emailData) {
  try {
    final workspaceId = emailData['workspaceId'];
    final emailConnected = emailData['emailConnected'] == 'true';
    final error = emailData['error'];

    // Set the workspace if provided
    if (workspaceId != null && workspaceId.isNotEmpty) {
      WorkspaceService.instance.setCurrentWorkspace(workspaceId);
    }

    // Show success or error message
    if (error != null && error.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Email connection failed: $error'),
          backgroundColor: Colors.red,
        ),
      );
    } else if (emailConnected) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gmail connected: ${emailData['email']}'),
          backgroundColor: Colors.green,
        ),
      );
    }

    // Navigate to email screen
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const EmailScreen(),
      ),
    );
  } catch (e) {
    // Ignore navigation errors
  }
}

/// Check for and handle pending email deep link
Future<void> handlePendingEmailDeepLink(BuildContext context) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final pendingLink = prefs.getString('pending_email_deep_link');

    if (pendingLink == null) return;

    // Clear the pending deep link
    await prefs.remove('pending_email_deep_link');

    final uri = Uri.parse(pendingLink);
    final emailData = _parseEmailDeepLink(uri);
    if (emailData != null) {
      _navigateToEmailScreen(context, emailData);
    }
  } catch (e) {
    // Ignore errors
  }
}

/// Parse Google Calendar OAuth callback deep link
/// Expected format: deskive://calendar?calendarConnected=true&email=xxx&workspaceId=yyy
Map<String, String>? _parseCalendarDeepLink(Uri uri) {
  try {
    // Check if it's a calendar callback link
    if (uri.scheme == 'deskive' && uri.host == 'calendar') {
      final calendarConnected = uri.queryParameters['calendarConnected'] == 'true';
      final email = uri.queryParameters['email'];
      final workspaceId = uri.queryParameters['workspaceId'];
      final error = uri.queryParameters['calendarError'];

      return {
        'calendarConnected': calendarConnected.toString(),
        'email': email ?? '',
        'workspaceId': workspaceId ?? '',
        'error': error ?? '',
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

/// Store pending calendar deep link for later handling
Future<void> _storePendingCalendarDeepLink(Uri uri) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('pending_calendar_deep_link', uri.toString());
  } catch (e) {
    // Ignore errors
  }
}

/// Handle calendar deep link
void _handleCalendarDeepLink(BuildContext context, Map<String, String> calendarData) {
  try {
    final workspaceId = calendarData['workspaceId'];
    final calendarConnected = calendarData['calendarConnected'] == 'true';
    final email = calendarData['email'];
    final error = calendarData['error'];

    // Set the workspace if provided
    if (workspaceId != null && workspaceId.isNotEmpty) {
      WorkspaceService.instance.setCurrentWorkspace(workspaceId);
    }

    // Show success or error message
    if (error != null && error.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Google Calendar connection failed: $error'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 4),
        ),
      );
    } else if (calendarConnected) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Google Calendar connected: $email'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 4),
        ),
      );
    }

    // Notify any listeners that calendar connection status changed
    // This will be handled by the calendar screen when it's visible
  } catch (e) {
    // Ignore navigation errors
  }
}

/// Check for and handle pending calendar deep link
Future<void> handlePendingCalendarDeepLink(BuildContext context) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final pendingLink = prefs.getString('pending_calendar_deep_link');

    if (pendingLink == null) return;

    // Clear the pending deep link
    await prefs.remove('pending_calendar_deep_link');

    final uri = Uri.parse(pendingLink);
    final calendarData = _parseCalendarDeepLink(uri);
    if (calendarData != null) {
      _handleCalendarDeepLink(context, calendarData);
    }
  } catch (e) {
    // Ignore errors
  }
}

/// Parse video call deep link URL
/// Expected format: https://deskive.com/call/{workspaceId}/{callId}
Map<String, String>? _parseVideoCallDeepLink(Uri uri) {
  try {
    // Check if it's a video call link
    // Supports both https://deskive.com/call/... and deskive://oauth/callback style
    final pathSegments = uri.pathSegments;

    // Expected: /call/{workspaceId}/{callId}
    // pathSegments: ['call', '{workspaceId}', '{callId}']
    if (pathSegments.length >= 3 && pathSegments[0] == 'call') {
      final workspaceId = pathSegments[1];
      final callId = pathSegments[2];

      if (workspaceId.isNotEmpty && callId.isNotEmpty) {
        return {
          'workspaceId': workspaceId,
          'callId': callId,
        };
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

/// Navigate to video call join screen from deep link
void _navigateToDeepLinkCall(BuildContext context, String callId, String workspaceId) {
  try {

    // Navigate to VideoCallJoinScreen which handles:
    // - Checking if user is authorized (host or invitee)
    // - If authorized: joins directly
    // - If not authorized: shows join request modal, waits for approval
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => VideoCallJoinScreen(
          callId: callId,
          workspaceId: workspaceId,
        ),
      ),
    );

  } catch (e) {
  }
}

/// Check for and handle pending deep link call
Future<void> handlePendingDeepLinkCall(BuildContext context) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final pendingCallId = prefs.getString('pending_deep_link_call_id');
    final pendingWorkspaceId = prefs.getString('pending_deep_link_workspace_id');

    if (pendingCallId == null || pendingWorkspaceId == null) {
      return;
    }


    // Clear the pending deep link
    await prefs.remove('pending_deep_link_call_id');
    await prefs.remove('pending_deep_link_workspace_id');

    // Navigate to video call screen
    _navigateToDeepLinkCall(context, pendingCallId, pendingWorkspaceId);
  } catch (e) {
  }
}

Future<void> _demonstrateNotesUsage() async {
  try {
    final service = AppAtOnceService.instance;
    
    
    // Skip table creation for now and just test basic operations
    
    // Create a very simple note for testing
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    final userId = await AppConfig.getCurrentUserId();

    if (workspaceId == null || userId == null) {
      return;
    }

    final sampleNote = Note(
      workspaceId: workspaceId,
      title: 'Simple Test Note',
      content: {'text': 'Simple test content'},
      contentText: 'Simple test content',
      createdBy: userId,
      tags: ['test'],
      isFavorite: false,
    );
    
    
    // Insert the note
    final insertedNote = await service.insertNote(sampleNote);
    
    // Test note retrieval
    final notes = await service.getNotes(workspaceId: 'test-workspace');
    
    
  } catch (e) {
  }
}

class DeskiveApp extends StatefulWidget {
  const DeskiveApp({super.key});

  @override
  State<DeskiveApp> createState() => _DeskiveAppState();
}

class _DeskiveAppState extends State<DeskiveApp> {
  final ThemeNotifier _themeNotifier = ThemeNotifier();

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // ⭐ WHATSAPP-LIKE BEHAVIOR: If there's a pending native accepted call,
    // skip splash screen entirely and go directly to call screen
    final hasPendingCall = _pendingNativeAcceptedCall != null;

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(
          value: AuthProvider.instance,
        ),
        ChangeNotifierProvider<ThemeNotifier>.value(
          value: _themeNotifier,
        ),
        ChangeNotifierProvider<WorkspaceManagementService>.value(
          value: WorkspaceManagementService.instance,
        ),
      ],
      child: AnimatedBuilder(
        animation: _themeNotifier,
        builder: (context, child) {
          return MaterialApp(
            navigatorKey: navigatorKey,
            title: EnvConfig.appName,
            debugShowCheckedModeBanner: false,
            themeMode: _themeNotifier.themeMode,
            navigatorObservers: [
              AnalyticsService.instance.observer,
            ],
            localizationsDelegates: [
              ...context.localizationDelegates,
              FlutterQuillLocalizations.delegate,
            ],
            supportedLocales: context.supportedLocales,
            locale: context.locale,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            // ⭐ CRITICAL: If pending call exists, skip splash and go to call screen directly
            home: hasPendingCall
                ? _DirectCallLauncher(
                    callData: _pendingNativeAcceptedCall!,
                    themeNotifier: _themeNotifier,
                  )
                : SplashScreen(
                    nextScreen: _OnboardingWrapper(themeNotifier: _themeNotifier),
                    onInitialize: () async {
                      // Initialize auth during splash screen
                      await AuthProvider.instance.initialize();

                      // If user is authenticated, initialize workspace service
                      if (AuthProvider.instance.isAuthenticated) {
                        await WorkspaceManagementService.instance.initialize();
                      }
                    },
                  ),
          );
        },
      ),
    );
  }
}

/// ⭐ WHATSAPP-LIKE BEHAVIOR: Direct call launcher that skips splash screen
/// This widget is shown when user accepts a call from native notification (terminated state)
/// It initializes minimal services and goes directly to VideoCallScreen
class _DirectCallLauncher extends StatefulWidget {
  final Map<String, dynamic> callData;
  final ThemeNotifier themeNotifier;

  const _DirectCallLauncher({
    required this.callData,
    required this.themeNotifier,
  });

  @override
  State<_DirectCallLauncher> createState() => _DirectCallLauncherState();
}

class _DirectCallLauncherState extends State<_DirectCallLauncher> {
  bool _isInitializing = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initializeAndLaunchCall();
  }

  Future<void> _initializeAndLaunchCall() async {
    try {

      // Extract call data
      final callId = widget.callData['call_id'] as String?;
      final callType = widget.callData['call_type'] as String? ?? 'video';

      if (callId == null || callId.isEmpty) {
        throw Exception('Invalid call data - missing call_id');
      }


      // Initialize minimal services required for video call
      await AuthService.instance.initialize();
      await AuthProvider.instance.initialize();

      // Note: Socket.io uses http/https URLs, not ws/wss - the library handles WebSocket upgrade
      await VideoCallSocketService.initialize(
        serverUrl: ApiConfig.websocketUrl,
        getToken: () => AuthService.instance.accessToken ?? '',
      );

      // Accept the call via WebSocket
      VideoCallSocketService.instance.acceptCall(callId: callId);

      // Clear the pending call data
      _pendingNativeAcceptedCall = null;

      // Navigate to VideoCallScreen

      if (mounted) {
        setState(() {
          _isInitializing = false;
        });

        // Use a post-frame callback to ensure navigation happens after build
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            Navigator.of(context).pushReplacement(
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
        });
      }

    } catch (e) {
      if (mounted) {
        setState(() {
          _isInitializing = false;
          _error = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      // Error occurred - show error and provide way to go to main app
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                const Text(
                  'Failed to join call',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    // Navigate to normal app flow
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(
                        builder: (context) => SplashScreen(
                          nextScreen: _OnboardingWrapper(themeNotifier: widget.themeNotifier),
                          onInitialize: () async {
                            await AuthProvider.instance.initialize();
                            if (AuthProvider.instance.isAuthenticated) {
                              await WorkspaceManagementService.instance.initialize();
                            }
                          },
                        ),
                      ),
                    );
                  },
                  child: const Text('Go to App'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Show minimal loading while initializing
    return const Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: Colors.white),
            SizedBox(height: 24),
            Text(
              'Connecting to call...',
              style: TextStyle(color: Colors.white, fontSize: 18),
            ),
          ],
        ),
      ),
    );
  }
}

/// Wrapper widget that decides whether to show onboarding or go directly to AuthWrapper
class _OnboardingWrapper extends StatefulWidget {
  final ThemeNotifier themeNotifier;

  const _OnboardingWrapper({
    required this.themeNotifier,
  });

  @override
  State<_OnboardingWrapper> createState() => _OnboardingWrapperState();
}

class _OnboardingWrapperState extends State<_OnboardingWrapper> {
  bool _isLoading = true;
  bool _hasCompletedOnboarding = false;

  @override
  void initState() {
    super.initState();
    _checkOnboardingStatus();
  }

  Future<void> _checkOnboardingStatus() async {
    final hasCompleted = await OnboardingService.hasCompletedOnboarding();
    setState(() {
      _hasCompletedOnboarding = hasCompleted;
      _isLoading = false;
    });

    // ⭐ PRIORITY 0: Check for native pending accepted call (terminated state - WhatsApp-like)
    // This is the highest priority because it handles calls accepted from native IncomingCallActivity
    // when the app was fully terminated
    if (hasCompleted && mounted) {
      final nativePendingCall = await NativeCallService.instance.getPendingAcceptedCall();

      if (nativePendingCall != null) {

        // Small delay to ensure navigation is ready
        await Future.delayed(const Duration(milliseconds: 300));

        if (mounted) {
          _navigateToNativeAcceptedCall(nativePendingCall);
        }
        return; // Skip all other checks - this is the highest priority
      }

      // Also check for pending declined call to notify backend
      final nativeDeclinedCall = await NativeCallService.instance.getPendingDeclinedCall();
      if (nativeDeclinedCall != null) {
        final callId = nativeDeclinedCall['call_id'] as String?;
        final callerUserId = nativeDeclinedCall['caller_user_id'] as String?;
        if (callId != null && callerUserId != null) {
          VideoCallSocketService.instance.declineCall(
            callId: callId,
            callerUserId: callerUserId,
          );
        }
        // Don't return - continue with normal flow
      }
    }

    // ⭐ PRIORITY 1: Check for launch call notification (app opened from terminated state)
    if (hasCompleted && mounted) {
      // Check if app was launched via call notification tap
      final launchCallData = await FCMService.getPendingLaunchCall();

      if (launchCallData != null) {

        // Clear the launch call data
        await FCMService.clearPendingLaunchCall();

        // Small delay to ensure navigation is ready
        await Future.delayed(const Duration(milliseconds: 300));

        if (mounted) {
          // Navigate directly to call screen (WhatsApp-like behavior)
          _navigateToLaunchCall(launchCallData);
        }
        return; // Skip pending call action check
      }

      // ⭐ PRIORITY 2: Check for pending CallKit action (if no launch call found)
      await Future.delayed(const Duration(milliseconds: 500));
      if (mounted) {
        await handlePendingCallAction(context);
      }

      // ⭐ PRIORITY 3: Check for pending deep link call (video call join links)
      if (mounted) {
        await handlePendingDeepLinkCall(context);
      }
    }
  }

  /// Navigate to call screen when app is launched from call notification
  void _navigateToLaunchCall(Map<String, dynamic> callData) {
    try {
      final callId = callData['call_id'] as String;
      final callType = callData['call_type'] as String;
      final callerUserId = callData['caller_user_id'] as String;
      final callerName = callData['caller_name'] as String;
      final callerAvatar = callData['caller_avatar'] as String?;
      final isGroupCall = callData['is_group_call'] as bool;


      // Accept the call via WebSocket
      VideoCallSocketService.instance.acceptCall(callId: callId);

      // Navigate to video call screen using Navigator
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => VideoCallScreen(
            callId: callId,
            isIncoming: true,
            isAudioOnly: callType == 'audio',
            initialMicEnabled: true,
          ),
        ),
      );

    } catch (e) {
    }
  }

  /// Navigate to call screen when user accepted call from native IncomingCallActivity
  /// This is for WhatsApp-like behavior when app was terminated
  void _navigateToNativeAcceptedCall(Map<String, dynamic> callData) {
    try {
      final callId = callData['call_id'] as String?;
      final callType = callData['call_type'] as String? ?? 'video';
      final callerUserId = callData['caller_user_id'] as String? ?? '';
      final callerName = callData['caller_name'] as String? ?? '';
      final isGroupCall = callData['is_group_call'] as bool? ?? false;

      if (callId == null || callId.isEmpty) {
        return;
      }


      // Accept the call via WebSocket (notify backend)
      VideoCallSocketService.instance.acceptCall(callId: callId);

      // Navigate directly to video call screen - skipping all other screens
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => VideoCallScreen(
            callId: callId,
            isIncoming: true,
            isAudioOnly: callType == 'audio',
            initialMicEnabled: true,
          ),
        ),
      );

    } catch (e) {
    }
  }

  void _completeOnboarding() async {
    await OnboardingService.completeOnboarding();
    setState(() {
      _hasCompletedOnboarding = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      // Show minimal loading (should be very brief)
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (!_hasCompletedOnboarding) {
      // Show onboarding screen
      return OnboardingScreen(
        onComplete: _completeOnboarding,
      );
    }

    // Show auth wrapper (login or main app)
    return AuthWrapper(themeNotifier: widget.themeNotifier);
  }
}