import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api/services/integration_framework_api_service.dart';
import '../api/services/github_api_service.dart';
import '../services/workspace_management_service.dart';

class IntegrationsScreen extends StatefulWidget {
  const IntegrationsScreen({super.key});

  @override
  State<IntegrationsScreen> createState() => _IntegrationsScreenState();
}

class _IntegrationsScreenState extends State<IntegrationsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  IntegrationCategoryType? _selectedCategory;
  String _searchQuery = '';
  bool _isLoading = false;
  String? _errorMessage;

  // Integration Framework data
  List<IntegrationCatalogEntry> _catalogIntegrations = [];
  List<IntegrationConnection> _connections = [];
  List<CategoryCount> _categories = [];
  final TextEditingController _searchController = TextEditingController();

  // GitHub specific data (for enhanced GitHub card)
  GitHubConnection? _githubConnection;
  List<GitHubRepository> _githubRepositories = [];
  bool _isLoadingGitHub = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final workspaceId = WorkspaceManagementService.instance.currentWorkspace?.id;

      // Load catalog and categories in parallel
      await Future.wait([
        _loadCatalog(),
        _loadCategories(),
        if (workspaceId != null) _loadConnections(workspaceId),
      ]);

      // Load GitHub specific data if connected
      if (workspaceId != null) {
        await _loadGitHubConnection(workspaceId);
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadCatalog() async {
    try {
      final response = await IntegrationFrameworkApiService.instance.getCatalog(
        filters: CatalogFilters(
          page: 1,
          limit: 200,
          category: _selectedCategory,
          search: _searchQuery.isNotEmpty ? _searchQuery : null,
          sortBy: 'installCount',
          sortOrder: 'desc',
        ),
      );
      setState(() {
        _catalogIntegrations = response.integrations;
      });
    } catch (e) {
      // Ignore catalog loading errors
    }
  }

  Future<void> _loadCategories() async {
    try {
      final categories = await IntegrationFrameworkApiService.instance.getCategories();
      setState(() {
        _categories = categories;
      });
    } catch (e) {
      // Ignore category loading errors
    }
  }

  Future<void> _loadConnections(String workspaceId) async {
    try {
      final response = await IntegrationFrameworkApiService.instance.getConnections(workspaceId);
      setState(() {
        _connections = response.connections;
      });
    } catch (e) {
      // Ignore connection loading errors
    }
  }

  Future<void> _loadGitHubConnection(String workspaceId) async {
    try {
      final connection = await GitHubApiService.instance.getConnection(workspaceId);
      setState(() {
        _githubConnection = connection;
      });

      // Load repositories if connected
      if (connection?.isActive == true) {
        await _loadGitHubRepositories(workspaceId);
      }
    } catch (e) {
      // GitHub not connected, ignore error
    }
  }

  Future<void> _loadGitHubRepositories(String workspaceId) async {
    setState(() {
      _isLoadingGitHub = true;
    });

    try {
      final repos = await GitHubApiService.instance.listRepositories(workspaceId);
      setState(() {
        _githubRepositories = repos;
      });
    } catch (e) {
      // Handle error silently
    } finally {
      setState(() {
        _isLoadingGitHub = false;
      });
    }
  }

  /// Get connection for a specific integration
  IntegrationConnection? _getConnectionForIntegration(IntegrationCatalogEntry entry) {
    try {
      return _connections.firstWhere(
        (c) => c.integration?.slug == entry.slug || c.integrationId == entry.id,
      );
    } catch (e) {
      return null;
    }
  }

  /// Get all connected integrations
  List<IntegrationConnection> get _connectedIntegrations {
    return _connections.where((c) => c.status == ConnectionStatus.active).toList();
  }

  /// Get filtered catalog integrations
  List<IntegrationCatalogEntry> get _filteredIntegrations {
    var result = _catalogIntegrations;

    // Filter by category
    if (_selectedCategory != null) {
      result = result.where((i) => i.category == _selectedCategory).toList();
    }

    // Filter by search
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      result = result
          .where((i) =>
              i.name.toLowerCase().contains(query) ||
              (i.description?.toLowerCase().contains(query) ?? false) ||
              (i.provider?.toLowerCase().contains(query) ?? false))
          .toList();
    }

    return result;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('integrations.title'.tr()),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: '${'integrations.connected'.tr()} (${_connectedIntegrations.length})'),
            Tab(text: 'integrations.browse'.tr()),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? _buildErrorState()
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildConnectedTab(),
                    _buildBrowseTab(),
                  ],
                ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: Theme.of(context).colorScheme.error,
          ),
          const SizedBox(height: 16),
          Text(
            'integrations.error.loading'.tr(),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            _errorMessage ?? '',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loadData,
            child: Text('common.retry'.tr()),
          ),
        ],
      ),
    );
  }

  Widget _buildConnectedTab() {
    if (_connectedIntegrations.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.extension_off,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              'integrations.no_connected'.tr(),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'integrations.browse_to_start'.tr(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                _tabController.animateTo(1);
              },
              child: Text('integrations.browse'.tr()),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Usage Overview
          _buildUsageOverviewCard(),
          const SizedBox(height: 16),

          // Connected Integrations List
          Text(
            'integrations.connected_integrations'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 12),

          ..._connectedIntegrations.map((connection) {
            // Special handling for GitHub
            if (connection.integration?.slug == 'github' && _githubConnection != null) {
              return _buildGitHubConnectedCard(connection);
            }
            return _buildConnectedIntegrationCard(connection);
          }),
        ],
      ),
    );
  }

  Widget _buildUsageOverviewCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'integrations.usage'.tr(),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildUsageMetric(
                    'integrations.active'.tr(),
                    '${_connectedIntegrations.length}',
                    Colors.green,
                  ),
                ),
                Expanded(
                  child: _buildUsageMetric(
                    'integrations.repos'.tr(),
                    '${_githubRepositories.length}',
                    Colors.blue,
                  ),
                ),
                Expanded(
                  child: _buildUsageMetric(
                    'integrations.synced'.tr(),
                    _githubConnection?.lastSyncedAt != null
                        ? formatUpdatedAt(_githubConnection!.lastSyncedAt!)
                        : '-',
                    Colors.purple,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUsageMetric(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
      ],
    );
  }

  Widget _buildConnectedIntegrationCard(IntegrationConnection connection) {
    final integrationInfo = connection.integration;
    final category = integrationInfo != null
        ? IntegrationCategoryTypeExtension.fromString(integrationInfo.category)
        : IntegrationCategoryType.other;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Avatar or Icon
                if (connection.externalAvatar != null)
                  CircleAvatar(
                    radius: 24,
                    backgroundImage: NetworkImage(connection.externalAvatar!),
                  )
                else
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: category.color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      category.icon,
                      color: category.color,
                      size: 24,
                    ),
                  ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            integrationInfo?.name ?? 'Unknown Integration',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          const SizedBox(width: 8),
                          _buildStatusBadge(connection.status),
                        ],
                      ),
                      const SizedBox(height: 4),
                      // External user info
                      if (connection.externalEmail != null || connection.externalName != null)
                        Text(
                          connection.externalName ?? connection.externalEmail ?? '',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Theme.of(context).colorScheme.primary,
                              ),
                        ),
                      // Last synced
                      if (connection.lastSyncedAt != null)
                        Text(
                          '${'integrations.last_synced'.tr()}: ${formatUpdatedAt(connection.lastSyncedAt!)}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                        ),
                      // Error message
                      if (connection.status == ConnectionStatus.error &&
                          connection.errorMessage != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            connection.errorMessage!,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Colors.red,
                                ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => _showIntegrationSettings(connection),
                  child: Text('integrations.settings'.tr()),
                ),
                TextButton(
                  onPressed: () => _disconnectIntegration(connection),
                  style: TextButton.styleFrom(foregroundColor: Colors.red),
                  child: Text('integrations.disconnect'.tr()),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(ConnectionStatus status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: status.color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          color: status.color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildGitHubConnectedCard(IntegrationConnection connection) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                if (_githubConnection?.githubAvatar != null)
                  CircleAvatar(
                    radius: 24,
                    backgroundImage: NetworkImage(_githubConnection!.githubAvatar!),
                  )
                else
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: const Color(0xFF24292E).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.code,
                      color: Color(0xFF24292E),
                      size: 24,
                    ),
                  ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'GitHub',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          const SizedBox(width: 8),
                          _buildStatusBadge(connection.status),
                          const SizedBox(width: 4),
                          _buildVerifiedBadge(),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '@${_githubConnection?.githubLogin ?? 'unknown'}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.primary,
                            ),
                      ),
                      if (_githubConnection?.githubEmail != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          _githubConnection!.githubEmail!,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Repositories section
          if (_githubRepositories.isNotEmpty) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'integrations.repositories'.tr(),
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      Text(
                        '${_githubRepositories.length} ${'integrations.repos'.tr()}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Show first 3 repositories
                  ..._githubRepositories.take(3).map((repo) => _buildRepositoryItem(repo)),
                  if (_githubRepositories.length > 3)
                    TextButton(
                      onPressed: () => _showAllRepositories(),
                      child: Text('integrations.view_all_repos'.tr(
                        args: ['${_githubRepositories.length}'],
                      )),
                    ),
                ],
              ),
            ),
          ],
          // Actions
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => _showIntegrationSettings(connection),
                  child: Text('integrations.settings'.tr()),
                ),
                TextButton(
                  onPressed: () => _disconnectIntegration(connection),
                  style: TextButton.styleFrom(foregroundColor: Colors.red),
                  child: Text('integrations.disconnect'.tr()),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVerifiedBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.blue.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified, color: Colors.blue, size: 12),
          SizedBox(width: 2),
          Text(
            'Verified',
            style: TextStyle(
              color: Colors.blue,
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRepositoryItem(GitHubRepository repo) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => _openUrl(repo.htmlUrl),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              Icon(
                repo.private ? Icons.lock_outline : Icons.public,
                size: 16,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      repo.fullName,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (repo.description != null)
                      Text(
                        repo.description!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Row(
                children: [
                  if (repo.language != null) ...[
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: Color(int.parse(
                          getLanguageColor(repo.language).replaceFirst('#', '0xFF'),
                        )),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      repo.language!,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(width: 8),
                  ],
                  const Icon(Icons.star_outline, size: 14, color: Colors.amber),
                  const SizedBox(width: 2),
                  Text(
                    formatStarCount(repo.stargazersCount),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBrowseTab() {
    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'integrations.search'.tr(),
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {
                          _searchQuery = '';
                        });
                        _loadCatalog();
                      },
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            onChanged: (value) {
              setState(() {
                _searchQuery = value;
              });
            },
            onSubmitted: (_) => _loadCatalog(),
          ),
        ),

        // Category Filter
        Container(
          height: 50,
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: [
              // All category
              Container(
                margin: const EdgeInsets.only(right: 8),
                child: FilterChip(
                  label: const Text('All'),
                  selected: _selectedCategory == null,
                  onSelected: (selected) {
                    setState(() {
                      _selectedCategory = null;
                    });
                    _loadCatalog();
                  },
                ),
              ),
              // Categories from API
              ..._categories.map((cat) {
                final categoryType = cat.categoryType;
                return Container(
                  margin: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    avatar: Icon(categoryType.icon, size: 16),
                    label: Text('${categoryType.label} (${cat.count})'),
                    selected: _selectedCategory == categoryType,
                    onSelected: (selected) {
                      setState(() {
                        _selectedCategory = selected ? categoryType : null;
                      });
                      _loadCatalog();
                    },
                  ),
                );
              }),
            ],
          ),
        ),

        // Integrations Grid
        Expanded(
          child: _filteredIntegrations.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.search_off,
                        size: 64,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'integrations.no_results'.tr(),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.75,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: _filteredIntegrations.length,
                    itemBuilder: (context, index) {
                      final integration = _filteredIntegrations[index];
                      final connection = _getConnectionForIntegration(integration);
                      return _buildIntegrationCard(integration, connection);
                    },
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildIntegrationCard(IntegrationCatalogEntry integration, IntegrationConnection? connection) {
    final activeConnection = connection != null && connection.status == ConnectionStatus.active
        ? connection
        : null;
    final isConnected = activeConnection != null;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: integration.color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    integration.icon,
                    color: integration.color,
                    size: 20,
                  ),
                ),
                const Spacer(),
                // Badges
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (integration.isVerified)
                      Padding(
                        padding: const EdgeInsets.only(right: 4),
                        child: Icon(
                          Icons.verified,
                          color: Colors.blue,
                          size: 16,
                        ),
                      ),
                    if (integration.isFeatured)
                      Padding(
                        padding: const EdgeInsets.only(right: 4),
                        child: Icon(
                          Icons.star,
                          color: Colors.amber,
                          size: 16,
                        ),
                      ),
                    _buildPricingBadge(integration.pricingType),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              integration.name,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            // Category chip
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: integration.category.color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                integration.category.label,
                style: TextStyle(
                  color: integration.category.color,
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Expanded(
              child: Text(
                integration.description ?? '',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            // Auth type indicator
            Row(
              children: [
                Icon(
                  integration.supportsOAuth ? Icons.lock_open : Icons.key,
                  size: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 4),
                Text(
                  integration.supportsOAuth ? 'OAuth' : 'API Key',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
                const Spacer(),
                if (integration.installCount > 0)
                  Text(
                    '${_formatInstallCount(integration.installCount)} installs',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: isConnected && activeConnection != null
                  ? OutlinedButton(
                      onPressed: () => _disconnectIntegration(activeConnection),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                      child: Text('integrations.disconnect'.tr()),
                    )
                  : ElevatedButton(
                      onPressed: () => _connectIntegration(integration),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                      child: Text('integrations.connect'.tr()),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPricingBadge(IntegrationPricingType pricingType) {
    Color color;
    String label;

    switch (pricingType) {
      case IntegrationPricingType.free:
        color = Colors.green;
        label = 'Free';
        break;
      case IntegrationPricingType.freemium:
        color = Colors.blue;
        label = 'Freemium';
        break;
      case IntegrationPricingType.paid:
        color = Colors.orange;
        label = 'Pro';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  String _formatInstallCount(int count) {
    if (count >= 1000000) {
      return '${(count / 1000000).toStringAsFixed(1)}M';
    } else if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}k';
    }
    return count.toString();
  }

  void _connectIntegration(IntegrationCatalogEntry integration) {
    if (integration.pricingType == IntegrationPricingType.paid) {
      _showPremiumDialog(integration);
      return;
    }

    if (integration.supportsOAuth) {
      _startOAuthFlow(integration);
    } else {
      _showApiKeyDialog(integration);
    }
  }

  Future<void> _startOAuthFlow(IntegrationCatalogEntry integration) async {
    final workspaceId = WorkspaceManagementService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('integrations.error.no_workspace'.tr())),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // Use integration framework for OAuth
      final authData = await IntegrationFrameworkApiService.instance.initiateOAuth(
        workspaceId,
        integration.slug,
        returnUrl: 'deskive://oauth/callback',
      );

      final authUrl = authData['authUrl'];
      if (authUrl == null || authUrl.isEmpty) {
        throw Exception('Failed to get authorization URL');
      }

      // Open OAuth URL in browser
      final uri = Uri.parse(authUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);

        // Show instruction dialog
        if (mounted) {
          _showOAuthInProgressDialog(integration);
        }
      } else {
        throw Exception('Could not launch OAuth URL');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${'integrations.error.oauth'.tr()}: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _showOAuthInProgressDialog(IntegrationCatalogEntry integration) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(integration.icon, color: integration.color),
            const SizedBox(width: 8),
            Expanded(
              child: Text('integrations.connecting'.tr(args: [integration.name])),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text('integrations.oauth_in_progress'.tr()),
            const SizedBox(height: 8),
            Text(
              'integrations.oauth_instruction'.tr(),
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _loadData();
            },
            child: Text('integrations.done'.tr()),
          ),
        ],
      ),
    );
  }

  void _showApiKeyDialog(IntegrationCatalogEntry integration) {
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('integrations.connect_title'.tr(args: [integration.name])),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('integrations.api_key_instruction'.tr(args: [integration.name])),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: InputDecoration(
                labelText: 'integrations.api_key'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
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
          ElevatedButton(
            onPressed: () async {
              if (controller.text.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('integrations.error.api_key_required'.tr())),
                );
                return;
              }

              Navigator.pop(context);

              final workspaceId = WorkspaceManagementService.instance.currentWorkspace?.id;
              if (workspaceId == null) return;

              try {
                await IntegrationFrameworkApiService.instance.connectWithApiKey(
                  workspaceId,
                  integration.slug,
                  apiKey: controller.text,
                );
                await _loadData();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('${integration.name} ${'integrations.connected_success'.tr()}'),
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${'integrations.error.connect'.tr()}: $e')),
                  );
                }
              }
            },
            child: Text('integrations.connect'.tr()),
          ),
        ],
      ),
    );
  }

  void _disconnectIntegration(IntegrationConnection connection) {
    final integrationName = connection.integration?.name ?? 'Integration';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('integrations.disconnect_title'.tr(args: [integrationName])),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('integrations.disconnect_confirm'.tr(args: [integrationName])),
            if (connection.externalEmail != null) ...[
              const SizedBox(height: 8),
              Text(
                'Connected as: ${connection.externalEmail}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);

              final workspaceId = WorkspaceManagementService.instance.currentWorkspace?.id;
              if (workspaceId == null) return;

              setState(() {
                _isLoading = true;
              });

              try {
                await IntegrationFrameworkApiService.instance.disconnect(
                  workspaceId,
                  connection.id,
                );
                await _loadData();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('$integrationName ${'integrations.disconnected'.tr()}')),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${'integrations.error.disconnect'.tr()}: $e')),
                  );
                }
              } finally {
                if (mounted) {
                  setState(() {
                    _isLoading = false;
                  });
                }
              }
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('integrations.disconnect'.tr()),
          ),
        ],
      ),
    );
  }

  void _showPremiumDialog(IntegrationCatalogEntry integration) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('integrations.premium_title'.tr()),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.workspace_premium,
              size: 64,
              color: Colors.amber,
            ),
            const SizedBox(height: 16),
            Text(
              'integrations.premium_message'.tr(args: [integration.name]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'integrations.premium_benefits'.tr(),
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            Text('• ${'integrations.premium_benefit_1'.tr()}'),
            Text('• ${'integrations.premium_benefit_2'.tr()}'),
            Text('• ${'integrations.premium_benefit_3'.tr()}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.later'.tr()),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('integrations.upgrade_redirect'.tr())),
              );
            },
            child: Text('integrations.upgrade'.tr()),
          ),
        ],
      ),
    );
  }

  void _showIntegrationSettings(IntegrationConnection connection) {
    final integrationName = connection.integration?.name ?? 'Integration';

    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'integrations.settings_title'.tr(args: [integrationName]),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const Spacer(),
                if (connection.status != ConnectionStatus.active)
                  _buildStatusBadge(connection.status),
              ],
            ),
            if (connection.externalEmail != null) ...[
              const SizedBox(height: 4),
              Text(
                'Connected as: ${connection.externalEmail}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
            const SizedBox(height: 24),
            ListTile(
              leading: const Icon(Icons.sync),
              title: Text('integrations.sync_settings'.tr()),
              subtitle: Text('integrations.sync_settings_desc'.tr()),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(Icons.notifications),
              title: Text('integrations.notifications'.tr()),
              subtitle: Text('integrations.notifications_desc'.tr()),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(Icons.security),
              title: Text('integrations.permissions'.tr()),
              subtitle: Text('integrations.permissions_desc'.tr()),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(Icons.history),
              title: Text('integrations.activity_log'.tr()),
              subtitle: Text('integrations.activity_log_desc'.tr()),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.pop(context);
                  _disconnectIntegration(connection);
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                ),
                child: Text('integrations.disconnect'.tr()),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAllRepositories() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.code),
                  const SizedBox(width: 8),
                  Text(
                    'integrations.all_repositories'.tr(),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: _isLoadingGitHub
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      controller: scrollController,
                      itemCount: _githubRepositories.length,
                      itemBuilder: (context, index) {
                        final repo = _githubRepositories[index];
                        return ListTile(
                          leading: Icon(
                            repo.private ? Icons.lock_outline : Icons.public,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                          title: Text(repo.fullName),
                          subtitle: repo.description != null
                              ? Text(
                                  repo.description!,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                )
                              : null,
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (repo.language != null) ...[
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: Color(int.parse(
                                      getLanguageColor(repo.language)
                                          .replaceFirst('#', '0xFF'),
                                    )),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(repo.language!),
                                const SizedBox(width: 8),
                              ],
                              const Icon(Icons.star_outline, size: 16),
                              const SizedBox(width: 2),
                              Text(formatStarCount(repo.stargazersCount)),
                            ],
                          ),
                          onTap: () => _openUrl(repo.htmlUrl),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
