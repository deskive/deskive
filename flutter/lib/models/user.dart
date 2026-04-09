import 'dart:convert';

class User {
  final String? id;
  final String email;
  final String name;
  final String? workspaceId;
  final String? avatar_url;
  final String? phone;
  final bool email_verified;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final Map<String, dynamic>? metadata;

  const User({
    this.id,
    required this.email,
    required this.name,
    this.workspaceId,
    this.avatar_url,
    this.phone,
    this.email_verified = false,
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
    this.metadata,
  });

  /// Create a copy of this user with updated fields
  User copyWith({
    String? id,
    String? email,
    String? name,
    String? workspaceId,
    String? avatar_url,
    String? phone,
    bool? email_verified,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, dynamic>? metadata,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      workspaceId: workspaceId ?? this.workspaceId,
      avatar_url: avatar_url ?? this.avatar_url,
      phone: phone ?? this.phone,
      email_verified: email_verified ?? this.email_verified,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      metadata: metadata ?? this.metadata,
    );
  }

  /// Convert user to map for database operations
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'workspace_id': workspaceId,
      'avatar_url': avatar_url,
      'phone': phone,
      'email_verified': email_verified,
      'is_active': isActive,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'metadata': metadata,
    };
  }

  /// Create user from map (database response)
  static User fromMap(Map<String, dynamic> map) {
    // Check multiple possible field names for avatar
    String? avatarUrl = map['avatar_url']?.toString() ??
                       map['avatarUrl']?.toString() ??
                       map['avatar']?.toString() ??
                       map['profileImage']?.toString() ??
                       map['profile_image']?.toString() ??
                       map['profile_picture']?.toString();

    return User(
      id: map['id']?.toString(),
      email: map['email']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      workspaceId: map['workspace_id']?.toString(),
      avatar_url: avatarUrl,
      phone: map['phone']?.toString(),
      email_verified: map['email_verified'] == true || map['email_verified'] == 1,
      isActive: map['is_active'] != false && map['is_active'] != 0, // Default to true
      createdAt: map['created_at'] != null
          ? DateTime.tryParse(map['created_at'].toString())
          : null,
      updatedAt: map['updated_at'] != null
          ? DateTime.tryParse(map['updated_at'].toString())
          : null,
      metadata: map['metadata'] is Map<String, dynamic>
          ? map['metadata']
          : null,
    );
  }

  /// Convert user to JSON string for storage
  String toJson() {
    return json.encode(toMap());
  }

  /// Create user from JSON string
  static User fromJson(String jsonStr) {
    final map = json.decode(jsonStr) as Map<String, dynamic>;
    return fromMap(map);
  }

  /// Get user initials for avatar fallback
  String get initials {
    final nameParts = name.trim().split(' ');
    if (nameParts.isEmpty) return '?';
    if (nameParts.length == 1) {
      return nameParts[0].isNotEmpty ? nameParts[0][0].toUpperCase() : '?';
    }
    return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
  }

  /// Get avatar URL from multiple possible sources
  String? get avatarUrl {
    // First check the main avatar_url field
    if (avatar_url != null && avatar_url!.isNotEmpty && !avatar_url!.contains('example.com')) {
      return avatar_url;
    }

    // Check metadata for alternative field names
    if (metadata != null) {
      final avatar = metadata!['avatar']?.toString();
      if (avatar != null && avatar.isNotEmpty && !avatar.contains('example.com')) {
        return avatar;
      }

      final profileImage = metadata!['profileImage']?.toString();
      if (profileImage != null && profileImage.isNotEmpty && !profileImage.contains('example.com')) {
        return profileImage;
      }

      final profileImg = metadata!['profile_image']?.toString();
      if (profileImg != null && profileImg.isNotEmpty && !profileImg.contains('example.com')) {
        return profileImg;
      }

      final profilePic = metadata!['profile_picture']?.toString();
      if (profilePic != null && profilePic.isNotEmpty && !profilePic.contains('example.com')) {
        return profilePic;
      }

      // Also check avatarUrl in metadata (for OAuth users)
      final metaAvatarUrl = metadata!['avatarUrl']?.toString();
      if (metaAvatarUrl != null && metaAvatarUrl.isNotEmpty && !metaAvatarUrl.contains('example.com')) {
        return metaAvatarUrl;
      }
    }

    return null;
  }

  /// Get display name (fallback to email prefix if name is empty)
  String get displayName {
    if (name.trim().isNotEmpty) return name;
    return email.split('@').first;
  }

  @override
  String toString() {
    return 'User{id: $id, email: $email, name: $name, workspaceId: $workspaceId}';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is User && 
           other.id == id &&
           other.email == email &&
           other.name == name &&
           other.workspaceId == workspaceId;
  }

  @override
  int get hashCode {
    return id.hashCode ^ 
           email.hashCode ^ 
           name.hashCode ^ 
           workspaceId.hashCode;
  }
}