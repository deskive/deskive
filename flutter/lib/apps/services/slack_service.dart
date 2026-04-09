import 'package:dio/dio.dart';
import '../../api/base_api_client.dart';
import '../../config/app_config.dart';
import '../models/slack_models.dart';

/// Service for Slack API operations
class SlackService {
  static SlackService? _instance;
  final BaseApiClient _apiClient = BaseApiClient.instance;

  static SlackService get instance => _instance ??= SlackService._internal();

  SlackService._internal();

  // ==========================================================================
  // OAuth & Connection
  // ==========================================================================

  /// Get OAuth authorization URL for connecting Slack
  Future<Map<String, String>> getAuthUrl({String? returnUrl}) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{};
    if (returnUrl != null) {
      queryParams['returnUrl'] = returnUrl;
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/slack/auth/url',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return {
      'authorizationUrl': data['authorizationUrl'] as String,
      'state': data['state'] as String? ?? '',
    };
  }

  /// Get current Slack connection status
  Future<SlackConnection?> getConnection() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/slack/connection',
      );

      final data = _extractData(response.data);
      if (data == null) return null;

      return SlackConnection.fromJson(data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  /// Disconnect Slack
  Future<void> disconnect() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    await _apiClient.delete('/workspaces/$workspaceId/slack/disconnect');
  }

  // ==========================================================================
  // Channels
  // ==========================================================================

  /// List channels
  Future<SlackListChannelsResponse> listChannels({
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
      '/workspaces/$workspaceId/slack/channels',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return SlackListChannelsResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Get channel info
  Future<SlackChannel> getChannel(String channelId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/slack/channels/$channelId',
    );

    final data = _extractData(response.data);
    return SlackChannel.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Messages
  // ==========================================================================

  /// List messages in a channel
  Future<SlackListMessagesResponse> listMessages({
    required String channel,
    int? limit,
    String? cursor,
    String? oldest,
    String? latest,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{
      'channel': channel,
    };
    if (limit != null) queryParams['limit'] = limit.toString();
    if (cursor != null) queryParams['cursor'] = cursor;
    if (oldest != null) queryParams['oldest'] = oldest;
    if (latest != null) queryParams['latest'] = latest;

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/slack/messages',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return SlackListMessagesResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Send a message
  Future<SlackSendMessageResponse> sendMessage({
    required String channel,
    required String text,
    String? threadTs,
    bool? replyBroadcast,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/slack/messages',
      data: {
        'channel': channel,
        'text': text,
        if (threadTs != null) 'threadTs': threadTs,
        if (replyBroadcast != null) 'replyBroadcast': replyBroadcast,
      },
    );

    final data = _extractData(response.data);
    return SlackSendMessageResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Delete a message
  Future<void> deleteMessage(String channelId, String ts) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    await _apiClient.delete(
      '/workspaces/$workspaceId/slack/messages/$channelId/$ts',
    );
  }

  // ==========================================================================
  // Reactions
  // ==========================================================================

  /// Add a reaction to a message
  Future<void> addReaction({
    required String channel,
    required String timestamp,
    required String name,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    await _apiClient.post(
      '/workspaces/$workspaceId/slack/reactions',
      data: {
        'channel': channel,
        'timestamp': timestamp,
        'name': name,
      },
    );
  }

  /// Remove a reaction from a message
  Future<void> removeReaction({
    required String channel,
    required String timestamp,
    required String name,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    await _apiClient.delete(
      '/workspaces/$workspaceId/slack/reactions',
      data: {
        'channel': channel,
        'timestamp': timestamp,
        'name': name,
      },
    );
  }

  // ==========================================================================
  // Users
  // ==========================================================================

  /// List users in workspace
  Future<SlackListUsersResponse> listUsers({
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
      '/workspaces/$workspaceId/slack/users',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return SlackListUsersResponse.fromJson(data as Map<String, dynamic>);
  }

  /// Get user info
  Future<SlackUser> getUser(String slackUserId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/slack/users/$slackUserId',
    );

    final data = _extractData(response.data);
    return SlackUser.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Search
  // ==========================================================================

  /// Search messages and files
  Future<Map<String, dynamic>> search({
    required String query,
    int? count,
    int? page,
    String? sort,
    String? sortDir,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{
      'query': query,
    };
    if (count != null) queryParams['count'] = count.toString();
    if (page != null) queryParams['page'] = page.toString();
    if (sort != null) queryParams['sort'] = sort;
    if (sortDir != null) queryParams['sortDir'] = sortDir;

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/slack/search',
      queryParameters: queryParams,
    );

    return _extractData(response.data) as Map<String, dynamic>;
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
