import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api/services/email_api_service.dart';
import '../services/workspace_service.dart';
import '../widgets/deskive_toolbar.dart';
import 'email_connect_widget.dart';
import 'smtp_imap_connect_widget.dart';
import 'email_compose_dialog.dart';
import 'email_settings_dialog.dart';
import 'managers/email_accounts_manager.dart';
import 'models/email_account_state.dart';
import 'widgets/email_account_tabs.dart';
import 'widgets/email_account_view.dart';
import 'widgets/add_account_sheet.dart';
import 'widgets/account_indicator.dart';

enum _ScreenState { loading, noAccounts, smtpImapForm, connected }

class EmailScreen extends StatefulWidget {
  final bool showAppBar;

  const EmailScreen({super.key, this.showAppBar = true});

  @override
  State<EmailScreen> createState() => _EmailScreenState();
}

class _EmailScreenState extends State<EmailScreen>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  final TextEditingController _searchController = TextEditingController();

  late EmailAccountsManager _accountsManager;
  TabController? _tabController;

  _ScreenState _screenState = _ScreenState.loading;
  bool _waitingForOAuth = false;
  bool _isSearching = false;

  /// Track the workspace ID used to initialize the manager
  /// Used to detect when workspace becomes available
  String _initializedWithWorkspaceId = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // Listen to workspace changes to reinitialize when workspace becomes available
    _workspaceService.addListener(_onWorkspaceChanged);

    _initializeManager();
  }

  void _initializeManager() {
    _initializedWithWorkspaceId = _workspaceId;
    _accountsManager = EmailAccountsManager(
      workspaceId: _workspaceId,
    );
    _accountsManager.addListener(_onAccountsChanged);
    _loadAccounts();
  }

  /// Called when workspace changes - reinitialize if workspace becomes available
  void _onWorkspaceChanged() {
    if (!mounted) return;

    final currentWorkspaceId = _workspaceId;

    // If we were initialized with empty workspace and now have a valid one, reinitialize
    if (_initializedWithWorkspaceId.isEmpty && currentWorkspaceId.isNotEmpty) {
      // Dispose old manager
      _accountsManager.removeListener(_onAccountsChanged);
      _accountsManager.dispose();
      _tabController?.dispose();
      _tabController = null;

      // Reset screen state and reinitialize
      setState(() {
        _screenState = _ScreenState.loading;
      });

      _initializeManager();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _workspaceService.removeListener(_onWorkspaceChanged);
    _searchController.dispose();
    _accountsManager.removeListener(_onAccountsChanged);
    _accountsManager.dispose();
    _tabController?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // When app returns from OAuth flow, refresh connections
    if (state == AppLifecycleState.resumed && _waitingForOAuth) {
      _waitingForOAuth = false;
      _accountsManager.refreshAfterOAuth();
    }
  }

  String get _workspaceId => _workspaceService.currentWorkspace?.id ?? '';

  void _onAccountsChanged() {
    if (!mounted) return;

    setState(() {
      _updateScreenState();
      _updateTabController();
    });
  }

  void _updateScreenState() {
    if (_accountsManager.isInitializing) {
      _screenState = _ScreenState.loading;
    } else if (_accountsManager.hasConnectedAccount) {
      _screenState = _ScreenState.connected;
    } else {
      _screenState = _ScreenState.noAccounts;
    }
  }

  void _updateTabController() {
    final accountCount = _accountsManager.connectedAccounts.length;

    if (accountCount == 0) {
      _tabController?.dispose();
      _tabController = null;
      return;
    }

    // Include All Mail tab when there are 2+ accounts
    final tabCount = _accountsManager.showAllMailTab ? accountCount + 1 : accountCount;

    if (_tabController == null || _tabController!.length != tabCount) {
      _tabController?.dispose();
      _tabController = TabController(
        length: tabCount,
        vsync: this,
        initialIndex: _accountsManager.selectedTabIndex.clamp(0, tabCount - 1),
      );
      _tabController!.addListener(_onTabChanged);
    }
  }

  void _onTabChanged() {
    if (_tabController != null && !_tabController!.indexIsChanging) {
      _accountsManager.switchTab(_tabController!.index);
      // Update search controller with current account's search query
      final currentAccount = _accountsManager.currentAccount;
      if (currentAccount != null) {
        _searchController.text = currentAccount.searchQuery;
      }
    }
  }

  Future<void> _loadAccounts() async {
    // If workspace is now available but manager was initialized without it, reinitialize
    if (_initializedWithWorkspaceId.isEmpty && _workspaceId.isNotEmpty) {
      // Dispose old manager and create new one with valid workspace
      _accountsManager.removeListener(_onAccountsChanged);
      _accountsManager.dispose();
      _tabController?.dispose();
      _tabController = null;

      setState(() {
        _screenState = _ScreenState.loading;
      });

      _initializeManager();
      return;
    }

    await _accountsManager.initialize();
  }

  Future<void> _handleGmailConnect() async {
    try {
      final emailService = EmailApiService();
      final returnUrl = 'deskive://email/callback?workspaceId=$_workspaceId';

      final response = await emailService.getAuthUrl(
        _workspaceId,
        returnUrl,
      );

      if (response.success && response.data != null && response.data!.isNotEmpty) {
        final url = Uri.parse(response.data!);
        if (await canLaunchUrl(url)) {
          setState(() {
            _waitingForOAuth = true;
          });
          await launchUrl(url, mode: LaunchMode.externalApplication);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('email.failed_auth_url'.tr())),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  void _handleSmtpImapConnect() {
    setState(() {
      _screenState = _ScreenState.smtpImapForm;
    });
  }

  void _handleSmtpImapConnected() {
    _accountsManager.refreshAfterSmtpImapConnect();
  }

  void _handleBackFromSmtpImap() {
    setState(() {
      _screenState = _accountsManager.hasConnectedAccount
          ? _ScreenState.connected
          : _ScreenState.noAccounts;
    });
  }

  void _showAddAccountSheet() {
    // Always allow adding more accounts - no limit
    showModalBottomSheet(
      context: context,
      builder: (context) => AddAccountSheet(
        onGmailConnect: _handleGmailConnect,
        onSmtpImapConnect: _handleSmtpImapConnect,
      ),
    );
  }

  /// Show settings dialog for the current email connection
  /// Matching frontend EmailSettingsDialog with notification and auto-create events toggles
  void _showSettingsDialog(EmailAccountState account) {
    if (account.connection == null) return;

    EmailSettingsDialog.show(
      context,
      workspaceId: _workspaceId,
      connection: account.connection!,
    );
  }

  Future<void> _handleDisconnect(String accountId) async {
    final account = _accountsManager.getAccountById(accountId);
    if (account == null) return;

    final providerName = account.provider == 'smtp_imap' ? 'email account' : 'Gmail';
    final accountEmail = account.emailAddress.isNotEmpty ? ' (${account.emailAddress})' : '';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Disconnect $providerName$accountEmail'),
        content: Text('Are you sure you want to disconnect this account?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Disconnect'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _accountsManager.disconnect(accountId);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to disconnect: ${e.toString()}')),
          );
        }
      }
    }
  }

  void _handleSelectEmail(String accountId, String messageId) {
    _accountsManager.fetchEmail(accountId, messageId);
  }

  void _handleCloseDetail(String accountId) {
    _accountsManager.clearSelectedEmail(accountId);
  }

  void _handleFolderChange(String accountId, String labelId) {
    _accountsManager.changeFolder(accountId, labelId);
    Navigator.pop(context); // Close drawer
  }

  void _handleSearchChanged(String query) {
    final currentAccount = _accountsManager.currentAccount;
    if (currentAccount != null) {
      _accountsManager.updateSearchQuery(currentAccount.id, query);
    }
  }

  void _toggleSearch() {
    setState(() {
      if (_isSearching) {
        // Submit search when closing
        final currentAccount = _accountsManager.currentAccount;
        if (currentAccount != null) {
          _accountsManager.submitSearch(currentAccount.id);
        }
      }
      _isSearching = !_isSearching;
    });
  }

  void _handleClearFilters() {
    final currentAccount = _accountsManager.currentAccount;
    if (currentAccount != null) {
      _accountsManager.clearSearch(currentAccount.id);
    }
    _searchController.clear();
  }

  Future<void> _handleAnalyzePriority() async {
    final currentAccount = _accountsManager.currentAccount;
    if (currentAccount == null) return;

    if (currentAccount.emailsData?.emails.isEmpty ?? true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No emails to analyze')),
      );
      return;
    }

    try {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              SizedBox(width: 12),
              Text('Analyzing email priorities...'),
            ],
          ),
          duration: Duration(seconds: 10),
        ),
      );

      await _accountsManager.analyzePriority(currentAccount.id);

      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        final highCount = _accountsManager.currentAccount?.highPriorityCount ?? 0;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Analysis complete! $highCount high priority email${highCount != 1 ? 's' : ''} found.'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to analyze priorities: ${e.toString()}')),
        );
      }
    }
  }

  void _showPrioritySortOptions() {
    final currentAccount = _accountsManager.currentAccount;
    if (currentAccount == null) return;

    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.sort),
              title: const Text('Sort by Date (Default)'),
              trailing: currentAccount.prioritySortMode == EmailPrioritySortMode.none
                  ? const Icon(Icons.check, color: Colors.green)
                  : null,
              onTap: () {
                _accountsManager.setPrioritySortMode(
                  currentAccount.id,
                  EmailPrioritySortMode.none,
                );
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.priority_high, color: Colors.red),
              title: const Text('High Priority First'),
              trailing: currentAccount.prioritySortMode == EmailPrioritySortMode.highFirst
                  ? const Icon(Icons.check, color: Colors.green)
                  : null,
              onTap: () {
                _accountsManager.setPrioritySortMode(
                  currentAccount.id,
                  EmailPrioritySortMode.highFirst,
                );
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.filter_alt, color: Colors.red),
              title: const Text('Show High Priority Only'),
              trailing: currentAccount.prioritySortMode == EmailPrioritySortMode.highOnly
                  ? const Icon(Icons.check, color: Colors.green)
                  : null,
              onTap: () {
                _accountsManager.setPrioritySortMode(
                  currentAccount.id,
                  EmailPrioritySortMode.highOnly,
                );
                Navigator.pop(context);
              },
            ),
            if (currentAccount.hasPriorities)
              ListTile(
                leading: const Icon(Icons.clear_all),
                title: const Text('Clear Priorities'),
                onTap: () {
                  _accountsManager.clearPriorities(currentAccount.id);
                  Navigator.pop(context);
                },
              ),
          ],
        ),
      ),
    );
  }

  void _handleAIPress() {
    final currentAccount = _accountsManager.currentAccount;

    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: currentAccount?.isAnalyzingPriority == true
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.analytics_outlined),
              title: const Text('Analyze Email Priorities'),
              subtitle: const Text('AI analyzes importance of your emails'),
              enabled: currentAccount?.isAnalyzingPriority != true,
              onTap: () {
                Navigator.pop(context);
                _handleAnalyzePriority();
              },
            ),
            if (currentAccount?.hasPriorities == true)
              ListTile(
                leading: const Icon(Icons.sort),
                title: const Text('Sort by Priority'),
                subtitle: Text(_getPrioritySortLabel(currentAccount?.prioritySortMode)),
                onTap: () {
                  Navigator.pop(context);
                  _showPrioritySortOptions();
                },
              ),
          ],
        ),
      ),
    );
  }

  String _getPrioritySortLabel(EmailPrioritySortMode? mode) {
    switch (mode) {
      case EmailPrioritySortMode.highFirst:
        return 'High priority first';
      case EmailPrioritySortMode.highOnly:
        return 'Showing high priority only';
      case EmailPrioritySortMode.none:
      case null:
        return 'Default (by date)';
    }
  }

  void _openCompose({Email? replyTo}) {
    final accounts = _accountsManager.connectedAccounts;
    final currentIndex = _accountsManager.selectedTabIndex;
    final safeIndex = currentIndex.clamp(0, accounts.length - 1);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => EmailComposeDialog(
        workspaceId: _workspaceId,
        replyTo: replyTo,
        provider: accounts.isNotEmpty ? accounts[safeIndex].provider : null,
        accounts: accounts,
        initialAccountIndex: safeIndex,
        onSent: () {
          // Refresh emails for the account that sent the email
          final currentAccount = _accountsManager.currentAccount;
          if (currentAccount != null) {
            _accountsManager.fetchEmails(currentAccount.id);
          }
        },
      ),
    );
  }

  Future<void> _handleStar(String accountId, String messageId, bool isStarred) async {
    try {
      await _accountsManager.starEmail(accountId, messageId, isStarred);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to star email: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _handleDelete(String accountId, String messageId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Email'),
        content: const Text('Move this email to trash?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _accountsManager.deleteEmail(accountId, messageId);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to delete email: ${e.toString()}')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.showAppBar ? _buildAppBar() : null,
      endDrawer: _screenState == _ScreenState.connected ? _buildDrawer() : null,
      body: _buildBody(),
      floatingActionButton: _buildFab(),
    );
  }

  Widget? _buildFab() {
    if (_screenState != _ScreenState.connected) return null;

    final currentAccount = _accountsManager.currentAccount;
    if (currentAccount?.selectedMessageId != null) return null;

    return FloatingActionButton(
      onPressed: () => _openCompose(),
      child: const Icon(Icons.edit),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    final currentAccount = _accountsManager.currentAccount;

    // When viewing email detail, show simple AppBar with back button
    if (currentAccount?.selectedMessageId != null) {
      return AppBar(
        title: Text('email.title'.tr()),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => _handleCloseDetail(currentAccount!.id),
        ),
      );
    }

    // When showing SMTP/IMAP form, show simple AppBar
    if (_screenState == _ScreenState.smtpImapForm) {
      return AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _handleBackFromSmtpImap,
          tooltip: 'Back',
        ),
        title: Text('email.title'.tr()),
      );
    }

    // When connected, show toolbar with current folder name, search and AI button
    if (_screenState == _ScreenState.connected && currentAccount != null) {
      return DeskiveToolbar(
        title: getLabelDisplayName(currentAccount.currentLabel),
        isSearching: _isSearching,
        searchController: _searchController,
        searchHint: 'Search emails...',
        onSearchChanged: _handleSearchChanged,
        onSearchToggle: _toggleSearch,
        activeSearchQuery: currentAccount.activeSearch,
        onClearFilters: currentAccount.activeSearch.isNotEmpty ? _handleClearFilters : null,
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Back',
        ),
        customActions: [
          // Menu button to open drawer from right side
          Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(context).openEndDrawer(),
              tooltip: 'Open folders',
            ),
          ),
        ],
        actions: [
          DeskiveToolbarAction.icon(
            icon: Icons.auto_awesome,
            tooltip: 'AI Assistant',
            onPressed: _handleAIPress,
          ),
        ],
      );
    }

    // When not connected, show simple AppBar with back button
    return AppBar(
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () => Navigator.of(context).pop(),
        tooltip: 'Back',
      ),
      title: Text('email.title'.tr()),
    );
  }

  Widget _buildDrawer() {
    final currentAccount = _accountsManager.currentAccount;
    if (currentAccount == null) return const SizedBox.shrink();

    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            // Current account header
            if (currentAccount.connection != null)
              Padding(
                padding: const EdgeInsets.all(16),
                child: AccountIndicator(
                  connection: currentAccount.connection!,
                  provider: currentAccount.provider,
                ),
              ),

            // Quick account switcher (if multiple accounts)
            if (_accountsManager.connectedAccounts.length > 1)
              _buildAccountSwitcher(),

            const Divider(),

            // Labels for current account
            Expanded(
              child: _buildLabelsSection(currentAccount),
            ),

            const Divider(),

            // Add account option - always available (unlimited accounts)
            ListTile(
              leading: const Icon(Icons.add),
              title: Text('email.add_account'.tr()),
              onTap: () {
                Navigator.pop(context);
                _showAddAccountSheet();
              },
            ),

            // Settings button (matching frontend EmailSettingsDialog)
            ListTile(
              leading: const Icon(Icons.settings_outlined),
              title: const Text('Settings'),
              onTap: () {
                Navigator.pop(context);
                _showSettingsDialog(currentAccount);
              },
            ),

            // Disconnect button
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Disconnect'),
              onTap: () {
                Navigator.pop(context);
                _handleDisconnect(currentAccount.id);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountSwitcher() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _accountsManager.connectedAccounts.map((account) {
            final isActive = account == _accountsManager.currentAccount;
            final isGmail = account.provider == 'gmail';

            // Show email address for multiple accounts of same type
            final displayName = account.emailAddress.isNotEmpty
                ? account.emailAddress.split('@').first
                : (isGmail ? 'Gmail' : 'SMTP');

            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isGmail ? Icons.mail : Icons.dns,
                      size: 16,
                      color: isActive
                          ? Theme.of(context).colorScheme.onPrimaryContainer
                          : null,
                    ),
                    const SizedBox(width: 4),
                    Text(displayName),
                  ],
                ),
                selected: isActive,
                onSelected: (_) {
                  _accountsManager.switchToAccount(account.id);
                  if (_tabController != null) {
                    final index = _accountsManager.connectedAccounts.indexOf(account);
                    if (index >= 0) {
                      _tabController!.animateTo(index);
                    }
                  }
                },
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildLabelsSection(EmailAccountState account) {
    return ListView(
      children: [
        _buildLabelTile(account.id, SystemLabels.inbox, Icons.inbox, 'Inbox', account),
        _buildLabelTile(account.id, SystemLabels.starred, Icons.star_outline, 'Starred', account),
        _buildLabelTile(account.id, SystemLabels.sent, Icons.send_outlined, 'Sent', account),
        _buildLabelTile(account.id, SystemLabels.draft, Icons.drafts_outlined, 'Drafts', account),
        _buildLabelTile(account.id, SystemLabels.trash, Icons.delete_outline, 'Trash', account),
        _buildLabelTile(account.id, SystemLabels.spam, Icons.report_outlined, 'Spam', account),
        if (account.labels.where((l) => l.type == 'user').isNotEmpty) ...[
          const Divider(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              'LABELS',
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ),
          ...account.labels
              .where((l) => l.type == 'user')
              .map((label) => _buildCustomLabelTile(account.id, label, account)),
        ],
      ],
    );
  }

  Widget _buildLabelTile(String accountId, String labelId, IconData icon, String name, EmailAccountState account) {
    final isSelected = account.currentLabel == labelId;
    final label = account.labels.firstWhere(
      (l) => l.id == labelId,
      orElse: () => EmailLabel(id: labelId, name: name),
    );
    final unreadCount = label.messagesUnread ?? 0;

    return ListTile(
      selected: isSelected,
      leading: Icon(icon),
      title: Text(name),
      trailing: unreadCount > 0
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                unreadCount.toString(),
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onPrimary,
                  fontSize: 12,
                ),
              ),
            )
          : null,
      onTap: () => _handleFolderChange(accountId, labelId),
    );
  }

  Widget _buildCustomLabelTile(String accountId, EmailLabel label, EmailAccountState account) {
    final isSelected = account.currentLabel == label.id;
    final unreadCount = label.messagesUnread ?? 0;

    return ListTile(
      selected: isSelected,
      leading: Icon(
        Icons.label_outline,
        color: label.color != null
            ? Color(int.parse(label.color!['backgroundColor']?.replaceFirst('#', '0xFF') ?? 'FF000000'))
            : null,
      ),
      title: Text(label.name),
      trailing: unreadCount > 0
          ? Text(
              unreadCount.toString(),
              style: Theme.of(context).textTheme.bodySmall,
            )
          : null,
      onTap: () => _handleFolderChange(accountId, label.id),
    );
  }

  Widget _buildBody() {
    switch (_screenState) {
      case _ScreenState.loading:
        return const Center(child: CircularProgressIndicator());

      case _ScreenState.noAccounts:
        if (_accountsManager.errorMessage != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(_accountsManager.errorMessage!),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _loadAccounts,
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }
        return EmailConnectWidget(
          onGmailConnect: _handleGmailConnect,
          onSmtpImapConnect: _handleSmtpImapConnect,
        );

      case _ScreenState.smtpImapForm:
        return SmtpImapConnectWidget(
          workspaceId: _workspaceId,
          onConnected: _handleSmtpImapConnected,
          onBack: _handleBackFromSmtpImap,
        );

      case _ScreenState.connected:
        return _buildConnectedContent();
    }
  }

  Widget _buildConnectedContent() {
    final accounts = _accountsManager.connectedAccounts;

    if (accounts.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    // Check if any account has a selected email (detail view)
    final currentAccount = _accountsManager.currentAccount;
    if (currentAccount?.selectedMessageId != null) {
      // For All Mail mode, we need to find which account the email belongs to
      final accountId = _accountsManager.isAllMailMode
          ? _findAccountForEmail(currentAccount!.selectedMessageId!)
          : currentAccount!.id;

      return EmailAccountView(
        account: currentAccount,
        workspaceId: _workspaceId,
        connectionId: accountId,
        onSelectEmail: (id) => _handleSelectEmail(accountId, id),
        onCloseDetail: () => _handleCloseDetail(accountId),
        onRefresh: () => _accountsManager.isAllMailMode
            ? _accountsManager.fetchAllMailEmails()
            : _accountsManager.fetchEmails(accountId),
        onReply: () => _openCompose(replyTo: currentAccount.selectedEmail),
        onStar: (id, isStarred) => _handleStar(accountId, id, isStarred),
        onDelete: (id) => _handleDelete(accountId, id),
        isAllMailMode: _accountsManager.isAllMailMode,
        onLoadMore: () => _accountsManager.loadMoreEmails(accountId),
      );
    }

    // Show tabs only if multiple accounts
    if (accounts.length == 1) {
      final account = accounts.first;
      return EmailAccountView(
        account: account,
        workspaceId: _workspaceId,
        connectionId: account.id,
        onSelectEmail: (id) => _handleSelectEmail(account.id, id),
        onCloseDetail: () => _handleCloseDetail(account.id),
        onRefresh: () => _accountsManager.fetchEmails(account.id),
        onReply: () => _openCompose(replyTo: account.selectedEmail),
        onStar: (id, isStarred) => _handleStar(account.id, id, isStarred),
        onDelete: (id) => _handleDelete(account.id, id),
        onLoadMore: () => _accountsManager.loadMoreEmails(account.id),
      );
    }

    // Multiple accounts - show tabs with All Mail
    final showAllMailTab = _accountsManager.showAllMailTab;

    return Column(
      children: [
        // Account tabs with All Mail option
        EmailAccountTabs(
          accounts: accounts,
          selectedIndex: _tabController?.index ?? 0,
          onTabSelected: (index) {
            _tabController?.animateTo(index);
          },
          onAddAccount: _showAddAccountSheet,
          canAddAccount: true,
          showAllMailTab: showAllMailTab,
        ),

        // Tab content
        Expanded(
          child: _tabController != null
              ? TabBarView(
                  controller: _tabController,
                  children: _buildTabViews(accounts, showAllMailTab),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }

  /// Build tab views including All Mail tab when applicable
  List<Widget> _buildTabViews(List<EmailAccountState> accounts, bool showAllMailTab) {
    final views = <Widget>[];

    // Add All Mail tab first if applicable
    if (showAllMailTab) {
      final allMailState = _accountsManager.allMailState;
      if (allMailState != null) {
        views.add(
          EmailAccountView(
            account: allMailState,
            workspaceId: _workspaceId,
            // For All Mail, connectionId will be determined when viewing specific email
            onSelectEmail: (id) => _handleAllMailSelectEmail(id),
            onCloseDetail: () {},
            onRefresh: () => _accountsManager.fetchAllMailEmails(),
            onReply: () {},
            onStar: (id, isStarred) => _handleAllMailStar(id, isStarred),
            onDelete: (id) => _handleAllMailDelete(id),
            isAllMailMode: true,
            // All Mail doesn't support pagination (combines all accounts)
            onLoadMore: null,
          ),
        );
      } else {
        // Show loading or empty state for All Mail
        views.add(
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.all_inbox, size: 48, color: Colors.grey),
                const SizedBox(height: 16),
                const Text('Loading all emails...'),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => _accountsManager.fetchAllMailEmails(),
                  child: const Text('Refresh'),
                ),
              ],
            ),
          ),
        );
      }
    }

    // Add individual account tabs
    for (final account in accounts) {
      views.add(
        EmailAccountView(
          account: account,
          workspaceId: _workspaceId,
          connectionId: account.id,
          onSelectEmail: (id) => _handleSelectEmail(account.id, id),
          onCloseDetail: () => _handleCloseDetail(account.id),
          onRefresh: () => _accountsManager.fetchEmails(account.id),
          onReply: () => _openCompose(replyTo: account.selectedEmail),
          onStar: (id, isStarred) => _handleStar(account.id, id, isStarred),
          onDelete: (id) => _handleDelete(account.id, id),
          onLoadMore: () => _accountsManager.loadMoreEmails(account.id),
        ),
      );
    }

    return views;
  }

  /// Find which account an email belongs to (for All Mail mode)
  String _findAccountForEmail(String messageId) {
    for (final account in _accountsManager.connectedAccounts) {
      final emails = account.emailsData?.emails ?? [];
      if (emails.any((e) => e.id == messageId)) {
        return account.id;
      }
    }
    // Default to first account if not found
    return _accountsManager.connectedAccounts.first.id;
  }

  /// Handle email selection in All Mail mode
  void _handleAllMailSelectEmail(String messageId) {
    final accountId = _findAccountForEmail(messageId);
    _accountsManager.fetchEmail(accountId, messageId);
  }

  /// Handle star in All Mail mode
  Future<void> _handleAllMailStar(String messageId, bool isStarred) async {
    final accountId = _findAccountForEmail(messageId);
    await _handleStar(accountId, messageId, isStarred);
  }

  /// Handle delete in All Mail mode
  Future<void> _handleAllMailDelete(String messageId) async {
    final accountId = _findAccountForEmail(messageId);
    await _handleDelete(accountId, messageId);
  }
}
