import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../config/api_config.dart';
import '../models/user.dart';
import 'auth_service.dart';

/// Social authentication service for Google, Apple, and GitHub OAuth
/// Uses native implementations for better UX and follows backend token exchange pattern
class SocialAuthService {
  static SocialAuthService? _instance;
  static SocialAuthService get instance => _instance ??= SocialAuthService._();

  SocialAuthService._();

  late Dio _dio;
  bool _isInitialized = false;

  /// Get base URL for OAuth by stripping /api/v1 from API_BASE_URL
  String get _baseUrl {
    final apiUrl = ApiConfig.apiBaseUrl;
    return apiUrl.replaceAll(RegExp(r'/api/v1/?$'), '');
  }

  /// Initialize the service
  Future<void> initialize() async {
    if (_isInitialized) return;

    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    ));
    _isInitialized = true;
  }

  // ==================== GOOGLE SIGN-IN ====================

  /// Sign in with Google (Native)
  /// Uses google_sign_in package for native Google authentication
  Future<Map<String, dynamic>> signInWithGoogle() async {
    try {
      // Get GoogleSignIn instance and initialize
      final googleSignIn = GoogleSignIn.instance;
      await googleSignIn.initialize();

      // Trigger Google Sign-In flow (use authenticate() in v7.x)
      final GoogleSignInAccount? googleUser = await googleSignIn.authenticate();

      if (googleUser == null) {
        throw Exception('Google sign-in was cancelled');
      }

      // Get Google ID token
      final GoogleSignInAuthentication googleAuth = googleUser.authentication;
      final String? idToken = googleAuth.idToken;

      if (idToken == null) {
        throw Exception('Failed to get Google ID token');
      }

      // For Google, we can directly extract user info
      final userEmail = googleUser.email;
      final userName = googleUser.displayName ?? userEmail.split('@')[0];
      final userPhoto = googleUser.photoUrl;


      // Exchange with backend (use same exchange endpoint as browser OAuth)
      final response = await _dio.post(
        '/api/v1/auth/oauth/exchange',
        data: {
          'fluxezToken': idToken, // Google ID token
          'userId': googleUser.id,
          'email': userEmail,
          'provider': 'google',
        },
      );

      final data = response.data as Map<String, dynamic>;

      // Handle different response structures
      String? deskiveToken;
      String? refreshToken;
      Map<String, dynamic>? user;

      if (data['access_token'] != null) {
        deskiveToken = data['access_token'];
        refreshToken = data['refresh_token'];
        user = data['user'];
      } else if (data['token'] != null) {
        deskiveToken = data['token'];
        refreshToken = data['refresh_token'];
        user = data['user'];
      } else if (data['data'] != null) {
        final innerData = data['data'] as Map<String, dynamic>;
        deskiveToken = innerData['access_token'] ?? innerData['token'];
        refreshToken = innerData['refresh_token'];
        user = innerData['user'];
      }

      if (deskiveToken == null || user == null) {
        throw Exception('Invalid response from server');
      }

      // Store token and user
      await _storeTokenAndUser(deskiveToken, refreshToken, user);

      // Reload AuthService session
      await AuthService.instance.reloadSession();

      return {
        'access_token': deskiveToken,
        'refresh_token': refreshToken,
        'user': user,
        'provider': 'google',
      };
    } catch (e, stackTrace) {
      rethrow;
    }
  }

  /// Sign out from Google
  Future<void> signOutGoogle() async {
    try {
      final googleSignIn = GoogleSignIn.instance;
      await googleSignIn.signOut();
    } catch (e) {
      // Ignore sign out errors
    }
  }

  // ==================== APPLE SIGN-IN ====================

  /// Sign in with Apple (Native)
  /// Uses sign_in_with_apple package for native Apple authentication
  Future<Map<String, dynamic>> signInWithApple() async {
    try {

      // Check if Apple Sign-In is available
      if (!await SignInWithApple.isAvailable()) {
        throw Exception('Apple Sign-In is not available on this device');
      }

      // Trigger Apple Sign-In flow
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        webAuthenticationOptions: kIsWeb
            ? WebAuthenticationOptions(
                clientId: 'com.deskive.app', // TODO: Replace with your Apple Client ID
                redirectUri: Uri.parse('${AppConfig.backendBaseUrl}/auth/callback'),
              )
            : null,
      );

      final String? identityToken = credential.identityToken;
      if (identityToken == null) {
        throw Exception('Failed to get Apple identity token');
      }

      // Extract user info
      final userEmail = credential.email ?? 'apple_user@privaterelay.appleid.com';
      final userName = credential.givenName ?? credential.familyName ?? userEmail.split('@')[0];
      final userId = credential.userIdentifier ?? '';


      // Exchange with backend (use same exchange endpoint as browser OAuth)
      final response = await _dio.post(
        '/api/v1/auth/oauth/exchange',
        data: {
          'fluxezToken': identityToken, // Apple identity token
          'userId': userId,
          'email': userEmail,
          'provider': 'apple',
        },
      );

      final data = response.data as Map<String, dynamic>;

      // Handle different response structures
      String? deskiveToken;
      String? refreshToken;
      Map<String, dynamic>? user;

      if (data['access_token'] != null) {
        deskiveToken = data['access_token'];
        refreshToken = data['refresh_token'];
        user = data['user'];
      } else if (data['token'] != null) {
        deskiveToken = data['token'];
        refreshToken = data['refresh_token'];
        user = data['user'];
      } else if (data['data'] != null) {
        final innerData = data['data'] as Map<String, dynamic>;
        deskiveToken = innerData['access_token'] ?? innerData['token'];
        refreshToken = innerData['refresh_token'];
        user = innerData['user'];
      }

      if (deskiveToken == null || user == null) {
        throw Exception('Invalid response from server');
      }

      // Store token and user
      await _storeTokenAndUser(deskiveToken, refreshToken, user);

      // Reload AuthService session
      await AuthService.instance.reloadSession();

      return {
        'access_token': deskiveToken,
        'refresh_token': refreshToken,
        'user': user,
        'provider': 'apple',
      };
    } catch (e, stackTrace) {
      rethrow;
    }
  }

  // ==================== HELPER METHODS ====================

  /// Store token and user data after successful OAuth
  Future<void> _storeTokenAndUser(String token, String? refreshToken, Map<String, dynamic> userData) async {
    // Save tokens to AppConfig
    await AppConfig.setAccessToken(token);
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
  }

  /// Handle OAuth callback (for GitHub and other web flows)
  /// Call this from your deep link handler
  Future<Map<String, dynamic>> handleOAuthCallback(Uri callbackUri) async {
    try {

      // Extract tokens from URL params
      final accessToken = callbackUri.queryParameters['access_token'];
      final userId = callbackUri.queryParameters['user_id'];
      final email = callbackUri.queryParameters['email'];
      final error = callbackUri.queryParameters['error'];

      if (error != null) {
        throw Exception('OAuth error: $error');
      }

      if (accessToken == null || userId == null || email == null) {
        throw Exception('Missing required parameters in OAuth callback');
      }


      // Exchange with backend
      final response = await _dio.post(
        '/api/v1/auth/oauth/exchange',
        data: {
          'fluxezToken': accessToken,
          'userId': userId,
          'email': email,
        },
      );

      final data = response.data as Map<String, dynamic>;

      // Handle different response structures
      String? deskiveToken;
      String? refreshToken;
      Map<String, dynamic>? user;

      if (data['access_token'] != null) {
        deskiveToken = data['access_token'];
        refreshToken = data['refresh_token'];
        user = data['user'];
      } else if (data['token'] != null) {
        deskiveToken = data['token'];
        refreshToken = data['refresh_token'];
        user = data['user'];
      } else if (data['data'] != null) {
        final innerData = data['data'] as Map<String, dynamic>;
        deskiveToken = innerData['access_token'] ?? innerData['token'];
        refreshToken = innerData['refresh_token'];
        user = innerData['user'];
      }

      if (deskiveToken == null || user == null) {
        throw Exception('Invalid response from server');
      }

      // Store token in AuthService
      await _storeTokenAndUser(deskiveToken, refreshToken, user);

      return {
        'access_token': deskiveToken,
        'refresh_token': refreshToken,
        'user': user,
      };
    } catch (e) {
      rethrow;
    }
  }
}
