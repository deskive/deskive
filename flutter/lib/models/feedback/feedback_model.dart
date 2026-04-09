/// Enums for feedback types and statuses
enum FeedbackType {
  bug,
  issue,
  improvement,
  featureRequest;

  String get value {
    switch (this) {
      case FeedbackType.bug:
        return 'bug';
      case FeedbackType.issue:
        return 'issue';
      case FeedbackType.improvement:
        return 'improvement';
      case FeedbackType.featureRequest:
        return 'feature_request';
    }
  }

  String get displayName {
    switch (this) {
      case FeedbackType.bug:
        return 'Bug Report';
      case FeedbackType.issue:
        return 'Issue';
      case FeedbackType.improvement:
        return 'Improvement';
      case FeedbackType.featureRequest:
        return 'Feature Request';
    }
  }

  static FeedbackType fromString(String value) {
    switch (value) {
      case 'bug':
        return FeedbackType.bug;
      case 'issue':
        return FeedbackType.issue;
      case 'improvement':
        return FeedbackType.improvement;
      case 'feature_request':
        return FeedbackType.featureRequest;
      default:
        return FeedbackType.issue;
    }
  }
}

enum FeedbackStatus {
  pending,
  inReview,
  inProgress,
  resolved,
  wontFix,
  duplicate;

  String get value {
    switch (this) {
      case FeedbackStatus.pending:
        return 'pending';
      case FeedbackStatus.inReview:
        return 'in_review';
      case FeedbackStatus.inProgress:
        return 'in_progress';
      case FeedbackStatus.resolved:
        return 'resolved';
      case FeedbackStatus.wontFix:
        return 'wont_fix';
      case FeedbackStatus.duplicate:
        return 'duplicate';
    }
  }

  String get displayName {
    switch (this) {
      case FeedbackStatus.pending:
        return 'Pending';
      case FeedbackStatus.inReview:
        return 'In Review';
      case FeedbackStatus.inProgress:
        return 'In Progress';
      case FeedbackStatus.resolved:
        return 'Resolved';
      case FeedbackStatus.wontFix:
        return "Won't Fix";
      case FeedbackStatus.duplicate:
        return 'Duplicate';
    }
  }

  static FeedbackStatus fromString(String value) {
    switch (value) {
      case 'pending':
        return FeedbackStatus.pending;
      case 'in_review':
        return FeedbackStatus.inReview;
      case 'in_progress':
        return FeedbackStatus.inProgress;
      case 'resolved':
        return FeedbackStatus.resolved;
      case 'wont_fix':
        return FeedbackStatus.wontFix;
      case 'duplicate':
        return FeedbackStatus.duplicate;
      default:
        return FeedbackStatus.pending;
    }
  }
}

enum FeedbackPriority {
  low,
  medium,
  high,
  critical;

  String get value {
    switch (this) {
      case FeedbackPriority.low:
        return 'low';
      case FeedbackPriority.medium:
        return 'medium';
      case FeedbackPriority.high:
        return 'high';
      case FeedbackPriority.critical:
        return 'critical';
    }
  }

  String get displayName {
    switch (this) {
      case FeedbackPriority.low:
        return 'Low';
      case FeedbackPriority.medium:
        return 'Medium';
      case FeedbackPriority.high:
        return 'High';
      case FeedbackPriority.critical:
        return 'Critical';
    }
  }

  static FeedbackPriority fromString(String value) {
    switch (value) {
      case 'low':
        return FeedbackPriority.low;
      case 'medium':
        return FeedbackPriority.medium;
      case 'high':
        return FeedbackPriority.high;
      case 'critical':
        return FeedbackPriority.critical;
      default:
        return FeedbackPriority.medium;
    }
  }
}

enum FeedbackCategory {
  ui,
  performance,
  feature,
  security,
  other;

  String get value {
    switch (this) {
      case FeedbackCategory.ui:
        return 'ui';
      case FeedbackCategory.performance:
        return 'performance';
      case FeedbackCategory.feature:
        return 'feature';
      case FeedbackCategory.security:
        return 'security';
      case FeedbackCategory.other:
        return 'other';
    }
  }

  String get displayName {
    switch (this) {
      case FeedbackCategory.ui:
        return 'User Interface';
      case FeedbackCategory.performance:
        return 'Performance';
      case FeedbackCategory.feature:
        return 'Feature';
      case FeedbackCategory.security:
        return 'Security';
      case FeedbackCategory.other:
        return 'Other';
    }
  }

  static FeedbackCategory? fromString(String? value) {
    if (value == null) return null;
    switch (value) {
      case 'ui':
        return FeedbackCategory.ui;
      case 'performance':
        return FeedbackCategory.performance;
      case 'feature':
        return FeedbackCategory.feature;
      case 'security':
        return FeedbackCategory.security;
      case 'other':
        return FeedbackCategory.other;
      default:
        return null;
    }
  }
}

/// Attachment model
class FeedbackAttachment {
  final String url;
  final String name;
  final String type;
  final int size;

  FeedbackAttachment({
    required this.url,
    required this.name,
    required this.type,
    required this.size,
  });

  factory FeedbackAttachment.fromJson(Map<String, dynamic> json) {
    return FeedbackAttachment(
      url: json['url'] ?? '',
      name: json['name'] ?? '',
      type: json['type'] ?? '',
      size: json['size'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'url': url,
        'name': name,
        'type': type,
        'size': size,
      };
}

/// Device info model
class DeviceInfo {
  final String? platform;
  final String? osVersion;
  final String? deviceModel;
  final String? screenResolution;

  DeviceInfo({
    this.platform,
    this.osVersion,
    this.deviceModel,
    this.screenResolution,
  });

  factory DeviceInfo.fromJson(Map<String, dynamic> json) {
    return DeviceInfo(
      platform: json['platform'],
      osVersion: json['osVersion'],
      deviceModel: json['deviceModel'],
      screenResolution: json['screenResolution'],
    );
  }

  Map<String, dynamic> toJson() => {
        if (platform != null) 'platform': platform,
        if (osVersion != null) 'osVersion': osVersion,
        if (deviceModel != null) 'deviceModel': deviceModel,
        if (screenResolution != null) 'screenResolution': screenResolution,
      };
}

/// Main feedback model
class FeedbackModel {
  final String id;
  final String userId;
  final FeedbackType type;
  final String title;
  final String description;
  final FeedbackStatus status;
  final FeedbackPriority priority;
  final FeedbackCategory? category;
  final List<FeedbackAttachment> attachments;
  final String? appVersion;
  final DeviceInfo deviceInfo;
  final String? resolutionNotes;
  final DateTime? resolvedAt;
  final String? resolvedBy;
  final DateTime? notifiedAt;
  final String? assignedTo;
  final String? duplicateOfId;
  final DateTime createdAt;
  final DateTime updatedAt;

  FeedbackModel({
    required this.id,
    required this.userId,
    required this.type,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    this.category,
    this.attachments = const [],
    this.appVersion,
    required this.deviceInfo,
    this.resolutionNotes,
    this.resolvedAt,
    this.resolvedBy,
    this.notifiedAt,
    this.assignedTo,
    this.duplicateOfId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory FeedbackModel.fromJson(Map<String, dynamic> json) {
    return FeedbackModel(
      id: json['id'] ?? '',
      userId: json['userId'] ?? json['user_id'] ?? '',
      type: FeedbackType.fromString(json['type'] ?? 'issue'),
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      status: FeedbackStatus.fromString(json['status'] ?? 'pending'),
      priority: FeedbackPriority.fromString(json['priority'] ?? 'medium'),
      category: FeedbackCategory.fromString(json['category']),
      attachments: (json['attachments'] as List<dynamic>?)
              ?.map((e) => FeedbackAttachment.fromJson(e))
              .toList() ??
          [],
      appVersion: json['appVersion'] ?? json['app_version'],
      deviceInfo: DeviceInfo.fromJson(json['deviceInfo'] ?? json['device_info'] ?? {}),
      resolutionNotes: json['resolutionNotes'] ?? json['resolution_notes'],
      resolvedAt: json['resolvedAt'] != null || json['resolved_at'] != null
          ? DateTime.parse(json['resolvedAt'] ?? json['resolved_at'])
          : null,
      resolvedBy: json['resolvedBy'] ?? json['resolved_by'],
      notifiedAt: json['notifiedAt'] != null || json['notified_at'] != null
          ? DateTime.parse(json['notifiedAt'] ?? json['notified_at'])
          : null,
      assignedTo: json['assignedTo'] ?? json['assigned_to'],
      duplicateOfId: json['duplicateOfId'] ?? json['duplicate_of_id'],
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at']),
    );
  }

  bool get isResolved => status == FeedbackStatus.resolved;
  bool get isPending => status == FeedbackStatus.pending;
}

/// Feedback response model (admin responses)
class FeedbackResponseModel {
  final String id;
  final String feedbackId;
  final String userId;
  final String content;
  final bool isInternal;
  final String? statusChange;
  final DateTime createdAt;

  FeedbackResponseModel({
    required this.id,
    required this.feedbackId,
    required this.userId,
    required this.content,
    required this.isInternal,
    this.statusChange,
    required this.createdAt,
  });

  factory FeedbackResponseModel.fromJson(Map<String, dynamic> json) {
    return FeedbackResponseModel(
      id: json['id'] ?? '',
      feedbackId: json['feedbackId'] ?? json['feedback_id'] ?? '',
      userId: json['userId'] ?? json['user_id'] ?? '',
      content: json['content'] ?? '',
      isInternal: json['isInternal'] ?? json['is_internal'] ?? false,
      statusChange: json['statusChange'] ?? json['status_change'],
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
    );
  }
}

/// Paginated feedback response
class PaginatedFeedback {
  final List<FeedbackModel> data;
  final int total;
  final int page;
  final int limit;
  final int totalPages;

  PaginatedFeedback({
    required this.data,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
  });

  factory PaginatedFeedback.fromJson(Map<String, dynamic> json) {
    return PaginatedFeedback(
      data: (json['data'] as List<dynamic>?)
              ?.map((e) => FeedbackModel.fromJson(e))
              .toList() ??
          [],
      total: json['total'] ?? 0,
      page: json['page'] ?? 1,
      limit: json['limit'] ?? 20,
      totalPages: json['totalPages'] ?? json['total_pages'] ?? 1,
    );
  }
}
