import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../base_api_client.dart';

// ============================================================================
// INTEGRATION FRAMEWORK TYPES
// ============================================================================

/// Authentication types supported by integrations
enum IntegrationAuthType {
  oauth2,
  oauth1,
  apiKey,
  webhookOnly,
  basicAuth,
}

extension IntegrationAuthTypeExtension on IntegrationAuthType {
  String get value {
    switch (this) {
      case IntegrationAuthType.oauth2:
        return 'oauth2';
      case IntegrationAuthType.oauth1:
        return 'oauth1';
      case IntegrationAuthType.apiKey:
        return 'api_key';
      case IntegrationAuthType.webhookOnly:
        return 'webhook_only';
      case IntegrationAuthType.basicAuth:
        return 'basic_auth';
    }
  }

  static IntegrationAuthType fromString(String? value) {
    switch (value) {
      case 'oauth2':
        return IntegrationAuthType.oauth2;
      case 'oauth1':
        return IntegrationAuthType.oauth1;
      case 'api_key':
        return IntegrationAuthType.apiKey;
      case 'webhook_only':
        return IntegrationAuthType.webhookOnly;
      case 'basic_auth':
        return IntegrationAuthType.basicAuth;
      default:
        return IntegrationAuthType.oauth2;
    }
  }
}

/// Pricing types for integrations
enum IntegrationPricingType {
  free,
  freemium,
  paid,
}

extension IntegrationPricingTypeExtension on IntegrationPricingType {
  String get value {
    switch (this) {
      case IntegrationPricingType.free:
        return 'free';
      case IntegrationPricingType.freemium:
        return 'freemium';
      case IntegrationPricingType.paid:
        return 'paid';
    }
  }

  static IntegrationPricingType fromString(String? value) {
    switch (value) {
      case 'free':
        return IntegrationPricingType.free;
      case 'freemium':
        return IntegrationPricingType.freemium;
      case 'paid':
        return IntegrationPricingType.paid;
      default:
        return IntegrationPricingType.free;
    }
  }
}

/// Connection status for integrations
enum ConnectionStatus {
  active,
  expired,
  revoked,
  error,
  pending,
}

extension ConnectionStatusExtension on ConnectionStatus {
  String get value {
    switch (this) {
      case ConnectionStatus.active:
        return 'active';
      case ConnectionStatus.expired:
        return 'expired';
      case ConnectionStatus.revoked:
        return 'revoked';
      case ConnectionStatus.error:
        return 'error';
      case ConnectionStatus.pending:
        return 'pending';
    }
  }

  static ConnectionStatus fromString(String? value) {
    switch (value) {
      case 'active':
        return ConnectionStatus.active;
      case 'expired':
        return ConnectionStatus.expired;
      case 'revoked':
        return ConnectionStatus.revoked;
      case 'error':
        return ConnectionStatus.error;
      case 'pending':
        return ConnectionStatus.pending;
      default:
        return ConnectionStatus.pending;
    }
  }

  Color get color {
    switch (this) {
      case ConnectionStatus.active:
        return Colors.green;
      case ConnectionStatus.expired:
        return Colors.orange;
      case ConnectionStatus.revoked:
        return Colors.red;
      case ConnectionStatus.error:
        return Colors.red;
      case ConnectionStatus.pending:
        return Colors.blue;
    }
  }

  String get label {
    switch (this) {
      case ConnectionStatus.active:
        return 'Connected';
      case ConnectionStatus.expired:
        return 'Token Expired';
      case ConnectionStatus.revoked:
        return 'Revoked';
      case ConnectionStatus.error:
        return 'Error';
      case ConnectionStatus.pending:
        return 'Pending';
    }
  }
}

/// Integration category types
enum IntegrationCategoryType {
  communication,
  fileStorage,
  calendar,
  email,
  projectManagement,
  crm,
  development,
  analytics,
  marketing,
  documentation,
  design,
  timeTracking,
  videoConferencing,
  automation,
  productivity,
  hr,
  finance,
  support,
  security,
  ecommerce,
  socialMedia,
  ai,
  other,
}

extension IntegrationCategoryTypeExtension on IntegrationCategoryType {
  String get value {
    switch (this) {
      case IntegrationCategoryType.communication:
        return 'COMMUNICATION';
      case IntegrationCategoryType.fileStorage:
        return 'FILE_STORAGE';
      case IntegrationCategoryType.calendar:
        return 'CALENDAR';
      case IntegrationCategoryType.email:
        return 'EMAIL';
      case IntegrationCategoryType.projectManagement:
        return 'PROJECT_MANAGEMENT';
      case IntegrationCategoryType.crm:
        return 'CRM';
      case IntegrationCategoryType.development:
        return 'DEVELOPMENT';
      case IntegrationCategoryType.analytics:
        return 'ANALYTICS';
      case IntegrationCategoryType.marketing:
        return 'MARKETING';
      case IntegrationCategoryType.documentation:
        return 'DOCUMENTATION';
      case IntegrationCategoryType.design:
        return 'DESIGN';
      case IntegrationCategoryType.timeTracking:
        return 'TIME_TRACKING';
      case IntegrationCategoryType.videoConferencing:
        return 'VIDEO_CONFERENCING';
      case IntegrationCategoryType.automation:
        return 'AUTOMATION';
      case IntegrationCategoryType.productivity:
        return 'PRODUCTIVITY';
      case IntegrationCategoryType.hr:
        return 'HR';
      case IntegrationCategoryType.finance:
        return 'FINANCE';
      case IntegrationCategoryType.support:
        return 'SUPPORT';
      case IntegrationCategoryType.security:
        return 'SECURITY';
      case IntegrationCategoryType.ecommerce:
        return 'ECOMMERCE';
      case IntegrationCategoryType.socialMedia:
        return 'SOCIAL_MEDIA';
      case IntegrationCategoryType.ai:
        return 'AI';
      case IntegrationCategoryType.other:
        return 'OTHER';
    }
  }

  String get label {
    switch (this) {
      case IntegrationCategoryType.communication:
        return 'Communication';
      case IntegrationCategoryType.fileStorage:
        return 'Storage';
      case IntegrationCategoryType.calendar:
        return 'Calendar';
      case IntegrationCategoryType.email:
        return 'Email';
      case IntegrationCategoryType.projectManagement:
        return 'Project Management';
      case IntegrationCategoryType.crm:
        return 'CRM';
      case IntegrationCategoryType.development:
        return 'Development';
      case IntegrationCategoryType.analytics:
        return 'Analytics';
      case IntegrationCategoryType.marketing:
        return 'Marketing';
      case IntegrationCategoryType.documentation:
        return 'Documentation';
      case IntegrationCategoryType.design:
        return 'Design';
      case IntegrationCategoryType.timeTracking:
        return 'Time Tracking';
      case IntegrationCategoryType.videoConferencing:
        return 'Video Conferencing';
      case IntegrationCategoryType.automation:
        return 'Automation';
      case IntegrationCategoryType.productivity:
        return 'Productivity';
      case IntegrationCategoryType.hr:
        return 'HR';
      case IntegrationCategoryType.finance:
        return 'Finance';
      case IntegrationCategoryType.support:
        return 'Support';
      case IntegrationCategoryType.security:
        return 'Security';
      case IntegrationCategoryType.ecommerce:
        return 'E-Commerce';
      case IntegrationCategoryType.socialMedia:
        return 'Social Media';
      case IntegrationCategoryType.ai:
        return 'AI';
      case IntegrationCategoryType.other:
        return 'Other';
    }
  }

  IconData get icon {
    switch (this) {
      case IntegrationCategoryType.communication:
        return Icons.chat_bubble_outline;
      case IntegrationCategoryType.fileStorage:
        return Icons.cloud_outlined;
      case IntegrationCategoryType.calendar:
        return Icons.calendar_today_outlined;
      case IntegrationCategoryType.email:
        return Icons.email_outlined;
      case IntegrationCategoryType.projectManagement:
        return Icons.task_alt_outlined;
      case IntegrationCategoryType.crm:
        return Icons.people_outline;
      case IntegrationCategoryType.development:
        return Icons.code;
      case IntegrationCategoryType.analytics:
        return Icons.analytics_outlined;
      case IntegrationCategoryType.marketing:
        return Icons.campaign_outlined;
      case IntegrationCategoryType.documentation:
        return Icons.description_outlined;
      case IntegrationCategoryType.design:
        return Icons.design_services_outlined;
      case IntegrationCategoryType.timeTracking:
        return Icons.timer_outlined;
      case IntegrationCategoryType.videoConferencing:
        return Icons.videocam_outlined;
      case IntegrationCategoryType.automation:
        return Icons.auto_awesome_outlined;
      case IntegrationCategoryType.productivity:
        return Icons.rocket_launch_outlined;
      case IntegrationCategoryType.hr:
        return Icons.badge_outlined;
      case IntegrationCategoryType.finance:
        return Icons.account_balance_outlined;
      case IntegrationCategoryType.support:
        return Icons.support_agent_outlined;
      case IntegrationCategoryType.security:
        return Icons.security_outlined;
      case IntegrationCategoryType.ecommerce:
        return Icons.shopping_cart_outlined;
      case IntegrationCategoryType.socialMedia:
        return Icons.share_outlined;
      case IntegrationCategoryType.ai:
        return Icons.psychology_outlined;
      case IntegrationCategoryType.other:
        return Icons.extension_outlined;
    }
  }

  Color get color {
    switch (this) {
      case IntegrationCategoryType.communication:
        return Colors.purple;
      case IntegrationCategoryType.fileStorage:
        return Colors.blue;
      case IntegrationCategoryType.calendar:
        return Colors.green;
      case IntegrationCategoryType.email:
        return Colors.red;
      case IntegrationCategoryType.projectManagement:
        return Colors.orange;
      case IntegrationCategoryType.crm:
        return Colors.teal;
      case IntegrationCategoryType.development:
        return const Color(0xFF24292E);
      case IntegrationCategoryType.analytics:
        return Colors.indigo;
      case IntegrationCategoryType.marketing:
        return Colors.pink;
      case IntegrationCategoryType.documentation:
        return Colors.brown;
      case IntegrationCategoryType.design:
        return Colors.deepPurple;
      case IntegrationCategoryType.timeTracking:
        return Colors.cyan;
      case IntegrationCategoryType.videoConferencing:
        return Colors.blue;
      case IntegrationCategoryType.automation:
        return Colors.amber;
      case IntegrationCategoryType.productivity:
        return Colors.lightGreen;
      case IntegrationCategoryType.hr:
        return Colors.deepOrange;
      case IntegrationCategoryType.finance:
        return Colors.green;
      case IntegrationCategoryType.support:
        return Colors.blueGrey;
      case IntegrationCategoryType.security:
        return Colors.red;
      case IntegrationCategoryType.ecommerce:
        return Colors.amber;
      case IntegrationCategoryType.socialMedia:
        return Colors.blue;
      case IntegrationCategoryType.ai:
        return Colors.purple;
      case IntegrationCategoryType.other:
        return Colors.grey;
    }
  }

  static IntegrationCategoryType fromString(String? value) {
    switch (value?.toUpperCase()) {
      case 'COMMUNICATION':
        return IntegrationCategoryType.communication;
      case 'FILE_STORAGE':
      case 'STORAGE':
        return IntegrationCategoryType.fileStorage;
      case 'CALENDAR':
        return IntegrationCategoryType.calendar;
      case 'EMAIL':
        return IntegrationCategoryType.email;
      case 'PROJECT_MANAGEMENT':
        return IntegrationCategoryType.projectManagement;
      case 'CRM':
        return IntegrationCategoryType.crm;
      case 'DEVELOPMENT':
        return IntegrationCategoryType.development;
      case 'ANALYTICS':
        return IntegrationCategoryType.analytics;
      case 'MARKETING':
        return IntegrationCategoryType.marketing;
      case 'DOCUMENTATION':
        return IntegrationCategoryType.documentation;
      case 'DESIGN':
        return IntegrationCategoryType.design;
      case 'TIME_TRACKING':
        return IntegrationCategoryType.timeTracking;
      case 'VIDEO_CONFERENCING':
        return IntegrationCategoryType.videoConferencing;
      case 'AUTOMATION':
        return IntegrationCategoryType.automation;
      case 'PRODUCTIVITY':
        return IntegrationCategoryType.productivity;
      case 'HR':
        return IntegrationCategoryType.hr;
      case 'FINANCE':
        return IntegrationCategoryType.finance;
      case 'SUPPORT':
        return IntegrationCategoryType.support;
      case 'SECURITY':
        return IntegrationCategoryType.security;
      case 'ECOMMERCE':
        return IntegrationCategoryType.ecommerce;
      case 'SOCIAL_MEDIA':
        return IntegrationCategoryType.socialMedia;
      case 'AI':
        return IntegrationCategoryType.ai;
      default:
        return IntegrationCategoryType.other;
    }
  }
}

// ============================================================================
// MODELS
// ============================================================================

/// Catalog entry - an available integration in the marketplace
class IntegrationCatalogEntry {
  final String id;
  final String slug;
  final String name;
  final String? description;
  final IntegrationCategoryType category;
  final String? provider;
  final String? logoUrl;
  final String? website;
  final String? documentationUrl;
  final IntegrationAuthType authType;
  final String? apiBaseUrl;
  final bool supportsWebhooks;
  final List<String> capabilities;
  final List<String> features;
  final IntegrationPricingType pricingType;
  final bool isVerified;
  final bool isFeatured;
  final bool isActive;
  final int installCount;
  final double? rating;
  final int reviewCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  IntegrationCatalogEntry({
    required this.id,
    required this.slug,
    required this.name,
    this.description,
    required this.category,
    this.provider,
    this.logoUrl,
    this.website,
    this.documentationUrl,
    required this.authType,
    this.apiBaseUrl,
    required this.supportsWebhooks,
    required this.capabilities,
    required this.features,
    required this.pricingType,
    required this.isVerified,
    required this.isFeatured,
    required this.isActive,
    required this.installCount,
    this.rating,
    required this.reviewCount,
    required this.createdAt,
    required this.updatedAt,
  });

  factory IntegrationCatalogEntry.fromJson(Map<String, dynamic> json) {
    return IntegrationCatalogEntry(
      id: json['id'] ?? '',
      slug: json['slug'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      category: IntegrationCategoryTypeExtension.fromString(json['category']),
      provider: json['provider'],
      logoUrl: json['logoUrl'] ?? json['logo_url'],
      website: json['website'],
      documentationUrl: json['documentationUrl'] ?? json['documentation_url'],
      authType: IntegrationAuthTypeExtension.fromString(json['authType'] ?? json['auth_type']),
      apiBaseUrl: json['apiBaseUrl'] ?? json['api_base_url'],
      supportsWebhooks: json['supportsWebhooks'] ?? json['supports_webhooks'] ?? false,
      capabilities: List<String>.from(json['capabilities'] ?? []),
      features: List<String>.from(json['features'] ?? []),
      pricingType: IntegrationPricingTypeExtension.fromString(json['pricingType'] ?? json['pricing_type']),
      isVerified: json['isVerified'] ?? json['is_verified'] ?? false,
      isFeatured: json['isFeatured'] ?? json['is_featured'] ?? false,
      isActive: json['isActive'] ?? json['is_active'] ?? true,
      installCount: json['installCount'] ?? json['install_count'] ?? 0,
      rating: (json['rating'] as num?)?.toDouble(),
      reviewCount: json['reviewCount'] ?? json['review_count'] ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : json['created_at'] != null
              ? DateTime.parse(json['created_at'])
              : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : json['updated_at'] != null
              ? DateTime.parse(json['updated_at'])
              : DateTime.now(),
    );
  }

  /// Get icon for this integration based on its slug
  IconData get icon {
    switch (slug.toLowerCase()) {
      case 'github':
        return Icons.code;
      case 'slack':
        return Icons.chat_bubble_outline;
      case 'google-drive':
      case 'google_drive':
        return Icons.cloud;
      case 'google-calendar':
      case 'google_calendar':
        return Icons.calendar_today;
      case 'gmail':
        return Icons.email;
      case 'notion':
        return Icons.note;
      case 'jira':
        return Icons.bug_report;
      case 'figma':
        return Icons.design_services;
      case 'zapier':
        return Icons.flash_on;
      case 'trello':
        return Icons.view_kanban;
      case 'asana':
        return Icons.task_alt;
      case 'dropbox':
        return Icons.cloud_upload;
      case 'onedrive':
        return Icons.cloud_circle;
      case 'zoom':
        return Icons.videocam;
      case 'microsoft-teams':
      case 'teams':
        return Icons.groups;
      case 'discord':
        return Icons.headset_mic;
      case 'linear':
        return Icons.linear_scale;
      case 'gitlab':
        return Icons.source;
      case 'bitbucket':
        return Icons.code_off;
      case 'confluence':
        return Icons.article;
      case 'hubspot':
        return Icons.hub;
      case 'salesforce':
        return Icons.cloud_done;
      case 'openai':
        return Icons.psychology;
      case 'stripe':
        return Icons.payment;
      default:
        return category.icon;
    }
  }

  /// Get color for this integration based on its slug
  Color get color {
    switch (slug.toLowerCase()) {
      case 'github':
        return const Color(0xFF24292E);
      case 'slack':
        return const Color(0xFF4A154B);
      case 'google-drive':
      case 'google_drive':
        return const Color(0xFF4285F4);
      case 'google-calendar':
      case 'google_calendar':
        return const Color(0xFF4285F4);
      case 'gmail':
        return const Color(0xFFEA4335);
      case 'notion':
        return Colors.grey.shade800;
      case 'jira':
        return const Color(0xFF0052CC);
      case 'figma':
        return const Color(0xFFF24E1E);
      case 'zapier':
        return const Color(0xFFFF4A00);
      case 'trello':
        return const Color(0xFF0079BF);
      case 'asana':
        return const Color(0xFFF06A6A);
      case 'dropbox':
        return const Color(0xFF0061FF);
      case 'onedrive':
        return const Color(0xFF0078D4);
      case 'zoom':
        return const Color(0xFF2D8CFF);
      case 'microsoft-teams':
      case 'teams':
        return const Color(0xFF6264A7);
      case 'discord':
        return const Color(0xFF5865F2);
      case 'linear':
        return const Color(0xFF5E6AD2);
      case 'gitlab':
        return const Color(0xFFFC6D26);
      case 'bitbucket':
        return const Color(0xFF0052CC);
      case 'confluence':
        return const Color(0xFF172B4D);
      case 'hubspot':
        return const Color(0xFFFF7A59);
      case 'salesforce':
        return const Color(0xFF00A1E0);
      case 'openai':
        return const Color(0xFF10A37F);
      case 'stripe':
        return const Color(0xFF635BFF);
      default:
        return category.color;
    }
  }

  /// Whether this integration supports OAuth flow
  bool get supportsOAuth =>
      authType == IntegrationAuthType.oauth2 || authType == IntegrationAuthType.oauth1;
}

/// Embedded integration info in connection
class ConnectionIntegrationInfo {
  final String slug;
  final String name;
  final String category;
  final String? provider;
  final String? logoUrl;

  ConnectionIntegrationInfo({
    required this.slug,
    required this.name,
    required this.category,
    this.provider,
    this.logoUrl,
  });

  factory ConnectionIntegrationInfo.fromJson(Map<String, dynamic> json) {
    return ConnectionIntegrationInfo(
      slug: json['slug'] ?? '',
      name: json['name'] ?? '',
      category: json['category'] ?? 'OTHER',
      provider: json['provider'],
      logoUrl: json['logoUrl'] ?? json['logo_url'],
    );
  }
}

/// User's connection to an integration
class IntegrationConnection {
  final String id;
  final String workspaceId;
  final String userId;
  final String integrationId;
  final String authType;
  final String? externalId;
  final String? externalEmail;
  final String? externalName;
  final String? externalAvatar;
  final ConnectionStatus status;
  final String? errorMessage;
  final DateTime? lastErrorAt;
  final Map<String, dynamic>? config;
  final Map<String, dynamic>? settings;
  final DateTime? lastSyncedAt;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
  final ConnectionIntegrationInfo? integration;

  IntegrationConnection({
    required this.id,
    required this.workspaceId,
    required this.userId,
    required this.integrationId,
    required this.authType,
    this.externalId,
    this.externalEmail,
    this.externalName,
    this.externalAvatar,
    required this.status,
    this.errorMessage,
    this.lastErrorAt,
    this.config,
    this.settings,
    this.lastSyncedAt,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
    this.integration,
  });

  factory IntegrationConnection.fromJson(Map<String, dynamic> json) {
    return IntegrationConnection(
      id: json['id'] ?? '',
      workspaceId: json['workspaceId'] ?? json['workspace_id'] ?? '',
      userId: json['userId'] ?? json['user_id'] ?? '',
      integrationId: json['integrationId'] ?? json['integration_id'] ?? '',
      authType: json['authType'] ?? json['auth_type'] ?? 'oauth2',
      externalId: json['externalId'] ?? json['external_id'],
      externalEmail: json['externalEmail'] ?? json['external_email'],
      externalName: json['externalName'] ?? json['external_name'],
      externalAvatar: json['externalAvatar'] ?? json['external_avatar'],
      status: ConnectionStatusExtension.fromString(json['status']),
      errorMessage: json['errorMessage'] ?? json['error_message'],
      lastErrorAt: json['lastErrorAt'] != null
          ? DateTime.parse(json['lastErrorAt'])
          : json['last_error_at'] != null
              ? DateTime.parse(json['last_error_at'])
              : null,
      config: json['config'] as Map<String, dynamic>?,
      settings: json['settings'] as Map<String, dynamic>?,
      lastSyncedAt: json['lastSyncedAt'] != null
          ? DateTime.parse(json['lastSyncedAt'])
          : json['last_synced_at'] != null
              ? DateTime.parse(json['last_synced_at'])
              : null,
      isActive: json['isActive'] ?? json['is_active'] ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : json['created_at'] != null
              ? DateTime.parse(json['created_at'])
              : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : json['updated_at'] != null
              ? DateTime.parse(json['updated_at'])
              : DateTime.now(),
      integration: json['integration'] != null
          ? ConnectionIntegrationInfo.fromJson(json['integration'])
          : null,
    );
  }

  /// Get display name (external name or email)
  String get displayName => externalName ?? externalEmail ?? 'Connected';
}

/// Category count for filtering
class CategoryCount {
  final String category;
  final int count;

  CategoryCount({
    required this.category,
    required this.count,
  });

  factory CategoryCount.fromJson(Map<String, dynamic> json) {
    return CategoryCount(
      category: json['category'] ?? '',
      count: json['count'] ?? 0,
    );
  }

  IntegrationCategoryType get categoryType =>
      IntegrationCategoryTypeExtension.fromString(category);
}

/// Catalog filters for API requests
class CatalogFilters {
  final String? search;
  final IntegrationCategoryType? category;
  final IntegrationAuthType? authType;
  final String? provider;
  final bool? featured;
  final bool? verified;
  final IntegrationPricingType? pricingType;
  final int? page;
  final int? limit;
  final String? sortBy;
  final String? sortOrder;

  CatalogFilters({
    this.search,
    this.category,
    this.authType,
    this.provider,
    this.featured,
    this.verified,
    this.pricingType,
    this.page,
    this.limit,
    this.sortBy,
    this.sortOrder,
  });

  Map<String, String> toQueryParams() {
    final params = <String, String>{};
    if (search != null && search!.isNotEmpty) params['search'] = search!;
    if (category != null) params['category'] = category!.value;
    if (authType != null) params['authType'] = authType!.value;
    if (provider != null) params['provider'] = provider!;
    if (featured != null) params['featured'] = featured.toString();
    if (verified != null) params['verified'] = verified.toString();
    if (pricingType != null) params['pricingType'] = pricingType!.value;
    if (page != null) params['page'] = page.toString();
    if (limit != null) params['limit'] = limit.toString();
    if (sortBy != null) params['sortBy'] = sortBy!;
    if (sortOrder != null) params['sortOrder'] = sortOrder!;
    return params;
  }
}

/// Catalog marketplace response
class CatalogMarketplaceResponse {
  final List<IntegrationCatalogEntry> integrations;
  final int total;
  final int page;
  final int limit;
  final int totalPages;

  CatalogMarketplaceResponse({
    required this.integrations,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
  });

  factory CatalogMarketplaceResponse.fromJson(Map<String, dynamic> json) {
    return CatalogMarketplaceResponse(
      integrations: (json['integrations'] as List<dynamic>?)
              ?.map((e) => IntegrationCatalogEntry.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      total: json['total'] ?? 0,
      page: json['page'] ?? 1,
      limit: json['limit'] ?? 20,
      totalPages: json['totalPages'] ?? json['total_pages'] ?? 1,
    );
  }
}

/// Connection list response
class ConnectionListResponse {
  final List<IntegrationConnection> connections;
  final int total;

  ConnectionListResponse({
    required this.connections,
    required this.total,
  });

  factory ConnectionListResponse.fromJson(Map<String, dynamic> json) {
    return ConnectionListResponse(
      connections: (json['connections'] as List<dynamic>?)
              ?.map((e) => IntegrationConnection.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      total: json['total'] ?? 0,
    );
  }
}

// ============================================================================
// API SERVICE
// ============================================================================

/// Integration Framework API Service
class IntegrationFrameworkApiService {
  static IntegrationFrameworkApiService? _instance;
  static IntegrationFrameworkApiService get instance =>
      _instance ??= IntegrationFrameworkApiService._();

  IntegrationFrameworkApiService._();

  Dio get _dio => BaseApiClient.instance.dio;

  // ==================== Catalog APIs ====================

  /// Get integration catalog with optional filters
  Future<CatalogMarketplaceResponse> getCatalog({CatalogFilters? filters}) async {
    try {
      final queryParams = filters?.toQueryParams() ?? {};
      final queryString = queryParams.entries.map((e) => '${e.key}=${e.value}').join('&');
      final response = await _dio.get(
        '/integrations/catalog${queryString.isNotEmpty ? '?$queryString' : ''}',
      );
      final data = response.data['data'] ?? response.data;
      return CatalogMarketplaceResponse.fromJson(data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to get integration catalog');
    }
  }

  /// Get a specific integration by slug
  Future<IntegrationCatalogEntry> getCatalogBySlug(String slug) async {
    try {
      final response = await _dio.get('/integrations/catalog/$slug');
      final data = response.data['data'] ?? response.data;
      return IntegrationCatalogEntry.fromJson(data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to get integration');
    }
  }

  /// Get category counts
  Future<List<CategoryCount>> getCategories() async {
    try {
      final response = await _dio.get('/integrations/catalog/categories');
      final data = response.data['data'] ?? response.data;
      if (data is! List) return [];
      return data.map((e) => CategoryCount.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to get categories');
    }
  }

  // ==================== OAuth APIs ====================

  /// Initiate OAuth flow for an integration
  Future<Map<String, String>> initiateOAuth(
    String workspaceId,
    String slug, {
    String? returnUrl,
  }) async {
    try {
      final response = await _dio.post(
        '/integrations/$workspaceId/connect/$slug',
        data: {'returnUrl': returnUrl ?? ''},
      );
      final data = response.data['data'] ?? response.data;
      return {
        'authUrl': data['authUrl'] ?? data['authorizationUrl'] ?? '',
        'state': data['state'] ?? '',
      };
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to initiate OAuth');
    }
  }

  // ==================== Connection APIs ====================

  /// Get all connections for a workspace
  Future<ConnectionListResponse> getConnections(String workspaceId) async {
    try {
      final response = await _dio.get('/integrations/$workspaceId/connections');
      final data = response.data['data'] ?? response.data;
      return ConnectionListResponse.fromJson(data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to get connections');
    }
  }

  /// Get a specific connection by ID
  Future<IntegrationConnection> getConnection(String workspaceId, String connectionId) async {
    try {
      final response = await _dio.get('/integrations/$workspaceId/connections/$connectionId');
      final data = response.data['data'] ?? response.data;
      return IntegrationConnection.fromJson(data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to get connection');
    }
  }

  /// Get connection by integration slug
  Future<IntegrationConnection?> getConnectionBySlug(String workspaceId, String slug) async {
    try {
      final response = await _dio.get('/integrations/$workspaceId/connections/slug/$slug');
      final data = response.data['data'] ?? response.data;
      if (data == null) return null;
      return IntegrationConnection.fromJson(data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw Exception(e.response?.data?['message'] ?? 'Failed to get connection');
    }
  }

  /// Update connection configuration
  Future<IntegrationConnection> updateConnection(
    String workspaceId,
    String connectionId, {
    Map<String, dynamic>? config,
    Map<String, dynamic>? settings,
  }) async {
    try {
      final response = await _dio.patch(
        '/integrations/$workspaceId/connections/$connectionId',
        data: {
          if (config != null) 'config': config,
          if (settings != null) 'settings': settings,
        },
      );
      final data = response.data['data'] ?? response.data;
      return IntegrationConnection.fromJson(data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to update connection');
    }
  }

  /// Disconnect an integration
  Future<void> disconnect(String workspaceId, String connectionId) async {
    try {
      await _dio.delete('/integrations/$workspaceId/connections/$connectionId');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to disconnect');
    }
  }

  // ==================== API Key Connection ====================

  /// Connect with API key
  Future<IntegrationConnection> connectWithApiKey(
    String workspaceId,
    String slug, {
    required String apiKey,
    Map<String, dynamic>? config,
  }) async {
    try {
      final response = await _dio.post(
        '/integrations/$workspaceId/connect-api-key/$slug',
        data: {
          'apiKey': apiKey,
          if (config != null) 'config': config,
        },
      );
      final data = response.data['data'] ?? response.data;
      return IntegrationConnection.fromJson(data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to connect with API key');
    }
  }

  // ==================== Helper Methods ====================

  /// Check if an integration is connected
  Future<bool> isConnected(String workspaceId, String slug) async {
    final connection = await getConnectionBySlug(workspaceId, slug);
    return connection != null && connection.status == ConnectionStatus.active;
  }

  /// Get connection for a specific catalog entry
  Future<IntegrationConnection?> getConnectionForIntegration(
    String workspaceId,
    IntegrationCatalogEntry entry,
  ) async {
    return getConnectionBySlug(workspaceId, entry.slug);
  }
}
