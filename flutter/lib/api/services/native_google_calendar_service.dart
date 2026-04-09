import 'package:dio/dio.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../base_api_client.dart';
import '../../services/workspace_service.dart';
import '../../models/google_calendar_connection.dart';

/// Service for handling native Google Sign-In for Google Calendar integration
/// This bypasses the web OAuth flow and uses native Google Sign-In instead
class NativeGoogleCalendarService {
  static final NativeGoogleCalendarService _instance =
      NativeGoogleCalendarService._internal();
  static NativeGoogleCalendarService get instance => _instance;

  NativeGoogleCalendarService._internal();

  factory NativeGoogleCalendarService() => _instance;

  final BaseApiClient _apiClient = BaseApiClient.instance;
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  /// Web client ID from Google Cloud Console (same as backend uses)
  static const String _webClientId =
      '58379135625-mnmja3cljc5685rvnit16pp2kjmc0r85.apps.googleusercontent.com';

  /// Scopes required for Google Calendar access
  static const List<String> _scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'email',
    'profile',
  ];

  bool _initialized = false;

  /// Get current workspace ID
  String? get _workspaceId => _workspaceService.currentWorkspace?.id;

  /// Initialize Google Sign-In (must be called before any other methods)
  Future<void> _ensureInitialized() async {
    if (!_initialized) {
      await GoogleSignIn.instance.initialize(
        serverClientId: _webClientId,
      );
      _initialized = true;
    }
  }

  /// Connect to Google Calendar using native Google Sign-In
  /// Returns the connection details if successful
  Future<GoogleCalendarConnection> connectWithNativeSignIn() async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      await _ensureInitialized();

      // Sign out first to ensure fresh sign-in
      await GoogleSignIn.instance.signOut();

      // Trigger native Google Sign-In (authentication)
      final GoogleSignInAccount account = await GoogleSignIn.instance.authenticate(
        scopeHint: _scopes,
      );

      // Get server auth code for backend token exchange
      final serverAuth = await account.authorizationClient.authorizeServer(_scopes);
      if (serverAuth == null) {
        throw Exception(
          'Failed to get server auth code. Please try again.',
        );
      }

      final serverAuthCode = serverAuth.serverAuthCode;

      // Send the auth code to backend to exchange for tokens and store connection
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/calendar/google/connect-native',
        data: {
          'serverAuthCode': serverAuthCode,
          'email': account.email,
          'displayName': account.displayName,
          'photoUrl': account.photoUrl,
        },
      );

      final data = _extractData(response.data);
      if (data is Map<String, dynamic>) {
        return GoogleCalendarConnection.fromJson(data);
      }

      throw Exception('Invalid response format from server');
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) {
        throw Exception('Google Sign-In was cancelled');
      }
      throw Exception('Google Sign-In error: ${e.description ?? e.code.name}');
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ??
            'Failed to connect Google Calendar with native sign-in',
      );
    } catch (e) {
      if (e.toString().contains('cancelled') ||
          e.toString().contains('canceled') ||
          e.toString().contains('CANCELED')) {
        throw Exception('Google Sign-In was cancelled');
      }
      rethrow;
    }
  }

  /// Sign out from Google
  Future<void> signOut() async {
    await _ensureInitialized();
    await GoogleSignIn.instance.signOut();
  }

  /// Disconnect Google account completely (revoke access)
  Future<void> disconnect() async {
    await _ensureInitialized();
    await GoogleSignIn.instance.disconnect();
  }

  /// Helper to extract data from various response formats
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
