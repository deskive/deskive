import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';

/// Manages Android foreground service for screen capture on Android 14+ (SDK 34+)
///
/// On Android 14+, a foreground service with FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
/// must be running when requesting screen capture. This manager handles starting
/// and stopping that service.
///
/// IMPORTANT: The foreground service does NOT handle MediaProjection itself.
/// LiveKit/flutter_webrtc handles the actual screen capture and MediaProjection.
/// This service only provides the required foreground service context.
///
/// Flow:
/// 1. Call startForegroundService() BEFORE requesting screen capture
/// 2. LiveKit requests MediaProjection permission and handles screen capture
/// 3. Call stopForegroundService() when screen sharing ends
class ScreenCaptureManager {
  static const MethodChannel _channel =
      MethodChannel('com.deskive/screen_capture');

  /// Start the foreground service for screen capture
  ///
  /// This starts a foreground service with FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
  /// which is required on Android 14+ before requesting screen capture.
  ///
  /// Returns true if service started successfully, false otherwise
  static Future<bool> startForegroundService() async {
    if (!Platform.isAndroid) return true;

    try {
      debugPrint('ScreenCaptureManager: Starting foreground service...');
      final result = await _channel.invokeMethod<bool>('startForegroundService');
      debugPrint('ScreenCaptureManager: startForegroundService result: $result');
      return result ?? false;
    } on PlatformException catch (e) {
      debugPrint('ScreenCaptureManager: Error starting foreground service: ${e.message}');
      return false;
    }
  }

  /// Request screen capture permission and start the foreground service
  ///
  /// DEPRECATED: Use startForegroundService() instead and let LiveKit handle permission.
  /// This method is kept for backward compatibility but now just starts the service.
  ///
  /// Returns true if service started, false otherwise
  static Future<bool> requestScreenCapturePermission() async {
    if (!Platform.isAndroid) return true;

    try {
      debugPrint('ScreenCaptureManager: Starting foreground service (legacy method)...');
      // Just start the service - LiveKit will handle permission
      final result = await _channel.invokeMethod<bool>('startForegroundService');
      debugPrint('ScreenCaptureManager: Service started: $result');
      return result ?? false;
    } on PlatformException catch (e) {
      debugPrint('ScreenCaptureManager: Error: ${e.message}');
      return false;
    }
  }

  /// Stop the foreground service for screen capture
  /// This should be called when screen sharing is stopped
  static Future<bool> stopForegroundService() async {
    if (!Platform.isAndroid) return true;

    try {
      final result = await _channel.invokeMethod<bool>('stopForegroundService');
      debugPrint('ScreenCaptureManager: stopForegroundService result: $result');
      return result ?? false;
    } on PlatformException catch (e) {
      debugPrint('ScreenCaptureManager: Error stopping foreground service: ${e.message}');
      return false;
    }
  }

  /// Check if the foreground service is currently running
  static Future<bool> isServiceRunning() async {
    if (!Platform.isAndroid) return false;

    try {
      final result = await _channel.invokeMethod<bool>('isServiceRunning');
      return result ?? false;
    } on PlatformException catch (e) {
      debugPrint('ScreenCaptureManager: Error checking service status: ${e.message}');
      return false;
    }
  }
}
