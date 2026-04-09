import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/file_service.dart';
import '../widgets/file_upload_widget.dart';
import '../widgets/file_download_widget.dart';
import '../widgets/file_preview_widget.dart';
import '../widgets/file_share_widget.dart';
import '../widgets/file_search_widget.dart';

// Simple data models (no API dependency)
class SimpleFile {
  final String id;
  final String name;
  final int size;
  final String mimeType;
  final DateTime updatedAt;

  SimpleFile({
    required this.id,
    required this.name,
    required this.size,
    required this.mimeType,
    required this.updatedAt,
  });
}

class SimpleFolder {
  final String id;
  final String name;

  SimpleFolder({
    required this.id,
    required this.name,
  });
}

/// Enhanced files screen with comprehensive file management capabilities
class EnhancedFilesScreen extends StatefulWidget {
  final String workspaceId;
  final String? folderId;

  const EnhancedFilesScreen({
    super.key,
    required this.workspaceId,
    this.folderId,
  });

  @override
  State<EnhancedFilesScreen> createState() => _EnhancedFilesScreenState();
}

class _EnhancedFilesScreenState extends State<EnhancedFilesScreen> with TickerProviderStateMixin {
  late TabController _tabController;
  late ScrollController _scrollController;

  // View state
  String _viewMode = 'grid'; // 'grid', 'list'
  bool _isSearchMode = false;
  String _sortBy = 'modified'; // 'name', 'size', 'modified', 'type'
  String _sortOrder = 'desc'; // 'asc', 'desc'

  // Data
  List<SimpleFile> _files = [];
  List<SimpleFolder> _folders = [];
  List<SimpleFile> _searchResults = [];
  SimpleFile? _selectedFile;
  bool _isLoading = false;
  bool _hasMoreFiles = false;
  int _currentPage = 1;

  // Selection
  final Set<String> _selectedFileIds = {};
  bool _isSelectionMode = false;

  // Workspace data
  String _currentWorkspaceName = 'My Company';
  final List<Map<String, String>> _workspaces = [
    {'id': '1', 'name': 'My Company'},
    {'id': '2', 'name': 'Personal Workspace'},
    {'id': '3', 'name': 'Team Projects'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _scrollController = ScrollController();
    _scrollController.addListener(_onScroll);

    // Initialize file service
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final fileService = Provider.of<FileService>(context, listen: false);
      fileService.initialize(widget.workspaceId);
      _loadData();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _buildAppBar(),
      body: Consumer<FileService>(
        builder: (context, fileService, child) {
          return Column(
            children: [
              // Search bar (when in search mode)
              if (_isSearchMode)
                Container(
                  padding: const EdgeInsets.all(16),
                  child: FileSearchWidget(
                    onResults: (results) {
                      // TODO: Handle search results
                      setState(() {
                        _searchResults = [];
                      });
                    },
                    onClearSearch: () {
                      setState(() {
                        _isSearchMode = false;
                        _searchResults.clear();
                      });
                    },
                  ),
                ),

              // Tab bar
              TabBar(
                controller: _tabController,
                tabs: [
                  Tab(icon: const Icon(Icons.folder), text: 'files.title'.tr()),
                  Tab(icon: const Icon(Icons.upload_file), text: 'files.upload'.tr()),
                  Tab(icon: const Icon(Icons.analytics), text: 'files.stats'.tr()),
                ],
              ),

              // Tab content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    // Files tab
                    _buildFilesView(fileService),

                    // Upload tab
                    Container(
                      padding: const EdgeInsets.all(16),
                      child: FileUploadWidget(
                        folderId: widget.folderId,
                        onUploadComplete: () {
                          _loadData();
                          _tabController.animateTo(0);
                        },
                      ),
                    ),

                    // Stats tab
                    _buildStatsView(fileService),
                  ],
                ),
              ),
            ],
          );
        },
      ),

      // Floating action button
      floatingActionButton: _isSearchMode ? null : _buildFAB(),

      // Bottom sheet for selected file actions
      bottomSheet: _isSelectionMode && _selectedFileIds.isNotEmpty
          ? _buildSelectionBottomSheet()
          : null,
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      automaticallyImplyLeading: false,
      titleSpacing: 0,
      title: Row(
        children: [
          const SizedBox(width: 8),
          _buildWorkspaceDropdown(),
          if (_isSelectionMode) ...[
            const SizedBox(width: 16),
            Text(
              'files.selected_count'.tr(args: ['${_selectedFileIds.length}']),
              style: const TextStyle(fontSize: 14),
            ),
          ],
        ],
      ),
      actions: [
        if (_isSelectionMode) ...[
          IconButton(
            onPressed: _clearSelection,
            icon: const Icon(Icons.clear),
            tooltip: 'files.clear_selection'.tr(),
          ),
        ] else ...[
          // Search toggle
          IconButton(
            onPressed: () {
              setState(() {
                _isSearchMode = !_isSearchMode;
              });
            },
            icon: Icon(_isSearchMode ? Icons.close : Icons.search),
            tooltip: _isSearchMode ? 'files.close_search'.tr() : 'files.search'.tr(),
          ),

          // View mode toggle
          IconButton(
            onPressed: () {
              setState(() {
                _viewMode = _viewMode == 'grid' ? 'list' : 'grid';
              });
            },
            icon: Icon(_viewMode == 'grid' ? Icons.list : Icons.grid_view),
            tooltip: _viewMode == 'grid' ? 'files.switch_to_list'.tr() : 'files.switch_to_grid'.tr(),
          ),

          // Sort and filter
          PopupMenuButton<String>(
            onSelected: _handleMenuAction,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'sort',
                child: Row(
                  children: [
                    const Icon(Icons.sort, size: 16),
                    const SizedBox(width: 8),
                    Text('files.sort'.tr()),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'refresh',
                child: Row(
                  children: [
                    const Icon(Icons.refresh, size: 16),
                    const SizedBox(width: 8),
                    Text('files.refresh'.tr()),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'select_all',
                child: Row(
                  children: [
                    const Icon(Icons.select_all, size: 16),
                    const SizedBox(width: 8),
                    Text('files.select_all'.tr()),
                  ],
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildFilesView(FileService fileService) {
    final displayFiles = _isSearchMode ? _searchResults : _files;

    if (_isLoading && displayFiles.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (displayFiles.isEmpty && !_isLoading) {
      return _buildEmptyState();
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: CustomScrollView(
        controller: _scrollController,
        slivers: [
          // Folders section
          if (!_isSearchMode && _folders.isNotEmpty)
            SliverToBoxAdapter(
              child: _buildFoldersSection(),
            ),

          // Files section
          if (_viewMode == 'grid')
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 0.8,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    if (index < displayFiles.length) {
                      return _buildFileGridItem(displayFiles[index], fileService);
                    } else if (_hasMoreFiles && index == displayFiles.length) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    return null;
                  },
                  childCount: displayFiles.length + (_hasMoreFiles ? 1 : 0),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    if (index < displayFiles.length) {
                      return _buildFileListItem(displayFiles[index], fileService);
                    } else if (_hasMoreFiles && index == displayFiles.length) {
                      return const Padding(
                        padding: EdgeInsets.all(16),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    return null;
                  },
                  childCount: displayFiles.length + (_hasMoreFiles ? 1 : 0),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFoldersSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'files.folders'.tr(),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 80,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _folders.length,
              itemBuilder: (context, index) {
                final folder = _folders[index];
                return Container(
                  width: 80,
                  margin: const EdgeInsets.only(right: 12),
                  child: InkWell(
                    onTap: () => _navigateToFolder(folder.id),
                    borderRadius: BorderRadius.circular(8),
                    child: Column(
                      children: [
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            color: Theme.of(context).primaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.folder,
                            size: 32,
                            color: Theme.of(context).primaryColor,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          folder.name,
                          style: Theme.of(context).textTheme.bodySmall,
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFileGridItem(SimpleFile file, FileService fileService) {
    final isSelected = _selectedFileIds.contains(file.id);

    return GestureDetector(
      onTap: () => _handleFileTap(file),
      onLongPress: () => _handleFileLongPress(file),
      child: Container(
        decoration: BoxDecoration(
          color: isSelected
              ? Theme.of(context).primaryColor.withOpacity(0.1)
              : Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected
                ? Theme.of(context).primaryColor
                : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Preview/Thumbnail
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                child: Stack(
                  children: [
                    // Simple file icon placeholder
                    Container(
                      color: Colors.grey.shade200,
                      child: Center(
                        child: Icon(
                          _getFileIcon(file.mimeType),
                          size: 48,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ),

                    // Selection checkbox
                    if (_isSelectionMode)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Checkbox(
                            value: isSelected,
                            onChanged: (_) => _toggleFileSelection(file.id),
                            fillColor: WidgetStateProperty.all(
                              isSelected ? Theme.of(context).primaryColor : Colors.white,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            // File info
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    file.name,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        fileService.formatFileSize(file.size),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey.shade600,
                            ),
                      ),
                      const Spacer(),
                      PopupMenuButton<String>(
                        onSelected: (action) => _handleFileAction(action, file),
                        itemBuilder: (context) => _getFileMenuItems(file),
                        child: Icon(
                          Icons.more_vert,
                          size: 16,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFileListItem(SimpleFile file, FileService fileService) {
    final isSelected = _selectedFileIds.contains(file.id);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: isSelected
            ? Theme.of(context).primaryColor.withOpacity(0.1)
            : Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isSelected
              ? Theme.of(context).primaryColor
              : Colors.grey.shade300,
          width: isSelected ? 2 : 1,
        ),
      ),
      child: ListTile(
        leading: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_isSelectionMode)
              Checkbox(
                value: isSelected,
                onChanged: (_) => _toggleFileSelection(file.id),
              )
            else
              Icon(_getFileIcon(file.mimeType), size: 40),
          ],
        ),
        title: Text(
          file.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          '${fileService.formatFileSize(file.size)} • ${_formatDate(file.updatedAt)}',
          style: TextStyle(color: Colors.grey.shade600),
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (action) => _handleFileAction(action, file),
          itemBuilder: (context) => _getFileMenuItems(file),
        ),
        onTap: () => _handleFileTap(file),
        onLongPress: () => _handleFileLongPress(file),
      ),
    );
  }

  Widget _buildStatsView(FileService fileService) {
    return FutureBuilder<Map<String, dynamic>>(
      future: fileService.getStorageStats(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError || snapshot.data == null) {
          return Center(
            child: Text('${snapshot.error ?? "files.error".tr()}'),
          );
        }

        final stats = snapshot.data!;

        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // Storage usage
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'files.storage_usage'.tr(),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 16),
                      LinearProgressIndicator(
                        value: (stats['usagePercentage'] ?? 0.0) / 100,
                        backgroundColor: Colors.grey.shade300,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('${fileService.formatFileSize(stats['usedStorage'] ?? 0)} ${'files.used'.tr()}'),
                          Text('${(stats['usagePercentage'] ?? 0.0).toStringAsFixed(1)}%'),
                          Text('${fileService.formatFileSize(stats['storageLimit'] ?? 0)} ${'files.total'.tr()}'),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // File count
              Card(
                child: ListTile(
                  leading: Icon(
                    Icons.insert_drive_file,
                    color: Theme.of(context).primaryColor,
                  ),
                  title: Text('files.total_files'.tr()),
                  trailing: Text(
                    '${stats['totalFiles'] ?? 0}',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).primaryColor,
                        ),
                  ),
                ),
              ),

              // File type breakdown
              if (stats['fileTypeBreakdown'] != null &&
                  (stats['fileTypeBreakdown'] as Map).isNotEmpty) ...[
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'files.file_types'.tr(),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 16),
                        ...(stats['fileTypeBreakdown'] as Map).entries.map((entry) =>
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(entry.key.toString().toUpperCase()),
                                Text('files.files_count'.tr(args: ['${entry.value}'])),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.folder_open,
            size: 64,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            _isSearchMode
                ? 'files.no_files_found'.tr()
                : 'files.no_files_in_folder'.tr(),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: Colors.grey.shade600,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            _isSearchMode
                ? 'files.try_adjusting_search'.tr()
                : 'files.upload_first_file'.tr(),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey.shade500,
                ),
          ),
          if (!_isSearchMode) ...[
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _tabController.animateTo(1),
              icon: const Icon(Icons.cloud_upload),
              label: Text('files.upload_files'.tr()),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFAB() {
    return FloatingActionButton(
      onPressed: () => _tabController.animateTo(1),
      tooltip: 'files.upload_files'.tr(),
      child: const Icon(Icons.add),
    );
  }

  Widget _buildSelectionBottomSheet() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: _downloadSelectedFiles,
              icon: const Icon(Icons.download),
              label: Text('files.download'.tr()),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: _shareSelectedFiles,
              icon: const Icon(Icons.share),
              label: Text('files.share'.tr()),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: _deleteSelectedFiles,
              icon: const Icon(Icons.delete),
              label: Text('files.delete'.tr()),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  // Data loading methods
  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _currentPage = 1;
    });

    await _loadFiles();
    await _loadFolders();

    setState(() {
      _isLoading = false;
    });
  }

  Future<void> _loadFiles() async {
    final fileService = Provider.of<FileService>(context, listen: false);
    final response = await fileService.getFiles(
      folderId: widget.folderId,
      page: _currentPage,
      limit: 20,
    );

    // Simple data handling without API response wrapper
    setState(() {
      if (_currentPage == 1) {
        _files = [];
      }
      _hasMoreFiles = response['hasNextPage'] ?? false;
    });
  }

  Future<void> _loadFolders() async {
    final fileService = Provider.of<FileService>(context, listen: false);
    await fileService.getFolders(parentId: widget.folderId);

    setState(() {
      _folders = [];
    });
  }

  // Event handlers
  void _onScroll() {
    if (_scrollController.position.pixels == _scrollController.position.maxScrollExtent) {
      if (_hasMoreFiles && !_isLoading) {
        setState(() {
          _currentPage++;
        });
        _loadFiles();
      }
    }
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'sort':
        _showSortDialog();
        break;
      case 'refresh':
        _loadData();
        break;
      case 'select_all':
        _selectAllFiles();
        break;
    }
  }

  void _handleFileTap(SimpleFile file) {
    if (_isSelectionMode) {
      _toggleFileSelection(file.id);
    } else {
      _showFilePreview(file);
    }
  }

  void _handleFileLongPress(SimpleFile file) {
    if (!_isSelectionMode) {
      setState(() {
        _isSelectionMode = true;
        _selectedFileIds.add(file.id);
      });
    }
  }

  void _handleFileAction(String action, SimpleFile file) {
    switch (action) {
      case 'download':
        _downloadFile(file);
        break;
      case 'share':
        _shareFile(file);
        break;
      case 'preview':
        _showFilePreview(file);
        break;
      case 'delete':
        _deleteFile(file);
        break;
      case 'rename':
        _renameFile(file);
        break;
    }
  }

  List<PopupMenuEntry<String>> _getFileMenuItems(SimpleFile file) {
    return [
      PopupMenuItem(
        value: 'preview',
        child: Row(
          children: [
            const Icon(Icons.visibility, size: 16),
            const SizedBox(width: 8),
            Text('files.preview'.tr()),
          ],
        ),
      ),
      PopupMenuItem(
        value: 'download',
        child: Row(
          children: [
            const Icon(Icons.download, size: 16),
            const SizedBox(width: 8),
            Text('files.download'.tr()),
          ],
        ),
      ),
      PopupMenuItem(
        value: 'share',
        child: Row(
          children: [
            const Icon(Icons.share, size: 16),
            const SizedBox(width: 8),
            Text('files.share'.tr()),
          ],
        ),
      ),
      PopupMenuItem(
        value: 'rename',
        child: Row(
          children: [
            const Icon(Icons.edit, size: 16),
            const SizedBox(width: 8),
            Text('files.rename'.tr()),
          ],
        ),
      ),
      const PopupMenuDivider(),
      PopupMenuItem(
        value: 'delete',
        child: Row(
          children: [
            const Icon(Icons.delete, size: 16, color: Colors.red),
            const SizedBox(width: 8),
            Text('files.delete'.tr(), style: const TextStyle(color: Colors.red)),
          ],
        ),
      ),
    ];
  }

  // File operations
  void _downloadFile(SimpleFile file) {
    // TODO: Implement download
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('files.downloading'.tr(args: [file.name]))),
    );
  }

  void _shareFile(SimpleFile file) {
    // TODO: Implement share
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('files.sharing'.tr(args: [file.name]))),
    );
  }

  void _showFilePreview(SimpleFile file) {
    // TODO: Implement preview
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('files.loading_preview'.tr())),
    );
  }

  void _deleteFile(SimpleFile file) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('files.delete_file'.tr()),
        content: Text('files.delete_file_confirm'.tr(args: [file.name])),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text('files.delete'.tr(), style: const TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final fileService = Provider.of<FileService>(context, listen: false);
      final success = await fileService.deleteFile(file.id);

      if (success) {
        _loadData();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('files.file_deleted'.tr()),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('files.failed_to_delete'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  void _renameFile(SimpleFile file) {
    final controller = TextEditingController(text: file.name);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('files.rename_file'.tr()),
        content: TextField(
          controller: controller,
          decoration: InputDecoration(
            labelText: 'files.file_name'.tr(),
            border: const OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () async {
              final newName = controller.text.trim();
              if (newName.isNotEmpty && newName != file.name) {
                Navigator.of(context).pop();

                final fileService = Provider.of<FileService>(context, listen: false);
                final success = await fileService.moveFile(
                  fileId: file.id,
                  newName: newName,
                );

                if (success) {
                  _loadData();
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('files.file_renamed'.tr()),
                        backgroundColor: Colors.green,
                      ),
                    );
                  }
                } else {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('files.failed_to_rename'.tr()),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              }
            },
            child: Text('files.rename'.tr()),
          ),
        ],
      ),
    );
  }

  // Selection methods
  void _toggleFileSelection(String fileId) {
    setState(() {
      if (_selectedFileIds.contains(fileId)) {
        _selectedFileIds.remove(fileId);
        if (_selectedFileIds.isEmpty) {
          _isSelectionMode = false;
        }
      } else {
        _selectedFileIds.add(fileId);
      }
    });
  }

  void _selectAllFiles() {
    setState(() {
      _isSelectionMode = true;
      _selectedFileIds.addAll(_files.map((f) => f.id));
    });
  }

  void _clearSelection() {
    setState(() {
      _isSelectionMode = false;
      _selectedFileIds.clear();
    });
  }

  void _downloadSelectedFiles() {
    // TODO: Implement batch download
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('files.downloading_selected'.tr()),
        backgroundColor: Colors.blue,
      ),
    );
    _clearSelection();
  }

  void _shareSelectedFiles() {
    // TODO: Implement batch share
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('files.sharing_selected'.tr()),
        backgroundColor: Colors.blue,
      ),
    );
    _clearSelection();
  }

  void _deleteSelectedFiles() {
    // TODO: Implement batch delete
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('files.deleting_selected'.tr()),
        backgroundColor: Colors.red,
      ),
    );
    _clearSelection();
  }

  // Navigation
  void _navigateToFolder(String folderId) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => EnhancedFilesScreen(
          workspaceId: widget.workspaceId,
          folderId: folderId,
        ),
      ),
    );
  }

  // Workspace dropdown widget
  Widget _buildWorkspaceDropdown() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          // This will show the menu
        },
        borderRadius: BorderRadius.circular(6),
        child: PopupMenuButton<String>(
          offset: const Offset(0, 45),
          tooltip: 'workspace.select_workspace'.tr(),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              border: Border.all(
                color: Colors.white.withOpacity(0.4),
                width: 1.5,
              ),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.business, size: 18, color: Colors.white),
                const SizedBox(width: 8),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 100),
                  child: Text(
                    _currentWorkspaceName,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.keyboard_arrow_down, size: 18, color: Colors.white),
              ],
            ),
          ),
      itemBuilder: (context) => [
          // Workspaces section header
          PopupMenuItem<String>(
            enabled: false,
            child: Padding(
              padding: const EdgeInsets.only(left: 8, top: 4, bottom: 4),
              child: Text(
                'workspace.workspaces'.tr(),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade600,
                ),
              ),
            ),
          ),

          // Workspace items
          ..._workspaces.map((workspace) {
            final isSelected = workspace['name'] == _currentWorkspaceName;
            return PopupMenuItem<String>(
              value: workspace['id'],
              child: Row(
                children: [
                  const Icon(Icons.business, size: 18),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      workspace['name']!,
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  ),
                  if (isSelected)
                    Icon(
                      Icons.check,
                      size: 18,
                      color: Theme.of(context).primaryColor,
                    ),
                ],
              ),
            );
          }),

          // Divider
          const PopupMenuDivider(),

          // Create new workspace
          PopupMenuItem<String>(
            value: 'create_new',
            child: Row(
              children: [
                const Icon(Icons.add, size: 18),
                const SizedBox(width: 12),
                Text(
                  'workspace.create_workspace'.tr(),
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ],
        onSelected: (value) {
          if (value == 'create_new') {
            _showCreateWorkspaceDialog();
          } else {
            // Switch workspace
            final selectedWorkspace = _workspaces.firstWhere(
              (w) => w['id'] == value,
              orElse: () => _workspaces.first,
            );
            setState(() {
              _currentWorkspaceName = selectedWorkspace['name']!;
            });
            // TODO: Load data for the new workspace
            _loadData();
          }
        },
      ),
      ),
    );
  }

  // Show create workspace dialog
  void _showCreateWorkspaceDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('workspace.create_workspace'.tr()),
        content: TextField(
          controller: controller,
          decoration: InputDecoration(
            labelText: 'workspace.workspace_name'.tr(),
            border: const OutlineInputBorder(),
            hintText: 'workspace.enter_workspace_name'.tr(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () {
              final name = controller.text.trim();
              if (name.isNotEmpty) {
                setState(() {
                  _workspaces.add({
                    'id': DateTime.now().millisecondsSinceEpoch.toString(),
                    'name': name,
                  });
                  _currentWorkspaceName = name;
                });
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('workspace.workspace_created'.tr(args: [name])),
                    backgroundColor: Colors.green,
                  ),
                );
              }
            },
            child: Text('common.create'.tr()),
          ),
        ],
      ),
    );
  }

  // Utility methods
  void _showSortDialog() {
    // TODO: Implement sort dialog
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  IconData _getFileIcon(String mimeType) {
    if (mimeType.startsWith('image/')) return Icons.image;
    if (mimeType.startsWith('video/')) return Icons.video_file;
    if (mimeType.startsWith('audio/')) return Icons.audio_file;
    if (mimeType == 'application/pdf') return Icons.picture_as_pdf;
    if (mimeType.contains('word')) return Icons.description;
    if (mimeType.contains('excel') || mimeType.contains('spreadsheet')) {
      return Icons.table_chart;
    }
    if (mimeType.contains('powerpoint') || mimeType.contains('presentation')) {
      return Icons.slideshow;
    }
    if (mimeType.startsWith('text/')) return Icons.text_snippet;
    if (mimeType.contains('zip') || mimeType.contains('archive')) {
      return Icons.folder_zip;
    }
    return Icons.insert_drive_file;
  }
}
