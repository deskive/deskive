import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

/// Permission types for the app
enum PermissionType {
  audioCall,
  videoCall,
  camera,
  microphone,
  storage,
  photos,
}

/// Helper class for managing app permissions
class PermissionsHelper {
  /// Check if a specific permission type is granted
  static Future<bool> checkPermission(PermissionType type) async {
    try {
      switch (type) {
        case PermissionType.audioCall:
          return await Permission.microphone.isGranted;
        case PermissionType.videoCall:
          final cameraGranted = await Permission.camera.isGranted;
          final micGranted = await Permission.microphone.isGranted;
          return cameraGranted && micGranted;
        case PermissionType.camera:
          return await Permission.camera.isGranted;
        case PermissionType.microphone:
          return await Permission.microphone.isGranted;
        case PermissionType.storage:
          return await Permission.storage.isGranted;
        case PermissionType.photos:
          return await Permission.photos.isGranted;
      }
    } catch (e) {
      debugPrint('Error checking permission: $e');
      return false;
    }
  }

  /// Ensure permission is granted, requesting if needed
  /// Returns true if permission is granted (or was just granted)
  static Future<bool> ensurePermission(
    BuildContext context,
    PermissionType type,
  ) async {
    try {
      // First check if already granted
      final alreadyGranted = await checkPermission(type);
      if (alreadyGranted) {
        return true;
      }

      // Request the permission
      switch (type) {
        case PermissionType.audioCall:
          final status = await Permission.microphone.request();
          return status.isGranted;
        case PermissionType.videoCall:
          final results = await [
            Permission.camera,
            Permission.microphone,
          ].request();
          final cameraGranted = results[Permission.camera]?.isGranted ?? false;
          final micGranted = results[Permission.microphone]?.isGranted ?? false;
          return cameraGranted && micGranted;
        case PermissionType.camera:
          final status = await Permission.camera.request();
          return status.isGranted;
        case PermissionType.microphone:
          final status = await Permission.microphone.request();
          return status.isGranted;
        case PermissionType.storage:
          final status = await Permission.storage.request();
          return status.isGranted;
        case PermissionType.photos:
          final status = await Permission.photos.request();
          return status.isGranted;
      }
    } catch (e) {
      debugPrint('Error ensuring permission: $e');
      return false;
    }
  }
  /// Check and request camera and microphone permissions for video calls
  static Future<bool> requestVideoCallPermissions() async {
    try {

      final cameraStatus = await Permission.camera.status;
      final micStatus = await Permission.microphone.status;


      // If already granted, return true
      if (cameraStatus.isGranted && micStatus.isGranted) {
        return true;
      }

      // Request permissions
      final results = await [
        Permission.camera,
        Permission.microphone,
      ].request();

      final cameraGranted = results[Permission.camera]?.isGranted ?? false;
      final micGranted = results[Permission.microphone]?.isGranted ?? false;


      if (cameraGranted && micGranted) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  /// Check if video call permissions are granted
  static Future<bool> hasVideoCallPermissions() async {
    try {
      final cameraGranted = await Permission.camera.isGranted;
      final micGranted = await Permission.microphone.isGranted;

      return cameraGranted && micGranted;
    } catch (e) {
      return false;
    }
  }

  /// Check camera permission status
  static Future<PermissionStatus> getCameraPermissionStatus() async {
    return await Permission.camera.status;
  }

  /// Check microphone permission status
  static Future<PermissionStatus> getMicrophonePermissionStatus() async {
    return await Permission.microphone.status;
  }

  /// Request camera permission only
  static Future<bool> requestCameraPermission() async {
    try {
      final status = await Permission.camera.request();
      return status.isGranted;
    } catch (e) {
      return false;
    }
  }

  /// Request microphone permission only
  static Future<bool> requestMicrophonePermission() async {
    try {
      final status = await Permission.microphone.request();
      return status.isGranted;
    } catch (e) {
      return false;
    }
  }

  /// Check if permission is permanently denied
  static Future<bool> isPermissionPermanentlyDenied(Permission permission) async {
    final status = await permission.status;
    return status.isPermanentlyDenied;
  }

  /// Open app settings to allow user to manually grant permissions
  static Future<void> openSettings() async {
    try {
      await openAppSettings();
    } catch (e) {
    }
  }

  /// Show a dialog explaining why permissions are needed
  static String getPermissionExplanation(Permission permission) {
    switch (permission) {
      case Permission.camera:
        return 'Camera access is required for video calls with your team members. '
            'This allows you to share your video during calls.';
      case Permission.microphone:
        return 'Microphone access is required for voice and video calls. '
            'This allows others to hear you during calls.';
      default:
        return 'This permission is required for the app to function properly.';
    }
  }

  /// Request audio call permissions (microphone only)
  static Future<bool> requestAudioCallPermissions() async {
    try {

      final micStatus = await Permission.microphone.status;

      if (micStatus.isGranted) {
        return true;
      }

      final result = await Permission.microphone.request();

      if (result.isGranted) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }
}
