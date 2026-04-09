import 'package:dio/dio.dart';
import '../../models/approval.dart';
import '../base_api_client.dart';
import '../../services/auth_service.dart';

class ApprovalsApiService {
  static final ApprovalsApiService _instance = ApprovalsApiService._internal();
  static ApprovalsApiService get instance => _instance;

  ApprovalsApiService._internal();

  /// Helper to safely extract data from response
  /// Handles both { data: ... } wrapped and direct response formats
  /// NOTE: This method should NOT be used for ApprovalRequest responses
  /// because they have a "data" field for custom fields that could be mistaken for a wrapper
  dynamic _extractData(dynamic responseData) {
    if (responseData is Map && responseData.containsKey('data')) {
      return responseData['data'];
    }
    return responseData;
  }

  /// Helper to safely extract error message from response
  String? _extractMessage(dynamic responseData) {
    if (responseData is Map && responseData.containsKey('message')) {
      return responseData['message']?.toString();
    }
    return null;
  }

  /// Helper to extract ApprovalRequest from response
  /// The API returns the request object directly, but we need to distinguish between:
  /// - A wrapped response like { data: { id: ..., data: {...}, ... } }
  /// - A direct response like { id: ..., data: {...}, ... }
  /// The key is to check if the "data" field contains an "id" (wrapper case) or not (direct case)
  Map<String, dynamic>? _extractApprovalRequest(dynamic responseData) {
    if (responseData is! Map) return null;

    // Check if this looks like a wrapped response (has 'data' key containing an object with 'id')
    if (responseData.containsKey('data') &&
        responseData['data'] is Map &&
        (responseData['data'] as Map).containsKey('id')) {
      return Map<String, dynamic>.from(responseData['data'] as Map);
    }

    // Otherwise, assume it's the request object directly
    if (responseData.containsKey('id')) {
      return Map<String, dynamic>.from(responseData);
    }

    return null;
  }

  // ============ Request Types ============

  /// Get all request types for a workspace
  Future<ApiResponse<List<RequestType>>> getRequestTypes(String workspaceId) async {
    try {
      final response = await AuthService.instance.dio.get(
        '/workspaces/$workspaceId/approvals/types',
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! List) {
          return ApiResponse.error('Invalid response format');
        }

        final List<RequestType> types = data
            .where((item) => item != null && item is Map<String, dynamic>)
            .map((item) => RequestType.fromJson(item as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(types);
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch request types');
    } catch (e) {
      return ApiResponse.error('Failed to fetch request types: $e');
    }
  }

  /// Get a single request type
  Future<ApiResponse<RequestType>> getRequestType(String workspaceId, String typeId) async {
    try {
      final response = await AuthService.instance.dio.get(
        '/workspaces/$workspaceId/approvals/types/$typeId',
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! Map<String, dynamic>) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(RequestType.fromJson(data));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch request type');
    } catch (e) {
      return ApiResponse.error('Failed to fetch request type: $e');
    }
  }

  /// Create a new request type
  Future<ApiResponse<RequestType>> createRequestType(
    String workspaceId, {
    required String name,
    String? description,
    String? color,
    String? icon,
    List<Map<String, dynamic>>? fieldsConfig,
    List<String>? defaultApprovers,
  }) async {
    try {
      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/approvals/types',
        data: {
          'name': name,
          if (description != null) 'description': description,
          if (color != null) 'color': color,
          if (icon != null) 'icon': icon,
          if (fieldsConfig != null) 'fieldsConfig': fieldsConfig,
          if (defaultApprovers != null) 'defaultApprovers': defaultApprovers,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data['data'] ?? response.data;
        return ApiResponse.success(RequestType.fromJson(data as Map<String, dynamic>));
      }
      return ApiResponse.error(response.data['message'] ?? 'Failed to create request type');
    } catch (e) {
      return ApiResponse.error('Failed to create request type: $e');
    }
  }

  /// Update a request type
  Future<ApiResponse<RequestType>> updateRequestType(
    String workspaceId,
    String typeId, {
    String? name,
    String? description,
    String? color,
    String? icon,
    List<Map<String, dynamic>>? fieldsConfig,
    List<String>? defaultApprovers,
    bool? isActive,
  }) async {
    try {
      final response = await AuthService.instance.dio.patch(
        '/workspaces/$workspaceId/approvals/types/$typeId',
        data: {
          if (name != null) 'name': name,
          if (description != null) 'description': description,
          if (color != null) 'color': color,
          if (icon != null) 'icon': icon,
          if (fieldsConfig != null) 'fieldsConfig': fieldsConfig,
          if (defaultApprovers != null) 'defaultApprovers': defaultApprovers,
          if (isActive != null) 'isActive': isActive,
        },
      );

      if (response.statusCode == 200) {
        final data = response.data['data'] ?? response.data;
        return ApiResponse.success(RequestType.fromJson(data as Map<String, dynamic>));
      }
      return ApiResponse.error(response.data['message'] ?? 'Failed to update request type');
    } catch (e) {
      return ApiResponse.error('Failed to update request type: $e');
    }
  }

  /// Delete a request type
  Future<ApiResponse<bool>> deleteRequestType(String workspaceId, String typeId) async {
    try {
      final response = await AuthService.instance.dio.delete(
        '/workspaces/$workspaceId/approvals/types/$typeId',
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        return ApiResponse.success(true);
      }
      return ApiResponse.error(response.data['message'] ?? 'Failed to delete request type');
    } catch (e) {
      return ApiResponse.error('Failed to delete request type: $e');
    }
  }

  // ============ Approval Requests ============

  /// Get all approval requests for a workspace
  Future<ApiResponse<List<ApprovalRequest>>> getRequests(
    String workspaceId, {
    RequestStatus? status,
    String? typeId,
    String? requesterId,
    RequestPriority? priority,
    bool? pendingMyApproval,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null) queryParams['status'] = status.value;
      if (typeId != null) queryParams['requestTypeId'] = typeId;
      if (requesterId != null) queryParams['requesterId'] = requesterId;
      if (priority != null) queryParams['priority'] = priority.value;
      if (pendingMyApproval != null) queryParams['pendingMyApproval'] = pendingMyApproval;

      final response = await AuthService.instance.dio.get(
        '/workspaces/$workspaceId/approvals/requests',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      if (response.statusCode == 200) {
        final responseData = _extractData(response.data);

        // Backend returns { requests: [...], total: number }
        List? data;
        if (responseData is Map && responseData.containsKey('requests')) {
          data = responseData['requests'] as List?;
        } else if (responseData is List) {
          data = responseData;
        }

        if (data == null) {
          return ApiResponse.error('Invalid response format');
        }

        final List<ApprovalRequest> requests = data
            .where((item) => item != null && item is Map<String, dynamic>)
            .map((item) => ApprovalRequest.fromJson(item as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(requests);
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch requests');
    } catch (e) {
      return ApiResponse.error('Failed to fetch requests: $e');
    }
  }

  /// Get a single approval request
  Future<ApiResponse<ApprovalRequest>> getRequest(String workspaceId, String requestId) async {
    try {
      final response = await AuthService.instance.dio.get(
        '/workspaces/$workspaceId/approvals/requests/$requestId',
      );

      if (response.statusCode == 200) {
        final requestData = _extractApprovalRequest(response.data);

        if (requestData == null) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(ApprovalRequest.fromJson(requestData));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch request');
    } catch (e) {
      return ApiResponse.error('Failed to fetch request: $e');
    }
  }

  /// Create a new approval request
  Future<ApiResponse<ApprovalRequest>> createRequest(
    String workspaceId, {
    required String typeId,
    required String title,
    String? description,
    RequestPriority priority = RequestPriority.normal,
    required List<String> approverIds,
    Map<String, dynamic>? data,
    List<String>? attachments,
    DateTime? dueDate,
  }) async {
    try {
      final requestBody = {
        'requestTypeId': typeId,
        'title': title,
        'priority': priority.value,
        'approverIds': approverIds,
      };

      if (description != null && description.isNotEmpty) {
        requestBody['description'] = description;
      }
      if (data != null && data.isNotEmpty) {
        requestBody['data'] = data;
      }
      if (attachments != null && attachments.isNotEmpty) {
        requestBody['attachments'] = attachments;
      }
      if (dueDate != null) {
        requestBody['dueDate'] = dueDate.toIso8601String();
      }

      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/approvals/requests',
        data: requestBody,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final requestData = _extractApprovalRequest(response.data);

        if (requestData == null) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(ApprovalRequest.fromJson(requestData));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to create request');
    } catch (e) {
      return ApiResponse.error('Failed to create request: $e');
    }
  }

  /// Update an approval request
  Future<ApiResponse<ApprovalRequest>> updateRequest(
    String workspaceId,
    String requestId, {
    String? title,
    String? description,
    RequestPriority? priority,
    Map<String, dynamic>? data,
    List<String>? attachments,
    DateTime? dueDate,
  }) async {
    try {
      final response = await AuthService.instance.dio.patch(
        '/workspaces/$workspaceId/approvals/requests/$requestId',
        data: {
          if (title != null) 'title': title,
          if (description != null) 'description': description,
          if (priority != null) 'priority': priority.value,
          if (data != null) 'data': data,
          if (attachments != null) 'attachments': attachments,
          if (dueDate != null) 'dueDate': dueDate.toIso8601String(),
        },
      );

      if (response.statusCode == 200) {
        final requestData = _extractApprovalRequest(response.data);
        if (requestData == null) {
          return ApiResponse.error('Invalid response format');
        }
        return ApiResponse.success(ApprovalRequest.fromJson(requestData));
      }
      return ApiResponse.error(response.data['message'] ?? 'Failed to update request');
    } catch (e) {
      return ApiResponse.error('Failed to update request: $e');
    }
  }

  /// Approve a request
  Future<ApiResponse<ApprovalRequest>> approveRequest(
    String workspaceId,
    String requestId, {
    String? comments,
  }) async {
    try {
      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/approvals/requests/$requestId/approve',
        data: {
          if (comments != null) 'comments': comments,
        },
        options: Options(
          receiveTimeout: const Duration(seconds: 60),
        ),
      );

      if (response.statusCode == 200) {
        final requestData = _extractApprovalRequest(response.data);
        if (requestData == null) {
          return ApiResponse.error('Invalid response format');
        }
        return ApiResponse.success(ApprovalRequest.fromJson(requestData));
      }
      return ApiResponse.error(response.data['message'] ?? 'Failed to approve request');
    } catch (e) {
      return ApiResponse.error('Failed to approve request: $e');
    }
  }

  /// Reject a request
  Future<ApiResponse<ApprovalRequest>> rejectRequest(
    String workspaceId,
    String requestId, {
    required String reason,
  }) async {
    try {
      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/approvals/requests/$requestId/reject',
        data: {
          'reason': reason,
        },
        options: Options(
          receiveTimeout: const Duration(seconds: 60),
        ),
      );

      if (response.statusCode == 200) {
        final requestData = _extractApprovalRequest(response.data);
        if (requestData == null) {
          return ApiResponse.error('Invalid response format');
        }
        return ApiResponse.success(ApprovalRequest.fromJson(requestData));
      }
      return ApiResponse.error(response.data['message'] ?? 'Failed to reject request');
    } catch (e) {
      return ApiResponse.error('Failed to reject request: $e');
    }
  }

  /// Cancel a request
  Future<ApiResponse<ApprovalRequest>> cancelRequest(String workspaceId, String requestId) async {
    try {
      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/approvals/requests/$requestId/cancel',
        data: {},
      );

      if (response.statusCode == 200) {
        final requestData = _extractApprovalRequest(response.data);
        if (requestData == null) {
          return ApiResponse.error('Invalid response format');
        }
        return ApiResponse.success(ApprovalRequest.fromJson(requestData));
      }
      return ApiResponse.error(response.data['message'] ?? 'Failed to cancel request');
    } catch (e) {
      return ApiResponse.error('Failed to cancel request: $e');
    }
  }

  /// Delete a request
  Future<ApiResponse<bool>> deleteRequest(String workspaceId, String requestId) async {
    try {
      final response = await AuthService.instance.dio.delete(
        '/workspaces/$workspaceId/approvals/requests/$requestId',
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        return ApiResponse.success(true);
      }
      return ApiResponse.error(response.data['message'] ?? 'Failed to delete request');
    } catch (e) {
      return ApiResponse.error('Failed to delete request: $e');
    }
  }

  // ============ Comments ============

  /// Get comments for a request
  Future<ApiResponse<List<ApprovalComment>>> getComments(
    String workspaceId,
    String requestId,
  ) async {
    try {
      final response = await AuthService.instance.dio.get(
        '/workspaces/$workspaceId/approvals/requests/$requestId/comments',
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! List) {
          return ApiResponse.error('Invalid response format');
        }

        final List<ApprovalComment> comments = data
            .where((item) => item != null && item is Map<String, dynamic>)
            .map((item) => ApprovalComment.fromJson(item as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(comments);
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch comments');
    } catch (e) {
      return ApiResponse.error('Failed to fetch comments: $e');
    }
  }

  /// Add a comment to a request
  Future<ApiResponse<ApprovalComment>> addComment(
    String workspaceId,
    String requestId, {
    required String content,
    bool isInternal = false,
  }) async {
    try {
      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/approvals/requests/$requestId/comments',
        data: {
          'content': content,
          'isInternal': isInternal,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data['data'] ?? response.data;
        return ApiResponse.success(ApprovalComment.fromJson(data as Map<String, dynamic>));
      }
      return ApiResponse.error(response.data['message'] ?? 'Failed to add comment');
    } catch (e) {
      return ApiResponse.error('Failed to add comment: $e');
    }
  }

  /// Delete a comment
  Future<ApiResponse<bool>> deleteComment(
    String workspaceId,
    String requestId,
    String commentId,
  ) async {
    try {
      final response = await AuthService.instance.dio.delete(
        '/workspaces/$workspaceId/approvals/requests/$requestId/comments/$commentId',
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        return ApiResponse.success(true);
      }
      return ApiResponse.error(response.data['message'] ?? 'Failed to delete comment');
    } catch (e) {
      return ApiResponse.error('Failed to delete comment: $e');
    }
  }

  // ============ Statistics ============

  /// Get approval statistics for a workspace
  Future<ApiResponse<ApprovalStats>> getStats(String workspaceId) async {
    try {
      final response = await AuthService.instance.dio.get(
        '/workspaces/$workspaceId/approvals/stats',
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! Map<String, dynamic>) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(ApprovalStats.fromJson(data));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch stats');
    } catch (e) {
      return ApiResponse.error('Failed to fetch stats: $e');
    }
  }
}
