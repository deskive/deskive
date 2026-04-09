import 'dart:convert';

enum NotificationCategory {
  task,
  project,
  calendar,
  chat,
  file,
  workspace,
  system,
  reminder,
  mention,
  other
}

enum NotificationPriority {
  lowest,
  low,
  medium,
  high,
  highest
}

enum NotificationStatus {
  unread,
  read,
  archived
}

enum NotificationActionType {
  markAsRead,
  archive,
  delete,
  openItem,
  respond,
  approve,
  reject,
  custom
}

class NotificationAction {
  final String id;
  final NotificationActionType type;
  final String label;
  final String? icon;
  final Map<String, dynamic>? data;
  final bool isPrimary;

  NotificationAction({
    required this.id,
    required this.type,
    required this.label,
    this.icon,
    this.data,
    this.isPrimary = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'type': type.name,
      'label': label,
      'icon': icon,
      'data': data,
      'isPrimary': isPrimary,
    };
  }

  factory NotificationAction.fromMap(Map<String, dynamic> map) {
    return NotificationAction(
      id: map['id'] ?? '',
      type: NotificationActionType.values.firstWhere(
        (e) => e.name == map['type'],
        orElse: () => NotificationActionType.custom,
      ),
      label: map['label'] ?? '',
      icon: map['icon'],
      data: map['data'],
      isPrimary: map['isPrimary'] ?? false,
    );
  }

  String toJson() => json.encode(toMap());

  factory NotificationAction.fromJson(String source) =>
      NotificationAction.fromMap(json.decode(source));
}

class NotificationMetadata {
  final String? entityId;
  final String? entityType;
  final String? workspaceId;
  final String? projectId;
  final String? channelId;
  final String? userId;
  final Map<String, dynamic>? additionalData;

  NotificationMetadata({
    this.entityId,
    this.entityType,
    this.workspaceId,
    this.projectId,
    this.channelId,
    this.userId,
    this.additionalData,
  });

  Map<String, dynamic> toMap() {
    return {
      'entityId': entityId,
      'entityType': entityType,
      'workspaceId': workspaceId,
      'projectId': projectId,
      'channelId': channelId,
      'userId': userId,
      'additionalData': additionalData,
    };
  }

  factory NotificationMetadata.fromMap(Map<String, dynamic> map) {
    return NotificationMetadata(
      entityId: map['entityId'],
      entityType: map['entityType'],
      workspaceId: map['workspaceId'],
      projectId: map['projectId'],
      channelId: map['channelId'],
      userId: map['userId'],
      additionalData: map['additionalData'],
    );
  }

  String toJson() => json.encode(toMap());

  factory NotificationMetadata.fromJson(String source) =>
      NotificationMetadata.fromMap(json.decode(source));

  NotificationMetadata copyWith({
    String? entityId,
    String? entityType,
    String? workspaceId,
    String? projectId,
    String? channelId,
    String? userId,
    Map<String, dynamic>? additionalData,
  }) {
    return NotificationMetadata(
      entityId: entityId ?? this.entityId,
      entityType: entityType ?? this.entityType,
      workspaceId: workspaceId ?? this.workspaceId,
      projectId: projectId ?? this.projectId,
      channelId: channelId ?? this.channelId,
      userId: userId ?? this.userId,
      additionalData: additionalData ?? this.additionalData,
    );
  }
}

class NotificationModel {
  final String id;
  final String title;
  final String body;
  final NotificationCategory category;
  final NotificationPriority priority;
  final NotificationStatus status;
  final String? imageUrl;
  final String? avatarUrl;
  final List<NotificationAction> actions;
  final NotificationMetadata? metadata;
  final DateTime createdAt;
  final DateTime? readAt;
  final DateTime? archivedAt;
  final String? senderId;
  final String? senderName;
  final String? senderAvatar;
  final bool isPersistent;
  final DateTime? expiresAt;

  NotificationModel({
    required this.id,
    required this.title,
    required this.body,
    required this.category,
    this.priority = NotificationPriority.medium,
    this.status = NotificationStatus.unread,
    this.imageUrl,
    this.avatarUrl,
    this.actions = const [],
    this.metadata,
    required this.createdAt,
    this.readAt,
    this.archivedAt,
    this.senderId,
    this.senderName,
    this.senderAvatar,
    this.isPersistent = true,
    this.expiresAt,
  });

  bool get isRead => status == NotificationStatus.read;
  bool get isArchived => status == NotificationStatus.archived;
  bool get isExpired => expiresAt != null && DateTime.now().isAfter(expiresAt!);

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'body': body,
      'category': category.name,
      'priority': priority.name,
      'status': status.name,
      'imageUrl': imageUrl,
      'avatarUrl': avatarUrl,
      'actions': actions.map((x) => x.toMap()).toList(),
      'metadata': metadata?.toMap(),
      'createdAt': createdAt.toIso8601String(),
      'readAt': readAt?.toIso8601String(),
      'archivedAt': archivedAt?.toIso8601String(),
      'senderId': senderId,
      'senderName': senderName,
      'senderAvatar': senderAvatar,
      'isPersistent': isPersistent,
      'expiresAt': expiresAt?.toIso8601String(),
    };
  }

  factory NotificationModel.fromMap(Map<String, dynamic> map) {
    return NotificationModel(
      id: map['id'] ?? '',
      title: map['title'] ?? '',
      body: map['body'] ?? '',
      category: NotificationCategory.values.firstWhere(
        (e) => e.name == map['category'],
        orElse: () => NotificationCategory.other,
      ),
      priority: NotificationPriority.values.firstWhere(
        (e) => e.name == map['priority'],
        orElse: () => NotificationPriority.medium,
      ),
      status: NotificationStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => NotificationStatus.unread,
      ),
      imageUrl: map['imageUrl'],
      avatarUrl: map['avatarUrl'],
      actions: map['actions'] != null
          ? List<NotificationAction>.from(
              map['actions']?.map((x) => NotificationAction.fromMap(x)))
          : [],
      metadata: map['metadata'] != null
          ? NotificationMetadata.fromMap(map['metadata'])
          : null,
      createdAt: map['createdAt'] != null
          ? DateTime.parse(map['createdAt'])
          : DateTime.now(),
      readAt: map['readAt'] != null ? DateTime.parse(map['readAt']) : null,
      archivedAt:
          map['archivedAt'] != null ? DateTime.parse(map['archivedAt']) : null,
      senderId: map['senderId'],
      senderName: map['senderName'],
      senderAvatar: map['senderAvatar'],
      isPersistent: map['isPersistent'] ?? true,
      expiresAt:
          map['expiresAt'] != null ? DateTime.parse(map['expiresAt']) : null,
    );
  }

  String toJson() => json.encode(toMap());

  factory NotificationModel.fromJson(String source) =>
      NotificationModel.fromMap(json.decode(source));

  NotificationModel copyWith({
    String? id,
    String? title,
    String? body,
    NotificationCategory? category,
    NotificationPriority? priority,
    NotificationStatus? status,
    String? imageUrl,
    String? avatarUrl,
    List<NotificationAction>? actions,
    NotificationMetadata? metadata,
    DateTime? createdAt,
    DateTime? readAt,
    DateTime? archivedAt,
    String? senderId,
    String? senderName,
    String? senderAvatar,
    bool? isPersistent,
    DateTime? expiresAt,
  }) {
    return NotificationModel(
      id: id ?? this.id,
      title: title ?? this.title,
      body: body ?? this.body,
      category: category ?? this.category,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      imageUrl: imageUrl ?? this.imageUrl,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      actions: actions ?? this.actions,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      readAt: readAt ?? this.readAt,
      archivedAt: archivedAt ?? this.archivedAt,
      senderId: senderId ?? this.senderId,
      senderName: senderName ?? this.senderName,
      senderAvatar: senderAvatar ?? this.senderAvatar,
      isPersistent: isPersistent ?? this.isPersistent,
      expiresAt: expiresAt ?? this.expiresAt,
    );
  }

  @override
  String toString() {
    return 'NotificationModel(id: $id, title: $title, category: $category, priority: $priority, status: $status, createdAt: $createdAt)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is NotificationModel && other.id == id;
  }

  @override
  int get hashCode {
    return id.hashCode;
  }
}

class NotificationPreferences {
  final bool enablePushNotifications;
  final bool enableInAppNotifications;
  final bool enableEmailNotifications;
  final Map<NotificationCategory, bool> categorySettings;
  final Map<NotificationPriority, bool> prioritySettings;
  final bool enableSounds;
  final bool enableVibration;
  final String? customSoundPath;
  final bool doNotDisturbEnabled;
  final DateTime? doNotDisturbStart;
  final DateTime? doNotDisturbEnd;
  final List<String> mutedWorkspaces;
  final List<String> mutedChannels;
  final List<String> mutedUsers;

  NotificationPreferences({
    this.enablePushNotifications = true,
    this.enableInAppNotifications = true,
    this.enableEmailNotifications = false,
    this.categorySettings = const {},
    this.prioritySettings = const {},
    this.enableSounds = true,
    this.enableVibration = true,
    this.customSoundPath,
    this.doNotDisturbEnabled = false,
    this.doNotDisturbStart,
    this.doNotDisturbEnd,
    this.mutedWorkspaces = const [],
    this.mutedChannels = const [],
    this.mutedUsers = const [],
  });

  Map<String, dynamic> toMap() {
    return {
      'enablePushNotifications': enablePushNotifications,
      'enableInAppNotifications': enableInAppNotifications,
      'enableEmailNotifications': enableEmailNotifications,
      'categorySettings': categorySettings.map(
        (key, value) => MapEntry(key.name, value),
      ),
      'prioritySettings': prioritySettings.map(
        (key, value) => MapEntry(key.name, value),
      ),
      'enableSounds': enableSounds,
      'enableVibration': enableVibration,
      'customSoundPath': customSoundPath,
      'doNotDisturbEnabled': doNotDisturbEnabled,
      'doNotDisturbStart': doNotDisturbStart?.toIso8601String(),
      'doNotDisturbEnd': doNotDisturbEnd?.toIso8601String(),
      'mutedWorkspaces': mutedWorkspaces,
      'mutedChannels': mutedChannels,
      'mutedUsers': mutedUsers,
    };
  }

  factory NotificationPreferences.fromMap(Map<String, dynamic> map) {
    return NotificationPreferences(
      enablePushNotifications: map['enablePushNotifications'] ?? true,
      enableInAppNotifications: map['enableInAppNotifications'] ?? true,
      enableEmailNotifications: map['enableEmailNotifications'] ?? false,
      categorySettings: Map<NotificationCategory, bool>.from(
        (map['categorySettings'] ?? {}).map(
          (key, value) => MapEntry(
            NotificationCategory.values.firstWhere(
              (e) => e.name == key,
              orElse: () => NotificationCategory.other,
            ),
            value,
          ),
        ),
      ),
      prioritySettings: Map<NotificationPriority, bool>.from(
        (map['prioritySettings'] ?? {}).map(
          (key, value) => MapEntry(
            NotificationPriority.values.firstWhere(
              (e) => e.name == key,
              orElse: () => NotificationPriority.medium,
            ),
            value,
          ),
        ),
      ),
      enableSounds: map['enableSounds'] ?? true,
      enableVibration: map['enableVibration'] ?? true,
      customSoundPath: map['customSoundPath'],
      doNotDisturbEnabled: map['doNotDisturbEnabled'] ?? false,
      doNotDisturbStart: map['doNotDisturbStart'] != null
          ? DateTime.parse(map['doNotDisturbStart'])
          : null,
      doNotDisturbEnd: map['doNotDisturbEnd'] != null
          ? DateTime.parse(map['doNotDisturbEnd'])
          : null,
      mutedWorkspaces: List<String>.from(map['mutedWorkspaces'] ?? []),
      mutedChannels: List<String>.from(map['mutedChannels'] ?? []),
      mutedUsers: List<String>.from(map['mutedUsers'] ?? []),
    );
  }

  String toJson() => json.encode(toMap());

  factory NotificationPreferences.fromJson(String source) =>
      NotificationPreferences.fromMap(json.decode(source));

  NotificationPreferences copyWith({
    bool? enablePushNotifications,
    bool? enableInAppNotifications,
    bool? enableEmailNotifications,
    Map<NotificationCategory, bool>? categorySettings,
    Map<NotificationPriority, bool>? prioritySettings,
    bool? enableSounds,
    bool? enableVibration,
    String? customSoundPath,
    bool? doNotDisturbEnabled,
    DateTime? doNotDisturbStart,
    DateTime? doNotDisturbEnd,
    List<String>? mutedWorkspaces,
    List<String>? mutedChannels,
    List<String>? mutedUsers,
  }) {
    return NotificationPreferences(
      enablePushNotifications:
          enablePushNotifications ?? this.enablePushNotifications,
      enableInAppNotifications:
          enableInAppNotifications ?? this.enableInAppNotifications,
      enableEmailNotifications:
          enableEmailNotifications ?? this.enableEmailNotifications,
      categorySettings: categorySettings ?? this.categorySettings,
      prioritySettings: prioritySettings ?? this.prioritySettings,
      enableSounds: enableSounds ?? this.enableSounds,
      enableVibration: enableVibration ?? this.enableVibration,
      customSoundPath: customSoundPath ?? this.customSoundPath,
      doNotDisturbEnabled: doNotDisturbEnabled ?? this.doNotDisturbEnabled,
      doNotDisturbStart: doNotDisturbStart ?? this.doNotDisturbStart,
      doNotDisturbEnd: doNotDisturbEnd ?? this.doNotDisturbEnd,
      mutedWorkspaces: mutedWorkspaces ?? this.mutedWorkspaces,
      mutedChannels: mutedChannels ?? this.mutedChannels,
      mutedUsers: mutedUsers ?? this.mutedUsers,
    );
  }

  bool isCategoryEnabled(NotificationCategory category) {
    return categorySettings[category] ?? true;
  }

  bool isPriorityEnabled(NotificationPriority priority) {
    return prioritySettings[priority] ?? true;
  }

  bool isWorkspaceMuted(String workspaceId) {
    return mutedWorkspaces.contains(workspaceId);
  }

  bool isChannelMuted(String channelId) {
    return mutedChannels.contains(channelId);
  }

  bool isUserMuted(String userId) {
    return mutedUsers.contains(userId);
  }

  bool isInDoNotDisturbWindow() {
    if (!doNotDisturbEnabled || doNotDisturbStart == null || doNotDisturbEnd == null) {
      return false;
    }

    final now = DateTime.now();
    final currentMinutes = now.hour * 60 + now.minute;
    final startMinutes = doNotDisturbStart!.hour * 60 + doNotDisturbStart!.minute;
    final endMinutes = doNotDisturbEnd!.hour * 60 + doNotDisturbEnd!.minute;

    // Handle overnight DND periods
    if (startMinutes > endMinutes) {
      // DND spans midnight
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    } else {
      // Same day DND
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
  }
}