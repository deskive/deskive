import 'package:dio/dio.dart';
import '../base_api_client.dart';

// Enums
enum SubscriptionPlan {
  free('FREE'),
  pro('PRO'),
  enterprise('ENTERPRISE');

  const SubscriptionPlan(this.value);
  final String value;
}

/// Extension to add helper properties to SubscriptionPlan
extension SubscriptionPlanExtension on SubscriptionPlan {
  String get displayName {
    switch (this) {
      case SubscriptionPlan.free:
        return 'Free Plan';
      case SubscriptionPlan.pro:
        return 'Pro Plan';
      case SubscriptionPlan.enterprise:
        return 'Enterprise Plan';
    }
  }

  int get memberLimit {
    switch (this) {
      case SubscriptionPlan.free:
        return 5;
      case SubscriptionPlan.pro:
        return 50;
      case SubscriptionPlan.enterprise:
        return 1000;
    }
  }

  int get storageLimit {
    switch (this) {
      case SubscriptionPlan.free:
        return 10;
      case SubscriptionPlan.pro:
        return 100;
      case SubscriptionPlan.enterprise:
        return 1000;
    }
  }

  bool supportsFeature(String feature) {
    switch (this) {
      case SubscriptionPlan.free:
        return false;
      case SubscriptionPlan.pro:
        return ['priority_support', 'advanced_analytics'].contains(feature);
      case SubscriptionPlan.enterprise:
        return true; // Enterprise supports all features
    }
  }
}

enum WorkspaceRole {
  owner('owner'),
  admin('admin'),
  member('member'),
  viewer('viewer');
  
  const WorkspaceRole(this.value);
  final String value;
}

/// DTO classes for Workspace operations
class CreateWorkspaceDto {
  final String name;
  final String? description;
  final String? logo;
  final String? website;
  final SubscriptionPlan subscriptionPlan;
  
  CreateWorkspaceDto({
    required this.name,
    this.description,
    this.logo,
    this.website,
    this.subscriptionPlan = SubscriptionPlan.free,
  });
  
  Map<String, dynamic> toJson() => {
    'name': name,
    if (description != null) 'description': description,
    if (logo != null) 'logo': logo,
    if (website != null) 'website': website,
    // Note: subscription_plan is handled by backend, not sent in create request
  };
}

class UpdateWorkspaceDto {
  final String? name;
  final String? description;
  final String? logo;
  final String? website;
  final SubscriptionPlan? subscriptionPlan;
  final Map<String, dynamic>? settings;
  
  UpdateWorkspaceDto({
    this.name,
    this.description,
    this.logo,
    this.website,
    this.subscriptionPlan,
    this.settings,
  });
  
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (name != null) map['name'] = name;
    if (description != null) map['description'] = description;
    if (logo != null) map['logo'] = logo;
    if (website != null) map['website'] = website;
    if (subscriptionPlan != null) map['subscription_plan'] = subscriptionPlan!.value;
    if (settings != null) map['settings'] = settings;
    return map;
  }
}

class InviteMemberDto {
  final String email;
  final WorkspaceRole role;
  final String? message;
  
  InviteMemberDto({
    required this.email,
    this.role = WorkspaceRole.member,
    this.message,
  });
  
  Map<String, dynamic> toJson() => {
    'email': email,
    'role': role.value,
    if (message != null) 'message': message,
  };
}

class UpdateMemberRoleDto {
  final WorkspaceRole role;
  final List<String>? permissions;
  
  UpdateMemberRoleDto({
    required this.role,
    this.permissions,
  });
  
  Map<String, dynamic> toJson() => {
    'role': role.value,
    if (permissions != null) 'permissions': permissions,
  };
}

/// Model classes
class Workspace {
  final String id;
  final String name;
  final String? description;
  final String ownerId;
  final String? logo;
  final String? website;
  final SubscriptionPlan subscriptionPlan;
  final bool isActive;
  final int? maxMembers;
  final DateTime createdAt;
  final DateTime updatedAt;
  final WorkspaceMembership? membership; // Current user's membership info

  /// Get workspace avatar text (initials from name)
  String get avatarText {
    final words = name.split(' ');
    if (words.length >= 2) {
      return '${words[0][0]}${words[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : 'W';
  }

  /// Check if workspace is at member limit
  bool get isAtMemberLimit {
    if (maxMembers == null) return false;
    return false; // Would need member count to check properly
  }

  Workspace({
    required this.id,
    required this.name,
    this.description,
    required this.ownerId,
    this.logo,
    this.website,
    this.subscriptionPlan = SubscriptionPlan.free,
    this.isActive = true,
    this.maxMembers,
    required this.createdAt,
    required this.updatedAt,
    this.membership,
  });
  
  factory Workspace.fromJson(Map<String, dynamic> json) {
    return Workspace(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      ownerId: json['ownerId'] ?? json['owner_id'],
      logo: json['logo'],
      website: json['website'],
      subscriptionPlan: SubscriptionPlan.values.firstWhere(
        (plan) => plan.value == (json['subscription_plan'] ?? 'FREE'),
        orElse: () => SubscriptionPlan.free,
      ),
      isActive: json['is_active'] ?? true,
      maxMembers: json['max_members'],
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at']),
      membership: json['membership'] != null 
          ? WorkspaceMembership.fromJson(json['membership']) 
          : null,
    );
  }
}

class WorkspaceMembership {
  final WorkspaceRole role;
  final List<String> permissions;
  final DateTime joinedAt;
  
  WorkspaceMembership({
    required this.role,
    required this.permissions,
    required this.joinedAt,
  });
  
  factory WorkspaceMembership.fromJson(Map<String, dynamic> json) {
    return WorkspaceMembership(
      role: WorkspaceRole.values.firstWhere(
        (role) => role.value == json['role'],
        orElse: () => WorkspaceRole.member,
      ),
      permissions: List<String>.from(json['permissions'] ?? []),
      joinedAt: DateTime.parse(json['joined_at']),
    );
  }
  
  bool hasPermission(String permission) {
    return permissions.contains('*') || permissions.contains(permission);
  }
  
  bool canManageMembers() {
    return role == WorkspaceRole.owner || role == WorkspaceRole.admin;
  }
  
  bool canManageWorkspace() {
    return role == WorkspaceRole.owner || role == WorkspaceRole.admin;
  }
  
  bool isOwner() {
    return role == WorkspaceRole.owner;
  }
}

class WorkspaceMember {
  final String id;
  final String userId;
  final String workspaceId;
  final WorkspaceRole role;
  final List<String> permissions;
  final String email;
  final String? name;
  final String? avatar;
  final bool isActive;
  final DateTime joinedAt;
  
  WorkspaceMember({
    required this.id,
    required this.userId,
    required this.workspaceId,
    required this.role,
    required this.permissions,
    required this.email,
    this.name,
    this.avatar,
    this.isActive = true,
    required this.joinedAt,
  });
  
  factory WorkspaceMember.fromJson(Map<String, dynamic> json) {
    // Handle nested user object from API response
    final user = json['user'] as Map<String, dynamic>?;

    // Get userId - prefer user_id from workspace_members, fallback to nested user.id
    final userId = json['userId'] ?? json['user_id'] ?? user?['id'] ?? '';

    return WorkspaceMember(
      id: json['id'],
      userId: userId,
      workspaceId: json['workspaceId'] ?? json['workspace_id'],
      role: WorkspaceRole.values.firstWhere(
        (role) => role.value == json['role'],
        orElse: () => WorkspaceRole.member,
      ),
      permissions: List<String>.from(json['permissions'] ?? []),
      email: user?['email'] ?? json['email'] ?? '',
      name: user?['name'] ?? json['name'],
      avatar: user?['avatar_url'] ?? user?['profileImage'] ?? json['avatar'],
      isActive: json['is_active'] ?? true,
      joinedAt: DateTime.parse(json['joinedAt'] ?? json['joined_at'] ?? json['createdAt'] ?? json['created_at']),
    );
  }
  
  bool hasPermission(String permission) {
    return permissions.contains('*') || permissions.contains(permission);
  }
  
  bool canManageMembers() {
    return role == WorkspaceRole.owner || role == WorkspaceRole.admin;
  }
}

/// API service for workspace operations
class WorkspaceApiService {
  final BaseApiClient _apiClient;
  
  WorkspaceApiService({BaseApiClient? apiClient}) 
      : _apiClient = apiClient ?? BaseApiClient.instance;
  
  /// Create a new workspace
  Future<ApiResponse<Workspace>> createWorkspace(CreateWorkspaceDto dto) async {
    try {
      final response = await _apiClient.post('/workspaces', data: dto.toJson());
      
      return ApiResponse.success(
        Workspace.fromJson(response.data),
        message: 'Workspace created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create workspace',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get all workspaces for the current user
  Future<ApiResponse<List<Workspace>>> getAllWorkspaces() async {
    try {
      final response = await _apiClient.get('/workspaces');
      
      final workspaces = (response.data as List)
          .map((json) => Workspace.fromJson(json))
          .toList();
      
      return ApiResponse.success(
        workspaces,
        message: 'Workspaces retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get workspaces',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get workspace details by ID
  Future<ApiResponse<Workspace>> getWorkspace(String workspaceId) async {
    try {
      final response = await _apiClient.get('/workspaces/$workspaceId');
      
      return ApiResponse.success(
        Workspace.fromJson(response.data),
        message: 'Workspace retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get workspace',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Update workspace details
  Future<ApiResponse<Workspace>> updateWorkspace(
    String workspaceId,
    UpdateWorkspaceDto dto,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId',
        data: dto.toJson(),
      );

      // Response is { data: [...], count: 1 }
      final responseData = response.data;
      Workspace workspace;

      if (responseData is Map && responseData['data'] != null) {
        final dataList = responseData['data'] as List;
        if (dataList.isNotEmpty) {
          workspace = Workspace.fromJson(dataList[0] as Map<String, dynamic>);
        } else {
          throw Exception('Empty data array in response');
        }
      } else if (responseData is Map) {
        // Direct workspace object
        workspace = Workspace.fromJson(responseData as Map<String, dynamic>);
      } else {
        throw Exception('Invalid response format');
      }

      return ApiResponse.success(
        workspace,
        message: 'Workspace updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update workspace',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Delete workspace (owner only)
  Future<ApiResponse<void>> deleteWorkspace(String workspaceId) async {
    try {
      final response = await _apiClient.delete('/workspaces/$workspaceId');
      
      return ApiResponse.success(
        null,
        message: 'Workspace deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete workspace',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Invite a member to the workspace
  Future<ApiResponse<Map<String, dynamic>>> inviteMember(
    String workspaceId,
    InviteMemberDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/members/invite',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        response.data,
        message: response.data['message'] ?? 'Member invitation sent successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to invite member',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get all members of the workspace
  Future<ApiResponse<List<WorkspaceMember>>> getMembers(String workspaceId) async {
    try {
      final response = await _apiClient.get('/workspaces/$workspaceId/members');

      // Handle both array and object response formats
      List<dynamic> memberData;
      if (response.data is List) {
        memberData = response.data;
      } else if (response.data is Map && response.data.containsKey('data')) {
        memberData = response.data['data'];
      } else {
        memberData = [];
      }

      final members = memberData
          .map((json) => WorkspaceMember.fromJson(json))
          .toList();

      return ApiResponse.success(
        members,
        message: 'Members retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get members',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Update member role in the workspace
  Future<ApiResponse<WorkspaceMember>> updateMemberRole(
    String workspaceId,
    String memberId,
    UpdateMemberRoleDto dto,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/members/$memberId/role',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        WorkspaceMember.fromJson(response.data),
        message: 'Member role updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update member role',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Remove member from the workspace
  Future<ApiResponse<void>> removeMember(
    String workspaceId,
    String memberId,
  ) async {
    try {
      final response = await _apiClient.delete('/workspaces/$workspaceId/members/$memberId');
      
      return ApiResponse.success(
        null,
        message: 'Member removed successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to remove member',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
}