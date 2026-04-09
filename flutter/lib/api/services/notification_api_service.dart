import 'package:dio/dio.dart';
import '../base_api_client.dart';

/// DTO classes for Notification operations
class CreateNotificationDto {
  final String? userId; // If null, defaults to current user
  final List<String>? userIds; // For bulk notifications
  final String title;
  final String body;
  final String type; // 'info', 'warning', 'error', 'success', 'reminder'
  final String? actionUrl;
  final String? actionText;
  final String? imageUrl;
  final String? category; // 'task', 'meeting', 'message', 'system'
  final String priority; // 'lowest', 'low', 'medium', 'high', 'highest'
  final bool persistent; // Whether notification persists until dismissed
  final Map<String, dynamic>? metadata;
  final DateTime? scheduledFor; // For scheduled notifications
  
  CreateNotificationDto({
    this.userId,
    this.userIds,
    required this.title,
    required this.body,
    required this.type,
    this.actionUrl,
    this.actionText,
    this.imageUrl,
    this.category,
    this.priority = 'medium',
    this.persistent = false,
    this.metadata,
    this.scheduledFor,
  });
  
  Map<String, dynamic> toJson() => {
    if (userId != null) 'user_id': userId,
    if (userIds != null) 'user_ids': userIds,
    'title': title,
    'body': body,
    'type': type,
    if (actionUrl != null) 'action_url': actionUrl,
    if (actionText != null) 'action_text': actionText,
    if (imageUrl != null) 'image_url': imageUrl,
    if (category != null) 'category': category,
    'priority': priority,
    'persistent': persistent,
    if (metadata != null) 'metadata': metadata,
    if (scheduledFor != null) 'scheduled_for': scheduledFor!.toIso8601String(),
  };
}

class NotificationQueryDto {
  final bool? isRead;
  final bool? isArchived;
  final String? type;
  final String? category;
  final String? priority;
  final DateTime? fromDate;
  final DateTime? toDate;
  final int? limit;
  final int? offset;

  NotificationQueryDto({
    this.isRead,
    this.isArchived,
    this.type,
    this.category,
    this.priority,
    this.fromDate,
    this.toDate,
    this.limit,
    this.offset,
  });

  Map<String, dynamic> toQueryParameters() {
    final map = <String, dynamic>{};
    if (isRead != null) map['is_read'] = isRead;
    if (isArchived != null) map['is_archived'] = isArchived;
    if (type != null) map['type'] = type;
    if (category != null) map['category'] = category;
    if (priority != null) map['priority'] = priority;
    if (fromDate != null) map['from_date'] = fromDate!.toIso8601String();
    if (toDate != null) map['to_date'] = toDate!.toIso8601String();
    if (limit != null) map['limit'] = limit;
    if (offset != null) map['offset'] = offset;
    return map;
  }
}

class UpdatePreferencesDto {
  final NotificationGlobalSettings? global;
  final Map<String, NotificationTypeSettings>? types;
  final QuietHoursSettings? quietHours;
  final int? dailyLimit;
  final NotificationGroupingSettings? grouping;
  final String? language;
  final Map<String, dynamic>? metadata;
  
  UpdatePreferencesDto({
    this.global,
    this.types,
    this.quietHours,
    this.dailyLimit,
    this.grouping,
    this.language,
    this.metadata,
  });
  
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (global != null) map['global'] = global!.toJson();
    if (types != null) {
      map['types'] = types!.map((key, value) => MapEntry(key, value.toJson()));
    }
    if (quietHours != null) map['quiet_hours'] = quietHours!.toJson();
    if (dailyLimit != null) map['daily_limit'] = dailyLimit;
    if (grouping != null) map['grouping'] = grouping!.toJson();
    if (language != null) map['language'] = language;
    if (metadata != null) map['metadata'] = metadata;
    return map;
  }
}

class NotificationGlobalSettings {
  final bool push;
  final bool email;
  final bool inApp;
  
  NotificationGlobalSettings({
    required this.push,
    required this.email,
    required this.inApp,
  });
  
  Map<String, dynamic> toJson() => {
    'push': push,
    'email': email,
    'in_app': inApp,
  };
  
  factory NotificationGlobalSettings.fromJson(Map<String, dynamic> json) {
    return NotificationGlobalSettings(
      push: json['push'] ?? true,
      email: json['email'] ?? true,
      inApp: json['in_app'] ?? true,
    );
  }
}

class NotificationTypeSettings {
  final bool push;
  final bool email;
  final bool inApp;
  
  NotificationTypeSettings({
    required this.push,
    required this.email,
    required this.inApp,
  });
  
  Map<String, dynamic> toJson() => {
    'push': push,
    'email': email,
    'in_app': inApp,
  };
  
  factory NotificationTypeSettings.fromJson(Map<String, dynamic> json) {
    return NotificationTypeSettings(
      push: json['push'] ?? true,
      email: json['email'] ?? true,
      inApp: json['in_app'] ?? true,
    );
  }
}

class QuietHoursSettings {
  final String start; // e.g., "22:00"
  final String end; // e.g., "08:00"
  final List<String> days; // e.g., ["monday", "tuesday"]
  final String timezone;
  
  QuietHoursSettings({
    required this.start,
    required this.end,
    required this.days,
    required this.timezone,
  });
  
  Map<String, dynamic> toJson() => {
    'start': start,
    'end': end,
    'days': days,
    'timezone': timezone,
  };
  
  factory QuietHoursSettings.fromJson(Map<String, dynamic> json) {
    return QuietHoursSettings(
      start: json['start'],
      end: json['end'],
      days: List<String>.from(json['days']),
      timezone: json['timezone'],
    );
  }
}

class NotificationGroupingSettings {
  final bool enabled;
  final int timeWindow; // minutes
  final int maxGroupSize;
  
  NotificationGroupingSettings({
    required this.enabled,
    required this.timeWindow,
    required this.maxGroupSize,
  });
  
  Map<String, dynamic> toJson() => {
    'enabled': enabled,
    'time_window': timeWindow,
    'max_group_size': maxGroupSize,
  };
  
  factory NotificationGroupingSettings.fromJson(Map<String, dynamic> json) {
    return NotificationGroupingSettings(
      enabled: json['enabled'] ?? false,
      timeWindow: json['time_window'] ?? 15,
      maxGroupSize: json['max_group_size'] ?? 5,
    );
  }
}

class SubscribePushDto {
  final String endpoint;
  final String p256dh;
  final String auth;
  final String? deviceId;
  final String? deviceType; // 'ios', 'android', 'web'
  
  SubscribePushDto({
    required this.endpoint,
    required this.p256dh,
    required this.auth,
    this.deviceId,
    this.deviceType,
  });
  
  Map<String, dynamic> toJson() => {
    'endpoint': endpoint,
    'p256dh': p256dh,
    'auth': auth,
    if (deviceId != null) 'device_id': deviceId,
    if (deviceType != null) 'device_type': deviceType,
  };
}

class UnsubscribePushDto {
  final String? endpoint;
  final String? deviceId;
  
  UnsubscribePushDto({
    this.endpoint,
    this.deviceId,
  });
  
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (endpoint != null) map['endpoint'] = endpoint;
    if (deviceId != null) map['device_id'] = deviceId;
    return map;
  }
}

class BulkActionDto {
  final List<String> notificationIds;
  
  BulkActionDto({required this.notificationIds});
  
  Map<String, dynamic> toJson() => {
    'notification_ids': notificationIds,
  };
}

/// Model classes
class NotificationModel {
  final String id;
  final String userId;
  final String title;
  final String body;
  final String type;
  final String? actionUrl;
  final String? actionText;
  final String? imageUrl;
  final String? category;
  final String priority;
  final bool persistent;
  final bool isRead;
  final bool isDelivered;
  final Map<String, dynamic>? metadata;
  final DateTime? scheduledFor;
  final DateTime? deliveredAt;
  final DateTime? readAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  NotificationModel({
    required this.id,
    required this.userId,
    required this.title,
    required this.body,
    required this.type,
    this.actionUrl,
    this.actionText,
    this.imageUrl,
    this.category,
    required this.priority,
    required this.persistent,
    required this.isRead,
    required this.isDelivered,
    this.metadata,
    this.scheduledFor,
    this.deliveredAt,
    this.readAt,
    required this.createdAt,
    required this.updatedAt,
  });
  
  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'],
      userId: json['userId'] ?? json['user_id'],
      title: json['title'],
      body: json['body'] ?? json['message'] ?? '', // Backend uses 'message', Flutter uses 'body'
      type: json['type'],
      actionUrl: json['actionUrl'] ?? json['action_url'],
      actionText: json['actionText'] ?? json['action_text'],
      imageUrl: json['imageUrl'] ?? json['image_url'],
      category: json['category'],
      priority: json['priority'] ?? 'medium',
      persistent: json['persistent'] ?? false,
      isRead: json['isRead'] ?? json['is_read'] ?? false,
      isDelivered: json['isDelivered'] ?? json['is_delivered'] ?? false,
      metadata: json['data'] ?? json['metadata'], // Backend uses 'data', Flutter uses 'metadata'
      scheduledFor: json['scheduledFor'] != null || json['scheduled_for'] != null
          ? DateTime.parse(json['scheduledFor'] ?? json['scheduled_for'])
          : null,
      deliveredAt: json['deliveredAt'] != null || json['delivered_at'] != null
          ? DateTime.parse(json['deliveredAt'] ?? json['delivered_at'])
          : null,
      readAt: json['readAt'] != null || json['read_at'] != null
          ? DateTime.parse(json['readAt'] ?? json['read_at'])
          : null,
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
      updatedAt: json['updatedAt'] != null || json['updated_at'] != null
          ? DateTime.parse(json['updatedAt'] ?? json['updated_at'])
          : DateTime.parse(json['created_at']), // Fallback to created_at if updated_at is missing
    );
  }
}

class NotificationPreferences {
  final String userId;
  final NotificationGlobalSettings global;
  final Map<String, NotificationTypeSettings> types;
  final QuietHoursSettings? quietHours;
  final int? dailyLimit;
  final NotificationGroupingSettings? grouping;
  final String? language;
  final Map<String, dynamic>? metadata;
  
  NotificationPreferences({
    required this.userId,
    required this.global,
    required this.types,
    this.quietHours,
    this.dailyLimit,
    this.grouping,
    this.language,
    this.metadata,
  });
  
  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    final typesJson = json['types'] as Map<String, dynamic>? ?? {};
    final types = typesJson.map((key, value) => 
        MapEntry(key, NotificationTypeSettings.fromJson(value)));
    
    return NotificationPreferences(
      userId: json['user_id'],
      global: NotificationGlobalSettings.fromJson(json['global']),
      types: types,
      quietHours: json['quiet_hours'] != null 
          ? QuietHoursSettings.fromJson(json['quiet_hours'])
          : null,
      dailyLimit: json['daily_limit'],
      grouping: json['grouping'] != null
          ? NotificationGroupingSettings.fromJson(json['grouping'])
          : null,
      language: json['language'],
      metadata: json['metadata'],
    );
  }
}

/// API service for notification operations
class NotificationApiService {
  final BaseApiClient _apiClient;
  
  NotificationApiService({BaseApiClient? apiClient}) 
      : _apiClient = apiClient ?? BaseApiClient.instance;
  
  // ==================== NOTIFICATION OPERATIONS ====================
  
  /// Send a notification to one or multiple users
  Future<ApiResponse<dynamic>> sendNotification(CreateNotificationDto dto) async {
    try {
      final response = await _apiClient.post(
        '/notifications/send',
        data: dto.toJson(),
      );
      
      // Response could be single notification or list for bulk
      final isListResponse = response.data is List;
      final notifications = isListResponse
          ? (response.data as List).map((json) => NotificationModel.fromJson(json)).toList()
          : NotificationModel.fromJson(response.data);
      
      return ApiResponse.success(
        notifications,
        message: 'Notification sent successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to send notification',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get user notifications with filtering and pagination
  Future<ApiResponse<PaginatedResponse<NotificationModel>>> getNotifications(
    NotificationQueryDto query,
  ) async {
    try {
      final response = await _apiClient.get(
        '/notifications',
        queryParameters: query.toQueryParameters(),
      );
      
      final paginatedResponse = PaginatedResponse.fromJson(
        response.data,
        (json) => NotificationModel.fromJson(json),
      );
      
      return ApiResponse.success(
        paginatedResponse,
        message: 'Notifications retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get notifications',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Mark notification as read
  Future<ApiResponse<NotificationModel>> markAsRead(String notificationId) async {
    try {
      final response = await _apiClient.put('/notifications/$notificationId/read');

      // API returns: {"data": [notification]}
      final notificationData = response.data['data'] != null && response.data['data'] is List
          ? (response.data['data'] as List).first
          : response.data;

      return ApiResponse.success(
        NotificationModel.fromJson(notificationData),
        message: 'Notification marked as read',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to mark notification as read',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Mark notification as unread
  Future<ApiResponse<NotificationModel>> markAsUnread(String notificationId) async {
    try {
      final response = await _apiClient.put('/notifications/$notificationId/unread');

      // API returns: {"data": [notification]}
      final notificationData = response.data['data'] != null && response.data['data'] is List
          ? (response.data['data'] as List).first
          : response.data;

      return ApiResponse.success(
        NotificationModel.fromJson(notificationData),
        message: 'Notification marked as unread',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to mark notification as unread',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Delete notification
  Future<ApiResponse<void>> deleteNotification(String notificationId) async {
    try {
      final response = await _apiClient.delete('/notifications/$notificationId');
      
      return ApiResponse.success(
        null,
        message: 'Notification deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete notification',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Mark multiple notifications as read
  Future<ApiResponse<Map<String, int>>> bulkMarkAsRead(BulkActionDto dto) async {
    try {
      final response = await _apiClient.post(
        '/notifications/bulk-read',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        Map<String, int>.from(response.data),
        message: 'Bulk operation completed',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to perform bulk operation',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  // ==================== NOTIFICATION PREFERENCES ====================
  
  /// Get user notification preferences
  Future<ApiResponse<NotificationPreferences>> getNotificationPreferences() async {
    try {
      final response = await _apiClient.get('/notifications/preferences');
      
      return ApiResponse.success(
        NotificationPreferences.fromJson(response.data),
        message: 'Preferences retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get preferences',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Update user notification preferences
  Future<ApiResponse<NotificationPreferences>> updateNotificationPreferences(
    UpdatePreferencesDto dto,
  ) async {
    try {
      final response = await _apiClient.put(
        '/notifications/preferences',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        NotificationPreferences.fromJson(response.data),
        message: 'Preferences updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update preferences',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  // ==================== PUSH SUBSCRIPTION ====================
  
  /// Subscribe to push notifications
  Future<ApiResponse<Map<String, dynamic>>> subscribeToPush(
    SubscribePushDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/notifications/subscribe',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        Map<String, dynamic>.from(response.data),
        message: 'Push subscription created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to subscribe to push notifications',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Unsubscribe from push notifications
  Future<ApiResponse<Map<String, bool>>> unsubscribeFromPush(
    UnsubscribePushDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/notifications/unsubscribe',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        Map<String, bool>.from(response.data),
        message: 'Push subscription removed successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to unsubscribe from push notifications',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  // ==================== UTILITY ENDPOINTS ====================
  
  /// Get count of unread notifications
  Future<ApiResponse<int>> getUnreadCount() async {
    try {
      final response = await _apiClient.get('/notifications/unread-count');
      
      return ApiResponse.success(
        response.data['count'] ?? 0,
        message: 'Unread count retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get unread count',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Mark all notifications as read
  Future<ApiResponse<Map<String, int>>> markAllAsRead() async {
    try {
      final response = await _apiClient.post('/notifications/mark-all-read');
      
      return ApiResponse.success(
        Map<String, int>.from(response.data),
        message: 'All notifications marked as read',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to mark all as read',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Clear all read notifications
  Future<ApiResponse<void>> clearAllRead() async {
    try {
      final response = await _apiClient.delete('/notifications/clear-all');
      
      return ApiResponse.success(
        null,
        message: 'All read notifications cleared successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to clear all read notifications',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
}