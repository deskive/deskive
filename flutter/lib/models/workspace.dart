// Export all workspace-related models and enums
export '../api/services/workspace_api_service.dart'
    show Workspace, WorkspaceMember, WorkspaceMembership, SubscriptionPlan, WorkspaceRole;
export '../api/services/workspace_invitation_api_service.dart'
    show WorkspaceInvitation, InvitationAcceptResult, InvitationResponse;

// Additional utility classes and extensions for workspace models
// Note: WorkspaceRoleExtension and SubscriptionPlanExtension are defined in workspace_api_service.dart

/// Extension methods for workspace model
extension WorkspaceExtension on Workspace {
  /// Check if workspace is at member limit
  bool get isAtMemberLimit {
    final currentMemberCount = 1; // This would be calculated from actual member count
    return currentMemberCount >= subscriptionPlan.memberLimit;
  }

  /// Get remaining member slots
  int get remainingMemberSlots {
    final currentMemberCount = 1; // This would be calculated from actual member count
    return (subscriptionPlan.memberLimit - currentMemberCount).clamp(0, subscriptionPlan.memberLimit);
  }

  /// Check if current user can invite members
  bool get canInviteMembers {
    return !isAtMemberLimit && (membership?.canManageMembers() ?? false);
  }

  /// Get workspace avatar/logo URL or initials
  String get avatarText {
    if (logo != null && logo!.isNotEmpty) return logo!;
    
    // Return initials from workspace name
    final words = name.split(' ');
    if (words.length >= 2) {
      return '${words[0][0]}${words[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : 'W';
  }

  /// Check if workspace has a premium subscription
  bool get isPremium {
    return subscriptionPlan != SubscriptionPlan.free;
  }
}

/// Extension methods for workspace member model
extension WorkspaceMemberExtension on WorkspaceMember {
  /// Get member avatar/logo URL or initials
  String get avatarText {
    if (avatar != null && avatar!.isNotEmpty) return avatar!;
    
    if (name != null && name!.isNotEmpty) {
      final words = name!.split(' ');
      if (words.length >= 2) {
        return '${words[0][0]}${words[1][0]}'.toUpperCase();
      }
      return name![0].toUpperCase();
    }
    
    // Fallback to email initial
    return email.isNotEmpty ? email[0].toUpperCase() : 'U';
  }

  /// Get member display name
  String get displayName {
    return name ?? email.split('@')[0];
  }

  /// Check if member is currently online (placeholder)
  bool get isOnline {
    // This would be implemented with real-time presence system
    return false;
  }
}

/// Utility class for workspace statistics
class WorkspaceStats {
  final int totalMembers;
  final int totalProjects;
  final int totalTasks;
  final int totalFiles;
  final double storageUsedMB;
  final DateTime lastActivity;

  WorkspaceStats({
    required this.totalMembers,
    required this.totalProjects,
    required this.totalTasks,
    required this.totalFiles,
    required this.storageUsedMB,
    required this.lastActivity,
  });

  factory WorkspaceStats.fromJson(Map<String, dynamic> json) {
    return WorkspaceStats(
      totalMembers: json['totalMembers'] ?? 0,
      totalProjects: json['totalProjects'] ?? 0,
      totalTasks: json['totalTasks'] ?? 0,
      totalFiles: json['totalFiles'] ?? 0,
      storageUsedMB: (json['storageUsedMB'] ?? 0.0).toDouble(),
      lastActivity: json['lastActivity'] != null 
          ? DateTime.parse(json['lastActivity'])
          : DateTime.now(),
    );
  }

  /// Get storage used as percentage of limit
  double getStorageUsedPercentage(SubscriptionPlan plan) {
    final limitMB = plan.storageLimit * 1024; // Convert GB to MB
    return (storageUsedMB / limitMB * 100).clamp(0.0, 100.0);
  }

  /// Get formatted storage usage
  String get formattedStorageUsed {
    if (storageUsedMB < 1024) {
      return '${storageUsedMB.toStringAsFixed(1)} MB';
    }
    return '${(storageUsedMB / 1024).toStringAsFixed(1)} GB';
  }
}

/// Workspace activity item for activity feeds
class WorkspaceActivity {
  final String id;
  final String type;
  final String userId;
  final String userName;
  final String? userAvatar;
  final String description;
  final DateTime timestamp;
  final Map<String, dynamic>? metadata;

  WorkspaceActivity({
    required this.id,
    required this.type,
    required this.userId,
    required this.userName,
    this.userAvatar,
    required this.description,
    required this.timestamp,
    this.metadata,
  });

  factory WorkspaceActivity.fromJson(Map<String, dynamic> json) {
    return WorkspaceActivity(
      id: json['id'],
      type: json['type'],
      userId: json['userId'],
      userName: json['userName'],
      userAvatar: json['userAvatar'],
      description: json['description'],
      timestamp: DateTime.parse(json['timestamp']),
      metadata: json['metadata'],
    );
  }

  /// Get formatted time ago
  String get timeAgo {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${(difference.inDays / 7).floor()}w ago';
    }
  }

  /// Get activity icon based on type
  String get iconName {
    switch (type) {
      case 'member_joined':
        return 'person_add';
      case 'member_left':
        return 'person_remove';
      case 'project_created':
        return 'folder_shared';
      case 'task_completed':
        return 'task_alt';
      case 'file_uploaded':
        return 'upload_file';
      case 'workspace_updated':
        return 'settings';
      default:
        return 'circle';
    }
  }
}