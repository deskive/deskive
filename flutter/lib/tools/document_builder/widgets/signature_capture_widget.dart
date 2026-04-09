import 'dart:ui' as ui;
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

/// Signature capture widget with draw and type modes
class SignatureCaptureWidget extends StatefulWidget {
  final Function(String signatureData, String type, String? typedName, String? fontFamily) onSignatureComplete;
  final VoidCallback? onCancel;

  const SignatureCaptureWidget({
    super.key,
    required this.onSignatureComplete,
    this.onCancel,
  });

  @override
  State<SignatureCaptureWidget> createState() => _SignatureCaptureWidgetState();
}

class _SignatureCaptureWidgetState extends State<SignatureCaptureWidget>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _signaturePainter = SignaturePainter();
  final _typedNameController = TextEditingController();
  String _selectedFont = 'cursive';

  final List<String> _fonts = [
    'cursive',
    'serif',
    'sans-serif',
    'monospace',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _typedNameController.dispose();
    super.dispose();
  }

  void _clearSignature() {
    setState(() {
      _signaturePainter.clear();
    });
  }

  Future<void> _submitDrawnSignature() async {
    if (_signaturePainter.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('signature.draw_first'.tr()),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    // Convert signature to base64
    final signatureData = await _signaturePainter.toBase64();
    if (signatureData != null) {
      widget.onSignatureComplete(signatureData, 'drawn', null, null);
    }
  }

  void _submitTypedSignature() {
    final name = _typedNameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('signature.enter_name'.tr()),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    widget.onSignatureComplete(name, 'typed', name, _selectedFont);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'signature.add_signature'.tr(),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (widget.onCancel != null)
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: widget.onCancel,
              ),
          ],
        ),
        const SizedBox(height: 16),

        // Tab bar
        Container(
          decoration: BoxDecoration(
            color: isDark ? Colors.grey[800] : Colors.grey[200],
            borderRadius: BorderRadius.circular(10),
          ),
          child: TabBar(
            controller: _tabController,
            indicator: BoxDecoration(
              color: Theme.of(context).primaryColor,
              borderRadius: BorderRadius.circular(10),
            ),
            labelColor: Colors.white,
            unselectedLabelColor: isDark ? Colors.white70 : Colors.grey[700],
            tabs: [
              Tab(text: 'signature.draw'.tr()),
              Tab(text: 'signature.type'.tr()),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Tab content
        SizedBox(
          height: 200,
          child: TabBarView(
            controller: _tabController,
            children: [
              // Draw tab
              _buildDrawTab(isDark),
              // Type tab
              _buildTypeTab(isDark),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Submit button
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _tabController.index == 0
                ? _submitDrawnSignature
                : _submitTypedSignature,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text('signature.apply'.tr()),
          ),
        ),
      ],
    );
  }

  Widget _buildDrawTab(bool isDark) {
    return Column(
      children: [
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(11),
              child: GestureDetector(
                onPanStart: (details) {
                  setState(() {
                    _signaturePainter.startPath(details.localPosition);
                  });
                },
                onPanUpdate: (details) {
                  setState(() {
                    _signaturePainter.addPoint(details.localPosition);
                  });
                },
                onPanEnd: (details) {
                  _signaturePainter.endPath();
                },
                child: CustomPaint(
                  painter: _signaturePainter,
                  size: Size.infinite,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'signature.draw_hint'.tr(),
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white54 : Colors.grey[600],
              ),
            ),
            TextButton.icon(
              onPressed: _clearSignature,
              icon: const Icon(Icons.clear, size: 18),
              label: Text('signature.clear'.tr()),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTypeTab(bool isDark) {
    return Column(
      children: [
        // Name input
        TextField(
          controller: _typedNameController,
          decoration: InputDecoration(
            hintText: 'signature.enter_name'.tr(),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: _selectedFont,
            fontSize: 24,
          ),
        ),
        const SizedBox(height: 16),

        // Font selector
        Text(
          'signature.select_font'.tr(),
          style: TextStyle(
            fontSize: 12,
            color: isDark ? Colors.white54 : Colors.grey[600],
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 50,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _fonts.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final font = _fonts[index];
              final isSelected = font == _selectedFont;
              return InkWell(
                onTap: () {
                  setState(() {
                    _selectedFont = font;
                  });
                },
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? Theme.of(context).primaryColor.withOpacity(0.2)
                        : (isDark ? Colors.grey[800] : Colors.grey[200]),
                    borderRadius: BorderRadius.circular(8),
                    border: isSelected
                        ? Border.all(color: Theme.of(context).primaryColor)
                        : null,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    'Signature',
                    style: TextStyle(
                      fontFamily: font,
                      fontSize: 16,
                      color: isSelected
                          ? Theme.of(context).primaryColor
                          : (isDark ? Colors.white70 : Colors.grey[700]),
                    ),
                  ),
                ),
              );
            },
          ),
        ),

        const Spacer(),

        // Preview
        if (_typedNameController.text.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
              ),
            ),
            child: Text(
              _typedNameController.text,
              style: TextStyle(
                fontFamily: _selectedFont,
                fontSize: 28,
                color: Colors.black87,
              ),
            ),
          ),
      ],
    );
  }
}

/// Custom painter for signature drawing
class SignaturePainter extends ChangeNotifier implements CustomPainter {
  final List<List<Offset>> _paths = [];
  List<Offset>? _currentPath;

  bool get isEmpty => _paths.isEmpty && _currentPath == null;

  void startPath(Offset point) {
    _currentPath = [point];
    notifyListeners();
  }

  void addPoint(Offset point) {
    if (_currentPath != null) {
      _currentPath!.add(point);
      notifyListeners();
    }
  }

  void endPath() {
    if (_currentPath != null && _currentPath!.isNotEmpty) {
      _paths.add(_currentPath!);
      _currentPath = null;
      notifyListeners();
    }
  }

  void clear() {
    _paths.clear();
    _currentPath = null;
    notifyListeners();
  }

  Future<String?> toBase64() async {
    if (isEmpty) return null;

    try {
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);

      // Draw on white background
      final paint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill;
      canvas.drawRect(const Rect.fromLTWH(0, 0, 300, 100), paint);

      // Draw signature
      final signaturePaint = Paint()
        ..color = Colors.black
        ..strokeWidth = 2.0
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke;

      for (final path in _paths) {
        if (path.length > 1) {
          final uiPath = Path();
          uiPath.moveTo(path[0].dx, path[0].dy);
          for (int i = 1; i < path.length; i++) {
            uiPath.lineTo(path[i].dx, path[i].dy);
          }
          canvas.drawPath(uiPath, signaturePaint);
        }
      }

      final picture = recorder.endRecording();
      final image = await picture.toImage(300, 100);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);

      if (byteData == null) return null;

      final bytes = byteData.buffer.asUint8List();
      return 'data:image/png;base64,${base64Encode(bytes)}';
    } catch (e) {
      return null;
    }
  }

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    for (final path in _paths) {
      if (path.length > 1) {
        final uiPath = Path();
        uiPath.moveTo(path[0].dx, path[0].dy);
        for (int i = 1; i < path.length; i++) {
          uiPath.lineTo(path[i].dx, path[i].dy);
        }
        canvas.drawPath(uiPath, paint);
      }
    }

    if (_currentPath != null && _currentPath!.length > 1) {
      final uiPath = Path();
      uiPath.moveTo(_currentPath![0].dx, _currentPath![0].dy);
      for (int i = 1; i < _currentPath!.length; i++) {
        uiPath.lineTo(_currentPath![i].dx, _currentPath![i].dy);
      }
      canvas.drawPath(uiPath, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;

  @override
  bool? hitTest(Offset position) => null;

  @override
  SemanticsBuilderCallback? get semanticsBuilder => null;

  @override
  bool shouldRebuildSemantics(covariant CustomPainter oldDelegate) => false;
}

/// Helper function to convert bytes to base64
String base64Encode(Uint8List bytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  final result = StringBuffer();

  int i = 0;
  while (i < bytes.length) {
    final b1 = bytes[i++];
    final b2 = i < bytes.length ? bytes[i++] : 0;
    final b3 = i < bytes.length ? bytes[i++] : 0;

    result.write(chars[(b1 >> 2) & 0x3F]);
    result.write(chars[((b1 << 4) | (b2 >> 4)) & 0x3F]);
    result.write(i > bytes.length + 1 ? '=' : chars[((b2 << 2) | (b3 >> 6)) & 0x3F]);
    result.write(i > bytes.length ? '=' : chars[b3 & 0x3F]);
  }

  return result.toString();
}
