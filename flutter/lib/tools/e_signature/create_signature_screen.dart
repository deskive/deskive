import 'dart:ui' as ui;
import 'dart:typed_data';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../api/services/signature_api_service.dart';
import '../../services/workspace_management_service.dart';

/// Create Signature Screen - Draw, Type, or Upload a signature
class CreateSignatureScreen extends StatefulWidget {
  const CreateSignatureScreen({super.key});

  @override
  State<CreateSignatureScreen> createState() => _CreateSignatureScreenState();
}

class _CreateSignatureScreenState extends State<CreateSignatureScreen>
    with SingleTickerProviderStateMixin {
  final _apiService = SignatureApiService.instance;
  final _nameController = TextEditingController(text: 'My Signature');
  final _typedNameController = TextEditingController();
  final _signaturePainter = _SignaturePainter();

  late TabController _tabController;
  String _selectedFont = 'cursive';
  bool _isDefault = true;
  bool _isSaving = false;

  final List<Map<String, String>> _fonts = [
    {'name': 'Cursive', 'family': 'cursive'},
    {'name': 'Serif', 'family': 'serif'},
    {'name': 'Sans-Serif', 'family': 'sans-serif'},
    {'name': 'Monospace', 'family': 'monospace'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      setState(() {});
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _typedNameController.dispose();
    super.dispose();
  }

  void _clearSignature() {
    setState(() {
      _signaturePainter.clear();
    });
  }

  Future<void> _saveSignature() async {
    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a name for your signature'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    String signatureType;
    String signatureData;
    String? typedName;
    String? fontFamily;

    if (_tabController.index == 0) {
      // Draw mode
      if (_signaturePainter.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please draw your signature first'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      signatureType = 'drawn';
      final base64 = await _signaturePainter.toBase64();
      if (base64 == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to capture signature'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }
      signatureData = base64;
    } else {
      // Type mode
      final typed = _typedNameController.text.trim();
      if (typed.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please type your signature'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      signatureType = 'typed';
      signatureData = typed;
      typedName = typed;
      fontFamily = _selectedFont;
    }

    setState(() => _isSaving = true);

    try {
      await _apiService.createSignature(
        workspaceId: workspaceId,
        name: name,
        signatureType: signatureType,
        signatureData: signatureData,
        typedName: typedName,
        fontFamily: fontFamily,
        isDefault: _isDefault,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Signature saved successfully'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Signature'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Signature name
            TextField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'Signature Name',
                hintText: 'e.g., My Signature, Formal, Initials',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                prefixIcon: const Icon(Icons.label_outline),
              ),
            ),
            const SizedBox(height: 24),

            // Tab bar
            Container(
              decoration: BoxDecoration(
                color: isDark ? Colors.grey[800] : Colors.grey[200],
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  color: Theme.of(context).primaryColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                labelColor: Colors.white,
                unselectedLabelColor: isDark ? Colors.white70 : Colors.grey[700],
                tabs: const [
                  Tab(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.draw_outlined, size: 18),
                        SizedBox(width: 8),
                        Text('Draw'),
                      ],
                    ),
                  ),
                  Tab(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.keyboard_outlined, size: 18),
                        SizedBox(width: 8),
                        Text('Type'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Tab content
            SizedBox(
              height: 280,
              child: TabBarView(
                controller: _tabController,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _buildDrawTab(isDark),
                  _buildTypeTab(isDark),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Set as default
            CheckboxListTile(
              value: _isDefault,
              onChanged: (value) {
                setState(() => _isDefault = value ?? false);
              },
              title: const Text('Set as default signature'),
              subtitle: const Text('Use this signature by default when signing documents'),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 24),

            // Save button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _saveSignature,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Save Signature'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawTab(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Draw your signature below',
          style: TextStyle(
            fontSize: 14,
            color: isDark ? Colors.white70 : Colors.grey[600],
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                width: 2,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
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
              'Use your finger to draw',
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white54 : Colors.grey[500],
              ),
            ),
            TextButton.icon(
              onPressed: _clearSignature,
              icon: const Icon(Icons.clear, size: 18),
              label: const Text('Clear'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTypeTab(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Type your signature',
          style: TextStyle(
            fontSize: 14,
            color: isDark ? Colors.white70 : Colors.grey[600],
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _typedNameController,
          decoration: InputDecoration(
            hintText: 'Type your name',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: _selectedFont,
            fontSize: 24,
          ),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 16),
        Text(
          'Select a font style',
          style: TextStyle(
            fontSize: 12,
            color: isDark ? Colors.white54 : Colors.grey[500],
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
              final isSelected = font['family'] == _selectedFont;
              return InkWell(
                onTap: () {
                  setState(() {
                    _selectedFont = font['family']!;
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
                    font['name']!,
                    style: TextStyle(
                      fontFamily: font['family'],
                      fontSize: 14,
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
        const SizedBox(height: 16),
        // Preview
        if (_typedNameController.text.isNotEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
              ),
            ),
            child: Center(
              child: Text(
                _typedNameController.text,
                style: TextStyle(
                  fontFamily: _selectedFont,
                  fontSize: 32,
                  color: Colors.black87,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Custom painter for signature drawing
class _SignaturePainter extends ChangeNotifier implements CustomPainter {
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
      final bgPaint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill;
      canvas.drawRect(const Rect.fromLTWH(0, 0, 400, 150), bgPaint);

      // Draw signature
      final signaturePaint = Paint()
        ..color = Colors.black
        ..strokeWidth = 3.0
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
      final image = await picture.toImage(400, 150);
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
      ..strokeWidth = 3.0
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
