import 'dart:async';
import 'dart:io';
import 'package:flutter/services.dart';

/// Manager for Picture-in-Picture mode using native Android APIs
class PipManager {
  static const MethodChannel _channel = MethodChannel('com.deskive/pip');
  static final StreamController<bool> _pipModeController = StreamController<bool>.broadcast();

  /// Stream that emits PiP mode changes
  static Stream<bool> get pipModeStream => _pipModeController.stream;

  /// Initialize PiP manager and listen for mode changes
  static void initialize() {
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'onPipModeChanged') {
        final bool isInPipMode = call.arguments as bool;
        _pipModeController.add(isInPipMode);
      }
    });
  }

  /// Dispose resources
  static void dispose() {
    _pipModeController.close();
  }

  /// Check if PiP is supported on this device
  static Future<bool> get isPipSupported async {
    if (!Platform.isAndroid) return false;

    try {
      final bool result = await _channel.invokeMethod('isPipSupported');
      return result;
    } catch (e) {
      return false;
    }
  }

  /// Enter Picture-in-Picture mode
  static Future<bool> enterPipMode() async {
    if (!Platform.isAndroid) return false;

    try {
      final bool result = await _channel.invokeMethod('enterPipMode');
      return result;
    } catch (e) {
      return false;
    }
  }

  /// Check if currently in PiP mode
  static Future<bool> get isInPipMode async {
    if (!Platform.isAndroid) return false;

    try {
      final bool result = await _channel.invokeMethod('isInPipMode');
      return result;
    } catch (e) {
      return false;
    }
  }

  /// Enable/disable automatic PiP when user leaves app
  static Future<bool> enableAutoPip(bool enable) async {
    if (!Platform.isAndroid) return false;

    try {
      final bool result = await _channel.invokeMethod('enableAutoPip', enable);
      return result;
    } catch (e) {
      return false;
    }
  }
}
