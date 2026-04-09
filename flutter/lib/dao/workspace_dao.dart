import 'package:flutter/foundation.dart';
import '../models/workspace/workspace_response.dart';
import 'base_dao_impl.dart';

/// Workspace DAO for handling workspace API operations
class WorkspaceDao extends BaseDaoImpl {
  WorkspaceDao()
      : super(
          baseEndpoint: '/workspaces',
        );

  /// Get all workspaces for the current user
  Future<WorkspaceListResponse> getAllWorkspaces() async {
    try {
      final response = await get<dynamic>('');
      return WorkspaceListResponse.fromJson(response);
    } catch (e) {
      return WorkspaceListResponse(
        success: false,
        message: 'Failed to fetch workspaces: $e',
      );
    }
  }

  /// Get a specific workspace by ID
  Future<WorkspaceResponse> getWorkspace(String workspaceId) async {
    try {
      final response = await get<Map<String, dynamic>>(workspaceId);
      return WorkspaceResponse.fromJson(response);
    } catch (e) {
      return WorkspaceResponse(
        success: false,
        message: 'Failed to fetch workspace: $e',
      );
    }
  }

  /// Create a new workspace
  Future<WorkspaceResponse> createWorkspace({
    required String name,
    String? description,
    String? website,
    String? logo,
  }) async {
    try {
      final data = {
        'name': name,
        if (description != null) 'description': description,
        if (website != null) 'website': website,
        if (logo != null) 'logo': logo,
      };

      final response = await post<Map<String, dynamic>>('', data: data);
      return WorkspaceResponse.fromJson(response);
    } catch (e) {
      return WorkspaceResponse(
        success: false,
        message: 'Failed to create workspace: $e',
      );
    }
  }

  /// Update an existing workspace
  Future<WorkspaceResponse> updateWorkspace(
    String workspaceId, {
    String? name,
    String? description,
    String? website,
    String? logo,
  }) async {
    try {
      final data = {
        if (name != null) 'name': name,
        if (description != null) 'description': description,
        if (website != null) 'website': website,
        if (logo != null) 'logo': logo,
      };

      final response = await patch<Map<String, dynamic>>(
        workspaceId,
        data: data,
      );
      return WorkspaceResponse.fromJson(response);
    } catch (e) {
      return WorkspaceResponse(
        success: false,
        message: 'Failed to update workspace: $e',
      );
    }
  }

  /// Delete a workspace
  Future<bool> deleteWorkspace(String workspaceId) async {
    try {
      await delete<Map<String, dynamic>>(workspaceId);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Get members presence status in a workspace
  Future<List<MemberPresence>> getMembersPresence(String workspaceId) async {
    try {
      debugPrint('[WorkspaceDao] Fetching members presence for workspace: $workspaceId');
      final response = await get<dynamic>('$workspaceId/members/presence');
      debugPrint('[WorkspaceDao] Members presence response type: ${response.runtimeType}');
      debugPrint('[WorkspaceDao] Members presence response: $response');

      if (response is List) {
        debugPrint('[WorkspaceDao] Response is List with ${response.length} items');
        final members = response
            .map((json) => MemberPresence.fromJson(json as Map<String, dynamic>))
            .toList();
        debugPrint('[WorkspaceDao] Parsed ${members.length} members');
        return members;
      }

      debugPrint('[WorkspaceDao] Response is not a List, returning empty');
      return [];
    } catch (e, stack) {
      debugPrint('[WorkspaceDao] Error fetching members presence: $e');
      debugPrint('[WorkspaceDao] Stack: $stack');
      return [];
    }
  }
}

/// Member presence model
class MemberPresence {
  final String userId;
  final String name;
  final String email;
  final String? avatar;
  final String role;
  final String status; // online, offline, away, busy
  final String? lastSeen;
  final int connectionCount;
  final Map<String, dynamic> devices;

  MemberPresence({
    required this.userId,
    required this.name,
    required this.email,
    this.avatar,
    required this.role,
    required this.status,
    this.lastSeen,
    required this.connectionCount,
    required this.devices,
  });

  factory MemberPresence.fromJson(Map<String, dynamic> json) {
    return MemberPresence(
      userId: json['user_id'] as String? ?? json['userId'] as String? ?? '',
      name: json['name'] as String? ?? 'Unknown User',
      email: json['email'] as String? ?? '',
      avatar: json['avatar_url'] as String? ?? json['avatar'] as String?,
      role: json['role'] as String? ?? 'member',
      status: json['status'] as String? ?? 'offline',
      lastSeen: json['lastSeen'] as String? ?? json['last_seen'] as String?,
      connectionCount: json['connectionCount'] as int? ?? json['connection_count'] as int? ?? 0,
      devices: json['devices'] as Map<String, dynamic>? ?? {},
    );
  }
}
