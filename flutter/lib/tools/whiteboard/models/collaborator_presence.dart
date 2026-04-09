import 'dart:ui';

/// Represents a collaborator's presence in a whiteboard session
class CollaboratorPresence {
  final String odontId;
  final String odontName;
  final String? odontAvatar;
  final Color odontColor;
  double pointerX;
  double pointerY;
  String? selectedElementId;
  DateTime lastSeen;
  bool isActive;

  CollaboratorPresence({
    required this.odontId,
    required this.odontName,
    this.odontAvatar,
    Color? odontColor,
    this.pointerX = 0,
    this.pointerY = 0,
    this.selectedElementId,
    DateTime? lastSeen,
    this.isActive = true,
  })  : odontColor = odontColor ?? _generateColor(odontId),
        lastSeen = lastSeen ?? DateTime.now();

  /// Generate a consistent color based on user ID
  static Color _generateColor(String odontId) {
    final colors = [
      const Color(0xFFE91E63), // Pink
      const Color(0xFF9C27B0), // Purple
      const Color(0xFF673AB7), // Deep Purple
      const Color(0xFF3F51B5), // Indigo
      const Color(0xFF2196F3), // Blue
      const Color(0xFF03A9F4), // Light Blue
      const Color(0xFF00BCD4), // Cyan
      const Color(0xFF009688), // Teal
      const Color(0xFF4CAF50), // Green
      const Color(0xFF8BC34A), // Light Green
      const Color(0xFFFF9800), // Orange
      const Color(0xFFFF5722), // Deep Orange
    ];

    final hash = odontId.hashCode.abs();
    return colors[hash % colors.length];
  }

  /// Update pointer position
  CollaboratorPresence updatePointer(double x, double y) {
    return CollaboratorPresence(
      odontId: odontId,
      odontName: odontName,
      odontAvatar: odontAvatar,
      odontColor: odontColor,
      pointerX: x,
      pointerY: y,
      selectedElementId: selectedElementId,
      lastSeen: DateTime.now(),
      isActive: true,
    );
  }

  /// Update selected element
  CollaboratorPresence updateSelection(String? elementId) {
    return CollaboratorPresence(
      odontId: odontId,
      odontName: odontName,
      odontAvatar: odontAvatar,
      odontColor: odontColor,
      pointerX: pointerX,
      pointerY: pointerY,
      selectedElementId: elementId,
      lastSeen: DateTime.now(),
      isActive: true,
    );
  }

  /// Mark as inactive
  CollaboratorPresence markInactive() {
    return CollaboratorPresence(
      odontId: odontId,
      odontName: odontName,
      odontAvatar: odontAvatar,
      odontColor: odontColor,
      pointerX: pointerX,
      pointerY: pointerY,
      selectedElementId: selectedElementId,
      lastSeen: lastSeen,
      isActive: false,
    );
  }

  /// Get pointer offset
  Offset get pointerOffset => Offset(pointerX, pointerY);

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'odontId': odontId,
      'odontName': odontName,
      if (odontAvatar != null) 'odontAvatar': odontAvatar,
      'odontColor': '#${odontColor.value.toRadixString(16).padLeft(8, '0')}',
      'pointerX': pointerX,
      'pointerY': pointerY,
      if (selectedElementId != null) 'selectedElementId': selectedElementId,
      'lastSeen': lastSeen.toIso8601String(),
      'isActive': isActive,
    };
  }

  /// Create from JSON
  factory CollaboratorPresence.fromJson(Map<String, dynamic> json) {
    Color? color;
    if (json['odontColor'] != null) {
      final colorStr = (json['odontColor'] as String).replaceFirst('#', '');
      color = Color(int.parse(colorStr, radix: 16));
    }

    return CollaboratorPresence(
      odontId: json['odontId'] as String? ?? json['userId'] as String? ?? '',
      odontName: json['odontName'] as String? ?? json['userName'] as String? ?? 'Unknown',
      odontAvatar: json['odontAvatar'] as String? ?? json['userAvatar'] as String?,
      odontColor: color,
      pointerX: (json['pointerX'] as num?)?.toDouble() ?? (json['x'] as num?)?.toDouble() ?? 0,
      pointerY: (json['pointerY'] as num?)?.toDouble() ?? (json['y'] as num?)?.toDouble() ?? 0,
      selectedElementId: json['selectedElementId'] as String?,
      lastSeen: json['lastSeen'] != null
          ? DateTime.parse(json['lastSeen'] as String)
          : DateTime.now(),
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  @override
  String toString() {
    return 'CollaboratorPresence(odontId: $odontId, odontName: $odontName, pointer: ($pointerX, $pointerY))';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is CollaboratorPresence && other.odontId == odontId;
  }

  @override
  int get hashCode => odontId.hashCode;
}
