// Approval Request and Related Models
import 'dart:convert';

// Enums
enum RequestStatus {
  pending,
  approved,
  rejected,
  cancelled;

  String get value {
    switch (this) {
      case RequestStatus.pending:
        return 'pending';
      case RequestStatus.approved:
        return 'approved';
      case RequestStatus.rejected:
        return 'rejected';
      case RequestStatus.cancelled:
        return 'cancelled';
    }
  }

  static RequestStatus fromString(String? value) {
    switch (value?.toUpperCase()) {
      case 'APPROVED':
        return RequestStatus.approved;
      case 'REJECTED':
        return RequestStatus.rejected;
      case 'CANCELLED':
        return RequestStatus.cancelled;
      default:
        return RequestStatus.pending;
    }
  }
}

enum RequestPriority {
  low,
  normal,
  high,
  urgent;

  String get value {
    switch (this) {
      case RequestPriority.low:
        return 'low';
      case RequestPriority.normal:
        return 'normal';
      case RequestPriority.high:
        return 'high';
      case RequestPriority.urgent:
        return 'urgent';
    }
  }

  static RequestPriority fromString(String? value) {
    switch (value?.toUpperCase()) {
      case 'LOW':
        return RequestPriority.low;
      case 'HIGH':
        return RequestPriority.high;
      case 'URGENT':
        return RequestPriority.urgent;
      default:
        return RequestPriority.normal;
    }
  }
}

enum ApproverStatus {
  pending,
  approved,
  rejected;

  String get value {
    switch (this) {
      case ApproverStatus.pending:
        return 'PENDING';
      case ApproverStatus.approved:
        return 'APPROVED';
      case ApproverStatus.rejected:
        return 'REJECTED';
    }
  }

  static ApproverStatus fromString(String? value) {
    switch (value?.toUpperCase()) {
      case 'APPROVED':
        return ApproverStatus.approved;
      case 'REJECTED':
        return ApproverStatus.rejected;
      default:
        return ApproverStatus.pending;
    }
  }
}

enum CustomFieldType {
  text,
  textarea,
  number,
  date,
  datetime,
  select,
  multiselect,
  checkbox,
  file,
  user,
  currency;

  String get value {
    switch (this) {
      case CustomFieldType.text:
        return 'TEXT';
      case CustomFieldType.textarea:
        return 'TEXTAREA';
      case CustomFieldType.number:
        return 'NUMBER';
      case CustomFieldType.date:
        return 'DATE';
      case CustomFieldType.datetime:
        return 'DATETIME';
      case CustomFieldType.select:
        return 'SELECT';
      case CustomFieldType.multiselect:
        return 'MULTISELECT';
      case CustomFieldType.checkbox:
        return 'CHECKBOX';
      case CustomFieldType.file:
        return 'FILE';
      case CustomFieldType.user:
        return 'USER';
      case CustomFieldType.currency:
        return 'CURRENCY';
    }
  }

  static CustomFieldType fromString(String? value) {
    switch (value?.toUpperCase()) {
      case 'TEXTAREA':
        return CustomFieldType.textarea;
      case 'NUMBER':
        return CustomFieldType.number;
      case 'DATE':
        return CustomFieldType.date;
      case 'DATETIME':
        return CustomFieldType.datetime;
      case 'SELECT':
        return CustomFieldType.select;
      case 'MULTISELECT':
        return CustomFieldType.multiselect;
      case 'CHECKBOX':
        return CustomFieldType.checkbox;
      case 'FILE':
        return CustomFieldType.file;
      case 'USER':
        return CustomFieldType.user;
      case 'CURRENCY':
        return CustomFieldType.currency;
      default:
        return CustomFieldType.text;
    }
  }
}

// Custom Field Configuration
class CustomFieldConfig {
  final String id;
  final String label;
  final CustomFieldType type;
  final bool required;
  final String? placeholder;
  final List<String>? options;
  final dynamic defaultValue;
  final int displayOrder;

  CustomFieldConfig({
    required this.id,
    required this.label,
    required this.type,
    this.required = false,
    this.placeholder,
    this.options,
    this.defaultValue,
    this.displayOrder = 0,
  });

  factory CustomFieldConfig.fromJson(Map<String, dynamic> json) {
    // Safely parse options - handle both List and Map formats
    List<String>? optionsList;
    final optionsData = json['options'];
    if (optionsData != null) {
      if (optionsData is List) {
        optionsList = optionsData.map((e) => e.toString()).toList();
      } else if (optionsData is Map) {
        // Handle case where options is stored as a map with string indices
        optionsList = optionsData.values.map((e) => e.toString()).toList();
      }
    }

    // Safely parse displayOrder
    int order = 0;
    final orderValue = json['displayOrder'] ?? json['display_order'] ?? json['order'];
    if (orderValue != null) {
      if (orderValue is int) {
        order = orderValue;
      } else if (orderValue is String) {
        order = int.tryParse(orderValue) ?? 0;
      }
    }

    return CustomFieldConfig(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      type: CustomFieldType.fromString(json['type']?.toString()),
      required: json['required'] == true,
      placeholder: json['placeholder']?.toString(),
      options: optionsList,
      defaultValue: json['defaultValue'],
      displayOrder: order,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      'type': type.value,
      'required': required,
      'placeholder': placeholder,
      'options': options,
      'defaultValue': defaultValue,
      'displayOrder': displayOrder,
    };
  }
}

// Request Type Model
class RequestType {
  final String id;
  final String workspaceId;
  final String name;
  final String? description;
  final String? color;
  final String? icon;
  final List<CustomFieldConfig> fields;
  final List<String>? defaultApprovers;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  RequestType({
    required this.id,
    required this.workspaceId,
    required this.name,
    this.description,
    this.color,
    this.icon,
    this.fields = const [],
    this.defaultApprovers,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory RequestType.fromJson(Map<String, dynamic> json) {
    // Handle fieldsConfig from backend (can be named fieldsConfig or fields)
    final fieldsData = json['fieldsConfig'] ?? json['fields_config'] ?? json['fields'];

    // Safely parse fields - handle both List and Map formats
    List<CustomFieldConfig> fieldsList = [];
    if (fieldsData != null) {
      if (fieldsData is List) {
        fieldsList = fieldsData
            .where((f) => f != null && f is Map<String, dynamic>)
            .map((f) => CustomFieldConfig.fromJson(f as Map<String, dynamic>))
            .toList();
      } else if (fieldsData is Map) {
        // Handle case where fieldsConfig is stored as a map with string indices
        fieldsList = fieldsData.values
            .where((f) => f != null && f is Map<String, dynamic>)
            .map((f) => CustomFieldConfig.fromJson(f as Map<String, dynamic>))
            .toList();
      }
    }

    // Safely parse defaultApprovers
    List<String>? approversList;
    final approversData = json['defaultApprovers'] ?? json['default_approvers'];
    if (approversData != null) {
      if (approversData is List) {
        approversList = approversData.map((e) => e.toString()).toList();
      } else if (approversData is Map) {
        approversList = approversData.values.map((e) => e.toString()).toList();
      }
    }

    return RequestType(
      id: json['id']?.toString() ?? '',
      workspaceId: json['workspaceId']?.toString() ?? json['workspace_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      color: json['color']?.toString(),
      icon: json['icon']?.toString(),
      fields: fieldsList,
      defaultApprovers: approversList,
      isActive: json['isActive'] == true || json['is_active'] == true,
      createdAt: _parseDateTime(json['createdAt'] ?? json['created_at']),
      updatedAt: _parseDateTime(json['updatedAt'] ?? json['updated_at']),
    );
  }

  static DateTime _parseDateTime(dynamic value) {
    if (value == null) return DateTime.now();
    if (value is DateTime) return value;
    if (value is String) {
      return DateTime.tryParse(value) ?? DateTime.now();
    }
    return DateTime.now();
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'name': name,
      'description': description,
      'color': color,
      'icon': icon,
      'fields': fields.map((f) => f.toJson()).toList(),
      'defaultApprovers': defaultApprovers,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

// Approver Model
class Approver {
  final String id;
  final String requestId;
  final String userId;
  final String? userName;
  final String? userEmail;
  final String? userAvatar;
  final ApproverStatus status;
  final String? comments;
  final DateTime? respondedAt;
  final DateTime createdAt;

  Approver({
    required this.id,
    required this.requestId,
    required this.userId,
    this.userName,
    this.userEmail,
    this.userAvatar,
    this.status = ApproverStatus.pending,
    this.comments,
    this.respondedAt,
    required this.createdAt,
  });

  factory Approver.fromJson(Map<String, dynamic> json) {
    return Approver(
      id: json['id'] as String? ?? '',
      requestId: json['requestId'] as String? ?? json['request_id'] as String? ?? '',
      // Backend returns 'approverId', but we also support 'userId' for flexibility
      userId: json['approverId'] as String? ?? json['approver_id'] as String? ?? json['userId'] as String? ?? json['user_id'] as String? ?? '',
      userName: json['approverName'] as String? ?? json['approver_name'] as String? ?? json['userName'] as String? ?? json['user_name'] as String?,
      userEmail: json['approverEmail'] as String? ?? json['approver_email'] as String? ?? json['userEmail'] as String? ?? json['user_email'] as String?,
      userAvatar: json['approverAvatar'] as String? ?? json['approver_avatar'] as String? ?? json['userAvatar'] as String? ?? json['user_avatar'] as String?,
      status: ApproverStatus.fromString(json['status'] as String?),
      comments: json['comments'] as String?,
      respondedAt: json['respondedAt'] != null
          ? DateTime.parse(json['respondedAt'] as String)
          : json['responded_at'] != null
              ? DateTime.parse(json['responded_at'] as String)
              : null,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : json['created_at'] != null
              ? DateTime.parse(json['created_at'] as String)
              : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'requestId': requestId,
      'userId': userId,
      'userName': userName,
      'userEmail': userEmail,
      'userAvatar': userAvatar,
      'status': status.value,
      'comments': comments,
      'respondedAt': respondedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

// Comment Model
class ApprovalComment {
  final String id;
  final String requestId;
  final String userId;
  final String? userName;
  final String? userEmail;
  final String? userAvatar;
  final String content;
  final bool isInternal;
  final DateTime createdAt;

  ApprovalComment({
    required this.id,
    required this.requestId,
    required this.userId,
    this.userName,
    this.userEmail,
    this.userAvatar,
    required this.content,
    this.isInternal = false,
    required this.createdAt,
  });

  factory ApprovalComment.fromJson(Map<String, dynamic> json) {
    return ApprovalComment(
      id: json['id'] as String? ?? '',
      requestId: json['requestId'] as String? ?? json['request_id'] as String? ?? '',
      userId: json['userId'] as String? ?? json['user_id'] as String? ?? '',
      userName: json['userName'] as String? ?? json['user_name'] as String?,
      userEmail: json['userEmail'] as String? ?? json['user_email'] as String?,
      userAvatar: json['userAvatar'] as String? ?? json['user_avatar'] as String?,
      content: json['content'] as String? ?? '',
      isInternal: json['isInternal'] as bool? ?? json['is_internal'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : json['created_at'] != null
              ? DateTime.parse(json['created_at'] as String)
              : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'requestId': requestId,
      'userId': userId,
      'userName': userName,
      'userEmail': userEmail,
      'userAvatar': userAvatar,
      'content': content,
      'isInternal': isInternal,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

// Approval Request Model
class ApprovalRequest {
  final String id;
  final String workspaceId;
  final String typeId;
  final String? typeName;
  final String? typeColor;
  final String title;
  final String? description;
  final RequestStatus status;
  final RequestPriority priority;
  final String requesterId;
  final String? requesterName;
  final String? requesterEmail;
  final String? requesterAvatar;
  final List<Approver> approvers;
  final Map<String, dynamic> data;
  final List<String>? attachments;
  final DateTime? dueDate;
  final String? approvedBy;
  final DateTime? approvedAt;
  final String? rejectedBy;
  final DateTime? rejectedAt;
  final String? rejectionReason;
  final DateTime createdAt;
  final DateTime updatedAt;

  ApprovalRequest({
    required this.id,
    required this.workspaceId,
    required this.typeId,
    this.typeName,
    this.typeColor,
    required this.title,
    this.description,
    this.status = RequestStatus.pending,
    this.priority = RequestPriority.normal,
    required this.requesterId,
    this.requesterName,
    this.requesterEmail,
    this.requesterAvatar,
    this.approvers = const [],
    this.data = const {},
    this.attachments,
    this.dueDate,
    this.approvedBy,
    this.approvedAt,
    this.rejectedBy,
    this.rejectedAt,
    this.rejectionReason,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ApprovalRequest.fromJson(Map<String, dynamic> json) {
    // Parse data field carefully - can be Map, JSON string, or null
    Map<String, dynamic> parsedData = {};
    if (json['data'] != null) {
      if (json['data'] is Map) {
        parsedData = Map<String, dynamic>.from(json['data'] as Map);
      } else if (json['data'] is String) {
        final dataStr = json['data'] as String;
        if (dataStr.isNotEmpty && dataStr != '{}') {
          try {
            final decoded = jsonDecode(dataStr);
            if (decoded is Map) {
              parsedData = Map<String, dynamic>.from(decoded);
            }
          } catch (e) {
            // Failed to parse data JSON string - continue with empty data
          }
        }
      }
    }

    return ApprovalRequest(
      id: json['id'] as String? ?? '',
      workspaceId: json['workspaceId'] as String? ?? json['workspace_id'] as String? ?? '',
      typeId: json['typeId'] as String? ?? json['type_id'] as String? ?? '',
      typeName: json['typeName'] as String? ?? json['type_name'] as String?,
      typeColor: json['typeColor'] as String? ?? json['type_color'] as String?,
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      status: RequestStatus.fromString(json['status'] as String?),
      priority: RequestPriority.fromString(json['priority'] as String?),
      requesterId: json['requesterId'] as String? ?? json['requester_id'] as String? ?? '',
      requesterName: json['requesterName'] as String? ?? json['requester_name'] as String?,
      requesterEmail: json['requesterEmail'] as String? ?? json['requester_email'] as String?,
      requesterAvatar: json['requesterAvatar'] as String? ?? json['requester_avatar'] as String?,
      approvers: json['approvers'] != null
          ? (json['approvers'] as List)
              .map((a) => Approver.fromJson(a as Map<String, dynamic>))
              .toList()
          : [],
      data: parsedData,
      attachments: _parseAttachments(json['attachments']),
      dueDate: json['dueDate'] != null
          ? DateTime.parse(json['dueDate'] as String)
          : json['due_date'] != null
              ? DateTime.parse(json['due_date'] as String)
              : null,
      approvedBy: json['approvedBy'] as String? ?? json['approved_by'] as String?,
      approvedAt: json['approvedAt'] != null
          ? DateTime.parse(json['approvedAt'] as String)
          : json['approved_at'] != null
              ? DateTime.parse(json['approved_at'] as String)
              : null,
      rejectedBy: json['rejectedBy'] as String? ?? json['rejected_by'] as String?,
      rejectedAt: json['rejectedAt'] != null
          ? DateTime.parse(json['rejectedAt'] as String)
          : json['rejected_at'] != null
              ? DateTime.parse(json['rejected_at'] as String)
              : null,
      rejectionReason: json['rejectionReason'] as String? ?? json['rejection_reason'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : json['created_at'] != null
              ? DateTime.parse(json['created_at'] as String)
              : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : json['updated_at'] != null
              ? DateTime.parse(json['updated_at'] as String)
              : DateTime.now(),
    );
  }

  /// Helper to parse attachments - can be List, JSON string, or null
  static List<String>? _parseAttachments(dynamic attachments) {
    if (attachments == null) return null;

    if (attachments is List) {
      return List<String>.from(attachments.map((e) => e.toString()));
    } else if (attachments is String) {
      if (attachments.isEmpty || attachments == '[]') return null;
      try {
        final decoded = jsonDecode(attachments);
        if (decoded is List) {
          return List<String>.from(decoded.map((e) => e.toString()));
        }
      } catch (e) {
        // Failed to parse attachments JSON string
      }
    }
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'typeId': typeId,
      'typeName': typeName,
      'typeColor': typeColor,
      'title': title,
      'description': description,
      'status': status.value,
      'priority': priority.value,
      'requesterId': requesterId,
      'requesterName': requesterName,
      'requesterEmail': requesterEmail,
      'requesterAvatar': requesterAvatar,
      'approvers': approvers.map((a) => a.toJson()).toList(),
      'data': data,
      'attachments': attachments,
      'dueDate': dueDate?.toIso8601String(),
      'approvedBy': approvedBy,
      'approvedAt': approvedAt?.toIso8601String(),
      'rejectedBy': rejectedBy,
      'rejectedAt': rejectedAt?.toIso8601String(),
      'rejectionReason': rejectionReason,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

// Approval Stats Model
class ApprovalStats {
  final int totalRequests;
  final int pendingRequests;
  final int approvedRequests;
  final int rejectedRequests;
  final int pendingMyApproval;
  final int myRequests;

  ApprovalStats({
    this.totalRequests = 0,
    this.pendingRequests = 0,
    this.approvedRequests = 0,
    this.rejectedRequests = 0,
    this.pendingMyApproval = 0,
    this.myRequests = 0,
  });

  factory ApprovalStats.fromJson(Map<String, dynamic> json) {
    return ApprovalStats(
      totalRequests: json['totalRequests'] as int? ?? json['total_requests'] as int? ?? 0,
      pendingRequests: json['pendingRequests'] as int? ?? json['pending_requests'] as int? ?? 0,
      approvedRequests: json['approvedRequests'] as int? ?? json['approved_requests'] as int? ?? 0,
      rejectedRequests: json['rejectedRequests'] as int? ?? json['rejected_requests'] as int? ?? 0,
      pendingMyApproval: json['pendingMyApproval'] as int? ?? json['pending_my_approval'] as int? ?? 0,
      myRequests: json['myRequests'] as int? ?? json['my_requests'] as int? ?? 0,
    );
  }
}
