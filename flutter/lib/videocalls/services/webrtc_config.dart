/// WebRTC Configuration for AppAtOnce SDK
/// This file contains configuration settings for the video calling service
class WebRTCConfig {
  // API configuration
  static const String apiKey = 'your-appatonce-api-key-here'; // Replace with your actual API key
  
  // Default session settings
  static const defaultSessionSettings = {
    'maxParticipants': 10,
    'enableRecording': true,
    'enableTranscription': true,
    'enableChat': true,
    'enableScreenShare': true,
    'enableVirtualBackground': false,
    'waitingRoom': false,
    'muteOnJoin': true,
    'requirePermissionToUnmute': false,
  };
  
  // Recording settings
  static const recordingSettings = {
    'resolution': '1080p',
    'audioBitrate': 128000,
    'videoBitrate': 4000000,
  };
  
  // Media constraints
  static const mediaConstraints = {
    'audio': {
      'enabled': true,
      'autoGainControl': true,
      'echoCancellation': true,
      'noiseSuppression': true,
    },
    'video': {
      'enabled': true,
      'width': 1280,
      'height': 720,
      'frameRate': 30,
    },
  };
  
  // Screen sharing settings
  static const screenShareSettings = {
    'enabled': true,
    'maxResolution': '1080p',
    'frameRate': 15,
  };
  
  // Participant polling interval
  static const participantPollingInterval = Duration(seconds: 5);
  
  // Connection timeout
  static const connectionTimeout = Duration(seconds: 30);
  
  // Maximum recording duration (in minutes)
  static const maxRecordingDuration = 120;
  
  // Supported languages for transcription
  static const supportedLanguages = [
    'en', // English
    'es', // Spanish
    'fr', // French
    'de', // German
    'it', // Italian
    'pt', // Portuguese
    'ru', // Russian
    'ja', // Japanese
    'ko', // Korean
    'zh', // Chinese
  ];
  
  // Default transcription language
  static const defaultTranscriptionLanguage = 'en';
  
  // Chat message limits
  static const chatMessageMaxLength = 500;
  static const chatHistoryLimit = 100;
}

/// Environment-specific configurations
class WebRTCEnvironment {
  static const bool isDevelopment = true; // Set to false for production
  static const bool enableDebugLogging = true;
  static const bool enableAnalytics = true;
  
  // API endpoints (if needed for custom configurations)
  static const Map<String, String> apiEndpoints = {
    'development': 'https://api-dev.appatonce.com',
    'staging': 'https://api-staging.appatonce.com',
    'production': 'https://api.appatonce.com',
  };
  
  static String get currentApiEndpoint {
    if (isDevelopment) return apiEndpoints['development']!;
    return apiEndpoints['production']!;
  }
}

/// WebRTC Feature Flags
/// Use these to enable/disable specific features
class WebRTCFeatures {
  static const bool enableVirtualBackground = false; // Requires additional setup
  static const bool enableBreakoutRooms = false; // Future feature
  static const bool enableLiveCaptions = true;
  static const bool enableReactionEmojis = true;
  static const bool enableHandRaise = true;
  static const bool enableWhiteboard = false; // Future feature
  static const bool enableFileSharing = true;
  static const bool enableWaitingRoom = true;
  static const bool enableRecording = true;
  static const bool enableTranscription = true;
  static const bool enableScreenAnnotation = false; // Future feature
  static const bool enablePinParticipant = true;
  static const bool enableSpotlightParticipant = true;
}

/// UI Configuration for video calling screens
class WebRTCUIConfig {
  // Colors
  static const primaryColor = 0xFF2464EC;
  static const successColor = 0xFF10B981;
  static const errorColor = 0xFFEF4444;
  static const warningColor = 0xFFF59E0B;
  static const mutedColor = 0xFF6B7280;
  
  // Video grid settings
  static const maxParticipantsPerRow = 2;
  static const videoGridAspectRatio = 0.75;
  static const videoGridSpacing = 10.0;
  
  // Control button sizes
  static const controlButtonSize = 60.0;
  static const smallControlButtonSize = 40.0;
  
  // Chat UI settings
  static const chatMaxHeight = 300.0;
  static const chatBubbleMaxWidth = 250.0;
  
  // Participant list settings
  static const participantListHeight = 100.0;
  static const participantAvatarSize = 40.0;
  
  // Animation durations
  static const shortAnimationDuration = Duration(milliseconds: 200);
  static const mediumAnimationDuration = Duration(milliseconds: 400);
  static const longAnimationDuration = Duration(milliseconds: 600);
}

/// Error messages for WebRTC operations
class WebRTCErrorMessages {
  static const String notInitialized = 'WebRTC service not initialized';
  static const String noActiveSession = 'No active session';
  static const String joinFailed = 'Failed to join session';
  static const String createFailed = 'Failed to create session';
  static const String recordingFailed = 'Failed to start/stop recording';
  static const String mediaToggleFailed = 'Failed to toggle media';
  static const String screenShareFailed = 'Failed to start/stop screen sharing';
  static const String permissionDenied = 'Permission denied';
  static const String connectionTimeout = 'Connection timeout';
  static const String networkError = 'Network connection error';
  static const String serverError = 'Server error occurred';
  static const String invalidApiKey = 'Invalid API key';
  static const String sessionNotFound = 'Session not found';
  static const String participantLimitReached = 'Participant limit reached';
  static const String recordingLimitReached = 'Recording limit reached';
}

/// Success messages for WebRTC operations
class WebRTCSuccessMessages {
  static const String sessionCreated = 'Session created successfully';
  static const String sessionJoined = 'Joined session successfully';
  static const String sessionLeft = 'Left session successfully';
  static const String recordingStarted = 'Recording started';
  static const String recordingStopped = 'Recording stopped';
  static const String audioToggled = 'Audio toggled';
  static const String videoToggled = 'Video toggled';
  static const String screenShareStarted = 'Screen sharing started';
  static const String screenShareStopped = 'Screen sharing stopped';
  static const String messageSent = 'Message sent';
  static const String participantUpdated = 'Participant permissions updated';
}