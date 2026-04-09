import 'package:dio/dio.dart';
import '../base_api_client.dart';

/// DTO classes for Workspace Invitation operations
class AcceptInvitationDto {
  final String invitationToken;
  
  AcceptInvitationDto({required this.invitationToken});
  
  Map<String, dynamic> toJson() => {
    'invitationToken': invitationToken,
  };
}

/// Model classes
class WorkspaceInvitation {
  final String id;
  final String email;
  final String role;
  final String status;
  final String? invitedBy;
  final DateTime invitedAt;
  final DateTime? expiresAt;
  
  WorkspaceInvitation({
    required this.id,
    required this.email,
    required this.role,
    required this.status,
    this.invitedBy,
    required this.invitedAt,
    this.expiresAt,
  });
  
  factory WorkspaceInvitation.fromJson(Map<String, dynamic> json) {
    return WorkspaceInvitation(
      id: json['id'],
      email: json['email'],
      role: json['role'],
      status: json['status'],
      invitedBy: json['invitedBy'],
      invitedAt: DateTime.parse(json['invitedAt']),
      expiresAt: json['expiresAt'] != null ? DateTime.parse(json['expiresAt']) : null,
    );
  }
}

class InvitationAcceptResult {
  final bool success;
  final String workspaceId;
  final String role;
  final String message;
  
  InvitationAcceptResult({
    required this.success,
    required this.workspaceId,
    required this.role,
    required this.message,
  });
  
  factory InvitationAcceptResult.fromJson(Map<String, dynamic> json) {
    return InvitationAcceptResult(
      success: json['success'] ?? true,
      workspaceId: json['workspaceId'],
      role: json['role'] ?? 'member',
      message: json['message'] ?? 'Successfully joined workspace',
    );
  }
}

class InvitationResponse {
  final bool success;
  final String? invitationId;
  final String email;
  final String status;
  final DateTime? expiresAt;
  final String message;
  
  InvitationResponse({
    required this.success,
    this.invitationId,
    required this.email,
    required this.status,
    this.expiresAt,
    required this.message,
  });
  
  factory InvitationResponse.fromJson(Map<String, dynamic> json) {
    return InvitationResponse(
      success: json['success'] ?? true,
      invitationId: json['invitationId'],
      email: json['email'],
      status: json['status'],
      expiresAt: json['expiresAt'] != null ? DateTime.parse(json['expiresAt']) : null,
      message: json['message'] ?? 'Operation completed successfully',
    );
  }
}

/// API service for workspace invitation operations using AppAtOnce teams
class WorkspaceInvitationApiService {
  final BaseApiClient _apiClient;
  
  WorkspaceInvitationApiService({BaseApiClient? apiClient}) 
      : _apiClient = apiClient ?? BaseApiClient.instance;
  
  /// Accept a workspace invitation
  Future<ApiResponse<InvitationAcceptResult>> acceptInvitation(AcceptInvitationDto dto) async {
    try {
      final response = await _apiClient.post('/invitations/accept', data: dto.toJson());
      
      return ApiResponse.success(
        InvitationAcceptResult.fromJson(response.data),
        message: 'Invitation accepted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to accept invitation',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// List pending invitations for a workspace (admin only)
  Future<ApiResponse<List<WorkspaceInvitation>>> listPendingInvitations(String workspaceId) async {
    try {
      final response = await _apiClient.get('/workspaces/$workspaceId/invitations');

      // Handle response structure: {"success": true, "invitations": [...]}
      final data = response.data;
      final invitationsList = data is Map<String, dynamic> && data.containsKey('invitations')
          ? data['invitations'] as List
          : data as List;

      final invitations = invitationsList
          .map((json) => WorkspaceInvitation.fromJson(json))
          .toList();

      return ApiResponse.success(
        invitations,
        message: 'Invitations retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get invitations',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get workspace invitations using alternative endpoint
  Future<ApiResponse<List<WorkspaceInvitation>>> getWorkspaceInvitations(String workspaceId) async {
    try {
      final response = await _apiClient.get('/invitations/workspace/$workspaceId');

      // Handle response structure: {"success": true, "invitations": [...]}
      final data = response.data;
      final invitationsList = data is Map<String, dynamic> && data.containsKey('invitations')
          ? data['invitations'] as List
          : data as List;

      final invitations = invitationsList
          .map((json) => WorkspaceInvitation.fromJson(json))
          .toList();

      return ApiResponse.success(
        invitations,
        message: 'Invitations retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get invitations',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// List all invitations (sent, pending, accepted, declined) for a workspace
  Future<ApiResponse<List<WorkspaceInvitation>>> listAllInvitations(String workspaceId) async {
    try {
      final response = await _apiClient.get('/workspaces/$workspaceId/invitations/all');

      // Handle response structure: {"success": true, "invitations": [...]}
      final data = response.data;
      final invitationsList = data is Map<String, dynamic> && data.containsKey('invitations')
          ? data['invitations'] as List
          : data as List;

      final invitations = invitationsList
          .map((json) => WorkspaceInvitation.fromJson(json))
          .toList();

      return ApiResponse.success(
        invitations,
        message: 'All invitations retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get all invitations',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Cancel a pending invitation (admin only)
  Future<ApiResponse<void>> cancelInvitation(String invitationId, String workspaceId) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/invitations/$invitationId',
      );
      
      return ApiResponse.success(
        null,
        message: 'Invitation cancelled successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to cancel invitation',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Resend an invitation email (admin only)
  Future<ApiResponse<InvitationResponse>> resendInvitation(String invitationId, String workspaceId) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/invitations/$invitationId/resend',
      );

      // API returns: { message, data: { id, email, status, ... }, inviteUrl }
      final responseData = response.data;
      final invitationData = responseData['data'] ?? responseData;

      // Build a properly formatted response for InvitationResponse
      final formattedData = {
        'success': true,
        'invitationId': invitationData['id'],
        'email': invitationData['email'] ?? '',
        'status': invitationData['status'] ?? 'pending',
        'expiresAt': invitationData['expires_at'] ?? invitationData['expiresAt'],
        'message': responseData['message'] ?? 'Invitation resent successfully',
      };

      return ApiResponse.success(
        InvitationResponse.fromJson(formattedData),
        message: responseData['message'] ?? 'Invitation resent successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to resend invitation',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Migrate workspace to AppAtOnce team (one-time migration, owner only)
  Future<ApiResponse<Map<String, dynamic>>> migrateWorkspace(String workspaceId) async {
    try {
      final response = await _apiClient.post('/invitations/migrate/$workspaceId');
      
      return ApiResponse.success(
        response.data,
        message: 'Workspace migrated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to migrate workspace',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
}