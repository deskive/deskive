/// Represents a single Google Calendar from the user's Google account
class GoogleCalendarInfo {
  final String id;
  final String name;
  final String? color;
  final bool primary;
  final String? description;

  GoogleCalendarInfo({
    required this.id,
    required this.name,
    this.color,
    this.primary = false,
    this.description,
  });

  factory GoogleCalendarInfo.fromJson(Map<String, dynamic> json) {
    return GoogleCalendarInfo(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ??
            json['summary'] as String? ??
            'Unnamed Calendar',
      color: json['color'] as String? ??
             json['backgroundColor'] as String?,
      primary: json['primary'] as bool? ?? false,
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    if (color != null) 'color': color,
    'primary': primary,
    if (description != null) 'description': description,
  };

  GoogleCalendarInfo copyWith({
    String? id,
    String? name,
    String? color,
    bool? primary,
    String? description,
  }) {
    return GoogleCalendarInfo(
      id: id ?? this.id,
      name: name ?? this.name,
      color: color ?? this.color,
      primary: primary ?? this.primary,
      description: description ?? this.description,
    );
  }

  @override
  String toString() {
    return 'GoogleCalendarInfo(id: $id, name: $name, primary: $primary)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is GoogleCalendarInfo && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
