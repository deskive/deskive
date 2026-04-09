import 'workspace_membership.dart';

/// Workspace model representing a workspace entity
class Workspace {
  final String id;
  final String name;
  final String? description;
  final String? logo;
  final String? website;
  final String subscriptionPlan;
  final String subscriptionTier;
  final String subscriptionStatus;
  final bool isActive;
  final String ownerId;
  final int maxMembers;
  final int maxStorageGb;
  final Map<String, dynamic>? settings;
  final Map<String, dynamic>? metadata;
  final Map<String, dynamic>? collaborativeData;
  final DateTime createdAt;
  final DateTime updatedAt;
  final WorkspaceMembership? membership;

  Workspace({
    required this.id,
    required this.name,
    this.description,
    this.logo,
    this.website,
    this.subscriptionPlan = 'free',
    this.subscriptionTier = 'basic',
    this.subscriptionStatus = 'active',
    required this.isActive,
    required this.ownerId,
    required this.maxMembers,
    required this.maxStorageGb,
    this.settings,
    this.metadata,
    this.collaborativeData,
    required this.createdAt,
    required this.updatedAt,
    this.membership,
  });

  factory Workspace.fromJson(Map<String, dynamic> json) {
    return Workspace(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      logo: json['logo'] as String?,
      website: json['website'] as String?,
      subscriptionPlan: (json['subscription_plan'] as String?) ?? 'free',
      subscriptionTier: (json['subscription_tier'] as String?) ?? 'basic',
      subscriptionStatus: (json['subscription_status'] as String?) ?? 'active',
      isActive: json['is_active'] as bool,
      ownerId: json['owner_id'] as String,
      maxMembers: json['max_members'] as int,
      maxStorageGb: json['max_storage_gb'] as int,
      settings: json['settings'] as Map<String, dynamic>?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      collaborativeData: json['collaborative_data'] as Map<String, dynamic>?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      membership: json['membership'] != null
          ? WorkspaceMembership.fromJson(json['membership'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'logo': logo,
      'website': website,
      'subscription_plan': subscriptionPlan,
      'subscription_tier': subscriptionTier,
      'subscription_status': subscriptionStatus,
      'is_active': isActive,
      'owner_id': ownerId,
      'max_members': maxMembers,
      'max_storage_gb': maxStorageGb,
      'settings': settings,
      'metadata': metadata,
      'collaborative_data': collaborativeData,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'membership': membership?.toJson(),
    };
  }
}
