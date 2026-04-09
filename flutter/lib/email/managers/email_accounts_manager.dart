import 'package:flutter/foundation.dart';
import '../../api/services/email_api_service.dart';
import '../models/email_account_state.dart';

/// Special ID for the "All Mail" virtual account
const String allMailAccountId = '__all_mail__';

/// Manages multiple email accounts with unlimited accounts support
/// Supports multiple Gmail accounts and multiple SMTP/IMAP accounts
class EmailAccountsManager extends ChangeNotifier {
  final EmailApiService _emailService;
  final String workspaceId;

  /// Dynamic list of all account states
  List<EmailAccountState> _accounts = [];

  /// Currently selected tab index (0 = All Mail when multiple accounts)
  int _selectedTabIndex = 0;

  /// Whether All Mail mode is active
  bool _isAllMailMode = false;

  /// All Mail combined state (virtual account)
  EmailAccountState? _allMailState;

  /// Initialization state
  bool _isInitializing = true;
  String? _errorMessage;

  EmailAccountsManager({
    EmailApiService? emailService,
    required this.workspaceId,
  }) : _emailService = emailService ?? EmailApiService();

  // Getters
  List<EmailAccountState> get accounts => List.unmodifiable(_accounts);
  int get selectedTabIndex => _selectedTabIndex;
  bool get isInitializing => _isInitializing;
  String? get errorMessage => _errorMessage;
  bool get isAllMailMode => _isAllMailMode;

  /// Get list of connected accounts (accounts with active connections)
  List<EmailAccountState> get connectedAccounts =>
      _accounts.where((a) => a.isConnected).toList();

  /// Whether any account is connected
  bool get hasConnectedAccount => connectedAccounts.isNotEmpty;

  /// Whether to show All Mail tab (when 2+ accounts connected)
  bool get showAllMailTab => connectedAccounts.length >= 2;

  /// Get All Mail state (combined emails from all accounts)
  EmailAccountState? get allMailState => _allMailState;

  /// Current active account based on tab selection
  /// Returns allMailState when in All Mail mode, otherwise the selected account
  EmailAccountState? get currentAccount {
    if (connectedAccounts.isEmpty) return null;

    // In All Mail mode, return the virtual All Mail account
    if (_isAllMailMode && _allMailState != null) {
      return _allMailState;
    }

    // Adjust index for All Mail tab offset
    final accountIndex = showAllMailTab ? _selectedTabIndex - 1 : _selectedTabIndex;
    if (accountIndex < 0) {
      // All Mail tab is selected
      return _allMailState;
    }

    final safeIndex = accountIndex.clamp(0, connectedAccounts.length - 1);
    return connectedAccounts[safeIndex];
  }

  /// Get the actual account index (without All Mail offset)
  int get actualAccountIndex {
    if (showAllMailTab) {
      return _selectedTabIndex - 1;
    }
    return _selectedTabIndex;
  }

  /// Get account by ID
  EmailAccountState? getAccountById(String id) {
    try {
      return _accounts.firstWhere((a) => a.id == id);
    } catch (_) {
      return null;
    }
  }

  /// Get account index by ID
  int getAccountIndex(String id) {
    return connectedAccounts.indexWhere((a) => a.id == id);
  }

  /// Initialize by checking all connections
  Future<void> initialize() async {
    if (workspaceId.isEmpty) {
      _errorMessage = 'No workspace selected';
      _isInitializing = false;
      notifyListeners();
      return;
    }

    _isInitializing = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _emailService.getAllConnections(workspaceId);

      if (response.success && response.data != null) {
        final allConnections = response.data!;
        _accounts = [];

        // Use the allAccounts array if available (new multi-account format)
        if (allConnections.allAccounts.isNotEmpty) {
          for (final connection in allConnections.allAccounts) {
            _accounts.add(EmailAccountState.fromConnection(connection));
          }
        } else {
          // Fallback to legacy single account format
          // Add Gmail connection if exists
          if (allConnections.gmail != null) {
            _accounts.add(EmailAccountState.fromConnection(allConnections.gmail!));
          }

          // Add SMTP/IMAP connection if exists
          if (allConnections.smtpImap != null) {
            _accounts.add(EmailAccountState.fromConnection(allConnections.smtpImap!));
          }
        }

        // Ensure tab index is valid
        if (connectedAccounts.isNotEmpty) {
          _selectedTabIndex = _selectedTabIndex.clamp(0, connectedAccounts.length - 1);
        }

        _isInitializing = false;
        notifyListeners();

        // Fetch labels and emails for connected accounts
        await _fetchDataForConnectedAccounts();
      } else {
        // Try legacy endpoint
        await _checkLegacyConnection();
      }
    } catch (e) {
      await _checkLegacyConnection();
    }
  }

  /// Fallback for older backend versions
  Future<void> _checkLegacyConnection() async {
    try {
      final response = await _emailService.getConnection(workspaceId);
      if (response.success && response.data != null) {
        final data = response.data!;
        final connected = data['connected'] ?? false;

        if (connected && data['data'] != null) {
          final connection = EmailConnection.fromJson(data['data']);
          _accounts = [EmailAccountState.fromConnection(connection)];
        } else {
          _accounts = [];
        }
      }

      _isInitializing = false;
      notifyListeners();

      if (hasConnectedAccount) {
        await _fetchDataForConnectedAccounts();
      }
    } catch (e) {
      _errorMessage = e.toString();
      _isInitializing = false;
      notifyListeners();
    }
  }

  /// Fetch labels and emails for all connected accounts
  Future<void> _fetchDataForConnectedAccounts() async {
    final futures = <Future>[];

    for (final account in connectedAccounts) {
      futures.add(fetchLabels(account.id));
      futures.add(fetchEmails(account.id));
    }

    await Future.wait(futures);
  }

  /// Update an account in the list
  void _updateAccount(String accountId, EmailAccountState Function(EmailAccountState) update) {
    final index = _accounts.indexWhere((a) => a.id == accountId);
    if (index >= 0) {
      _accounts[index] = update(_accounts[index]);
      notifyListeners();
    }
  }

  /// Switch to a specific tab
  /// When showAllMailTab is true, index 0 = All Mail, index 1+ = individual accounts
  void switchTab(int index) {
    final maxIndex = showAllMailTab
        ? connectedAccounts.length // +1 for All Mail tab, but 0-indexed so same as length
        : connectedAccounts.length - 1;

    if (index >= 0 && index <= maxIndex) {
      _selectedTabIndex = index;

      // Check if All Mail mode
      if (showAllMailTab && index == 0) {
        _isAllMailMode = true;
        _buildAllMailState();
      } else {
        _isAllMailMode = false;
      }

      notifyListeners();
    }
  }

  /// Build the combined All Mail state from all connected accounts
  void _buildAllMailState() {
    final allEmails = <EmailListItem>[];
    final allPriorities = <String, EmailPriority>{};
    final allLabels = <EmailLabel>[];

    // Collect emails and priorities from all connected accounts
    for (final account in connectedAccounts) {
      final emails = account.emailsData?.emails ?? [];
      for (final email in emails) {
        // Add provider info to distinguish emails
        allEmails.add(email);
      }

      // Merge priorities
      allPriorities.addAll(account.emailPriorities);

      // Merge labels (unique by id)
      for (final label in account.labels) {
        if (!allLabels.any((l) => l.id == label.id)) {
          allLabels.add(label);
        }
      }
    }

    // Sort emails by date (newest first)
    allEmails.sort((a, b) {
      final dateA = DateTime.tryParse(a.date ?? '') ?? DateTime(1970);
      final dateB = DateTime.tryParse(b.date ?? '') ?? DateTime(1970);
      return dateB.compareTo(dateA);
    });

    // Create combined email response
    final combinedEmailsData = EmailListResponse(
      emails: allEmails,
      nextPageToken: null,
      resultSizeEstimate: allEmails.length,
    );

    // Create the virtual All Mail state
    _allMailState = EmailAccountState(
      id: allMailAccountId,
      provider: 'all_mail',
      labels: allLabels,
      emailsData: combinedEmailsData,
      currentLabel: 'INBOX',
      emailPriorities: allPriorities,
    );
  }

  /// Refresh All Mail state after emails are fetched
  void refreshAllMailState() {
    if (_isAllMailMode) {
      _buildAllMailState();
      notifyListeners();
    }
  }

  /// Switch to account by ID
  void switchToAccount(String accountId) {
    // Special handling for All Mail
    if (accountId == allMailAccountId) {
      if (showAllMailTab) {
        switchTab(0);
      }
      return;
    }

    final accountIndex = connectedAccounts.indexWhere((a) => a.id == accountId);
    if (accountIndex >= 0) {
      // Adjust for All Mail tab offset
      final tabIndex = showAllMailTab ? accountIndex + 1 : accountIndex;
      switchTab(tabIndex);
    }
  }

  /// Switch to All Mail mode
  void switchToAllMail() {
    if (showAllMailTab) {
      switchTab(0);
    }
  }

  /// Fetch labels for a specific account by ID
  Future<void> fetchLabels(String accountId) async {
    final account = getAccountById(accountId);
    if (account == null) return;

    try {
      // Pass connectionId to get labels for this specific account
      final response = account.provider == 'smtp_imap'
          ? await _emailService.getSmtpImapLabels(workspaceId, connectionId: accountId)
          : await _emailService.getLabels(workspaceId, connectionId: accountId);

      if (response.success && response.data != null) {
        _updateAccount(accountId, (a) => a.copyWith(labels: response.data));
      }
    } catch (e) {
      debugPrint('Error fetching labels for account $accountId: $e');
    }
  }

  /// Fetch emails for a specific account by ID
  Future<void> fetchEmails(String accountId) async {
    final account = getAccountById(accountId);
    if (account == null) return;

    // Update loading state
    _updateAccount(accountId, (a) => a.copyWith(isLoadingEmails: true));

    try {
      // Pass connectionId to filter emails by this specific account
      final response = account.provider == 'smtp_imap'
          ? await _emailService.getSmtpImapMessages(
              workspaceId,
              labelId: account.currentLabel,
              query: account.activeSearch.isNotEmpty ? account.activeSearch : null,
              connectionId: accountId, // Filter by this account
            )
          : await _emailService.getMessages(
              workspaceId,
              labelId: account.currentLabel,
              query: account.activeSearch.isNotEmpty ? account.activeSearch : null,
              connectionId: accountId, // Filter by this account
            );

      if (response.success && response.data != null) {
        _updateAccount(accountId, (a) => a.copyWith(
          emailsData: response.data,
          isLoadingEmails: false,
        ));

        // Fetch stored priorities from backend (synced from frontend/other devices)
        await fetchStoredPriorities(accountId);

        // Refresh All Mail state if active
        refreshAllMailState();
      } else {
        _updateAccount(accountId, (a) => a.copyWith(isLoadingEmails: false));
      }
    } catch (e) {
      _updateAccount(accountId, (a) => a.copyWith(isLoadingEmails: false));
    }
  }

  /// Load more emails for pagination (infinite scroll)
  /// Matching frontend behavior with useInfiniteQuery
  Future<void> loadMoreEmails(String accountId) async {
    final account = getAccountById(accountId);
    if (account == null) return;

    // Check if there's a next page
    final nextPageToken = account.emailsData?.nextPageToken;
    if (nextPageToken == null || nextPageToken.isEmpty) {
      debugPrint('📧 No more emails to load for account $accountId');
      return;
    }

    // Prevent duplicate requests
    if (account.isFetchingNextPage) {
      debugPrint('📧 Already fetching next page for account $accountId');
      return;
    }

    // Set loading state
    _updateAccount(accountId, (a) => a.copyWith(isFetchingNextPage: true));

    try {
      // Fetch next page with pageToken
      final response = account.provider == 'smtp_imap'
          ? await _emailService.getSmtpImapMessages(
              workspaceId,
              labelId: account.currentLabel,
              query: account.activeSearch.isNotEmpty ? account.activeSearch : null,
              connectionId: accountId,
              pageToken: nextPageToken,
            )
          : await _emailService.getMessages(
              workspaceId,
              labelId: account.currentLabel,
              query: account.activeSearch.isNotEmpty ? account.activeSearch : null,
              connectionId: accountId,
              pageToken: nextPageToken,
            );

      if (response.success && response.data != null) {
        // Append new emails to existing list
        final existingEmails = account.emailsData?.emails ?? [];
        final newEmails = response.data!.emails;
        final combinedEmails = [...existingEmails, ...newEmails];

        // Create updated email response with new nextPageToken
        final updatedEmailsData = EmailListResponse(
          emails: combinedEmails,
          nextPageToken: response.data!.nextPageToken,
          resultSizeEstimate: response.data!.resultSizeEstimate,
        );

        _updateAccount(accountId, (a) => a.copyWith(
          emailsData: updatedEmailsData,
          isFetchingNextPage: false,
        ));

        debugPrint('📧 Loaded ${newEmails.length} more emails for account $accountId (total: ${combinedEmails.length})');

        // Refresh All Mail state if active
        refreshAllMailState();
      } else {
        _updateAccount(accountId, (a) => a.copyWith(isFetchingNextPage: false));
      }
    } catch (e) {
      debugPrint('❌ Error loading more emails: $e');
      _updateAccount(accountId, (a) => a.copyWith(isFetchingNextPage: false));
    }
  }

  /// Fetch emails from all connected accounts (for All Mail mode)
  Future<void> fetchAllMailEmails() async {
    // Fetch emails from all connected accounts in parallel
    final futures = connectedAccounts.map((account) => fetchEmails(account.id));
    await Future.wait(futures);

    // Build combined All Mail state
    _buildAllMailState();
    notifyListeners();
  }

  /// Fetch a single email
  Future<void> fetchEmail(String accountId, String messageId) async {
    final account = getAccountById(accountId);
    if (account == null) return;

    // Update loading state
    _updateAccount(accountId, (a) => a.copyWith(
      isLoadingEmail: true,
      selectedMessageId: messageId,
    ));

    try {
      // Pass connectionId to get email from the specific account
      final response = account.provider == 'smtp_imap'
          ? await _emailService.getSmtpImapMessage(workspaceId, messageId, connectionId: accountId)
          : await _emailService.getMessage(workspaceId, messageId, connectionId: accountId);

      if (response.success && response.data != null) {
        _updateAccount(accountId, (a) => a.copyWith(
          selectedEmail: response.data,
          isLoadingEmail: false,
        ));

        // Mark as read if not already
        if (!response.data!.isRead) {
          if (account.provider == 'smtp_imap') {
            await _emailService.markSmtpImapAsRead(workspaceId, messageId, true, connectionId: accountId);
          } else {
            await _emailService.markAsRead(workspaceId, messageId, true, connectionId: accountId);
          }
        }
      } else {
        _updateAccount(accountId, (a) => a.copyWith(isLoadingEmail: false));
      }
    } catch (e) {
      _updateAccount(accountId, (a) => a.copyWith(isLoadingEmail: false));
    }
  }

  /// Clear selected email for an account
  void clearSelectedEmail(String accountId) {
    _updateAccount(accountId, (a) => a.copyWith(
      clearSelectedEmail: true,
      clearSelectedMessageId: true,
    ));
  }

  /// Change folder/label for an account
  void changeFolder(String accountId, String labelId) {
    _updateAccount(accountId, (a) => a.copyWith(
      currentLabel: labelId,
      clearSelectedEmail: true,
      clearSelectedMessageId: true,
      activeSearch: '',
      searchQuery: '',
    ));
    fetchEmails(accountId);
  }

  /// Update search query for an account
  void updateSearchQuery(String accountId, String query) {
    _updateAccount(accountId, (a) => a.copyWith(searchQuery: query));
  }

  /// Submit search for an account
  void submitSearch(String accountId) {
    final account = getAccountById(accountId);
    if (account == null) return;

    _updateAccount(accountId, (a) => a.copyWith(activeSearch: account.searchQuery));
    fetchEmails(accountId);
  }

  /// Clear search for an account
  void clearSearch(String accountId) {
    _updateAccount(accountId, (a) => a.copyWith(searchQuery: '', activeSearch: ''));
    fetchEmails(accountId);
  }

  /// Star/unstar an email
  Future<void> starEmail(String accountId, String messageId, bool isCurrentlyStarred) async {
    final account = getAccountById(accountId);
    if (account == null) return;

    try {
      // Pass connectionId to operate on the specific account
      if (account.provider == 'smtp_imap') {
        await _emailService.starSmtpImapEmail(workspaceId, messageId, !isCurrentlyStarred, connectionId: accountId);
      } else {
        await _emailService.starEmail(workspaceId, messageId, !isCurrentlyStarred, connectionId: accountId);
      }
      await fetchEmails(accountId);

      // Refresh selected email if it's the one being starred
      if (account.selectedEmail?.id == messageId) {
        await fetchEmail(accountId, messageId);
      }
    } catch (e) {
      debugPrint('Error starring email: $e');
      rethrow;
    }
  }

  /// Delete an email
  Future<void> deleteEmail(String accountId, String messageId) async {
    final account = getAccountById(accountId);
    if (account == null) return;

    try {
      // Pass connectionId to operate on the specific account
      if (account.provider == 'smtp_imap') {
        await _emailService.deleteSmtpImapEmail(workspaceId, messageId, connectionId: accountId);
      } else {
        await _emailService.deleteEmail(workspaceId, messageId, connectionId: accountId);
      }

      // Clear selected if it was the deleted email
      if (account.selectedMessageId == messageId) {
        clearSelectedEmail(accountId);
      }

      await fetchEmails(accountId);
    } catch (e) {
      debugPrint('Error deleting email: $e');
      rethrow;
    }
  }

  /// Disconnect an account by ID
  Future<void> disconnect(String accountId) async {
    final account = getAccountById(accountId);
    if (account == null) return;

    try {
      if (account.provider == 'smtp_imap') {
        await _emailService.disconnectSmtpImap(workspaceId);
      } else {
        await _emailService.disconnect(workspaceId);
      }

      // Remove the account from the list
      _accounts.removeWhere((a) => a.id == accountId);

      // Adjust tab index if needed
      if (connectedAccounts.isNotEmpty) {
        _selectedTabIndex = _selectedTabIndex.clamp(0, connectedAccounts.length - 1);
      } else {
        _selectedTabIndex = 0;
      }

      notifyListeners();
    } catch (e) {
      debugPrint('Error disconnecting: $e');
      rethrow;
    }
  }

  /// Add a new account after OAuth or SMTP/IMAP connection
  Future<void> addAccount(EmailConnection connection) async {
    // Check if account already exists
    final existingIndex = _accounts.indexWhere((a) => a.id == connection.id);
    if (existingIndex >= 0) {
      // Update existing account
      _accounts[existingIndex] = EmailAccountState.fromConnection(connection);
    } else {
      // Add new account
      _accounts.add(EmailAccountState.fromConnection(connection));
    }

    notifyListeners();

    // Fetch data for the new account
    await fetchLabels(connection.id);
    await fetchEmails(connection.id);

    // Switch to the new account
    switchToAccount(connection.id);
  }

  /// Called after OAuth completes to refresh connections
  Future<void> refreshAfterOAuth() async {
    await initialize();
  }

  /// Called after SMTP/IMAP connection to refresh
  Future<void> refreshAfterSmtpImapConnect() async {
    await initialize();
  }

  /// Get state for a specific account (by ID)
  EmailAccountState? getStateForAccount(String accountId) {
    return getAccountById(accountId);
  }

  // Legacy compatibility methods

  /// Get Gmail state (for backward compatibility)
  /// Returns the first Gmail account or an empty state
  EmailAccountState get gmailState {
    try {
      return _accounts.firstWhere((a) => a.provider == 'gmail');
    } catch (_) {
      return EmailAccountState(id: 'gmail_placeholder', provider: 'gmail');
    }
  }

  /// Get SMTP/IMAP state (for backward compatibility)
  /// Returns the first SMTP/IMAP account or an empty state
  EmailAccountState get smtpImapState {
    try {
      return _accounts.firstWhere((a) => a.provider == 'smtp_imap');
    } catch (_) {
      return EmailAccountState(id: 'smtp_placeholder', provider: 'smtp_imap');
    }
  }

  /// Whether there's at least one Gmail account connected
  bool get hasGmailConnected => _accounts.any((a) => a.provider == 'gmail' && a.isConnected);

  /// Whether there's at least one SMTP/IMAP account connected
  bool get hasSmtpImapConnected => _accounts.any((a) => a.provider == 'smtp_imap' && a.isConnected);

  /// Total number of connected accounts
  int get connectedAccountsCount => connectedAccounts.length;

  /// Whether user can add more accounts (always true - no limit)
  bool get canAddMoreAccounts => true;

  /// @deprecated Use canAddMoreAccounts instead. Kept for backward compatibility.
  bool get hasBothAccountsConnected => false; // Always allow adding more accounts

  /// Get all Gmail accounts
  List<EmailAccountState> get gmailAccounts =>
      _accounts.where((a) => a.provider == 'gmail').toList();

  /// Get all SMTP/IMAP accounts
  List<EmailAccountState> get smtpImapAccounts =>
      _accounts.where((a) => a.provider == 'smtp_imap').toList();

  // ==================== Priority Analysis ====================

  /// Analyze email priorities for an account
  /// Analyzes up to 10 unread emails (or all emails if none unread)
  /// Results are stored in backend for cross-platform sync
  Future<void> analyzePriority(String accountId) async {
    final account = getAccountById(accountId);
    if (account == null) return;

    final emails = account.emailsData?.emails ?? [];
    if (emails.isEmpty) {
      debugPrint('🔍 No emails to analyze for account $accountId');
      return;
    }

    // Set loading state
    _updateAccount(accountId, (a) => a.copyWith(isAnalyzingPriority: true));

    try {
      // Pass connectionId to save results in backend
      final response = await _emailService.analyzePriorityForEmails(
        workspaceId,
        emails,
        connectionId: accountId, // accountId is the connection ID
        maxEmails: 10,
        unreadOnly: true,
      );

      if (response.success && response.data != null) {
        final priorityMap = response.data!.toMap();

        // Merge with existing priorities (keep old ones, add new ones)
        final existingPriorities = Map<String, EmailPriority>.from(account.emailPriorities);
        existingPriorities.addAll(priorityMap);

        _updateAccount(accountId, (a) => a.copyWith(
          emailPriorities: existingPriorities,
          isAnalyzingPriority: false,
        ));

        debugPrint('🔍 Analyzed priorities for ${priorityMap.length} emails');
      } else {
        _updateAccount(accountId, (a) => a.copyWith(isAnalyzingPriority: false));
        debugPrint('❌ Failed to analyze priorities: ${response.message}');
      }
    } catch (e) {
      _updateAccount(accountId, (a) => a.copyWith(isAnalyzingPriority: false));
      debugPrint('❌ Error analyzing priorities: $e');
      rethrow;
    }
  }

  /// Fetch stored priorities from backend for an account
  /// Called automatically when emails are loaded
  Future<void> fetchStoredPriorities(String accountId) async {
    final account = getAccountById(accountId);
    if (account == null) return;

    try {
      final response = await _emailService.getPrioritiesForConnection(
        workspaceId,
        accountId,
      );

      if (response.success && response.data != null) {
        final priorityMap = response.data!.toMap();

        if (priorityMap.isNotEmpty) {
          _updateAccount(accountId, (a) => a.copyWith(
            emailPriorities: priorityMap,
          ));
          debugPrint('🔍 Loaded ${priorityMap.length} stored priorities for account $accountId');
        }
      }
    } catch (e) {
      debugPrint('❌ Error fetching stored priorities: $e');
      // Non-critical, don't throw
    }
  }

  /// Set priority sort mode for an account
  void setPrioritySortMode(String accountId, EmailPrioritySortMode mode) {
    _updateAccount(accountId, (a) => a.copyWith(prioritySortMode: mode));
  }

  /// Clear priorities for an account
  void clearPriorities(String accountId) {
    _updateAccount(accountId, (a) => a.copyWith(
      clearPriorities: true,
      prioritySortMode: EmailPrioritySortMode.none,
    ));
  }

  /// Get priority for a specific email in the current account
  EmailPriority? getPriorityForEmail(String emailId) {
    return currentAccount?.getPriorityForEmail(emailId);
  }
}
