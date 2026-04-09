import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../api/services/document_api_service.dart';
import '../../models/document/document.dart';
import '../../models/template/document_template.dart';
import '../../services/workspace_management_service.dart';
import 'widgets/document_card.dart';
import 'widgets/document_status_badge.dart';
import 'create_document_screen.dart';
import 'document_detail_screen.dart';

/// Document Builder main screen - shows list of created documents
class DocumentBuilderScreen extends StatefulWidget {
  const DocumentBuilderScreen({super.key});

  @override
  State<DocumentBuilderScreen> createState() => _DocumentBuilderScreenState();
}

class _DocumentBuilderScreenState extends State<DocumentBuilderScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  final _apiService = DocumentApiService.instance;
  final _searchFocusNode = FocusNode();

  List<Document> _documents = [];
  DocumentStats? _stats;
  bool _isLoading = true;
  String? _error;
  DocumentType? _selectedType;
  DocumentStatus? _selectedStatus;
  String _searchQuery = '';
  bool _isSearchExpanded = false;

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
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _toggleSearch() {
    setState(() {
      _isSearchExpanded = !_isSearchExpanded;
      if (_isSearchExpanded) {
        _searchFocusNode.requestFocus();
      } else {
        _searchController.clear();
        _searchQuery = '';
        _loadDocuments();
      }
    });
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
        _selectedStatus = null;
      });
      _loadDocuments();
    }
  }

  Future<void> _loadData() async {
    await Future.wait([
      _loadDocuments(),
      _loadStats(),
    ]);
  }

  Future<void> _loadDocuments() async {
    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() {
        _isLoading = false;
        _documents = [];
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final documents = await _apiService.getDocuments(
        workspaceId: workspaceId,
        documentType: _selectedType,
        status: _selectedStatus,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
      );
      setState(() {
        _documents = documents;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadStats() async {
    final workspaceId = context.read<WorkspaceManagementService>().currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      final stats = await _apiService.getStats(workspaceId: workspaceId);
      setState(() {
        _stats = stats;
      });
    } catch (e) {
      // Silently fail - stats are optional
    }
  }

  void _onSearch(String query) {
    setState(() {
      _searchQuery = query;
    });
    _loadDocuments();
  }

  void _onStatusFilterChanged(DocumentStatus? status) {
    setState(() {
      _selectedStatus = status;
    });
    _loadDocuments();
  }

  void _onDocumentTap(Document document) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => DocumentDetailScreen(documentId: document.id),
      ),
    ).then((_) => _loadData());
  }

  void _onCreateDocument() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const CreateDocumentScreen(),
      ),
    ).then((result) {
      if (result == true) {
        _loadData();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: _isSearchExpanded
            ? TextField(
                controller: _searchController,
                focusNode: _searchFocusNode,
                onChanged: _onSearch,
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black87,
                  fontSize: 16,
                ),
                decoration: InputDecoration(
                  hintText: 'document_builder.search_placeholder'.tr(),
                  hintStyle: TextStyle(
                    color: isDark ? Colors.white54 : Colors.grey[500],
                  ),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                ),
                onSubmitted: (_) {
                  if (_searchController.text.isEmpty) {
                    _toggleSearch();
                  }
                },
              )
            : Text('document_builder.title'.tr()),
        actions: [
          // Search icon/close button
          IconButton(
            icon: Icon(_isSearchExpanded ? Icons.close : Icons.search),
            onPressed: _toggleSearch,
            tooltip: _isSearchExpanded ? 'Close' : 'Search',
          ),
          // Filter button
          PopupMenuButton<DocumentStatus?>(
            icon: Stack(
              children: [
                const Icon(Icons.filter_list),
                if (_selectedStatus != null)
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: Theme.of(context).primaryColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
            tooltip: 'Filter by status',
            onSelected: _onStatusFilterChanged,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: null,
                child: Row(
                  children: [
                    Icon(
                      Icons.all_inclusive,
                      size: 18,
                      color: _selectedStatus == null
                          ? Theme.of(context).primaryColor
                          : (isDark ? Colors.white54 : Colors.grey[600]),
                    ),
                    const SizedBox(width: 12),
                    Text('document_builder.status_all'.tr()),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              PopupMenuItem(
                value: DocumentStatus.draft,
                child: Row(
                  children: [
                    Icon(
                      Icons.edit_outlined,
                      size: 18,
                      color: _selectedStatus == DocumentStatus.draft
                          ? Theme.of(context).primaryColor
                          : (isDark ? Colors.white54 : Colors.grey[600]),
                    ),
                    const SizedBox(width: 12),
                    Text('document_builder.status_draft'.tr()),
                  ],
                ),
              ),
              PopupMenuItem(
                value: DocumentStatus.pendingSignature,
                child: Row(
                  children: [
                    Icon(
                      Icons.pending_outlined,
                      size: 18,
                      color: _selectedStatus == DocumentStatus.pendingSignature
                          ? Theme.of(context).primaryColor
                          : (isDark ? Colors.white54 : Colors.grey[600]),
                    ),
                    const SizedBox(width: 12),
                    Text('document_builder.status_pending'.tr()),
                  ],
                ),
              ),
              PopupMenuItem(
                value: DocumentStatus.signed,
                child: Row(
                  children: [
                    Icon(
                      Icons.check_circle_outline,
                      size: 18,
                      color: _selectedStatus == DocumentStatus.signed
                          ? Theme.of(context).primaryColor
                          : (isDark ? Colors.white54 : Colors.grey[600]),
                    ),
                    const SizedBox(width: 12),
                    Text('document_builder.status_signed'.tr()),
                  ],
                ),
              ),
              PopupMenuItem(
                value: DocumentStatus.archived,
                child: Row(
                  children: [
                    Icon(
                      Icons.archive_outlined,
                      size: 18,
                      color: _selectedStatus == DocumentStatus.archived
                          ? Theme.of(context).primaryColor
                          : (isDark ? Colors.white54 : Colors.grey[600]),
                    ),
                    const SizedBox(width: 12),
                    Text('document_builder.status_archived'.tr()),
                  ],
                ),
              ),
            ],
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: [
            Tab(text: 'common.all'.tr()),
            Tab(text: 'document_builder.filter_proposals'.tr()),
            Tab(text: 'document_builder.filter_contracts'.tr()),
            Tab(text: 'document_builder.filter_invoices'.tr()),
            Tab(text: 'document_builder.filter_sows'.tr()),
          ],
        ),
      ),
      body: Column(
        children: [
          // Stats row (if available)
          if (_stats != null && !_isLoading)
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: _buildStatsRow(isDark),
            ),

          // Content
          Expanded(
            child: _buildContent(isDark),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _onCreateDocument,
        icon: const Icon(Icons.add),
        label: Text('document_builder.new_document'.tr()),
      ),
    );
  }

  Widget _buildStatsRow(bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.borderColor),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem(
            'Total',
            _stats!.total.toString(),
            isDark,
          ),
          _buildStatItem(
            'Draft',
            (_stats!.byStatus['draft'] ?? 0).toString(),
            isDark,
          ),
          _buildStatItem(
            'Pending',
            (_stats!.byStatus['pending_signature'] ?? 0).toString(),
            isDark,
          ),
          _buildStatItem(
            'Signed',
            (_stats!.byStatus['signed'] ?? 0).toString(),
            isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, bool isDark) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: isDark ? Colors.white54 : Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildContent(bool isDark) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
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
              color: Colors.red[300],
            ),
            const SizedBox(height: 16),
            Text(
              'document_builder.error_loading'.tr(),
              style: TextStyle(
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadDocuments,
              child: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_documents.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.description_outlined,
              size: 64,
              color: isDark ? Colors.white24 : Colors.grey[300],
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty
                  ? 'document_builder.no_results'.tr()
                  : 'document_builder.no_documents'.tr(),
              style: TextStyle(
                fontSize: 16,
                color: isDark ? Colors.white70 : Colors.grey[700],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'document_builder.no_documents_hint'.tr(),
              style: TextStyle(
                fontSize: 13,
                color: isDark ? Colors.white38 : Colors.grey[500],
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _onCreateDocument,
              icon: const Icon(Icons.add),
              label: Text('document_builder.create_first'.tr()),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _documents.length,
        itemBuilder: (context, index) {
          final document = _documents[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: DocumentCard(
              document: document,
              onTap: () => _onDocumentTap(document),
            ),
          );
        },
      ),
    );
  }
}
