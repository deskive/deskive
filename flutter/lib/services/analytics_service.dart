import 'package:firebase_analytics/firebase_analytics.dart';

/// Analytics service for tracking user events and screen views
/// Uses Firebase Analytics for data collection
class AnalyticsService {
  // Singleton instance
  static final AnalyticsService _instance = AnalyticsService._internal();
  static AnalyticsService get instance => _instance;

  final FirebaseAnalytics _analytics = FirebaseAnalytics.instance;

  AnalyticsService._internal();

  /// Get the analytics observer for navigation tracking
  FirebaseAnalyticsObserver get observer =>
      FirebaseAnalyticsObserver(analytics: _analytics);

  /// Initialize analytics - call this on app start
  Future<void> initialize() async {
    await _analytics.setAnalyticsCollectionEnabled(true);
  }

  /// Log a screen view event
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {
    await _analytics.logScreenView(
      screenName: screenName,
      screenClass: screenClass ?? screenName,
    );
  }

  /// Log a custom event
  Future<void> logEvent({
    required String name,
    Map<String, Object>? parameters,
  }) async {
    await _analytics.logEvent(
      name: name,
      parameters: parameters,
    );
  }

  /// Log user sign up
  Future<void> logSignUp({String method = 'email'}) async {
    await _analytics.logSignUp(signUpMethod: method);
  }

  /// Log user login
  Future<void> logLogin({String method = 'email'}) async {
    await _analytics.logLogin(loginMethod: method);
  }

  /// Log when a note is created
  Future<void> logNoteCreated({String? noteType}) async {
    await _analytics.logEvent(
      name: 'note_created',
      parameters: {
        'note_type': noteType ?? 'standard',
      },
    );
  }

  /// Log when a note is edited
  Future<void> logNoteEdited({String? noteId}) async {
    await _analytics.logEvent(
      name: 'note_edited',
      parameters: {
        if (noteId != null) 'note_id': noteId,
      },
    );
  }

  /// Log when a file is uploaded
  Future<void> logFileUploaded({
    required String fileType,
    int? fileSizeBytes,
  }) async {
    await _analytics.logEvent(
      name: 'file_uploaded',
      parameters: {
        'file_type': fileType,
        if (fileSizeBytes != null) 'file_size_bytes': fileSizeBytes,
      },
    );
  }

  /// Log when a project is created
  Future<void> logProjectCreated({String? projectType}) async {
    await _analytics.logEvent(
      name: 'project_created',
      parameters: {
        'project_type': projectType ?? 'standard',
      },
    );
  }

  /// Log when a task is created
  Future<void> logTaskCreated({String? projectId}) async {
    await _analytics.logEvent(
      name: 'task_created',
      parameters: {
        if (projectId != null) 'project_id': projectId,
      },
    );
  }

  /// Log when a task is completed
  Future<void> logTaskCompleted({String? taskId, String? projectId}) async {
    await _analytics.logEvent(
      name: 'task_completed',
      parameters: {
        if (taskId != null) 'task_id': taskId,
        if (projectId != null) 'project_id': projectId,
      },
    );
  }

  /// Log when a calendar event is created
  Future<void> logCalendarEventCreated({String? eventType}) async {
    await _analytics.logEvent(
      name: 'calendar_event_created',
      parameters: {
        'event_type': eventType ?? 'meeting',
      },
    );
  }

  /// Log when a message is sent
  Future<void> logMessageSent({String? messageType}) async {
    await _analytics.logEvent(
      name: 'message_sent',
      parameters: {
        'message_type': messageType ?? 'text',
      },
    );
  }

  /// Log when a video call is started
  Future<void> logVideoCallStarted({
    bool isGroupCall = false,
    int? participantCount,
  }) async {
    await _analytics.logEvent(
      name: 'video_call_started',
      parameters: {
        'is_group_call': isGroupCall,
        if (participantCount != null) 'participant_count': participantCount,
      },
    );
  }

  /// Log when a video call ends
  Future<void> logVideoCallEnded({
    int? durationSeconds,
    bool isGroupCall = false,
  }) async {
    await _analytics.logEvent(
      name: 'video_call_ended',
      parameters: {
        if (durationSeconds != null) 'duration_seconds': durationSeconds,
        'is_group_call': isGroupCall,
      },
    );
  }

  /// Log when a workspace is created
  Future<void> logWorkspaceCreated() async {
    await _analytics.logEvent(name: 'workspace_created');
  }

  /// Log when a workspace is switched
  Future<void> logWorkspaceSwitched({String? workspaceId}) async {
    await _analytics.logEvent(
      name: 'workspace_switched',
      parameters: {
        if (workspaceId != null) 'workspace_id': workspaceId,
      },
    );
  }

  /// Log when AI feature is used
  Future<void> logAIFeatureUsed({
    required String feature,
    String? context,
  }) async {
    await _analytics.logEvent(
      name: 'ai_feature_used',
      parameters: {
        'feature': feature,
        if (context != null) 'context': context,
      },
    );
  }

  /// Log when search is performed
  Future<void> logSearch({
    required String searchTerm,
    String? searchType,
    int? resultsCount,
  }) async {
    await _analytics.logSearch(
      searchTerm: searchTerm,
      parameters: {
        if (searchType != null) 'search_type': searchType,
        if (resultsCount != null) 'results_count': resultsCount,
      },
    );
  }

  /// Log app feature usage (generic)
  Future<void> logFeatureUsed(String featureName) async {
    await _analytics.logEvent(
      name: 'feature_used',
      parameters: {
        'feature_name': featureName,
      },
    );
  }

  /// Set user ID for analytics
  Future<void> setUserId(String? userId) async {
    await _analytics.setUserId(id: userId);
  }

  /// Set user property
  Future<void> setUserProperty({
    required String name,
    required String? value,
  }) async {
    await _analytics.setUserProperty(name: name, value: value);
  }
}
