import 'dart:ui';
import 'package:uuid/uuid.dart';

/// Enum representing different types of whiteboard elements
enum ElementType {
  selection,
  rectangle,
  diamond,
  ellipse,
  arrow,
  line,
  freedraw,
  text,
  image,
}

/// Extension to convert ElementType to/from string for JSON serialization
extension ElementTypeExtension on ElementType {
  String get value {
    switch (this) {
      case ElementType.selection:
        return 'selection';
      case ElementType.rectangle:
        return 'rectangle';
      case ElementType.diamond:
        return 'diamond';
      case ElementType.ellipse:
        return 'ellipse';
      case ElementType.arrow:
        return 'arrow';
      case ElementType.line:
        return 'line';
      case ElementType.freedraw:
        return 'freedraw';
      case ElementType.text:
        return 'text';
      case ElementType.image:
        return 'image';
    }
  }

  static ElementType fromString(String value) {
    switch (value) {
      case 'selection':
        return ElementType.selection;
      case 'rectangle':
        return ElementType.rectangle;
      case 'diamond':
        return ElementType.diamond;
      case 'ellipse':
        return ElementType.ellipse;
      case 'arrow':
        return ElementType.arrow;
      case 'line':
        return ElementType.line;
      case 'freedraw':
        return ElementType.freedraw;
      case 'text':
        return ElementType.text;
      case 'image':
        return ElementType.image;
      default:
        return ElementType.rectangle;
    }
  }
}

/// Represents a single element on the whiteboard canvas
class WhiteboardElement {
  final String id;
  final ElementType type;
  double x;
  double y;
  double width;
  double height;
  double angle;
  String strokeColor;
  String backgroundColor;
  double strokeWidth;
  double opacity;
  String? text;
  double? fontSize;
  String? fontFamily;
  String? textAlign;
  List<List<double>>? points; // For freedraw/lines [[x, y, pressure], ...]
  String? imageUrl;
  int version;
  int versionNonce;
  bool isDeleted;
  DateTime? updated;

  // Arrow-specific properties
  String? startArrowhead; // none, arrow, bar, dot, triangle
  String? endArrowhead;
  List<List<double>>? startBinding;
  List<List<double>>? endBinding;

  WhiteboardElement({
    String? id,
    required this.type,
    this.x = 0,
    this.y = 0,
    this.width = 100,
    this.height = 100,
    this.angle = 0,
    this.strokeColor = '#000000',
    this.backgroundColor = 'transparent',
    this.strokeWidth = 2,
    this.opacity = 1.0,
    this.text,
    this.fontSize = 20,
    this.fontFamily = 'Virgil',
    this.textAlign = 'left',
    this.points,
    this.imageUrl,
    this.version = 1,
    int? versionNonce,
    this.isDeleted = false,
    this.updated,
    this.startArrowhead,
    this.endArrowhead,
    this.startBinding,
    this.endBinding,
  })  : id = id ?? const Uuid().v4(),
        versionNonce = versionNonce ?? DateTime.now().millisecondsSinceEpoch;

  /// Create a copy with updated values
  WhiteboardElement copyWith({
    String? id,
    ElementType? type,
    double? x,
    double? y,
    double? width,
    double? height,
    double? angle,
    String? strokeColor,
    String? backgroundColor,
    double? strokeWidth,
    double? opacity,
    String? text,
    double? fontSize,
    String? fontFamily,
    String? textAlign,
    List<List<double>>? points,
    String? imageUrl,
    int? version,
    int? versionNonce,
    bool? isDeleted,
    DateTime? updated,
    String? startArrowhead,
    String? endArrowhead,
    List<List<double>>? startBinding,
    List<List<double>>? endBinding,
  }) {
    return WhiteboardElement(
      id: id ?? this.id,
      type: type ?? this.type,
      x: x ?? this.x,
      y: y ?? this.y,
      width: width ?? this.width,
      height: height ?? this.height,
      angle: angle ?? this.angle,
      strokeColor: strokeColor ?? this.strokeColor,
      backgroundColor: backgroundColor ?? this.backgroundColor,
      strokeWidth: strokeWidth ?? this.strokeWidth,
      opacity: opacity ?? this.opacity,
      text: text ?? this.text,
      fontSize: fontSize ?? this.fontSize,
      fontFamily: fontFamily ?? this.fontFamily,
      textAlign: textAlign ?? this.textAlign,
      points: points ?? this.points,
      imageUrl: imageUrl ?? this.imageUrl,
      version: version ?? this.version,
      versionNonce: versionNonce ?? this.versionNonce,
      isDeleted: isDeleted ?? this.isDeleted,
      updated: updated ?? this.updated,
      startArrowhead: startArrowhead ?? this.startArrowhead,
      endArrowhead: endArrowhead ?? this.endArrowhead,
      startBinding: startBinding ?? this.startBinding,
      endBinding: endBinding ?? this.endBinding,
    );
  }

  /// Increment version for updates
  WhiteboardElement incrementVersion() {
    return copyWith(
      version: version + 1,
      versionNonce: DateTime.now().millisecondsSinceEpoch,
      updated: DateTime.now(),
    );
  }

  /// Mark element as deleted (soft delete)
  WhiteboardElement markDeleted() {
    return copyWith(
      isDeleted: true,
      version: version + 1,
      versionNonce: DateTime.now().millisecondsSinceEpoch,
      updated: DateTime.now(),
    );
  }

  /// Get bounding rect for hit testing
  Rect get boundingRect {
    if (type == ElementType.freedraw && points != null && points!.isNotEmpty) {
      double minX = double.infinity;
      double minY = double.infinity;
      double maxX = double.negativeInfinity;
      double maxY = double.negativeInfinity;

      for (final point in points!) {
        if (point[0] < minX) minX = point[0];
        if (point[1] < minY) minY = point[1];
        if (point[0] > maxX) maxX = point[0];
        if (point[1] > maxY) maxY = point[1];
      }

      return Rect.fromLTRB(minX, minY, maxX, maxY);
    }

    return Rect.fromLTWH(x, y, width, height);
  }

  /// Check if a point is inside this element
  bool containsPoint(Offset point) {
    final rect = boundingRect.inflate(strokeWidth / 2);
    return rect.contains(point);
  }

  /// Convert to JSON for API/WebSocket
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.value,
      'x': x,
      'y': y,
      'width': width,
      'height': height,
      'angle': angle,
      'strokeColor': strokeColor,
      'backgroundColor': backgroundColor,
      'strokeWidth': strokeWidth,
      // Convert Flutter opacity (0-1) to Excalidraw format (0-100)
      'opacity': _toExcalidrawOpacity(opacity),
      if (text != null) 'text': text,
      if (fontSize != null) 'fontSize': fontSize,
      if (fontFamily != null) 'fontFamily': fontFamily,
      if (textAlign != null) 'textAlign': textAlign,
      if (points != null) 'points': points,
      if (imageUrl != null) 'imageUrl': imageUrl,
      'version': version,
      'versionNonce': versionNonce,
      'isDeleted': isDeleted,
      if (updated != null) 'updated': updated!.toIso8601String(),
      if (startArrowhead != null) 'startArrowhead': startArrowhead,
      if (endArrowhead != null) 'endArrowhead': endArrowhead,
      if (startBinding != null) 'startBinding': startBinding,
      if (endBinding != null) 'endBinding': endBinding,
    };
  }

  /// Create from JSON
  factory WhiteboardElement.fromJson(Map<String, dynamic> json) {
    // Parse id - might be int or String
    final id = json['id']?.toString();

    // Parse version - might be int or String
    int version = 1;
    if (json['version'] != null) {
      version = int.tryParse(json['version'].toString()) ?? 1;
    }

    // Parse versionNonce - might be int or String
    int? versionNonce;
    if (json['versionNonce'] != null) {
      versionNonce = int.tryParse(json['versionNonce'].toString());
    }

    // Parse updated date safely
    DateTime? updated;
    if (json['updated'] != null) {
      try {
        updated = DateTime.tryParse(json['updated'].toString());
      } catch (_) {
        updated = null;
      }
    }

    // Parse points safely
    List<List<double>>? points;
    if (json['points'] != null && json['points'] is List) {
      try {
        points = (json['points'] as List).map((p) {
          if (p is List) {
            return p.map((v) => (v as num).toDouble()).toList();
          }
          return <double>[];
        }).toList();
      } catch (_) {
        points = null;
      }
    }

    // Parse bindings safely
    List<List<double>>? startBinding;
    if (json['startBinding'] != null && json['startBinding'] is List) {
      try {
        startBinding = (json['startBinding'] as List).map((p) {
          if (p is List) {
            return p.map((v) => (v as num).toDouble()).toList();
          }
          return <double>[];
        }).toList();
      } catch (_) {
        startBinding = null;
      }
    }

    List<List<double>>? endBinding;
    if (json['endBinding'] != null && json['endBinding'] is List) {
      try {
        endBinding = (json['endBinding'] as List).map((p) {
          if (p is List) {
            return p.map((v) => (v as num).toDouble()).toList();
          }
          return <double>[];
        }).toList();
      } catch (_) {
        endBinding = null;
      }
    }

    return WhiteboardElement(
      id: id,
      type: ElementTypeExtension.fromString(json['type']?.toString() ?? 'rectangle'),
      x: (json['x'] as num?)?.toDouble() ?? 0,
      y: (json['y'] as num?)?.toDouble() ?? 0,
      width: (json['width'] as num?)?.toDouble() ?? 100,
      height: (json['height'] as num?)?.toDouble() ?? 100,
      angle: (json['angle'] as num?)?.toDouble() ?? 0,
      strokeColor: json['strokeColor']?.toString() ?? '#000000',
      backgroundColor: json['backgroundColor']?.toString() ?? 'transparent',
      strokeWidth: (json['strokeWidth'] as num?)?.toDouble() ?? 2,
      // Excalidraw uses 0-100 for opacity, Flutter uses 0-1
      // Convert if value > 1 (Excalidraw format) to Flutter format
      opacity: _normalizeOpacity((json['opacity'] as num?)?.toDouble() ?? 1.0),
      text: json['text']?.toString(),
      fontSize: (json['fontSize'] as num?)?.toDouble(),
      fontFamily: json['fontFamily']?.toString(),
      textAlign: json['textAlign']?.toString(),
      points: points,
      imageUrl: json['imageUrl']?.toString(),
      version: version,
      versionNonce: versionNonce,
      isDeleted: json['isDeleted'] as bool? ?? false,
      updated: updated,
      startArrowhead: json['startArrowhead']?.toString(),
      endArrowhead: json['endArrowhead']?.toString(),
      startBinding: startBinding,
      endBinding: endBinding,
    );
  }

  @override
  String toString() {
    return 'WhiteboardElement(id: $id, type: ${type.value}, x: $x, y: $y, width: $width, height: $height)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is WhiteboardElement && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  /// Normalize opacity from Excalidraw format (0-100) to Flutter format (0-1)
  static double _normalizeOpacity(double value) {
    // If value is > 1, it's in Excalidraw format (0-100), convert to 0-1
    if (value > 1) {
      return (value / 100).clamp(0.0, 1.0);
    }
    // Already in Flutter format (0-1), just clamp to be safe
    return value.clamp(0.0, 1.0);
  }

  /// Convert opacity from Flutter format (0-1) to Excalidraw format (0-100)
  static double _toExcalidrawOpacity(double value) {
    // Convert from 0-1 to 0-100 for Excalidraw compatibility
    return (value * 100).clamp(0, 100);
  }
}
