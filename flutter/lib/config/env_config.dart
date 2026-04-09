import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/foundation.dart';

/// Environment configuration service for managing environment variables
/// Similar to the React frontend's environment handling
class EnvConfig {
  static bool _isInitialized = false;

  /// Initialize environment configuration
  /// This should be called at app startup
  static Future<void> initialize({String? environment}) async {
    if (_isInitialized) {
      return;
    }

    try {
      // Determine which .env file to load based on environment
      String envFile = '.env';

      if (environment != null) {
        envFile = '.env.$environment';
      } else if (kReleaseMode) {
        envFile = '.env.production';
      } else {
        envFile = '.env.development';
      }

      // Try to load the specific environment file first
      try {
        await dotenv.load(fileName: envFile);
      } catch (e) {
        // Fallback to default .env file
        await dotenv.load(fileName: '.env');
      }

      _isInitialized = true;
      _logEnvironmentInfo();
    } catch (e) {
      rethrow;
    }
  }

  /// Log environment information for debugging
  static void _logEnvironmentInfo() {
    if (!isDebugMode) return;

  }

  /// Get environment variable with optional fallback
  static String _getEnvVar(String key, [String fallback = '']) {
    if (!_isInitialized) {
      return fallback;
    }
    return dotenv.env[key] ?? fallback;
  }

  /// Get environment variable as boolean
  static bool _getEnvBool(String key, [bool fallback = false]) {
    final value = _getEnvVar(key, fallback.toString());
    return value.toLowerCase() == 'true';
  }

  /// Get environment variable as integer
  static int _getEnvInt(String key, [int fallback = 0]) {
    final value = _getEnvVar(key, fallback.toString());
    return int.tryParse(value) ?? fallback;
  }

  // =============================================================================
  // APPLICATION ENVIRONMENT
  // =============================================================================

  /// Current Flutter environment (development, staging, production)
  static String get flutterEnv => _getEnvVar('FLUTTER_ENV', 'development');

  /// Application name
  static String get appName => _getEnvVar('APP_NAME', 'Deskive');

  /// Application version
  static String get appVersion => _getEnvVar('APP_VERSION', '1.0.0');

  // =============================================================================
  // API CONFIGURATION
  // =============================================================================

  /// API base URL (should include /api/v1 in the env variable, like frontend)
  /// Example: https://api.deskive.com/api/v1
  static String get apiBaseUrl {
    final url = _getEnvVar('API_BASE_URL', 'https://api.deskive.com/api/v1');
    return url.replaceAll(RegExp(r'/$'), ''); // Remove trailing slash if present
  }

  /// WebSocket server URL
  static String get websocketUrl => _getEnvVar('WEBSOCKET_URL', 'https://api.deskive.com');

  /// Web App URL (for generating shareable links)
  static String get webAppUrl => _getEnvVar('WEB_APP_URL', 'https://app.deskive.com');

  /// API request timeout in milliseconds
  static int get apiTimeout => _getEnvInt('API_TIMEOUT', 30000);

  /// API retry attempts
  static int get apiRetryAttempts => _getEnvInt('API_RETRY_ATTEMPTS', 3);

  // =============================================================================
  // APP AT ONCE CONFIGURATION
  // =============================================================================

  /// App at Once API Key
  static String get appAtOnceApiKey => _getEnvVar('APPATONCE_API_KEY');

  /// App at Once Anonymous Key
  static String get appAtOnceAnonKey => _getEnvVar('APPATONCE_ANON_KEY');

  // =============================================================================
  // DEFAULT IDs FOR DEVELOPMENT
  // =============================================================================

  /// Default workspace ID for development
  static String? get defaultWorkspaceId => _getEnvVar('DEFAULT_WORKSPACE_ID');

  /// Default user ID for development
  static String? get defaultUserId => _getEnvVar('DEFAULT_USER_ID');

  // =============================================================================
  // FEATURE FLAGS
  // =============================================================================

  /// Debug mode flag
  static bool get isDebugMode => _getEnvBool('DEBUG_MODE', !kReleaseMode);

  /// Logging enabled flag
  static bool get isLoggingEnabled => _getEnvBool('ENABLE_LOGGING', !kReleaseMode);

  /// Log level (error, warn, info, debug)
  static String get logLevel => _getEnvVar('LOG_LEVEL', kReleaseMode ? 'error' : 'debug');

  /// Production flag
  static bool get isProduction => _getEnvBool('IS_PRODUCTION', kReleaseMode);

  /// Development flag (opposite of production)
  static bool get isDevelopment => !isProduction;

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /// Get all environment variables (for debugging)
  static Map<String, String> get allEnvVars {
    if (!_isInitialized) return {};
    return Map.from(dotenv.env);
  }

  /// Check if environment is development
  static bool get isDev => flutterEnv == 'development';

  /// Check if environment is staging
  static bool get isStaging => flutterEnv == 'staging';

  /// Check if environment is production
  static bool get isProd => flutterEnv == 'production';

  /// Get environment-specific configuration
  static Map<String, dynamic> getEnvironmentConfig() {
    return {
      'environment': flutterEnv,
      'appName': appName,
      'appVersion': appVersion,
      'apiBaseUrl': apiBaseUrl,
      'websocketUrl': websocketUrl,
      'isProduction': isProduction,
      'isDebugMode': isDebugMode,
      'isLoggingEnabled': isLoggingEnabled,
      'logLevel': logLevel,
    };
  }
  /// Force reload environment configuration
  static Future<void> reload({String? environment}) async {
    _isInitialized = false;
    await initialize(environment: environment);
  }
}
