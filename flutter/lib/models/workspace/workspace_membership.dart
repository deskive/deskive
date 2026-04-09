/// Workspace membership information
class WorkspaceMembership {
  final String role;
  final List<String> permissions;
  final DateTime joinedAt;

  WorkspaceMembership({
    required this.role,
    required this.permissions,
    required this.joinedAt,
  });

  factory WorkspaceMembership.fromJson(Map<String, dynamic> json) {
    return WorkspaceMembership(
      role: json['role'] as String,
      permissions: (json['permissions'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      joinedAt: DateTime.parse(json['joined_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'role': role,
      'permissions': permissions,
      'joined_at': joinedAt.toIso8601String(),
    };
  }

  /// Check if user has a specific permission
  bool hasPermission(String permission) {
    return permissions.contains('*') || permissions.contains(permission);
  }

  /// Check if user can manage members (owner or admin)
  bool canManageMembers() {
    return role == 'owner' || role == 'admin';
  }

  /// Check if user can manage workspace settings (owner or admin)
  bool canManageWorkspace() {
    return role == 'owner' || role == 'admin';
  }

  /// Check if user is the workspace owner
  bool isOwner() {
    return role == 'owner';
  }

  /// Check if user is an admin
  bool isAdmin() {
    return role == 'admin';
  }

  /// Check if user is a member
  bool isMember() {
    return role == 'member';
  }

  /// Check if user is a viewer
  bool isViewer() {
    return role == 'viewer';
  }
}
