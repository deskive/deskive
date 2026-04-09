import 'package:flutter/material.dart';
import '../models/whiteboard_element.dart';

/// Enum for available whiteboard tools
enum WhiteboardTool {
  selection,
  hand,
  rectangle,
  diamond,
  ellipse,
  arrow,
  line,
  freedraw,
  text,
  image,
  eraser,
}

/// Extension for tool properties
extension WhiteboardToolExtension on WhiteboardTool {
  IconData get icon {
    switch (this) {
      case WhiteboardTool.selection:
        return Icons.near_me;
      case WhiteboardTool.hand:
        return Icons.pan_tool_outlined;
      case WhiteboardTool.rectangle:
        return Icons.crop_square;
      case WhiteboardTool.diamond:
        return Icons.diamond_outlined;
      case WhiteboardTool.ellipse:
        return Icons.circle_outlined;
      case WhiteboardTool.arrow:
        return Icons.arrow_forward;
      case WhiteboardTool.line:
        return Icons.horizontal_rule;
      case WhiteboardTool.freedraw:
        return Icons.brush;
      case WhiteboardTool.text:
        return Icons.text_fields;
      case WhiteboardTool.image:
        return Icons.image_outlined;
      case WhiteboardTool.eraser:
        return Icons.auto_fix_high;
    }
  }

  String get label {
    switch (this) {
      case WhiteboardTool.selection:
        return 'Select';
      case WhiteboardTool.hand:
        return 'Pan';
      case WhiteboardTool.rectangle:
        return 'Rectangle';
      case WhiteboardTool.diamond:
        return 'Diamond';
      case WhiteboardTool.ellipse:
        return 'Ellipse';
      case WhiteboardTool.arrow:
        return 'Arrow';
      case WhiteboardTool.line:
        return 'Line';
      case WhiteboardTool.freedraw:
        return 'Draw';
      case WhiteboardTool.text:
        return 'Text';
      case WhiteboardTool.image:
        return 'Image';
      case WhiteboardTool.eraser:
        return 'Eraser';
    }
  }

  ElementType? get elementType {
    switch (this) {
      case WhiteboardTool.rectangle:
        return ElementType.rectangle;
      case WhiteboardTool.diamond:
        return ElementType.diamond;
      case WhiteboardTool.ellipse:
        return ElementType.ellipse;
      case WhiteboardTool.arrow:
        return ElementType.arrow;
      case WhiteboardTool.line:
        return ElementType.line;
      case WhiteboardTool.freedraw:
        return ElementType.freedraw;
      case WhiteboardTool.text:
        return ElementType.text;
      case WhiteboardTool.image:
        return ElementType.image;
      default:
        return null;
    }
  }
}

/// Main toolbar widget for the whiteboard
class WhiteboardToolbar extends StatelessWidget {
  final WhiteboardTool selectedTool;
  final Function(WhiteboardTool) onToolChanged;
  final Color strokeColor;
  final Function(Color) onStrokeColorChanged;
  final Color backgroundColor;
  final Function(Color) onBackgroundColorChanged;
  final double strokeWidth;
  final Function(double) onStrokeWidthChanged;
  final VoidCallback onUndo;
  final VoidCallback onRedo;
  final bool canUndo;
  final bool canRedo;

  const WhiteboardToolbar({
    super.key,
    required this.selectedTool,
    required this.onToolChanged,
    required this.strokeColor,
    required this.onStrokeColorChanged,
    required this.backgroundColor,
    required this.onBackgroundColorChanged,
    required this.strokeWidth,
    required this.onStrokeWidthChanged,
    required this.onUndo,
    required this.onRedo,
    this.canUndo = true,
    this.canRedo = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        border: Border(
          bottom: BorderSide(
            color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
          ),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Selection & Hand tools
              _buildToolButton(context, WhiteboardTool.selection),
              _buildToolButton(context, WhiteboardTool.hand),
              _buildDivider(isDark),

              // Shape tools
              _buildToolButton(context, WhiteboardTool.rectangle),
              _buildToolButton(context, WhiteboardTool.ellipse),
              _buildToolButton(context, WhiteboardTool.diamond),
              _buildDivider(isDark),

              // Drawing tools
              _buildToolButton(context, WhiteboardTool.freedraw),
              _buildToolButton(context, WhiteboardTool.line),
              _buildToolButton(context, WhiteboardTool.arrow),
              _buildDivider(isDark),

              // Content tools
              _buildToolButton(context, WhiteboardTool.text),
              _buildToolButton(context, WhiteboardTool.image),
              _buildToolButton(context, WhiteboardTool.eraser),
              _buildDivider(isDark),

              // Color pickers
              _buildColorButton(
                context,
                strokeColor,
                'Stroke',
                () => _showColorPicker(context, strokeColor, onStrokeColorChanged),
              ),
              _buildColorButton(
                context,
                backgroundColor,
                'Fill',
                () => _showColorPicker(context, backgroundColor, onBackgroundColorChanged),
              ),
              _buildDivider(isDark),

              // Stroke width
              _buildStrokeWidthButton(context),
              _buildDivider(isDark),

              // Undo/Redo
              IconButton(
                icon: const Icon(Icons.undo),
                onPressed: canUndo ? onUndo : null,
                tooltip: 'Undo',
                iconSize: 20,
              ),
              IconButton(
                icon: const Icon(Icons.redo),
                onPressed: canRedo ? onRedo : null,
                tooltip: 'Redo',
                iconSize: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildToolButton(BuildContext context, WhiteboardTool tool) {
    final isSelected = selectedTool == tool;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Tooltip(
      message: tool.label,
      child: InkWell(
        onTap: () => onToolChanged(tool),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? Colors.blue.shade800 : Colors.blue.shade100)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            tool.icon,
            size: 20,
            color: isSelected
                ? (isDark ? Colors.white : Colors.blue.shade700)
                : (isDark ? Colors.white70 : Colors.black87),
          ),
        ),
      ),
    );
  }

  Widget _buildDivider(bool isDark) {
    return Container(
      width: 1,
      height: 24,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
    );
  }

  Widget _buildColorButton(
    BuildContext context,
    Color color,
    String label,
    VoidCallback onTap,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Tooltip(
      message: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: 40,
          height: 40,
          padding: const EdgeInsets.all(8),
          child: Container(
            decoration: BoxDecoration(
              color: color == Colors.transparent ? null : color,
              border: Border.all(
                color: isDark ? Colors.white54 : Colors.black54,
                width: 1.5,
              ),
              borderRadius: BorderRadius.circular(4),
            ),
            child: color == Colors.transparent
                ? CustomPaint(
                    painter: _TransparentPatternPainter(),
                  )
                : null,
          ),
        ),
      ),
    );
  }

  Widget _buildStrokeWidthButton(BuildContext context) {
    return PopupMenuButton<double>(
      tooltip: 'Stroke Width',
      onSelected: onStrokeWidthChanged,
      itemBuilder: (context) => [
        _buildStrokeWidthItem(1, 'Thin'),
        _buildStrokeWidthItem(2, 'Regular'),
        _buildStrokeWidthItem(4, 'Bold'),
        _buildStrokeWidthItem(6, 'Extra Bold'),
      ],
      child: Container(
        width: 40,
        height: 40,
        padding: const EdgeInsets.all(8),
        child: Center(
          child: Container(
            width: 20,
            height: strokeWidth.clamp(1, 8),
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.dark
                  ? Colors.white70
                  : Colors.black87,
              borderRadius: BorderRadius.circular(strokeWidth / 2),
            ),
          ),
        ),
      ),
    );
  }

  PopupMenuItem<double> _buildStrokeWidthItem(double width, String label) {
    return PopupMenuItem<double>(
      value: width,
      child: Row(
        children: [
          Container(
            width: 40,
            height: width.clamp(1, 8),
            decoration: BoxDecoration(
              color: Colors.black87,
              borderRadius: BorderRadius.circular(width / 2),
            ),
          ),
          const SizedBox(width: 12),
          Text(label),
          if (strokeWidth == width) ...[
            const Spacer(),
            const Icon(Icons.check, size: 16),
          ],
        ],
      ),
    );
  }

  void _showColorPicker(
    BuildContext context,
    Color currentColor,
    Function(Color) onColorSelected,
  ) {
    showModalBottomSheet(
      context: context,
      builder: (context) => _ColorPickerSheet(
        currentColor: currentColor,
        onColorSelected: (color) {
          onColorSelected(color);
          Navigator.pop(context);
        },
      ),
    );
  }
}

/// Color picker bottom sheet
class _ColorPickerSheet extends StatelessWidget {
  final Color currentColor;
  final Function(Color) onColorSelected;

  const _ColorPickerSheet({
    required this.currentColor,
    required this.onColorSelected,
  });

  static const List<Color> colors = [
    Colors.transparent,
    Colors.black,
    Colors.white,
    Color(0xFFE91E63), // Pink
    Color(0xFFF44336), // Red
    Color(0xFFFF9800), // Orange
    Color(0xFFFFEB3B), // Yellow
    Color(0xFF4CAF50), // Green
    Color(0xFF00BCD4), // Cyan
    Color(0xFF2196F3), // Blue
    Color(0xFF673AB7), // Deep Purple
    Color(0xFF9C27B0), // Purple
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Choose Color',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: colors.map((color) {
              final isSelected = currentColor == color;
              return GestureDetector(
                onTap: () => onColorSelected(color),
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: color == Colors.transparent ? null : color,
                    border: Border.all(
                      color: isSelected ? Colors.blue : Colors.grey.shade400,
                      width: isSelected ? 3 : 1,
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: color == Colors.transparent
                      ? CustomPaint(
                          painter: _TransparentPatternPainter(),
                        )
                      : isSelected
                          ? const Icon(Icons.check, color: Colors.white)
                          : null,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

/// Painter for transparent pattern (checkerboard)
class _TransparentPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const cellSize = 6.0;
    final paint1 = Paint()..color = Colors.grey.shade300;
    final paint2 = Paint()..color = Colors.grey.shade100;

    for (double x = 0; x < size.width; x += cellSize) {
      for (double y = 0; y < size.height; y += cellSize) {
        final isEven = ((x / cellSize).floor() + (y / cellSize).floor()) % 2 == 0;
        canvas.drawRect(
          Rect.fromLTWH(x, y, cellSize, cellSize),
          isEven ? paint1 : paint2,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Floating action toolbar for quick access
class WhiteboardFloatingToolbar extends StatelessWidget {
  final VoidCallback onZoomIn;
  final VoidCallback onZoomOut;
  final VoidCallback onZoomReset;
  final VoidCallback onToggleGrid;
  final bool showGrid;
  final double zoomLevel;

  const WhiteboardFloatingToolbar({
    super.key,
    required this.onZoomIn,
    required this.onZoomOut,
    required this.onZoomReset,
    required this.onToggleGrid,
    required this.showGrid,
    required this.zoomLevel,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: onZoomIn,
            tooltip: 'Zoom In',
            iconSize: 20,
          ),
          Text(
            '${(zoomLevel * 100).round()}%',
            style: TextStyle(
              fontSize: 10,
              color: isDark ? Colors.white70 : Colors.black54,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.remove),
            onPressed: onZoomOut,
            tooltip: 'Zoom Out',
            iconSize: 20,
          ),
          const Divider(height: 16),
          IconButton(
            icon: const Icon(Icons.fit_screen),
            onPressed: onZoomReset,
            tooltip: 'Reset Zoom',
            iconSize: 20,
          ),
          IconButton(
            icon: Icon(showGrid ? Icons.grid_on : Icons.grid_off),
            onPressed: onToggleGrid,
            tooltip: showGrid ? 'Hide Grid' : 'Show Grid',
            iconSize: 20,
          ),
        ],
      ),
    );
  }
}
