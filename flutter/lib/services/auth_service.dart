import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../config/app_config.dart';
import '../models/user.dart';
import 'fcm_service.dart';
import 'video_call_socket_service.dart';
import 'workspace_management_service.dart';
import 'workspace_service.dart';
import 'tab_configuration_service.dart';
import 'crypto/encryption_service.dart';

/// Authentication service using Dio for REST API calls to backend
class AuthService extends ChangeNotifier {
  static AuthService? _instance;
  static AuthService get instance => _instance ??= AuthService._();

  AuthService._();

  late Dio _dio;
  User? _currentUser;
  bool _isInitialized = false;
  bool _isAuthenticated = false;
  bool _isSigningOut = false; // Prevent recursive signOut calls
  String? _accessToken;
  String? _refreshToken;
  
  // Getters
  bool get isInitialized => _isInitialized;
  bool get isAuthenticated => _isAuthenticated;
  User? get currentUser => _currentUser;
  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  Dio get dio => _dio;

  /// Returns the current session token (access token)
  String? get currentSession => _accessToken;
  
  /// Initialize the auth service
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {

      // Initialize Dio client
      _dio = Dio(BaseOptions(
        baseUrl: AppConfig.backendBaseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ));

      // Add interceptor for logging
      _dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
        error: true,
      ));

      // Add interceptor for auth token and automatic refresh on 401
      _dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_accessToken != null) {
            options.headers['Authorization'] = 'Bearer $_accessToken';
          }
          return handler.next(options);
        },
        onError: (DioException error, ErrorInterceptorHandler handler) async {
          // Handle 401 Unauthorized errors
          if (error.response?.statusCode == 401) {
            // Skip auto-signout if already signing out (prevents infinite loop)
            if (_isSigningOut) {
              return handler.next(error);
            }

            final requestPath = error.requestOptions.path;

            // Skip auto-signout for auth endpoints (login/register 401 is expected for invalid credentials)
            if (requestPath.contains('/auth/login') || requestPath.contains('/auth/register')) {
              return handler.next(error);
            }

            // Skip auto-signout for FCM unregister endpoint (it's called during logout)
            if (requestPath.contains('unregister-token')) {
              return handler.next(error);
            }


            // Check if we have a refresh token
            if (_refreshToken != null) {
              try {
                // Try to refresh the token
                await refreshSession();

                // Retry the original request with the new token
                final options = error.requestOptions;
                options.headers['Authorization'] = 'Bearer $_accessToken';

                final response = await _dio.fetch(options);
                return handler.resolve(response);
              } catch (refreshError) {

                // Sign out user if refresh fails
                await signOut();

                return handler.reject(
                  DioException(
                    requestOptions: error.requestOptions,
                    error: 'Session expired. Please sign in again.',
                    type: DioExceptionType.badResponse,
                  ),
                );
              }
            } else {
              await signOut();
            }
          }

          // For other errors, pass them through
          return handler.next(error);
        },
      ));


      // Check for existing tokens
      await _loadStoredTokens();

      _isInitialized = true;

    } catch (e) {
      rethrow;
    }
  }
  
  /// Reload session from storage (useful after OAuth)
  Future<void> reloadSession() async {
    await _loadStoredTokens();
    notifyListeners();
  }

  /// Load stored tokens from local storage and validate them
  Future<void> _loadStoredTokens() async {
    try {
      _accessToken = await AppConfig.getAccessToken();
      _refreshToken = await AppConfig.getRefreshToken();
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString('current_user');

      if (_accessToken != null && userJson != null) {
        _currentUser = User.fromJson(userJson);

        // Validate the token by making a test API call
        try {
          await _validateToken();
          _isAuthenticated = true;
        } catch (e) {
          // Token is invalid/expired - clear stored data
          await _clearStoredData();
          _accessToken = null;
          _refreshToken = null;
          _currentUser = null;
          _isAuthenticated = false;
        }
      } else {
        _isAuthenticated = false;
      }
    } catch (e) {
      _isAuthenticated = false;
    }
  }

  /// Validate the current access token and refresh user data
  Future<void> _validateToken() async {
    try {
      // Make a test API call to validate the token
      // Using a lightweight endpoint like /auth/me or /auth/validate
      final response = await _dio.get('/auth/me');

      if (response.statusCode != 200) {
        throw Exception('Token validation failed');
      }

      // Update current user with latest data from backend (including avatar_url)
      final userData = response.data['user'] ?? response.data;
      if (userData != null) {
        _currentUser = User.fromMap(userData);
        // Save updated user data to local storage
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('current_user', _currentUser!.toJson());
      }
    } catch (e) {
      // Token is invalid
      throw Exception('Invalid token');
    }
  }
  
  /// Save tokens and user data to local storage
  Future<void> _saveTokensAndUser(String accessToken, String refreshToken, User user) async {
    try {
      await AppConfig.setAccessToken(accessToken);
      await AppConfig.setRefreshToken(refreshToken);
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('current_user', user.toJson());
      
      // Also save user and workspace IDs to AppConfig
      if (user.id != null) {
        await AppConfig.setCurrentUserId(user.id!);

        // Initialize E2EE
        try {
          await EncryptionService().initialize(user.id!);
        } catch (e) {
          print('E2EE init failed: $e');
        }
      }
      if (user.workspaceId != null) {
        await AppConfig.setCurrentWorkspaceId(user.workspaceId!);
      }

    } catch (e) {
    }
  }
  
  /// Clear stored tokens and user data
  Future<void> _clearStoredData() async {
    try {
      // Clear E2EE keys
      await EncryptionService().clearKeys();

      await AppConfig.clearTokens();
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('current_user');
      await prefs.remove('user_workspaces');
      await prefs.remove('user_tab_configuration'); // Clear tab arrangement on logout
      await AppConfig.clearStoredIds();

    } catch (e) {
    }
  }

  /// Fetch user's workspaces and save to SharedPreferences
  Future<void> _fetchAndSaveWorkspaces() async {
    try {

      final response = await _dio.get('/workspaces');

      if (response.statusCode != 200) {
        return;
      }

      final workspacesData = response.data;

      // Save workspaces to SharedPreferences as JSON string
      final prefs = await SharedPreferences.getInstance();

      // Properly encode to JSON string
      final workspacesJson = jsonEncode(workspacesData);
      await prefs.setString('user_workspaces', workspacesJson);

      // Set workspace ID - prefer previously stored one if it's still valid
      if (workspacesData is List && workspacesData.isNotEmpty) {
        // Check if there's a stored workspace ID that's still valid
        final storedWorkspaceId = await AppConfig.getCurrentWorkspaceId();
        String? workspaceIdToUse;

        if (storedWorkspaceId != null) {
          // Validate the stored workspace ID exists in user's workspaces
          final isValid = workspacesData.any(
            (w) => w['id'] == storedWorkspaceId,
          );

          if (isValid) {
            // Stored workspace ID is valid - keep it
            workspaceIdToUse = storedWorkspaceId;
            debugPrint('AuthService: Using previously stored workspace: $storedWorkspaceId');
          } else {
            // Stored workspace ID is stale - clear it and use first workspace
            debugPrint('AuthService: Clearing stale workspace ID: $storedWorkspaceId');
            await prefs.remove('current_workspace_id');
          }
        }

        // If no valid stored workspace, use the first one
        if (workspaceIdToUse == null) {
          final firstWorkspace = workspacesData[0];
          workspaceIdToUse = firstWorkspace['id'];
          debugPrint('AuthService: Setting first workspace as current: $workspaceIdToUse');
        }

        if (workspaceIdToUse != null) {
          await AppConfig.setCurrentWorkspaceId(workspaceIdToUse);
        }
      }


    } catch (e) {
      // Don't throw error here - login should still succeed even if workspace fetch fails
    }
  }
  
  // Removed: Old _makeRequest method - now using Dio
  
  /// Sign up with email and password
  Future<User> signUp({
    required String email,
    required String password,
    required String name,
    String? workspaceId,
  }) async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }
    
    try {

      final response = await _dio.post(
        '/auth/register',
        data: {
          'email': email,
          'password': password,
          'name': name,
          if (workspaceId != null) 'workspace_id': workspaceId,
        },
      );

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception(response.data['message'] ?? 'Registration failed');
      }

      final responseData = response.data;

      // Extract tokens and user data
      _accessToken = responseData['access_token'];
      _refreshToken = responseData['refresh_token'] ?? responseData['access_token']; // Use access_token as refresh_token if not provided
      final userData = responseData['user'];
      
      // Create User object from response
      final user = User.fromMap(userData);
      
      // Save tokens and update state
      _currentUser = user;
      _isAuthenticated = true;

      await _saveTokensAndUser(_accessToken!, _refreshToken!, user);

      // Register FCM token for push notifications
      await _registerFcmToken();

      // Refresh tab configuration from backend (new users get default config)
      try {
        debugPrint('AuthService: Refreshing tab configuration after registration...');
        await TabConfigurationService().refreshFromBackend();
        debugPrint('AuthService: Tab configuration refreshed successfully');
      } catch (e) {
        // Non-critical, continue with default config if refresh fails
        debugPrint('AuthService: Failed to refresh tab configuration: $e');
      }

      // Reconnect VideoCallSocketService now that we have a valid token
      try {
        await VideoCallSocketService.instance.reconnectIfNeeded();
      } catch (e) {
        debugPrint('AuthService: Failed to reconnect video socket: $e');
      }

      notifyListeners();

      return user;

    } on DioException catch (e) {

      // Extract user-friendly error message from response
      String errorMessage = 'Registration failed. Please try again.';

      if (e.response?.data != null) {
        final data = e.response!.data;
        if (data is Map) {
          // Extract the actual error message from the response
          errorMessage = data['message'] ?? data['error'] ?? errorMessage;

          // Customize message for common errors
          if (e.response?.statusCode == 409) {
            errorMessage = 'An account with this email already exists. Please try logging in instead.';
          }
        }
      } else if (e.type == DioExceptionType.connectionTimeout ||
                 e.type == DioExceptionType.receiveTimeout ||
                 e.type == DioExceptionType.sendTimeout) {
        errorMessage = 'Connection timeout. Please check your internet connection.';
      } else if (e.type == DioExceptionType.connectionError) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      }

      throw Exception(errorMessage);
    } catch (e) {
      throw Exception('Failed to sign up. Please try again.');
    }
  }

  /// Sign in with email and password
  Future<User> signIn({
    required String email,
    required String password,
  }) async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    try {

      final response = await _dio.post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
        },
      );

      // Accept both 200 and 201 status codes
      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception(response.data['message'] ?? 'Login failed');
      }

      final responseData = response.data;

      // Extract tokens and user data
      _accessToken = responseData['access_token'];
      _refreshToken = responseData['refresh_token'] ?? responseData['access_token']; // Use access_token as refresh_token if not provided
      final userData = responseData['user'];

      // Create User object from response
      final user = User.fromMap(userData);

      // Save tokens and update state
      _currentUser = user;
      _isAuthenticated = true;

      await _saveTokensAndUser(_accessToken!, _refreshToken!, user);

      // Fetch and save workspaces after successful login
      await _fetchAndSaveWorkspaces();

      // Register FCM token for push notifications
      await _registerFcmToken();

      // Refresh tab configuration from backend to get user's saved arrangement
      try {
        debugPrint('AuthService: Refreshing tab configuration after login...');
        await TabConfigurationService().refreshFromBackend();
        debugPrint('AuthService: Tab configuration refreshed successfully');
      } catch (e) {
        // Non-critical, continue with default config if refresh fails
        debugPrint('AuthService: Failed to refresh tab configuration: $e');
      }

      // Reconnect VideoCallSocketService now that we have a valid token
      try {
        await VideoCallSocketService.instance.reconnectIfNeeded();
      } catch (e) {
      }

      notifyListeners();

      return user;

    } on DioException catch (e) {

      // Extract error message from response
      String errorMessage = 'Login failed. Please try again.';
      if (e.response?.data != null) {
        final data = e.response!.data;
        if (data is Map) {
          // Get the exact error message from backend
          errorMessage = data['message'] ?? data['error'] ?? errorMessage;
        }
      } else if (e.type == DioExceptionType.connectionTimeout ||
                 e.type == DioExceptionType.receiveTimeout ||
                 e.type == DioExceptionType.sendTimeout) {
        errorMessage = 'Connection timeout. Please check your internet connection.';
      } else if (e.type == DioExceptionType.connectionError) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      }

      throw Exception(errorMessage);
    } catch (e) {
      throw Exception('Failed to sign in. Please try again.');
    }
  }

  /// Sign out
  Future<void> signOut() async {
    // Prevent recursive signOut calls
    if (_isSigningOut) {
      return;
    }

    _isSigningOut = true;

    try {

      // Save token before clearing (needed for FCM unregister)
      final savedToken = _accessToken;

      // Unregister FCM token BEFORE clearing credentials
      // This ensures the API call has the auth token
      if (savedToken != null) {
        try {
          await _unregisterFcmToken().timeout(
            const Duration(seconds: 5),
            onTimeout: () {
            },
          );
        } catch (e) {
          // Continue with logout even if unregister fails
        }
      }

      // Clear local state
      _accessToken = null;
      _refreshToken = null;
      _currentUser = null;
      _isAuthenticated = false;

      // Clear stored data
      await _clearStoredData();

      // Clear workspace cache (BOTH services)
      await WorkspaceManagementService.instance.clear();
      await WorkspaceService.instance.clear();

      // Clear tab configuration cache so next user gets fresh config from backend
      TabConfigurationService().clearCache();

      // Disconnect video call socket
      try {
        VideoCallSocketService.instance.disconnect();
      } catch (e) {
        // Ignore socket disconnect errors
      }

      // Notify listeners
      notifyListeners();


    } catch (e) {
      throw Exception('Failed to sign out: $e');
    } finally {
      _isSigningOut = false;
    }
  }
  
  /// Refresh the current session
  Future<void> refreshSession() async {
    if (!_isAuthenticated || _refreshToken == null) {
      throw Exception('No refresh token available');
    }

    try {

      // Create a separate Dio instance for refresh to avoid interceptor recursion
      final refreshDio = Dio(BaseOptions(
        baseUrl: AppConfig.backendBaseUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ));

      final response = await refreshDio.post(
        '/auth/refresh',
        data: {
          'refresh_token': _refreshToken,
        },
      );

      if (response.statusCode != 200) {
        throw Exception(response.data['message'] ?? 'Token refresh failed');
      }

      final responseData = response.data;

      _accessToken = responseData['access_token'];
      if (responseData['refresh_token'] != null) {
        _refreshToken = responseData['refresh_token'];
      }

      // Save updated tokens
      if (_currentUser != null) {
        await _saveTokensAndUser(_accessToken!, _refreshToken!, _currentUser!);
      }


    } catch (e) {

      // If refresh fails, sign out the user
      await signOut();
      throw Exception('Session expired. Please sign in again.');
    }
  }
  
  /// Reset password
  Future<void> resetPassword(String email) async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    try {
      final response = await _dio.post(
        '/auth/forgot-password',
        data: {
          'email': email,
        },
      );

      // Check if the response is successful
      if (response.statusCode == 200 || response.statusCode == 201) {
        // Success - the API will return a success message
        // No need to throw an error
        return;
      }

      // If status code is not successful, throw error with message from API
      final message = response.data is Map
          ? (response.data['message'] ?? 'Password reset failed')
          : 'Password reset failed';
      throw Exception(message);

    } on DioException catch (e) {
      // Handle DioException separately to extract proper error message
      if (e.response != null && e.response?.data is Map) {
        final message = e.response?.data['message'] ?? 'Failed to send reset email';
        throw Exception(message);
      }
      throw Exception('Failed to send reset email. Please check your connection and try again.');
    } catch (e) {
      throw Exception('Failed to send reset email: $e');
    }
  }

  /// Change password
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    if (!_isAuthenticated) {
      throw Exception('User not authenticated. Please sign in first.');
    }

    try {

      final response = await _dio.post(
        '/auth/password/change',
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception(response.data['message'] ?? 'Password change failed');
      }


    } catch (e) {

      // Extract error message from DioException if available
      if (e is DioException && e.response?.data != null) {
        final errorMessage = e.response?.data['message'] ?? 'Failed to change password';
        throw Exception(errorMessage);
      }

      throw Exception('Failed to change password: $e');
    }
  }

  // ==================== Two-Factor Authentication ====================

  /// Get 2FA status for the current user
  Future<Map<String, dynamic>> get2FAStatus() async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    if (!_isAuthenticated) {
      throw Exception('User not authenticated. Please sign in first.');
    }

    try {
      final response = await _dio.get('/auth/2fa/status');

      if (response.statusCode == 200) {
        return response.data;
      } else {
        throw Exception(response.data['message'] ?? 'Failed to get 2FA status');
      }
    } catch (e) {
      if (e is DioException && e.response?.data != null) {
        throw Exception(e.response?.data['message'] ?? 'Failed to get 2FA status');
      }
      throw Exception('Failed to get 2FA status: $e');
    }
  }

  /// Enable 2FA and get QR code for setup
  Future<Map<String, dynamic>> enable2FA() async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    if (!_isAuthenticated) {
      throw Exception('User not authenticated. Please sign in first.');
    }

    try {
      final response = await _dio.post('/auth/2fa/enable', data: {});

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Response should contain: secret, qrCode (data URL), backupCodes
        return response.data;
      } else {
        throw Exception(response.data['message'] ?? 'Failed to enable 2FA');
      }
    } catch (e) {
      if (e is DioException && e.response?.data != null) {
        throw Exception(e.response?.data['message'] ?? 'Failed to enable 2FA');
      }
      throw Exception('Failed to enable 2FA: $e');
    }
  }

  /// Verify 2FA setup with the code from authenticator app
  Future<Map<String, dynamic>> verify2FASetup(String code) async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    if (!_isAuthenticated) {
      throw Exception('User not authenticated. Please sign in first.');
    }

    try {
      final response = await _dio.post('/auth/2fa/verify', data: {
        'code': code,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Response should contain: success, backupCodes
        return response.data;
      } else {
        throw Exception(response.data['message'] ?? 'Failed to verify 2FA');
      }
    } catch (e) {
      if (e is DioException && e.response?.data != null) {
        throw Exception(e.response?.data['message'] ?? 'Failed to verify 2FA');
      }
      throw Exception('Failed to verify 2FA: $e');
    }
  }

  /// Disable 2FA
  Future<void> disable2FA(String code) async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    if (!_isAuthenticated) {
      throw Exception('User not authenticated. Please sign in first.');
    }

    try {
      final response = await _dio.post('/auth/2fa/disable', data: {
        'code': code,
      });

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception(response.data['message'] ?? 'Failed to disable 2FA');
      }
    } catch (e) {
      if (e is DioException && e.response?.data != null) {
        throw Exception(e.response?.data['message'] ?? 'Failed to disable 2FA');
      }
      throw Exception('Failed to disable 2FA: $e');
    }
  }

  /// Get backup codes
  Future<List<String>> getBackupCodes() async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    if (!_isAuthenticated) {
      throw Exception('User not authenticated. Please sign in first.');
    }

    try {
      final response = await _dio.get('/auth/2fa/backup-codes');

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['backupCodes'] != null) {
          return List<String>.from(data['backupCodes']);
        }
        return [];
      } else {
        throw Exception(response.data['message'] ?? 'Failed to get backup codes');
      }
    } catch (e) {
      if (e is DioException && e.response?.data != null) {
        throw Exception(e.response?.data['message'] ?? 'Failed to get backup codes');
      }
      throw Exception('Failed to get backup codes: $e');
    }
  }

  /// Regenerate backup codes
  Future<List<String>> regenerateBackupCodes(String code) async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    if (!_isAuthenticated) {
      throw Exception('User not authenticated. Please sign in first.');
    }

    try {
      final response = await _dio.post('/auth/2fa/backup-codes/regenerate', data: {
        'code': code,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        if (data['backupCodes'] != null) {
          return List<String>.from(data['backupCodes']);
        }
        return [];
      } else {
        throw Exception(response.data['message'] ?? 'Failed to regenerate backup codes');
      }
    } catch (e) {
      if (e is DioException && e.response?.data != null) {
        throw Exception(e.response?.data['message'] ?? 'Failed to regenerate backup codes');
      }
      throw Exception('Failed to regenerate backup codes: $e');
    }
  }

  // ==================== Session Management ====================

  /// Get all active sessions
  Future<List<Map<String, dynamic>>> getActiveSessions() async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    if (!_isAuthenticated) {
      throw Exception('User not authenticated. Please sign in first.');
    }

    try {
      final response = await _dio.get('/auth/sessions');

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['sessions'] != null) {
          return List<Map<String, dynamic>>.from(data['sessions']);
        }
        if (data is List) {
          return List<Map<String, dynamic>>.from(data);
        }
        return [];
      } else {
        throw Exception(response.data['message'] ?? 'Failed to get sessions');
      }
    } catch (e) {
      if (e is DioException && e.response?.data != null) {
        throw Exception(e.response?.data['message'] ?? 'Failed to get sessions');
      }
      throw Exception('Failed to get sessions: $e');
    }
  }

  /// Revoke a specific session
  Future<void> revokeSession(String sessionId) async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    if (!_isAuthenticated) {
      throw Exception('User not authenticated. Please sign in first.');
    }

    try {
      final response = await _dio.delete('/auth/sessions/$sessionId');

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception(response.data['message'] ?? 'Failed to revoke session');
      }
    } catch (e) {
      if (e is DioException && e.response?.data != null) {
        throw Exception(e.response?.data['message'] ?? 'Failed to revoke session');
      }
      throw Exception('Failed to revoke session: $e');
    }
  }

  /// Revoke all sessions except the current one
  Future<void> revokeAllOtherSessions() async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    if (!_isAuthenticated) {
      throw Exception('User not authenticated. Please sign in first.');
    }

    try {
      final response = await _dio.post('/auth/sessions/revoke-all', data: {});

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception(response.data['message'] ?? 'Failed to revoke sessions');
      }
    } catch (e) {
      if (e is DioException && e.response?.data != null) {
        throw Exception(e.response?.data['message'] ?? 'Failed to revoke sessions');
      }
      throw Exception('Failed to revoke sessions: $e');
    }
  }

  /// Get login history
  Future<List<Map<String, dynamic>>> getLoginHistory({int limit = 20}) async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    if (!_isAuthenticated) {
      throw Exception('User not authenticated. Please sign in first.');
    }

    try {
      final response = await _dio.get('/auth/login-history', queryParameters: {
        'limit': limit,
      });

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['history'] != null) {
          return List<Map<String, dynamic>>.from(data['history']);
        }
        if (data is List) {
          return List<Map<String, dynamic>>.from(data);
        }
        return [];
      } else {
        throw Exception(response.data['message'] ?? 'Failed to get login history');
      }
    } catch (e) {
      if (e is DioException && e.response?.data != null) {
        throw Exception(e.response?.data['message'] ?? 'Failed to get login history');
      }
      throw Exception('Failed to get login history: $e');
    }
  }

  /// Verify email
  Future<void> verifyEmail(String token) async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    try {

      final response = await _dio.post(
        '/auth/verify-email',
        data: {
          'token': token,
        },
      );

      if (response.statusCode != 200) {
        throw Exception(response.data['message'] ?? 'Email verification failed');
      }


      // Update user's email verification status if logged in
      if (_currentUser != null) {
        _currentUser = _currentUser!.copyWith(email_verified: true);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('current_user', _currentUser!.toJson());
        notifyListeners();
      }

    } catch (e) {
      throw Exception('Failed to verify email: $e');
    }
  }

  /// Delete user account with password verification
  Future<void> deleteAccount(String password) async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    if (!_isAuthenticated) {
      throw Exception('User not authenticated. Please sign in first.');
    }

    try {
      final response = await _dio.delete(
        '/auth/account',
        data: {
          'password': password,
        },
      );

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception(response.data['message'] ?? 'Failed to delete account');
      }
    } on DioException catch (e) {
      // Extract error message from response
      String errorMessage = 'Failed to delete account';
      if (e.response?.data != null) {
        final data = e.response!.data;
        if (data is Map) {
          errorMessage = data['message'] ?? data['error'] ?? errorMessage;
        }
      }
      throw Exception(errorMessage);
    } catch (e) {
      throw Exception('Failed to delete account: $e');
    }
  }
  
  /// Get authorization headers for API requests
  Map<String, String> getAuthHeaders() {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    
    if (_accessToken != null) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }
    
    return headers;
  }
  
  /// Sign in with OAuth provider (placeholder implementation)
  Future<User> signInWithOAuth({
    required String provider,
    required String redirectUrl,
  }) async {
    throw Exception('OAuth sign in not implemented yet. Please use email/password authentication.');
  }

  /// Handle OAuth callback after authentication
  Future<User> handleOAuthCallback({
    required String code,
    required String provider,
  }) async {
    if (!_isInitialized) {
      throw Exception('AuthService not initialized. Call initialize() first.');
    }

    try {

      final response = await _dio.post(
        '/auth/oauth/callback',
        data: {
          'code': code,
          'provider': provider,
        },
      );

      if (response.statusCode != 200) {
        throw Exception(response.data['message'] ?? 'OAuth callback failed');
      }

      final responseData = response.data;

      // Extract tokens and user data
      _accessToken = responseData['access_token'];
      _refreshToken = responseData['refresh_token'];
      final userData = responseData['user'];

      // Create User object from response
      final user = User.fromMap(userData);

      // Save tokens and update state
      _currentUser = user;
      _isAuthenticated = true;

      await _saveTokensAndUser(_accessToken!, _refreshToken!, user);

      // Fetch and save workspaces after successful OAuth login
      await _fetchAndSaveWorkspaces();

      // Register FCM token for push notifications
      await _registerFcmToken();

      // Refresh tab configuration from backend to get user's saved arrangement
      try {
        debugPrint('AuthService: Refreshing tab configuration after OAuth login...');
        await TabConfigurationService().refreshFromBackend();
        debugPrint('AuthService: Tab configuration refreshed successfully');
      } catch (e) {
        // Non-critical, continue with default config if refresh fails
        debugPrint('Failed to refresh tab configuration: $e');
      }

      // Reconnect VideoCallSocketService now that we have a valid token
      try {
        await VideoCallSocketService.instance.reconnectIfNeeded();
      } catch (e) {
        debugPrint('Failed to reconnect video socket: $e');
      }

      notifyListeners();

      return user;
    } catch (e) {
      throw Exception('Failed to handle OAuth callback: $e');
    }
  }

  /// Check if current token is valid (basic check)
  bool isTokenValid() {
    return _accessToken != null && _isAuthenticated;
  }

  /// Get saved workspaces from SharedPreferences
  Future<List<Map<String, dynamic>>> getSavedWorkspaces() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final workspacesJson = prefs.getString('user_workspaces');

      if (workspacesJson == null || workspacesJson.isEmpty) {
        return [];
      }

      final decoded = jsonDecode(workspacesJson);
      if (decoded is List) {
        return decoded.cast<Map<String, dynamic>>();
      }

      return [];
    } catch (e) {
      return [];
    }
  }

  // =============================================
  // FCM TOKEN MANAGEMENT (FOR PUSH NOTIFICATIONS)
  // =============================================

  /// Register FCM token with backend after login
  Future<void> _registerFcmToken() async {
    try {

      // Get FCM token from FCMService
      final fcmToken = FCMService.instance.fcmToken;

      if (fcmToken == null || fcmToken.isEmpty) {
        return;
      }

      // Get device information
      String platform = 'android';
      String? deviceName;
      String? deviceId;

      try {
        final deviceInfo = DeviceInfoPlugin();
        if (Platform.isAndroid) {
          final androidInfo = await deviceInfo.androidInfo;
          platform = 'android';
          deviceName = '${androidInfo.brand} ${androidInfo.model}';
          deviceId = androidInfo.id;
        } else if (Platform.isIOS) {
          final iosInfo = await deviceInfo.iosInfo;
          platform = 'ios';
          deviceName = '${iosInfo.name} ${iosInfo.model}';
          deviceId = iosInfo.identifierForVendor;
        }
      } catch (e) {
      }

      // Get app version
      String? appVersion;
      try {
        final packageInfo = await PackageInfo.fromPlatform();
        appVersion = packageInfo.version;
      } catch (e) {
      }

      // Register token with backend
      final response = await _dio.post(
        '/notifications/fcm/register-token',
        data: {
          'fcm_token': fcmToken,
          'platform': platform,
          if (deviceName != null) 'device_name': deviceName,
          if (deviceId != null) 'device_id': deviceId,
          if (appVersion != null) 'app_version': appVersion,
        },
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
      } else {
      }
    } catch (e) {
      // Don't throw error - login should succeed even if FCM registration fails
    }
  }

  /// Unregister FCM token with backend before logout
  Future<void> _unregisterFcmToken() async {
    try {

      // Get FCM token from FCMService
      final fcmToken = FCMService.instance.fcmToken;

      if (fcmToken == null || fcmToken.isEmpty) {
        return;
      }

      // Unregister token with backend
      final response = await _dio.post(
        '/notifications/fcm/unregister-token',
        data: {
          'fcm_token': fcmToken,
        },
      );

      if (response.statusCode == 200) {
      } else {
      }
    } catch (e) {
      // Don't throw error - logout should succeed even if FCM unregistration fails
    }
  }
}