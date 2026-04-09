import 'package:flutter/foundation.dart' show kIsWeb;

// Conditional import for web
// ignore: avoid_web_libraries_in_flutter
import 'file_download_stub.dart'
    if (dart.library.html) 'file_download_web.dart' as download_impl;

/// Helper class to handle file downloads across platforms
class FileDownloadHelper {
  /// Downloads a file with the given content
  /// On web: triggers a browser download
  /// On mobile/desktop: saves to the file system (handled externally)
  static Future<bool> downloadFile({
    required String content,
    required String fileName,
    required String mimeType,
  }) async {
    if (kIsWeb) {
      return download_impl.downloadFileWeb(
        content: content,
        fileName: fileName,
        mimeType: mimeType,
      );
    }
    // For non-web platforms, return false to indicate caller should handle it
    return false;
  }

  /// Downloads binary data as a file
  /// On web: triggers a browser download
  /// On mobile/desktop: saves to the file system (handled externally)
  static Future<bool> downloadBinaryFile({
    required List<int> bytes,
    required String fileName,
    required String mimeType,
  }) async {
    if (kIsWeb) {
      return download_impl.downloadBinaryFileWeb(
        bytes: bytes,
        fileName: fileName,
        mimeType: mimeType,
      );
    }
    // For non-web platforms, return false to indicate caller should handle it
    return false;
  }
}
