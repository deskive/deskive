import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import 'image_preview_dialog.dart';
import 'video_player_dialog.dart';
import 'file_upload_ui.dart';
import 'ai_files_assistant.dart';
import '../widgets/ai_button.dart';
import '../services/file_service.dart';
import '../services/workspace_service.dart';
import '../services/clipboard_service.dart';
import '../models/folder/folder.dart' as model;
import '../models/file/file.dart' as file_model;
import '../api/services/file_api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/google_drive_folder_picker.dart';
import '../apps/services/google_drive_service.dart';
import 'file_comments_sheet.dart';
import '../widgets/offline/offline_menu_item.dart';

class FolderScreen extends StatefulWidget {
  final String folderName;
  final String folderId;
  final String workspaceId;
  final int itemCount;
  final bool isShared;

  const FolderScreen({
    super.key,
    required this.folderName,
    required this.folderId,
    required this.workspaceId,
    required this.itemCount,
    required this.isShared,
  });

  @override
  State<FolderScreen> createState() => _FolderScreenState();
}

class _FolderScreenState extends State<FolderScreen> {
  String _currentView = 'Grid';
  bool _isSearching = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  // API data
  final FileService _fileService = FileService.instance;
  final ClipboardService _clipboardService = ClipboardService.instance;
  List<model.Folder> _apiSubfolders = [];
  List<file_model.File> _apiFolderFiles = [];
  bool _isLoading = false;

  // Selection mode
  bool _isSelectionMode = false;
  final Set<String> _selectedItemIds = {};

  // Mock files and folders (fallback)
  late List<FolderFile> _files;
  late List<NestedFolder> _folders;

  // Clipboard functionality (for mock data)
  FolderFile? _cutFile;
  FolderFile? _copiedFile;

  @override
  void initState() {
    super.initState();
    _files = _generateMockFiles();
    _folders = _generateMockFolders();

    // Initialize FileService and fetch API data
    _fileService.initialize(widget.workspaceId);
    _fileService.addListener(_onFileServiceUpdate);
    _fetchFolderContents();
  }

  void _onFileServiceUpdate() {
    if (mounted) {
      setState(() {
        _apiSubfolders = _fileService.folders;
        _apiFolderFiles = _fileService.files;
      });
    }
  }

  Future<void> _fetchFolderContents() async {
    setState(() => _isLoading = true);

    try {
      // Fetch subfolders with parent_id parameter
      await _fileService.fetchFolders(parentId: widget.folderId);

      // Fetch files in this folder
      await _fileService.fetchFiles(folderId: widget.folderId);

      setState(() {
        _apiSubfolders = _fileService.folders;
        _apiFolderFiles = _fileService.files;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  /// Show upload dialog for uploading files to this folder
  void _showUploadDialog() {
    showFileUploadDialog(
      context,
      folderId: widget.folderId, // Pass the folder ID
      onUploadComplete: () {
        // Refresh folder contents after upload
        _fetchFolderContents();
      },
    );
  }

  /// Show AI Files Assistant dialog
  void _showAIAssistant() {
    showAIFilesAssistant(
      context: context,
      folderId: widget.folderId,
      folderName: widget.folderName,
      onFilesChanged: () {
        _fetchFolderContents();
      },
      onFoldersChanged: () {
        _fetchFolderContents();
      },
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    _fileService.removeListener(_onFileServiceUpdate);
    super.dispose();
  }

  List<FolderFile> _generateMockFiles() {
    final fileCount = (widget.itemCount * 0.7).round(); // 70% files, 30% folders
    return List.generate(fileCount, (index) {
      final types = ['pdf', 'image', 'doc', 'video', 'audio'];
      final type = types[index % types.length];
      return FolderFile(
        id: 'mock-file-$index', // Mock ID for demonstration
        name: 'File ${index + 1}',
        type: type,
        size: '${(index + 1) * 0.5} MB',
        lastModified: DateTime.now().subtract(Duration(days: index)),
        isStarred: index % 3 == 0,
      );
    });
  }

  List<NestedFolder> _generateMockFolders() {
    final folderCount = (widget.itemCount * 0.3).round(); // 30% folders
    return List.generate(folderCount, (index) {
      return NestedFolder(
        name: 'Subfolder ${index + 1}',
        itemCount: (index + 1) * 3,
        lastModified: DateTime.now().subtract(Duration(days: index * 2)),
        isShared: index % 2 == 0,
        isStarred: index % 4 == 0, // Some folders are starred
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        centerTitle: false,
        leading: _isSelectionMode
            ? IconButton(
                icon: const Icon(Icons.close),
                onPressed: () {
                  setState(() {
                    _isSelectionMode = false;
                    _selectedItemIds.clear();
                  });
                },
              )
            : null,
        title: _isSelectionMode
            ? Text('files.selected_count'.tr(args: ['${_selectedItemIds.length}']))
            : _isSearching
                ? TextField(
                    controller: _searchController,
                    autofocus: true,
                    decoration: InputDecoration(
                      hintText: 'files.search_files'.tr(),
                      border: InputBorder.none,
                      hintStyle: const TextStyle(color: Colors.white70),
                    ),
                    style: const TextStyle(color: Colors.white),
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value.toLowerCase();
                      });
                    },
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.folderName,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(
                        'files.files_count'.tr(args: ['${_getFilteredFiles().length}']),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
        actions: _isSelectionMode
            ? [
                IconButton(
                  icon: const Icon(Icons.select_all),
                  tooltip: 'files.select_all'.tr(),
                  onPressed: () {
                    setState(() {
                      _selectedItemIds.clear();
                      for (var file in _apiFolderFiles) {
                        _selectedItemIds.add(file.id);
                      }
                      for (var folder in _apiSubfolders) {
                        _selectedItemIds.add(folder.id);
                      }
                    });
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.copy_outlined),
                  tooltip: 'Copy',
                  onPressed: _selectedItemIds.isNotEmpty
                      ? () => _copySelectedItemsToClipboard()
                      : null,
                ),
                IconButton(
                  icon: const Icon(Icons.content_cut),
                  tooltip: 'Cut',
                  onPressed: _selectedItemIds.isNotEmpty
                      ? () => _cutSelectedItemsToClipboard()
                      : null,
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline),
                  tooltip: 'Delete selected',
                  onPressed: _selectedItemIds.isNotEmpty
                      ? () => _deleteSelectedItems()
                      : null,
                ),
              ]
            : [
                // AI Assistant button
                if (!_isSearching)
                  AIButton(
                    onPressed: _showAIAssistant,
                    tooltip: 'AI Files Assistant',
                  ),
                if (!_isSearching)
                  const SizedBox(width: 8),
                // Upload button
                if (!_isSearching)
                  IconButton(
                    icon: const Icon(Icons.upload_file),
                    tooltip: 'Upload files',
                    onPressed: _showUploadDialog,
                  ),
                if (_isSearching)
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () {
                      setState(() {
                        _isSearching = false;
                        _searchQuery = '';
                        _searchController.clear();
                      });
                    },
                  )
                else
                  IconButton(
                    icon: const Icon(Icons.search),
                    onPressed: () {
                      setState(() {
                        _isSearching = true;
                      });
                    },
                  ),
                PopupMenuButton<String>(
                  initialValue: _currentView,
                  onSelected: (value) {
                    setState(() {
                      _currentView = value;
                    });
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem(value: 'Grid', child: Text('files.grid_view'.tr())),
                    PopupMenuItem(value: 'List', child: Text('files.list_view'.tr())),
                  ],
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Icon(_currentView == 'Grid' ? Icons.grid_view : Icons.list),
                  ),
                ),
              ],
      ),
      body: Column(
        children: [
          // Folder info bar
          Container(
            padding: const EdgeInsets.all(16),
            color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3),
            child: Row(
              children: [
                Icon(
                  Icons.folder_outlined,
                  color: const Color(0xFF8B6BFF),
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.folderName,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Row(
                        children: [
                          Text(
                            '${_getFilteredFiles().length} items',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          if (widget.isShared) ...[
                            const SizedBox(width: 8),
                            Icon(
                              Icons.people,
                              size: 16,
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Shared',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Files content
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onLongPress: _showPasteMenu,
              child: _buildFilesContent(),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          _showCreateFolderDialog();
        },
        child: const Icon(Icons.create_new_folder),
      ),
    );
  }

  List<FolderFile> _getFilteredFiles() {
    if (_searchQuery.isEmpty) {
      return _files;
    }
    return _files.where((file) {
      return file.name.toLowerCase().contains(_searchQuery) ||
             file.type.toLowerCase().contains(_searchQuery);
    }).toList();
  }

  List<NestedFolder> _getFilteredFolders() {
    if (_searchQuery.isEmpty) {
      return _folders;
    }
    return _folders.where((folder) {
      return folder.name.toLowerCase().contains(_searchQuery);
    }).toList();
  }

  Widget _buildFilesContent() {
    // Show loading indicator while fetching API data
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    final filteredFiles = _getFilteredFiles();
    final filteredFolders = _getFilteredFolders();

    // Check both API data and mock data for items
    final hasApiItems = _apiSubfolders.isNotEmpty || _apiFolderFiles.isNotEmpty;
    final hasMockItems = filteredFiles.isNotEmpty || filteredFolders.isNotEmpty;
    final hasItems = hasApiItems || hasMockItems;

    if (!hasItems) {
      if (_searchQuery.isNotEmpty) {
        return Center(
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
                'No files found',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                'Try a different search term',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        );
      } else {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.folder_open,
                size: 64,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: 16),
              Text(
                'Empty folder',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                'Add files to this folder',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        );
      }
    }

    return _currentView == 'Grid'
        ? _buildGridView(filteredFiles, filteredFolders)
        : _buildListView(filteredFiles, filteredFolders);
  }

  Widget _buildGridView(List<FolderFile> files, List<NestedFolder> folders) {
    final allItems = <dynamic>[];

    // Add API subfolders first
    if (_apiSubfolders.isNotEmpty) {
      allItems.addAll(_apiSubfolders);
    } else {
      // Fallback to mock folders if no API data
      allItems.addAll(folders);
    }

    // Add API files
    if (_apiFolderFiles.isNotEmpty) {
      allItems.addAll(_apiFolderFiles);
    } else {
      // Fallback to mock files if no API data
      allItems.addAll(files);
    }

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.85,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: allItems.length,
      itemBuilder: (context, index) {
        final item = allItems[index];
        if (item is model.Folder) {
          return _buildApiFolderGridItemWithSelection(item);
        } else if (item is NestedFolder) {
          return _buildFolderGridItem(item);
        } else if (item is file_model.File) {
          return _buildApiFileGridItemWithSelection(item);
        } else if (item is FolderFile) {
          return _buildFileGridItem(item);
        }
        return const SizedBox();
      },
    );
  }

  Widget _buildListView(List<FolderFile> files, List<NestedFolder> folders) {
    final allItems = <dynamic>[];

    // Add API subfolders first
    if (_apiSubfolders.isNotEmpty) {
      allItems.addAll(_apiSubfolders);
    } else {
      // Fallback to mock folders if no API data
      allItems.addAll(folders);
    }

    // Add API files
    if (_apiFolderFiles.isNotEmpty) {
      allItems.addAll(_apiFolderFiles);
    } else {
      // Fallback to mock files if no API data
      allItems.addAll(files);
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: allItems.length,
      itemBuilder: (context, index) {
        final item = allItems[index];
        if (item is model.Folder) {
          return _buildApiFolderListItem(item);
        } else if (item is NestedFolder) {
          return _buildFolderListItem(item);
        } else if (item is file_model.File) {
          return _buildApiFileListItem(item);
        } else if (item is FolderFile) {
          return _buildFileListItem(item);
        }
        return const SizedBox();
      },
    );
  }

  Widget _buildFolderGridItem(NestedFolder folder) {
    return Card(
      child: InkWell(
        onTap: () => _openNestedFolder(folder),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.folder_outlined,
                    color: const Color(0xFF8B6BFF),
                    size: 32,
                  ),
                  const Spacer(),
                  if (folder.isStarred)
                    const Icon(
                      Icons.star,
                      size: 16,
                      color: Colors.amber,
                    ),
                  if (folder.isShared)
                    Icon(
                      Icons.people,
                      size: 16,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, size: 16),
                    onSelected: (value) => _handleFolderAction(value, folder),
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'open',
                        child: Row(
                          children: [
                            Icon(Icons.folder_open, size: 18),
                            SizedBox(width: 12),
                            Text('Open'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'cut',
                        child: Row(
                          children: [
                            Icon(Icons.content_cut, size: 18),
                            SizedBox(width: 12),
                            Text('Cut'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'copy',
                        child: Row(
                          children: [
                            Icon(Icons.content_copy, size: 18),
                            SizedBox(width: 12),
                            Text('Copy'),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'paste',
                        enabled: _clipboardService.hasContent,
                        child: const Row(
                          children: [
                            Icon(Icons.content_paste, size: 18),
                            SizedBox(width: 12),
                            Text('Paste'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'rename',
                        child: Row(
                          children: [
                            Icon(Icons.edit, size: 18),
                            SizedBox(width: 12),
                            Text('Rename'),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'star',
                        child: Row(
                          children: [
                            Icon(
                              folder.isStarred ? Icons.star : Icons.star_outline,
                              size: 18,
                            ),
                            const SizedBox(width: 12),
                            Text(folder.isStarred ? 'Unstar' : 'Star'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'share',
                        child: Row(
                          children: [
                            Icon(Icons.share, size: 18),
                            SizedBox(width: 12),
                            Text('Share'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'properties',
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, size: 18),
                            SizedBox(width: 12),
                            Text('Properties'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'trash',
                        child: Row(
                          children: [
                            Icon(Icons.delete_outline, size: 18),
                            SizedBox(width: 12),
                            Text('Move to trash'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const Spacer(),
              Text(
                folder.name,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                '${folder.itemCount} items',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFolderListItem(NestedFolder folder) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          Icons.folder_outlined,
          color: const Color(0xFF8B6BFF),
          size: 32,
        ),
        title: Text(folder.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(
          '${folder.itemCount} items • ${_formatDate(folder.lastModified)}',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (folder.isStarred)
              const Icon(
                Icons.star,
                size: 20,
                color: Colors.amber,
              ),
            if (folder.isShared)
              Icon(
                Icons.people,
                size: 20,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            const SizedBox(width: 8),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (value) => _handleFolderAction(value, folder),
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'open',
                  child: Row(
                    children: [
                      Icon(Icons.folder_open, size: 18),
                      SizedBox(width: 12),
                      Text('Open'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'cut',
                  child: Row(
                    children: [
                      Icon(Icons.content_cut, size: 18),
                      SizedBox(width: 12),
                      Text('Cut'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'copy',
                  child: Row(
                    children: [
                      Icon(Icons.content_copy, size: 18),
                      SizedBox(width: 12),
                      Text('Copy'),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'paste',
                  enabled: _clipboardService.hasContent,
                  child: const Row(
                    children: [
                      Icon(Icons.content_paste, size: 18),
                      SizedBox(width: 12),
                      Text('Paste'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'rename',
                  child: Row(
                    children: [
                      Icon(Icons.edit, size: 18),
                      SizedBox(width: 12),
                      Text('Rename'),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'star',
                  child: Row(
                    children: [
                      Icon(
                        folder.isStarred ? Icons.star : Icons.star_outline,
                        size: 18,
                      ),
                      const SizedBox(width: 12),
                      Text(folder.isStarred ? 'Unstar' : 'Star'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'share',
                  child: Row(
                    children: [
                      Icon(Icons.share, size: 18),
                      SizedBox(width: 12),
                      Text('Share'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'properties',
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, size: 18),
                      SizedBox(width: 12),
                      Text('Properties'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'trash',
                  child: Row(
                    children: [
                      Icon(Icons.delete_outline, size: 18),
                      SizedBox(width: 12),
                      Text('Move to trash'),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
        onTap: () => _openNestedFolder(folder),
      ),
    );
  }

  // API Folder Grid Item
  Widget _buildApiFolderGridItem(model.Folder folder) {
    return Card(
      child: InkWell(
        onTap: () => _openApiFolder(folder),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.folder_outlined,
                    color: Color(0xFF8B6BFF),
                    size: 32,
                  ),
                  const Spacer(),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, size: 16),
                    onSelected: (value) => _handleApiFolderAction(value, folder),
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'open',
                        child: Row(
                          children: [
                            Icon(Icons.folder_open, size: 18),
                            SizedBox(width: 12),
                            Text('Open'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'cut',
                        child: Row(
                          children: [
                            Icon(Icons.content_cut, size: 18),
                            SizedBox(width: 12),
                            Text('Cut'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'copy',
                        child: Row(
                          children: [
                            Icon(Icons.content_copy, size: 18),
                            SizedBox(width: 12),
                            Text('Copy'),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'paste',
                        enabled: _clipboardService.hasContent,
                        child: Row(
                          children: [
                            Icon(Icons.content_paste, size: 18, color: _clipboardService.hasContent ? null : Colors.grey),
                            const SizedBox(width: 12),
                            Text('Paste', style: TextStyle(color: _clipboardService.hasContent ? null : Colors.grey)),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'rename',
                        child: Row(
                          children: [
                            Icon(Icons.edit, size: 18),
                            SizedBox(width: 12),
                            Text('Rename'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'star',
                        child: Row(
                          children: [
                            Icon(Icons.star_border, size: 18),
                            SizedBox(width: 12),
                            Text('Star'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'share',
                        child: Row(
                          children: [
                            Icon(Icons.share, size: 18),
                            SizedBox(width: 12),
                            Text('Share'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'properties',
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, size: 18),
                            SizedBox(width: 12),
                            Text('Properties'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'trash',
                        child: Row(
                          children: [
                            Icon(Icons.delete_outline, size: 18, color: Colors.red),
                            SizedBox(width: 12),
                            Text('Move to trash', style: TextStyle(color: Colors.red)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const Spacer(),
              Text(
                folder.name,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                'Folder',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // API Folder List Item
  Widget _buildApiFolderListItem(model.Folder folder) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(
          Icons.folder_outlined,
          color: Color(0xFF8B6BFF),
          size: 32,
        ),
        title: Text(folder.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(
          _formatDate(folder.updatedAt),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert),
          onSelected: (value) => _handleApiFolderAction(value, folder),
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'open',
              child: Row(
                children: [
                  Icon(Icons.folder_open, size: 18),
                  SizedBox(width: 12),
                  Text('Open'),
                ],
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'cut',
              child: Row(
                children: [
                  Icon(Icons.content_cut, size: 18),
                  SizedBox(width: 12),
                  Text('Cut'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'copy',
              child: Row(
                children: [
                  Icon(Icons.content_copy, size: 18),
                  SizedBox(width: 12),
                  Text('Copy'),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'paste',
              enabled: _clipboardService.hasContent,
              child: Row(
                children: [
                  Icon(Icons.content_paste, size: 18, color: _clipboardService.hasContent ? null : Colors.grey),
                  const SizedBox(width: 12),
                  Text('Paste', style: TextStyle(color: _clipboardService.hasContent ? null : Colors.grey)),
                ],
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'rename',
              child: Row(
                children: [
                  Icon(Icons.edit, size: 18),
                  SizedBox(width: 12),
                  Text('Rename'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'star',
              child: Row(
                children: [
                  Icon(Icons.star_border, size: 18),
                  SizedBox(width: 12),
                  Text('Star'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'share',
              child: Row(
                children: [
                  Icon(Icons.share, size: 18),
                  SizedBox(width: 12),
                  Text('Share'),
                ],
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'properties',
              child: Row(
                children: [
                  Icon(Icons.info_outline, size: 18),
                  SizedBox(width: 12),
                  Text('Properties'),
                ],
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'trash',
              child: Row(
                children: [
                  Icon(Icons.delete_outline, size: 18, color: Colors.red),
                  SizedBox(width: 12),
                  Text('Move to trash', style: TextStyle(color: Colors.red)),
                ],
              ),
            ),
          ],
        ),
        onTap: () => _openApiFolder(folder),
      ),
    );
  }

  // API File Grid Item
  Widget _buildApiFileGridItem(file_model.File file) {
    final sizeInBytes = int.tryParse(file.size) ?? 0;
    final formattedSize = _fileService.formatFileSize(sizeInBytes);
    final isImage = file.mimeType.startsWith('image/');
    final isVideo = file.mimeType.startsWith('video/');

    // For image files, use full-card thumbnail style
    if (isImage && file.url != null && file.url!.isNotEmpty) {
      return Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => _openApiFile(file),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Full-card image thumbnail
              Image.network(
                file.url!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    child: const Center(
                      child: Icon(
                        Icons.broken_image,
                        size: 48,
                        color: Colors.red,
                      ),
                    ),
                  );
                },
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return Container(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    child: Center(
                      child: CircularProgressIndicator(
                        value: loadingProgress.expectedTotalBytes != null
                            ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                            : null,
                      ),
                    ),
                  );
                },
              ),
              // Gradient overlay at bottom
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        Colors.black.withOpacity(0.7),
                        Colors.transparent,
                      ],
                    ),
                  ),
                  padding: const EdgeInsets.all(8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        file.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        formattedSize,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // Star icon indicator
              if (file.starred == true)
                const Positioned(
                  top: 8,
                  left: 8,
                  child: Icon(
                    Icons.star,
                    size: 20,
                    color: Colors.amber,
                  ),
                ),
              // More button
              Positioned(
                top: 4,
                right: 4,
                child: PopupMenuButton<String>(
                  icon: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.more_vert, size: 16, color: Colors.white),
                  ),
                  onSelected: (value) => _handleApiFileAction(value, file),
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'open',
                      child: Row(
                        children: [
                          Icon(Icons.folder_open, size: 18),
                          SizedBox(width: 12),
                          Text('Open'),
                        ],
                      ),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem(
                      value: 'cut',
                      child: Row(
                        children: [
                          Icon(Icons.content_cut, size: 18),
                          SizedBox(width: 12),
                          Text('Cut'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'copy',
                      child: Row(
                        children: [
                          Icon(Icons.content_copy, size: 18),
                          SizedBox(width: 12),
                          Text('Copy'),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'paste',
                      enabled: _clipboardService.hasContent,
                      child: Row(
                        children: [
                          Icon(Icons.content_paste, size: 18, color: _clipboardService.hasContent ? null : Colors.grey),
                          const SizedBox(width: 12),
                          Text('Paste', style: TextStyle(color: _clipboardService.hasContent ? null : Colors.grey)),
                        ],
                      ),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem(
                      value: 'rename',
                      child: Row(
                        children: [
                          Icon(Icons.edit, size: 18),
                          SizedBox(width: 12),
                          Text('Rename'),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'star',
                      child: Row(
                        children: [
                          Icon(file.starred == true ? Icons.star : Icons.star_border, size: 18),
                          const SizedBox(width: 12),
                          Text(file.starred == true ? 'Unstar' : 'Star'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'share',
                      child: Row(
                        children: [
                          Icon(Icons.share, size: 18),
                          SizedBox(width: 12),
                          Text('Share'),
                        ],
                      ),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem(
                      value: 'properties',
                      child: Row(
                        children: [
                          Icon(Icons.info_outline, size: 18),
                          SizedBox(width: 12),
                          Text('Properties'),
                        ],
                      ),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem(
                      value: 'preview',
                      child: Row(
                        children: [
                          Icon(Icons.visibility, size: 18),
                          SizedBox(width: 12),
                          Text('Preview'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'comments',
                      child: Row(
                        children: [
                          Icon(Icons.comment_outlined, size: 18),
                          SizedBox(width: 12),
                          Text('Comments'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'download',
                      child: Row(
                        children: [
                          Icon(Icons.download, size: 18),
                          SizedBox(width: 12),
                          Text('Download'),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'offline_toggle',
                      child: Row(
                        children: [
                          Icon(Icons.cloud_download_outlined, size: 18),
                          const SizedBox(width: 12),
                          Text('files.offline.make_available'.tr()),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'export_to_drive',
                      child: Row(
                        children: [
                          const Icon(Icons.cloud_upload, size: 18, color: Color(0xFF4285F4)),
                          const SizedBox(width: 12),
                          Text('files.export_to_drive'.tr()),
                        ],
                      ),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem(
                      value: 'trash',
                      child: Row(
                        children: [
                          Icon(Icons.delete_outline, size: 18, color: Colors.red),
                          SizedBox(width: 12),
                          Text('Move to trash', style: TextStyle(color: Colors.red)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    // For videos and other files, use the compact style with small thumbnail
    return Card(
      child: InkWell(
        onTap: () => _openApiFile(file),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Show thumbnail for videos
              if (isVideo && file.url != null && file.url!.isNotEmpty)
                Center(
                  child: Container(
                    height: 70,
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: Image.network(
                            file.url!,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return Icon(
                                _getFileIconFromMimeType(file.mimeType),
                                color: _getFileColorFromMimeType(file.mimeType),
                                size: 48,
                              );
                            },
                            loadingBuilder: (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return Center(
                                child: CircularProgressIndicator(
                                  value: loadingProgress.expectedTotalBytes != null
                                      ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                                      : null,
                                  strokeWidth: 2,
                                ),
                              );
                            },
                          ),
                        ),
                        // Video play icon overlay
                        Center(
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.6),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.play_arrow,
                              color: Colors.white,
                              size: 24,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              Row(
                children: [
                  if (!isVideo || file.url == null || file.url!.isEmpty)
                    Icon(
                      _getFileIconFromMimeType(file.mimeType),
                      color: _getFileColorFromMimeType(file.mimeType),
                      size: 32,
                    ),
                  const Spacer(),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, size: 16),
                    onSelected: (value) => _handleApiFileAction(value, file),
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'open',
                        child: Row(
                          children: [
                            Icon(Icons.folder_open, size: 18),
                            SizedBox(width: 12),
                            Text('Open'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'cut',
                        child: Row(
                          children: [
                            Icon(Icons.content_cut, size: 18),
                            SizedBox(width: 12),
                            Text('Cut'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'copy',
                        child: Row(
                          children: [
                            Icon(Icons.content_copy, size: 18),
                            SizedBox(width: 12),
                            Text('Copy'),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'paste',
                        enabled: _clipboardService.hasContent,
                        child: Row(
                          children: [
                            Icon(Icons.content_paste, size: 18, color: _clipboardService.hasContent ? null : Colors.grey),
                            const SizedBox(width: 12),
                            Text('Paste', style: TextStyle(color: _clipboardService.hasContent ? null : Colors.grey)),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'rename',
                        child: Row(
                          children: [
                            Icon(Icons.edit, size: 18),
                            SizedBox(width: 12),
                            Text('Rename'),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'star',
                        child: Row(
                          children: [
                            Icon(file.starred == true ? Icons.star : Icons.star_border, size: 18),
                            const SizedBox(width: 12),
                            Text(file.starred == true ? 'Unstar' : 'Star'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'share',
                        child: Row(
                          children: [
                            Icon(Icons.share, size: 18),
                            SizedBox(width: 12),
                            Text('Share'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'properties',
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, size: 18),
                            SizedBox(width: 12),
                            Text('Properties'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'preview',
                        child: Row(
                          children: [
                            Icon(Icons.visibility, size: 18),
                            SizedBox(width: 12),
                            Text('Preview'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'comments',
                        child: Row(
                          children: [
                            Icon(Icons.comment_outlined, size: 18),
                            SizedBox(width: 12),
                            Text('Comments'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'download',
                        child: Row(
                          children: [
                            Icon(Icons.download, size: 18),
                            SizedBox(width: 12),
                            Text('Download'),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'offline_toggle',
                        child: Row(
                          children: [
                            Icon(Icons.cloud_download_outlined, size: 18),
                            const SizedBox(width: 12),
                            Text('files.offline.make_available'.tr()),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'trash',
                        child: Row(
                          children: [
                            Icon(Icons.delete_outline, size: 18, color: Colors.red),
                            SizedBox(width: 12),
                            Text('Move to trash', style: TextStyle(color: Colors.red)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const Spacer(),
              Text(
                file.name,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                formattedSize,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // API File List Item
  Widget _buildApiFileListItem(file_model.File file) {
    final sizeInBytes = int.tryParse(file.size) ?? 0;
    final formattedSize = _fileService.formatFileSize(sizeInBytes);
    final isImageOrVideo = file.mimeType.startsWith('image/') || file.mimeType.startsWith('video/');

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: isImageOrVideo && file.url != null && file.url!.isNotEmpty
            ? Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                ),
                clipBehavior: Clip.antiAlias,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.network(
                      file.url!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Icon(
                          _getFileIconFromMimeType(file.mimeType),
                          color: _getFileColorFromMimeType(file.mimeType),
                          size: 32,
                        );
                      },
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return Center(
                          child: SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              value: loadingProgress.expectedTotalBytes != null
                                  ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                                  : null,
                            ),
                          ),
                        );
                      },
                    ),
                    // Video play icon overlay
                    if (file.mimeType.startsWith('video/'))
                      Center(
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.6),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.play_arrow,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                  ],
                ),
              )
            : Icon(
                _getFileIconFromMimeType(file.mimeType),
                color: _getFileColorFromMimeType(file.mimeType),
                size: 32,
              ),
        title: Text(file.name),
        subtitle: Text(
          '$formattedSize • ${_formatDate(file.updatedAt ?? file.createdAt ?? DateTime.now())}',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert),
          onSelected: (value) => _handleApiFileAction(value, file),
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'open',
              child: Row(
                children: [
                  Icon(Icons.folder_open, size: 18),
                  SizedBox(width: 12),
                  Text('Open'),
                ],
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'cut',
              child: Row(
                children: [
                  Icon(Icons.content_cut, size: 18),
                  SizedBox(width: 12),
                  Text('Cut'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'copy',
              child: Row(
                children: [
                  Icon(Icons.content_copy, size: 18),
                  SizedBox(width: 12),
                  Text('Copy'),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'paste',
              enabled: _clipboardService.hasContent,
              child: Row(
                children: [
                  Icon(Icons.content_paste, size: 18, color: _clipboardService.hasContent ? null : Colors.grey),
                  const SizedBox(width: 12),
                  Text('Paste', style: TextStyle(color: _clipboardService.hasContent ? null : Colors.grey)),
                ],
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'rename',
              child: Row(
                children: [
                  Icon(Icons.edit, size: 18),
                  SizedBox(width: 12),
                  Text('Rename'),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'star',
              child: Row(
                children: [
                  Icon(file.starred == true ? Icons.star : Icons.star_border, size: 18),
                  const SizedBox(width: 12),
                  Text(file.starred == true ? 'Unstar' : 'Star'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'share',
              child: Row(
                children: [
                  Icon(Icons.share, size: 18),
                  SizedBox(width: 12),
                  Text('Share'),
                ],
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'properties',
              child: Row(
                children: [
                  Icon(Icons.info_outline, size: 18),
                  SizedBox(width: 12),
                  Text('Properties'),
                ],
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'preview',
              child: Row(
                children: [
                  Icon(Icons.visibility, size: 18),
                  SizedBox(width: 12),
                  Text('Preview'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'comments',
              child: Row(
                children: [
                  Icon(Icons.comment_outlined, size: 18),
                  SizedBox(width: 12),
                  Text('Comments'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'download',
              child: Row(
                children: [
                  Icon(Icons.download, size: 18),
                  SizedBox(width: 12),
                  Text('Download'),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'offline_toggle',
              child: Row(
                children: [
                  Icon(Icons.cloud_download_outlined, size: 18),
                  const SizedBox(width: 12),
                  Text('files.offline.make_available'.tr()),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'export_to_drive',
              child: Row(
                children: [
                  const Icon(Icons.cloud_upload, size: 18, color: Color(0xFF4285F4)),
                  const SizedBox(width: 12),
                  Text('files.export_to_drive'.tr()),
                ],
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'trash',
              child: Row(
                children: [
                  Icon(Icons.delete_outline, size: 18, color: Colors.red),
                  SizedBox(width: 12),
                  Text('Move to trash', style: TextStyle(color: Colors.red)),
                ],
              ),
            ),
          ],
        ),
        onTap: () => _openApiFile(file),
      ),
    );
  }

  Widget _buildFileGridItem(FolderFile file) {
    return Card(
      child: InkWell(
        onTap: () => _openFile(file),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    _getFileIcon(file.type),
                    color: _getFileColor(file.type),
                    size: 32,
                  ),
                  const Spacer(),
                  if (file.isStarred)
                    const Icon(
                      Icons.star,
                      size: 16,
                      color: Colors.amber,
                    ),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, size: 16),
                    onSelected: (value) => _handleFileAction(value, file),
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'preview',
                        child: Row(
                          children: [
                            Icon(Icons.visibility, size: 18),
                            SizedBox(width: 12),
                            Text('Preview'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'download',
                        child: Row(
                          children: [
                            Icon(Icons.download, size: 18),
                            SizedBox(width: 12),
                            Text('Download'),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'export_to_drive',
                        child: Row(
                          children: [
                            Icon(Icons.cloud_upload, size: 18, color: Color(0xFF4285F4)),
                            SizedBox(width: 12),
                            Text('Export to Google Drive'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'cut',
                        child: Row(
                          children: [
                            Icon(Icons.content_cut, size: 18),
                            SizedBox(width: 12),
                            Text('Cut'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'copy',
                        child: Row(
                          children: [
                            Icon(Icons.content_copy, size: 18),
                            SizedBox(width: 12),
                            Text('Copy'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'rename',
                        child: Row(
                          children: [
                            Icon(Icons.edit, size: 18),
                            SizedBox(width: 12),
                            Text('Rename'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem(
                        value: 'star',
                        child: Row(
                          children: [
                            Icon(
                              file.isStarred ? Icons.star : Icons.star_outline,
                              size: 18,
                            ),
                            const SizedBox(width: 12),
                            Text(file.isStarred ? 'Unstar' : 'Star'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'share',
                        child: Row(
                          children: [
                            Icon(Icons.share, size: 18),
                            SizedBox(width: 12),
                            Text('Share'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'properties',
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, size: 18),
                            SizedBox(width: 12),
                            Text('Properties'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'trash',
                        child: Row(
                          children: [
                            Icon(Icons.delete_outline, size: 18, color: Colors.red),
                            SizedBox(width: 12),
                            Text('Move to trash', style: TextStyle(color: Colors.red)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const Spacer(),
              Text(
                file.name,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                file.size,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFileListItem(FolderFile file) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          _getFileIcon(file.type),
          color: _getFileColor(file.type),
          size: 32,
        ),
        title: Text(file.name),
        subtitle: Text(
          '${file.size} • ${_formatDate(file.lastModified)}',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (file.isStarred)
              const Icon(Icons.star, size: 20, color: Colors.amber),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (value) => _handleFileAction(value, file),
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'preview',
                  child: Row(
                    children: [
                      Icon(Icons.visibility, size: 18),
                      SizedBox(width: 12),
                      Text('Preview'),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                const PopupMenuItem(
                  value: 'download',
                  child: Row(
                    children: [
                      Icon(Icons.download, size: 18),
                      SizedBox(width: 12),
                      Text('Download'),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'export_to_drive',
                  child: Row(
                    children: [
                      const Icon(Icons.cloud_upload, size: 18, color: Color(0xFF4285F4)),
                      const SizedBox(width: 12),
                      Text('files.export_to_drive'.tr()),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                const PopupMenuItem(
                  value: 'cut',
                  child: Row(
                    children: [
                      Icon(Icons.content_cut, size: 18),
                      SizedBox(width: 12),
                      Text('Cut'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'copy',
                  child: Row(
                    children: [
                      Icon(Icons.content_copy, size: 18),
                      SizedBox(width: 12),
                      Text('Copy'),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                const PopupMenuItem(
                  value: 'rename',
                  child: Row(
                    children: [
                      Icon(Icons.edit, size: 18),
                      SizedBox(width: 12),
                      Text('Rename'),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'star',
                  child: Row(
                    children: [
                      Icon(
                        file.isStarred ? Icons.star : Icons.star_outline,
                        size: 18,
                      ),
                      const SizedBox(width: 12),
                      Text(file.isStarred ? 'Unstar' : 'Star'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'share',
                  child: Row(
                    children: [
                      Icon(Icons.share, size: 18),
                      SizedBox(width: 12),
                      Text('Share'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'properties',
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, size: 18),
                      SizedBox(width: 12),
                      Text('Properties'),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                const PopupMenuItem(
                  value: 'trash',
                  child: Row(
                    children: [
                      Icon(Icons.delete_outline, size: 18, color: Colors.red),
                      SizedBox(width: 12),
                      Text('Move to trash', style: TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
        onTap: () => _openFile(file),
      ),
    );
  }

  IconData _getFileIcon(String type) {
    switch (type.toLowerCase()) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'image':
        return Icons.image;
      case 'video':
        return Icons.videocam;
      case 'doc':
        return Icons.description;
      case 'audio':
        return Icons.audiotrack;
      default:
        return Icons.insert_drive_file;
    }
  }

  Color _getFileColor(String type) {
    switch (type.toLowerCase()) {
      case 'pdf':
        return Colors.red;
      case 'image':
        return Colors.green;
      case 'video':
        return Colors.purple;
      case 'doc':
        return Colors.blue;
      case 'audio':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'Today';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  void _openFile(FolderFile file) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Opening ${file.name}')),
    );
  }

  void _handleFileAction(String action, FolderFile file) {
    switch (action) {
      case 'preview':
        _showFilePreviewDialog(file);
        break;
      case 'download':
        _downloadFile(file);
        break;
      case 'cut':
        _cutFile = file;
        _copiedFile = null;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Cut ${file.name}')),
        );
        break;
      case 'copy':
        _copiedFile = file;
        _cutFile = null;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Copied ${file.name}')),
        );
        break;
      case 'rename':
        _showRenameFileDialog(file);
        break;
      case 'star':
        _toggleFileStar(file);
        break;
      case 'share':
        _showShareFileDialog(file);
        break;
      case 'properties':
        _showFilePropertiesDialog(file);
        break;
      case 'trash':
        _moveFileToTrash(file);
        break;
      case 'export_to_drive':
        _exportToGoogleDrive(file);
        break;
      default:
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$action: ${file.name}')),
        );
    }
  }

  Future<void> _openNestedFolder(NestedFolder folder) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FolderScreen(
          folderName: '${widget.folderName}/${folder.name}',
          folderId: '', // Mock folder - no API ID
          workspaceId: widget.workspaceId,
          itemCount: folder.itemCount,
          isShared: folder.isShared,
        ),
      ),
    );

    // Refresh folder contents when returning
    await _fetchFolderContents();
  }

  void _handleFolderAction(String action, NestedFolder folder) {
    switch (action) {
      case 'open':
        _openNestedFolder(folder);
        break;
      case 'cut':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Cut folder: ${folder.name}')),
        );
        break;
      case 'copy':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Copied folder: ${folder.name}')),
        );
        break;
      case 'paste':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Pasted into folder: ${folder.name}')),
        );
        break;
      case 'rename':
        _showRenameFolderDialog(folder);
        break;
      case 'star':
        _toggleFolderStar(folder);
        break;
      case 'share':
        _showShareFolderDialog(folder);
        break;
      case 'properties':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Properties of folder: ${folder.name}')),
        );
        break;
      case 'trash':
        _showDeleteFolderDialog(folder);
        break;
    }
  }

  void _showCreateFolderDialog() {
    final TextEditingController folderNameController = TextEditingController(text: 'New folder');
    final TextEditingController folderDescriptionController = TextEditingController();

    showDialog(
      context: context,
      barrierColor: Colors.black54,
      builder: (context) => Dialog(
        backgroundColor: Theme.of(context).colorScheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Container(
          width: 400,
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.8,
          ),
          padding: const EdgeInsets.all(24),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
              // Header with title and close button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Create subfolder',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: Icon(
                      Icons.close,
                      color: Theme.of(context).colorScheme.onSurface,
                      size: 20,
                    ),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 24,
                      minHeight: 24,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Info message
              Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 16,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Creating subfolder in "${widget.folderName}"',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Folder name field label
              Text(
                'Folder name',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),

              // Folder name input field
              TextField(
                controller: folderNameController,
                autofocus: true,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 14,
                ),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Theme.of(context).colorScheme.surfaceContainer,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(6),
                    borderSide: BorderSide(color: Theme.of(context).colorScheme.outline),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(6),
                    borderSide: BorderSide(color: Theme.of(context).colorScheme.outline),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(6),
                    borderSide: BorderSide(color: Theme.of(context).colorScheme.primary),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Description field label
              Text(
                'Description (optional)',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),

              // Description input field
              TextField(
                controller: folderDescriptionController,
                maxLines: 3,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontSize: 14,
                ),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Theme.of(context).colorScheme.surfaceContainer,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(6),
                    borderSide: BorderSide(color: Theme.of(context).colorScheme.outline),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(6),
                    borderSide: BorderSide(color: Theme.of(context).colorScheme.outline),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(6),
                    borderSide: BorderSide(color: Theme.of(context).colorScheme.primary),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  hintText: 'Enter folder description...',
                  hintStyle: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.5),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Action buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    style: TextButton.styleFrom(
                      foregroundColor: Theme.of(context).colorScheme.onSurfaceVariant,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                    ),
                    child: const Text(
                      'Cancel',
                      style: TextStyle(fontSize: 14),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: () {
                      final folderName = folderNameController.text.trim();
                      final folderDescription = folderDescriptionController.text.trim();
                      if (folderName.isNotEmpty) {
                        _createNestedFolder(
                          folderName,
                          description: folderDescription.isNotEmpty ? folderDescription : null,
                        );
                        Navigator.pop(context);
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Please enter a folder name')),
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.infoLight,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    child: const Text(
                      'Create',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          ),
        ),
      ),
    );
  }

  Future<void> _createNestedFolder(String folderName, {String? description}) async {
    // Validate folder name
    if (folderName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Folder name cannot be empty')),
      );
      return;
    }

    // Check for invalid characters
    if (folderName.contains(RegExp(r'[<>:"/\\|?*]'))) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Folder name contains invalid characters')),
      );
      return;
    }

    // Check if folder already exists in API subfolders
    if (_apiSubfolders.any((folder) => folder.name.toLowerCase() == folderName.toLowerCase())) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('A folder with this name already exists')),
      );
      return;
    }

    // Create new subfolder via API with parent_id
    final createdFolder = await _fileService.createFolder(
      name: folderName,
      parentId: widget.folderId, // Pass the current folder ID as parent
      description: description,
    );

    if (createdFolder != null) {
      // Refresh the folder contents to show the new subfolder
      await _fetchFolderContents();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Subfolder "$folderName" created successfully')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to create subfolder')),
      );
    }
  }

  void _showRenameFolderDialog(NestedFolder folder) {
    final TextEditingController renameController = TextEditingController(text: folder.name);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        title: const Text('Rename Folder'),
        content: TextField(
          controller: renameController,
          autofocus: true,
          decoration: InputDecoration(
            labelText: 'New Folder Name',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(5),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [context.primaryColor, Color(0xFF8B6BFF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: ElevatedButton(
              onPressed: () {
                final newName = renameController.text.trim();
                if (newName.isNotEmpty && newName != folder.name) {
                  // Update folder name in the list
                  setState(() {
                    final index = _folders.indexOf(folder);
                    if (index != -1) {
                      _folders[index] = NestedFolder(
                        name: newName,
                        itemCount: folder.itemCount,
                        lastModified: folder.lastModified,
                        isShared: folder.isShared,
                        isStarred: folder.isStarred,
                      );
                    }
                  });
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Folder renamed to "$newName"')),
                  );
                } else {
                  Navigator.pop(context);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                foregroundColor: Colors.white,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ).copyWith(
                elevation: WidgetStateProperty.all(0),
              ),
              child: const Text('Rename'),
            ),
          ),
        ],
      ),
    );
  }

  void _showDeleteFolderDialog(NestedFolder folder) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        title: const Text('Delete Folder'),
        content: Text('Are you sure you want to delete "${folder.name}" and all its contents?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _folders.remove(folder);
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Folder "${folder.name}" deleted')),
              );
            },
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showRenameFileDialog(FolderFile file) {
    final TextEditingController renameController = TextEditingController(text: file.name);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        title: const Text('Rename File'),
        content: TextField(
          controller: renameController,
          autofocus: true,
          decoration: InputDecoration(
            labelText: 'New File Name',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(5),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [context.primaryColor, Color(0xFF8B6BFF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: ElevatedButton(
              onPressed: () {
                final newName = renameController.text.trim();
                if (newName.isNotEmpty && newName != file.name) {
                  // Update file name in the list
                  setState(() {
                    final index = _files.indexOf(file);
                    if (index != -1) {
                      _files[index] = FolderFile(
                        id: file.id,
                        name: newName,
                        type: file.type,
                        size: file.size,
                        lastModified: file.lastModified,
                        isStarred: file.isStarred,
                      );
                    }
                  });
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('File renamed to "$newName"')),
                  );
                } else {
                  Navigator.pop(context);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                foregroundColor: Colors.white,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ).copyWith(
                elevation: WidgetStateProperty.all(0),
              ),
              child: const Text('Rename'),
            ),
          ),
        ],
      ),
    );
  }

  void _showFilePreviewDialog(FolderFile file) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400, maxHeight: 500),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Icon(
                    _getFileIcon(file.type),
                    color: _getFileColor(file.type),
                    size: 48,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          file.name,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${file.type.toUpperCase()} File • ${file.size}',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Container(
                width: double.infinity,
                height: 200,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _getFileIcon(file.type),
                        color: _getFileColor(file.type),
                        size: 64,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Preview not available',
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      Text(
                        'File preview coming soon',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Close'),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [context.primaryColor, Color(0xFF8B6BFF)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _downloadFile(file);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        foregroundColor: Colors.white,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ).copyWith(
                        elevation: WidgetStateProperty.all(0),
                      ),
                      child: const Text('Download'),
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

  Future<void> _downloadFile(FolderFile file) async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Downloading ${file.name}...')),
    );

    final filePath = await _fileService.downloadFile(
      fileId: file.id,
      fileName: file.name,
    );

    if (filePath != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Downloaded to:\n$filePath'),
          duration: const Duration(seconds: 4),
          backgroundColor: Colors.green,
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Download failed')),
      );
    }
  }

  Future<void> _exportToGoogleDrive(FolderFile file) async {
    // Show folder picker
    final result = await GoogleDriveFolderPicker.show(
      context: context,
      title: 'files.export_to_drive_title'.tr(),
      subtitle: 'files.export_to_drive_subtitle'.tr(args: [file.name]),
    );

    if (result == null) return;

    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => PopScope(
        canPop: false,
        child: AlertDialog(
          content: Row(
            children: [
              const CircularProgressIndicator(),
              const SizedBox(width: 20),
              Expanded(
                child: Text('files.exporting_to_drive'.tr(args: [file.name])),
              ),
            ],
          ),
        ),
      ),
    );

    try {
      final driveService = GoogleDriveService.instance;
      final exportResult = await driveService.exportFile(
        fileId: file.id,
        targetFolderId: result.folderId,
      );

      // Close loading dialog
      if (mounted) Navigator.of(context).pop();

      if (exportResult.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('files.export_success'.tr(args: [file.name, result.folderPath ?? 'My Drive'])),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(exportResult.message ?? 'files.export_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) Navigator.of(context).pop();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('files.export_failed'.tr()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _toggleFileStar(FolderFile file) {
    setState(() {
      final index = _files.indexOf(file);
      if (index != -1) {
        _files[index] = FolderFile(
          id: file.id,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          isStarred: !file.isStarred,
        );
      }
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          file.isStarred ? 'Removed star from ${file.name}' : 'Starred ${file.name}',
        ),
      ),
    );
  }

  void _showShareFileDialog(FolderFile file) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.share,
                    color: Theme.of(context).colorScheme.primary,
                    size: 32,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Share File',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Share "${file.name}" with others',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              TextField(
                decoration: InputDecoration(
                  labelText: 'Email addresses',
                  hintText: 'Enter email addresses separated by commas',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      decoration: InputDecoration(
                        labelText: 'Permission',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      value: 'view',
                      items: const [
                        DropdownMenuItem(value: 'view', child: Text('Can view')),
                        DropdownMenuItem(value: 'edit', child: Text('Can edit')),
                        DropdownMenuItem(value: 'owner', child: Text('Owner')),
                      ],
                      onChanged: (value) {},
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [context.primaryColor, Color(0xFF8B6BFF)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Shared ${file.name}')),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        foregroundColor: Colors.white,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ).copyWith(
                        elevation: WidgetStateProperty.all(0),
                      ),
                      child: const Text('Share'),
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

  void _showFilePropertiesDialog(FolderFile file) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: Theme.of(context).colorScheme.primary,
                    size: 32,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      'File Properties',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    _buildPropertyRow('Name', file.name),
                    _buildPropertyRow('Type', '${file.type.toUpperCase()} File'),
                    _buildPropertyRow('Size', file.size),
                    _buildPropertyRow('Modified', _formatDate(file.lastModified)),
                    _buildPropertyRow('Location', '${widget.folderName}/'),
                    _buildPropertyRow('Starred', file.isStarred ? 'Yes' : 'No'),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [context.primaryColor, Color(0xFF8B6BFF)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        foregroundColor: Colors.white,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ).copyWith(
                        elevation: WidgetStateProperty.all(0),
                      ),
                      child: const Text('Close'),
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

  Widget _buildPropertyRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }

  void _moveFileToTrash(FolderFile file) {
    final fileToRemove = file;
    setState(() {
      _files.remove(file);
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Moved ${file.name} to trash'),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: () {
            setState(() {
              _files.add(fileToRemove);
            });
          },
        ),
      ),
    );
  }

  void _toggleFolderStar(NestedFolder folder) {
    setState(() {
      final index = _folders.indexOf(folder);
      if (index != -1) {
        _folders[index] = NestedFolder(
          name: folder.name,
          itemCount: folder.itemCount,
          lastModified: folder.lastModified,
          isShared: folder.isShared,
          isStarred: !folder.isStarred,
        );
      }
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          folder.isStarred ? 'Removed star from ${folder.name}' : 'Starred ${folder.name}',
        ),
      ),
    );
  }

  void _showShareFolderDialog(NestedFolder folder) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(20),
        child: DefaultTabController(
          length: 2,
          child: Container(
            width: 500,
            height: 700,
            decoration: BoxDecoration(
              color: isDarkMode ? const Color(0xFF1E1E1E) : Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      const Icon(Icons.share_outlined, size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Share "${folder.name}"',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                // Tabs
                Container(
                  height: 48,
                  margin: const EdgeInsets.symmetric(horizontal: 20),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: Theme.of(context).dividerColor.withValues(alpha: 0.2),
                      ),
                    ),
                  ),
                  child: TabBar(
                    labelColor: AppTheme.infoLight,
                    unselectedLabelColor: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                    indicatorColor: AppTheme.infoLight,
                    indicatorWeight: 2,
                    labelStyle: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                    tabs: const [
                      Tab(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.people_outline, size: 20),
                            SizedBox(width: 8),
                            Text('People'),
                          ],
                        ),
                      ),
                      Tab(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.link, size: 20),
                            SizedBox(width: 8),
                            Text('Link Sharing'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                // Tab content
                Expanded(
                  child: TabBarView(
                    children: [
                      // People tab
                      _buildPeopleTab(folder),
                      // Link Sharing tab
                      _buildLinkSharingTab(folder),
                    ],
                  ),
                ),
                // Footer
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(
                        color: isDarkMode ? const Color(0xFF2A2F3A) : Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                        width: 1,
                      ),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '0 people with access',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: Text(
                              'Cancel',
                              style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFF8B6BFF),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: MaterialButton(
                              onPressed: () {
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Shared folder "${folder.name}"'),
                                  ),
                                );
                              },
                              child: const Row(
                                children: [
                                  Icon(Icons.check, color: Colors.white, size: 20),
                                  SizedBox(width: 8),
                                  Text(
                                    'Done',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
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
        ),
      ),
    );
  }

  Widget _buildPeopleTab(NestedFolder folder) {
    final TextEditingController emailController = TextEditingController();
    final TextEditingController messageController = TextEditingController();
    String selectedPermission = 'Viewer';
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    
    return StatefulBuilder(
      builder: (context, setState) {
        return Column(
          children: [
            // Add people section
            Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Add people',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: emailController,
                          style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                          decoration: InputDecoration(
                            hintText: 'Enter email address',
                            hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5)),
                            filled: true,
                            fillColor: isDarkMode ? const Color(0xFF2A2F3A) : Theme.of(context).colorScheme.surfaceContainer,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(5),
                              borderSide: BorderSide.none,
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        decoration: BoxDecoration(
                          color: isDarkMode ? const Color(0xFF2A2F3A) : Theme.of(context).colorScheme.surfaceContainer,
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: DropdownButton<String>(
                          value: selectedPermission,
                          dropdownColor: isDarkMode ? const Color(0xFF2A2F3A) : Theme.of(context).colorScheme.surfaceContainer,
                          style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                          underline: const SizedBox(),
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          items: ['Viewer', 'Editor'].map((String value) {
                            return DropdownMenuItem<String>(
                              value: value,
                              child: Text(value),
                            );
                          }).toList(),
                          onChanged: (String? newValue) {
                            if (newValue != null) {
                              setState(() {
                                selectedPermission = newValue;
                              });
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      IconButton(
                        onPressed: () {
                          // Send invite logic
                        },
                        icon: const Icon(Icons.send, color: Color(0xFF8B6BFF)),
                        style: IconButton.styleFrom(
                          backgroundColor: isDarkMode ? const Color(0xFF2A2F3A) : Theme.of(context).colorScheme.surfaceContainer,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: messageController,
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Add a message (optional)',
                      hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5)),
                      filled: true,
                      fillColor: isDarkMode ? const Color(0xFF2A2F3A) : Theme.of(context).colorScheme.surfaceContainer,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(5),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                ],
              ),
            ),
            // Search people section
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                decoration: InputDecoration(
                  hintText: 'Search people...',
                  hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5)),
                  filled: true,
                  fillColor: isDarkMode ? const Color(0xFF2A2F3A) : Theme.of(context).colorScheme.surfaceContainer,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(5),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            // People list
            Expanded(
              child: Container(
                decoration: const BoxDecoration(
                  border: Border(
                    top: BorderSide(
                      color: Color(0xFF2A2F3A),
                      width: 1,
                    ),
                  ),
                ),
                child: ListView.separated(
                  padding: const EdgeInsets.only(top: 8),
                  itemCount: 3,
                  separatorBuilder: (context, index) => Container(
                    height: 1,
                    color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                  itemBuilder: (context, index) {
                    switch (index) {
                      case 0:
                        return _buildPersonItem('Alice Johnson', 'alice@company.com', 'A');
                      case 1:
                        return _buildPersonItem('Bob Smith', 'bob@company.com', 'B', hasImage: true);
                      case 2:
                        return _buildPersonItem('Carol Davis', 'carol@company.com', 'C', hasImage: true);
                      default:
                        return const SizedBox();
                    }
                  },
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildPersonItem(String name, String email, String initial, {bool hasImage = false}) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: hasImage ? Colors.grey.shade600 : const Color(0xFF8B6BFF),
            child: hasImage
                ? ClipOval(
                    child: Container(
                      color: Colors.grey.shade600,
                      child: Icon(Icons.person, color: Colors.white.withValues(alpha: 0.8), size: 20),
                    ),
                  )
                : Text(
                    initial,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  email,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          // More options menu
          PopupMenuButton<String>(
            icon: Icon(
              Icons.more_vert,
              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
              size: 18,
            ),
            color: isDarkMode ? const Color(0xFF2A2F3A) : Theme.of(context).colorScheme.surfaceContainer,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(5),
            ),
            onSelected: (value) {
              switch (value) {
                case 'viewer':
                  // Handle viewer permission
                  break;
                case 'editor':
                  // Handle editor permission
                  break;
                case 'remove':
                  // Handle remove person
                  break;
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'viewer',
                child: Row(
                  children: [
                    Icon(
                      Icons.visibility_outlined,
                      size: 18,
                      color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.8),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Viewer',
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                    ),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'editor',
                child: Row(
                  children: [
                    Icon(
                      Icons.edit_outlined,
                      size: 18,
                      color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.8),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Editor',
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                    ),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'remove',
                child: Row(
                  children: [
                    Icon(
                      Icons.person_remove_outlined,
                      size: 18,
                      color: Colors.red.withValues(alpha: 0.8),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Remove',
                      style: TextStyle(color: Colors.red.withValues(alpha: 0.8)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLinkSharingTab(NestedFolder folder) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    bool linkSharingEnabled = true;
    String selectedPermission = 'view';
    bool allowEditing = false;
    bool allowDownloading = true;
    bool allowCopying = true;
    bool allowPrinting = true;
    
    return StatefulBuilder(
      builder: (context, setState) {
        return SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Share with link section
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Share with link',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Anyone with the link can access this folder',
                          style: TextStyle(
                            fontSize: 14,
                            color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Switch(
                    value: linkSharingEnabled,
                    onChanged: (value) {
                      setState(() {
                        linkSharingEnabled = value;
                      });
                    },
                    activeColor: AppTheme.infoLight,
                  ),
                ],
              ),
              if (linkSharingEnabled) ...[
                const SizedBox(height: 24),
                // Link copy section
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDarkMode ? const Color(0xFF2A2A2A) : Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: TextEditingController(text: 'http://localhost:3000/shared/folder-${folder.name.toLowerCase().replaceAll(' ', '-')}'),
                          readOnly: true,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
                            fontSize: 14,
                          ),
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                          onTap: () {
                            // Select all text when tapped
                            final controller = TextEditingController(text: 'http://localhost:3000/shared/folder-${folder.name.toLowerCase().replaceAll(' ', '-')}');
                            controller.selection = TextSelection(
                              baseOffset: 0,
                              extentOffset: controller.text.length,
                            );
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.copy, size: 20),
                        color: AppTheme.infoLight,
                        onPressed: () {
                          final link = 'http://localhost:3000/shared/folder-${folder.name.toLowerCase().replaceAll(' ', '-')}';
                          Clipboard.setData(ClipboardData(text: link));
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Link copied to clipboard'),
                              backgroundColor: Colors.green,
                            ),
                          );
                        },
                        tooltip: 'Copy link',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                // Who has access dropdown
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Who has access',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedPermission,
                          isExpanded: true,
                          icon: const Icon(Icons.arrow_drop_down),
                          onChanged: (String? newValue) {
                            if (newValue != null) {
                              setState(() {
                                selectedPermission = newValue;
                              });
                            }
                          },
                          items: <String>['view', 'edit'].map<DropdownMenuItem<String>>((String value) {
                            return DropdownMenuItem<String>(
                              value: value,
                              child: Text(
                                value == 'view' ? 'Anyone with the link can view' : 'Anyone with the link can edit',
                                style: const TextStyle(fontSize: 14),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                // Additional options section
                const Text(
                  'Additional options',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 16),
                if (selectedPermission == 'view') ...[
                  _buildLinkOption(
                    icon: Icons.edit_outlined,
                    title: 'Allow editing',
                    value: allowEditing,
                    onChanged: (value) {
                      setState(() {
                        allowEditing = value;
                      });
                    },
                  ),
                ],
                _buildLinkOption(
                  icon: Icons.download_outlined,
                  title: 'Disable downloading',
                  value: !allowDownloading,
                  onChanged: (value) {
                    setState(() {
                      allowDownloading = !value;
                    });
                  },
                ),
                _buildLinkOption(
                  icon: Icons.copy_outlined,
                  title: 'Disable copying',
                  value: !allowCopying,
                  onChanged: (value) {
                    setState(() {
                      allowCopying = !value;
                    });
                  },
                ),
                _buildLinkOption(
                  icon: Icons.print_outlined,
                  title: 'Disable printing',
                  value: !allowPrinting,
                  onChanged: (value) {
                    setState(() {
                      allowPrinting = !value;
                    });
                  },
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildLinkOption({
    required IconData icon,
    required String title,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontSize: 14),
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: AppTheme.infoLight,
          ),
        ],
      ),
    );
  }


  // API Folder Actions
  Future<void> _openApiFolder(model.Folder folder) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FolderScreen(
          folderName: '${widget.folderName}/${folder.name}',
          folderId: folder.id,
          workspaceId: widget.workspaceId,
          itemCount: 0,
          isShared: false,
        ),
      ),
    );

    // Refresh folder contents when returning from subfolder
    await _fetchFolderContents();
  }

  void _handleApiFolderAction(String action, model.Folder folder) {
    switch (action) {
      case 'open':
        _openApiFolder(folder);
        break;
      case 'cut':
        _clipboardService.setCutFolder(folder);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Folder "${folder.name}" cut to clipboard')),
        );
        break;
      case 'copy':
        _clipboardService.copyFolder(folder);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Folder "${folder.name}" copied to clipboard')),
        );
        break;
      case 'paste':
        _handlePaste();
        break;
      case 'rename':
        _showRenameApiFolderDialog(folder);
        break;
      case 'star':
        _toggleApiFolderStar(folder);
        break;
      case 'share':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Share folder: ${folder.name}')),
        );
        break;
      case 'properties':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Properties of folder: ${folder.name}')),
        );
        break;
      case 'trash':
        _deleteApiFolder(folder);
        break;
    }
  }

  Future<void> _deleteApiFolder(model.Folder folder) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Folder'),
        content: Text('Are you sure you want to delete "${folder.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await _fileService.deleteFolder(folder.id);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Folder "${folder.name}" deleted')),
        );
        _fetchFolderContents();
      }
    }
  }

  /// Mark file as opened to track in recent files
  Future<void> _markFileAsOpened(String fileId) async {
    try {
      await _fileService.updateFile(
        fileId,
        markAsOpened: true,
      );
      debugPrint('✅ Marked file $fileId as opened');
    } catch (e) {
      debugPrint('❌ Error marking file as opened: $e');
    }
  }

  // API File Actions
  void _openApiFile(file_model.File file) {
    // Mark file as opened to track in recent files
    _markFileAsOpened(file.id);

    // Check if it's an image file
    if (file.mimeType.startsWith('image/')) {
      showImagePreviewDialog(
        context,
        file: file,
      );
    }
    // Check if it's a video file
    else if (file.mimeType.startsWith('video/')) {
      showVideoPlayerDialog(
        context,
        file: file,
      );
    }
    else {
      // For other files, show generic message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Opening ${file.name}')),
      );
    }
  }

  void _handleApiFileAction(String action, file_model.File file) {
    switch (action) {
      case 'open':
        _openApiFile(file);
        break;
      case 'cut':
        _clipboardService.setCutFile(file);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('File "${file.name}" cut to clipboard')),
        );
        break;
      case 'copy':
        _clipboardService.copyFile(file);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('File "${file.name}" copied to clipboard')),
        );
        break;
      case 'paste':
        _handlePaste();
        break;
      case 'rename':
        _showRenameApiFileDialog(file);
        break;
      case 'star':
        _toggleApiFileStar(file);
        break;
      case 'share':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Share file: ${file.name}')),
        );
        break;
      case 'properties':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Properties of file: ${file.name}')),
        );
        break;
      case 'preview':
        // Mark file as opened to track in recent files
        _markFileAsOpened(file.id);
        // Check if it's an image file - show image preview dialog
        if (file.mimeType.startsWith('image/')) {
          showImagePreviewDialog(
            context,
            file: file,
          );
        }
        // Check if it's a video file - show video player dialog
        else if (file.mimeType.startsWith('video/')) {
          showVideoPlayerDialog(
            context,
            file: file,
          );
        }
        else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Preview ${file.name}')),
          );
        }
        break;
      case 'download':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Downloading ${file.name}...')),
        );
        // TODO: Implement actual download functionality
        break;
      case 'trash':
        _deleteApiFile(file);
        break;
      case 'comments':
        showFileCommentsSheet(
          context,
          workspaceId: widget.workspaceId,
          fileId: file.id,
          fileName: file.name,
        );
        break;
      case 'offline_toggle':
        handleOfflineAction(context: context, file: file);
        break;
    }
  }

  Future<void> _deleteApiFile(file_model.File file) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete File'),
        content: Text('Are you sure you want to delete "${file.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await _fileService.deleteFile(file.id);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('File "${file.name}" deleted')),
        );
        _fetchFolderContents();
      }
    }
  }

  /// Show paste menu on long press
  void _showPasteMenu() {

    // Check if there's anything in the clipboard
    if (!_clipboardService.hasContent) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Clipboard is empty')),
      );
      return; // Nothing to paste
    }


    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_clipboardService.copiedFile != null || _clipboardService.cutFile != null) ...[
              ListTile(
                leading: Icon(
                  _clipboardService.cutFile != null ? Icons.drive_file_move : Icons.content_paste,
                  color: Theme.of(context).colorScheme.primary,
                ),
                title: Text(
                  _clipboardService.cutFile != null
                      ? 'Paste (Move) "${_clipboardService.cutFile!.name}"'
                      : 'Paste (Copy) "${_clipboardService.copiedFile!.name}"',
                ),
                subtitle: Text('Paste to ${widget.folderName}'),
                onTap: () {
                  Navigator.pop(context);
                  _handlePaste();
                },
              ),
            ],
            if (_clipboardService.copiedFiles.isNotEmpty) ...[
              ListTile(
                leading: Icon(
                  Icons.content_paste,
                  color: Theme.of(context).colorScheme.primary,
                ),
                title: Text('Paste ${_clipboardService.copiedFiles.length} file(s)'),
                subtitle: Text('Paste to ${widget.folderName}'),
                onTap: () {
                  Navigator.pop(context);
                  _pasteMultipleFiles();
                },
              ),
            ],
            if (_clipboardService.copiedFolders.isNotEmpty) ...[
              ListTile(
                leading: Icon(
                  Icons.content_paste,
                  color: Theme.of(context).colorScheme.primary,
                ),
                title: Text('Paste ${_clipboardService.copiedFolders.length} folder(s)'),
                subtitle: Text('Paste to ${widget.folderName}'),
                onTap: () {
                  Navigator.pop(context);
                  _pasteMultipleFolders();
                },
              ),
            ],
            if (_clipboardService.cutFiles.isNotEmpty) ...[
              ListTile(
                leading: Icon(
                  Icons.drive_file_move,
                  color: Theme.of(context).colorScheme.primary,
                ),
                title: Text('Paste (Move) ${_clipboardService.cutFiles.length} file(s)'),
                subtitle: Text('Move to ${widget.folderName}'),
                onTap: () {
                  Navigator.pop(context);
                  _pasteCutFiles();
                },
              ),
            ],
            if (_clipboardService.cutFolders.isNotEmpty) ...[
              ListTile(
                leading: Icon(
                  Icons.drive_file_move,
                  color: Theme.of(context).colorScheme.primary,
                ),
                title: Text('Paste (Move) ${_clipboardService.cutFolders.length} folder(s)'),
                subtitle: Text('Move to ${widget.folderName}'),
                onTap: () {
                  Navigator.pop(context);
                  _pasteCutFolders();
                },
              ),
            ],
            if (_clipboardService.copiedFolder != null || _clipboardService.cutFolder != null) ...[
              ListTile(
                leading: Icon(
                  _clipboardService.cutFolder != null ? Icons.drive_folder_upload : Icons.content_paste,
                  color: Theme.of(context).colorScheme.primary,
                ),
                title: Text(
                  _clipboardService.cutFolder != null
                      ? 'Paste (Move) "${_clipboardService.cutFolder!.name}"'
                      : 'Paste (Copy) "${_clipboardService.copiedFolder!.name}"',
                ),
                subtitle: Text('Paste to ${widget.folderName}'),
                onTap: () {
                  Navigator.pop(context);
                  _handlePaste();
                },
              ),
            ],
            const SizedBox(height: 8),
            ListTile(
              leading: Icon(
                Icons.clear,
                color: Theme.of(context).colorScheme.error,
              ),
              title: const Text('Clear Clipboard'),
              onTap: () {
                Navigator.pop(context);
                _clipboardService.clear();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Clipboard cleared')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  // Paste handler for API items
  Future<void> _handlePaste() async {
    if (_clipboardService.copiedFile != null) {
      // Handle file copy
      final file = _clipboardService.copiedFile!;
      final targetFolderId = widget.folderId;

      // Show dialog to optionally rename the file
      final controller = TextEditingController(text: '${file.name.split('.').first}-copy.${file.extension}');

      final shouldPaste = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Paste File'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Pasting "${file.name}" to this folder'),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  labelText: 'New File Name (Optional)',
                  border: OutlineInputBorder(),
                  helperText: 'Leave as is or rename the copied file',
                ),
                autofocus: true,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Paste'),
            ),
          ],
        ),
      );

      if (shouldPaste != true) return;

      final newName = controller.text.trim();

      try {
        final copiedFile = await _fileService.copyFile(
          fileId: file.id,
          targetFolderId: targetFolderId,
          newName: newName.isNotEmpty ? newName : null,
        );

        if (copiedFile != null && mounted) {
          _clipboardService.clear();
          await _fetchFolderContents();

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('File copied as "${copiedFile.name}"')),
            );
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to copy file')),
          );
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error copying file: $e')),
        );
      }
    } else if (_clipboardService.cutFile != null) {
      // Handle file move (cut)
      final file = _clipboardService.cutFile!;
      final targetFolderId = widget.folderId;

      // Show dialog to optionally rename the file
      final controller = TextEditingController(text: file.name);

      final shouldPaste = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Move File'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Moving "${file.name}" to this folder'),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  labelText: 'New File Name (Optional)',
                  border: OutlineInputBorder(),
                  helperText: 'Leave as is or rename the moved file',
                ),
                autofocus: true,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Move'),
            ),
          ],
        ),
      );

      if (shouldPaste != true) return;

      final newName = controller.text.trim();

      try {
        final movedFile = await _fileService.moveFile(
          fileId: file.id,
          targetFolderId: targetFolderId,
          newName: newName.isNotEmpty && newName != file.name ? newName : null,
        );

        if (movedFile != null && mounted) {
          _clipboardService.clear();
          await _fetchFolderContents();

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('File moved as "${movedFile.name}"')),
            );
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to move file')),
          );
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error moving file: $e')),
        );
      }
    } else if (_clipboardService.copiedFolder != null) {
      // Handle folder copy
      final folder = _clipboardService.copiedFolder!;
      final targetParentId = widget.folderId;

      // Show dialog to optionally rename the folder
      final controller = TextEditingController(text: '${folder.name}-copy');

      final shouldPaste = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Paste Folder'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Pasting folder "${folder.name}" to this location'),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  labelText: 'New Folder Name (Optional)',
                  border: OutlineInputBorder(),
                  helperText: 'Leave as is or rename the copied folder',
                ),
                autofocus: true,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Paste'),
            ),
          ],
        ),
      );

      if (shouldPaste != true) return;

      final newName = controller.text.trim();

      try {
        final copiedFolder = await _fileService.copyFolder(
          folderId: folder.id,
          targetParentId: targetParentId,
          newName: newName.isNotEmpty ? newName : null,
        );

        if (copiedFolder != null && mounted) {
          _clipboardService.clear();
          await _fetchFolderContents();

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Folder copied as "${copiedFolder.name}"')),
            );
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to copy folder')),
          );
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error copying folder: $e')),
        );
      }
    } else if (_clipboardService.cutFolder != null) {
      // Handle folder move (cut)
      final folder = _clipboardService.cutFolder!;
      final targetParentId = widget.folderId;

      // Show dialog to optionally rename the folder during move
      final controller = TextEditingController(text: folder.name);

      final shouldMove = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Move Folder'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Moving folder "${folder.name}" to this location'),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  labelText: 'Folder Name (Optional)',
                  border: OutlineInputBorder(),
                  helperText: 'Keep current name or rename during move',
                ),
                autofocus: true,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Move'),
            ),
          ],
        ),
      );

      if (shouldMove != true) return;

      final newName = controller.text.trim();

      try {
        final movedFolder = await _fileService.moveFolder(
          folderId: folder.id,
          targetParentId: targetParentId,
          newName: newName.isNotEmpty && newName != folder.name ? newName : null,
        );

        if (movedFolder != null && mounted) {
          _clipboardService.clear();
          await _fetchFolderContents();

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Folder moved as "${movedFolder.name}"')),
            );
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to move folder')),
          );
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error moving folder: $e')),
        );
      }
    }
  }

  Future<void> _pasteMultipleFiles() async {
    if (_clipboardService.copiedFiles.isEmpty) return;

    final files = _clipboardService.copiedFiles;
    final fileIds = files.map((f) => f.id).toList();

    try {
      // Use the copy API to paste files to this folder
      final fileApiService = FileApiService();
      final response = await fileApiService.copyFiles(
        widget.workspaceId,
        CopyFilesDto(
          fileIds: fileIds,
          targetFolderId: widget.folderId,
        ),
      );

      if (response.isSuccess && response.data != null) {
        final result = response.data!;
        if (mounted) {
          _clipboardService.clear();
          await _fetchFolderContents(); // Refresh to show the new files

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.message),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to paste files'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error pasting files: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _pasteMultipleFolders() async {
    if (_clipboardService.copiedFolders.isEmpty) return;

    final folders = _clipboardService.copiedFolders;
    final folderIds = folders.map((f) => f.id).toList();

    try {
      // Use the copy API to paste folders to this folder
      final fileApiService = FileApiService();
      final response = await fileApiService.copyFolders(
        widget.workspaceId,
        CopyFoldersDto(
          folderIds: folderIds,
          targetParentId: widget.folderId,
        ),
      );

      if (response.isSuccess && response.data != null) {
        final result = response.data!;
        if (mounted) {
          _clipboardService.clear();
          await _fetchFolderContents(); // Refresh to show the new folders

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.message),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to paste folders'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error pasting folders: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _pasteCutFiles() async {
    if (_clipboardService.cutFiles.isEmpty) return;

    final files = _clipboardService.cutFiles;
    final fileIds = files.map((f) => f.id).toList();

    try {
      // Use the move API to move files to this folder
      final fileApiService = FileApiService();
      final response = await fileApiService.moveFiles(
        widget.workspaceId,
        MoveFilesDto(
          fileIds: fileIds,
          targetFolderId: widget.folderId,
        ),
      );

      if (response.isSuccess && response.data != null) {
        final result = response.data!;
        if (mounted) {
          _clipboardService.clear();
          await _fetchFolderContents(); // Refresh to show the moved files

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.message),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to move files'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error moving files: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _pasteCutFolders() async {
    if (_clipboardService.cutFolders.isEmpty) return;

    final folders = _clipboardService.cutFolders;
    final folderIds = folders.map((f) => f.id).toList();

    try {
      // Use the move API to move folders to this folder
      final fileApiService = FileApiService();
      final response = await fileApiService.moveFolders(
        widget.workspaceId,
        MoveFoldersDto(
          folderIds: folderIds,
          targetParentId: widget.folderId,
        ),
      );

      if (response.isSuccess && response.data != null) {
        final result = response.data!;
        if (mounted) {
          _clipboardService.clear();
          await _fetchFolderContents(); // Refresh to show the moved folders

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.message),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to move folders'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error moving folders: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // Show rename API folder dialog
  void _showRenameApiFolderDialog(model.Folder folder) {
    final controller = TextEditingController(text: folder.name);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename Folder'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Folder Name',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              final newName = controller.text.trim();
              if (newName.isNotEmpty && newName != folder.name) {
                final success = await _fileService.updateFolder(
                  folder.id,
                  name: newName,
                );
                if (success && mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Folder renamed to "$newName"')),
                  );
                  _fetchFolderContents();
                }
              }
            },
            child: const Text('Rename'),
          ),
        ],
      ),
    );
  }

  // Show rename API file dialog
  void _showRenameApiFileDialog(file_model.File file) {
    final controller = TextEditingController(text: file.name);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename File'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'File Name',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              final newName = controller.text.trim();
              if (newName.isNotEmpty && newName != file.name) {
                final success = await _fileService.updateFile(
                  file.id,
                  name: newName,
                );
                if (success && mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('File renamed to "$newName"')),
                  );
                  _fetchFolderContents();
                }
              }
            },
            child: const Text('Rename'),
          ),
        ],
      ),
    );
  }

  // Toggle API folder star status
  Future<void> _toggleApiFolderStar(model.Folder folder) async {
    // TODO: Implement folder star toggle API
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Folder star toggle coming soon')),
    );
  }

  // Toggle API file star status
  Future<void> _toggleApiFileStar(file_model.File file) async {
    final newStarredStatus = !(file.starred ?? false);
    final success = await _fileService.toggleStarred(file.id, newStarredStatus);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(newStarredStatus ? 'File starred' : 'File unstarred')),
      );
      _fetchFolderContents();
    }
  }

  // Helper methods for API files
  IconData _getFileIconFromMimeType(String mimeType) {
    if (mimeType.startsWith('image/')) return Icons.image;
    if (mimeType.startsWith('video/')) return Icons.videocam;
    if (mimeType.startsWith('audio/')) return Icons.audiotrack;
    if (mimeType == 'application/pdf') return Icons.picture_as_pdf;
    if (mimeType.contains('word') || mimeType.contains('document')) {
      return Icons.description;
    }
    if (mimeType.contains('excel') || mimeType.contains('spreadsheet')) {
      return Icons.table_chart;
    }
    if (mimeType.contains('powerpoint') || mimeType.contains('presentation')) {
      return Icons.slideshow;
    }
    if (mimeType.startsWith('text/')) return Icons.description;
    return Icons.insert_drive_file;
  }

  Color _getFileColorFromMimeType(String mimeType) {
    if (mimeType.startsWith('image/')) return Colors.green;
    if (mimeType.startsWith('video/')) return Colors.purple;
    if (mimeType.startsWith('audio/')) return Colors.orange;
    if (mimeType == 'application/pdf') return Colors.red;
    if (mimeType.contains('word') || mimeType.contains('document')) {
      return Colors.blue;
    }
    if (mimeType.contains('excel') || mimeType.contains('spreadsheet')) {
      return Colors.teal;
    }
    if (mimeType.contains('powerpoint') || mimeType.contains('presentation')) {
      return Colors.deepOrange;
    }
    if (mimeType.startsWith('text/')) return Colors.blueGrey;
    return Colors.grey;
  }

  void _pasteItem() {
    if (_cutFile != null) {
      final file = _cutFile!;
      setState(() {
        _files.add(FolderFile(
          id: file.id,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: DateTime.now(),
          isStarred: file.isStarred,
        ));
        _cutFile = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Moved ${file.name} to ${widget.folderName}')),
      );
    } else if (_copiedFile != null) {
      final file = _copiedFile!;
      setState(() {
        _files.add(FolderFile(
          id: '${file.id}-copy-${DateTime.now().millisecondsSinceEpoch}',
          name: '${file.name} - Copy',
          type: file.type,
          size: file.size,
          lastModified: DateTime.now(),
          isStarred: file.isStarred,
        ));
        _copiedFile = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Copied ${file.name} to ${widget.folderName}')),
      );
    }
  }

  void _showDeleteFileDialog(FolderFile file) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        title: const Text('Delete File'),
        content: Text('Are you sure you want to delete "${file.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _files.remove(file);
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('File "${file.name}" deleted')),
              );
            },
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  // Build API file grid item with selection support and thumbnails
  Widget _buildApiFileGridItemWithSelection(file_model.File file) {
    final isSelected = _selectedItemIds.contains(file.id);
    final isImage = file.mimeType.startsWith('image/');
    final isVideo = file.mimeType.startsWith('video/');

    return GestureDetector(
      onLongPress: () {
        setState(() {
          if (!_isSelectionMode) {
            _isSelectionMode = true;
          }
          if (isSelected) {
            _selectedItemIds.remove(file.id);
          } else {
            _selectedItemIds.add(file.id);
          }
        });
      },
      onTap: () {
        if (_isSelectionMode) {
          setState(() {
            if (isSelected) {
              _selectedItemIds.remove(file.id);
              if (_selectedItemIds.isEmpty) {
                _isSelectionMode = false;
              }
            } else {
              _selectedItemIds.add(file.id);
            }
          });
        } else {
          _openApiFile(file);
        }
      },
      child: Card(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: isSelected
              ? BorderSide(color: context.primaryColor, width: 2)
              : BorderSide.none,
        ),
        color: isSelected ? context.primaryColor.withOpacity(0.1) : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail or icon
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                ),
                child: _buildFileThumbnail(file),
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
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _formatFileSizeBytes(_getSizeAsInt(file.size)),
                    style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Build API folder grid item with selection support
  Widget _buildApiFolderGridItemWithSelection(model.Folder folder) {
    final isSelected = _selectedItemIds.contains(folder.id);

    return GestureDetector(
      onLongPress: () {
        setState(() {
          if (!_isSelectionMode) {
            _isSelectionMode = true;
          }
          if (isSelected) {
            _selectedItemIds.remove(folder.id);
          } else {
            _selectedItemIds.add(folder.id);
          }
        });
      },
      onTap: () {
        if (_isSelectionMode) {
          setState(() {
            if (isSelected) {
              _selectedItemIds.remove(folder.id);
              if (_selectedItemIds.isEmpty) {
                _isSelectionMode = false;
              }
            } else {
              _selectedItemIds.add(folder.id);
            }
          });
        } else {
          _openApiFolder(folder);
        }
      },
      child: Card(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: isSelected
              ? BorderSide(color: context.primaryColor, width: 2)
              : BorderSide.none,
        ),
        color: isSelected ? context.primaryColor.withOpacity(0.1) : null,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.folder_outlined,
                    color: Color(0xFF8B6BFF),
                    size: 40,
                  ),
                  const Spacer(),
                  if (!_isSelectionMode)
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert, size: 20),
                      onSelected: (value) => _handleApiFolderAction(value, folder),
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'open',
                          child: Row(
                            children: [
                              Icon(Icons.folder_open, size: 18),
                              SizedBox(width: 12),
                              Text('Open'),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'rename',
                          child: Row(
                            children: [
                              Icon(Icons.edit, size: 18),
                              SizedBox(width: 12),
                              Text('Rename'),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete_outline, size: 18, color: Colors.red),
                              SizedBox(width: 12),
                              Text('Delete', style: TextStyle(color: Colors.red)),
                            ],
                          ),
                        ),
                      ],
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                folder.name,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Build thumbnail for image/video files
  Widget _buildFileThumbnail(file_model.File file) {
    final isImage = file.mimeType.startsWith('image/');
    final isVideo = file.mimeType.startsWith('video/');

    if ((isImage || isVideo) && file.url != null && file.url!.isNotEmpty) {
      return Stack(
        fit: StackFit.expand,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
            child: Image.network(
              file.url!,
              fit: BoxFit.cover,
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) return child;
                return Center(
                  child: CircularProgressIndicator(
                    value: loadingProgress.expectedTotalBytes != null
                        ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                        : null,
                  ),
                );
              },
              errorBuilder: (context, error, stackTrace) {
                return Center(
                  child: Icon(
                    _getFileIcon(file.mimeType),
                    size: 48,
                    color: _getFileColor(file.mimeType),
                  ),
                );
              },
            ),
          ),
          if (isVideo)
            Center(
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.play_arrow, color: Colors.white, size: 32),
              ),
            ),
        ],
      );
    }

    // Show icon for non-image/video files
    return Center(
      child: Icon(
        _getFileIcon(file.mimeType),
        size: 48,
        color: _getFileColor(file.mimeType),
      ),
    );
  }

  // Copy selected items to clipboard
  void _copySelectedItemsToClipboard() {
    if (_selectedItemIds.isEmpty) return;

    final selectedFiles = <file_model.File>[];
    final selectedFolders = <model.Folder>[];

    for (var id in _selectedItemIds) {
      final file = _apiFolderFiles.where((f) => f.id == id).firstOrNull;
      if (file != null) {
        selectedFiles.add(file);
      } else {
        final folder = _apiSubfolders.where((f) => f.id == id).firstOrNull;
        if (folder != null) {
          selectedFolders.add(folder);
        }
      }
    }

    _clipboardService.copyMultipleItems(
      files: selectedFiles,
      folders: selectedFolders,
    );

    setState(() {
      _isSelectionMode = false;
      _selectedItemIds.clear();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Copied ${selectedFiles.length} file(s) and ${selectedFolders.length} folder(s) to clipboard',
        ),
        backgroundColor: Colors.green,
      ),
    );
  }

  // Cut selected items to clipboard
  void _cutSelectedItemsToClipboard() {
    if (_selectedItemIds.isEmpty) return;

    final selectedFiles = <file_model.File>[];
    final selectedFolders = <model.Folder>[];

    for (var id in _selectedItemIds) {
      final file = _apiFolderFiles.where((f) => f.id == id).firstOrNull;
      if (file != null) {
        selectedFiles.add(file);
      } else {
        final folder = _apiSubfolders.where((f) => f.id == id).firstOrNull;
        if (folder != null) {
          selectedFolders.add(folder);
        }
      }
    }

    _clipboardService.cutMultipleItems(
      files: selectedFiles,
      folders: selectedFolders,
    );

    setState(() {
      _isSelectionMode = false;
      _selectedItemIds.clear();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Cut ${selectedFiles.length} file(s) and ${selectedFolders.length} folder(s) to clipboard',
        ),
        backgroundColor: Colors.orange,
      ),
    );
  }

  // Delete selected items
  Future<void> _deleteSelectedItems() async {
    if (_selectedItemIds.isEmpty) return;

    // Separate files and folders
    final fileIds = <String>[];
    final folderIds = <String>[];

    for (var id in _selectedItemIds) {
      final isFile = _apiFolderFiles.any((f) => f.id == id);
      if (isFile) {
        fileIds.add(id);
      } else {
        folderIds.add(id);
      }
    }

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Items'),
        content: Text(
          'Are you sure you want to delete ${fileIds.length} file(s) and ${folderIds.length} folder(s)?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      int totalDeleted = 0;
      int totalFailed = 0;
      final fileApiService = FileApiService();

      // Delete files
      if (fileIds.isNotEmpty) {
        final response = await fileApiService.deleteMultipleFiles(
          widget.workspaceId,
          DeleteMultipleFilesDto(fileIds: fileIds),
        );

        if (response.isSuccess && response.data != null) {
          totalDeleted = totalDeleted + response.data!.deletedCount;
          totalFailed = totalFailed + response.data!.failedCount;
        } else {
          totalFailed = totalFailed + fileIds.length;
        }
      }

      // Delete folders
      if (folderIds.isNotEmpty) {
        final response = await fileApiService.deleteMultipleFolders(
          widget.workspaceId,
          DeleteMultipleFoldersDto(folderIds: folderIds),
        );

        if (response.isSuccess && response.data != null) {
          totalDeleted = totalDeleted + response.data!.deletedFoldersCount;
          totalFailed = totalFailed + (folderIds.length - response.data!.deletedFoldersCount);
        } else {
          totalFailed = totalFailed + folderIds.length;
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              totalFailed == 0
                  ? 'Successfully deleted $totalDeleted item(s)'
                  : 'Deleted $totalDeleted item(s), $totalFailed failed',
            ),
            backgroundColor: totalFailed == 0 ? Colors.green : Colors.orange,
          ),
        );
      }

      setState(() {
        _isSelectionMode = false;
        _selectedItemIds.clear();
      });

      await _fetchFolderContents();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // Helper: Convert size Object to int
  int _getSizeAsInt(dynamic size) {
    if (size is int) return size;
    if (size is String) return int.tryParse(size) ?? 0;
    return int.tryParse(size.toString()) ?? 0;
  }

  // Helper: Format file size
  String _formatFileSizeBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

}

class FolderFile {
  final String id;
  final String name;
  final String type;
  final String size;
  final DateTime lastModified;
  final bool isStarred;

  FolderFile({
    required this.id,
    required this.name,
    required this.type,
    required this.size,
    required this.lastModified,
    required this.isStarred,
  });
}

class NestedFolder {
  final String name;
  final int itemCount;
  final DateTime lastModified;
  final bool isShared;
  final bool isStarred;

  NestedFolder({
    required this.name,
    required this.itemCount,
    required this.lastModified,
    required this.isShared,
    this.isStarred = false,
  });
}