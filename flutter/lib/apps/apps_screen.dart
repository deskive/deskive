import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:easy_localization/easy_localization.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:app_links/app_links.dart';
import 'models/google_drive_models.dart';
import 'models/google_sheets_models.dart';
import 'models/dropbox_models.dart';
import 'models/slack_models.dart';
import 'models/twitter_models.dart';
import 'models/openai_models.dart';
import 'models/sendgrid_models.dart';
import 'models/telegram_models.dart';
import 'services/google_drive_service.dart';
import 'services/google_sheets_service.dart';
import 'services/native_google_drive_service.dart';
import 'services/dropbox_service.dart';
import 'services/slack_service.dart';
import 'services/twitter_service.dart';
import 'services/openai_service.dart';
import 'services/sendgrid_service.dart';
import 'services/telegram_service.dart';
import 'google_drive_browser_screen.dart';
import 'google_sheets_browser_screen.dart';
import 'dropbox_browser_screen.dart';
import 'slack_screen.dart';
import 'twitter_screen.dart';
import 'openai_screen.dart';
import 'sendgrid_screen.dart';
import 'telegram_screen.dart';
import '../api/services/google_calendar_service.dart';
import '../api/services/native_google_calendar_service.dart';
import '../api/services/github_api_service.dart';
import '../api/services/email_api_service.dart';
import '../api/services/native_gmail_service.dart';
import '../api/services/integration_framework_api_service.dart';
import '../models/google_calendar_connection.dart';
import '../services/workspace_service.dart';
import '../calendar/calendar_settings_screen.dart';
import '../email/email_screen.dart';

/// List of integration slugs that have functional OAuth and are clickable.
const List<String> configuredIntegrationSlugs = [
  'google-drive',
  'gmail',
  'google-calendar',
  'google-sheets',
  'github',
];

/// List of verified connectors - actions are tested but OAuth is not functional yet.
/// These will show a "Verified" badge but remain unclickable.
const List<String> verifiedIntegrationSlugs = [
  'notion',
  'trello',
  'clickup',
  'jira',
  'linear',
  'asana',
  'discord',
  'hubspot',
  'shopify',
  'dropbox',
  'slack',
  'twitter',
  'openai',
  'sendgrid',
  'telegram',
];

/// Check if an integration slug is configured for OAuth (clickable)
bool isIntegrationConfigured(String slug) {
  return configuredIntegrationSlugs.contains(slug.toLowerCase());
}

/// Check if an integration slug is verified (actions tested, OAuth not functional)
bool isIntegrationVerified(String slug) {
  return verifiedIntegrationSlugs.contains(slug.toLowerCase());
}

/// Connectors screen showing connected integrations like Google Drive, GitHub, etc.
/// Uses Integration Framework API to fetch catalog and connections
class AppsScreen extends StatefulWidget {
  const AppsScreen({super.key});

  @override
  State<AppsScreen> createState() => _AppsScreenState();
}

class _AppsScreenState extends State<AppsScreen> with WidgetsBindingObserver {
  // Services
  final GoogleDriveService _googleDriveService = GoogleDriveService.instance;
  final GoogleCalendarService _googleCalendarService = GoogleCalendarService.instance;
  final GoogleSheetsService _googleSheetsService = GoogleSheetsService.instance;
  final GitHubApiService _githubService = GitHubApiService.instance;
  final DropboxService _dropboxService = DropboxService.instance;
  final SlackService _slackService = SlackService.instance;
  final TwitterService _twitterService = TwitterService.instance;
  final OpenAIService _openaiService = OpenAIService.instance;
  final SendGridService _sendgridService = SendGridService.instance;
  final TelegramService _telegramService = TelegramService.instance;
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final IntegrationFrameworkApiService _integrationService = IntegrationFrameworkApiService.instance;
  final EmailApiService _emailApiService = EmailApiService();
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _deepLinkSubscription;

  // Track if OAuth is in progress to refresh on resume
  bool _oauthInProgress = false;

  // Integration Framework state
  List<IntegrationCatalogEntry> _catalogEntries = [];
  List<IntegrationConnection> _connections = [];
  bool _isCatalogLoading = true;
  String? _catalogError;
  String _searchQuery = '';
  IntegrationCategoryType? _selectedCategory;

  // Google Drive state
  GoogleDriveConnection? _googleDriveConnection;
  bool _isDriveLoading = true;
  bool _isDriveConnecting = false;
  bool _isDriveDisconnecting = false;

  // Google Calendar state
  GoogleCalendarConnection? _googleCalendarConnection;
  bool _isCalendarLoading = true;
  bool _isCalendarConnecting = false;
  bool _isCalendarDisconnecting = false;

  // Google Sheets state
  GoogleSheetsConnection? _googleSheetsConnection;
  bool _isSheetsLoading = true;
  bool _isSheetsConnecting = false;
  bool _isSheetsDisconnecting = false;

  // GitHub state
  GitHubConnection? _githubConnection;
  bool _isGitHubLoading = true;
  bool _isGitHubConnecting = false;
  bool _isGitHubDisconnecting = false;

  // Dropbox state
  DropboxConnection? _dropboxConnection;
  bool _isDropboxLoading = true;
  bool _isDropboxConnecting = false;
  bool _isDropboxDisconnecting = false;

  // Slack state
  SlackConnection? _slackConnection;
  bool _isSlackLoading = true;
  bool _isSlackConnecting = false;
  bool _isSlackDisconnecting = false;

  // Twitter state
  TwitterConnection? _twitterConnection;
  bool _isTwitterLoading = true;
  bool _isTwitterConnecting = false;
  bool _isTwitterDisconnecting = false;

  // OpenAI state
  OpenAIConnection? _openaiConnection;
  bool _isOpenAILoading = true;
  bool _isOpenAIConnecting = false;
  bool _isOpenAIDisconnecting = false;

  // SendGrid state
  SendGridConnection? _sendgridConnection;
  bool _isSendGridLoading = true;
  bool _isSendGridConnecting = false;
  bool _isSendGridDisconnecting = false;

  // Telegram state
  TelegramConnection? _telegramConnection;
  bool _isTelegramLoading = true;
  bool _isTelegramConnecting = false;
  bool _isTelegramDisconnecting = false;

  // Gmail state - synced with Email module
  List<EmailConnection> _gmailAccounts = [];
  bool _isGmailLoading = true;
  bool _isGmailConnecting = false;
  String? _disconnectingGmailId;

  // Search state
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadAllData();
    _listenForOAuthCallback();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _deepLinkSubscription?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _oauthInProgress) {
      _oauthInProgress = false;
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) {
          _loadAllData();
        }
      });
    }
  }

  /// Load all data - catalog, connections, and legacy services
  Future<void> _loadAllData() async {
    await Future.wait([
      _loadCatalogAndConnections(),
      _loadDriveConnection(),
      _loadCalendarConnection(),
      _loadSheetsConnection(),
      _loadGitHubConnection(),
      _loadDropboxConnection(),
      _loadSlackConnection(),
      _loadTwitterConnection(),
      _loadOpenAIConnection(),
      _loadSendGridConnection(),
      _loadTelegramConnection(),
      _loadGmailConnection(),
    ]);
  }

  /// Load catalog and connections from Integration Framework API
  Future<void> _loadCatalogAndConnections() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() {
        _isCatalogLoading = false;
        _catalogError = 'No workspace selected';
      });
      return;
    }

    setState(() {
      _isCatalogLoading = true;
      _catalogError = null;
    });

    try {
      // Load catalog and connections in parallel
      // Use limit: 200 to ensure we get all available connectors
      final results = await Future.wait([
        _integrationService.getCatalog(
          filters: CatalogFilters(
            limit: 200,
            page: 1,
            sortBy: 'installCount',
            sortOrder: 'desc',
          ),
        ),
        _integrationService.getConnections(workspaceId),
      ]);

      if (mounted) {
        setState(() {
          _catalogEntries = (results[0] as CatalogMarketplaceResponse).integrations;
          _connections = (results[1] as ConnectionListResponse).connections;
          _isCatalogLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isCatalogLoading = false;
          _catalogError = e.toString();
        });
      }
    }
  }

  /// Toggle search mode
  void _toggleSearch() {
    setState(() {
      _isSearching = !_isSearching;
      if (!_isSearching) {
        _searchController.clear();
        _searchQuery = '';
      }
    });
  }

  /// Filter catalog entries based on search and category
  List<IntegrationCatalogEntry> get _filteredCatalog {
    var result = _catalogEntries;

    // Filter by category
    if (_selectedCategory != null) {
      result = result.where((e) => e.category == _selectedCategory).toList();
    }

    // Filter by search
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      result = result.where((e) {
        return e.name.toLowerCase().contains(query) ||
            (e.description?.toLowerCase().contains(query) ?? false) ||
            e.category.label.toLowerCase().contains(query);
      }).toList();
    }

    return result;
  }

  /// Check if an integration is connected (by slug)
  IntegrationConnection? _getConnectionForSlug(String slug) {
    try {
      return _connections.firstWhere(
        (c) => c.integration?.slug.toLowerCase() == slug.toLowerCase() &&
            c.status == ConnectionStatus.active,
      );
    } catch (_) {
      return null;
    }
  }

  /// Get connected integrations from catalog
  List<IntegrationCatalogEntry> get _connectedCatalogEntries {
    return _filteredCatalog.where((entry) {
      return _getConnectionForSlug(entry.slug) != null;
    }).toList();
  }

  /// Get available (not connected) integrations from catalog
  List<IntegrationCatalogEntry> get _availableCatalogEntries {
    return _filteredCatalog.where((entry) {
      return _getConnectionForSlug(entry.slug) == null;
    }).toList();
  }

  /// Legacy service metadata for filtering
  static const Map<String, _LegacyServiceInfo> _legacyServices = {
    'google-drive': _LegacyServiceInfo(
      name: 'Google Drive',
      description: 'Access and manage your Google Drive files',
      category: IntegrationCategoryType.fileStorage,
    ),
    'google-calendar': _LegacyServiceInfo(
      name: 'Google Calendar',
      description: 'Sync and manage your calendar events',
      category: IntegrationCategoryType.calendar,
    ),
    'google-sheets': _LegacyServiceInfo(
      name: 'Google Sheets',
      description: 'Access and edit spreadsheets',
      category: IntegrationCategoryType.productivity,
    ),
    'github': _LegacyServiceInfo(
      name: 'GitHub',
      description: 'Connect your repositories and manage code',
      category: IntegrationCategoryType.development,
    ),
    'dropbox': _LegacyServiceInfo(
      name: 'Dropbox',
      description: 'Access and manage your Dropbox files',
      category: IntegrationCategoryType.fileStorage,
    ),
    'slack': _LegacyServiceInfo(
      name: 'Slack',
      description: 'Connect with your Slack workspace',
      category: IntegrationCategoryType.communication,
    ),
    'twitter': _LegacyServiceInfo(
      name: 'Twitter / X',
      description: 'Connect your Twitter account',
      category: IntegrationCategoryType.socialMedia,
    ),
    'gmail': _LegacyServiceInfo(
      name: 'Gmail',
      description: 'Access and manage your email',
      category: IntegrationCategoryType.email,
    ),
    'openai': _LegacyServiceInfo(
      name: 'OpenAI',
      description: 'AI-powered text and image generation',
      category: IntegrationCategoryType.ai,
    ),
    'sendgrid': _LegacyServiceInfo(
      name: 'SendGrid',
      description: 'Email delivery and marketing',
      category: IntegrationCategoryType.email,
    ),
    'telegram': _LegacyServiceInfo(
      name: 'Telegram',
      description: 'Connect your Telegram bot',
      category: IntegrationCategoryType.communication,
    ),
  };

  /// Check if a legacy service should be shown based on current filters
  bool _shouldShowLegacyService(String slug) {
    final info = _legacyServices[slug.toLowerCase()];
    if (info == null) return true; // Show if not in our list

    // Check category filter
    if (_selectedCategory != null && info.category != _selectedCategory) {
      return false;
    }

    // Check search filter
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      return info.name.toLowerCase().contains(query) ||
          info.description.toLowerCase().contains(query) ||
          info.category.label.toLowerCase().contains(query);
    }

    return true;
  }

  /// Load Google Drive connection
  Future<void> _loadDriveConnection() async {
    setState(() => _isDriveLoading = true);

    try {
      final connection = await _googleDriveService.getConnection();
      if (mounted) {
        setState(() {
          _googleDriveConnection = connection;
          _isDriveLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isDriveLoading = false);
      }
    }
  }

  /// Load Google Calendar connection
  Future<void> _loadCalendarConnection() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;

    if (workspaceId == null) {
      setState(() => _isCalendarLoading = false);
      return;
    }

    setState(() => _isCalendarLoading = true);

    try {
      final response = await _googleCalendarService.getConnection(workspaceId);

      if (mounted) {
        setState(() {
          _googleCalendarConnection = response.data;
          _isCalendarLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isCalendarLoading = false);
      }
    }
  }

  /// Listen for OAuth callback deep link
  void _listenForOAuthCallback() {
    _deepLinkSubscription = _appLinks.uriLinkStream.listen((Uri uri) {
      if (uri.scheme == 'deskive') {
        if (uri.host == 'oauth' && uri.path == '/callback') {
          final provider = uri.queryParameters['provider'];
          if (provider == 'github') {
            _handleGitHubCallback(uri);
          } else if (provider == 'sheets') {
            _handleSheetsCallback(uri);
          } else {
            _handleDriveCallback(uri);
          }
        } else if (uri.host == 'calendar') {
          _handleCalendarCallback(uri);
        } else if (uri.host == 'sheets') {
          _handleSheetsCallback(uri);
        } else if (uri.host == 'github') {
          _handleGitHubCallback(uri);
        } else if (uri.host == 'gmail') {
          _handleGmailCallback(uri);
        } else if (uri.host == 'integration') {
          // Handle integration framework OAuth callback
          _handleIntegrationCallback(uri);
        }
      }
    });
  }

  /// Handle integration framework OAuth callback
  void _handleIntegrationCallback(Uri uri) {
    final success = uri.queryParameters['success'] == 'true';
    final error = uri.queryParameters['error'];
    final slug = uri.queryParameters['slug'];

    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }

    if (success) {
      _loadCatalogAndConnections();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('connectors.connected_success'.tr(args: [slug ?? 'Integration'])),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('connectors.connect_failed'.tr(args: [error ?? 'Unknown error'])),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// Handle Google Drive OAuth callback
  void _handleDriveCallback(Uri uri) {
    final success = uri.queryParameters['success'] == 'true';
    final error = uri.queryParameters['error'];

    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }

    if (success) {
      _loadDriveConnection();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.google_drive.connected_success'.tr()),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.connect_failed'.tr(args: [error ?? 'Unknown error'])),
          backgroundColor: Colors.red,
        ),
      );
    }

    setState(() => _isDriveConnecting = false);
  }

  /// Handle Google Calendar OAuth callback
  void _handleCalendarCallback(Uri uri) {
    final success = uri.queryParameters['calendarConnected'] == 'true' ||
                    uri.queryParameters['success'] == 'true';
    final error = uri.queryParameters['calendarError'] ?? uri.queryParameters['error'];

    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }

    if (success) {
      _loadCalendarConnection();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.google_calendar.connected_success'.tr()),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.connect_failed'.tr(args: [error ?? 'Unknown error'])),
          backgroundColor: Colors.red,
        ),
      );
    }

    setState(() => _isCalendarConnecting = false);
  }

  // ============================================
  // Google Drive Methods
  // ============================================

  Future<void> _connectGoogleDrive() async {
    setState(() => _isDriveConnecting = true);

    try {
      if (!kIsWeb && (Platform.isIOS || Platform.isAndroid)) {
        try {
          final connection = await NativeGoogleDriveService.instance.connectWithNativeSignIn();
          if (mounted) {
            setState(() {
              _googleDriveConnection = connection;
              _isDriveConnecting = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('apps.google_drive.connected_success'.tr()),
                backgroundColor: Colors.green,
              ),
            );
          }
          return;
        } catch (e) {
          if (!e.toString().contains('cancelled') && !e.toString().contains('canceled')) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('apps.connect_failed'.tr(args: [e.toString()])),
                  backgroundColor: Colors.red,
                ),
              );
            }
          }
          setState(() => _isDriveConnecting = false);
          return;
        }
      }

      final authData = await _googleDriveService.getAuthUrl(
        returnUrl: 'deskive://oauth/callback',
      );
      final authUrl = authData['authorizationUrl'];

      if (authUrl != null && authUrl.isNotEmpty) {
        final uri = Uri.parse(authUrl);
        if (await canLaunchUrl(uri)) {
          _oauthInProgress = true;
          await launchUrl(uri, mode: LaunchMode.externalApplication);
          if (mounted) {
            _showOAuthInProgressDialog('apps.google_drive.connecting'.tr());
          }
        } else {
          throw Exception('Could not launch OAuth URL');
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.connect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isDriveConnecting = false);
      }
    }
  }

  Future<void> _disconnectGoogleDrive() async {
    final confirmed = await _showDisconnectConfirmDialog(
      'apps.google_drive.disconnect'.tr(),
      'apps.google_drive.disconnect_confirm'.tr(),
    );

    if (confirmed != true) return;

    setState(() => _isDriveDisconnecting = true);

    try {
      await _googleDriveService.disconnect();
      if (mounted) {
        setState(() {
          _googleDriveConnection = null;
          _isDriveDisconnecting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('apps.google_drive.disconnected'.tr())),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isDriveDisconnecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.disconnect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _openGoogleDrive() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const GoogleDriveBrowserScreen()),
    );
  }

  // ============================================
  // Google Calendar Methods
  // ============================================

  Future<void> _connectGoogleCalendar() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.no_workspace'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isCalendarConnecting = true);

    try {
      if (!kIsWeb && (Platform.isIOS || Platform.isAndroid)) {
        try {
          final connection = await NativeGoogleCalendarService.instance.connectWithNativeSignIn();
          if (mounted) {
            setState(() {
              _googleCalendarConnection = connection;
              _isCalendarConnecting = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('apps.google_calendar.connected_success'.tr()),
                backgroundColor: Colors.green,
              ),
            );
          }
          return;
        } catch (e) {
          if (!e.toString().contains('cancelled') && !e.toString().contains('canceled')) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('apps.connect_failed'.tr(args: [e.toString()])),
                  backgroundColor: Colors.red,
                ),
              );
            }
          }
          setState(() => _isCalendarConnecting = false);
          return;
        }
      }

      final response = await _googleCalendarService.getAuthUrl(
        workspaceId,
        returnUrl: 'deskive://calendar',
      );

      if (!response.isSuccess || response.data == null) {
        throw Exception(response.message ?? 'Failed to get authorization URL');
      }

      final uri = Uri.parse(response.data!);
      if (await canLaunchUrl(uri)) {
        _oauthInProgress = true;
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        if (mounted) {
          _showOAuthInProgressDialog('apps.google_calendar.connecting'.tr());
        }
      } else {
        throw Exception('Could not launch OAuth URL');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.connect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
        setState(() => _isCalendarConnecting = false);
      }
    }
  }

  Future<void> _disconnectGoogleCalendar() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    final confirmed = await _showDisconnectConfirmDialog(
      'apps.google_calendar.disconnect'.tr(),
      'apps.google_calendar.disconnect_confirm'.tr(),
    );

    if (confirmed != true) return;

    setState(() => _isCalendarDisconnecting = true);

    try {
      final response = await _googleCalendarService.disconnect(workspaceId);
      if (mounted) {
        if (response.isSuccess) {
          setState(() {
            _googleCalendarConnection = null;
            _isCalendarDisconnecting = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('apps.google_calendar.disconnected'.tr())),
          );
        } else {
          throw Exception(response.message);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isCalendarDisconnecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.disconnect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _openCalendarSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const CalendarSettingsScreen()),
    ).then((_) {
      _loadCalendarConnection();
    });
  }

  // ============================================
  // Google Sheets Methods
  // ============================================

  Future<void> _loadSheetsConnection() async {
    setState(() => _isSheetsLoading = true);

    try {
      final connection = await _googleSheetsService.getConnection();
      if (mounted) {
        setState(() {
          _googleSheetsConnection = connection;
          _isSheetsLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSheetsLoading = false);
      }
    }
  }

  void _handleSheetsCallback(Uri uri) {
    final success = uri.queryParameters['success'] == 'true';
    final error = uri.queryParameters['error'];

    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }

    if (success) {
      _loadSheetsConnection();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.google_sheets.connected_success'.tr()),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.connect_failed'.tr(args: [error ?? 'Unknown error'])),
          backgroundColor: Colors.red,
        ),
      );
    }

    setState(() => _isSheetsConnecting = false);
  }

  Future<void> _connectGoogleSheets() async {
    setState(() => _isSheetsConnecting = true);

    try {
      final connection = await _googleSheetsService.connect();

      if (connection != null) {
        if (mounted) {
          setState(() {
            _googleSheetsConnection = connection;
            _isSheetsConnecting = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('apps.google_sheets.connected_success'.tr()),
              backgroundColor: Colors.green,
            ),
          );
        }
        return;
      }

      final authData = await _googleSheetsService.getAuthUrl(
        returnUrl: 'deskive://sheets',
      );
      final authUrl = authData['authorizationUrl'];

      if (authUrl != null && authUrl.isNotEmpty) {
        final uri = Uri.parse(authUrl);
        if (await canLaunchUrl(uri)) {
          _oauthInProgress = true;
          await launchUrl(uri, mode: LaunchMode.externalApplication);
          if (mounted) {
            _showOAuthInProgressDialog('apps.google_sheets.connecting'.tr());
          }
        } else {
          throw Exception('Could not launch OAuth URL');
        }
      }
    } catch (e) {
      if (mounted) {
        if (!e.toString().contains('cancelled') && !e.toString().contains('canceled')) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('apps.connect_failed'.tr(args: [e.toString()])),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } finally {
      if (mounted) {
        setState(() => _isSheetsConnecting = false);
      }
    }
  }

  Future<void> _disconnectGoogleSheets() async {
    final confirmed = await _showDisconnectConfirmDialog(
      'apps.google_sheets.disconnect'.tr(),
      'apps.google_sheets.disconnect_confirm'.tr(),
    );

    if (confirmed != true) return;

    setState(() => _isSheetsDisconnecting = true);

    try {
      await _googleSheetsService.disconnect();
      if (mounted) {
        setState(() {
          _googleSheetsConnection = null;
          _isSheetsDisconnecting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('apps.google_sheets.disconnected'.tr())),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSheetsDisconnecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.disconnect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _openGoogleSheets() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const GoogleSheetsBrowserScreen()),
    );
  }

  // ============================================
  // GitHub Methods
  // ============================================

  Future<void> _loadGitHubConnection() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() => _isGitHubLoading = false);
      return;
    }

    setState(() => _isGitHubLoading = true);

    try {
      final connection = await _githubService.getConnection(workspaceId);
      if (mounted) {
        setState(() {
          _githubConnection = connection;
          _isGitHubLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isGitHubLoading = false);
      }
    }
  }

  void _handleGitHubCallback(Uri uri) {
    final success = uri.queryParameters['success'] == 'true';
    final error = uri.queryParameters['error'];

    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }

    if (success) {
      _loadGitHubConnection();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.github.connected_success'.tr()),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.connect_failed'.tr(args: [error ?? 'Unknown error'])),
          backgroundColor: Colors.red,
        ),
      );
    }

    setState(() => _isGitHubConnecting = false);
  }

  Future<void> _connectGitHub() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.no_workspace'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isGitHubConnecting = true);

    try {
      final authData = await _githubService.getAuthUrl(
        workspaceId,
        returnUrl: 'deskive://github',
      );
      final authUrl = authData['authorizationUrl'];

      if (authUrl != null && authUrl.isNotEmpty) {
        final uri = Uri.parse(authUrl);
        if (await canLaunchUrl(uri)) {
          _oauthInProgress = true;
          await launchUrl(uri, mode: LaunchMode.externalApplication);
          if (mounted) {
            _showOAuthInProgressDialog('apps.github.connecting'.tr());
          }
        } else {
          throw Exception('Could not launch OAuth URL');
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.connect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
        setState(() => _isGitHubConnecting = false);
      }
    }
  }

  Future<void> _disconnectGitHub() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    final confirmed = await _showDisconnectConfirmDialog(
      'apps.github.disconnect'.tr(),
      'apps.github.disconnect_confirm'.tr(),
    );

    if (confirmed != true) return;

    setState(() => _isGitHubDisconnecting = true);

    try {
      await _githubService.disconnect(workspaceId);
      if (mounted) {
        setState(() {
          _githubConnection = null;
          _isGitHubDisconnecting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('apps.github.disconnected'.tr())),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isGitHubDisconnecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.disconnect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _openGitHub() {
    final githubLogin = _githubConnection?.githubLogin;
    if (githubLogin != null) {
      launchUrl(
        Uri.parse('https://github.com/$githubLogin'),
        mode: LaunchMode.externalApplication,
      );
    }
  }

  // ============================================
  // Dropbox Methods
  // ============================================

  Future<void> _loadDropboxConnection() async {
    setState(() => _isDropboxLoading = true);

    try {
      final connection = await _dropboxService.getConnection();
      if (mounted) {
        setState(() {
          _dropboxConnection = connection;
          _isDropboxLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isDropboxLoading = false);
      }
    }
  }

  void _handleDropboxCallback(Uri uri) {
    final success = uri.queryParameters['success'] == 'true';
    final error = uri.queryParameters['error'];

    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }

    if (success) {
      _loadDropboxConnection();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.dropbox.connected_success'.tr()),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.connect_failed'.tr(args: [error ?? 'Unknown error'])),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _connectDropbox() async {
    setState(() => _isDropboxConnecting = true);

    try {
      // Get OAuth URL from backend
      final authData = await _dropboxService.getAuthUrl(
        returnUrl: 'deskive://oauth/callback',
      );

      final authUrl = authData['authorizationUrl'];
      if (authUrl == null || authUrl.isEmpty) {
        throw Exception('Failed to get Dropbox OAuth URL');
      }

      // Mark OAuth as in progress
      _oauthInProgress = true;

      // Open OAuth URL in browser
      final uri = Uri.parse(authUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        throw Exception('Could not open OAuth URL');
      }

      if (mounted) {
        setState(() => _isDropboxConnecting = false);
      }
    } catch (e) {
      _oauthInProgress = false;
      if (mounted) {
        setState(() => _isDropboxConnecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.connect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _disconnectDropbox() async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('apps.disconnect_title'.tr()),
        content: Text('apps.disconnect_confirm'.tr(args: ['Dropbox'])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('apps.disconnect'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isDropboxDisconnecting = true);

    try {
      await _dropboxService.disconnect();
      if (mounted) {
        setState(() {
          _dropboxConnection = null;
          _isDropboxDisconnecting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.disconnected_success'.tr(args: ['Dropbox'])),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isDropboxDisconnecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.disconnect_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _openDropbox() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const DropboxBrowserScreen()),
    );
  }

  // ============================================
  // Slack Methods
  // ============================================

  Future<void> _loadSlackConnection() async {
    setState(() => _isSlackLoading = true);

    try {
      final connection = await _slackService.getConnection();
      if (mounted) {
        setState(() {
          _slackConnection = connection;
          _isSlackLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSlackLoading = false);
      }
    }
  }

  void _handleSlackCallback(Uri uri) {
    final success = uri.queryParameters['success'] == 'true';
    final error = uri.queryParameters['error'];

    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }

    if (success) {
      _loadSlackConnection();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.slack.connected_success'.tr()),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.connect_failed'.tr(args: [error ?? 'Unknown error'])),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _connectSlack() async {
    setState(() => _isSlackConnecting = true);

    try {
      final authData = await _slackService.getAuthUrl(
        returnUrl: 'deskive://oauth/callback',
      );

      final authUrl = authData['authorizationUrl'];
      if (authUrl == null || authUrl.isEmpty) {
        throw Exception('Failed to get Slack OAuth URL');
      }

      _oauthInProgress = true;

      final uri = Uri.parse(authUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        throw Exception('Could not open OAuth URL');
      }

      if (mounted) {
        setState(() => _isSlackConnecting = false);
      }
    } catch (e) {
      _oauthInProgress = false;
      if (mounted) {
        setState(() => _isSlackConnecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.connect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _disconnectSlack() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('apps.disconnect_title'.tr()),
        content: Text('apps.disconnect_confirm'.tr(args: ['Slack'])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('apps.disconnect'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isSlackDisconnecting = true);

    try {
      await _slackService.disconnect();
      if (mounted) {
        setState(() {
          _slackConnection = null;
          _isSlackDisconnecting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.disconnected_success'.tr(args: ['Slack'])),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSlackDisconnecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.disconnect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _openSlack() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SlackScreen()),
    );
  }

  // ============================================
  // Twitter Methods
  // ============================================

  Future<void> _loadTwitterConnection() async {
    setState(() => _isTwitterLoading = true);

    try {
      final connection = await _twitterService.getConnection();
      if (mounted) {
        setState(() {
          _twitterConnection = connection;
          _isTwitterLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isTwitterLoading = false);
      }
    }
  }

  void _handleTwitterCallback(Uri uri) {
    final success = uri.queryParameters['success'] == 'true';
    final error = uri.queryParameters['error'];

    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }

    if (success) {
      _loadTwitterConnection();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.twitter.connected_success'.tr()),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.connect_failed'.tr(args: [error ?? 'Unknown error'])),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _connectTwitter() async {
    setState(() => _isTwitterConnecting = true);

    try {
      final authData = await _twitterService.getAuthUrl(
        returnUrl: 'deskive://oauth/callback',
      );

      final authUrl = authData['authorizationUrl'];
      if (authUrl == null || authUrl.isEmpty) {
        throw Exception('Failed to get Twitter OAuth URL');
      }

      _oauthInProgress = true;

      final uri = Uri.parse(authUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        throw Exception('Could not open OAuth URL');
      }

      if (mounted) {
        setState(() => _isTwitterConnecting = false);
      }
    } catch (e) {
      _oauthInProgress = false;
      if (mounted) {
        setState(() => _isTwitterConnecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.connect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _disconnectTwitter() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('apps.disconnect_title'.tr()),
        content: Text('apps.disconnect_confirm'.tr(args: ['Twitter'])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('apps.disconnect'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isTwitterDisconnecting = true);

    try {
      await _twitterService.disconnect();
      if (mounted) {
        setState(() {
          _twitterConnection = null;
          _isTwitterDisconnecting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.disconnected_success'.tr(args: ['Twitter'])),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isTwitterDisconnecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.disconnect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _openTwitter() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const TwitterScreen()),
    );
  }

  // ============================================
  // OpenAI Methods
  // ============================================

  Future<void> _loadOpenAIConnection() async {
    setState(() => _isOpenAILoading = true);
    try {
      final connection = await _openaiService.getConnection();
      if (mounted) {
        setState(() {
          _openaiConnection = connection;
          _isOpenAILoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isOpenAILoading = false);
    }
  }

  Future<void> _connectOpenAI() async {
    final apiKey = await _showSimpleApiKeyDialog(
      title: 'Connect OpenAI',
      description: 'Enter your OpenAI API key to connect.',
      hint: 'sk-...',
      helpUrl: 'https://platform.openai.com/api-keys',
    );
    if (apiKey == null || apiKey.isEmpty) return;

    setState(() => _isOpenAIConnecting = true);
    try {
      await _openaiService.connect(apiKey: apiKey);
      await _loadOpenAIConnection();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('OpenAI connected successfully'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to connect OpenAI: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isOpenAIConnecting = false);
    }
  }

  Future<void> _disconnectOpenAI() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('apps.disconnect_title'.tr()),
        content: Text('apps.disconnect_confirm'.tr(args: ['OpenAI'])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('apps.disconnect'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isOpenAIDisconnecting = true);
    try {
      await _openaiService.disconnect();
      if (mounted) {
        setState(() {
          _openaiConnection = null;
          _isOpenAIDisconnecting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('OpenAI disconnected')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isOpenAIDisconnecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to disconnect: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _openOpenAI() {
    Navigator.push(context, MaterialPageRoute(builder: (context) => const OpenAIScreen()));
  }

  // ============================================
  // SendGrid Methods
  // ============================================

  Future<void> _loadSendGridConnection() async {
    setState(() => _isSendGridLoading = true);
    try {
      final connection = await _sendgridService.getConnection();
      if (mounted) {
        setState(() {
          _sendgridConnection = connection;
          _isSendGridLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isSendGridLoading = false);
    }
  }

  Future<void> _connectSendGrid() async {
    final result = await _showSendGridConnectDialog();
    if (result == null) return;

    setState(() => _isSendGridConnecting = true);
    try {
      await _sendgridService.connect(
        apiKey: result['apiKey']!,
        senderEmail: result['senderEmail']!,
        senderName: result['senderName']!,
      );
      await _loadSendGridConnection();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('SendGrid connected successfully'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to connect SendGrid: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSendGridConnecting = false);
    }
  }

  Future<Map<String, String>?> _showSendGridConnectDialog() async {
    final apiKeyController = TextEditingController();
    final senderEmailController = TextEditingController();
    final senderNameController = TextEditingController();

    return showDialog<Map<String, String>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Connect SendGrid'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Enter your SendGrid credentials to connect.'),
              const SizedBox(height: 8),
              InkWell(
                onTap: () => launchUrl(Uri.parse('https://app.sendgrid.com/settings/api_keys')),
                child: Text(
                  'Get API Key',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: apiKeyController,
                decoration: const InputDecoration(
                  labelText: 'API Key',
                  hintText: 'SG...',
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: senderEmailController,
                decoration: const InputDecoration(
                  labelText: 'Sender Email',
                  hintText: 'noreply@yourdomain.com',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: senderNameController,
                decoration: const InputDecoration(
                  labelText: 'Sender Name',
                  hintText: 'Your Company',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          FilledButton(
            onPressed: () {
              if (apiKeyController.text.isEmpty ||
                  senderEmailController.text.isEmpty ||
                  senderNameController.text.isEmpty) {
                return;
              }
              Navigator.pop(context, {
                'apiKey': apiKeyController.text,
                'senderEmail': senderEmailController.text,
                'senderName': senderNameController.text,
              });
            },
            child: Text('apps.connect'.tr()),
          ),
        ],
      ),
    );
  }

  Future<void> _disconnectSendGrid() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('apps.disconnect_title'.tr()),
        content: Text('apps.disconnect_confirm'.tr(args: ['SendGrid'])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('apps.disconnect'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isSendGridDisconnecting = true);
    try {
      await _sendgridService.disconnect();
      if (mounted) {
        setState(() {
          _sendgridConnection = null;
          _isSendGridDisconnecting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('SendGrid disconnected')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSendGridDisconnecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to disconnect: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _openSendGrid() {
    Navigator.push(context, MaterialPageRoute(builder: (context) => const SendGridScreen()));
  }

  // ============================================
  // Telegram Methods
  // ============================================

  Future<void> _loadTelegramConnection() async {
    setState(() => _isTelegramLoading = true);
    try {
      final connection = await _telegramService.getConnection();
      if (mounted) {
        setState(() {
          _telegramConnection = connection;
          _isTelegramLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isTelegramLoading = false);
    }
  }

  Future<void> _connectTelegram() async {
    final botToken = await _showSimpleApiKeyDialog(
      title: 'Connect Telegram Bot',
      description: 'Enter your Telegram Bot Token to connect.',
      hint: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
      helpUrl: 'https://core.telegram.org/bots#how-do-i-create-a-bot',
    );
    if (botToken == null || botToken.isEmpty) return;

    setState(() => _isTelegramConnecting = true);
    try {
      await _telegramService.connect(botToken);
      await _loadTelegramConnection();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Telegram bot connected successfully'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to connect Telegram: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isTelegramConnecting = false);
    }
  }

  Future<void> _disconnectTelegram() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('apps.disconnect_title'.tr()),
        content: Text('apps.disconnect_confirm'.tr(args: ['Telegram'])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('apps.disconnect'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isTelegramDisconnecting = true);
    try {
      await _telegramService.disconnect();
      if (mounted) {
        setState(() {
          _telegramConnection = null;
          _isTelegramDisconnecting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Telegram disconnected')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isTelegramDisconnecting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to disconnect: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _openTelegram() {
    Navigator.push(context, MaterialPageRoute(builder: (context) => const TelegramScreen()));
  }

  /// Simple API key dialog for single-field connections (OpenAI, Telegram)
  Future<String?> _showSimpleApiKeyDialog({
    required String title,
    required String description,
    required String hint,
    String? helpUrl,
  }) async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(description),
            if (helpUrl != null) ...[
              const SizedBox(height: 8),
              InkWell(
                onTap: () => launchUrl(Uri.parse(helpUrl)),
                child: Text(
                  'Get API Key',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: InputDecoration(hintText: hint, border: const OutlineInputBorder()),
              obscureText: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: Text('apps.connect'.tr()),
          ),
        ],
      ),
    );
  }

  // ============================================
  // Gmail Methods
  // ============================================

  Future<void> _loadGmailConnection() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() => _isGmailLoading = false);
      return;
    }

    setState(() => _isGmailLoading = true);

    try {
      final response = await _emailApiService.getAllConnections(workspaceId);
      if (response.success && response.data != null) {
        final allAccounts = response.data!.allAccounts;
        final gmailAccounts = allAccounts
            .where((a) => a.provider == 'gmail' && a.isActive)
            .toList();

        if (mounted) {
          setState(() {
            _gmailAccounts = gmailAccounts;
            _isGmailLoading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() => _isGmailLoading = false);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isGmailLoading = false);
      }
    }
  }

  void _handleGmailCallback(Uri uri) {
    final success = uri.queryParameters['success'] == 'true';
    final error = uri.queryParameters['error'];

    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }

    if (success) {
      _loadGmailConnection();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.gmail.connected_success'.tr()),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.connect_failed'.tr(args: [error ?? 'Unknown error'])),
          backgroundColor: Colors.red,
        ),
      );
    }

    setState(() => _isGmailConnecting = false);
  }

  Future<void> _connectGmail() async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.no_workspace'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isGmailConnecting = true);

    try {
      if (!kIsWeb && (Platform.isIOS || Platform.isAndroid)) {
        try {
          await NativeGmailService.instance.connectWithNativeSignIn();
          if (mounted) {
            await _loadGmailConnection();
            setState(() => _isGmailConnecting = false);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('apps.gmail.connected_success'.tr()),
                backgroundColor: Colors.green,
              ),
            );
          }
          return;
        } catch (e) {
          if (!e.toString().contains('cancelled') && !e.toString().contains('canceled')) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('apps.connect_failed'.tr(args: [e.toString()])),
                  backgroundColor: Colors.red,
                ),
              );
            }
          }
          setState(() => _isGmailConnecting = false);
          return;
        }
      }

      final response = await _emailApiService.getAuthUrl(
        workspaceId,
        'deskive://gmail',
      );

      if (response.success && response.data != null && response.data!.isNotEmpty) {
        final authUrl = response.data!;
        final uri = Uri.parse(authUrl);

        if (await canLaunchUrl(uri)) {
          _oauthInProgress = true;
          await launchUrl(uri, mode: LaunchMode.externalApplication);
          if (mounted) {
            _showOAuthInProgressDialog('apps.gmail.connecting'.tr());
          }
        } else {
          throw Exception('Could not launch OAuth URL');
        }
      } else {
        throw Exception(response.message ?? 'Failed to get OAuth URL');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.connect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
        setState(() => _isGmailConnecting = false);
      }
    }
  }

  Future<void> _disconnectGmailAccount(EmailConnection account) async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    final confirmed = await _showDisconnectConfirmDialog(
      'apps.gmail.disconnect'.tr(),
      'apps.gmail.disconnect_confirm_account'.tr(args: [account.emailAddress]),
    );

    if (confirmed != true) return;

    setState(() => _disconnectingGmailId = account.id);

    try {
      final response = await _emailApiService.disconnectById(workspaceId, account.id);

      if (response.success) {
        await _loadGmailConnection();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('apps.gmail.disconnected'.tr())),
          );
        }
      } else {
        throw Exception(response.message ?? 'Failed to disconnect');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.disconnect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _disconnectingGmailId = null);
      }
    }
  }

  void _openEmailModule() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const EmailScreen()),
    );
  }

  // ============================================
  // Integration Framework Methods
  // ============================================

  /// Connect to an integration from the catalog
  Future<void> _connectIntegration(IntegrationCatalogEntry entry) async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('apps.no_workspace'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Check for special handling of known integrations
    final slug = entry.slug.toLowerCase();
    if (slug == 'google-drive' || slug == 'google_drive') {
      _connectGoogleDrive();
      return;
    } else if (slug == 'google-calendar' || slug == 'google_calendar') {
      _connectGoogleCalendar();
      return;
    } else if (slug == 'google-sheets' || slug == 'google_sheets') {
      _connectGoogleSheets();
      return;
    } else if (slug == 'github') {
      _connectGitHub();
      return;
    } else if (slug == 'gmail') {
      _connectGmail();
      return;
    }

    // For API key auth type, show dialog
    if (entry.authType == IntegrationAuthType.apiKey) {
      _showApiKeyDialog(entry);
      return;
    }

    // For OAuth integrations, initiate OAuth flow
    if (entry.supportsOAuth) {
      try {
        final authData = await _integrationService.initiateOAuth(
          workspaceId,
          entry.slug,
          returnUrl: 'deskive://integration?slug=${entry.slug}',
        );
        final authUrl = authData['authUrl'];

        if (authUrl != null && authUrl.isNotEmpty) {
          final uri = Uri.parse(authUrl);
          if (await canLaunchUrl(uri)) {
            _oauthInProgress = true;
            await launchUrl(uri, mode: LaunchMode.externalApplication);
            if (mounted) {
              _showOAuthInProgressDialog('connectors.connecting'.tr(args: [entry.name]));
            }
          } else {
            throw Exception('Could not launch OAuth URL');
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('connectors.connect_failed'.tr(args: [e.toString()])),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  /// Show API key input dialog
  void _showApiKeyDialog(IntegrationCatalogEntry entry) {
    final apiKeyController = TextEditingController();
    bool isConnecting = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('connectors.enter_api_key'.tr(args: [entry.name])),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'connectors.api_key_description'.tr(),
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: apiKeyController,
                decoration: InputDecoration(
                  labelText: 'connectors.api_key'.tr(),
                  border: const OutlineInputBorder(),
                ),
                obscureText: true,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('common.cancel'.tr()),
            ),
            FilledButton(
              onPressed: isConnecting
                  ? null
                  : () async {
                      if (apiKeyController.text.isEmpty) return;

                      setDialogState(() => isConnecting = true);

                      try {
                        final workspaceId = _workspaceService.currentWorkspace?.id;
                        if (workspaceId == null) throw Exception('No workspace');

                        await _integrationService.connectWithApiKey(
                          workspaceId,
                          entry.slug,
                          apiKey: apiKeyController.text,
                        );

                        if (mounted) {
                          Navigator.pop(context);
                          _loadCatalogAndConnections();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('connectors.connected_success'.tr(args: [entry.name])),
                              backgroundColor: Colors.green,
                            ),
                          );
                        }
                      } catch (e) {
                        setDialogState(() => isConnecting = false);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('connectors.connect_failed'.tr(args: [e.toString()])),
                            backgroundColor: Colors.red,
                          ),
                        );
                      }
                    },
              child: isConnecting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text('apps.connect'.tr()),
            ),
          ],
        ),
      ),
    );
  }

  /// Disconnect an integration from the catalog
  Future<void> _disconnectIntegration(IntegrationConnection connection) async {
    final workspaceId = _workspaceService.currentWorkspace?.id;
    if (workspaceId == null) return;

    final name = connection.integration?.name ?? 'Integration';
    final confirmed = await _showDisconnectConfirmDialog(
      'connectors.disconnect'.tr(),
      'connectors.disconnect_confirm'.tr(args: [name]),
    );

    if (confirmed != true) return;

    try {
      await _integrationService.disconnect(workspaceId, connection.id);
      await _loadCatalogAndConnections();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('connectors.disconnected'.tr(args: [name]))),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('apps.disconnect_failed'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  void _showOAuthInProgressDialog(String title) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text('apps.oauth_in_progress'.tr()),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              _oauthInProgress = false;
              await Future.delayed(const Duration(milliseconds: 800));
              if (mounted) {
                await _loadAllData();
              }
            },
            child: Text('apps.done'.tr()),
          ),
        ],
      ),
    );
  }

  Future<bool?> _showDisconnectConfirmDialog(String title, String content) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('apps.disconnect'.tr()),
          ),
        ],
      ),
    );
  }

  /// Get unique categories from catalog and legacy services
  List<IntegrationCategoryType> get _availableCategories {
    final categories = <IntegrationCategoryType>{};
    // Add categories from catalog entries
    for (final entry in _catalogEntries) {
      categories.add(entry.category);
    }
    // Add categories from legacy services
    for (final info in _legacyServices.values) {
      categories.add(info.category);
    }
    return categories.toList()..sort((a, b) => a.label.compareTo(b.label));
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = _isDriveLoading || _isCalendarLoading || _isSheetsLoading ||
                      _isGitHubLoading || _isGmailLoading || _isCatalogLoading;

    return Scaffold(
      appBar: AppBar(
        leading: _isSearching
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: _toggleSearch,
              )
            : null,
        title: _isSearching
            ? TextField(
                controller: _searchController,
                autofocus: true,
                onChanged: (value) => setState(() => _searchQuery = value),
                decoration: InputDecoration(
                  hintText: 'connectors.search_hint'.tr(),
                  border: InputBorder.none,
                ),
                style: Theme.of(context).textTheme.titleMedium,
              )
            : Text('connectors.title'.tr()),
        actions: [
          if (!_isSearching)
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: _toggleSearch,
            ),
          if (_isSearching && _searchQuery.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _searchController.clear();
                setState(() => _searchQuery = '');
              },
            ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadAllData,
              child: CustomScrollView(
                slivers: [
                  // Header
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                      child: Text(
                        'connectors.subtitle'.tr(),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                    ),
                  ),

                  // Category filter chips
                  if (_availableCategories.isNotEmpty)
                    SliverToBoxAdapter(
                      child: SizedBox(
                        height: 40,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          children: [
                            // "All" chip
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: FilterChip(
                                label: Text('connectors.all'.tr()),
                                selected: _selectedCategory == null,
                                onSelected: (_) => setState(() => _selectedCategory = null),
                              ),
                            ),
                            // Category chips
                            ..._availableCategories.map((category) => Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: FilterChip(
                                    avatar: Icon(category.icon, size: 16),
                                    label: Text(category.label),
                                    selected: _selectedCategory == category,
                                    onSelected: (_) => setState(() {
                                      _selectedCategory = _selectedCategory == category ? null : category;
                                    }),
                                  ),
                                )),
                          ],
                        ),
                      ),
                    ),

                  const SliverToBoxAdapter(child: SizedBox(height: 16)),

                  // Connected section - Legacy services (Google Drive, Calendar, etc.)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Text(
                        'connectors.connected'.tr(),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ),
                  ),

                  // Legacy connected services
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        // Google Drive
                        if (_googleDriveConnection != null && _shouldShowLegacyService('google-drive'))
                          _LegacyConnectorCard(
                            name: 'Google Drive',
                            description: 'apps.google_drive.description'.tr(),
                            icon: const _GoogleDriveLogo(),
                            connectedAs: _googleDriveConnection?.googleEmail,
                            isDisconnecting: _isDriveDisconnecting,
                            onOpen: _openGoogleDrive,
                            onDisconnect: _disconnectGoogleDrive,
                          ),

                        // Google Calendar
                        if (_googleCalendarConnection != null && _shouldShowLegacyService('google-calendar'))
                          _LegacyConnectorCard(
                            name: 'apps.google_calendar.title'.tr(),
                            description: 'apps.google_calendar.description'.tr(),
                            icon: const _GoogleCalendarLogo(),
                            connectedAs: _googleCalendarConnection?.googleEmail,
                            isDisconnecting: _isCalendarDisconnecting,
                            onOpen: _openCalendarSettings,
                            onDisconnect: _disconnectGoogleCalendar,
                            openLabel: 'apps.manage'.tr(),
                          ),

                        // Google Sheets
                        if (_googleSheetsConnection != null && _googleSheetsConnection!.isActive && _shouldShowLegacyService('google-sheets'))
                          _LegacyConnectorCard(
                            name: 'Google Sheets',
                            description: 'apps.google_sheets.description'.tr(),
                            icon: const _GoogleSheetsLogo(),
                            connectedAs: _googleSheetsConnection?.googleEmail,
                            isDisconnecting: _isSheetsDisconnecting,
                            onOpen: _openGoogleSheets,
                            onDisconnect: _disconnectGoogleSheets,
                          ),

                        // GitHub
                        if (_githubConnection != null && _githubConnection!.isActive && _shouldShowLegacyService('github'))
                          _LegacyConnectorCard(
                            name: 'GitHub',
                            description: 'apps.github.description'.tr(),
                            icon: const _GitHubLogo(),
                            connectedAs: _githubConnection?.githubLogin != null
                                ? '@${_githubConnection!.githubLogin}'
                                : null,
                            isDisconnecting: _isGitHubDisconnecting,
                            onOpen: _openGitHub,
                            onDisconnect: _disconnectGitHub,
                          ),

                        // Dropbox
                        if (_dropboxConnection != null && _dropboxConnection!.isActive && _shouldShowLegacyService('dropbox'))
                          _LegacyConnectorCard(
                            name: 'Dropbox',
                            description: 'apps.dropbox.description'.tr(),
                            icon: const _DropboxLogo(),
                            connectedAs: _dropboxConnection?.dropboxEmail,
                            isDisconnecting: _isDropboxDisconnecting,
                            onOpen: _openDropbox,
                            onDisconnect: _disconnectDropbox,
                          ),

                        // Slack
                        if (_slackConnection != null && _slackConnection!.isActive && _shouldShowLegacyService('slack'))
                          _LegacyConnectorCard(
                            name: 'Slack',
                            description: 'apps.slack.description'.tr(),
                            icon: const _SlackLogo(),
                            connectedAs: _slackConnection?.slackEmail ?? _slackConnection?.teamName,
                            isDisconnecting: _isSlackDisconnecting,
                            onOpen: _openSlack,
                            onDisconnect: _disconnectSlack,
                          ),

                        // Twitter
                        if (_twitterConnection != null && _twitterConnection!.isActive && _shouldShowLegacyService('twitter'))
                          _LegacyConnectorCard(
                            name: 'Twitter / X',
                            description: 'apps.twitter.description'.tr(),
                            icon: const _TwitterLogo(),
                            connectedAs: _twitterConnection?.twitterUsername != null
                                ? '@${_twitterConnection!.twitterUsername}'
                                : _twitterConnection?.twitterName,
                            isDisconnecting: _isTwitterDisconnecting,
                            onOpen: _openTwitter,
                            onDisconnect: _disconnectTwitter,
                          ),

                        // Gmail
                        if (_gmailAccounts.isNotEmpty && _shouldShowLegacyService('gmail'))
                          _GmailCard(
                            accounts: _gmailAccounts,
                            isConnecting: _isGmailConnecting,
                            disconnectingAccountId: _disconnectingGmailId,
                            onConnect: _connectGmail,
                            onOpenEmail: _openEmailModule,
                            onDisconnect: _disconnectGmailAccount,
                          ),

                        // Connected from catalog
                        ..._connectedCatalogEntries.map((entry) {
                          final connection = _getConnectionForSlug(entry.slug);
                          return _CatalogConnectorCard(
                            entry: entry,
                            connection: connection,
                            onConnect: () => _connectIntegration(entry),
                            onDisconnect: connection != null
                                ? () => _disconnectIntegration(connection)
                                : null,
                          );
                        }),

                        // Empty state for connected
                        if (_googleDriveConnection == null &&
                            _googleCalendarConnection == null &&
                            (_googleSheetsConnection == null || !_googleSheetsConnection!.isActive) &&
                            (_githubConnection == null || !_githubConnection!.isActive) &&
                            (_dropboxConnection == null || !_dropboxConnection!.isActive) &&
                            (_slackConnection == null || !_slackConnection!.isActive) &&
                            (_twitterConnection == null || !_twitterConnection!.isActive) &&
                            _gmailAccounts.isEmpty &&
                            _connectedCatalogEntries.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 24),
                            child: Center(
                              child: Text(
                                'connectors.no_connected'.tr(),
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                                    ),
                              ),
                            ),
                          ),
                      ]),
                    ),
                  ),

                  const SliverToBoxAdapter(child: SizedBox(height: 24)),

                  // Available section
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Text(
                        'connectors.available'.tr(),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ),
                  ),

                  // Available legacy services
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        // Google Drive (if not connected)
                        if (_googleDriveConnection == null && _shouldShowLegacyService('google-drive'))
                          _LegacyConnectorCard(
                            name: 'Google Drive',
                            description: 'apps.google_drive.description'.tr(),
                            icon: const _GoogleDriveLogo(),
                            isConnecting: _isDriveConnecting,
                            onConnect: _connectGoogleDrive,
                          ),

                        // Google Calendar (if not connected)
                        if (_googleCalendarConnection == null && _shouldShowLegacyService('google-calendar'))
                          _LegacyConnectorCard(
                            name: 'apps.google_calendar.title'.tr(),
                            description: 'apps.google_calendar.description'.tr(),
                            icon: const _GoogleCalendarLogo(),
                            isConnecting: _isCalendarConnecting,
                            onConnect: _connectGoogleCalendar,
                          ),

                        // Google Sheets (if not connected)
                        if ((_googleSheetsConnection == null || !_googleSheetsConnection!.isActive) && _shouldShowLegacyService('google-sheets'))
                          _LegacyConnectorCard(
                            name: 'Google Sheets',
                            description: 'apps.google_sheets.description'.tr(),
                            icon: const _GoogleSheetsLogo(),
                            isConnecting: _isSheetsConnecting,
                            onConnect: _connectGoogleSheets,
                          ),

                        // GitHub (if not connected)
                        if ((_githubConnection == null || !_githubConnection!.isActive) && _shouldShowLegacyService('github'))
                          _LegacyConnectorCard(
                            name: 'GitHub',
                            description: 'apps.github.description'.tr(),
                            icon: const _GitHubLogo(),
                            isConnecting: _isGitHubConnecting,
                            onConnect: _connectGitHub,
                          ),

                        // Dropbox (if not connected)
                        if ((_dropboxConnection == null || !_dropboxConnection!.isActive) && _shouldShowLegacyService('dropbox'))
                          _LegacyConnectorCard(
                            name: 'Dropbox',
                            description: 'apps.dropbox.description'.tr(),
                            icon: const _DropboxLogo(),
                            isConnecting: _isDropboxConnecting,
                            onConnect: _connectDropbox,
                          ),

                        // Slack (if not connected)
                        if ((_slackConnection == null || !_slackConnection!.isActive) && _shouldShowLegacyService('slack'))
                          _LegacyConnectorCard(
                            name: 'Slack',
                            description: 'apps.slack.description'.tr(),
                            icon: const _SlackLogo(),
                            isConnecting: _isSlackConnecting,
                            onConnect: _connectSlack,
                          ),

                        // Twitter (if not connected)
                        if ((_twitterConnection == null || !_twitterConnection!.isActive) && _shouldShowLegacyService('twitter'))
                          _LegacyConnectorCard(
                            name: 'Twitter / X',
                            description: 'apps.twitter.description'.tr(),
                            icon: const _TwitterLogo(),
                            isConnecting: _isTwitterConnecting,
                            onConnect: _connectTwitter,
                          ),

                        // Gmail (if no accounts connected)
                        if (_gmailAccounts.isEmpty && _shouldShowLegacyService('gmail'))
                          _LegacyConnectorCard(
                            name: 'Gmail',
                            description: 'apps.gmail.description'.tr(),
                            icon: const _GmailLogo(),
                            isConnecting: _isGmailConnecting,
                            onConnect: _connectGmail,
                          ),

                        // Available from catalog
                        ..._availableCatalogEntries
                            .where((e) => !_isLegacyIntegration(e.slug))
                            .map((entry) => _CatalogConnectorCard(
                                  entry: entry,
                                  onConnect: () => _connectIntegration(entry),
                                )),
                      ]),
                    ),
                  ),

                  // Error state
                  if (_catalogError != null)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Card(
                          color: Theme.of(context).colorScheme.errorContainer,
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Icon(Icons.error_outline,
                                    color: Theme.of(context).colorScheme.error),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    _catalogError!,
                                    style: TextStyle(
                                        color: Theme.of(context).colorScheme.onErrorContainer),
                                  ),
                                ),
                                TextButton(
                                  onPressed: _loadCatalogAndConnections,
                                  child: Text('common.retry'.tr()),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),

                  const SliverToBoxAdapter(child: SizedBox(height: 32)),
                ],
              ),
            ),
    );
  }

  /// Check if an integration slug is a legacy integration
  bool _isLegacyIntegration(String slug) {
    final lowerSlug = slug.toLowerCase();
    return lowerSlug == 'google-drive' ||
        lowerSlug == 'google_drive' ||
        lowerSlug == 'google-calendar' ||
        lowerSlug == 'google_calendar' ||
        lowerSlug == 'google-sheets' ||
        lowerSlug == 'google_sheets' ||
        lowerSlug == 'github' ||
        lowerSlug == 'gmail' ||
        lowerSlug == 'dropbox' ||
        lowerSlug == 'slack' ||
        lowerSlug == 'twitter';
  }
}

// ============================================
// Widget Components
// ============================================

/// Legacy connector card for Google services and existing integrations
class _LegacyConnectorCard extends StatelessWidget {
  final String name;
  final String description;
  final Widget icon;
  final String? connectedAs;
  final bool isConnecting;
  final bool isDisconnecting;
  final VoidCallback? onConnect;
  final VoidCallback? onOpen;
  final VoidCallback? onDisconnect;
  final String? openLabel;

  const _LegacyConnectorCard({
    required this.name,
    required this.description,
    required this.icon,
    this.connectedAs,
    this.isConnecting = false,
    this.isDisconnecting = false,
    this.onConnect,
    this.onOpen,
    this.onDisconnect,
    this.openLabel,
  });

  bool get isConnected => connectedAs != null || onDisconnect != null;
  bool get isLoading => isConnecting || isDisconnecting;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top row: Icon + Name + Badge (top right)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon
                Container(
                  width: 48,
                  height: 48,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: icon,
                ),
                const SizedBox(width: 12),
                // Name
                Expanded(
                  child: Text(
                    name,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                // Badge (top right)
                if (isConnected) _ConnectedBadge(),
              ],
            ),
            const SizedBox(height: 8),
            // Description
            Text(
              description,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            // Connected email
            if (connectedAs != null) ...[
              const SizedBox(height: 4),
              Text(
                connectedAs!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.primary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 12),
            // Bottom row: Actions
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (isConnected) ...[
                  // Open button (middle right)
                  FilledButton.tonal(
                    onPressed: isLoading ? null : onOpen,
                    child: Text(openLabel ?? 'apps.open'.tr()),
                  ),
                  const SizedBox(width: 8),
                  // Disconnect button (bottom right)
                  IconButton.outlined(
                    onPressed: isLoading ? null : onDisconnect,
                    icon: isDisconnecting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.logout, size: 20),
                  ),
                ] else
                  FilledButton(
                    onPressed: isLoading ? null : onConnect,
                    child: isConnecting
                        ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text('apps.connect'.tr()),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Catalog connector card for integrations from the API
class _CatalogConnectorCard extends StatelessWidget {
  final IntegrationCatalogEntry entry;
  final IntegrationConnection? connection;
  final VoidCallback onConnect;
  final VoidCallback? onDisconnect;

  const _CatalogConnectorCard({
    required this.entry,
    this.connection,
    required this.onConnect,
    this.onDisconnect,
  });

  bool get isConnected => connection != null && connection!.status == ConnectionStatus.active;
  bool get isConfigured => isIntegrationConfigured(entry.slug);
  bool get isVerified => isIntegrationVerified(entry.slug);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Build the icon widget
    Widget iconWidget = entry.logoUrl != null
        ? ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              entry.logoUrl!,
              errorBuilder: (_, __, ___) => Icon(
                entry.icon,
                color: isConfigured ? entry.color : theme.colorScheme.onSurfaceVariant,
                size: 28,
              ),
            ),
          )
        : Icon(
            entry.icon,
            color: isConfigured ? entry.color : theme.colorScheme.onSurfaceVariant,
            size: 28,
          );

    // Apply grayscale filter for unconfigured
    if (!isConfigured) {
      iconWidget = ColorFiltered(
        colorFilter: const ColorFilter.matrix(<double>[
          0.2126, 0.7152, 0.0722, 0, 0,
          0.2126, 0.7152, 0.0722, 0, 0,
          0.2126, 0.7152, 0.0722, 0, 0,
          0, 0, 0, 1, 0,
        ]),
        child: iconWidget,
      );
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      // Add dashed border for unconfigured integrations
      shape: isConfigured
          ? null
          : RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(
                color: theme.colorScheme.outline.withValues(alpha: 0.3),
                style: BorderStyle.solid,
              ),
            ),
      child: Opacity(
        opacity: isConfigured ? 1.0 : 0.6,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top row: Icon + Name + Badge (top right)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Icon
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: isConfigured
                          ? entry.color.withValues(alpha: 0.1)
                          : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: iconWidget,
                  ),
                  const SizedBox(width: 12),
                  // Name
                  Expanded(
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            entry.name,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: isConfigured ? null : theme.colorScheme.onSurfaceVariant,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isVerified && isConfigured) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.verified, size: 16, color: Colors.blue),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Badge (top right)
                  if (isConnected)
                    _ConnectedBadge()
                  else if (!isConfigured && isVerified)
                    _VerifiedBadge()
                  else if (!isConfigured)
                    _ComingSoonBadge(),
                ],
              ),
              const SizedBox(height: 8),
              // Description
              Text(
                entry.description ?? entry.category.label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: isConfigured
                      ? theme.colorScheme.onSurfaceVariant
                      : theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              // Connected email
              if (isConnected && connection?.externalEmail != null) ...[
                const SizedBox(height: 4),
                Text(
                  connection!.externalEmail!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              // Category badges
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  Opacity(
                    opacity: isConfigured ? 1.0 : 0.5,
                    child: _CategoryBadge(category: entry.category),
                  ),
                  Opacity(
                    opacity: isConfigured ? 1.0 : 0.5,
                    child: _PricingBadge(pricingType: entry.pricingType),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Bottom row: Actions
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (isConnected && onDisconnect != null) ...[
                    // Open button
                    FilledButton.tonal(
                      onPressed: onConnect, // onConnect acts as onOpen for connected
                      child: Text('apps.open'.tr()),
                    ),
                    const SizedBox(width: 8),
                    // Disconnect button
                    IconButton.outlined(
                      onPressed: onDisconnect,
                      icon: const Icon(Icons.logout, size: 20),
                    ),
                  ] else if (isConfigured)
                    FilledButton(
                      onPressed: onConnect,
                      child: Text('apps.connect'.tr()),
                    )
                  else
                    OutlinedButton(
                      onPressed: null, // Disabled
                      child: Text(
                        'apps.not_available'.tr(),
                        style: TextStyle(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Connected badge widget
class _ConnectedBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.green.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check_circle, size: 14, color: Colors.green),
          const SizedBox(width: 4),
          Text(
            'apps.connected'.tr(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Colors.green,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}

/// Verified badge widget for verified OAuth integrations that need credentials configured
class _VerifiedBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    const verifiedColor = Color(0xFF6366F1); // Indigo/purple color
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: verifiedColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.verified, size: 14, color: verifiedColor),
          const SizedBox(width: 4),
          Text(
            'apps.verified'.tr(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: verifiedColor,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}

/// Coming Soon badge widget for unconfigured integrations
class _ComingSoonBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.3),
        ),
      ),
      child: Text(
        'apps.coming_soon'.tr(),
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

/// Category badge
class _CategoryBadge extends StatelessWidget {
  final IntegrationCategoryType category;

  const _CategoryBadge({required this.category});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: category.color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(category.icon, size: 12, color: category.color),
          const SizedBox(width: 4),
          Text(
            category.label,
            style: TextStyle(
              fontSize: 10,
              color: category.color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

/// Pricing badge
class _PricingBadge extends StatelessWidget {
  final IntegrationPricingType pricingType;

  const _PricingBadge({required this.pricingType});

  @override
  Widget build(BuildContext context) {
    final color = pricingType == IntegrationPricingType.free
        ? Colors.green
        : pricingType == IntegrationPricingType.freemium
            ? Colors.orange
            : Colors.blue;

    final label = pricingType == IntegrationPricingType.free
        ? 'Free'
        : pricingType == IntegrationPricingType.freemium
            ? 'Freemium'
            : 'Paid';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

/// Gmail card with multiple accounts support
class _GmailCard extends StatelessWidget {
  final List<EmailConnection> accounts;
  final bool isConnecting;
  final String? disconnectingAccountId;
  final VoidCallback onConnect;
  final VoidCallback onOpenEmail;
  final Function(EmailConnection) onDisconnect;

  const _GmailCard({
    required this.accounts,
    required this.isConnecting,
    this.disconnectingAccountId,
    required this.onConnect,
    required this.onOpenEmail,
    required this.onDisconnect,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top row: Icon + Name + Badge (top right)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const _GmailLogo(),
                    ),
                    const SizedBox(width: 12),
                    // Name
                    Expanded(
                      child: Text(
                        'Gmail',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    // Badge and count (top right)
                    _ConnectedBadge(),
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${accounts.length}',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Description
                Text(
                  'apps.gmail.description'.tr(),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // Account list
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: accounts.map((account) {
                final isDisconnecting = disconnectingAccountId == account.id;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                        backgroundImage: account.profilePicture != null
                            ? NetworkImage(account.profilePicture!)
                            : null,
                        child: account.profilePicture == null
                            ? Text(
                                account.emailAddress.isNotEmpty
                                    ? account.emailAddress[0].toUpperCase()
                                    : 'G',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                                ),
                              )
                            : null,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          account.emailAddress,
                          style: Theme.of(context).textTheme.bodyMedium,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        onPressed: isDisconnecting ? null : () => onDisconnect(account),
                        icon: isDisconnecting
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Icon(
                                Icons.close,
                                size: 18,
                                color: Theme.of(context).colorScheme.error,
                              ),
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: onOpenEmail,
                    icon: const Icon(Icons.email, size: 18),
                    label: Text('apps.gmail.open_email'.tr()),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: isConnecting ? null : onConnect,
                  icon: isConnecting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.add, size: 18),
                  label: Text('apps.gmail.add_account'.tr()),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================
// Logo Widgets
// ============================================

class _GoogleDriveLogo extends StatelessWidget {
  const _GoogleDriveLogo();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(32, 32),
      painter: _GoogleDriveLogoPainter(),
    );
  }
}

class _GoogleDriveLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double scale = size.width / 87.3;

    final bluePath = Path();
    bluePath.moveTo(6.6 * scale, 66.85 * scale * (size.height / 78));
    bluePath.lineTo(15.9 * scale, 78 * scale * (size.height / 78));
    bluePath.lineTo(71.4 * scale, 78 * scale * (size.height / 78));
    bluePath.lineTo(80.7 * scale, 66.85 * scale * (size.height / 78));
    bluePath.close();
    canvas.drawPath(bluePath, Paint()..color = const Color(0xFF0066DA));

    final greenPath = Path();
    greenPath.moveTo(57.6 * scale, 0);
    greenPath.lineTo(29.4 * scale, 0);
    greenPath.lineTo(0, 48.1 * scale * (size.height / 78));
    greenPath.lineTo(14.8 * scale, 67 * scale * (size.height / 78));
    greenPath.lineTo(43.6 * scale, 18.8 * scale * (size.height / 78));
    greenPath.close();
    canvas.drawPath(greenPath, Paint()..color = const Color(0xFF00AC47));

    final redPath = Path();
    redPath.moveTo(29.4 * scale, 0);
    redPath.lineTo(57.6 * scale, 0);
    redPath.lineTo(87.3 * scale, 48.1 * scale * (size.height / 78));
    redPath.lineTo(29.1 * scale, 48.1 * scale * (size.height / 78));
    redPath.close();
    canvas.drawPath(redPath, Paint()..color = const Color(0xFFEA4335));

    final darkGreenPath = Path();
    darkGreenPath.moveTo(29.1 * scale, 48.1 * scale * (size.height / 78));
    darkGreenPath.lineTo(87.3 * scale, 48.1 * scale * (size.height / 78));
    darkGreenPath.lineTo(78.1 * scale, 67 * scale * (size.height / 78));
    darkGreenPath.lineTo(14.8 * scale, 67 * scale * (size.height / 78));
    darkGreenPath.close();
    canvas.drawPath(darkGreenPath, Paint()..color = const Color(0xFF00832D));

    final lightBluePath = Path();
    lightBluePath.moveTo(57.6 * scale, 0);
    lightBluePath.lineTo(29.1 * scale, 48.1 * scale * (size.height / 78));
    lightBluePath.lineTo(87.3 * scale, 48.1 * scale * (size.height / 78));
    lightBluePath.close();
    canvas.drawPath(lightBluePath, Paint()..color = const Color(0xFF2684FC));

    final yellowPath = Path();
    yellowPath.moveTo(0, 48.1 * scale * (size.height / 78));
    yellowPath.lineTo(14.8 * scale, 67 * scale * (size.height / 78));
    yellowPath.lineTo(29.1 * scale, 48.1 * scale * (size.height / 78));
    yellowPath.close();
    canvas.drawPath(yellowPath, Paint()..color = const Color(0xFFFFBA00));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _GoogleCalendarLogo extends StatelessWidget {
  const _GoogleCalendarLogo();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(32, 32),
      painter: _GoogleCalendarLogoPainter(),
    );
  }
}

class _GoogleCalendarLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    final bgPaint = Paint()..color = Colors.white;
    final bgRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, w, h),
      Radius.circular(w * 0.15),
    );
    canvas.drawRRect(bgRect, bgPaint);

    final borderPaint = Paint()
      ..color = const Color(0xFFE0E0E0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    canvas.drawRRect(bgRect, borderPaint);

    const blueColor = Color(0xFF4285F4);
    const greenColor = Color(0xFF34A853);
    const yellowColor = Color(0xFFFBBC05);
    const redColor = Color(0xFFEA4335);

    final linePaint = Paint()
      ..color = const Color(0xFFBDBDBD)
      ..strokeWidth = 1;

    canvas.drawLine(Offset(w * 0.2, h * 0.35), Offset(w * 0.8, h * 0.35), linePaint);
    canvas.drawLine(Offset(w * 0.2, h * 0.55), Offset(w * 0.8, h * 0.55), linePaint);
    canvas.drawLine(Offset(w * 0.2, h * 0.75), Offset(w * 0.8, h * 0.75), linePaint);
    canvas.drawLine(Offset(w * 0.4, h * 0.25), Offset(w * 0.4, h * 0.85), linePaint);
    canvas.drawLine(Offset(w * 0.6, h * 0.25), Offset(w * 0.6, h * 0.85), linePaint);

    final topBarPaint = Paint()..color = blueColor;
    canvas.drawRRect(
      RRect.fromRectAndCorners(
        Rect.fromLTWH(0, 0, w, h * 0.2),
        topLeft: Radius.circular(w * 0.15),
        topRight: Radius.circular(w * 0.15),
      ),
      topBarPaint,
    );

    final dotRadius = w * 0.06;
    canvas.drawCircle(Offset(w * 0.3, h * 0.45), dotRadius, Paint()..color = blueColor);
    canvas.drawCircle(Offset(w * 0.5, h * 0.65), dotRadius, Paint()..color = greenColor);
    canvas.drawCircle(Offset(w * 0.7, h * 0.45), dotRadius, Paint()..color = yellowColor);
    canvas.drawCircle(Offset(w * 0.5, h * 0.45), dotRadius, Paint()..color = redColor);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _GitHubLogo extends StatelessWidget {
  const _GitHubLogo();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Icon(
      Icons.code,
      size: 28,
      color: isDark ? Colors.white : const Color(0xFF24292E),
    );
  }
}

class _DropboxLogo extends StatelessWidget {
  const _DropboxLogo();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(32, 32),
      painter: _DropboxLogoPainter(),
    );
  }
}

class _DropboxLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0xFF0061FF);

    final double w = size.width;
    final double h = size.height;

    // Dropbox logo consists of 4 diamond shapes
    // Top diamond
    final path1 = Path()
      ..moveTo(w * 0.5, h * 0.05)
      ..lineTo(w * 0.25, h * 0.25)
      ..lineTo(w * 0.5, h * 0.45)
      ..lineTo(w * 0.75, h * 0.25)
      ..close();

    // Left diamond
    final path2 = Path()
      ..moveTo(w * 0.05, h * 0.4)
      ..lineTo(w * 0.25, h * 0.25)
      ..lineTo(w * 0.5, h * 0.45)
      ..lineTo(w * 0.25, h * 0.65)
      ..close();

    // Right diamond
    final path3 = Path()
      ..moveTo(w * 0.95, h * 0.4)
      ..lineTo(w * 0.75, h * 0.25)
      ..lineTo(w * 0.5, h * 0.45)
      ..lineTo(w * 0.75, h * 0.65)
      ..close();

    // Bottom diamond
    final path4 = Path()
      ..moveTo(w * 0.5, h * 0.85)
      ..lineTo(w * 0.25, h * 0.65)
      ..lineTo(w * 0.5, h * 0.45)
      ..lineTo(w * 0.75, h * 0.65)
      ..close();

    canvas.drawPath(path1, paint);
    canvas.drawPath(path2, paint);
    canvas.drawPath(path3, paint);
    canvas.drawPath(path4, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Slack logo widget
class _SlackLogo extends StatelessWidget {
  const _SlackLogo();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(32, 32),
      painter: _SlackLogoPainter(),
    );
  }
}

class _SlackLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;
    final unit = w / 5;

    // Colors
    const blue = Color(0xFF36C5F0);
    const green = Color(0xFF2EB67D);
    const yellow = Color(0xFFECB22E);
    const red = Color(0xFFE01E5A);

    final paint = Paint()..style = PaintingStyle.fill;

    // Top left (blue)
    paint.color = blue;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(0, unit, unit, unit * 2),
        Radius.circular(unit / 2),
      ),
      paint,
    );
    canvas.drawCircle(Offset(unit / 2, unit / 2), unit / 2, paint);

    // Top right (green)
    paint.color = green;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(unit * 2, 0, unit * 2, unit),
        Radius.circular(unit / 2),
      ),
      paint,
    );
    canvas.drawCircle(Offset(w - unit / 2, unit * 1.5), unit / 2, paint);

    // Bottom left (yellow)
    paint.color = yellow;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(unit, h - unit * 3, unit, unit * 2),
        Radius.circular(unit / 2),
      ),
      paint,
    );
    canvas.drawCircle(Offset(unit / 2, h - unit * 1.5), unit / 2, paint);

    // Bottom right (red)
    paint.color = red;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(unit * 2, h - unit, unit * 2, unit),
        Radius.circular(unit / 2),
      ),
      paint,
    );
    canvas.drawCircle(Offset(w - unit / 2, h - unit / 2), unit / 2, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Twitter/X logo widget
class _TwitterLogo extends StatelessWidget {
  const _TwitterLogo();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(32, 32),
      painter: _TwitterLogoPainter(),
    );
  }
}

class _TwitterLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // X logo (simplified)
    final paint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.12
      ..strokeCap = StrokeCap.round;

    final padding = size.width * 0.15;

    // Draw X
    canvas.drawLine(
      Offset(padding, padding),
      Offset(size.width - padding, size.height - padding),
      paint,
    );
    canvas.drawLine(
      Offset(size.width - padding, padding),
      Offset(padding, size.height - padding),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _GmailLogo extends StatelessWidget {
  const _GmailLogo();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(32, 32),
      painter: _GmailLogoPainter(),
    );
  }
}

class _GmailLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    final bgPaint = Paint()..color = Colors.white;
    final bgRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, h * 0.15, w, h * 0.7),
      Radius.circular(w * 0.08),
    );
    canvas.drawRRect(bgRect, bgPaint);

    final borderPaint = Paint()
      ..color = const Color(0xFFE0E0E0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    canvas.drawRRect(bgRect, borderPaint);

    final mPath = Path();
    mPath.moveTo(0, h * 0.2);
    mPath.lineTo(w * 0.5, h * 0.55);
    mPath.lineTo(w, h * 0.2);

    final mPaint = Paint()
      ..color = const Color(0xFFEA4335)
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.12
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(mPath, mPaint);

    canvas.drawLine(
      Offset(0, h * 0.2),
      Offset(0, h * 0.8),
      Paint()
        ..color = const Color(0xFF4285F4)
        ..strokeWidth = w * 0.12
        ..strokeCap = StrokeCap.round,
    );

    canvas.drawLine(
      Offset(w, h * 0.2),
      Offset(w, h * 0.8),
      Paint()
        ..color = const Color(0xFF34A853)
        ..strokeWidth = w * 0.12
        ..strokeCap = StrokeCap.round,
    );

    canvas.drawLine(
      Offset(0, h * 0.8),
      Offset(w, h * 0.8),
      Paint()
        ..color = const Color(0xFFFBBC05)
        ..strokeWidth = w * 0.12
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _GoogleSheetsLogo extends StatelessWidget {
  const _GoogleSheetsLogo();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(32, 32),
      painter: _GoogleSheetsLogoPainter(),
    );
  }
}

class _GoogleSheetsLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    const greenColor = Color(0xFF0F9D58);
    const lightGreenColor = Color(0xFF57BB8A);
    const whiteColor = Colors.white;

    final bgPaint = Paint()..color = greenColor;
    final bgPath = Path();
    bgPath.moveTo(w * 0.15, 0);
    bgPath.lineTo(w * 0.65, 0);
    bgPath.lineTo(w * 0.85, h * 0.2);
    bgPath.lineTo(w * 0.85, h);
    bgPath.lineTo(w * 0.15, h);
    bgPath.close();
    canvas.drawPath(bgPath, bgPaint);

    final cornerPath = Path();
    cornerPath.moveTo(w * 0.65, 0);
    cornerPath.lineTo(w * 0.65, h * 0.2);
    cornerPath.lineTo(w * 0.85, h * 0.2);
    cornerPath.close();
    canvas.drawPath(cornerPath, Paint()..color = lightGreenColor);

    final linePaint = Paint()
      ..color = whiteColor.withValues(alpha: 0.8)
      ..strokeWidth = 1.5;

    canvas.drawLine(Offset(w * 0.25, h * 0.35), Offset(w * 0.75, h * 0.35), linePaint);
    canvas.drawLine(Offset(w * 0.25, h * 0.5), Offset(w * 0.75, h * 0.5), linePaint);
    canvas.drawLine(Offset(w * 0.25, h * 0.65), Offset(w * 0.75, h * 0.65), linePaint);
    canvas.drawLine(Offset(w * 0.25, h * 0.8), Offset(w * 0.75, h * 0.8), linePaint);
    canvas.drawLine(Offset(w * 0.4, h * 0.35), Offset(w * 0.4, h * 0.8), linePaint);
    canvas.drawLine(Offset(w * 0.55, h * 0.35), Offset(w * 0.55, h * 0.8), linePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Metadata for legacy services used in filtering
class _LegacyServiceInfo {
  final String name;
  final String description;
  final IntegrationCategoryType category;

  const _LegacyServiceInfo({
    required this.name,
    required this.description,
    required this.category,
  });
}
