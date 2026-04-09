import 'package:dio/dio.dart';
import '../base_api_client.dart';
import '../../models/google_calendar_connection.dart';

/// Service for Google Calendar integration
class GoogleCalendarService {
  final BaseApiClient _client = BaseApiClient.instance;

  /// Singleton instance
  static final GoogleCalendarService _instance = GoogleCalendarService._internal();
  static GoogleCalendarService get instance => _instance;

  GoogleCalendarService._internal();

  /// Default constructor for backward compatibility
  factory GoogleCalendarService() => _instance;

  /// Get OAuth authorization URL for Google Calendar
  /// [workspaceId] - The workspace to connect Google Calendar to
  /// [returnUrl] - Deep link URL for mobile app callback (e.g., 'deskive://calendar')
  Future<ApiResponse<String>> getAuthUrl(
    String workspaceId, {
    String? returnUrl,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (returnUrl != null) {
        queryParams['returnUrl'] = returnUrl;
      }

      final response = await _client.get(
        '/workspaces/$workspaceId/calendar/google/auth-url',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      final data = response.data;
      String? url;

      // Handle various response formats
      if (data is Map<String, dynamic>) {
        url = data['data']?['authorizationUrl'] as String? ??
            data['data']?['url'] as String? ??
            data['authorizationUrl'] as String? ??
            data['url'] as String? ??
            data['authUrl'] as String? ??
            data['data'] as String?;
      } else if (data is String) {
        url = data;
      }

      if (url != null) {
        return ApiResponse.success(url);
      }

      return ApiResponse.error('Failed to get authorization URL');
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get Google Calendar auth URL',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error('Failed to get Google Calendar auth URL: $e');
    }
  }

  /// Check if Google Calendar is connected for the workspace
  /// Returns connection with available and selected calendars
  Future<ApiResponse<GoogleCalendarConnection?>> getConnection(
    String workspaceId,
  ) async {
    try {
      final response = await _client.get(
        '/workspaces/$workspaceId/calendar/google/connection',
      );

      final data = response.data;
      print('[GoogleCalendarService] Raw response data: $data');
      print('[GoogleCalendarService] Response type: ${data.runtimeType}');

      Map<String, dynamic>? connectionData;

      // Handle various response formats
      if (data is Map<String, dynamic>) {
        print('[GoogleCalendarService] Data keys: ${data.keys.toList()}');

        // Backend returns: { connected: bool, data: connection }
        // Check if it's the expected format with 'connected' field
        if (data.containsKey('connected')) {
          final connected = data['connected'] as bool? ?? false;
          print('[GoogleCalendarService] connected=$connected');

          if (connected && data['data'] != null) {
            connectionData = data['data'] as Map<String, dynamic>?;
          }
        }
        // Fallback: Check if wrapped in 'data' key (e.g., from response interceptor)
        else if (data['data'] is Map<String, dynamic>) {
          final innerData = data['data'] as Map<String, dynamic>;
          if (innerData.containsKey('connected')) {
            final connected = innerData['connected'] as bool? ?? false;
            if (connected && innerData['data'] != null) {
              connectionData = innerData['data'] as Map<String, dynamic>?;
            }
          } else if (innerData.containsKey('id')) {
            connectionData = innerData;
          }
        }
        // Direct connection object (has 'id' field)
        else if (data.containsKey('id')) {
          connectionData = data;
        }

        print('[GoogleCalendarService] Connection data: $connectionData');
      }

      if (connectionData != null && connectionData.isNotEmpty) {
        final connection = GoogleCalendarConnection.fromJson(connectionData);
        print('[GoogleCalendarService] Parsed connection: ${connection.googleEmail}');
        return ApiResponse.success(connection);
      }

      print('[GoogleCalendarService] No connection data found');
      return ApiResponse.success(null);
    } on DioException catch (e) {
      print('[GoogleCalendarService] DioException: ${e.message}, statusCode: ${e.response?.statusCode}');
      print('[GoogleCalendarService] Response data: ${e.response?.data}');
      // 404 means no connection exists - this is not an error
      if (e.response?.statusCode == 404) {
        return ApiResponse.success(null);
      }
      return ApiResponse.error(
        e.message ?? 'Failed to get Google Calendar connection',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      print('[GoogleCalendarService] Exception: $e');
      return ApiResponse.error('Failed to get Google Calendar connection: $e');
    }
  }

  /// Trigger a manual sync with Google Calendar
  Future<ApiResponse<GoogleCalendarSyncResult>> syncCalendar(
    String workspaceId,
  ) async {
    try {
      final response = await _client.post(
        '/workspaces/$workspaceId/calendar/google/sync',
        data: {},
      );

      final data = response.data;
      Map<String, dynamic>? resultData;

      // Handle various response formats
      if (data is Map<String, dynamic>) {
        resultData = data['data'] as Map<String, dynamic>? ?? data;
      }

      if (resultData != null) {
        return ApiResponse.success(
          GoogleCalendarSyncResult.fromJson(resultData),
        );
      }

      return ApiResponse.success(
        GoogleCalendarSyncResult(synced: 0, deleted: 0),
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to sync Google Calendar',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error('Failed to sync Google Calendar: $e');
    }
  }

  /// Disconnect Google Calendar from the workspace
  Future<ApiResponse<void>> disconnect(String workspaceId) async {
    try {
      await _client.delete(
        '/workspaces/$workspaceId/calendar/google/disconnect',
      );
      return ApiResponse.success(null, message: 'Google Calendar disconnected');
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to disconnect Google Calendar',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error('Failed to disconnect Google Calendar: $e');
    }
  }

  /// Update selected calendars for sync
  /// [workspaceId] - The workspace ID
  /// [calendarIds] - List of Google Calendar IDs to sync
  Future<ApiResponse<GoogleCalendarConnection>> updateSelectedCalendars(
    String workspaceId,
    List<String> calendarIds,
  ) async {
    try {
      final response = await _client.put(
        '/workspaces/$workspaceId/calendar/google/calendars',
        data: {'calendarIds': calendarIds},
      );

      final data = response.data;
      Map<String, dynamic>? connectionData;

      // Handle various response formats
      if (data is Map<String, dynamic>) {
        connectionData = data['data'] as Map<String, dynamic>? ??
                         (data.containsKey('id') ? data : null);
      }

      if (connectionData != null && connectionData.isNotEmpty) {
        return ApiResponse.success(
          GoogleCalendarConnection.fromJson(connectionData),
        );
      }

      return ApiResponse.error('Failed to update selected calendars');
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update selected calendars',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error('Failed to update selected calendars: $e');
    }
  }

  /// Refresh available calendars from Google
  /// This fetches the latest list of calendars from the user's Google account
  Future<ApiResponse<GoogleCalendarConnection>> refreshAvailableCalendars(
    String workspaceId,
  ) async {
    try {
      final response = await _client.post(
        '/workspaces/$workspaceId/calendar/google/calendars/refresh',
        data: {},
      );

      final data = response.data;
      Map<String, dynamic>? connectionData;

      // Handle various response formats
      if (data is Map<String, dynamic>) {
        connectionData = data['data'] as Map<String, dynamic>? ??
                         (data.containsKey('id') ? data : null);
      }

      if (connectionData != null && connectionData.isNotEmpty) {
        return ApiResponse.success(
          GoogleCalendarConnection.fromJson(connectionData),
        );
      }

      return ApiResponse.error('Failed to refresh calendars');
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to refresh calendars',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error('Failed to refresh calendars: $e');
    }
  }
}
