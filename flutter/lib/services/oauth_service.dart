import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:app_links/app_links.dart';
import 'dart:async';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../config/app_config.dart';
import '../models/user.dart';
import '../providers/auth_provider.dart';
import 'auth_service.dart';
import 'workspace_management_service.dart';

/// OAuth Service for Social Authentication
/// Handles Google, GitHub, and Apple sign-in flows
class OAuthService {
  static final OAuthService _instance = OAuthService._internal();
  static OAuthService get instance => _instance;

  OAuthService._internal();

  final Dio _dio = Dio();
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;
  bool _authSucceeded = false; // Track if auth succeeded to prevent error flash

  /// Get base URL for OAuth by stripping /api/v1 from API_BASE_URL
  /// This follows the same pattern as widest-life for consistency
  String get _baseUrl {
    final apiUrl = ApiConfig.apiBaseUrl;
    // Strip /api/v1 from the end to get base domain
    return apiUrl.replaceAll(RegExp(r'/api/v1/?$'), '');
  }

  /// Start OAuth flow for a provider
  ///
  /// Providers: 'google', 'github', 'apple'
  ///
  /// Flow:
  /// 1. Opens backend OAuth URL in browser
  /// 2. Backend handles OAuth with provider
  /// 3. Backend redirects to app with tokens
  /// 4. App extracts tokens and exchanges for Deskive token
  Future<void> startOAuthFlow({
    required String provider,
    required BuildContext context,
    required Function(String error) onError,
    Function()? onSuccess,
  }) async {
    // Reset success flag at start
    _authSucceeded = false;

    try {

      // Set up deep link listener BEFORE opening URL
      _setupDeepLinkListener(
        onSuccess: (Map<String, dynamic> authData) async {
          try {
            // Mark auth as succeeded BEFORE any async operations
            _authSucceeded = true;

            // Store tokens and user data
            await _saveAuthData(authData);

            // Reload AuthService session to pick up the new tokens
            await AuthService.instance.reloadSession();

            // Reinitialize AuthProvider (will use the reloaded AuthService)
            await AuthProvider.instance.initialize();

            // Also initialize workspaces
            await WorkspaceManagementService.instance.initialize();


            // Notify caller that OAuth succeeded
            if (onSuccess != null) {
              onSuccess();
            }
          } catch (e) {
            onError('Failed to complete authentication: $e');
          }
        },
        onError: (error) {
          // Only report error if auth hasn't already succeeded
          if (!_authSucceeded) {
            onError(error);
          }
        },
      );

      // Build OAuth URL using API base URL (stripped of /api/v1)
      final oauthUrl = Uri.parse('$_baseUrl/api/v1/auth/oauth/$provider')
          .replace(queryParameters: {
        'frontendUrl': 'deskive://oauth/callback', // Deep link callback
      });


      // Open OAuth URL in Safari View Controller (in-app browser)
      // This satisfies Apple Guideline 4.0 - keeps authentication within the app
      if (await canLaunchUrl(oauthUrl)) {
        // Don't await - the result comes via deep link callback
        // Awaiting causes race condition where exception is thrown when Safari closes
        launchUrl(
          oauthUrl,
          mode: LaunchMode.inAppBrowserView,
        ).catchError((e) {
          // Ignore launch errors after auth succeeded (Safari View Controller dismissal)
          if (!_authSucceeded) {
            onError('Failed to launch OAuth: $e');
            _cleanup();
          }
          return false;
        });
      } else {
        throw Exception('Could not launch OAuth URL');
      }
    } catch (e) {
      // Only report error if auth hasn't already succeeded
      if (!_authSucceeded) {
        onError('Failed to start OAuth: $e');
        _cleanup();
      }
    }
  }

  /// Set up deep link listener for OAuth callback
  void _setupDeepLinkListener({
    required Function(Map<String, dynamic> authData) onSuccess,
    required Function(String error) onError,
  }) {

    _linkSubscription?.cancel();
    _linkSubscription = _appLinks.uriLinkStream.listen(
      (Uri uri) {
        _handleDeepLink(uri, onSuccess, onError);
      },
      onError: (err) {
        onError('Failed to receive OAuth callback: $err');
        _cleanup();
      },
    );
  }

  /// Handle incoming deep link from OAuth callback
  Future<void> _handleDeepLink(
    Uri uri,
    Function(Map<String, dynamic> authData) onSuccess,
    Function(String error) onError,
  ) async {
    try {

      // Check if this is our OAuth callback
      // Accept both /callback and /callback/auth/callback paths
      final isOAuthCallback = uri.scheme == 'deskive' &&
                             uri.host == 'oauth' &&
                             (uri.path == '/callback' || uri.path.contains('/callback'));

      if (!isOAuthCallback) {
        return;
      }

      // Extract tokens from URL
      final accessToken = uri.queryParameters['access_token'];
      final refreshToken = uri.queryParameters['refresh_token'];
      final userId = uri.queryParameters['user_id'];
      final email = uri.queryParameters['email'];
      final provider = uri.queryParameters['provider'];
      final error = uri.queryParameters['error'];

      // Check for errors
      if (error != null) {
        onError('OAuth failed: $error');
        _cleanup();
        return;
      }

      // Validate required params
      if (accessToken == null) {
        onError('No access token received');
        _cleanup();
        return;
      }


      // Exchange Fluxez token for Deskive backend tokens
      final authData = await _exchangeToken(
        fluxezToken: accessToken,
        refreshToken: refreshToken,
        userId: userId,
        email: email,
      );

      // Close the Safari View Controller before calling onSuccess
      // This dismisses the browser overlay so the app navigation is visible
      await closeInAppWebView();

      onSuccess(authData);
      _cleanup();
    } catch (e) {
      onError('Failed to process OAuth callback: $e');
      _cleanup();
    }
  }

  /// Fetch user data using the provided access token
  Future<Map<String, dynamic>> _fetchUserDataWithToken({
    required String accessToken,
    required String refreshToken,
    String? userId,
  }) async {
    try {

      final response = await _dio.get(
        '$_baseUrl/api/v1/auth/me',
        options: Options(
          headers: {
            'Authorization': 'Bearer $accessToken',
          },
        ),
      );

      final responseData = response.data;

      // Return auth data in the expected format
      return {
        'access_token': accessToken,
        'refresh_token': refreshToken,
        'user': responseData['user'] ?? responseData,
      };
    } catch (e) {
      if (e is DioException) {
      }
      throw Exception('Failed to fetch user data: $e');
    }
  }

  /// Exchange Fluxez token for Deskive auth data (tokens + user)
  Future<Map<String, dynamic>> _exchangeToken({
    required String fluxezToken,
    String? refreshToken,
    String? userId,
    String? email,
  }) async {
    try {

      final response = await _dio.post(
        '$_baseUrl/api/v1/auth/oauth/exchange',
        data: {
          'fluxezToken': fluxezToken,
          'refreshToken': refreshToken,
          'userId': userId,
          'email': email,
        },
      );


      final data = response.data as Map<String, dynamic>;

      // Check for different response structures
      if (data['access_token'] != null && data['user'] != null) {
        return data;
      } else if (data['token'] != null && data['user'] != null) {
        // Backend returns 'token' instead of 'access_token'
        return {
          'access_token': data['token'],
          'refresh_token': refreshToken ?? data['token'], // Use original refresh token
          'user': data['user'],
        };
      } else if (data['data'] != null) {
        // Response might be wrapped in a 'data' field
        final innerData = data['data'] as Map<String, dynamic>;
        if (innerData['access_token'] != null && innerData['user'] != null) {
          return innerData;
        }
      }

      // If we get here, the response structure is unexpected
      throw Exception('Invalid OAuth exchange response structure. Response: $data');
    } catch (e) {
      if (e is DioException) {
      }
      throw Exception('Failed to exchange token: $e');
    }
  }

  /// Save authentication data from OAuth
  Future<void> _saveAuthData(Map<String, dynamic> authData) async {
    try {

      final accessToken = authData['access_token'] as String;
      final refreshToken = authData['refresh_token'] as String?;
      final userData = authData['user'] as Map<String, dynamic>;

      // Save tokens to AppConfig
      await AppConfig.setAccessToken(accessToken);
      if (refreshToken != null) {
        await AppConfig.setRefreshToken(refreshToken);
      }

      // Save user data
      final prefs = await SharedPreferences.getInstance();
      final user = User.fromMap(userData);
      await prefs.setString('current_user', user.toJson());

      // Save user and workspace IDs
      if (user.id != null) {
        await AppConfig.setCurrentUserId(user.id!);
      }
      if (user.workspaceId != null) {
        await AppConfig.setCurrentWorkspaceId(user.workspaceId!);
      }

    } catch (e) {
      throw Exception('Failed to save authentication data: $e');
    }
  }

  /// Clean up deep link listener
  void _cleanup() {
    _linkSubscription?.cancel();
    _linkSubscription = null;
    // Don't reset _authSucceeded here - it's needed to prevent error flash after success
  }

  /// Dispose resources
  void dispose() {
    _cleanup();
  }
}
