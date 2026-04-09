import 'package:shared_preferences/shared_preferences.dart';
import 'api_config.dart';
import 'env_config.dart';

class AppConfig {
  // Backend API Configuration - uses ApiConfig for consistent URL formatting
  static String get backendBaseUrl => ApiConfig.apiBaseUrl;
  
  // App at Once API Configuration (kept for real-time features and video calling)
  // Service role key - for server-side data operations (full access)
  static String get appAtOnceApiKey => EnvConfig.appAtOnceApiKey;
  
  // Anon key - for real-time operations only (not for auth anymore)
  static String get appAtOnceAnonKey => EnvConfig.appAtOnceAnonKey;

  // Storage keys for dynamic IDs
  static const String _workspaceIdKey = 'current_workspace_id';
  static const String _userIdKey = 'current_user_id';
  
  // JWT token storage keys
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  
  // Get current workspace ID from preferences
  static Future<String?> getCurrentWorkspaceId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_workspaceIdKey);
  }
  
  // Set current workspace ID in preferences
  static Future<void> setCurrentWorkspaceId(String workspaceId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_workspaceIdKey, workspaceId);
  }
  
  // Get current user ID from preferences
  static Future<String?> getCurrentUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userIdKey);
  }
  
  // Set current user ID in preferences
  static Future<void> setCurrentUserId(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userIdKey, userId);
  }
  
  // Clear stored IDs on logout
  static Future<void> clearStoredIds() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_workspaceIdKey);
    await prefs.remove(_userIdKey);
  }
  
  // JWT Token Management
  
  // Get access token
  static Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_accessTokenKey);
  }
  
  // Set access token
  static Future<void> setAccessToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessTokenKey, token);
  }
  
  // Get refresh token
  static Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_refreshTokenKey);
  }
  
  // Set refresh token
  static Future<void> setRefreshToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_refreshTokenKey, token);
  }
  
  // Clear tokens
  static Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accessTokenKey);
    await prefs.remove(_refreshTokenKey);
  }
  
  
  // Other configuration constants - now loaded from environment
  static bool get isProduction => EnvConfig.isProduction;
  static String get appName => EnvConfig.appName;
  static String get appVersion => EnvConfig.appVersion;
}