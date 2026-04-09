import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../models/signature/user_signature.dart';
import '../../models/document/document.dart';

/// Screen for positioning signature on document preview
class PositionSignatureScreen extends StatefulWidget {
  final Document document;
  final UserSignature signature;
  final String previewHtml;

  const PositionSignatureScreen({
    super.key,
    required this.document,
    required this.signature,
    required this.previewHtml,
  });

  @override
  State<PositionSignatureScreen> createState() => _PositionSignatureScreenState();
}

class _PositionSignatureScreenState extends State<PositionSignatureScreen> {
  // Document height will be determined from WebView content
  // Default to a reasonable minimum, will be updated after content loads
  double _documentHeight = 2000.0;

  // Signature position (percentage-based for responsiveness)
  double _xPercent = 0.1; // 10% from left
  double _yPercent = 0.7; // 70% from top (near bottom)
  double _signatureScale = 1.0;

  // For drag handling
  Offset _dragOffset = Offset.zero;

  // WebView controller
  late WebViewController _webViewController;

  // Document container key for size calculation
  final GlobalKey _documentKey = GlobalKey();
  Size _documentSize = Size.zero;

  // Scroll controller for the document preview
  final ScrollController _scrollController = ScrollController();

  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _initWebView() {
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (url) async {
            // Get the actual document height from WebView
            try {
              final heightResult = await _webViewController.runJavaScriptReturningResult(
                'document.body.scrollHeight'
              );
              final height = double.tryParse(heightResult.toString()) ?? 2000.0;
              setState(() {
                // Use actual height with some padding, minimum 1500px
                _documentHeight = (height + 100).clamp(1500.0, 5000.0);
                _isLoading = false;
              });
            } catch (e) {
              setState(() => _isLoading = false);
            }
          },
        ),
      )
      ..loadHtmlString(_wrapHtmlForPreview(widget.previewHtml));
  }

  String _wrapHtmlForPreview(String html) {
    // Don't constrain height - let content determine its natural height
    return '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
    }
    body {
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      background: white;
    }
    img { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; }
    td, th { border: 1px solid #ddd; padding: 8px; }
  </style>
</head>
<body>
$html
</body>
</html>
''';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Position Signature'),
        actions: [
          TextButton.icon(
            onPressed: _applySignature,
            icon: const Icon(Icons.check, color: Colors.white),
            label: const Text('Apply', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: Column(
        children: [
          // Instructions
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            color: Colors.blue.withOpacity(0.1),
            child: Row(
              children: [
                Icon(Icons.info_outline, size: 18, color: Colors.blue[700]),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Drag the signature to position it on the document',
                    style: TextStyle(fontSize: 13, color: Colors.blue[700]),
                  ),
                ),
              ],
            ),
          ),

          // Document preview with draggable signature
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                _documentSize = Size(constraints.maxWidth, _documentHeight);
                final viewportWidth = constraints.maxWidth;

                return SingleChildScrollView(
                  controller: _scrollController,
                  child: Container(
                    key: _documentKey,
                    width: viewportWidth,
                    height: _documentHeight,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: Colors.grey[300]!),
                    ),
                    child: Stack(
                      children: [
                        // Document WebView
                        Positioned.fill(
                          child: _isLoading
                              ? const Center(child: CircularProgressIndicator())
                              : WebViewWidget(controller: _webViewController),
                        ),

                        // Draggable Signature
                        Positioned(
                          left: _xPercent * viewportWidth,
                          top: _yPercent * _documentHeight,
                          child: GestureDetector(
                            onPanUpdate: (details) {
                              setState(() {
                                // Calculate new position based on document height
                                final newX = (_xPercent * viewportWidth) + details.delta.dx;
                                final newY = (_yPercent * _documentHeight) + details.delta.dy;

                                // Clamp to bounds
                                _xPercent = (newX / viewportWidth).clamp(0.0, 0.85);
                                _yPercent = (newY / _documentHeight).clamp(0.0, 0.95);
                              });
                            },
                            child: _buildDraggableSignature(isDark),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Scale controls
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? Colors.grey[900] : Colors.grey[100],
              border: Border(top: BorderSide(color: Colors.grey[300]!)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    const Text('Size:', style: TextStyle(fontWeight: FontWeight.w500)),
                    Expanded(
                      child: Slider(
                        value: _signatureScale,
                        min: 0.5,
                        max: 2.0,
                        divisions: 6,
                        label: '${(_signatureScale * 100).toInt()}%',
                        onChanged: (value) {
                          setState(() => _signatureScale = value);
                        },
                      ),
                    ),
                    Text('${(_signatureScale * 100).toInt()}%'),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close),
                        label: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _applySignature,
                        icon: const Icon(Icons.check),
                        label: const Text('Apply Signature'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDraggableSignature(bool isDark) {
    return Transform.scale(
      scale: _signatureScale,
      alignment: Alignment.topLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 200),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: Colors.blue, width: 2),
          borderRadius: BorderRadius.circular(4),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag handle
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: const BoxDecoration(
                color: Colors.blue,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(2),
                  topRight: Radius.circular(2),
                ),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.drag_indicator, color: Colors.white, size: 14),
                  SizedBox(width: 4),
                  Text(
                    'Drag to move',
                    style: TextStyle(color: Colors.white, fontSize: 10),
                  ),
                ],
              ),
            ),
            // Signature content
            Container(
              padding: const EdgeInsets.all(12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildSignaturePreview(),
                  const SizedBox(height: 4),
                  Text(
                    widget.signature.name,
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSignaturePreview() {
    if (widget.signature.isTypedSignature) {
      return Text(
        widget.signature.typedName ?? widget.signature.name,
        style: TextStyle(
          fontFamily: widget.signature.fontFamily ?? 'cursive',
          fontSize: 24,
          color: Colors.black87,
        ),
      );
    }

    // Drawn/uploaded signature
    try {
      final data = widget.signature.signatureData;
      if (data.startsWith('data:image')) {
        final base64Data = data.split(',').last;
        return Image.memory(
          base64Decode(base64Data),
          height: 50,
          fit: BoxFit.contain,
        );
      }
    } catch (e) {
      // Fall through to placeholder
    }

    return Icon(Icons.draw_outlined, size: 40, color: Colors.grey[400]);
  }

  void _applySignature() {
    // Return the position data to the caller
    // Calculate absolute pixel position for more accurate placement
    final topPx = (_yPercent * _documentHeight).round();

    Navigator.pop(context, SignaturePositionResult(
      xPercent: _xPercent,
      yPercent: _yPercent,
      scale: _signatureScale,
      documentHeight: _documentHeight,
      topPx: topPx,
    ));
  }
}

/// Result class for signature position
class SignaturePositionResult {
  final double xPercent;
  final double yPercent;
  final double scale;
  final double documentHeight;
  final int topPx; // Absolute pixel position from top

  SignaturePositionResult({
    required this.xPercent,
    required this.yPercent,
    required this.scale,
    required this.documentHeight,
    required this.topPx,
  });

  Map<String, dynamic> toJson() => {
    'xPercent': xPercent,
    'yPercent': yPercent,
    'scale': scale,
    'documentHeight': documentHeight,
    'topPx': topPx,
  };
}
