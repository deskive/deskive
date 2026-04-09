import 'env_config.dart';

/// Centralized API configuration for all endpoints
/// This ensures consistent URL formatting across all modules
class ApiConfig {
  // Private constructor to prevent instantiation
  ApiConfig._();

  // =============================================================================
  // BASE CONFIGURATION
  // =============================================================================

  /// Full API base URL (combines base URL + prefix from environment)
  /// Example: http://192.168.0.156:3002/api/v1
  static String get baseUrl => EnvConfig.apiBaseUrl;

  /// Full API base URL (same as baseUrl)
  static String get apiBaseUrl => baseUrl;

  /// WebSocket URL
  static String get websocketUrl => EnvConfig.websocketUrl;

  // =============================================================================
  // AUTHENTICATION ENDPOINTS
  // =============================================================================

  static const String authLogin = '/auth/login';
  static const String authRegister = '/auth/register';
  static const String authLogout = '/auth/logout';
  static const String authRefreshToken = '/auth/refresh';
  static const String authForgotPassword = '/auth/forgot-password';
  static const String authResetPassword = '/auth/reset-password';
  static const String authVerifyEmail = '/auth/verify-email';
  static const String authMe = '/auth/me';

  // =============================================================================
  // USER ENDPOINTS
  // =============================================================================

  static const String users = '/users';
  static String userById(String userId) => '/users/$userId';
  static String userProfile(String userId) => '/users/$userId/profile';
  static String userAvatar(String userId) => '/users/$userId/avatar';

  // =============================================================================
  // WORKSPACE ENDPOINTS
  // =============================================================================

  static const String workspaces = '/workspaces';
  static String workspaceById(String workspaceId) => '/workspaces/$workspaceId';
  static String workspaceMembers(String workspaceId) => '/workspaces/$workspaceId/members';
  static String workspaceInvite(String workspaceId) => '/workspaces/$workspaceId/invite';
  static String workspaceSettings(String workspaceId) => '/workspaces/$workspaceId/settings';

  // =============================================================================
  // NOTES ENDPOINTS
  // =============================================================================

  static String notes(String workspaceId) => '/workspaces/$workspaceId/notes';
  static String noteById(String workspaceId, String noteId) => '/workspaces/$workspaceId/notes/$noteId';
  static String noteSearch(String workspaceId) => '/workspaces/$workspaceId/notes/search';
  static String noteMerge(String workspaceId) => '/workspaces/$workspaceId/notes/merge';
  static String noteDuplicate(String workspaceId, String noteId) => '/workspaces/$workspaceId/notes/$noteId/duplicate';
  static String noteShare(String workspaceId, String noteId) => '/workspaces/$workspaceId/notes/$noteId/share';
  static String noteTemplates(String workspaceId) => '/workspaces/$workspaceId/notes/templates';

  // =============================================================================
  // PROJECT ENDPOINTS
  // =============================================================================

  static String projects(String workspaceId) => '/workspaces/$workspaceId/projects';
  static String projectById(String workspaceId, String projectId) => '/workspaces/$workspaceId/projects/$projectId';
  static String projectTasks(String workspaceId, String projectId) => '/workspaces/$workspaceId/projects/$projectId/tasks';
  static String projectMembers(String workspaceId, String projectId) => '/workspaces/$workspaceId/projects/$projectId/members';

  // =============================================================================
  // TASK ENDPOINTS
  // =============================================================================

  static String tasks(String workspaceId, String projectId) => '/workspaces/$workspaceId/projects/$projectId/tasks';
  static String taskById(String workspaceId, String projectId, String taskId) => '/workspaces/$workspaceId/projects/$projectId/tasks/$taskId';
  static String taskComments(String workspaceId, String projectId, String taskId) => '/workspaces/$workspaceId/projects/$projectId/tasks/$taskId/comments';

  // =============================================================================
  // FILE ENDPOINTS
  // =============================================================================

  static String files(String workspaceId) => '/workspaces/$workspaceId/files';
  static String fileById(String workspaceId, String fileId) => '/workspaces/$workspaceId/files/$fileId';
  static String fileUpload(String workspaceId) => '/workspaces/$workspaceId/files/upload';
  static String fileDownload(String workspaceId, String fileId) => '/workspaces/$workspaceId/files/$fileId/download';

  // =============================================================================
  // CALENDAR ENDPOINTS
  // =============================================================================

  static String events(String workspaceId) => '/workspaces/$workspaceId/events';
  static String eventById(String workspaceId, String eventId) => '/workspaces/$workspaceId/events/$eventId';
  static String eventAttendees(String workspaceId, String eventId) => '/workspaces/$workspaceId/events/$eventId/attendees';

  // =============================================================================
  // CHAT/MESSAGING ENDPOINTS
  // =============================================================================

  static String channels(String workspaceId) => '/workspaces/$workspaceId/channels';
  static String channelById(String workspaceId, String channelId) => '/workspaces/$workspaceId/channels/$channelId';
  static String channelMessages(String workspaceId, String channelId) => '/workspaces/$workspaceId/channels/$channelId/messages';
  static String directMessages(String workspaceId) => '/workspaces/$workspaceId/messages';

  // =============================================================================
  // AI ENDPOINTS
  // =============================================================================

  static String aiChat(String workspaceId) => '/workspaces/$workspaceId/ai/chat';
  static String aiGenerate(String workspaceId) => '/workspaces/$workspaceId/ai/generate';
  static String aiAnalyze(String workspaceId) => '/workspaces/$workspaceId/ai/analyze';

  // =============================================================================
  // SEARCH ENDPOINTS
  // =============================================================================

  static String search(String workspaceId) => '/workspaces/$workspaceId/search';
  static String searchGlobal(String workspaceId) => '/workspaces/$workspaceId/search/global';

  // =============================================================================
  // NOTIFICATION ENDPOINTS
  // =============================================================================

  static const String notifications = '/notifications';
  static String notificationById(String notificationId) => '/notifications/$notificationId';
  static const String notificationMarkRead = '/notifications/mark-read';
  static const String notificationMarkAllRead = '/notifications/mark-all-read';

  // =============================================================================
  // SETTINGS ENDPOINTS
  // =============================================================================

  static const String userSettings = '/settings/user';
  static String workspaceSettingsById(String workspaceId) => '/settings/workspace/$workspaceId';
  static const String appSettings = '/settings/app';

  // =============================================================================
  // PROJECT TEMPLATE ENDPOINTS
  // =============================================================================

  static String templates(String workspaceId) => '/workspaces/$workspaceId/templates';
  static String templateById(String workspaceId, String idOrSlug) => '/workspaces/$workspaceId/templates/$idOrSlug';
  static String createProjectFromTemplate(String workspaceId, String idOrSlug) => '/workspaces/$workspaceId/templates/$idOrSlug/create-project';
  static String templateCategories(String workspaceId) => '/workspaces/$workspaceId/templates/categories';

  // =============================================================================
  // DOCUMENT TEMPLATE ENDPOINTS
  // =============================================================================

  static String documentTemplates(String workspaceId) => '/workspaces/$workspaceId/document-templates';
  static String documentTemplateById(String workspaceId, String idOrSlug) => '/workspaces/$workspaceId/document-templates/$idOrSlug';
  static String documentTemplateTypes(String workspaceId) => '/workspaces/$workspaceId/document-templates/types';
  static String documentTemplateCategories(String workspaceId) => '/workspaces/$workspaceId/document-templates/categories';
  static String documentTemplatesByType(String workspaceId, String type) => '/workspaces/$workspaceId/document-templates/type/$type';

  // =============================================================================
  // DOCUMENT ENDPOINTS (Document Builder)
  // =============================================================================

  static String documents(String workspaceId) => '/workspaces/$workspaceId/documents';
  static String documentById(String workspaceId, String documentId) => '/workspaces/$workspaceId/documents/$documentId';
  static String documentStats(String workspaceId) => '/workspaces/$workspaceId/documents/stats';
  static String documentPreview(String workspaceId, String documentId) => '/workspaces/$workspaceId/documents/$documentId/preview';
  static String documentRecipients(String workspaceId, String documentId) => '/workspaces/$workspaceId/documents/$documentId/recipients';
  static String documentSend(String workspaceId, String documentId) => '/workspaces/$workspaceId/documents/$documentId/send';
  static String documentActivity(String workspaceId, String documentId) => '/workspaces/$workspaceId/documents/$documentId/activity';
  static String documentSign(String workspaceId, String documentId) => '/workspaces/$workspaceId/documents/$documentId/sign';

  // =============================================================================
  // E-SIGNATURE ENDPOINTS
  // =============================================================================

  static String signatures(String workspaceId) => '/workspaces/$workspaceId/signatures';
  static String signatureById(String workspaceId, String signatureId) => '/workspaces/$workspaceId/signatures/$signatureId';
  static String signatureDefault(String workspaceId) => '/workspaces/$workspaceId/signatures/default';
  static String signatureSetDefault(String workspaceId, String signatureId) => '/workspaces/$workspaceId/signatures/$signatureId/default';

  // =============================================================================
  // GOOGLE DRIVE ENDPOINTS
  // =============================================================================

  static String googleDriveAuthUrl(String workspaceId) => '/workspaces/$workspaceId/google-drive/auth/url';
  static String googleDriveConnection(String workspaceId) => '/workspaces/$workspaceId/google-drive/connection';
  static String googleDriveDisconnect(String workspaceId) => '/workspaces/$workspaceId/google-drive/disconnect';
  static String googleDriveDrives(String workspaceId) => '/workspaces/$workspaceId/google-drive/drives';
  static String googleDriveFiles(String workspaceId) => '/workspaces/$workspaceId/google-drive/files';
  static String googleDriveFileById(String workspaceId, String fileId) => '/workspaces/$workspaceId/google-drive/files/$fileId';
  static String googleDriveFileDownload(String workspaceId, String fileId) => '/workspaces/$workspaceId/google-drive/files/$fileId/download';
  static String googleDriveFolders(String workspaceId) => '/workspaces/$workspaceId/google-drive/folders';
  static String googleDriveImport(String workspaceId) => '/workspaces/$workspaceId/google-drive/import';

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /// Build complete URL from endpoint
  static String buildUrl(String endpoint) {
    // Remove leading slash if present to avoid double slashes
    final cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    return '$apiBaseUrl/$cleanEndpoint';
  }

  /// Get query string from parameters
  static String buildQueryString(Map<String, dynamic> params) {
    if (params.isEmpty) return '';

    final query = params.entries
        .where((e) => e.value != null)
        .map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value.toString())}')
        .join('&');

    return query.isEmpty ? '' : '?$query';
  }

  /// Build URL with query parameters
  static String buildUrlWithParams(String endpoint, Map<String, dynamic> params) {
    final url = buildUrl(endpoint);
    final queryString = buildQueryString(params);
    return '$url$queryString';
  }

  // =============================================================================
  // DEBUGGING
  // =============================================================================

  /// Print all API configuration for debugging
  static void printConfig() {
  }
}
