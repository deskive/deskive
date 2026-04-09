import 'package:dio/dio.dart';
import '../../api/base_api_client.dart';
import '../../config/app_config.dart';
import '../models/telegram_models.dart';

/// Service for Telegram Bot API operations
class TelegramService {
  static TelegramService? _instance;
  final BaseApiClient _apiClient = BaseApiClient.instance;

  static TelegramService get instance => _instance ??= TelegramService._internal();

  TelegramService._internal();

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /// Connect with a Telegram bot token
  Future<TelegramConnection> connect(String botToken) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/telegram/connect',
      data: {
        'botToken': botToken,
      },
    );

    final data = _extractData(response.data);
    return TelegramConnection.fromJson(data as Map<String, dynamic>);
  }

  /// Get current Telegram connection status
  Future<TelegramConnection?> getConnection() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/telegram/connection',
      );

      final data = _extractData(response.data);
      if (data == null) return null;

      return TelegramConnection.fromJson(data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  /// Disconnect Telegram
  Future<void> disconnect() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    await _apiClient.delete('/workspaces/$workspaceId/telegram/disconnect');
  }

  /// Test the bot token connection
  Future<TelegramTestConnectionResponse> testConnection(String botToken) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/telegram/test',
      data: {
        'botToken': botToken,
      },
    );

    final data = _extractData(response.data);
    return TelegramTestConnectionResponse.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Bot Information
  // ==========================================================================

  /// Get bot info (getMe)
  Future<TelegramBotInfo> getMe() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/telegram/me',
    );

    final data = _extractData(response.data);
    return TelegramBotInfo.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Messages
  // ==========================================================================

  /// Send a message to a chat
  Future<SendTelegramMessageResponse> sendMessage({
    required dynamic chatId,
    required String text,
    String? parseMode,
    bool? disableNotification,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/telegram/messages',
      data: {
        'chatId': chatId,
        'text': text,
        if (parseMode != null) 'parseMode': parseMode,
        if (disableNotification != null) 'disableNotification': disableNotification,
      },
    );

    final data = _extractData(response.data);
    return SendTelegramMessageResponse.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Updates
  // ==========================================================================

  /// Get updates (long polling)
  Future<TelegramGetUpdatesResponse> getUpdates({
    int? offset,
    int? limit,
    int? timeout,
    List<String>? allowedUpdates,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final queryParams = <String, dynamic>{};
    if (offset != null) queryParams['offset'] = offset.toString();
    if (limit != null) queryParams['limit'] = limit.toString();
    if (timeout != null) queryParams['timeout'] = timeout.toString();
    if (allowedUpdates != null && allowedUpdates.isNotEmpty) {
      queryParams['allowedUpdates'] = allowedUpdates.join(',');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/telegram/updates',
      queryParameters: queryParams,
    );

    final data = _extractData(response.data);
    return TelegramGetUpdatesResponse.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Chats
  // ==========================================================================

  /// Get chat info
  Future<TelegramChat> getChat(dynamic chatId) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/telegram/chats/$chatId',
    );

    final data = _extractData(response.data);
    return TelegramChat.fromJson(data as Map<String, dynamic>);
  }

  /// List recent chats
  Future<TelegramListChatsResponse> listChats() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/telegram/chats',
    );

    final data = _extractData(response.data);
    return TelegramListChatsResponse.fromJson(data as Map<String, dynamic>);
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
