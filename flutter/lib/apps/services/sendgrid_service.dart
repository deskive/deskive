import 'package:dio/dio.dart';
import '../../api/base_api_client.dart';
import '../../config/app_config.dart';
import '../models/sendgrid_models.dart';

/// Service for SendGrid API operations
class SendGridService {
  static SendGridService? _instance;
  final BaseApiClient _apiClient = BaseApiClient.instance;

  static SendGridService get instance => _instance ??= SendGridService._internal();

  SendGridService._internal();

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /// Connect SendGrid with API key
  Future<SendGridConnection> connect({
    required String apiKey,
    required String senderEmail,
    required String senderName,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/sendgrid/connect',
      data: {
        'apiKey': apiKey,
        'senderEmail': senderEmail,
        'senderName': senderName,
      },
    );

    final data = _extractData(response.data);
    return SendGridConnection.fromJson(data as Map<String, dynamic>);
  }

  /// Get current SendGrid connection status
  Future<SendGridConnection?> getConnection() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/sendgrid/connection',
      );

      final data = _extractData(response.data);
      if (data == null) return null;

      return SendGridConnection.fromJson(data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  /// Disconnect SendGrid
  Future<void> disconnect() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    await _apiClient.delete('/workspaces/$workspaceId/sendgrid/disconnect');
  }

  /// Test the SendGrid connection
  Future<SendGridTestConnectionResponse> testConnection() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/sendgrid/test',
      data: {},
    );

    final data = _extractData(response.data);
    return SendGridTestConnectionResponse.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Email Operations
  // ==========================================================================

  /// Send a single email
  Future<SendEmailResponse> sendEmail(SendEmailRequest request) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/sendgrid/send',
      data: request.toJson(),
    );

    final data = _extractData(response.data);
    return SendEmailResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Send bulk emails using a template
  Future<BulkEmailResponse> sendBulkEmail({
    required List<BulkEmailRecipient> recipients,
    required String templateId,
    Map<String, dynamic>? globalData,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/sendgrid/send-bulk',
      data: {
        'recipients': recipients.map((r) => r.toJson()).toList(),
        'templateId': templateId,
        if (globalData != null) 'globalData': globalData,
      },
    );

    final data = _extractData(response.data);
    return BulkEmailResponse.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Templates
  // ==========================================================================

  /// List email templates
  Future<SendGridListTemplatesResponse> listTemplates({
    String? cursor,
    int? limit,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{};
    if (cursor != null) queryParams['cursor'] = cursor;
    if (limit != null) queryParams['limit'] = limit.toString();

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/sendgrid/templates',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return SendGridListTemplatesResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Get a specific template by ID
  Future<SendGridTemplate> getTemplate(String templateId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/sendgrid/templates/$templateId',
    );

    final data = _extractData(response.data);
    return SendGridTemplate.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /// Get email statistics for a date range
  Future<List<SendGridStats>> getStats({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/sendgrid/stats',
      queryParameters: {
        'startDate': startDate.toIso8601String().split('T')[0],
        'endDate': endDate.toIso8601String().split('T')[0],
      },
    );

    final data = _extractData(response.data);
    if (data is List) {
      return data
          .map((e) => SendGridStats.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Get aggregated statistics summary
  Future<Map<String, dynamic>> getStatsSummary({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/sendgrid/stats/summary',
      queryParameters: {
        'startDate': startDate.toIso8601String().split('T')[0],
        'endDate': endDate.toIso8601String().split('T')[0],
      },
    );

    return _extractData(response.data) as Map<String, dynamic>;
  }

  // ==========================================================================
  // Contacts (Optional - if backend supports contact management)
  // ==========================================================================

  /// Add contacts to SendGrid
  Future<Map<String, dynamic>> addContacts(List<SendGridContact> contacts) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/sendgrid/contacts',
      data: {
        'contacts': contacts.map((c) => c.toJson()).toList(),
      },
    );

    return _extractData(response.data) as Map<String, dynamic>;
  }

  /// Search contacts
  Future<List<SendGridContact>> searchContacts({
    String? query,
    int? limit,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{};
    if (query != null) queryParams['query'] = query;
    if (limit != null) queryParams['limit'] = limit.toString();

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/sendgrid/contacts',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    if (data is Map<String, dynamic> && data.containsKey('contacts')) {
      return (data['contacts'] as List<dynamic>)
          .map((e) => SendGridContact.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is List) {
      return data
          .map((e) => SendGridContact.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  dynamic _extractData(dynamic responseData) {
    if (responseData is Map<String, dynamic>) {
      if (responseData.containsKey('data')) {
        return responseData['data'];
      }
      return responseData;
    }
    return responseData;
  }
}
