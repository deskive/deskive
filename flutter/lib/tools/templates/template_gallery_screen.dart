import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/template/project_template.dart';
import 'template_service.dart';
import 'widgets/template_card.dart';
import 'template_preview_screen.dart';

/// Screen for browsing and selecting project templates
class TemplateGalleryScreen extends StatefulWidget {
  /// Whether this screen is used for selecting a template to create a project
  final bool selectMode;

  /// Callback when a template is selected (in select mode)
  final void Function(ProjectTemplate)? onTemplateSelected;

  const TemplateGalleryScreen({
    super.key,
    this.selectMode = false,
    this.onTemplateSelected,
  });

  @override
  State<TemplateGalleryScreen> createState() => _TemplateGalleryScreenState();
}

class _TemplateGalleryScreenState extends State<TemplateGalleryScreen> {
  final TemplateService _templateService = TemplateService.instance;
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  bool _isLoading = true;
  String? _error;
  String? _selectedCategory;
  String _searchQuery = '';
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _loadTemplates();
    // Listen to service changes for pagination
    _templateService.addListener(_onServiceChanged);
  }

  @override
  void dispose() {
    _templateService.removeListener(_onServiceChanged);
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onServiceChanged() {
    if (mounted) {
      setState(() {
        _isLoading = _templateService.isLoading;
        _error = _templateService.error;
        // Sync selected category from service (in case search auto-selected it)
        _selectedCategory = _templateService.selectedCategory;
      });
      // Scroll to top when data changes (e.g., page changed)
      if (!_templateService.isLoading && _scrollController.hasClients) {
        _scrollController.animateTo(
          0,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    }
  }

  Future<void> _loadTemplates() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await _templateService.loadTemplates();
      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = e.toString();
      });
    }
  }

  void _onCategorySelected(String? categoryId) {
    setState(() {
      _selectedCategory = categoryId;
    });
    _templateService.setCategory(categoryId);
  }

  void _onSearchChanged(String query) {
    _templateService.setSearchQuery(query);
    setState(() {
      _searchQuery = query;
    });
  }

  void _onTemplateSelected(ProjectTemplate template) {
    if (widget.selectMode && widget.onTemplateSelected != null) {
      widget.onTemplateSelected!(template);
      Navigator.pop(context);
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => TemplatePreviewScreen(template: template),
        ),
      );
    }
  }

  void _toggleSearch() {
    setState(() {
      _isSearching = !_isSearching;
      if (!_isSearching) {
        _searchController.clear();
        _onSearchChanged('');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
                onChanged: _onSearchChanged,
                style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                decoration: InputDecoration(
                  hintText: 'templates.search_hint'.tr(),
                  hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                ),
              )
            : Text(
                widget.selectMode
                    ? 'templates.select_template'.tr()
                    : 'templates.title'.tr(),
              ),
        centerTitle: !_isSearching,
        actions: [
          if (!_isSearching)
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: _toggleSearch,
              tooltip: 'templates.search_hint'.tr(),
            ),
          if (_isSearching && _searchQuery.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _searchController.clear();
                _onSearchChanged('');
              },
            ),
        ],
      ),
      body: Column(
        children: [
          // Category filters - horizontal scrolling chips
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _buildCategoryChip(
                  context: context,
                  id: null,
                  label: 'templates.all'.tr(),
                  icon: Icons.grid_view_rounded,
                  count: _templateService.totalTemplates,
                  isSelected: _selectedCategory == null,
                  isDark: isDark,
                ),
                const SizedBox(width: 8),
                ..._templateService.categoriesWithCounts
                    .where((c) => c.count > 0)
                    .map((category) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: _buildCategoryChip(
                            context: context,
                            id: category.id,
                            label: category.name,
                            icon: _getCategoryIcon(category.id),
                            count: category.count,
                            isSelected: _selectedCategory == category.id,
                            isDark: isDark,
                          ),
                        )),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Templates grid
          Expanded(
            child: _buildBody(),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip({
    required BuildContext context,
    required String? id,
    required String label,
    required IconData icon,
    required int count,
    required bool isSelected,
    required bool isDark,
  }) {
    final primaryColor = Theme.of(context).primaryColor;

    return GestureDetector(
      onTap: () => _onCategorySelected(id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? primaryColor.withValues(alpha:0.15)
              : (isDark ? Colors.white10 : Colors.grey.shade100),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? primaryColor.withValues(alpha:0.4)
                : (isDark ? Colors.white12 : Colors.grey.shade200),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected
                  ? primaryColor
                  : (isDark ? Colors.white70 : Colors.grey.shade700),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected
                    ? primaryColor
                    : (isDark ? Colors.white70 : Colors.grey.shade700),
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isSelected
                      ? primaryColor.withValues(alpha:0.2)
                      : (isDark ? Colors.white12 : Colors.grey.shade200),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isSelected
                        ? primaryColor
                        : (isDark ? Colors.white60 : Colors.grey.shade600),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIcon(String categoryId) {
    switch (categoryId.toLowerCase()) {
      case 'software_development':
        return Icons.code_rounded;
      case 'marketing':
        return Icons.campaign_rounded;
      case 'hr':
        return Icons.people_rounded;
      case 'design':
        return Icons.palette_rounded;
      case 'business':
        return Icons.business_rounded;
      case 'events':
        return Icons.event_rounded;
      case 'research':
        return Icons.science_rounded;
      case 'personal':
        return Icons.person_rounded;
      case 'sales':
        return Icons.trending_up_rounded;
      case 'finance':
        return Icons.account_balance_rounded;
      case 'it_support':
        return Icons.support_agent_rounded;
      case 'education':
        return Icons.school_rounded;
      case 'freelance':
        return Icons.work_outline_rounded;
      case 'operations':
        return Icons.settings_rounded;
      default:
        return Icons.folder_rounded;
    }
  }

  Widget _buildBody() {
    if (_isLoading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text('templates.loading'.tr()),
          ],
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 48,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'templates.failed_to_load'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                _error!,
                style: TextStyle(color: Colors.grey.shade600),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadTemplates,
              icon: const Icon(Icons.refresh),
              label: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    final templates = _templateService.filteredTemplates;

    if (templates.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.dashboard_customize_outlined,
              size: 48,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty
                  ? 'templates.no_results'.tr()
                  : 'templates.no_templates'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                _searchQuery.isNotEmpty
                    ? 'templates.try_different_search'.tr()
                    : 'templates.templates_coming_soon'.tr(),
                style: TextStyle(color: Colors.grey.shade600),
                textAlign: TextAlign.center,
              ),
            ),
            if (_searchQuery.isNotEmpty) ...[
              const SizedBox(height: 16),
              TextButton.icon(
                onPressed: () {
                  _searchController.clear();
                  _onSearchChanged('');
                },
                icon: const Icon(Icons.clear),
                label: Text('templates.clear_search'.tr()),
              ),
            ],
          ],
        ),
      );
    }

    // Show featured section if no category selected and no search
    final showFeatured = _selectedCategory == null &&
        _searchQuery.isEmpty &&
        _templateService.featuredTemplates.isNotEmpty;

    return RefreshIndicator(
      onRefresh: _loadTemplates,
      child: CustomScrollView(
        controller: _scrollController,
        slivers: [
          // Featured templates section
          if (showFeatured) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: Row(
                  children: [
                    Icon(
                      Icons.star,
                      size: 20,
                      color: Colors.amber.shade600,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'templates.featured'.tr(),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 220,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: _templateService.featuredTemplates.length,
                  itemBuilder: (context, index) {
                    final template = _templateService.featuredTemplates[index];
                    return Container(
                      width: 280,
                      padding: const EdgeInsets.all(4),
                      child: TemplateCard(
                        template: template,
                        onTap: () => _onTemplateSelected(template),
                        showCategory: true,
                      ),
                    );
                  },
                ),
              ),
            ),
            const SliverToBoxAdapter(
              child: SizedBox(height: 8),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: Text(
                  'templates.all_templates'.tr(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
            ),
          ],

          // All templates grid - using SliverList instead of SliverGrid for better overflow handling
          SliverPadding(
            padding: const EdgeInsets.all(12),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 0.75, // Adjusted for better card fit
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final template = templates[index];
                  return TemplateCard(
                    template: template,
                    onTap: () => _onTemplateSelected(template),
                    showCategory: _selectedCategory == null,
                  );
                },
                childCount: templates.length,
              ),
            ),
          ),

          // Pagination controls
          if (_templateService.totalPages > 1)
            SliverToBoxAdapter(
              child: _buildPaginationControls(context),
            ),

          // Bottom padding
          const SliverToBoxAdapter(
            child: SizedBox(height: 20),
          ),
        ],
      ),
    );
  }

  Widget _buildPaginationControls(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = Theme.of(context).primaryColor;
    final service = _templateService;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        children: [
          // Divider
          Divider(
            color: isDark ? Colors.white12 : Colors.grey.shade200,
          ),
          const SizedBox(height: 8),

          // Pagination info
          Text(
            'templates.page_info'.tr(args: [
              '${((service.currentPage - 1) * TemplateService.templatesPerPage) + 1}',
              '${(service.currentPage * TemplateService.templatesPerPage).clamp(1, service.totalTemplates)}',
              '${service.totalTemplates}',
            ]),
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white54 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 12),

          // Pagination buttons - wrapped in SingleChildScrollView for smaller screens
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Previous button (icon only on small screens)
                _buildPaginationIconButton(
                  context: context,
                  icon: Icons.chevron_left_rounded,
                  onPressed: service.hasPrevious ? () => service.previousPage() : null,
                  isDark: isDark,
                  primaryColor: primaryColor,
                ),
                const SizedBox(width: 4),

                // Page numbers
                ...List.generate(
                  _getVisiblePageCount(),
                  (index) {
                    final pageNum = _getPageNumber(index);
                    final isCurrentPage = pageNum == service.currentPage;

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: GestureDetector(
                        onTap: isCurrentPage ? null : () => service.goToPage(pageNum),
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: isCurrentPage
                                ? primaryColor
                                : (isDark ? Colors.white10 : Colors.grey.shade100),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isCurrentPage
                                  ? primaryColor
                                  : (isDark ? Colors.white12 : Colors.grey.shade200),
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '$pageNum',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isCurrentPage ? FontWeight.w600 : FontWeight.w500,
                              color: isCurrentPage
                                  ? Colors.white
                                  : (isDark ? Colors.white70 : Colors.grey.shade700),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(width: 4),

                // Next button (icon only on small screens)
                _buildPaginationIconButton(
                  context: context,
                  icon: Icons.chevron_right_rounded,
                  onPressed: service.hasMore ? () => service.nextPage() : null,
                  isDark: isDark,
                  primaryColor: primaryColor,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaginationIconButton({
    required BuildContext context,
    required IconData icon,
    required VoidCallback? onPressed,
    required bool isDark,
    required Color primaryColor,
  }) {
    final isEnabled = onPressed != null;

    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: 36,
        height: 32,
        decoration: BoxDecoration(
          color: isEnabled
              ? (isDark ? Colors.white10 : Colors.grey.shade100)
              : (isDark ? Colors.white.withValues(alpha: 0.05) : Colors.grey.shade50),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isDark ? Colors.white12 : Colors.grey.shade200,
          ),
        ),
        alignment: Alignment.center,
        child: Icon(
          icon,
          size: 20,
          color: isEnabled
              ? (isDark ? Colors.white70 : Colors.grey.shade700)
              : (isDark ? Colors.white30 : Colors.grey.shade400),
        ),
      ),
    );
  }

  int _getVisiblePageCount() {
    final totalPages = _templateService.totalPages;
    return totalPages <= 5 ? totalPages : 5;
  }

  int _getPageNumber(int index) {
    final currentPage = _templateService.currentPage;
    final totalPages = _templateService.totalPages;

    if (totalPages <= 5) {
      return index + 1;
    } else if (currentPage <= 3) {
      return index + 1;
    } else if (currentPage >= totalPages - 2) {
      return totalPages - 4 + index;
    } else {
      return currentPage - 2 + index;
    }
  }
}
