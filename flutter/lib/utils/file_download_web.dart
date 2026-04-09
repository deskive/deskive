// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:convert';

/// Web implementation for file downloads using browser APIs
Future<bool> downloadFileWeb({
  required String content,
  required String fileName,
  required String mimeType,
}) async {
  try {
    // Convert content to bytes
    final bytes = utf8.encode(content);

    // Create a blob
    final blob = html.Blob([bytes], mimeType);

    // Create a URL for the blob
    final url = html.Url.createObjectUrlFromBlob(blob);

    // Create an anchor element and trigger download
    final anchor = html.AnchorElement(href: url)
      ..setAttribute('download', fileName)
      ..style.display = 'none';

    // Add to document, click, and remove
    html.document.body?.children.add(anchor);
    anchor.click();

    // Clean up
    html.document.body?.children.remove(anchor);
    html.Url.revokeObjectUrl(url);

    return true;
  } catch (e) {
    print('Web download error: $e');
    return false;
  }
}

/// Web implementation for binary file downloads
Future<bool> downloadBinaryFileWeb({
  required List<int> bytes,
  required String fileName,
  required String mimeType,
}) async {
  try {
    // Create a blob from bytes
    final blob = html.Blob([bytes], mimeType);

    // Create a URL for the blob
    final url = html.Url.createObjectUrlFromBlob(blob);

    // Create an anchor element and trigger download
    final anchor = html.AnchorElement(href: url)
      ..setAttribute('download', fileName)
      ..style.display = 'none';

    // Add to document, click, and remove
    html.document.body?.children.add(anchor);
    anchor.click();

    // Clean up
    html.document.body?.children.remove(anchor);
    html.Url.revokeObjectUrl(url);

    return true;
  } catch (e) {
    print('Web binary download error: $e');
    return false;
  }
}
