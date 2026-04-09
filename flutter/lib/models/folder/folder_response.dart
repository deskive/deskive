import 'folder.dart';

/// Response model for folder list API
class FolderListResponse {
  final bool success;
  final List<Folder>? data;
  final String? message;

  FolderListResponse({
    required this.success,
    this.data,
    this.message,
  });

  factory FolderListResponse.fromJson(dynamic json) {
    // Handle array response
    if (json is List) {
      final folders = json
          .map((item) => Folder.fromJson(item as Map<String, dynamic>))
          .toList();
      return FolderListResponse(
        success: true,
        data: folders,
      );
    }

    // Handle object response with data field
    if (json is Map<String, dynamic>) {
      return FolderListResponse(
        success: json['success'] as bool? ?? true,
        data: json['data'] != null
            ? (json['data'] as List)
                .map((item) => Folder.fromJson(item as Map<String, dynamic>))
                .toList()
            : null,
        message: json['message'] as String?,
      );
    }

    return FolderListResponse(
      success: false,
      message: 'Invalid response format',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'data': data?.map((f) => f.toJson()).toList(),
      'message': message,
    };
  }
}

/// Response model for single folder API
class FolderResponse {
  final bool success;
  final Folder? data;
  final String? message;

  FolderResponse({
    required this.success,
    this.data,
    this.message,
  });

  factory FolderResponse.fromJson(Map<String, dynamic> json) {
    // Check if the response has a 'data' field
    if (json.containsKey('data') && json['data'] != null) {
      return FolderResponse(
        success: json['success'] as bool? ?? true,
        data: Folder.fromJson(json['data'] as Map<String, dynamic>),
        message: json['message'] as String?,
      );
    }

    // If no 'data' field, treat the entire response as the folder object
    // This handles APIs that return the folder directly
    if (json.containsKey('id') && json.containsKey('name')) {
      return FolderResponse(
        success: true,
        data: Folder.fromJson(json),
        message: json['message'] as String?,
      );
    }

    // Fallback for error responses
    return FolderResponse(
      success: json['success'] as bool? ?? false,
      data: null,
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
