import 'package:flutter/material.dart';
import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:async';
import 'video_call_socket_service.dart';
import 'callkit_service.dart';
import '../videocalls/incoming_call_screen.dart';
import '../models/video_call.dart';

/// Global manager for handling incoming video calls
class IncomingCallManager {
  static final IncomingCallManager _instance = IncomingCallManager._internal();
  factory IncomingCallManager() => _instance;
  IncomingCallManager._internal();

  VideoCallSocketService? _videoCallSocketService;
  StreamSubscription<IncomingCallData>? _incomingCallSubscription;
  BuildContext? _context;
  bool _isShowingIncomingCall = false;

  /// Initialize the incoming call manager with app context and socket service
  void initialize(BuildContext context, VideoCallSocketService socketService) {
    _context = context;
    _videoCallSocketService = socketService;
    _listenForIncomingCalls();
  }

  /// Listen for incoming video call events from VideoCallSocketService
  void _listenForIncomingCalls() {
    _incomingCallSubscription?.cancel();

    if (_videoCallSocketService == null) {
      return;
    }


    _incomingCallSubscription = _videoCallSocketService!.onIncomingCall.listen((incomingCall) {

      _showIncomingCall(incomingCall);
    });
  }

  /// Show incoming call screen
  void _showIncomingCall(IncomingCallData incomingCall) async {

    // ⭐ CRITICAL FIX: Check if app is in FOREGROUND before showing IncomingCallScreen
    // When app is in BACKGROUND/PAUSED, FCM + CallKit will handle the incoming call UI
    // We should NOT push IncomingCallScreen when app is in background!
    final appLifecycleState = WidgetsBinding.instance.lifecycleState;
    final isAppInForeground = appLifecycleState == AppLifecycleState.resumed;


    if (!isAppInForeground) {
      return;
    }

    if (_context == null || _isShowingIncomingCall) {
      return;
    }

    // ⭐ CRITICAL: Check if this call was already shown/handled via CallKit (background)
    // This prevents showing duplicate IncomingCallScreen when app comes to foreground
    // We check BOTH in-memory AND SharedPreferences directly to handle timing issues

    // First check in-memory (fast)
    final isHandledInMemory = CallKitService.instance.isCallHandled(incomingCall.callId);

    if (isHandledInMemory) {
      return;
    }

    // Also check SharedPreferences directly (handles timing issues where CallKitService
    // hasn't loaded from storage yet, or app was restarted)
    final isHandledInStorage = await _isCallHandledInStorage(incomingCall.callId);

    if (isHandledInStorage) {
      return;
    }

    _isShowingIncomingCall = true;

    // Use Navigator to show full-screen incoming call
    Navigator.of(_context!).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (context) => IncomingCallScreen(
          callId: incomingCall.callId,
          callerName: incomingCall.from.name,
          callerAvatar: incomingCall.from.avatar,
          callerUserId: incomingCall.from.id,
          isVideoCall: incomingCall.callType.toLowerCase() == 'video',
        ),
      ),
    ).then((result) {
      _isShowingIncomingCall = false;
    });
  }

  /// Check if a call was handled/shown via CallKit by checking SharedPreferences directly
  /// This handles timing issues where CallKitService might not have loaded from storage yet
  Future<bool> _isCallHandledInStorage(String callId) async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Check pending calls (calls shown via CallKit)
      final pendingCalls = prefs.getStringList('callkit_pending_calls') ?? [];
      if (pendingCalls.contains(callId)) {
        return true;
      }

      // Check handled calls (calls that were accepted/declined/ended/timeout)
      final handledCalls = prefs.getStringList('callkit_handled_call_ids') ?? [];
      if (handledCalls.contains(callId)) {
        return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  /// Dismiss incoming call screen
  void _dismissIncomingCall() {
    if (_context != null && _isShowingIncomingCall) {
      Navigator.of(_context!).pop();
      _isShowingIncomingCall = false;
    }
  }

  /// Dispose resources
  void dispose() {
    _incomingCallSubscription?.cancel();
    _incomingCallSubscription = null;
    _context = null;
    _videoCallSocketService = null;
  }
}
