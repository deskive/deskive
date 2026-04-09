import 'workspace.dart';

/// Response model for workspace list API
class WorkspaceListResponse {
  final bool success;
  final List<Workspace>? data;
  final String? message;

  WorkspaceListResponse({
    required this.success,
    this.data,
    this.message,
  });

  factory WorkspaceListResponse.fromJson(dynamic json) {
    // Handle array response
    if (json is List) {
      final workspaces = json
          .map((item) => Workspace.fromJson(item as Map<String, dynamic>))
          .toList();
      return WorkspaceListResponse(
        success: true,
        data: workspaces,
      );
    }

    // Handle object response with data field
    if (json is Map<String, dynamic>) {
      return WorkspaceListResponse(
        success: json['success'] as bool? ?? true,
        data: json['data'] != null
            ? (json['data'] as List)
                .map((item) => Workspace.fromJson(item as Map<String, dynamic>))
                .toList()
            : null,
        message: json['message'] as String?,
      );
    }

    return WorkspaceListResponse(
      success: false,
      message: 'Invalid response format',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'data': data?.map((w) => w.toJson()).toList(),
      'message': message,
    };
  }
}

/// Response model for single workspace API
class WorkspaceResponse {
  final bool success;
  final Workspace? data;
  final String? message;

  WorkspaceResponse({
    required this.success,
    this.data,
    this.message,
  });

  factory WorkspaceResponse.fromJson(Map<String, dynamic> json) {
    // Check if response is a direct workspace object (has 'id' field)
    if (json.containsKey('id') && json.containsKey('name')) {
      return WorkspaceResponse(
        success: true,
        data: Workspace.fromJson(json),
        message: 'Success',
      );
    }

    // Otherwise, expect wrapped format with 'data' field
    return WorkspaceResponse(
      success: json['success'] as bool? ?? true,
      data: json['data'] != null
          ? Workspace.fromJson(json['data'] as Map<String, dynamic>)
          : null,
      message: json['message'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'data': data?.toJson(),
      'message': message,
    };
  }
}
