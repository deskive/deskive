/// Stub implementations for non-web platforms
/// These should never be called on non-web platforms

Future<bool> downloadFileWeb({
  required String content,
  required String fileName,
  required String mimeType,
}) async {
  throw UnsupportedError('Web download is not supported on this platform');
}

Future<bool> downloadBinaryFileWeb({
  required List<int> bytes,
  required String fileName,
  required String mimeType,
}) async {
  throw UnsupportedError('Web download is not supported on this platform');
}
