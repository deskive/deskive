import 'file.dart';

/// Paginated response model for file list API
class FileListResponse {
  final bool success;
  final List<File>? data;
  final int? currentPage;
  final int? totalPages;
  final int? totalItems;
  final int? itemsPerPage;
  final bool? hasNextPage;
  final bool? hasPreviousPage;
  final String? message;

  FileListResponse({
    required this.success,
    this.data,
    this.currentPage,
    this.totalPages,
    this.totalItems,
    this.itemsPerPage,
    this.hasNextPage,
    this.hasPreviousPage,
    this.message,
  });

  factory FileListResponse.fromJson(dynamic json) {
    // Handle object response with pagination
    if (json is Map<String, dynamic>) {
      // Check for both 'data' and 'items' keys (different APIs use different keys)
      final filesList = json['data'] ?? json['items'];

      final files = filesList != null
          ? (filesList as List)
              .map((item) => File.fromJson(item as Map<String, dynamic>))
              .toList()
          : <File>[];

      return FileListResponse(
        success: true,
        data: files,
        currentPage: json['currentPage'] as int?,
        totalPages: json['totalPages'] as int?,
        totalItems: json['totalItems'] as int?,
        itemsPerPage: json['itemsPerPage'] as int?,
        hasNextPage: json['hasNextPage'] as bool?,
        hasPreviousPage: json['hasPreviousPage'] as bool?,
        message: json['message'] as String?,
      );
    }

    return FileListResponse(
      success: false,
      message: 'Invalid response format',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'data': data?.map((f) => f.toJson()).toList(),
      'currentPage': currentPage,
      'totalPages': totalPages,
      'totalItems': totalItems,
      'itemsPerPage': itemsPerPage,
      'hasNextPage': hasNextPage,
      'hasPreviousPage': hasPreviousPage,
      'message': message,
    };
  }
}

/// Response model for single file API
class FileResponse {
  final bool success;
  final File? data;
  final String? message;

  FileResponse({
    required this.success,
    this.data,
    this.message,
  });

  factory FileResponse.fromJson(Map<String, dynamic> json) {
    // Check if response has 'data' wrapper (wrapped response)
    if (json.containsKey('data') && json['data'] is Map<String, dynamic>) {
      return FileResponse(
        success: json['success'] as bool? ?? true,
        data: File.fromJson(json['data'] as Map<String, dynamic>),
        message: json['message'] as String?,
      );
    }

    // Handle direct file object response (no 'data' wrapper)
    // If response has 'id' field, it's a direct file object
    if (json.containsKey('id') && json.containsKey('workspace_id')) {
      return FileResponse(
        success: true,
        data: File.fromJson(json),
        message: json['message'] as String?,
      );
    }

    // Handle error responses
    return FileResponse(
      success: json['success'] as bool? ?? false,
      data: null,
      message: json['message'] as String? ?? 'Unknown error',
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
