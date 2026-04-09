import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../api/services/document_api_service.dart';
import '../../api/services/document_template_api_service.dart';
import '../../models/template/document_template.dart';
import '../../services/workspace_management_service.dart';
import '../templates/document_template_constants.dart';
import '../templates/document_template_preview_screen.dart';
import 'blank_document_screen.dart';

/// Screen for creating a new document from a template
class CreateDocumentScreen extends StatefulWidget {
  const CreateDocumentScreen({super.key});

  @override
  State<CreateDocumentScreen> createState() => _CreateDocumentScreenState();
}

class _CreateDocumentScreenState extends State<CreateDocumentScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _templateApiService = DocumentTemplateApiService.instance;
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  // Pagination constants
  static const int _pageSize = 20;

  List<DocumentTemplate> _templates = [];
  bool _isLoading = true;
  String? _error;
  DocumentType? _selectedType;
  String _searchQuery = '';
  bool _isSearching = false;

  // Pagination state
  int _currentPage = 1;
  int _totalTemplates = 0;
  int _totalPages = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadTemplates();
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
        _currentPage = 1;
        _templates = [];
      });
      _loadTemplates();
    }
  }

  Future<void> _loadTemplates({bool refresh = false}) async {
    final workspaceId =
        context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() {
        _isLoading = false;
        _templates = [];
      });
      return;
    }

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
      final response = await _templateApiService.getTemplatesPaginated(
        workspaceId: workspaceId,
        documentType: _selectedType,
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

  void _onSearch(String query) {
    setState(() {
      _searchQuery = query;
      _currentPage = 1;
      _templates = [];
    });
    _loadTemplates();
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

  void _onTemplateSelected(DocumentTemplate template) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => DocumentTemplatePreviewScreen(template: template),
      ),
    ).then((result) {
      if (result == true) {
        Navigator.pop(context, true);
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
                  hintText: 'document_builder.search_templates'.tr(),
                  hintStyle:
                      TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                ),
              )
            : Text('document_builder.new_document'.tr()),
        centerTitle: !_isSearching,
        actions: [
          if (!_isSearching)
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: _toggleSearch,
              tooltip: 'document_builder.search_templates'.tr(),
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
      body: _buildContent(isDark),
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
              'document_builder.error_loading_templates'.tr(),
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
                  : 'document_builder.no_templates'.tr(),
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
          // Create Blank Document Card
          SliverToBoxAdapter(
            child: _buildCreateBlankCard(isDark),
          ),

          // Section divider
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Divider(
                      color: isDark ? Colors.white12 : Colors.grey[300],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      'or choose from templates',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.white38 : Colors.grey[500],
                      ),
                    ),
                  ),
                  Expanded(
                    child: Divider(
                      color: isDark ? Colors.white12 : Colors.grey[300],
                    ),
                  ),
                ],
              ),
            ),
          ),

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
                  return _buildTemplateCard(template, isDark);
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

  void _openBlankDocumentScreen() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const BlankDocumentScreen(),
      ),
    ).then((result) {
      if (result == true) {
        Navigator.pop(context, true);
      }
    });
  }

  Widget _buildCreateBlankCard(bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
      child: InkWell(
        onTap: _openBlankDocumentScreen,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Theme.of(context).primaryColor.withValues(alpha: 0.15),
                Theme.of(context).primaryColor.withValues(alpha: 0.05),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Theme.of(context).primaryColor.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Theme.of(context).primaryColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.edit_document,
                  color: Theme.of(context).primaryColor,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Create Blank Document',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Start from scratch with pre-structured sections',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.white60 : Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.arrow_forward_ios,
                size: 16,
                color: isDark ? Colors.white38 : Colors.grey[400],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTemplateCard(DocumentTemplate template, bool isDark) {
    final color = template.color != null
        ? DocumentTemplateConstants.parseColor(template.color)
        : DocumentTemplateConstants.getDocumentTypeColor(template.documentType);

    return InkWell(
      onTap: () => _onTemplateSelected(template),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha:0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                template.icon != null
                    ? DocumentTemplateConstants.getIconFromName(template.icon)
                    : DocumentTemplateConstants.getDocumentTypeIcon(
                        template.documentType),
                color: color,
                size: 22,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              template.name,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black87,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            if (template.description != null)
              Expanded(
                child: Text(
                  template.description!,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.white54 : Colors.grey[600],
                    height: 1.3,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              )
            else
              const Spacer(),
            const SizedBox(height: 8),
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha:0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    template.documentType.singularName,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: color,
                    ),
                  ),
                ),
                const Spacer(),
                if (template.requiresSignature)
                  Icon(
                    Icons.draw_outlined,
                    size: 14,
                    color: isDark ? Colors.white38 : Colors.grey[500],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Screen for filling template placeholders and creating a document
class FillTemplateScreen extends StatefulWidget {
  final DocumentTemplate template;

  const FillTemplateScreen({super.key, required this.template});

  @override
  State<FillTemplateScreen> createState() => _FillTemplateScreenState();
}

class _FillTemplateScreenState extends State<FillTemplateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final Map<String, TextEditingController> _placeholderControllers = {};
  final _templateApiService = DocumentTemplateApiService.instance;

  DocumentTemplate? _fullTemplate;
  bool _isLoading = true;
  bool _isCreating = false;

  DocumentTemplate get template => _fullTemplate ?? widget.template;

  @override
  void initState() {
    super.initState();
    _titleController.text =
        'New ${widget.template.documentType.singularName}';
    _loadFullTemplate();
  }

  Future<void> _loadFullTemplate() async {
    final workspaceId =
        context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) {
      _initializePlaceholderControllers(widget.template);
      setState(() => _isLoading = false);
      return;
    }

    try {
      final fullTemplate = await _templateApiService.getTemplateById(
        workspaceId: workspaceId,
        idOrSlug: widget.template.id,
      );
      if (mounted) {
        setState(() {
          _fullTemplate = fullTemplate;
          _isLoading = false;
        });
        _initializePlaceholderControllers(fullTemplate);
      }
    } catch (e) {
      if (mounted) {
        // Fallback to widget.template if fetch fails
        _initializePlaceholderControllers(widget.template);
        setState(() {
          _fullTemplate = widget.template;
          _isLoading = false;
        });
      }
    }
  }

  void _initializePlaceholderControllers(DocumentTemplate tmpl) {
    // Clear existing controllers
    for (final controller in _placeholderControllers.values) {
      controller.dispose();
    }
    _placeholderControllers.clear();

    // Initialize controllers for each placeholder
    for (final placeholder in tmpl.placeholders) {
      _placeholderControllers[placeholder.key] = TextEditingController(
        text: placeholder.defaultValue,
      );
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    for (final controller in _placeholderControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _createDocument() async {
    if (!_formKey.currentState!.validate()) return;

    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('document_builder.no_workspace'.tr()),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() {
      _isCreating = true;
    });

    try {
      // Collect placeholder values
      final placeholderValues = <String, dynamic>{};
      for (final entry in _placeholderControllers.entries) {
        placeholderValues[entry.key] = entry.value.text;
      }

      // Call API to create document
      await DocumentApiService.instance.createDocument(
        workspaceId: workspaceId,
        templateId: template.id,
        title: _titleController.text,
        documentType: template.documentType,
        content: template.content,
        placeholderValues: placeholderValues,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('document_builder.document_created'.tr()),
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('document_builder.error_creating'.tr()),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isCreating = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = template.color != null
        ? DocumentTemplateConstants.parseColor(template.color)
        : DocumentTemplateConstants.getDocumentTypeColor(
            template.documentType);

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: Text('document_builder.fill_details'.tr()),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text('document_templates.loading'.tr()),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('document_builder.fill_details'.tr()),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Template info header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(
                    template.icon != null
                        ? DocumentTemplateConstants.getIconFromName(
                            template.icon)
                        : DocumentTemplateConstants.getDocumentTypeIcon(
                            template.documentType),
                    color: color,
                    size: 28,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          template.name,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        if (template.description != null)
                          Text(
                            template.description!,
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.white54 : Colors.grey[600],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Document title
            TextFormField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: 'document_builder.document_title'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'document_builder.title_required'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 24),

            // Placeholder fields
            if (template.placeholders.isNotEmpty) ...[
              Text(
                'document_builder.fill_placeholders'.tr(),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: isDark ? Colors.white70 : Colors.grey[700],
                ),
              ),
              const SizedBox(height: 16),
              ...template.placeholders.map((placeholder) {
                // Check if this is a date field
                if (placeholder.type.toLowerCase() == 'date') {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _buildDatePickerField(placeholder, isDark),
                  );
                }

                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: TextFormField(
                    controller: _placeholderControllers[placeholder.key],
                    decoration: InputDecoration(
                      labelText: placeholder.label,
                      helperText: placeholder.helpText,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      prefixIcon: Icon(
                        DocumentTemplateConstants.getPlaceholderTypeIcon(
                            placeholder.type),
                      ),
                    ),
                    keyboardType: _getKeyboardType(placeholder.type),
                    maxLines: placeholder.type == 'textarea' ? 3 : 1,
                    validator: (value) {
                      if (placeholder.required &&
                          (value == null || value.isEmpty)) {
                        return '${placeholder.label} is required';
                      }
                      return null;
                    },
                  ),
                );
              }),
            ],
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: _isCreating ? null : _createDocument,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: _isCreating
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(
                    'document_builder.create_document'.tr(),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildDatePickerField(TemplatePlaceholder placeholder, bool isDark) {
    final controller = _placeholderControllers[placeholder.key]!;

    return FormField<String>(
      initialValue: controller.text,
      validator: (value) {
        if (placeholder.required && (controller.text.isEmpty)) {
          return '${placeholder.label} is required';
        }
        return null;
      },
      builder: (FormFieldState<String> state) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InkWell(
              onTap: () async {
                final DateTime? picked = await showDatePicker(
                  context: context,
                  initialDate: _parseDate(controller.text) ?? DateTime.now(),
                  firstDate: DateTime(2000),
                  lastDate: DateTime(2100),
                  builder: (context, child) {
                    return Theme(
                      data: Theme.of(context).copyWith(
                        colorScheme: ColorScheme.light(
                          primary: Theme.of(context).primaryColor,
                          onPrimary: Colors.white,
                          surface: isDark ? Colors.grey[900]! : Colors.white,
                          onSurface: isDark ? Colors.white : Colors.black,
                        ),
                        dialogBackgroundColor: isDark ? Colors.grey[900] : Colors.white,
                      ),
                      child: child!,
                    );
                  },
                );
                if (picked != null) {
                  final formattedDate = _formatDate(picked);
                  controller.text = formattedDate;
                  state.didChange(formattedDate);
                  setState(() {}); // Refresh UI
                }
              },
              child: InputDecorator(
                decoration: InputDecoration(
                  labelText: placeholder.label,
                  helperText: placeholder.helpText,
                  errorText: state.errorText,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: const Icon(Icons.calendar_today),
                  suffixIcon: controller.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            controller.clear();
                            state.didChange('');
                            setState(() {}); // Refresh UI
                          },
                        )
                      : null,
                ),
                child: Text(
                  controller.text.isEmpty
                      ? 'Select date'
                      : controller.text,
                  style: TextStyle(
                    color: controller.text.isEmpty
                        ? (isDark ? Colors.white38 : Colors.grey[500])
                        : (isDark ? Colors.white : Colors.black87),
                    fontSize: 16,
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  DateTime? _parseDate(String dateStr) {
    if (dateStr.isEmpty) return null;
    try {
      // Try to parse common date formats
      final parts = dateStr.split(RegExp(r'[/\-]'));
      if (parts.length == 3) {
        // Handle MM/DD/YYYY or DD/MM/YYYY or YYYY-MM-DD
        if (parts[0].length == 4) {
          // YYYY-MM-DD
          return DateTime(
            int.parse(parts[0]),
            int.parse(parts[1]),
            int.parse(parts[2]),
          );
        } else {
          // MM/DD/YYYY
          return DateTime(
            int.parse(parts[2]),
            int.parse(parts[0]),
            int.parse(parts[1]),
          );
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
    return null;
  }

  String _formatDate(DateTime date) {
    // Format as MM/DD/YYYY
    return '${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}/${date.year}';
  }

  TextInputType _getKeyboardType(String type) {
    switch (type.toLowerCase()) {
      case 'number':
        return TextInputType.number;
      case 'email':
        return TextInputType.emailAddress;
      case 'currency':
        return TextInputType.numberWithOptions(decimal: true);
      case 'date':
        return TextInputType.datetime;
      default:
        return TextInputType.text;
    }
  }
}
