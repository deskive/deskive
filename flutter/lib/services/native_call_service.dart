import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Service for communicating with native Android call handling
/// This bridges Flutter with the native CallService and IncomingCallActivity
///
/// Flow for terminated state incoming call:
/// 1. FCM message arrives → DeskiveFirebaseMessagingService receives it
/// 2. Native CallService starts → shows IncomingCallActivity over lockscreen
/// 3. User accepts → call data stored in SharedPreferences
/// 4. MainActivity launches → Flutter checks for pending call
/// 5. VideoCallScreen opens directly
class NativeCallService {
  static NativeCallService? _instance;
  static NativeCallService get instance => _instance ??= NativeCallService._();

  NativeCallService._() {
    _setupMethodChannelHandler();
  }

  static const _channel = MethodChannel('com.deskive/calls');

  // Stream controller for call accepted events from native
  final _callAcceptedController = StreamController<Map<String, dynamic>>.broadcast();

  /// Stream of call accepted events from native IncomingCallActivity
  /// Listen to this stream to navigate to VideoCallScreen when call is accepted
  Stream<Map<String, dynamic>> get onCallAccepted => _callAcceptedController.stream;

  /// Set up method channel handler to receive calls from native
  void _setupMethodChannelHandler() {
    _channel.setMethodCallHandler((call) async {
      switch (call.method) {
        case 'onCallAccepted':
          // Call was accepted from native IncomingCallActivity
          final callData = Map<String, dynamic>.from(call.arguments as Map);
          _callAcceptedController.add(callData);
          return null;
        default:
          return null;
      }
    });
  }

  /// Dispose resources
  void dispose() {
    _callAcceptedController.close();
  }

  /// Check for pending accepted call (from native IncomingCallActivity)
  /// Returns call data if user accepted a call from terminated state
  Future<Map<String, dynamic>?> getPendingAcceptedCall() async {
    if (!Platform.isAndroid) return null;

    try {
      final result = await _channel.invokeMethod<Map<dynamic, dynamic>?>('getPendingAcceptedCall');
      if (result != null) {
        return Map<String, dynamic>.from(result);
      }
      return null;
    } on PlatformException catch (e) {
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Check for pending declined call (from native IncomingCallActivity)
  /// Returns call data if user declined a call from terminated state
  /// This can be used to notify the backend about the decline
  Future<Map<String, dynamic>?> getPendingDeclinedCall() async {
    if (!Platform.isAndroid) return null;

    try {
      final result = await _channel.invokeMethod<Map<dynamic, dynamic>?>('getPendingDeclinedCall');
      if (result != null) {
        return Map<String, dynamic>.from(result);
      }
      return null;
    } on PlatformException catch (e) {
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Show incoming call using native service (fallback if FCM didn't trigger it)
  Future<bool> showIncomingCall({
    required String callId,
    required String callerName,
    String? callerAvatar,
    required String callerUserId,
    required String callType,
    bool isGroupCall = false,
  }) async {
    if (!Platform.isAndroid) return false;

    try {
      final result = await _channel.invokeMethod<bool>('showIncomingCall', {
        'call_id': callId,
        'caller_name': callerName,
        'caller_avatar': callerAvatar,
        'caller_user_id': callerUserId,
        'call_type': callType,
        'is_group_call': isGroupCall,
      });
      return result ?? false;
    } on PlatformException catch (e) {
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Stop the native call service (e.g., when call ends)
  Future<bool> stopCallService() async {
    if (!Platform.isAndroid) return false;

    try {
      final result = await _channel.invokeMethod<bool>('stopCallService');
      return result ?? false;
    } on PlatformException catch (e) {
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Check if native call service is running
  Future<bool> isCallServiceRunning() async {
    if (!Platform.isAndroid) return false;

    try {
      final result = await _channel.invokeMethod<bool>('isCallServiceRunning');
      return result ?? false;
    } on PlatformException catch (e) {
      return false;
    } catch (e) {
      return false;
    }
  }
}
