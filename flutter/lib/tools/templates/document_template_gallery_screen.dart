import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../api/services/document_template_api_service.dart';
import '../../models/template/document_template.dart';
import '../../services/workspace_management_service.dart';
import 'document_template_constants.dart';
import 'widgets/document_template_card.dart';
import 'document_template_preview_screen.dart';

/// Document Templates Gallery Screen with pagination
class DocumentTemplateGalleryScreen extends StatefulWidget {
  const DocumentTemplateGalleryScreen({super.key});

  @override
  State<DocumentTemplateGalleryScreen> createState() =>
      _DocumentTemplateGalleryScreenState();
}

class _DocumentTemplateGalleryScreenState
    extends State<DocumentTemplateGalleryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  final _apiService = DocumentTemplateApiService.instance;

  // Pagination constants
  static const int _pageSize = 20;

  List<DocumentTemplate> _templates = [];
  List<DocumentTypeInfo> _types = [];
  bool _isLoading = true;
  String? _error;
  DocumentType? _selectedType;
  String? _selectedCategory;
  String _searchQuery = '';

  // Pagination state
  int _currentPage = 1;
  int _totalTemplates = 0;
  int _totalPages = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) {
      setState(() {
        switch (_tabController.index) {
          case 0:
            _selectedType = null;
            break;
          case 1:
            _selectedType = DocumentType.proposal;
            break;
          case 2:
            _selectedType = DocumentType.contract;
            break;
          case 3:
            _selectedType = DocumentType.invoice;
            break;
          case 4:
            _selectedType = DocumentType.sow;
            break;
        }
        _selectedCategory = null;
        _currentPage = 1;
        _templates = [];
      });
      _loadTemplates();
    }
  }

  Future<void> _loadData() async {
    await Future.wait([
      _loadTemplates(),
      _loadTypes(),
    ]);
  }

  Future<void> _loadTemplates({bool refresh = false}) async {
    final workspaceId =
        context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    if (refresh) {
      setState(() {
        _currentPage = 1;
        _templates = [];
      });
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _apiService.getTemplatesPaginated(
        workspaceId: workspaceId,
        documentType: _selectedType,
        category: _selectedCategory,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
        page: _currentPage,
        limit: _pageSize,
      );

      setState(() {
        _templates = response.templates;
        _totalTemplates = response.pagination.total;
        _totalPages = (response.pagination.total / _pageSize).ceil();
        _isLoading = false;
      });

      // Scroll to top when page changes
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          0,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _goToPage(int page) {
    if (page < 1 || page > _totalPages || page == _currentPage) return;
    setState(() {
      _currentPage = page;
    });
    _loadTemplates();
  }

  void _nextPage() {
    if (_currentPage < _totalPages) {
      _goToPage(_currentPage + 1);
    }
  }

  void _previousPage() {
    if (_currentPage > 1) {
      _goToPage(_currentPage - 1);
    }
  }

  bool get _hasPrevious => _currentPage > 1;
  bool get _hasNext => _currentPage < _totalPages;

  bool _isSearching = false;

  Future<void> _loadTypes() async {
    final workspaceId =
        context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      final types = await _apiService.getDocumentTypes(workspaceId: workspaceId);
      setState(() {
        _types = types;
      });
    } catch (e) {
      // Silently fail - types are optional
    }
  }

  void _onSearch(String query) {
    setState(() {
      _searchQuery = query;
      _currentPage = 1;
      _templates = [];
    });
    _loadTemplates();
  }

  void _onCategorySelected(String? category) {
    setState(() {
      _selectedCategory = category;
      _currentPage = 1;
      _templates = [];
    });
    _loadTemplates();
  }

  void _onTemplateSelected(DocumentTemplate template) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => DocumentTemplatePreviewScreen(template: template),
      ),
    );
  }

  void _toggleSearch() {
    setState(() {
      _isSearching = !_isSearching;
      if (!_isSearching) {
        _searchController.clear();
        _onSearch('');
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
                onChanged: _onSearch,
                style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                decoration: InputDecoration(
                  hintText: 'document_templates.search_placeholder'.tr(),
                  hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                ),
              )
            : Text('document_templates.title'.tr()),
        centerTitle: !_isSearching,
        actions: [
          if (!_isSearching)
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: _toggleSearch,
              tooltip: 'document_templates.search_placeholder'.tr(),
            ),
          if (_isSearching && _searchQuery.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _searchController.clear();
                _onSearch('');
              },
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: [
            Tab(text: 'common.all'.tr()),
            Tab(text: 'document_templates.proposals'.tr()),
            Tab(text: 'document_templates.contracts'.tr()),
            Tab(text: 'document_templates.invoices'.tr()),
            Tab(text: 'document_templates.sows'.tr()),
          ],
        ),
      ),
      body: Column(
        children: [
          // Category chips
          if (_selectedType != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: _buildCategoryChips(isDark),
            ),

          // Content
          Expanded(
            child: _buildContent(isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChips(bool isDark) {
    final categories =
        DocumentTemplateConstants.getCategoriesForType(_selectedType!);

    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length + 1,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          if (index == 0) {
            return FilterChip(
              label: Text('common.all'.tr()),
              selected: _selectedCategory == null,
              onSelected: (_) => _onCategorySelected(null),
              backgroundColor: context.cardColor,
              selectedColor: Theme.of(context).primaryColor.withValues(alpha: 0.2),
            );
          }

          final category = categories[index - 1];
          return FilterChip(
            label: Text(category.name),
            selected: _selectedCategory == category.id,
            onSelected: (_) => _onCategorySelected(category.id),
            backgroundColor: context.cardColor,
            selectedColor: Theme.of(context).primaryColor.withValues(alpha: 0.2),
          );
        },
      ),
    );
  }

  Widget _buildContent(bool isDark) {
    if (_isLoading && _templates.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text('document_templates.loading'.tr()),
          ],
        ),
      );
    }

    if (_error != null && _templates.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 48,
              color: Colors.red[300],
            ),
            const SizedBox(height: 16),
            Text(
              'document_templates.error_loading'.tr(),
              style: TextStyle(
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => _loadTemplates(refresh: true),
              child: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_templates.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.description_outlined,
              size: 48,
              color: isDark ? Colors.white38 : Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty
                  ? 'document_templates.no_results'.tr()
                  : 'document_templates.no_templates'.tr(),
              style: TextStyle(
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
            ),
            if (_searchQuery.isNotEmpty) ...[
              const SizedBox(height: 16),
              TextButton.icon(
                onPressed: () {
                  _searchController.clear();
                  _onSearch('');
                },
                icon: const Icon(Icons.clear),
                label: Text('templates.clear_search'.tr()),
              ),
            ],
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadTemplates(refresh: true),
      child: CustomScrollView(
        controller: _scrollController,
        slivers: [
          // Templates grid
          SliverPadding(
            padding: const EdgeInsets.all(12),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 0.85,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final template = _templates[index];
                  return DocumentTemplateCard(
                    template: template,
                    onTap: () => _onTemplateSelected(template),
                  );
                },
                childCount: _templates.length,
              ),
            ),
          ),

          // Pagination controls
          if (_totalPages > 1)
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
              '${((_currentPage - 1) * _pageSize) + 1}',
              '${(_currentPage * _pageSize).clamp(1, _totalTemplates)}',
              '$_totalTemplates',
            ]),
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white54 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 12),

          // Pagination buttons
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Previous button
                _buildPaginationIconButton(
                  context: context,
                  icon: Icons.chevron_left_rounded,
                  onPressed: _hasPrevious ? _previousPage : null,
                  isDark: isDark,
                  primaryColor: primaryColor,
                ),
                const SizedBox(width: 4),

                // Page numbers
                ...List.generate(
                  _getVisiblePageCount(),
                  (index) {
                    final pageNum = _getPageNumber(index);
                    final isCurrentPage = pageNum == _currentPage;

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: GestureDetector(
                        onTap: isCurrentPage ? null : () => _goToPage(pageNum),
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

                // Next button
                _buildPaginationIconButton(
                  context: context,
                  icon: Icons.chevron_right_rounded,
                  onPressed: _hasNext ? _nextPage : null,
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
    return _totalPages <= 5 ? _totalPages : 5;
  }

  int _getPageNumber(int index) {
    if (_totalPages <= 5) {
      return index + 1;
    } else if (_currentPage <= 3) {
      return index + 1;
    } else if (_currentPage >= _totalPages - 2) {
      return _totalPages - 4 + index;
    } else {
      return _currentPage - 2 + index;
    }
  }
}
