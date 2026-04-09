import 'dart:async';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter_callkit_incoming/flutter_callkit_incoming.dart';
import 'package:flutter_callkit_incoming/entities/entities.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import 'package:vibration/vibration.dart';

/// CallKit Service for native incoming call UI on Android and iOS
/// Provides full-screen incoming call notifications with proper ringtone and system integration
///
/// NOTE: CallKit is disabled in China per MIIT regulations (Apple Guideline 5.0)
/// The app uses a generic in-app call UI for users in China instead of native CallKit
class CallKitService {
  static final CallKitService _instance = CallKitService._internal();
  static CallKitService get instance => _instance;

  CallKitService._internal();

  final _callActionController = StreamController<CallKitAction>.broadcast();
  Stream<CallKitAction> get onCallAction => _callActionController.stream;

  bool _initialized = false;
  bool get isInitialized => _initialized;

  /// Flag to track if CallKit should be enabled
  /// CallKit is disabled in China per MIIT regulations (Apple Guideline 5.0)
  bool _callKitEnabled = true;
  bool get isCallKitEnabled => _callKitEnabled;

  /// Check if device is in China region
  /// Returns true if device locale/region is set to China
  static bool _isInChina() {
    try {
      // Check device locale
      final locale = PlatformDispatcher.instance.locale;
      final countryCode = locale.countryCode?.toUpperCase();

      // China country codes: CN (mainland), HK (Hong Kong), MO (Macau)
      // Per MIIT regulation, only mainland China (CN) requires CallKit to be disabled
      if (countryCode == 'CN') {
        return true;
      }

      // Additional check: language code zh with CN region
      if (locale.languageCode == 'zh' && countryCode == 'CN') {
        return true;
      }

      return false;
    } catch (e) {
      // If we can't determine region, assume not in China (enable CallKit)
      return false;
    }
  }

  /// Static method to check if CallKit is available (not in China)
  static bool get isCallKitAvailable {
    // Only iOS uses native CallKit; Android uses custom notification
    // For iOS, check if we're in China
    if (Platform.isIOS) {
      return !_isInChina();
    }
    // For Android, always return true (uses custom notification, not iOS CallKit)
    return true;
  }

  // Track recently shown calls to prevent duplicates (WebSocket + FCM both trigger)
  final Set<String> _shownCallIds = {};
  DateTime _lastCleanup = DateTime.now();

  // Track calls that have been handled via CallKit (accepted/declined/ended/timeout)
  // This prevents IncomingCallManager from showing duplicate UI when app comes to foreground
  // ⭐ IMPORTANT: Also persisted to SharedPreferences for cases where app is killed and relaunched
  final Set<String> _handledCallIds = {};

  // SharedPreferences key for persisting handled call IDs
  static const String _handledCallIdsKey = 'callkit_handled_call_ids';

  /// Check if a call was already handled via CallKit
  /// Checks both in-memory cache and persistent storage
  bool isCallHandled(String callId) {
    final handled = _handledCallIds.contains(callId);
    return handled;
  }

  /// Mark a call as handled (called when accept/decline/end/timeout via CallKit)
  /// Persists to SharedPreferences so it survives app restarts
  Future<void> _markCallAsHandled(String callId) async {
    _handledCallIds.add(callId);

    // Persist to SharedPreferences
    await _persistHandledCallIds();

    // Clean up old handled calls after 5 minutes
    Future.delayed(const Duration(minutes: 5), () async {
      _handledCallIds.remove(callId);
      await _persistHandledCallIds();
    });
  }

  /// Persist handled call IDs to SharedPreferences
  Future<void> _persistHandledCallIds() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final callIdsList = _handledCallIds.toList();
      await prefs.setStringList(_handledCallIdsKey, callIdsList);
    } catch (e) {
    }
  }

  /// Load handled call IDs from SharedPreferences (called during initialize)
  Future<void> _loadHandledCallIds() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final callIdsList = prefs.getStringList(_handledCallIdsKey) ?? [];
      _handledCallIds.addAll(callIdsList);

      // Also load pending CallKit calls (shown but not yet handled)
      final pendingCallIds = prefs.getStringList(_pendingCallKitCallsKey) ?? [];
      _handledCallIds.addAll(pendingCallIds);
    } catch (e) {
    }
  }

  // Key for tracking calls that have been shown via CallKit (may be handled or still pending)
  static const String _pendingCallKitCallsKey = 'callkit_pending_calls';

  /// Static method to mark a call as shown via CallKit
  /// This can be called from background isolate when showing CallKit notification
  /// Ensures the call won't trigger duplicate IncomingCallScreen when app comes to foreground
  static Future<void> markCallKitCallShown(String callId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final pendingCalls = prefs.getStringList(_pendingCallKitCallsKey) ?? [];
      if (!pendingCalls.contains(callId)) {
        pendingCalls.add(callId);
        await prefs.setStringList(_pendingCallKitCallsKey, pendingCalls);
      }
    } catch (e) {
    }
  }

  /// Static method to clear a pending CallKit call (call was handled)
  static Future<void> clearPendingCallKitCall(String callId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final pendingCalls = prefs.getStringList(_pendingCallKitCallsKey) ?? [];
      pendingCalls.remove(callId);
      await prefs.setStringList(_pendingCallKitCallsKey, pendingCalls);
    } catch (e) {
    }
  }

  /// Initialize CallKit service and listen for call actions
  Future<void> initialize() async {
    if (_initialized) return;

    try {
      // Check if CallKit should be enabled based on region
      // CallKit is disabled in China per MIIT regulations (Apple Guideline 5.0)
      _callKitEnabled = isCallKitAvailable;

      // ⭐ CRITICAL: Load handled call IDs from persistent storage FIRST
      // This ensures calls handled via CallKit while app was killed are still tracked
      await _loadHandledCallIds();

      // Skip CallKit initialization if disabled (China region on iOS)
      if (!_callKitEnabled && Platform.isIOS) {
        _initialized = true;
        return;
      }

      // IMPORTANT: Clear any stuck/ghost notifications on startup
      await FlutterCallkitIncoming.endAllCalls();
      _shownCallIds.clear();

      // Listen for CallKit events (answer, decline, timeout)
      FlutterCallkitIncoming.onEvent.listen((event) {
        if (event == null) return;

        final name = event.event;
        final body = event.body;


        if (name == Event.actionCallAccept) {
          // User accepted the call
          _handleCallAccepted(body);
        } else if (name == Event.actionCallDecline) {
          // User declined the call
          _handleCallDeclined(body);
        } else if (name == Event.actionCallEnded) {
          // Call ended
          _handleCallEnded(body);
        } else if (name == Event.actionCallTimeout) {
          // Call timed out (no answer)
          _handleCallTimeout(body);
        } else if (name == Event.actionCallCallback) {
          // User tapped callback button
          _handleCallCallback(body);
        } else {
        }
      });

      _initialized = true;
    } catch (e, stackTrace) {
    }
  }

  /// Show incoming call notification with full-screen UI
  /// Returns true if CallKit notification was shown, false if CallKit is disabled (e.g., China region)
  /// When false is returned, caller should use alternative in-app call UI
  Future<bool> showIncomingCall({
    required String callId,
    required String callType,
    required bool isGroupCall,
    required String callerUserId,
    required String callerName,
    String? callerAvatar,
    String? workspaceId,
    List<String>? participantIds,
  }) async {
    try {
      // Skip CallKit if disabled (China region on iOS per MIIT regulations)
      if (!_callKitEnabled && Platform.isIOS) {
        return false; // Caller should use alternative in-app call UI
      }

      // DEDUPLICATION: Check if this call was already shown recently
      if (_shownCallIds.contains(callId)) {
        return true; // Already shown
      }

      // Clean up old call IDs every 5 minutes
      final now = DateTime.now();
      if (now.difference(_lastCleanup).inMinutes >= 5) {
        _shownCallIds.clear();
        _lastCleanup = now;
      }

      // Mark this call as shown
      _shownCallIds.add(callId);


      // Create unique ID for this call notification
      final uuid = const Uuid().v4();

      // Prepare call data
      final params = CallKitParams(
        id: uuid,
        nameCaller: callerName,
        appName: 'Deskive',
        avatar: callerAvatar,
        handle: callerUserId,
        type: callType == 'video' ? 1 : 0, // 0 = audio, 1 = video
        textAccept: 'Accept',
        textDecline: 'Decline',
        duration: 45000, // 45 seconds timeout
        extra: <String, dynamic>{
          'call_id': callId,
          'caller_user_id': callerUserId,
          'caller_name': callerName,
          'call_type': callType,
          'is_group_call': isGroupCall.toString(),
          'workspace_id': workspaceId ?? '',
          'participant_ids': participantIds?.join(',') ?? '',
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

      // Show the call
      await FlutterCallkitIncoming.showCallkitIncoming(params);

      // ⭐ CRITICAL: Mark this call as shown via CallKit in persistent storage
      // This prevents IncomingCallManager from showing duplicate IncomingCallScreen
      await markCallKitCallShown(callId);

      return true; // CallKit notification shown successfully
    } catch (e, stackTrace) {
      return false; // Failed to show CallKit, caller should use alternative UI
    }
  }

  /// Start an outgoing call (iOS only - required for proper audio session)
  /// This reports the outgoing call to CallKit so iOS configures audio properly
  Future<bool> startOutgoingCall({
    required String callId,
    required String callType,
    required String calleeName,
    String? calleeAvatar,
    String? calleeUserId,
  }) async {
    print('[CallKitService] ========================================');
    print('[CallKitService] startOutgoingCall CALLED');
    print('[CallKitService] callId: $callId');
    print('[CallKitService] callType: $callType');
    print('[CallKitService] calleeName: $calleeName');
    print('[CallKitService] isInitialized: $_initialized');
    print('[CallKitService] ========================================');

    // Ensure CallKit is initialized
    if (!_initialized) {
      print('[CallKitService] WARNING: CallKit not initialized, initializing now...');
      await initialize();
    }

    // Skip CallKit if disabled (China region on iOS per MIIT regulations)
    if (!_callKitEnabled && Platform.isIOS) {
      print('[CallKitService] CallKit disabled for China region, skipping outgoing call registration');
      return false;
    }

    try {
      // Create unique ID for this call notification
      final uuid = const Uuid().v4();
      print('[CallKitService] Generated UUID: $uuid');

      // Prepare call data
      final params = CallKitParams(
        id: uuid,
        nameCaller: calleeName,
        appName: 'Deskive',
        avatar: calleeAvatar,
        handle: calleeUserId ?? calleeName,
        type: callType == 'video' ? 1 : 0, // 0 = audio, 1 = video
        textAccept: 'Accept',
        textDecline: 'End',
        duration: 0, // No timeout for outgoing calls
        extra: <String, dynamic>{
          'call_id': callId,
          'callee_user_id': calleeUserId ?? '',
          'callee_name': calleeName,
          'call_type': callType,
          'is_outgoing': 'true',
        },
        headers: <String, dynamic>{},
        android: AndroidParams(
          isCustomNotification: false,
          isShowLogo: false,
          isShowFullLockedScreen: false,
          ringtonePath: '',
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
          ringtonePath: '',
        ),
      );

      print('[CallKitService] Calling FlutterCallkitIncoming.startCall...');

      // Start the outgoing call (this configures iOS audio session)
      await FlutterCallkitIncoming.startCall(params);

      print('[CallKitService] ✅ Outgoing call started successfully!');

      // Track this call
      _shownCallIds.add(callId);

      return true;
    } catch (e, stackTrace) {
      print('[CallKitService] ❌ ERROR starting outgoing call: $e');
      print('[CallKitService] Stack trace: $stackTrace');
      // Don't rethrow - we want the call to proceed even if CallKit fails
      return false;
    }
  }

  /// End/dismiss an active call notification
  Future<void> endCall(String callId) async {
    try {

      // Remove from shown calls set
      _shownCallIds.remove(callId);

      // Get all active calls
      final activeCalls = await FlutterCallkitIncoming.activeCalls();

      // Find the call with matching ID in extra data
      for (final call in activeCalls) {
        final extra = (call['extra'] as Map<Object?, Object?>?)?.cast<String, dynamic>();
        if (extra != null && extra['call_id'] == callId) {
          final uuid = call['id'] as String;
          await FlutterCallkitIncoming.endCall(uuid);
          return;
        }
      }

    } catch (e) {
    }
  }

  /// End all active calls
  Future<void> endAllCalls() async {
    try {
      _shownCallIds.clear(); // Clear deduplication cache
      await FlutterCallkitIncoming.endAllCalls();
    } catch (e) {
    }
  }

  /// Handle call accepted action
  void _handleCallAccepted(Map<String, dynamic>? body) async {
    if (body == null) return;


    // ⭐ Stop vibration when call is accepted
    try {
      await Vibration.cancel();
    } catch (e) {
    }

    final extra = (body['extra'] as Map<Object?, Object?>?)?.cast<String, dynamic>();

    if (extra != null) {
      final callId = extra['call_id'] as String?;
      final callType = extra['call_type'] as String?;
      final callerUserId = extra['caller_user_id'] as String?;
      final isGroupCall = extra['is_group_call'] == 'true';

      if (callId != null) {
        // Mark as handled to prevent duplicate IncomingCallScreen
        _markCallAsHandled(callId);
        // Also clear from pending (in case app was killed and this is a fresh launch)
        clearPendingCallKitCall(callId);

        _callActionController.add(CallKitAction(
          action: CallKitActionType.accept,
          callId: callId,
          callType: callType,
          callerUserId: callerUserId,
          isGroupCall: isGroupCall,
        ));
      }
    }
  }

  /// Handle call declined action
  void _handleCallDeclined(Map<String, dynamic>? body) async {
    if (body == null) return;


    // ⭐ Stop vibration when call is declined
    try {
      await Vibration.cancel();
    } catch (e) {
    }

    final extra = (body['extra'] as Map<Object?, Object?>?)?.cast<String, dynamic>();

    if (extra != null) {
      final callId = extra['call_id'] as String?;
      final callType = extra['call_type'] as String?;
      final callerUserId = extra['caller_user_id'] as String?;
      final isGroupCall = extra['is_group_call'] == 'true';

      if (callId != null) {
        // Mark as handled to prevent duplicate IncomingCallScreen
        _markCallAsHandled(callId);
        // Also clear from pending (in case app was killed and this is a fresh launch)
        clearPendingCallKitCall(callId);

        _callActionController.add(CallKitAction(
          action: CallKitActionType.decline,
          callId: callId,
          callType: callType,
          callerUserId: callerUserId,
          isGroupCall: isGroupCall,
        ));
      }
    }
  }

  /// Handle call ended action
  void _handleCallEnded(Map<String, dynamic>? body) async {
    if (body == null) return;


    // ⭐ Stop vibration when call ends
    try {
      await Vibration.cancel();
    } catch (e) {
    }

    final extra = (body['extra'] as Map<Object?, Object?>?)?.cast<String, dynamic>();

    if (extra != null) {
      final callId = extra['call_id'] as String?;
      if (callId != null) {
        // Mark as handled to prevent duplicate IncomingCallScreen
        _markCallAsHandled(callId);
        // Also clear from pending (in case app was killed and this is a fresh launch)
        clearPendingCallKitCall(callId);

        _callActionController.add(CallKitAction(
          action: CallKitActionType.ended,
          callId: callId,
        ));
      }
    }
  }

  /// Handle call timeout action
  void _handleCallTimeout(Map<String, dynamic>? body) async {
    if (body == null) return;


    // ⭐ Stop vibration when call times out
    try {
      await Vibration.cancel();
    } catch (e) {
    }

    final extra = (body['extra'] as Map<Object?, Object?>?)?.cast<String, dynamic>();

    if (extra != null) {
      final callId = extra['call_id'] as String?;
      if (callId != null) {
        // Mark as handled to prevent duplicate IncomingCallScreen
        _markCallAsHandled(callId);
        // Also clear from pending (in case app was killed and this is a fresh launch)
        clearPendingCallKitCall(callId);

        _callActionController.add(CallKitAction(
          action: CallKitActionType.timeout,
          callId: callId,
        ));
      }
    }
  }

  /// Handle callback action
  void _handleCallCallback(Map<String, dynamic>? body) {
    if (body == null) return;

    final extra = (body['extra'] as Map<Object?, Object?>?)?.cast<String, dynamic>();

    if (extra != null) {
      final callId = extra['call_id'] as String?;
      if (callId != null) {
        _callActionController.add(CallKitAction(
          action: CallKitActionType.callback,
          callId: callId,
        ));
      }
    }
  }

  /// Check if there are active calls
  Future<bool> hasActiveCalls() async {
    try {
      final activeCalls = await FlutterCallkitIncoming.activeCalls();
      return activeCalls.isNotEmpty;
    } catch (e) {
      return false;
    }
  }

  /// Get current active calls
  Future<List<Map<String, dynamic>>> getActiveCalls() async {
    try {
      return await FlutterCallkitIncoming.activeCalls();
    } catch (e) {
      return [];
    }
  }

  /// Dispose resources
  void dispose() {
    _callActionController.close();
  }
}

/// CallKit action types
enum CallKitActionType {
  accept,
  decline,
  ended,
  timeout,
  callback,
}

/// CallKit action data
class CallKitAction {
  final CallKitActionType action;
  final String callId;
  final String? callType;
  final String? callerUserId;
  final bool? isGroupCall;

  CallKitAction({
    required this.action,
    required this.callId,
    this.callType,
    this.callerUserId,
    this.isGroupCall,
  });

  @override
  String toString() {
    return 'CallKitAction(action: $action, callId: $callId, callType: $callType, callerUserId: $callerUserId, isGroupCall: $isGroupCall)';
  }
}
