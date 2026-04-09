import 'dart:math' as math;
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:perfect_freehand/perfect_freehand.dart';
import '../models/whiteboard_element.dart';
import '../models/collaborator_presence.dart';

/// Custom painter for rendering whiteboard elements
class WhiteboardPainter extends CustomPainter {
  final List<WhiteboardElement> elements;
  final WhiteboardElement? currentElement;
  final Set<String> selectedElementIds;
  final Map<String, CollaboratorPresence> collaborators;
  final double scale;
  final Offset offset;
  final Map<String, ui.Image>? loadedImages;

  WhiteboardPainter({
    required this.elements,
    this.currentElement,
    required this.selectedElementIds,
    required this.collaborators,
    required this.scale,
    required this.offset,
    this.loadedImages,
  });

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();

    // Apply transform
    canvas.translate(offset.dx, offset.dy);
    canvas.scale(scale);

    // Draw grid (optional background)
    _drawGrid(canvas, size);

    // Draw all elements
    for (final element in elements) {
      if (!element.isDeleted) {
        _drawElement(canvas, element);

        // Draw selection indicator
        if (selectedElementIds.contains(element.id)) {
          _drawSelectionBorder(canvas, element);
        }
      }
    }

    // Draw current element being created
    if (currentElement != null) {
      _drawElement(canvas, currentElement!);
    }

    // Draw collaborator pointers
    for (final collaborator in collaborators.values) {
      if (collaborator.isActive) {
        _drawCollaboratorPointer(canvas, collaborator);
      }
    }

    canvas.restore();
  }

  void _drawGrid(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = Colors.grey.withOpacity(0.1)
      ..strokeWidth = 1;

    const gridSize = 20.0;
    final canvasRect = Rect.fromLTWH(
      -offset.dx / scale,
      -offset.dy / scale,
      size.width / scale,
      size.height / scale,
    );

    // Draw vertical lines
    for (double x = (canvasRect.left / gridSize).floor() * gridSize;
        x < canvasRect.right;
        x += gridSize) {
      canvas.drawLine(
        Offset(x, canvasRect.top),
        Offset(x, canvasRect.bottom),
        gridPaint,
      );
    }

    // Draw horizontal lines
    for (double y = (canvasRect.top / gridSize).floor() * gridSize;
        y < canvasRect.bottom;
        y += gridSize) {
      canvas.drawLine(
        Offset(canvasRect.left, y),
        Offset(canvasRect.right, y),
        gridPaint,
      );
    }
  }

  void _drawElement(Canvas canvas, WhiteboardElement element) {
    final strokeColor = _parseColor(element.strokeColor);
    final fillColor = _parseColor(element.backgroundColor);

    // Clamp opacity to valid range (0.0 - 1.0) to prevent errors
    // Excalidraw uses 0-100, Flutter uses 0-1
    final safeOpacity = element.opacity.clamp(0.0, 1.0);

    final strokePaint = Paint()
      ..color = strokeColor.withOpacity(safeOpacity)
      ..strokeWidth = element.strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final fillPaint = Paint()
      ..color = fillColor.withOpacity(safeOpacity)
      ..style = PaintingStyle.fill;

    canvas.save();

    // Apply rotation if needed
    if (element.angle != 0) {
      final center = Offset(
        element.x + element.width / 2,
        element.y + element.height / 2,
      );
      canvas.translate(center.dx, center.dy);
      canvas.rotate(element.angle);
      canvas.translate(-center.dx, -center.dy);
    }

    switch (element.type) {
      case ElementType.rectangle:
        _drawRectangle(canvas, element, fillPaint, strokePaint);
        break;
      case ElementType.ellipse:
        _drawEllipse(canvas, element, fillPaint, strokePaint);
        break;
      case ElementType.diamond:
        _drawDiamond(canvas, element, fillPaint, strokePaint);
        break;
      case ElementType.line:
        _drawLine(canvas, element, strokePaint);
        break;
      case ElementType.arrow:
        _drawArrow(canvas, element, strokePaint);
        break;
      case ElementType.freedraw:
        _drawFreedraw(canvas, element, strokePaint);
        break;
      case ElementType.text:
        _drawText(canvas, element);
        break;
      case ElementType.image:
        _drawImage(canvas, element);
        break;
      case ElementType.selection:
        // Selection tool doesn't draw anything
        break;
    }

    canvas.restore();
  }

  void _drawRectangle(
    Canvas canvas,
    WhiteboardElement element,
    Paint fillPaint,
    Paint strokePaint,
  ) {
    final rect = Rect.fromLTWH(element.x, element.y, element.width, element.height);
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(4));

    if (fillPaint.color != Colors.transparent) {
      canvas.drawRRect(rrect, fillPaint);
    }
    canvas.drawRRect(rrect, strokePaint);
  }

  void _drawEllipse(
    Canvas canvas,
    WhiteboardElement element,
    Paint fillPaint,
    Paint strokePaint,
  ) {
    final rect = Rect.fromLTWH(element.x, element.y, element.width, element.height);

    if (fillPaint.color != Colors.transparent) {
      canvas.drawOval(rect, fillPaint);
    }
    canvas.drawOval(rect, strokePaint);
  }

  void _drawDiamond(
    Canvas canvas,
    WhiteboardElement element,
    Paint fillPaint,
    Paint strokePaint,
  ) {
    final path = Path();
    final cx = element.x + element.width / 2;
    final cy = element.y + element.height / 2;

    path.moveTo(cx, element.y); // Top
    path.lineTo(element.x + element.width, cy); // Right
    path.lineTo(cx, element.y + element.height); // Bottom
    path.lineTo(element.x, cy); // Left
    path.close();

    if (fillPaint.color != Colors.transparent) {
      canvas.drawPath(path, fillPaint);
    }
    canvas.drawPath(path, strokePaint);
  }

  void _drawLine(
    Canvas canvas,
    WhiteboardElement element,
    Paint strokePaint,
  ) {
    if (element.points != null && element.points!.length >= 2) {
      final path = Path();
      path.moveTo(element.points![0][0], element.points![0][1]);

      for (int i = 1; i < element.points!.length; i++) {
        path.lineTo(element.points![i][0], element.points![i][1]);
      }

      canvas.drawPath(path, strokePaint);
    } else {
      // Simple two-point line using element bounds
      canvas.drawLine(
        Offset(element.x, element.y),
        Offset(element.x + element.width, element.y + element.height),
        strokePaint,
      );
    }
  }

  void _drawArrow(
    Canvas canvas,
    WhiteboardElement element,
    Paint strokePaint,
  ) {
    Offset start;
    Offset end;

    if (element.points != null && element.points!.length >= 2) {
      start = Offset(element.points!.first[0], element.points!.first[1]);
      end = Offset(element.points!.last[0], element.points!.last[1]);
    } else {
      start = Offset(element.x, element.y);
      end = Offset(element.x + element.width, element.y + element.height);
    }

    // Draw the line
    canvas.drawLine(start, end, strokePaint);

    // Draw arrowhead at end
    if (element.endArrowhead != 'none' || element.endArrowhead == null) {
      _drawArrowhead(canvas, start, end, strokePaint);
    }

    // Draw arrowhead at start if specified
    if (element.startArrowhead != null && element.startArrowhead != 'none') {
      _drawArrowhead(canvas, end, start, strokePaint);
    }
  }

  void _drawArrowhead(Canvas canvas, Offset from, Offset to, Paint paint) {
    final arrowSize = paint.strokeWidth * 4;
    final angle = math.atan2(to.dy - from.dy, to.dx - from.dx);

    final arrowPath = Path();
    arrowPath.moveTo(to.dx, to.dy);
    arrowPath.lineTo(
      to.dx - arrowSize * math.cos(angle - math.pi / 6),
      to.dy - arrowSize * math.sin(angle - math.pi / 6),
    );
    arrowPath.moveTo(to.dx, to.dy);
    arrowPath.lineTo(
      to.dx - arrowSize * math.cos(angle + math.pi / 6),
      to.dy - arrowSize * math.sin(angle + math.pi / 6),
    );

    canvas.drawPath(arrowPath, paint);
  }

  void _drawFreedraw(
    Canvas canvas,
    WhiteboardElement element,
    Paint strokePaint,
  ) {
    if (element.points == null || element.points!.isEmpty) return;

    // Convert points to perfect_freehand format
    final inputPoints = element.points!.map((p) {
      final pressure = p.length > 2 ? p[2] : 0.5;
      return PointVector(p[0], p[1], pressure);
    }).toList();

    // Get stroke outline using perfect_freehand
    final outlinePoints = getStroke(
      inputPoints,
      options: StrokeOptions(
        size: element.strokeWidth * 2,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: true,
        start: StrokeEndOptions.start(cap: true),
        end: StrokeEndOptions.end(cap: true),
      ),
    );

    if (outlinePoints.isEmpty) return;

    // Create path from outline points (getStroke returns List<Offset>)
    final path = Path();
    path.moveTo(outlinePoints.first.dx, outlinePoints.first.dy);

    for (int i = 1; i < outlinePoints.length; i++) {
      path.lineTo(outlinePoints[i].dx, outlinePoints[i].dy);
    }

    path.close();

    // Fill the stroke path
    final fillPaint = Paint()
      ..color = strokePaint.color
      ..style = PaintingStyle.fill;

    canvas.drawPath(path, fillPaint);
  }

  void _drawText(Canvas canvas, WhiteboardElement element) {
    if (element.text == null || element.text!.isEmpty) return;

    final textStyle = TextStyle(
      color: _parseColor(element.strokeColor).withOpacity(element.opacity),
      fontSize: element.fontSize ?? 20,
      fontFamily: element.fontFamily,
    );

    final textSpan = TextSpan(text: element.text, style: textStyle);
    final textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
      textAlign: _parseTextAlign(element.textAlign),
    );

    textPainter.layout(maxWidth: element.width > 0 ? element.width : double.infinity);
    textPainter.paint(canvas, Offset(element.x, element.y));
  }

  void _drawImage(Canvas canvas, WhiteboardElement element) {
    if (element.imageUrl == null) return;

    // Check if image is loaded
    final image = loadedImages?[element.imageUrl];
    if (image != null) {
      final srcRect = Rect.fromLTWH(
        0,
        0,
        image.width.toDouble(),
        image.height.toDouble(),
      );
      final dstRect = Rect.fromLTWH(
        element.x,
        element.y,
        element.width,
        element.height,
      );

      canvas.drawImageRect(
        image,
        srcRect,
        dstRect,
        Paint()..filterQuality = FilterQuality.high,
      );
    } else {
      // Draw placeholder
      final rect = Rect.fromLTWH(element.x, element.y, element.width, element.height);
      final placeholderPaint = Paint()
        ..color = Colors.grey.shade200
        ..style = PaintingStyle.fill;

      canvas.drawRect(rect, placeholderPaint);

      // Draw image icon
      final iconPaint = Paint()
        ..color = Colors.grey.shade400
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2;

      final iconSize = math.min(element.width, element.height) * 0.3;
      final iconCenter = Offset(
        element.x + element.width / 2,
        element.y + element.height / 2,
      );

      canvas.drawRect(
        Rect.fromCenter(center: iconCenter, width: iconSize, height: iconSize * 0.8),
        iconPaint,
      );
    }
  }

  void _drawSelectionBorder(Canvas canvas, WhiteboardElement element) {
    final rect = element.boundingRect;
    final selectionPaint = Paint()
      ..color = Colors.blue
      ..strokeWidth = 2 / scale
      ..style = PaintingStyle.stroke;

    // Draw selection rectangle
    canvas.drawRect(rect.inflate(4 / scale), selectionPaint);

    // Draw resize handles
    final handleSize = 8 / scale;
    final handlePaint = Paint()
      ..color = Colors.blue
      ..style = PaintingStyle.fill;

    final handles = [
      rect.topLeft,
      rect.topCenter,
      rect.topRight,
      rect.centerLeft,
      rect.centerRight,
      rect.bottomLeft,
      rect.bottomCenter,
      rect.bottomRight,
    ];

    for (final handle in handles) {
      canvas.drawCircle(handle, handleSize / 2, handlePaint);
    }
  }

  void _drawCollaboratorPointer(Canvas canvas, CollaboratorPresence collaborator) {
    final pointerPath = Path();
    final x = collaborator.pointerX;
    final y = collaborator.pointerY;

    // Draw cursor shape
    pointerPath.moveTo(x, y);
    pointerPath.lineTo(x, y + 18);
    pointerPath.lineTo(x + 5, y + 14);
    pointerPath.lineTo(x + 12, y + 14);
    pointerPath.close();

    final cursorPaint = Paint()
      ..color = collaborator.odontColor
      ..style = PaintingStyle.fill;

    final cursorBorderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    canvas.drawPath(pointerPath, cursorPaint);
    canvas.drawPath(pointerPath, cursorBorderPaint);

    // Draw name label
    final labelStyle = TextStyle(
      color: Colors.white,
      fontSize: 10,
      fontWeight: FontWeight.w500,
    );

    final labelSpan = TextSpan(text: collaborator.odontName, style: labelStyle);
    final labelPainter = TextPainter(
      text: labelSpan,
      textDirection: TextDirection.ltr,
    );

    labelPainter.layout();

    final labelRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        x + 14,
        y + 10,
        labelPainter.width + 8,
        labelPainter.height + 4,
      ),
      const Radius.circular(4),
    );

    canvas.drawRRect(
      labelRect,
      Paint()..color = collaborator.odontColor,
    );

    labelPainter.paint(canvas, Offset(x + 18, y + 12));
  }

  Color _parseColor(String colorString) {
    if (colorString == 'transparent') {
      return Colors.transparent;
    }

    try {
      final hex = colorString.replaceFirst('#', '');
      if (hex.length == 6) {
        return Color(int.parse('FF$hex', radix: 16));
      } else if (hex.length == 8) {
        return Color(int.parse(hex, radix: 16));
      }
    } catch (e) {
      // Fallback to black
    }

    return Colors.black;
  }

  TextAlign _parseTextAlign(String? align) {
    switch (align) {
      case 'center':
        return TextAlign.center;
      case 'right':
        return TextAlign.right;
      default:
        return TextAlign.left;
    }
  }

  @override
  bool shouldRepaint(WhiteboardPainter oldDelegate) {
    return true; // Always repaint for smooth interaction
  }
}
