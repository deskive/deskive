import 'google_calendar_info.dart';

/// Model for Google Calendar connection status
class GoogleCalendarConnection {
  final String id;
  final String workspaceId;
  final String userId;
  final String googleEmail;
  final String? googleName;
  final String? googlePicture;
  final String? calendarId;
  final bool isActive;
  final DateTime? lastSyncedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  /// List of all available calendars from the user's Google account
  final List<GoogleCalendarInfo> availableCalendars;

  /// List of calendars selected for sync
  final List<GoogleCalendarInfo> selectedCalendars;

  GoogleCalendarConnection({
    required this.id,
    required this.workspaceId,
    required this.userId,
    required this.googleEmail,
    this.googleName,
    this.googlePicture,
    this.calendarId,
    required this.isActive,
    this.lastSyncedAt,
    required this.createdAt,
    required this.updatedAt,
    this.availableCalendars = const [],
    this.selectedCalendars = const [],
  });

  factory GoogleCalendarConnection.fromJson(Map<String, dynamic> json) {
    // Parse available calendars
    List<GoogleCalendarInfo> availableCalendars = [];
    final availableData = json['availableCalendars'] ?? json['available_calendars'];
    if (availableData is List) {
      availableCalendars = availableData
          .map((item) => GoogleCalendarInfo.fromJson(
              item is Map<String, dynamic> ? item : <String, dynamic>{}))
          .where((cal) => cal.id.isNotEmpty)
          .toList();
    }

    // Parse selected calendars
    List<GoogleCalendarInfo> selectedCalendars = [];
    final selectedData = json['selectedCalendars'] ?? json['selected_calendars'];
    if (selectedData is List) {
      selectedCalendars = selectedData
          .map((item) => GoogleCalendarInfo.fromJson(
              item is Map<String, dynamic> ? item : <String, dynamic>{}))
          .where((cal) => cal.id.isNotEmpty)
          .toList();
    }

    // Parse dates with fallbacks
    final createdAtStr = json['createdAt'] as String? ?? json['created_at'] as String?;
    final updatedAtStr = json['updatedAt'] as String? ?? json['updated_at'] as String?;
    final now = DateTime.now();

    return GoogleCalendarConnection(
      id: json['id'] as String,
      workspaceId: json['workspaceId'] as String? ?? json['workspace_id'] as String? ?? '',
      userId: json['userId'] as String? ?? json['user_id'] as String? ?? '',
      googleEmail: json['googleEmail'] as String? ?? json['google_email'] as String? ?? '',
      googleName: json['googleName'] as String? ?? json['google_name'] as String?,
      googlePicture: json['googlePicture'] as String? ?? json['google_picture'] as String?,
      calendarId: json['calendarId'] as String? ?? json['calendar_id'] as String?,
      isActive: json['isActive'] as bool? ?? json['is_active'] as bool? ?? true,
      lastSyncedAt: json['lastSyncedAt'] != null
          ? DateTime.parse(json['lastSyncedAt'] as String)
          : json['last_synced_at'] != null
              ? DateTime.parse(json['last_synced_at'] as String)
              : null,
      createdAt: createdAtStr != null ? DateTime.parse(createdAtStr) : now,
      updatedAt: updatedAtStr != null ? DateTime.parse(updatedAtStr) : (createdAtStr != null ? DateTime.parse(createdAtStr) : now),
      availableCalendars: availableCalendars,
      selectedCalendars: selectedCalendars,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'userId': userId,
      'googleEmail': googleEmail,
      'googleName': googleName,
      'googlePicture': googlePicture,
      'calendarId': calendarId,
      'isActive': isActive,
      'lastSyncedAt': lastSyncedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'availableCalendars': availableCalendars.map((c) => c.toJson()).toList(),
      'selectedCalendars': selectedCalendars.map((c) => c.toJson()).toList(),
    };
  }

  /// Get relative time since last sync
  String get lastSyncedAgo {
    if (lastSyncedAt == null) return 'Never';

    final now = DateTime.now();
    final difference = now.difference(lastSyncedAt!);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} min ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} hours ago';
    } else {
      return '${difference.inDays} days ago';
    }
  }

  /// Get list of selected calendar IDs
  List<String> get selectedCalendarIds {
    return selectedCalendars.map((c) => c.id).toList();
  }

  /// Check if a calendar is selected
  bool isCalendarSelected(String calendarId) {
    return selectedCalendars.any((c) => c.id == calendarId);
  }

  /// Check if there are any available calendars
  bool get hasAvailableCalendars => availableCalendars.isNotEmpty;

  /// Check if there are any selected calendars
  bool get hasSelectedCalendars => selectedCalendars.isNotEmpty;

  GoogleCalendarConnection copyWith({
    String? id,
    String? workspaceId,
    String? userId,
    String? googleEmail,
    String? googleName,
    String? googlePicture,
    String? calendarId,
    bool? isActive,
    DateTime? lastSyncedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<GoogleCalendarInfo>? availableCalendars,
    List<GoogleCalendarInfo>? selectedCalendars,
  }) {
    return GoogleCalendarConnection(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      userId: userId ?? this.userId,
      googleEmail: googleEmail ?? this.googleEmail,
      googleName: googleName ?? this.googleName,
      googlePicture: googlePicture ?? this.googlePicture,
      calendarId: calendarId ?? this.calendarId,
      isActive: isActive ?? this.isActive,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      availableCalendars: availableCalendars ?? this.availableCalendars,
      selectedCalendars: selectedCalendars ?? this.selectedCalendars,
    );
  }

  @override
  String toString() {
    return 'GoogleCalendarConnection(id: $id, email: $googleEmail, '
        'available: ${availableCalendars.length}, selected: ${selectedCalendars.length})';
  }
}

/// Result of a sync operation
class GoogleCalendarSyncResult {
  final int synced;
  final int deleted;
  final String? error;

  GoogleCalendarSyncResult({
    required this.synced,
    required this.deleted,
    this.error,
  });

  factory GoogleCalendarSyncResult.fromJson(Map<String, dynamic> json) {
    return GoogleCalendarSyncResult(
      synced: json['synced'] as int? ?? 0,
      deleted: json['deleted'] as int? ?? 0,
      error: json['error'] as String?,
    );
  }

  bool get hasChanges => synced > 0 || deleted > 0;
  bool get hasError => error != null;
}
