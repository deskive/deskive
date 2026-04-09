import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:easy_localization/easy_localization.dart';
import 'ai_screens.dart';
import 'ai_files_assistant.dart';
import '../widgets/ai_button.dart';
import 'file_management_screens.dart' hide StarredFilesScreen, TrashScreen;
import 'starred_files_screen_updated.dart';
import 'trash_screen_updated.dart';
import 'documents_screen.dart';
import 'images_screen.dart';
import 'spreadsheets_screen.dart';
import 'videos_screen.dart';
import 'audios_screen.dart';
import 'pdfs_screen.dart';
import 'file_type_screen.dart';
import 'folder_screen.dart';
import 'image_preview_dialog.dart';
import 'video_player_dialog.dart';
import 'file_upload_ui.dart';
import 'file_import_modal.dart';
import 'file_comments_sheet.dart';
import 'share_link_sheet.dart';
import 'offline_files_screen.dart';
import '../widgets/offline/offline_menu_item.dart';
import '../services/workspace_service.dart';
import '../services/file_service.dart';
import '../services/clipboard_service.dart';
import '../services/workspace_management_service.dart';
import '../services/auth_service.dart';
import '../services/analytics_service.dart';
import '../models/workspace/workspace.dart';
import '../models/folder/folder.dart' as model;
import '../models/file/file.dart' as file_model;
import '../models/file/dashboard_stats.dart';
import '../api/services/workspace_api_service.dart' show WorkspaceMember, WorkspaceRole;
import '../api/services/file_api_service.dart';
import '../api/services/storage_api_service.dart';
import '../config/app_config.dart';
import '../theme/app_theme.dart';
import '../screens/billing_screen.dart';
import '../widgets/deskive_toolbar.dart';
import '../widgets/deskive_search_bar.dart';
import '../widgets/google_drive_folder_picker.dart';
import '../apps/services/google_drive_service.dart';

class FilesScreen extends StatefulWidget {
  const FilesScreen({super.key});

  @override
  State<FilesScreen> createState() => _FilesScreenState();
}

class _FilesScreenState extends State<FilesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _currentView = 'Grid';
  final Set<String> _selectedFilters = {};
  String _searchQuery = '';
  String _sortBy = 'Date Modified';
  final TextEditingController _searchController = TextEditingController();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  // Selection mode
  bool _isSelectionMode = false;
  final Set<String> _selectedItemIds = {}; // Store file/folder IDs

  // Search mode
  bool _isSearching = false;

  // Clipboard service
  final ClipboardService _clipboardService = ClipboardService.instance;

  // Workspace data from API (fetched from home screen)
  final WorkspaceService _workspaceService = WorkspaceService.instance;
  Workspace? _currentWorkspace;

  // File service for folders and files
  final FileService _fileService = FileService.instance;
  List<model.Folder> _apiFolders = []; // Root-level folders for display
  List<file_model.File> _apiFiles = []; // Root-level files for display
  List<model.Folder> _allWorkspaceFolders = []; // ALL folders in workspace for counting
  List<file_model.File> _allWorkspaceFiles = []; // ALL files in workspace for counting
  Map<String, file_model.File> _fileMap = {}; // Map FileItem name to API File for preview
  Map<String, model.Folder> _folderMap = {}; // Map FolderItem name to API Folder for actions

  // Dashboard stats
  DashboardStats? _dashboardStats;
  List<file_model.File> _recentFiles = [];
  List<file_model.File> _sharedFiles = [];

  @override
  void initState() {
    super.initState();
    AnalyticsService.instance.logScreenView(screenName: 'FilesScreen');
    _tabController = TabController(length: 2, vsync: this); // Changed from 6 to 2
    _tabController.addListener(_onTabChanged);
    _initializeWorkspaces();
  }

  /// Handle tab changes
  void _onTabChanged() {
    if (_tabController.index == 0) {
      // Files tab is selected
      _fetchFolders();
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

  /// Handle search text changes
  void _onSearchChanged(String query) {
    setState(() {
      _searchQuery = query.toLowerCase();
    });
  }

  /// Get current workspace from service (already initialized from home screen)
  Future<void> _initializeWorkspaces() async {
    // Get current workspace from global WorkspaceService
    setState(() {
      _currentWorkspace = _workspaceService.currentWorkspace;
    });

    // Initialize FileService with current workspace
    if (_currentWorkspace != null) {
      _fileService.initialize(_currentWorkspace!.id);
      _fileService.addListener(_onFileServiceUpdate);
      // Fetch folders for initial Files tab
      await _fetchFolders();
      // Fetch dashboard stats for file manager dialog
      _fetchDashboardStats();
    }
  }

  /// Fetch folders and files from API (optimized - loads only root folders)
  Future<void> _fetchFolders() async {
    if (_currentWorkspace == null) {
      return;
    }

    // Initialize FileService if not already done
    if (_fileService.folders.isEmpty && !_fileService.isLoadingFolders) {
      _fileService.initialize(_currentWorkspace!.id);
    }

    // Remove listener temporarily to prevent multiple UI updates
    _fileService.removeListener(_onFileServiceUpdate);

    try {
      // Clear existing data first to prevent showing stale subfolder data
      if (mounted) {
        setState(() {
          _apiFolders = [];
          _apiFiles = [];
        });
      }

      // Fetch ONLY root-level folders and files for display
      await _fileService.fetchFolders(parentId: null); // Explicitly get root folders only
      await _fileService.fetchFiles(folderId: null); // Explicitly get files in workspace root

      // Store root folders and root-level files
      final rootFolders = List<model.Folder>.from(_fileService.folders);
      _allWorkspaceFiles = List<file_model.File>.from(_fileService.files);

      // Only store root folders (subfolders will be loaded when folder is opened)
      _allWorkspaceFolders = List<model.Folder>.from(rootFolders);


      // Update UI state once with root data
      if (mounted) {
        setState(() {
          _apiFolders = List<model.Folder>.from(_fileService.folders);
          _apiFiles = List<file_model.File>.from(_fileService.files);
        });
      }
    } finally {
      // Re-add listener after fetching is complete
      _fileService.addListener(_onFileServiceUpdate);
    }
  }

  /// Update UI when file service changes
  void _onFileServiceUpdate() {
    if (mounted) {
      setState(() {
        _apiFolders = _fileService.folders;
        _apiFiles = _fileService.files;
      });
    }
  }

  /// Fetch dashboard statistics
  Future<void> _fetchDashboardStats() async {
    try {
      final results = await Future.wait([
        _fileService.getDashboardStats(),
        _fileService.getRecentFiles(limit: 5),
        _fileService.getSharedWithMeFiles(limit: 5),
      ]);

      final stats = results[0] as DashboardStats;
      final recentFiles = results[1] as List<file_model.File>;
      final sharedFiles = results[2] as List<file_model.File>;

      if (mounted) {
        setState(() {
          _dashboardStats = stats;
          _recentFiles = recentFiles;
          _sharedFiles = sharedFiles;
        });
      }
    } catch (e) {
    }
  }

  /// Open drawer and fetch dashboard stats
  void _openDrawer() {
    _scaffoldKey.currentState?.openDrawer();
    // Only fetch if stats haven't been loaded yet
    if (_dashboardStats == null) {
      _fetchDashboardStats();
    }
  }

  /// Calculate item count for a folder (deprecated - no longer displayed in UI)
  int _getItemCount(String folderId) {
    // Item count is no longer displayed in UI, return 0
    // Subfolders and files are loaded on-demand when folder is opened
    return 0;
  }

  /// Update UI when workspace service changes
  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    _fileService.removeListener(_onFileServiceUpdate);
    super.dispose();
  }

  /// Helper method to build TabBar with menu icon for bottom widget
  PreferredSizeWidget _buildTabBarWithMenu() {
    return PreferredSize(
      preferredSize: const Size.fromHeight(48),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.menu),
            onPressed: _openDrawer,
            padding: const EdgeInsets.symmetric(horizontal: 16),
          ),
          Expanded(
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              tabs: [
                Tab(text: 'files.all_files_tab'.tr()),
                Tab(text: 'files.dashboard_tab'.tr()),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Helper method to build normal mode actions
  List<DeskiveToolbarAction> _buildNormalModeActions() {
    return [
      // Import button
      DeskiveToolbarAction.icon(
        icon: Icons.file_download_outlined,
        tooltip: 'files_import.title'.tr(),
        onPressed: _showImportModal,
      ),
      // Sort menu
      DeskiveToolbarAction.menu(
        icon: Icons.sort,
        tooltip: 'files.sort_by'.tr(),
        menuItems: [
          DeskiveToolbarMenuItem(value: 'Date Modified', label: 'files.date_modified'.tr()),
          DeskiveToolbarMenuItem(value: 'Name', label: 'files.name_sort'.tr()),
          DeskiveToolbarMenuItem(value: 'Size', label: 'files.size_sort'.tr()),
          DeskiveToolbarMenuItem(value: 'Type', label: 'files.type_sort'.tr()),
        ],
        onMenuItemSelected: (value) {
          setState(() {
            _sortBy = value;
          });
        },
      ),
      // Grid/List view toggle moved to leading section (beside Type filter)
    ];
  }

  /// Show import modal
  void _showImportModal() {
    showFileImportModal(
      context: context,
      folderId: null, // Root folder
      onFilesImported: () {
        _fetchFolders();
        _fetchDashboardStats();
      },
    );
  }

  /// Show AI Files Assistant dialog
  void _showAIAssistant() {
    showAIFilesAssistant(
      context: context,
      onFilesChanged: () {
        _fetchFolders();
        _fetchDashboardStats();
      },
      onFoldersChanged: () {
        _fetchFolders();
      },
    );
  }

  /// Helper method to build Type filter widget
  Widget _buildTypeFilter(BuildContext context) {
    return PopupMenuButton<String>(
      onSelected: (String value) {
        setState(() {
          if (_selectedFilters.contains(value)) {
            _selectedFilters.remove(value);
          } else {
            _selectedFilters.add(value);
          }
        });
      },
      itemBuilder: (BuildContext context) {
        final filterOptions = [
          {'key': 'Folders', 'label': 'files.folders'.tr()},
          {'key': 'Documents', 'label': 'files.documents'.tr()},
          {'key': 'Spreadsheets', 'label': 'files.spreadsheets'.tr()},
          {'key': 'Presentations', 'label': 'files.presentations'.tr()},
          {'key': 'PDFs', 'label': 'files.pdfs'.tr()},
          {'key': 'Images', 'label': 'files.images'.tr()},
          {'key': 'Videos', 'label': 'files.videos'.tr()},
          {'key': 'Audio', 'label': 'files.audio'.tr()},
        ];

        return filterOptions.map((option) {
          final isSelected = _selectedFilters.contains(option['key']);
          return PopupMenuItem<String>(
            value: option['key'],
            child: Row(
              children: [
                SizedBox(
                  width: 24,
                  height: 24,
                  child: Checkbox(
                    value: isSelected,
                    onChanged: (_) {},
                    visualDensity: VisualDensity.compact,
                    activeColor: Colors.blue,
                  ),
                ),
                const SizedBox(width: 8),
                Text(option['label']!),
              ],
            ),
          );
        }).toList();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          border: Border.all(
            color: _selectedFilters.isEmpty
              ? Colors.transparent
              : Theme.of(context).colorScheme.primary,
            width: 1,
          ),
          borderRadius: BorderRadius.circular(20),
          color: _selectedFilters.isEmpty
            ? null
            : Theme.of(context).colorScheme.primary.withOpacity(0.1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'files.type'.tr(),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: _selectedFilters.isEmpty
                  ? null
                  : Theme.of(context).colorScheme.primary,
              ),
            ),
            const SizedBox(width: 2),
            Icon(
              Icons.arrow_drop_down,
              size: 18,
              color: _selectedFilters.isEmpty
                ? null
                : Theme.of(context).colorScheme.primary,
            ),
          ],
        ),
      ),
    );
  }

  /// Helper method to build custom leading widget (Back button + Type filter + Grid/List toggle)
  /// In selection mode, only show back button (handled by DeskiveToolbar)
  /// In normal mode, show back button + Type filter + Grid/List view toggle
  Widget? _buildLeadingWidget(BuildContext context) {
    // In selection mode, return null to let DeskiveToolbar handle the close button
    if (_isSelectionMode) {
      return null;
    }

    // In normal mode, show back button + Type filter + Grid/List toggle
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Back button with reduced constraints to prevent overflow
        IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
          visualDensity: VisualDensity.compact,
        ),
        const SizedBox(width: 4),
        // Type filter - wrapped in Flexible to prevent overflow
        Flexible(
          child: _buildTypeFilter(context),
        ),
        // Grid/List view toggle (beside the filter)
        IconButton(
          icon: Icon(_currentView == 'Grid' ? Icons.list : Icons.grid_view),
          tooltip: _currentView == 'Grid' ? 'files.list_view_tooltip'.tr() : 'files.grid_view_tooltip'.tr(),
          onPressed: () {
            setState(() {
              _currentView = _currentView == 'Grid' ? 'List' : 'Grid';
            });
          },
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
          visualDensity: VisualDensity.compact,
        ),
      ],
    );
  }

  /// Helper method to build custom action widgets (More options only)
  List<Widget> _buildCustomActions(BuildContext context) {
    return [
      // AI Files Assistant button
      AIButton(
        onPressed: _showAIAssistant,
        tooltip: 'files.ai_assistant'.tr(),
      ),
      const SizedBox(width: 8),
      // More options
      IconButton(
        icon: const Icon(Icons.more_vert),
        onPressed: () {
          _showMoreOptionsDialog();
        },
      ),
    ];
  }

  /// Helper method to build selection mode actions
  List<DeskiveToolbarAction> _buildSelectionModeActions() {
    return [
      DeskiveToolbarAction.icon(
        icon: Icons.copy_outlined,
        tooltip: 'files.copy_tooltip'.tr(),
        onPressed: _selectedItemIds.isNotEmpty
            ? () => _copySelectedItemsToClipboard()
            : () {},
      ),
      DeskiveToolbarAction.icon(
        icon: Icons.content_cut,
        tooltip: 'files.cut_tooltip'.tr(),
        onPressed: _selectedItemIds.isNotEmpty
            ? () => _cutSelectedItemsToClipboard()
            : () {},
      ),
      DeskiveToolbarAction.icon(
        icon: Icons.delete_outline,
        tooltip: 'files.delete_selected'.tr(),
        onPressed: _selectedItemIds.isNotEmpty
            ? () => _deleteSelectedItems()
            : () {},
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: _buildDrawer(),
      appBar: DeskiveToolbar(
        title: 'files.title'.tr(),
        isSearching: _isSearching,
        searchController: _searchController,
        onSearchChanged: _onSearchChanged,
        onSearchToggle: _toggleSearch,
        searchHint: 'files.search_files'.tr(),
        isSelectionMode: _isSelectionMode,
        selectedCount: _selectedItemIds.length,
        onExitSelection: () {
          setState(() {
            _isSelectionMode = false;
            _selectedItemIds.clear();
          });
        },
        onSelectAll: () {
          setState(() {
            // Add all file and folder IDs to selection
            for (var file in _apiFiles) {
              if (file.id.isNotEmpty) {
                _selectedItemIds.add(file.id);
              }
            }
            for (var folder in _apiFolders) {
              if (folder.id.isNotEmpty) {
                _selectedItemIds.add(folder.id);
              }
            }
          });
        },
        selectionActions: _buildSelectionModeActions(),
        actions: _buildNormalModeActions(),
        customActions: _buildCustomActions(context),
        leading: _buildLeadingWidget(context),
        leadingWidth: _isSelectionMode ? null : 170, // Custom width for back button + Type filter + Grid/List toggle
        bottom: _buildTabBarWithMenu(),
      ),
      body: SafeArea(
        top: false,
        child: TabBarView(
                controller: _tabController,
                children: [
                  // All Files Tab
                  _buildAllFilesView(),

                  // Dashboard Tab
                  _buildDashboardView(),

                  // // Messages Tab
                  // _buildMessagesView(),

                  // // Projects Tab
                  // _buildProjectsView(),

                  // // Calendar Tab
                  // _buildCalendarView(),

                  // // Notes Tab
                  // _buildNotesView(),
                ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          _showCreateFolderDialog();
        },
        child: const Icon(Icons.create_new_folder),
      ),
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      child: SafeArea(
        top: false,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
          Container(
            height: 120,
            padding: const EdgeInsets.fromLTRB(16, 48, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: double.infinity,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [context.primaryColor, Color(0xFF8B6BFF)],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                      borderRadius: BorderRadius.all(Radius.circular(5)),
                    ),
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _showUploadFilesDialog();
                      },
                      icon: const Icon(Icons.upload_file, size: 16),
                      label: Text('files.upload'.tr(), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        minimumSize: const Size(0, 32),
                        shadowColor: Colors.transparent,
                        shape: const RoundedRectangleBorder(
                          borderRadius: BorderRadius.all(Radius.circular(5)),
                        ),
                      ).copyWith(
                        elevation: WidgetStateProperty.all(0),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // AI Actions Section
          _buildDrawerSection('files.ai_actions'.tr()),
          _buildDrawerItem(
            icon: Icons.image,
            title: 'files.ai_image'.tr(),
            onTap: () {
              Navigator.pop(context);
              _showAIActionDialog('AI Image');
            },
          ),
          // Commented out - Not functional yet
          // _buildDrawerItem(
          //   icon: Icons.videocam,
          //   title: 'AI Video',
          //   onTap: () {
          //     Navigator.pop(context);
          //     _showAIActionDialog('AI Video');
          //   },
          // ),
          // _buildDrawerItem(
          //   icon: Icons.audiotrack,
          //   title: 'AI Audio',
          //   onTap: () {
          //     Navigator.pop(context);
          //     _showAIActionDialog('AI Audio');
          //   },
          // ),
          // _buildDrawerItem(
          //   icon: Icons.description,
          //   title: 'AI Documents',
          //   onTap: () {
          //     Navigator.pop(context);
          //     _showAIActionDialog('AI Documents');
          //   },
          // ),
          
          const Divider(),
          
          // File Manager Section
          _buildDrawerSection('files.file_manager'.tr()),
          _buildDrawerItem(
            icon: Icons.folder_open,
            title: 'files.all_files'.tr(),
            selected: true,
            onTap: () {
              Navigator.pop(context);
              _tabController.animateTo(0);
            },
          ),
          _buildDrawerItem(
            icon: Icons.access_time,
            title: 'files.recent_files'.tr(),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const RecentFilesScreen()),
              );
            },
          ),
          _buildDrawerItem(
            icon: Icons.star,
            title: 'files.starred_files'.tr(),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const StarredFilesScreen()),
              );
            },
          ),
          _buildDrawerItem(
            icon: Icons.delete,
            title: 'files.trash'.tr(),
            onTap: () {
              Navigator.pop(context);
              _showTrashDialog();
            },
          ),
          
          const Divider(),
          
          // File Type Section
          _buildDrawerSection('files.file_types'.tr()),
          _buildDrawerItemWithCount(
            icon: Icons.article,
            title: 'files.documents'.tr(),
            count: _dashboardStats?.fileTypeBreakdown.documents ?? 0,
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const DocumentsScreen()),
              );
            },
          ),
          _buildDrawerItemWithCount(
            icon: Icons.image,
            title: 'files.images'.tr(),
            count: _dashboardStats?.fileTypeBreakdown.images ?? 0,
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ImagesScreen()),
              );
            },
          ),
          _buildDrawerItemWithCount(
            icon: Icons.table_chart,
            title: 'files.spreadsheets'.tr(),
            count: _dashboardStats?.fileTypeBreakdown.spreadsheets ?? 0,
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SpreadsheetsScreen()),
              );
            },
          ),
          _buildDrawerItemWithCount(
            icon: Icons.video_library,
            title: 'files.videos'.tr(),
            count: _dashboardStats?.fileTypeBreakdown.videos ?? 0,
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const VideosScreen()),
              );
            },
          ),
          _buildDrawerItemWithCount(
            icon: Icons.audiotrack,
            title: 'files.audio'.tr(),
            count: _dashboardStats?.fileTypeBreakdown.audio ?? 0,
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const AudiosScreen()),
              );
            },
          ),
          _buildDrawerItemWithCount(
            icon: Icons.picture_as_pdf,
            title: 'files.pdfs'.tr(),
            count: _dashboardStats?.fileTypeBreakdown.pdfs ?? 0,
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const PdfsScreen()),
              );
            },
          ),
          
          const Divider(),
          
          // Storage Section
          _buildDrawerSection('files.storage'.tr()),
          _buildStorageItem(),

          const Divider(),

          // Shared Section
          _buildDrawerSection('files.shared'.tr()),
          _buildDrawerItem(
            icon: Icons.people,
            title: 'files.shared_with_me'.tr(),
            onTap: () {
              Navigator.pop(context);
              if (_currentWorkspace?.id != null) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => SharedWithMeScreen(
                      workspaceId: _currentWorkspace!.id,
                    ),
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('workspace.select_workspace'.tr()),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
          ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerSection(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
          fontWeight: FontWeight.bold,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    bool selected = false,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      selected: selected,
      onTap: onTap,
    );
  }

  Widget _buildDrawerItemWithCount({
    required IconData icon,
    required String title,
    required int count,
    required VoidCallback onTap,
    bool selected = false,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title),
          if (count > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                count.toString(),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
      selected: selected,
      onTap: onTap,
    );
  }

  Widget _buildStorageItem() {
    final storageUsed = _dashboardStats?.storageUsedFormatted ?? '0 B';
    final storageTotal = _dashboardStats?.storageTotalFormatted ?? '0 B';
    final storageFree = _dashboardStats?.storageFreeFormatted ?? '0 B';
    final storagePercentage = _dashboardStats?.storagePercentageUsed ?? 0.0;
    final totalFiles = _dashboardStats?.totalFiles ?? 0;
    // storagePercentage is already 0-100, clamp and convert for progress indicator (needs 0.0-1.0)
    final progressValue = (storagePercentage / 100).clamp(0.0, 1.0);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'files.storage_used_format'.tr(args: [storageUsed]),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              Text(
                'files.storage_free_format'.tr(args: [storageFree]),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.green.shade600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: progressValue,
            backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
          ),
          const SizedBox(height: 8),
          Text(
            'files.storage_info_format'.tr(args: ['$totalFiles', storageTotal, storagePercentage.toStringAsFixed(1)]),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 4),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _showStorageDetailsDialog();
            },
            child: Text('files.manage_storage'.tr()),
          ),
        ],
      ),
    );
  }

  void _showAIActionDialog(String action) {
    Widget? screen;
    switch (action) {
      case 'AI Image':
        screen = const AIImageScreen();
        break;
      case 'AI Video':
        screen = const AIVideoScreen();
        break;
      case 'AI Audio':
        screen = const AIAudioScreen();
        break;
      case 'AI Documents':
        screen = const AIDocumentsScreen();
        break;
    }

    if (screen != null) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => screen!),
      );
    }
  }

  void _showTrashDialog() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const TrashScreen()),
    );
  }

  void _filterByType(String type) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FileTypeScreen(fileType: type),
      ),
    );
  }

  void _showStorageDetailsDialog() {
    showDialog(
      context: context,
      builder: (context) => StorageDetailsDialog(
        fileService: _fileService,
        workspace: _currentWorkspace,
      ),
    );
  }

  Widget _buildStorageDetailItem(String type, String size, double percentage) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(type),
                Text(
                  size,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          SizedBox(
            width: 100,
            child: LinearProgressIndicator(
              value: percentage,
              backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
            ),
          ),
        ],
      ),
    );
  }

  bool _shouldShowFile(FileItem file) {
    if (_selectedFilters.isEmpty) {
      return true;
    }
    
    if (_selectedFilters.contains('Documents') && 
        (file.type == 'word' || file.type == 'doc' || file.type == 'docx' || file.type == 'txt')) {
      return true;
    }
    
    if (_selectedFilters.contains('Spreadsheets') && 
        (file.type == 'excel' || file.type == 'xls' || file.type == 'xlsx' || file.type == 'csv')) {
      return true;
    }
    
    if (_selectedFilters.contains('Presentations') && 
        (file.type == 'powerpoint' || file.type == 'ppt' || file.type == 'pptx')) {
      return true;
    }
    
    if (_selectedFilters.contains('PDFs') && file.type == 'pdf') {
      return true;
    }
    
    if (_selectedFilters.contains('Images') && 
        (file.type == 'image' || file.type == 'jpg' || file.type == 'jpeg' || 
         file.type == 'png' || file.type == 'gif' || file.type == 'svg')) {
      return true;
    }
    
    if (_selectedFilters.contains('Videos') && 
        (file.type == 'video' || file.type == 'mp4' || file.type == 'avi' || 
         file.type == 'mov' || file.type == 'mkv')) {
      return true;
    }
    
    if (_selectedFilters.contains('Audio') && 
        (file.type == 'audio' || file.type == 'mp3' || file.type == 'wav' || 
         file.type == 'flac' || file.type == 'aac')) {
      return true;
    }
    
    return false;
  }

  Widget _buildAllFilesView() {
    // Show loading indicator while fetching folders and files
    if ((_fileService.isLoadingFolders && _apiFolders.isEmpty) ||
        (_fileService.isLoadingFiles && _apiFiles.isEmpty)) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text('files.loading_files'.tr()),
          ],
        ),
      );
    }

    // Start with folders and files
    List<dynamic> allItems = [];

    // Add folders only if no filters selected or "Folders" is selected
    if (_selectedFilters.isEmpty || _selectedFilters.contains('Folders')) {
      // Clear folder map for fresh mapping
      _folderMap.clear();

      // Add API folders converted to FolderItem format
      allItems.addAll(_apiFolders.map((apiFolder) {
        // Store API folder in map for later retrieval (for delete, rename, etc.)
        _folderMap[apiFolder.name] = apiFolder;

        return FolderItem(
          name: apiFolder.name,
          itemCount: _getItemCount(apiFolder.id), // Get actual count from API data
          lastModified: apiFolder.updatedAt,
          isShared: false,
          isStarred: false,
          folderId: apiFolder.id, // Include API folder ID
          workspaceId: _currentWorkspace?.id, // Include workspace ID
        );
      }));
    }
    
    // Add files based on filter type
    if (_selectedFilters.isEmpty || !(_selectedFilters.length == 1 && _selectedFilters.contains('Folders'))) {
      // Clear file map for fresh mapping
      _fileMap.clear();

      // Add API files converted to FileItem format
      allItems.addAll(_apiFiles.map((apiFile) {
        // Convert file size from string to formatted size
        final sizeInBytes = int.tryParse(apiFile.size) ?? 0;
        final formattedSize = _fileService.formatFileSize(sizeInBytes);

        // Get file extension from mime type or name
        String fileType = apiFile.extension;
        if (fileType.isEmpty) {
          if (apiFile.mimeType.contains('pdf')) fileType = 'pdf';
          else if (apiFile.mimeType.contains('image')) fileType = 'image';
          else if (apiFile.mimeType.contains('video')) fileType = 'video';
          else if (apiFile.mimeType.contains('audio')) fileType = 'audio';
          else fileType = 'file';
        }

        // Store API file in map for later retrieval
        _fileMap[apiFile.name] = apiFile;

        return FileItem(
          id: apiFile.id,
          name: apiFile.name,
          size: formattedSize,
          type: fileType,
          lastModified: apiFile.updatedAt ?? apiFile.createdAt ?? DateTime.now(),
          owner: 'User', // TODO: Get actual owner name from API
          isStarred: apiFile.starred ?? false,
          isShared: false,
          url: apiFile.url,
        );
      }).where((file) => _shouldShowFile(file)));
    }
    
    // Apply search query filter
    if (_searchQuery.isNotEmpty) {
      allItems = allItems.where((item) {
        if (item is FolderItem) {
          return item.name.toLowerCase().contains(_searchQuery);
        } else if (item is FileItem) {
          return item.name.toLowerCase().contains(_searchQuery) ||
                 item.type.toLowerCase().contains(_searchQuery) ||
                 item.owner.toLowerCase().contains(_searchQuery);
        }
        return false;
      }).toList();
    }

    // Apply sorting
    allItems = _sortItems(allItems);

    // Show empty state if no results
    if (allItems.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _searchQuery.isNotEmpty ? Icons.search_off : Icons.folder_off,
              size: 64,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty
                ? 'files.no_results_found'.tr()
                : _selectedFilters.isEmpty
                  ? 'files.no_files_or_folders'.tr()
                  : 'files.no_matching_filters'.tr(),
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              _searchQuery.isNotEmpty ? 'files.try_different_search'.tr() : 'files.try_different_filter'.tr(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      );
    }

    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onLongPress: _showPasteMenu,
      child: _currentView == 'Grid'
          ? _buildMixedGrid(allItems)
          : _buildMixedList(allItems),
    );
  }
  
  Widget _buildMixedGrid(List<dynamic> items) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.85,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        if (item is FolderItem) {
          return _buildFolderGridItem(item);
        } else if (item is FileItem) {
          return _buildFileGridItem(item);
        }
        return const SizedBox();
      },
    );
  }
  
  Widget _buildMixedList(List<dynamic> items) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        if (item is FolderItem) {
          return _buildFolderListItem(item);
        } else if (item is FileItem) {
          return _buildFileListItem(item);
        }
        return const SizedBox();
      },
    );
  }
  
  Widget _buildFolderGridItem(FolderItem folder) {
    final folderId = folder.folderId ?? '';
    final isSelected = _selectedItemIds.contains(folderId);

    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(5),
        side: isSelected
            ? BorderSide(color: context.primaryColor, width: 2)
            : BorderSide.none,
      ),
      color: isSelected ? context.primaryColor.withOpacity(0.1) : null,
      child: InkWell(
        onTap: () async {
          if (_isSelectionMode) {
            // Toggle selection
            setState(() {
              if (isSelected) {
                _selectedItemIds.remove(folderId);
                if (_selectedItemIds.isEmpty) {
                  _isSelectionMode = false;
                }
              } else {
                _selectedItemIds.add(folderId);
              }
            });
          } else {
            // Normal navigation
            await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => FolderScreen(
                  folderName: folder.name,
                  folderId: folder.folderId ?? '',
                  workspaceId: folder.workspaceId ?? _currentWorkspace?.id ?? '',
                  itemCount: folder.itemCount,
                  isShared: folder.isShared,
                ),
              ),
            );
            // Refresh the files screen when coming back
            _fetchFolders();
          }
        },
        onLongPress: () {
          setState(() {
            _isSelectionMode = true;
            _selectedItemIds.add(folderId);
          });
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Stack(
                    children: [
                      Icon(
                        Icons.folder_outlined,
                        color: const Color(0xFF8B6BFF),
                        size: 40,
                      ),
                      if (!_isSelectionMode && folder.isStarred)
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: Container(
                            padding: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.surface,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.star,
                              size: 16,
                              color: Colors.amber,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const Spacer(),
                  if (!_isSelectionMode)
                    PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, size: 20),
                    onSelected: (value) => _handleFolderAction(value, folder),
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'open',
                        child: Row(
                          children: [
                            const Icon(Icons.folder_open, size: 18),
                            const SizedBox(width: 12),
                            Text('files.open'.tr()),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem(
                        value: 'cut',
                        child: Row(
                          children: [
                            const Icon(Icons.content_cut, size: 18),
                            const SizedBox(width: 12),
                            Text('files.cut'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'copy',
                        child: Row(
                          children: [
                            const Icon(Icons.content_copy, size: 18),
                            const SizedBox(width: 12),
                            Text('files.copy'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'paste',
                        child: Row(
                          children: [
                            const Icon(Icons.content_paste, size: 18),
                            const SizedBox(width: 12),
                            Text('files.paste'.tr()),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem(
                        value: 'rename',
                        child: Row(
                          children: [
                            const Icon(Icons.edit, size: 18),
                            const SizedBox(width: 12),
                            Text('files.rename'.tr()),
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
                              color: folder.isStarred ? Colors.amber : null,
                            ),
                            const SizedBox(width: 12),
                            Text(folder.isStarred ? 'files.unstar'.tr() : 'files.star'.tr()),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem(
                        value: 'share',
                        child: Row(
                          children: [
                            const Icon(Icons.share, size: 18),
                            const SizedBox(width: 12),
                            Text('files.share'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'properties',
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline, size: 18),
                            const SizedBox(width: 12),
                            Text('files.properties'.tr()),
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
                      const PopupMenuDivider(),
                      PopupMenuItem(
                        value: 'trash',
                        child: Row(
                          children: [
                            Icon(
                              Icons.delete_outline,
                              size: 18,
                              color: Theme.of(context).colorScheme.error,
                            ),
                            const SizedBox(width: 12),
                            Text(
                              'files.move_to_trash'.tr(),
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
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
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                _getTimeAgo(folder.lastModified),
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
  
  Widget _buildFolderListItem(FolderItem folder) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(5),
      ),
      child: ListTile(
        leading: Stack(
          children: [
            Icon(
              Icons.folder_outlined,
              color: const Color(0xFF8B6BFF),
              size: 40,
            ),
            if (folder.isStarred)
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.star,
                    size: 14,
                    color: Colors.amber,
                  ),
                ),
              ),
          ],
        ),
        title: Text(folder.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(_getTimeAgo(folder.lastModified)),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (value) => _handleFolderAction(value, folder),
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'open',
                  child: Row(
                    children: [
                      const Icon(Icons.folder_open, size: 18),
                      const SizedBox(width: 12),
                      Text('files.open'.tr()),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'cut',
                  child: Row(
                    children: [
                      const Icon(Icons.content_cut, size: 18),
                      const SizedBox(width: 12),
                      Text('files.cut'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'copy',
                  child: Row(
                    children: [
                      const Icon(Icons.content_copy, size: 18),
                      const SizedBox(width: 12),
                      Text('files.copy'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'paste',
                  child: Row(
                    children: [
                      const Icon(Icons.content_paste, size: 18),
                      const SizedBox(width: 12),
                      Text('files.paste'.tr()),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'rename',
                  child: Row(
                    children: [
                      const Icon(Icons.edit, size: 18),
                      const SizedBox(width: 12),
                      Text('files.rename'.tr()),
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
                        color: folder.isStarred ? Colors.amber : null,
                      ),
                      const SizedBox(width: 12),
                      Text(folder.isStarred ? 'files.unstar'.tr() : 'files.star'.tr()),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'share',
                  child: Row(
                    children: [
                      const Icon(Icons.share, size: 18),
                      const SizedBox(width: 12),
                      Text('files.share'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'properties',
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, size: 18),
                      const SizedBox(width: 12),
                      Text('files.properties'.tr()),
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
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'trash',
                  child: Row(
                    children: [
                      Icon(
                        Icons.delete_outline,
                        size: 18,
                        color: Theme.of(context).colorScheme.error,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'files.move_to_trash'.tr(),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
        onTap: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => FolderScreen(
                folderName: folder.name,
                folderId: folder.folderId ?? '',
                workspaceId: folder.workspaceId ?? _currentWorkspace?.id ?? '',
                itemCount: folder.itemCount,
                isShared: folder.isShared,
              ),
            ),
          );
          // Refresh the files screen when coming back
          _fetchFolders();
        },
      ),
    );
  }

  Widget _buildDashboardView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Dashboard Stats Grid
          _dashboardStats == null
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(),
                  ),
                )
              : GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.8,
                  children: [
                    _buildStatCard(
                      icon: Icons.folder_open,
                      title: 'files.total_files'.tr(),
                      value: '${_dashboardStats?.totalFiles ?? 0}',
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    _buildStatCard(
                      icon: Icons.storage,
                      title: 'files.storage_used'.tr(),
                      value: _dashboardStats?.storageUsedFormatted ?? '0 B',
                      color: Theme.of(context).colorScheme.secondary,
                    ),
                    _buildStatCard(
                      icon: Icons.auto_awesome,
                      title: 'files.ai_generations'.tr(),
                      value: '${_dashboardStats?.aiGenerationsThisMonth ?? 0}',
                      color: Theme.of(context).colorScheme.tertiary,
                    ),
                    _buildStatCard(
                      icon: Icons.category,
                      title: 'files.file_types'.tr(),
                      value: '${_dashboardStats?.uniqueFileTypes ?? 0}',
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ],
                ),
          const SizedBox(height: 24),
          
          // Quick Actions
          Text(
            'files.quick_access'.tr(),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 100,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _buildQuickActionCard(
                  icon: Icons.image,
                  title: 'files.ai_image'.tr(),
                  color: Colors.green,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const AIImageScreen()),
                    );
                  },
                ),
                _buildQuickActionCard(
                  icon: Icons.videocam_outlined,
                  title: 'files.ai_video'.tr(),
                  color: Colors.blue,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const AIVideoScreen()),
                    );
                  },
                ),
                _buildQuickActionCard(
                  icon: Icons.audiotrack,
                  title: 'files.ai_audio'.tr(),
                  color: Colors.purple,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const AIAudioScreen()),
                    );
                  },
                ),
                _buildQuickActionCard(
                  icon: Icons.description,
                  title: 'files.ai_documents'.tr(),
                  color: Colors.orange,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const AIDocumentsScreen()),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          // Recent Activity
          Text(
            'files.recent_files'.tr(),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(5),
            ),
            child: _recentFiles.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(32),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(
                            Icons.history,
                            size: 48,
                            color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'files.no_recent_activity'.tr(),
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : Column(
                    children: [
                      ..._recentFiles.map((apiFile) {
                        final sizeInBytes = int.tryParse(apiFile.size) ?? 0;
                        final formattedSize = _fileService.formatFileSize(sizeInBytes);
                        String fileType = apiFile.extension;
                        if (fileType.isEmpty) {
                          if (apiFile.mimeType.contains('pdf')) fileType = 'pdf';
                          else if (apiFile.mimeType.contains('image')) fileType = 'image';
                          else if (apiFile.mimeType.contains('video')) fileType = 'video';
                          else if (apiFile.mimeType.contains('audio')) fileType = 'audio';
                          else fileType = 'file';
                        }

                        return ListTile(
                          leading: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: _getFileColor(fileType).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Icon(
                              _getFileIcon(fileType),
                              color: _getFileColor(fileType),
                              size: 24,
                            ),
                          ),
                          title: Text(
                            apiFile.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text('Modified ${_formatDate(apiFile.updatedAt ?? apiFile.createdAt ?? DateTime.now())}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                formattedSize,
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                icon: Icon(
                                  apiFile.starred == true ? Icons.star : Icons.star_outline,
                                  color: apiFile.starred == true ? Colors.amber : null,
                                  size: 20,
                                ),
                                onPressed: () async {
                                  final newStarredState = !(apiFile.starred ?? false);
                                  final success = await _fileService.toggleStarred(apiFile.id, newStarredState);

                                  if (success && mounted) {
                                    setState(() {
                                      // Update the file in the list
                                      final index = _recentFiles.indexWhere((f) => f.id == apiFile.id);
                                      if (index != -1) {
                                        _recentFiles[index] = apiFile.copyWith(starred: newStarredState);
                                      }
                                    });
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(newStarredState ? 'Added to starred' : 'Removed from starred'),
                                        duration: const Duration(seconds: 2),
                                      ),
                                    );
                                  }
                                },
                              ),
                            ],
                          ),
                          onTap: () {
                            // Open image preview for images
                            if (apiFile.mimeType.startsWith('image/')) {
                              showImagePreviewDialog(
                                context,
                                file: apiFile,
                              );
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Opening ${apiFile.name}')),
                              );
                            }
                          },
                        );
                      }),
                    ],
                  ),
          ),
          const SizedBox(height: 24),
          
          // File Type Breakdown
          if (_dashboardStats != null) ...[
            Text(
              'files.file_type_breakdown'.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(5),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _buildFileTypeProgress(
                      type: 'files.images'.tr(),
                      icon: Icons.image,
                      count: _dashboardStats!.fileTypeBreakdown.images,
                      total: _dashboardStats!.totalFiles,
                      color: Colors.purple,
                    ),
                    const SizedBox(height: 16),
                    _buildFileTypeProgress(
                      type: 'files.videos'.tr(),
                      icon: Icons.videocam,
                      count: _dashboardStats!.fileTypeBreakdown.videos,
                      total: _dashboardStats!.totalFiles,
                      color: Colors.blue,
                    ),
                    const SizedBox(height: 16),
                    _buildFileTypeProgress(
                      type: 'files.audio'.tr(),
                      icon: Icons.audiotrack,
                      count: _dashboardStats!.fileTypeBreakdown.audio,
                      total: _dashboardStats!.totalFiles,
                      color: Colors.orange,
                    ),
                    const SizedBox(height: 16),
                    _buildFileTypeProgress(
                      type: 'files.documents'.tr(),
                      icon: Icons.description,
                      count: _dashboardStats!.fileTypeBreakdown.documents,
                      total: _dashboardStats!.totalFiles,
                      color: Colors.green,
                    ),
                    const SizedBox(height: 16),
                    _buildFileTypeProgress(
                      type: 'files.pdfs'.tr(),
                      icon: Icons.picture_as_pdf,
                      count: _dashboardStats!.fileTypeBreakdown.pdfs,
                      total: _dashboardStats!.totalFiles,
                      color: Colors.red,
                    ),
                    const SizedBox(height: 16),
                    _buildFileTypeProgress(
                      type: 'files.spreadsheets'.tr(),
                      icon: Icons.table_chart,
                      count: _dashboardStats!.fileTypeBreakdown.spreadsheets,
                      total: _dashboardStats!.totalFiles,
                      color: Colors.teal,
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }
  
  Widget _buildStatCard({
    required IconData icon,
    required String title,
    required String value,
    required Color color,
  }) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(
                title,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontSize: 11,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: Icon(icon, size: 20, color: color),
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    value,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildQuickActionCard({
    required IconData icon,
    required String title,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(right: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(5),
        child: Container(
          width: 120,
          decoration: BoxDecoration(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(5),
            border: Border.all(
              color: color,
              width: 0.5,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 32, color: color),
              const SizedBox(height: 8),
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildFileTypeProgress({
    required String type,
    required IconData icon,
    required int count,
    required int total,
    required Color color,
  }) {
    // Handle division by zero when there are no files
    final percentage = total > 0 ? (count / total * 100).round() : 0;
    final progressValue = total > 0 ? count / total : 0.0;

    return Column(
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 8),
            Text(
              type,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const Spacer(),
            Text(
              '$count files',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(width: 8),
            Text(
              '$percentage%',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(5),
          child: LinearProgressIndicator(
            value: progressValue,
            minHeight: 8,
            backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }

  Widget _buildMessagesView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.message,
            size: 64,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 16),
          Text(
            'File Messages',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Comments and discussions about files will appear here',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProjectsView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'File Projects',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        ...List.generate(4, (index) => Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(5),
          ),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              child: Text('P${index + 1}'),
            ),
            title: Text('Project ${index + 1}'),
            subtitle: Text('${10 + index * 3} files · Last updated ${index + 1} days ago'),
            trailing: Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Opening Project ${index + 1}')),
              );
            },
          ),
        )),
      ],
    );
  }

  Widget _buildCalendarView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.calendar_today,
            size: 64,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 16),
          Text(
            'File Calendar',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'File deadlines and schedules will appear here',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotesView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'File Notes',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        Card(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(5),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.note, color: Theme.of(context).colorScheme.primary),
                    const SizedBox(width: 8),
                    Text(
                      'Quick Notes',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Add notes about your files here for quick reference.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Add new note')),
                    );
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Add Note'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }



  Widget _buildFileGridItem(FileItem file) {
    final fileId = file.id;
    final isSelected = _selectedItemIds.contains(fileId);
    final isImage = _isImageFile(file.type);

    // For image files, use full-card thumbnail style like images_screen
    if (isImage && file.url != null && file.url!.isNotEmpty) {
      return Card(
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
          side: isSelected
              ? BorderSide(color: context.primaryColor, width: 2)
              : BorderSide.none,
        ),
        color: isSelected ? context.primaryColor.withOpacity(0.1) : null,
        child: InkWell(
          onTap: () {
            if (_isSelectionMode) {
              setState(() {
                if (isSelected) {
                  _selectedItemIds.remove(fileId);
                  if (_selectedItemIds.isEmpty) {
                    _isSelectionMode = false;
                  }
                } else {
                  _selectedItemIds.add(fileId);
                }
              });
            } else {
              _openFile(file);
            }
          },
          onLongPress: () {
            setState(() {
              _isSelectionMode = true;
              _selectedItemIds.add(fileId);
            });
          },
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
                        file.size,
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
              if (file.isStarred)
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
              if (!_isSelectionMode)
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
                    onSelected: (value) => _handleFileAction(value, file),
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'preview',
                        child: Row(
                          children: [
                            const Icon(Icons.visibility, size: 18),
                            const SizedBox(width: 12),
                            Text('files.preview'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'download',
                        child: Row(
                          children: [
                            const Icon(Icons.download, size: 18),
                            const SizedBox(width: 12),
                            Text('files.download'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'offline_toggle',
                        child: Row(
                          children: [
                            const Icon(Icons.cloud_download_outlined, size: 18),
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
                      PopupMenuItem(
                        value: 'cut',
                        child: Row(
                          children: [
                            const Icon(Icons.content_cut, size: 18),
                            const SizedBox(width: 12),
                            Text('files.cut'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'copy',
                        child: Row(
                          children: [
                            const Icon(Icons.content_copy, size: 18),
                            const SizedBox(width: 12),
                            Text('files.copy'.tr()),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem(
                        value: 'rename',
                        child: Row(
                          children: [
                            const Icon(Icons.edit, size: 18),
                            const SizedBox(width: 12),
                            Text('files.rename'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'star',
                        child: Row(
                          children: [
                            Icon(
                              file.isStarred ? Icons.star : Icons.star_outline,
                              size: 18,
                            ),
                            const SizedBox(width: 12),
                            Text(file.isStarred ? 'files.unstar'.tr() : 'files.star'.tr()),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem(
                        value: 'share',
                        child: Row(
                          children: [
                            const Icon(Icons.share, size: 18),
                            const SizedBox(width: 12),
                            Text('files.share'.tr()),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'get_link',
                        child: Row(
                          children: [
                            Icon(Icons.link, size: 18),
                            SizedBox(width: 12),
                            Text('Get Link'),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'version_history',
                        child: Row(
                          children: [
                            const Icon(Icons.history, size: 18),
                            const SizedBox(width: 12),
                            Text('files.version_history'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'properties',
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline, size: 18),
                            const SizedBox(width: 12),
                            Text('files.properties'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'comments',
                        child: Row(
                          children: [
                            const Icon(Icons.comment_outlined, size: 18),
                            const SizedBox(width: 12),
                            Text('Comments'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem(
                        value: 'trash',
                        child: Row(
                          children: [
                            const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                            const SizedBox(width: 12),
                            Text('files.move_to_trash'.tr(), style: const TextStyle(color: Colors.red)),
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

    // For non-images or videos, use the original compact style
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(5),
        side: isSelected
            ? BorderSide(color: context.primaryColor, width: 2)
            : BorderSide.none,
      ),
      color: isSelected ? context.primaryColor.withOpacity(0.1) : null,
      child: InkWell(
        onTap: () {
          if (_isSelectionMode) {
            // Toggle selection
            setState(() {
              if (isSelected) {
                _selectedItemIds.remove(fileId);
                if (_selectedItemIds.isEmpty) {
                  _isSelectionMode = false;
                }
              } else {
                _selectedItemIds.add(fileId);
              }
            });
          } else {
            _openFile(file);
          }
        },
        onLongPress: () {
          setState(() {
            _isSelectionMode = true;
            _selectedItemIds.add(fileId);
          });
        },
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Thumbnail preview for videos
              if (_shouldShowThumbnail(file.type))
                Center(
                  child: Container(
                    height: 70,
                    margin: const EdgeInsets.only(bottom: 6),
                    child: _buildFileThumbnail(file),
                  ),
                ),
              Row(
                children: [
                  if (!_shouldShowThumbnail(file.type))
                    Icon(
                      _getFileIcon(file.type),
                      color: _getFileColor(file.type),
                      size: 32,
                    ),
                  const Spacer(),
                  if (!_isSelectionMode)
                    PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, size: 20),
                    onSelected: (value) => _handleFileAction(value, file),
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'preview',
                        child: Row(
                          children: [
                            const Icon(Icons.visibility, size: 18),
                            const SizedBox(width: 12),
                            Text('files.preview'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'download',
                        child: Row(
                          children: [
                            const Icon(Icons.download, size: 18),
                            const SizedBox(width: 12),
                            Text('files.download'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'offline_toggle',
                        child: Row(
                          children: [
                            const Icon(Icons.cloud_download_outlined, size: 18),
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
                      PopupMenuItem(
                        value: 'cut',
                        child: Row(
                          children: [
                            const Icon(Icons.content_cut, size: 18),
                            const SizedBox(width: 12),
                            Text('files.cut'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'copy',
                        child: Row(
                          children: [
                            const Icon(Icons.content_copy, size: 18),
                            const SizedBox(width: 12),
                            Text('files.copy'.tr()),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem(
                        value: 'rename',
                        child: Row(
                          children: [
                            const Icon(Icons.edit, size: 18),
                            const SizedBox(width: 12),
                            Text('files.rename'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'star',
                        child: Row(
                          children: [
                            Icon(
                              file.isStarred ? Icons.star : Icons.star_outline,
                              size: 18,
                            ),
                            const SizedBox(width: 12),
                            Text(file.isStarred ? 'files.unstar'.tr() : 'files.star'.tr()),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem(
                        value: 'share',
                        child: Row(
                          children: [
                            const Icon(Icons.share, size: 18),
                            const SizedBox(width: 12),
                            Text('files.share'.tr()),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'get_link',
                        child: Row(
                          children: [
                            Icon(Icons.link, size: 18),
                            SizedBox(width: 12),
                            Text('Get Link'),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'version_history',
                        child: Row(
                          children: [
                            const Icon(Icons.history, size: 18),
                            const SizedBox(width: 12),
                            Text('files.version_history'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'properties',
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline, size: 18),
                            const SizedBox(width: 12),
                            Text('files.properties'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'comments',
                        child: Row(
                          children: [
                            const Icon(Icons.comment_outlined, size: 18),
                            const SizedBox(width: 12),
                            Text('Comments'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(
                              Icons.delete_outline,
                              size: 18,
                              color: Theme.of(context).colorScheme.error,
                            ),
                            const SizedBox(width: 12),
                            Text(
                              'files.move_to_trash'.tr(),
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    file.name,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    file.size,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontSize: 11,
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

  Widget _buildFileListItem(FileItem file) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(5),
      ),
      child: ListTile(
        leading: _shouldShowThumbnail(file.type) && file.url != null && file.url!.isNotEmpty
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
                          _getFileIcon(file.type),
                          color: _getFileColor(file.type),
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
                    if (file.type.toLowerCase() == 'video' ||
                        file.type.toLowerCase() == 'mp4' ||
                        file.type.toLowerCase() == 'mov' ||
                        file.type.toLowerCase() == 'avi' ||
                        file.type.toLowerCase() == 'mkv' ||
                        file.type.toLowerCase() == 'webm')
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
                _getFileIcon(file.type),
                color: _getFileColor(file.type),
                size: 32,
              ),
        title: Text(
          file.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          '${_getTimeAgo(file.lastModified)} • ${file.size}',
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
                const PopupMenuDivider(),
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
                  value: 'get_link',
                  child: Row(
                    children: [
                      Icon(Icons.link, size: 18),
                      SizedBox(width: 12),
                      Text('Get Link'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'version_history',
                  child: Row(
                    children: [
                      Icon(Icons.history, size: 18),
                      SizedBox(width: 12),
                      Text('Version History'),
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
                  value: 'comments',
                  child: Row(
                    children: [
                      Icon(Icons.comment_outlined, size: 18),
                      SizedBox(width: 12),
                      Text('Comments'),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(
                        Icons.delete_outline,
                        size: 18,
                        color: Theme.of(context).colorScheme.error,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'Move to trash',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
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
      case 'word':
        return Icons.description;
      case 'excel':
        return Icons.table_chart;
      case 'figma':
        return Icons.design_services;
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
      case 'word':
        return Colors.blue;
      case 'excel':
        return Colors.orange;
      case 'figma':
        return Colors.pink;
      default:
        return Colors.grey;
    }
  }

  bool _shouldShowThumbnail(String type) {
    final typeLC = type.toLowerCase();
    return typeLC == 'image' || typeLC == 'video' || typeLC == 'jpg' ||
           typeLC == 'png' || typeLC == 'jpeg' || typeLC == 'gif' ||
           typeLC == 'webp' || typeLC == 'mp4' || typeLC == 'mov' || typeLC == 'avi';
  }

  bool _isImageFile(String type) {
    final typeLC = type.toLowerCase();
    return typeLC == 'image' || typeLC == 'jpg' || typeLC == 'png' ||
           typeLC == 'jpeg' || typeLC == 'gif' || typeLC == 'webp' ||
           typeLC == 'svg';
  }

  Widget _buildFileThumbnail(FileItem file) {
    if (file.url == null || file.url!.isEmpty) {
      // Fallback to icon
      return Icon(
        _getFileIcon(file.type),
        color: _getFileColor(file.type),
        size: 48,
      );
    }

    final isVideo = file.type.toLowerCase() == 'video' ||
                    file.type.toLowerCase() == 'mp4' ||
                    file.type.toLowerCase() == 'mov' ||
                    file.type.toLowerCase() == 'avi';

    return Stack(
      fit: StackFit.expand,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: Image.network(
            file.url!,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return Icon(
                _getFileIcon(file.type),
                color: _getFileColor(file.type),
                size: 48,
              );
            },
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return Center(
                child: CircularProgressIndicator(
                  value: loadingProgress.expectedTotalBytes != null
                      ? loadingProgress.cumulativeBytesLoaded /
                        loadingProgress.expectedTotalBytes!
                      : null,
                  strokeWidth: 2,
                ),
              );
            },
          ),
        ),
        // Video play icon overlay
        if (isVideo)
          Center(
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.5),
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
    );
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

  String _getTimeAgo(DateTime? dateTime) {
    if (dateTime == null) return 'Unknown';

    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inSeconds < 60) return 'Just now';
    if (difference.inMinutes < 60) return '${difference.inMinutes}m ago';
    if (difference.inHours < 24) return '${difference.inHours}h ago';
    if (difference.inDays < 7) return '${difference.inDays}d ago';
    if (difference.inDays < 30) return '${(difference.inDays / 7).floor()}w ago';
    if (difference.inDays < 365) return '${(difference.inDays / 30).floor()}mo ago';
    return '${(difference.inDays / 365).floor()}y ago';
  }

  List<dynamic> _sortItems(List<dynamic> items) {
    // Create a copy to avoid modifying the original list
    final sortedItems = List<dynamic>.from(items);

    switch (_sortBy) {
      case 'Date Modified':
        sortedItems.sort((a, b) {
          final dateA = _getItemDate(a);
          final dateB = _getItemDate(b);
          // Sort by most recent first (descending)
          return dateB.compareTo(dateA);
        });
        break;

      case 'Name':
        sortedItems.sort((a, b) {
          final nameA = _getItemName(a).toLowerCase();
          final nameB = _getItemName(b).toLowerCase();
          return nameA.compareTo(nameB);
        });
        break;

      case 'Size':
        sortedItems.sort((a, b) {
          final sizeA = _getItemSize(a);
          final sizeB = _getItemSize(b);
          // Sort by largest first (descending)
          return sizeB.compareTo(sizeA);
        });
        break;

      case 'Type':
        sortedItems.sort((a, b) {
          final typeA = _getItemType(a).toLowerCase();
          final typeB = _getItemType(b).toLowerCase();
          return typeA.compareTo(typeB);
        });
        break;
    }

    return sortedItems;
  }

  DateTime _getItemDate(dynamic item) {
    if (item is FolderItem) {
      return item.lastModified;
    } else if (item is FileItem) {
      return item.lastModified;
    }
    return DateTime.now();
  }

  String _getItemName(dynamic item) {
    if (item is FolderItem) {
      return item.name;
    } else if (item is FileItem) {
      return item.name;
    }
    return '';
  }

  int _getItemSize(dynamic item) {
    if (item is FolderItem) {
      // Folders don't have size, return 0
      return 0;
    } else if (item is FileItem) {
      // Extract size from formatted string (e.g., "2.5 MB" -> bytes)
      final sizeStr = item.size.toLowerCase();
      final parts = sizeStr.split(' ');
      if (parts.length != 2) return 0;

      final value = double.tryParse(parts[0]) ?? 0;
      final unit = parts[1];

      switch (unit) {
        case 'b':
          return value.toInt();
        case 'kb':
          return (value * 1024).toInt();
        case 'mb':
          return (value * 1024 * 1024).toInt();
        case 'gb':
          return (value * 1024 * 1024 * 1024).toInt();
        case 'tb':
          return (value * 1024 * 1024 * 1024 * 1024).toInt();
        default:
          return 0;
      }
    }
    return 0;
  }

  String _getItemType(dynamic item) {
    if (item is FolderItem) {
      return 'folder'; // Folders come first
    } else if (item is FileItem) {
      return item.type;
    }
    return '';
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

  void _openFile(FileItem file) {
    // Check if this is an API file with full data
    final apiFile = _fileMap[file.name];

    // Mark file as opened to track in recent files
    if (apiFile != null) {
      _markFileAsOpened(apiFile.id);
    }

    // Check if it's an image file
    if (file.type == 'image' ||
        file.type == 'jpg' ||
        file.type == 'jpeg' ||
        file.type == 'png' ||
        file.type == 'gif' ||
        file.type == 'svg' ||
        file.type == 'webp') {

      if (apiFile != null) {
        showImagePreviewDialog(
          context,
          file: apiFile,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Cannot preview ${file.name} - File data not available')),
        );
      }
    }
    // Check if it's a video file
    else if (file.type == 'video' ||
        file.type == 'mp4' ||
        file.type == 'mov' ||
        file.type == 'avi' ||
        file.type == 'mkv' ||
        file.type == 'webm' ||
        file.type == 'flv' ||
        file.type == 'm4v') {

      if (apiFile != null) {
        showVideoPlayerDialog(
          context,
          file: apiFile,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Cannot play ${file.name} - File data not available')),
        );
      }
    }
    else {
      // For other files, show generic message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Opening ${file.name}')),
      );
    }
  }

  /// Delete selected files and folders
  Future<void> _deleteSelectedItems() async {
    if (_selectedItemIds.isEmpty) return;

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Items'),
        content: Text('Are you sure you want to delete ${_selectedItemIds.length} item(s)?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      // Separate files and folders
      final fileIds = <String>[];
      final folderIds = <String>[];

      for (var id in _selectedItemIds) {
        // Check if it's a file or folder
        final isFile = _apiFiles.any((f) => f.id == id);
        if (isFile) {
          fileIds.add(id);
        } else {
          folderIds.add(id);
        }
      }

      // Delete files in bulk if any
      if (fileIds.isNotEmpty) {
        final fileApiService = FileApiService();
        final response = await fileApiService.deleteMultipleFiles(
          _currentWorkspace!.id,
          DeleteMultipleFilesDto(fileIds: fileIds),
        );

        if (response.isSuccess && response.data != null) {
          final result = response.data!;
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(result.message),
                backgroundColor: Colors.green,
              ),
            );
          }
        }
      }

      // Delete folders in bulk if any
      if (folderIds.isNotEmpty) {
        final fileApiService = FileApiService();
        final response = await fileApiService.deleteMultipleFolders(
          _currentWorkspace!.id,
          DeleteMultipleFoldersDto(folderIds: folderIds),
        );

        if (response.isSuccess && response.data != null) {
          final result = response.data!;
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(result.message),
                backgroundColor: Colors.green,
              ),
            );
          }
        }
      }

      // Exit selection mode and refresh
      setState(() {
        _isSelectionMode = false;
        _selectedItemIds.clear();
      });

      // Refresh the file list
      await _fetchFolders();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error deleting items: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _copySelectedItemsToClipboard() {
    if (_selectedItemIds.isEmpty) return;

    // Get the File and Folder models from selected IDs
    final selectedFiles = <file_model.File>[];
    final selectedFolders = <model.Folder>[];

    for (var id in _selectedItemIds) {
      // Check if it's a file
      final isFile = _apiFiles.any((f) => f.id == id);

      if (isFile) {
        final apiFile = _apiFiles.firstWhere((f) => f.id == id);
        // Get the full File model from the map
        final fullFile = _fileMap[apiFile.name];
        if (fullFile != null) {
          selectedFiles.add(fullFile);
        }
      } else {
        // Check if it's a folder
        final folder = _apiFolders.firstWhere(
          (f) => f.id == id,
          orElse: () => model.Folder(
            id: '',
            workspaceId: '',
            name: '',
            createdBy: '',
            isDeleted: false,
            createdAt: DateTime.now(),
            updatedAt: DateTime.now(),
          ),
        );

        if (folder.id.isNotEmpty) {
          selectedFolders.add(folder);
        }
      }
    }

    // Copy to clipboard
    _clipboardService.copyMultipleItems(
      files: selectedFiles,
      folders: selectedFolders,
    );

    // Exit selection mode
    setState(() {
      _isSelectionMode = false;
      _selectedItemIds.clear();
    });

    // Show success message
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Copied ${selectedFiles.length} file(s) and ${selectedFolders.length} folder(s) to clipboard',
        ),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _cutSelectedItemsToClipboard() {
    if (_selectedItemIds.isEmpty) return;

    // Get the File and Folder models from selected IDs
    final selectedFiles = <file_model.File>[];
    final selectedFolders = <model.Folder>[];

    for (var id in _selectedItemIds) {
      // Check if it's a file
      final isFile = _apiFiles.any((f) => f.id == id);

      if (isFile) {
        final apiFile = _apiFiles.firstWhere((f) => f.id == id);
        // Get the full File model from the map
        final fullFile = _fileMap[apiFile.name];
        if (fullFile != null) {
          selectedFiles.add(fullFile);
        }
      } else {
        // Check if it's a folder
        final folder = _apiFolders.firstWhere(
          (f) => f.id == id,
          orElse: () => model.Folder(
            id: '',
            workspaceId: '',
            name: '',
            createdBy: '',
            isDeleted: false,
            createdAt: DateTime.now(),
            updatedAt: DateTime.now(),
          ),
        );

        if (folder.id.isNotEmpty) {
          selectedFolders.add(folder);
        }
      }
    }

    // Cut to clipboard
    _clipboardService.cutMultipleItems(
      files: selectedFiles,
      folders: selectedFolders,
    );

    // Exit selection mode
    setState(() {
      _isSelectionMode = false;
      _selectedItemIds.clear();
    });

    // Show success message
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Cut ${selectedFiles.length} file(s) and ${selectedFolders.length} folder(s) to clipboard',
        ),
        backgroundColor: Colors.orange,
      ),
    );
  }

  Future<void> _showMoveDialog() async {
    if (_selectedItemIds.isEmpty) return;

    String? selectedFolderId;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Move to Folder'),
          content: SizedBox(
            width: double.maxFinite,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_selectedItemIds.length} item(s) selected',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Select destination folder:',
                  style: TextStyle(fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 12),
                Container(
                  constraints: const BoxConstraints(maxHeight: 300),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: _apiFolders.isEmpty
                      ? Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text(
                            'No folders available',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          itemCount: _apiFolders.length,
                          itemBuilder: (context, index) {
                            final folder = _apiFolders[index];
                            final folderId = folder.id;
                            final isSelected = selectedFolderId == folderId;

                            return ListTile(
                              leading: Icon(
                                Icons.folder,
                                color: isSelected
                                    ? context.primaryColor
                                    : const Color(0xFF8B6BFF),
                              ),
                              title: Text(
                                folder.name,
                                style: TextStyle(
                                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                  color: isSelected ? context.primaryColor : null,
                                ),
                              ),
                              trailing: isSelected
                                  ? Icon(Icons.check_circle, color: context.primaryColor)
                                  : null,
                              selected: isSelected,
                              onTap: () {
                                setState(() {
                                  selectedFolderId = folderId;
                                });
                              },
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: selectedFolderId != null
                  ? () => Navigator.pop(context, true)
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: context.primaryColor,
              ),
              child: const Text(
                'Move',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true && selectedFolderId != null) {
      await _executeMoveOperation(destinationFolderId: selectedFolderId!);
    }
  }

  Future<void> _executeMoveOperation({required String destinationFolderId}) async {
    try {
      // Separate files and folders
      final fileIds = <String>[];
      final folderIds = <String>[];

      for (var id in _selectedItemIds) {
        final isFile = _apiFiles.any((f) => f.id == id);
        if (isFile) {
          fileIds.add(id);
        } else {
          folderIds.add(id);
        }
      }

      int totalMoved = 0;
      int totalFailed = 0;
      final List<String> errors = [];
      final fileApiService = FileApiService();

      // Move files if any
      if (fileIds.isNotEmpty) {
        final response = await fileApiService.moveFiles(
          _currentWorkspace!.id,
          MoveFilesDto(
            fileIds: fileIds,
            targetFolderId: destinationFolderId.isEmpty ? null : destinationFolderId,
          ),
        );

        if (response.isSuccess && response.data != null) {
          totalMoved = totalMoved + response.data!.movedCount;
          totalFailed = totalFailed + response.data!.failedCount;

          if (response.data!.failed.isNotEmpty) {
            errors.add('${response.data!.failedCount} file(s) failed to move');
          }
        } else {
          errors.add('Failed to move files: ${response.message ?? 'Unknown error'}');
          totalFailed = totalFailed + fileIds.length;
        }
      }

      // Move folders if any
      if (folderIds.isNotEmpty) {
        final response = await fileApiService.moveFolders(
          _currentWorkspace!.id,
          MoveFoldersDto(
            folderIds: folderIds,
            targetParentId: destinationFolderId.isEmpty ? null : destinationFolderId,
          ),
        );

        if (response.isSuccess && response.data != null) {
          totalMoved = totalMoved + response.data!.movedCount;
          totalFailed = totalFailed + response.data!.failedCount;

          if (response.data!.failed.isNotEmpty) {
            errors.add('${response.data!.failedCount} folder(s) failed to move');
          }
        } else {
          errors.add('Failed to move folders: ${response.message ?? 'Unknown error'}');
          totalFailed = totalFailed + folderIds.length;
        }
      }

      // Show result message
      if (mounted) {
        String message;
        Color backgroundColor;

        if (totalFailed == 0 && totalMoved > 0) {
          message = 'Successfully moved $totalMoved item(s)';
          backgroundColor = Colors.green;
        } else if (totalMoved > 0 && totalFailed > 0) {
          message = 'Moved $totalMoved item(s), ${totalFailed} failed';
          backgroundColor = Colors.orange;
        } else {
          message = 'Failed to move items${errors.isNotEmpty ? ': ${errors.join(', ')}' : ''}';
          backgroundColor = Colors.red;
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: backgroundColor,
          ),
        );
      }

      // Exit selection mode
      setState(() {
        _isSelectionMode = false;
        _selectedItemIds.clear();
      });

      // Refresh the file list
      await _fetchFolders();
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

  Future<void> _showCopyMoveDialog({required bool isCopy}) async {
    if (_selectedItemIds.isEmpty) return;

    String? selectedFolderId;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(isCopy ? 'Copy to Folder' : 'Move to Folder'),
          content: SizedBox(
            width: double.maxFinite,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_selectedItemIds.length} item(s) selected',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Select destination folder:',
                  style: TextStyle(fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 12),
                Container(
                  constraints: const BoxConstraints(maxHeight: 300),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: _apiFolders.isEmpty
                      ? Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text(
                            'No folders available',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          itemCount: _apiFolders.length,
                          itemBuilder: (context, index) {
                            final folder = _apiFolders[index];
                            final folderId = folder.id;
                            final isSelected = selectedFolderId == folderId;

                            return ListTile(
                              leading: Icon(
                                Icons.folder,
                                color: isSelected
                                    ? context.primaryColor
                                    : const Color(0xFF8B6BFF),
                              ),
                              title: Text(
                                folder.name,
                                style: TextStyle(
                                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                  color: isSelected ? context.primaryColor : null,
                                ),
                              ),
                              trailing: isSelected
                                  ? Icon(Icons.check_circle, color: context.primaryColor)
                                  : null,
                              selected: isSelected,
                              onTap: () {
                                setState(() {
                                  selectedFolderId = folderId;
                                });
                              },
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: selectedFolderId != null
                  ? () => Navigator.pop(context, true)
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: context.primaryColor,
              ),
              child: Text(
                isCopy ? 'Copy' : 'Move',
                style: const TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true && selectedFolderId != null) {
      await _executeCopyMove(
        isCopy: isCopy,
        destinationFolderId: selectedFolderId!,
      );
    }
  }

  Future<void> _executeCopyMove({
    required bool isCopy,
    required String destinationFolderId,
  }) async {
    try {
      // Separate files and folders
      final fileIds = <String>[];
      final folderIds = <String>[];

      for (var id in _selectedItemIds) {
        final isFile = _apiFiles.any((f) => f.id == id);
        if (isFile) {
          fileIds.add(id);
        } else {
          folderIds.add(id);
        }
      }

      if (isCopy) {
        // Copy operation
        if (fileIds.isNotEmpty) {
          final fileApiService = FileApiService();
          final response = await fileApiService.copyFiles(
            _currentWorkspace!.id,
            CopyFilesDto(
              fileIds: fileIds,
              targetFolderId: destinationFolderId,
            ),
          );

          if (response.isSuccess && response.data != null) {
            final result = response.data!;
            if (mounted) {
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
                  content: Text(response.message ?? 'Failed to copy files'),
                  backgroundColor: Colors.red,
                ),
              );
            }
          }
        }

        // TODO: Implement folder copy when API is available
        if (folderIds.isNotEmpty) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Folder copy not yet implemented'),
                backgroundColor: Colors.orange,
              ),
            );
          }
        }
      } else {
        // TODO: Implement move operation when API is available
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Move operation not yet implemented: ${fileIds.length} file(s) and ${folderIds.length} folder(s)',
              ),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }

      // Exit selection mode
      setState(() {
        _isSelectionMode = false;
        _selectedItemIds.clear();
      });

      // Refresh the file list
      await _fetchFolders();
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

  void _handleFileAction(String action, FileItem file) {
    switch (action) {
      case 'preview':
        _showPreviewDialog(file);
        break;
      case 'download':
        _downloadFile(file);
        break;
      case 'cut':
        final apiFile = _fileMap[file.name];
        if (apiFile != null) {
          _clipboardService.setCutFile(apiFile);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Cut ${file.name}'),
            ),
          );
        }
        break;
      case 'copy':
        final apiFile = _fileMap[file.name];
        if (apiFile != null) {
          _clipboardService.copyFile(apiFile);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Copied ${file.name}'),
            ),
          );
        }
        break;
      case 'rename':
        _showRenameDialog(file);
        break;
      case 'star':
        _toggleFileStar(file);
        break;
      case 'share':
        _showShareDialog(file);
        break;
      case 'version_history':
        _showVersionHistoryDialog(file);
        break;
      case 'properties':
        _showFilePropertiesDialog(file);
        break;
      case 'delete':
      case 'trash':
        _showDeleteDialog(file);
        break;
      case 'export_to_drive':
        _exportToGoogleDrive(file);
        break;
      case 'comments':
        final apiFile = _fileMap[file.name];
        if (apiFile != null && _currentWorkspace != null) {
          showFileCommentsSheet(
            context,
            workspaceId: _currentWorkspace!.id,
            fileId: apiFile.id,
            fileName: apiFile.name,
          );
        }
        break;
      case 'get_link':
        final apiFile = _fileMap[file.name];
        if (apiFile != null && _currentWorkspace != null) {
          showShareLinkSheet(
            context,
            workspaceId: _currentWorkspace!.id,
            fileId: apiFile.id,
            fileName: apiFile.name,
          );
        }
        break;
      case 'offline_toggle':
        final apiFile = _fileMap[file.name];
        if (apiFile != null) {
          handleOfflineAction(context: context, file: apiFile);
        }
        break;
    }
  }

  void _showPreviewDialog(FileItem file) {
    // Check if this is an API file with full data
    final apiFile = _fileMap[file.name];

    // Check if it's an image file - use the new image preview dialog
    if ((file.type == 'image' ||
        file.type == 'jpg' ||
        file.type == 'jpeg' ||
        file.type == 'png' ||
        file.type == 'gif' ||
        file.type == 'svg' ||
        file.type == 'webp') && apiFile != null) {

      showImagePreviewDialog(
        context,
        file: apiFile,
      );
      return;
    }

    // For non-image files, show generic preview dialog
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        child: Container(
          constraints: const BoxConstraints(
            maxWidth: 500,
            maxHeight: 600,
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    _getFileIcon(file.type),
                    color: _getFileColor(file.type),
                    size: 32,
                  ),
                  const SizedBox(width: 12),
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
                          '${file.type.toUpperCase()} • ${file.size}',
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
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                    ),
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
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'This file type cannot be previewed',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
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
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _downloadFile(file);
                    },
                    icon: const Icon(Icons.download, size: 18),
                    label: const Text('Download'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _downloadFile(FileItem file) async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Downloading ${file.name}...')),
    );

    final filePath = await _fileService.downloadFile(
      fileId: file.id,
      fileName: file.name,
    );

    if (filePath != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Downloaded to:\n$filePath'),
          duration: const Duration(seconds: 4),
          backgroundColor: Colors.green,
          action: SnackBarAction(
            label: 'OK',
            textColor: Colors.white,
            onPressed: () {},
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Download failed')),
      );
    }
  }

  Future<void> _exportToGoogleDrive(FileItem file) async {
    // Get the actual file data
    final apiFile = _fileMap[file.name];
    if (apiFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('files.export_file_not_found'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

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
        fileId: apiFile.id,
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
            action: exportResult.webViewLink != null
                ? SnackBarAction(
                    label: 'files.open_in_drive'.tr(),
                    textColor: Colors.white,
                    onPressed: () {
                      // TODO: Open webViewLink in browser
                    },
                  )
                : null,
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

  Future<void> _pasteFile() async {
    if (_clipboardService.cutFile != null) {
      // Handle file move (cut) to root folder
      final file = _clipboardService.cutFile!;

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
              Text('Moving "${file.name}" to root folder'),
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
          targetFolderId: null, // null for root folder
          newName: newName.isNotEmpty && newName != file.name ? newName : null,
        );

        if (movedFile != null && mounted) {
          _clipboardService.clear();
          await _fetchFolders(); // Refresh to show the moved file

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
    } else if (_clipboardService.copiedFile != null) {
      // Handle file copy to root folder
      final file = _clipboardService.copiedFile!;

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
              Text('Pasting "${file.name}" to root folder'),
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
          targetFolderId: null, // null for root folder (no parent)
          newName: newName.isNotEmpty ? newName : null,
        );

        if (copiedFile != null && mounted) {
          _clipboardService.clear();
          await _fetchFolders(); // Refresh to show the new file

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
    }
  }

  Future<void> _pasteMultipleFiles() async {
    if (_clipboardService.copiedFiles.isEmpty) return;

    final files = _clipboardService.copiedFiles;
    final fileIds = files.map((f) => f.id).toList();

    try {
      // Use the copy API to paste files to current folder (null for root)
      final fileApiService = FileApiService();
      final response = await fileApiService.copyFiles(
        _currentWorkspace!.id,
        CopyFilesDto(
          fileIds: fileIds,
          targetFolderId: null, // null for root folder
        ),
      );

      if (response.isSuccess && response.data != null) {
        final result = response.data!;
        if (mounted) {
          _clipboardService.clear();
          await _fetchFolders(); // Refresh to show the new files

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
      // Use the copy API to paste folders to current folder (null for root)
      final fileApiService = FileApiService();
      final response = await fileApiService.copyFolders(
        _currentWorkspace!.id,
        CopyFoldersDto(
          folderIds: folderIds,
          targetParentId: null, // null for root folder
        ),
      );

      if (response.isSuccess && response.data != null) {
        final result = response.data!;
        if (mounted) {
          _clipboardService.clear();
          await _fetchFolders(); // Refresh to show the new folders

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
      // Use the move API to move files to current folder (null for root)
      final fileApiService = FileApiService();
      final response = await fileApiService.moveFiles(
        _currentWorkspace!.id,
        MoveFilesDto(
          fileIds: fileIds,
          targetFolderId: null, // null for root folder
        ),
      );

      if (response.isSuccess && response.data != null) {
        final result = response.data!;
        if (mounted) {
          _clipboardService.clear();
          await _fetchFolders(); // Refresh to show the moved files

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
      // Use the move API to move folders to current folder (null for root)
      final fileApiService = FileApiService();
      final response = await fileApiService.moveFolders(
        _currentWorkspace!.id,
        MoveFoldersDto(
          folderIds: folderIds,
          targetParentId: null, // null for root folder
        ),
      );

      if (response.isSuccess && response.data != null) {
        final result = response.data!;
        if (mounted) {
          _clipboardService.clear();
          await _fetchFolders(); // Refresh to show the moved folders

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
                subtitle: Text('Paste to root folder (All Files)'),
                onTap: () {
                  Navigator.pop(context);
                  _pasteFile();
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
                subtitle: Text('Paste to current folder'),
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
                subtitle: Text('Paste to current folder'),
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
                subtitle: Text('Move to current folder'),
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
                subtitle: Text('Move to current folder'),
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
                subtitle: Text('Paste to root folder (All Files)'),
                onTap: () {
                  Navigator.pop(context);
                  _pasteFolderItem();
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

  void _showMoreOptionsDialog() {
    // Fetch dashboard stats if not already loaded
    if (_dashboardStats == null) {
      _fetchDashboardStats();
    }

    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400, maxHeight: 600),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Flexible(
                    child: Text(
                      'files.file_manager_title'.tr(),
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
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
              const SizedBox(height: 24),
              
              // Scrollable content
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Storage Usage Section
                      _buildStorageSection(context),
                      const SizedBox(height: 24),
                      
                      // File Counters Section
                      _buildFileCountersSection(context),
                      const SizedBox(height: 24),
                      
                      // Recent Files Section
                      _buildRecentFilesSection(context),
                      const SizedBox(height: 24),
                      
                      // Shared With Me Section
                      _buildSharedWithMeSection(context),
                      const SizedBox(height: 24),
                      
                      // Quick Actions Section
                      _buildQuickActionsSection(context),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildStorageSection(BuildContext context) {
    final storageUsed = _dashboardStats?.storageUsedFormatted ?? '0 B';
    final storageTotal = _dashboardStats?.storageTotalFormatted ?? '0 B';
    final storageFree = _dashboardStats?.storageFreeFormatted ?? '0 B';
    final storagePercentage = (_dashboardStats?.storagePercentageUsed ?? 0.0) / 100;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.storage,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
              const SizedBox(width: 12),
              Text(
                'files.storage_usage_title'.tr(),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'files.storage_used_format'.tr(args: [storageUsed]),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              Text(
                'files.storage_free_format'.tr(args: [storageFree]),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.green.shade600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: storagePercentage.clamp(0.0, 1.0),
            backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
          ),
          const SizedBox(height: 8),
          Text(
            'files.storage_total'.tr() + ': $storageTotal',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildFileCountersSection(BuildContext context) {
    final breakdown = _dashboardStats?.fileTypeBreakdown;
    final documentsCount = (breakdown?.documents ?? 0) + (breakdown?.pdfs ?? 0) + (breakdown?.spreadsheets ?? 0);
    final imagesCount = breakdown?.images ?? 0;
    final videosCount = breakdown?.videos ?? 0;
    final audioCount = breakdown?.audio ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'files.file_types_title'.tr(),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildFileTypeCounter(
                context,
                Icons.article,
                'files.documents'.tr(),
                '$documentsCount',
                Colors.blue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildFileTypeCounter(
                context,
                Icons.image,
                'files.images'.tr(),
                '$imagesCount',
                Colors.green,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildFileTypeCounter(
                context,
                Icons.videocam,
                'files.videos'.tr(),
                '$videosCount',
                Colors.purple,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildFileTypeCounter(
                context,
                Icons.audiotrack,
                'files.audio'.tr(),
                '$audioCount',
                Colors.orange,
              ),
            ),
          ],
        ),
      ],
    );
  }
  
  Widget _buildFileTypeCounter(
    BuildContext context,
    IconData icon,
    String type,
    String count,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(5),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 4),
          Text(
            count,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            type,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
  
  Widget _buildRecentFilesSection(BuildContext context) {
    final recentFilesToShow = _recentFiles.take(3).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'files.recent_files_title'.tr(),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const RecentFilesScreen()),
                );
              },
              child: Text('files.view_all'.tr()),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (recentFilesToShow.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'files.no_recent_activity'.tr(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          )
        else
          ...recentFilesToShow.map((file) {
            final fileType = _getFileTypeFromMimeType(file.mimeType);
            return ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                _getFileIcon(fileType),
                color: _getFileColor(fileType),
              ),
              title: Text(
                file.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text(_formatTimeAgo(file.updatedAt ?? file.createdAt)),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                Navigator.pop(context);
                _openFileFromModel(file);
              },
            );
          }),
      ],
    );
  }

  /// Convert mime type to simple file type for icon/color lookup
  String _getFileTypeFromMimeType(String mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.contains('pdf')) return 'pdf';
    if (mimeType.contains('spreadsheet') || mimeType.contains('excel')) return 'excel';
    if (mimeType.contains('document') || mimeType.contains('word')) return 'word';
    return 'file';
  }

  String _formatTimeAgo(DateTime? dateTime) {
    if (dateTime == null) return 'files.unknown_time'.tr();

    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) return 'files.just_now'.tr();
    if (difference.inMinutes < 60) return 'files.minutes_ago'.tr(args: [difference.inMinutes.toString()]);
    if (difference.inHours < 24) {
      return difference.inHours > 1
          ? 'files.hours_ago'.tr(args: [difference.inHours.toString()])
          : 'files.hour_ago'.tr(args: [difference.inHours.toString()]);
    }
    if (difference.inDays < 7) {
      return difference.inDays > 1
          ? 'files.days_ago'.tr(args: [difference.inDays.toString()])
          : 'files.day_ago'.tr(args: [difference.inDays.toString()]);
    }
    return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
  }

  /// Open file from File model (used in recent files and shared files sections)
  void _openFileFromModel(file_model.File file) {
    // Mark file as opened to track in recent files
    _markFileAsOpened(file.id);

    final fileType = _getFileTypeFromMimeType(file.mimeType);

    // Check if it's an image file
    if (fileType == 'image') {
      showImagePreviewDialog(context, file: file);
    }
    // Check if it's a video file
    else if (fileType == 'video') {
      showVideoPlayerDialog(context, file: file);
    }
    else {
      // For other files, show generic message or download
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Opening ${file.name}')),
      );
    }
  }

  Widget _buildSharedWithMeSection(BuildContext context) {
    final sharedFilesToShow = _sharedFiles.take(3).toList();
    final sharedCount = _sharedFiles.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'files.shared_with_me_title'.tr(),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                if (_currentWorkspace != null) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => SharedWithMeScreen(
                        workspaceId: _currentWorkspace!.id,
                      ),
                    ),
                  );
                }
              },
              child: Text('files.view_all'.tr()),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (sharedFilesToShow.isEmpty)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              Icons.people_outline,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            title: Text('files.no_files_shared'.tr()),
            subtitle: Text('files.files_shared_appear'.tr()),
          )
        else ...[
          ...sharedFilesToShow.map((file) {
            final fileType = _getFileTypeFromMimeType(file.mimeType);
            return ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                _getFileIcon(fileType),
                color: _getFileColor(fileType),
              ),
              title: Text(
                file.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text(_formatTimeAgo(file.updatedAt ?? file.createdAt)),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                Navigator.pop(context);
                _openFileFromModel(file);
              },
            );
          }),
          if (sharedCount > 3)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                'files.more_files'.tr(args: [(sharedCount - 3).toString()]),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            ),
        ],
      ],
    );
  }
  
  Widget _buildQuickActionsSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'files.quick_actions_title'.tr(),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Column(
          children: [
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _showCreateFolderDialog();
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.black,
                  alignment: Alignment.centerLeft,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(5),
                  ),
                ),
                icon: const Icon(Icons.folder_outlined),
                label: Text('files.create_folder'.tr()),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _showUploadFilesDialog();
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.black,
                  alignment: Alignment.centerLeft,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(5),
                  ),
                ),
                icon: const Icon(Icons.upload_file),
                label: Text('files.upload_files'.tr()),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const OfflineFilesScreen(),
                    ),
                  );
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.black,
                  alignment: Alignment.centerLeft,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(5),
                  ),
                ),
                icon: const Icon(Icons.cloud_off_outlined),
                label: Text('files.offline.title'.tr()),
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _showUploadFilesDialog() {
    showFileUploadDialog(
      context,
      folderId: null, // Root level
      onUploadComplete: () {
        // Refresh folders and files after upload
        _fetchFolders();
      },
    );
  }


  void _uploadFiles() async {
    try {
      // Open file picker to select files from device
      final result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        type: FileType.any,
      );
      
      if (result != null && result.files.isNotEmpty) {
        // Files were selected
        final fileCount = result.files.length;
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Successfully selected $fileCount file${fileCount > 1 ? 's' : ''} for upload'),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 3),
            ),
          );
        }
        
        // TODO: Upload files to API instead of mock data
        // Add files to the file list (simulate adding to storage)
        // setState(() {
        //   for (var file in result.files) {
        //     _files.add(FileItem(
        //       name: file.name,
        //       type: _getFileTypeFromName(file.name),
        //       size: '${(file.size / 1024 / 1024).toStringAsFixed(2)} MB',
        //       lastModified: DateTime.now(),
        //       owner: 'You',
        //       isStarred: false,
        //       isShared: false,
        //     ));
        //   }
        // });
      } else {
        // No files selected
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('No files selected'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      // Error occurred
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error selecting files: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }
  
  String _getFileTypeFromName(String fileName) {
    final extension = fileName.split('.').last.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'mp4':
      case 'avi':
      case 'mov':
        return 'video';
      case 'mp3':
      case 'wav':
      case 'flac':
        return 'audio';
      case 'doc':
      case 'docx':
      case 'txt':
        return 'doc';
      default:
        return 'file';
    }
  }

  void _uploadImage() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        type: FileType.image,
      );
      
      if (result != null && result.files.isNotEmpty) {
        final fileCount = result.files.length;
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Successfully uploaded $fileCount image${fileCount > 1 ? 's' : ''}'),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 3),
            ),
          );
        }

        // TODO: Upload images to API
        // setState(() {
        //   for (var file in result.files) {
        //     _files.add(FileItem(
        //       name: file.name,
        //       type: 'image',
        //       size: '${(file.size / 1024 / 1024).toStringAsFixed(2)} MB',
        //       lastModified: DateTime.now(),
        //       owner: 'You',
        //       isStarred: false,
        //       isShared: false,
        //     ));
        //   }
        // });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('No images selected'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error uploading images: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  void _uploadDocument() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        type: FileType.custom,
        allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'odt', 'rtf'],
      );
      
      if (result != null && result.files.isNotEmpty) {
        final fileCount = result.files.length;
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Successfully uploaded $fileCount document${fileCount > 1 ? 's' : ''}'),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 3),
            ),
          );
        }

        // TODO: Upload documents to API
        // setState(() {
        //   for (var file in result.files) {
        //     _files.add(FileItem(
        //       name: file.name,
        //       type: _getFileTypeFromName(file.name),
        //       size: '${(file.size / 1024 / 1024).toStringAsFixed(2)} MB',
        //       lastModified: DateTime.now(),
        //       owner: 'You',
        //       isStarred: false,
        //       isShared: false,
        //     ));
        //   }
        // });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('No documents selected'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error uploading documents: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  void _uploadVideo() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        type: FileType.video,
      );
      
      if (result != null && result.files.isNotEmpty) {
        final fileCount = result.files.length;
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Successfully uploaded $fileCount video${fileCount > 1 ? 's' : ''}'),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 3),
            ),
          );
        }

        // TODO: Upload videos to API
        // setState(() {
        //   for (var file in result.files) {
        //     _files.add(FileItem(
        //       name: file.name,
        //       type: 'video',
        //       size: '${(file.size / 1024 / 1024).toStringAsFixed(2)} MB',
        //       lastModified: DateTime.now(),
        //       owner: 'You',
        //       isStarred: false,
        //       isShared: false,
        //     ));
        //   }
        // });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('No videos selected'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error uploading videos: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  void _showCreateFolderDialog() {
    final TextEditingController folderNameController = TextEditingController();
    final TextEditingController folderDescriptionController = TextEditingController();

    showDialog(
      context: context,
      barrierColor: Colors.black54,
      builder: (context) => Dialog(
        backgroundColor: Theme.of(context).colorScheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: 400,
            maxHeight: MediaQuery.of(context).size.height * 0.8,
          ),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header with title and close button
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'files.create_new_folder'.tr(),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
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

                // Scrollable content
                Flexible(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Description
                        Text(
                          'files.folder_description_hint'.tr(),
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Folder name field label
                        Text(
                          'files.folder_name'.tr(),
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
                            hintText: 'files.new_folder'.tr(),
                            hintStyle: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.5),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Description field label
                        Text(
                          'files.description_optional'.tr(),
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
                            hintText: 'files.folder_description_placeholder'.tr(),
                            hintStyle: TextStyle(
                              color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.5),
                            ),
                          ),
                        ),
                      ],
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
                      child: Text(
                        'common.cancel'.tr(),
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: () {
                        final folderName = folderNameController.text.trim();
                        final folderDescription = folderDescriptionController.text.trim();
                        if (folderName.isNotEmpty) {
                          _createFolder(folderName, description: folderDescription.isNotEmpty ? folderDescription : null);
                          Navigator.pop(context);
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('files.enter_folder_name'.tr())),
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
                      child: Text(
                        'files.create_folder_btn'.tr(),
                        style: const TextStyle(
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
  
  Future<void> _createFolder(String folderName, {String? description}) async {
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

    // Check if folder already exists
    if (_apiFolders.any((folder) => folder.name.toLowerCase() == folderName.toLowerCase())) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('A folder with this name already exists')),
      );
      return;
    }

    // Create new folder via API
    // parent_id will be null for root folders (as per API requirement)
    final createdFolder = await _fileService.createFolder(
      name: folderName,
      parentId: null, // null for root folders, will be sent as empty string to API
      description: description,
    );

    if (createdFolder != null) {
      // Refresh the folders list
      await _fetchFolders();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Folder "$folderName" created successfully')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to create folder')),
      );
    }
  }

  void _handleFolderAction(String action, FolderItem folder) async {
    switch (action) {
      case 'open':
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => FolderScreen(
              folderName: folder.name,
              folderId: folder.folderId ?? '', // Use API folder ID if available
              workspaceId: folder.workspaceId ?? _currentWorkspace?.id ?? '',
              itemCount: folder.itemCount,
              isShared: folder.isShared,
            ),
          ),
        );
        // Refresh the files screen when coming back
        _fetchFolders();
        break;
      case 'cut':
        final apiFolder = _folderMap[folder.name];
        if (apiFolder != null) {
          _clipboardService.setCutFolder(apiFolder);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Cut folder: ${folder.name}'),
            ),
          );
        }
        break;
      case 'copy':
        final apiFolder = _folderMap[folder.name];
        if (apiFolder != null) {
          _clipboardService.copyFolder(apiFolder);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Copied folder: ${folder.name}'),
            ),
          );
        }
        break;
      case 'paste':
        _pasteFolderItem();
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
        _showFolderPropertiesDialog(folder);
        break;
      case 'trash':
        _showMoveToTrashDialog(folder);
        break;
    }
  }

  void _showFolderPreviewDialog(FolderItem folder) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        child: Container(
          constraints: const BoxConstraints(
            maxWidth: 500,
            maxHeight: 600,
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.folder_outlined,
                    color: const Color(0xFF8B6BFF),
                    size: 32,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          folder.name,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Folder',
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
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.folder_outlined,
                        color: const Color(0xFF8B6BFF),
                        size: 64,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Folder Contents',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: () async {
                          Navigator.pop(context);
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => FolderScreen(
                                folderName: folder.name,
                                folderId: folder.folderId ?? '',
                                workspaceId: folder.workspaceId ?? _currentWorkspace?.id ?? '',
                                itemCount: folder.itemCount,
                                isShared: folder.isShared,
                              ),
                            ),
                          );
                          // Refresh the files screen when coming back
                          _fetchFolders();
                        },
                        icon: const Icon(Icons.folder_open, size: 18),
                        label: const Text('Open Folder'),
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
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _downloadFolder(folder);
                    },
                    icon: const Icon(Icons.download, size: 18),
                    label: const Text('Download'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _downloadFolder(FolderItem folder) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        title: const Text('Downloading Folder'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text('Preparing ${folder.name} for download...'),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: 0.6, // Simulated progress
              backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
            ),
          ],
        ),
      ),
    );
    
    // Simulate download completion
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${folder.name} downloaded as ZIP file'),
            backgroundColor: Colors.green,
            action: SnackBarAction(
              label: 'Open',
              textColor: Colors.white,
              onPressed: () {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Opening ${folder.name}.zip')),
                  );
                }
              },
            ),
          ),
        );
      }
    });
  }

  Future<void> _pasteFolderItem() async {
    if (_clipboardService.copiedFolder != null) {
      // Handle folder copy to root folder
      final folder = _clipboardService.copiedFolder!;

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
              Text('Pasting folder "${folder.name}" to root folder'),
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
          targetParentId: null, // null for root folder
          newName: newName.isNotEmpty ? newName : null,
        );

        if (copiedFolder != null && mounted) {
          _clipboardService.clear();
          await _fetchFolders(); // Refresh to show the new folder

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
              Text('Moving folder "${folder.name}" to root folder'),
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
          targetParentId: null, // null for root folder
          newName: newName.isNotEmpty && newName != folder.name ? newName : null,
        );

        if (movedFolder != null && mounted) {
          _clipboardService.clear();
          await _fetchFolders(); // Refresh to show the moved folder

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

  void _toggleFolderStar(FolderItem folder) {
    // TODO: Implement API folder star toggle
    // setState(() {
    //   _folders = _folders.map((f) {
    //     if (f.name == folder.name) {
    //       return FolderItem(
    //         name: f.name,
    //         itemCount: f.itemCount,
    //         lastModified: f.lastModified,
    //         isShared: f.isShared,
    //         isStarred: !f.isStarred,
    //       );
    //     }
    //     return f;
    //   }).toList();
    // });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          folder.isStarred
            ? 'Removed ${folder.name} from starred folders'
            : 'Added ${folder.name} to starred folders'
        ),
        backgroundColor: folder.isStarred ? null : Colors.amber,
      ),
    );
  }

  void _showRenameFolderDialog(FolderItem folder) {
    final TextEditingController renameController = TextEditingController(text: folder.name);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        title: const Text('Rename Folder'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: renameController,
              autofocus: true,
              decoration: InputDecoration(
                labelText: 'New Folder Name',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Icon(
                  Icons.info_outline,
                  size: 16,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Folder names cannot contain special characters',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ],
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
              onPressed: () async {
                final newName = renameController.text.trim();
                if (newName.isNotEmpty && newName != folder.name) {
                  Navigator.pop(context);

                  // Get the API folder from the map
                  final apiFolder = _folderMap[folder.name];

                  if (apiFolder == null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Failed to rename folder: Folder not found'),
                        backgroundColor: Colors.red,
                      ),
                    );
                    return;
                  }

                  // Call the update API
                  final success = await _fileService.updateFolder(
                    apiFolder.id,
                    name: newName,
                  );

                  if (success && mounted) {
                    // Refresh the folder list
                    await _fetchFolders();

                    // Show success message
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Folder renamed to "$newName"'),
                        backgroundColor: Colors.green,
                      ),
                    );
                  } else if (mounted) {
                    // Show error message
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Failed to rename folder to "$newName"'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
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

  void _showShareFolderDialog(FolderItem folder) {
    _showShareWithMembersDialog(
      folder.name,
      isFolder: true,
      itemId: folder.folderId,
    );
  }

  Widget _buildFolderPeopleTab(FolderItem folder) {
    final TextEditingController emailController = TextEditingController();
    final TextEditingController messageController = TextEditingController();
    String selectedPermission = 'Viewer';
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    
    return StatefulBuilder(
      builder: (context, setState) {
        return SingleChildScrollView(
          child: SizedBox(
            height: 600, // Fixed height to ensure proper scrolling
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Add people section
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Add people',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: emailController,
                          decoration: InputDecoration(
                            hintText: 'Enter email address',
                            hintStyle: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                            ),
                            filled: true,
                            fillColor: isDarkMode ? const Color(0xFF2A2A2A) : Colors.grey[100],
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide.none,
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: isDarkMode ? const Color(0xFF2A2A2A) : Colors.grey[100],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: DropdownButton<String>(
                          value: selectedPermission,
                          underline: const SizedBox(),
                          icon: const Icon(Icons.arrow_drop_down),
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
                        icon: const Icon(Icons.send),
                        style: IconButton.styleFrom(
                          backgroundColor: AppTheme.infoLight,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.all(12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: messageController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Add a message (optional)',
                      hintStyle: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                      filled: true,
                      fillColor: isDarkMode ? const Color(0xFF2A2A2A) : Colors.grey[100],
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.all(16),
                    ),
                  ),
                ],
              ),
            ),
            // Search section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Search people...',
                  hintStyle: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                  filled: true,
                  fillColor: isDarkMode ? const Color(0xFF2A2A2A) : Colors.grey[100],
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  prefixIcon: const Icon(Icons.search, color: Colors.grey),
                ),
              ),
            ),
            const SizedBox(height: 20),
            // People list
            Expanded(
              child: ListView(
                children: [
                  _buildPersonListItem(
                    name: 'Alice Johnson',
                    email: 'alice@company.com',
                    initial: 'A',
                    permission: 'Viewer',
                    onPermissionChanged: (value) {},
                  ),
                  const Divider(height: 1),
                  _buildPersonListItem(
                    name: 'Bob Smith',
                    email: 'bob@company.com',
                    initial: 'B',
                    permission: 'Viewer',
                    hasImage: true,
                    onPermissionChanged: (value) {},
                  ),
                  const Divider(height: 1),
                  _buildPersonListItem(
                    name: 'Carol Davis',
                    email: 'carol@company.com',
                    initial: 'C',
                    permission: 'Viewer',
                    hasImage: true,
                    onPermissionChanged: (value) {},
                  ),
                ],
              ),
            ),
          ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildFolderLinkSharingTab(FolderItem folder) {
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
                          controller: TextEditingController(text: 'Share link will be generated here'),
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
                            final controller = TextEditingController(text: 'Share link will be generated here');
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
                          final link = 'Share link will be generated here';
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
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: isDarkMode ? const Color(0xFF2A2A2A) : Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                        ),
                      ),
                      child: DropdownButton<String>(
                        value: selectedPermission,
                        isExpanded: true,
                        underline: const SizedBox(),
                        dropdownColor: isDarkMode ? const Color(0xFF2A2F3A) : Theme.of(context).colorScheme.surface,
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                        items: [
                          DropdownMenuItem(
                            value: 'view',
                            child: Row(
                              children: [
                                const Icon(Icons.visibility, size: 20),
                                const SizedBox(width: 8),
                                const Text('Viewer - Can view and download'),
                              ],
                            ),
                          ),
                          DropdownMenuItem(
                            value: 'edit',
                            child: Row(
                              children: [
                                const Icon(Icons.edit, size: 20),
                                const SizedBox(width: 8),
                                const Text('Editor - Can view, download and edit'),
                              ],
                            ),
                          ),
                        ],
                        onChanged: (value) {
                          if (value != null) {
                            setState(() {
                              selectedPermission = value;
                            });
                          }
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                // Link permissions
                const Text(
                  'Link permissions',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 16),
                // Allow editing
                SwitchListTile(
                  title: const Text('Allow editing'),
                  value: allowEditing,
                  onChanged: (value) {
                    setState(() {
                      allowEditing = value;
                    });
                  },
                  activeColor: AppTheme.infoLight,
                  contentPadding: EdgeInsets.zero,
                ),
                // Allow downloading
                SwitchListTile(
                  title: const Text('Allow downloading'),
                  value: allowDownloading,
                  onChanged: (value) {
                    setState(() {
                      allowDownloading = value;
                    });
                  },
                  activeColor: AppTheme.infoLight,
                  contentPadding: EdgeInsets.zero,
                ),
                // Allow copying
                SwitchListTile(
                  title: const Text('Allow copying'),
                  value: allowCopying,
                  onChanged: (value) {
                    setState(() {
                      allowCopying = value;
                    });
                  },
                  activeColor: AppTheme.infoLight,
                  contentPadding: EdgeInsets.zero,
                ),
                // Allow printing
                SwitchListTile(
                  title: const Text('Allow printing'),
                  value: allowPrinting,
                  onChanged: (value) {
                    setState(() {
                      allowPrinting = value;
                    });
                  },
                  activeColor: AppTheme.infoLight,
                  contentPadding: EdgeInsets.zero,
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildFolderPersonItem(String name, String email, String initial, {bool hasImage = false}) {
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

  void _showFolderPropertiesDialog(FolderItem folder) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        title: Text('Properties: ${folder.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildPropertyRow('Name', folder.name),
            _buildPropertyRow('Type', 'Folder'),
            _buildPropertyRow('Created', _formatDate(folder.lastModified)),
            _buildPropertyRow('Modified', _formatDate(folder.lastModified)),
            _buildPropertyRow('Shared', folder.isShared ? 'Yes' : 'No'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildPropertyRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  void _showMoveToTrashDialog(FolderItem folder) async {
    // Get the API folder from the map
    final apiFolder = _folderMap[folder.name];

    if (apiFolder == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to delete folder: Folder not found'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        title: const Text('Delete Folder'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Are you sure you want to delete "${folder.name}"?'),
            const SizedBox(height: 8),
            const Text(
              'This will permanently delete the folder and all its contents (subfolders and files).',
              style: TextStyle(
                fontSize: 12,
                color: Colors.red,
                fontWeight: FontWeight.w500,
              ),
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
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    // If user confirmed, delete the folder recursively
    if (confirmed == true) {
      final result = await _fileService.deleteFolderRecursive(apiFolder.id);

      if (result != null && mounted) {
        // Refresh the folder list
        await _fetchFolders();

        // Show success message with details
        final foldersDeleted = result['deleted_folders_count'] ?? 0;
        final filesDeleted = result['deleted_files_count'] ?? 0;

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Folder "${folder.name}" deleted successfully\n'
              'Deleted: $foldersDeleted folders, $filesDeleted files',
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );
      } else if (mounted) {
        // Show error message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete folder "${folder.name}"'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  void _showShareDialog(FileItem file) {
    _showShareWithMembersDialog(
      file.name,
      isFolder: false,
      itemId: file.id,
    );
  }

  Widget _buildFilePeopleTab(FileItem file) {
    final TextEditingController emailController = TextEditingController();
    final TextEditingController messageController = TextEditingController();
    String selectedPermission = 'Viewer';
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    
    return StatefulBuilder(
      builder: (context, setState) {
        return SingleChildScrollView(
          child: SizedBox(
            height: 600, // Fixed height to ensure proper scrolling
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Add people section
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Add people',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: emailController,
                          decoration: InputDecoration(
                            hintText: 'Enter email address',
                            hintStyle: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                            ),
                            filled: true,
                            fillColor: isDarkMode ? const Color(0xFF2A2A2A) : Colors.grey[100],
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: BorderSide.none,
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: isDarkMode ? const Color(0xFF2A2A2A) : Colors.grey[100],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: DropdownButton<String>(
                          value: selectedPermission,
                          underline: const SizedBox(),
                          icon: const Icon(Icons.arrow_drop_down),
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
                        icon: const Icon(Icons.send),
                        style: IconButton.styleFrom(
                          backgroundColor: AppTheme.infoLight,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.all(12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: messageController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Add a message (optional)',
                      hintStyle: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                      filled: true,
                      fillColor: isDarkMode ? const Color(0xFF2A2A2A) : Colors.grey[100],
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.all(16),
                    ),
                  ),
                ],
              ),
            ),
            // Search section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Search people...',
                  hintStyle: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                  filled: true,
                  fillColor: isDarkMode ? const Color(0xFF2A2A2A) : Colors.grey[100],
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  prefixIcon: const Icon(Icons.search, color: Colors.grey),
                ),
              ),
            ),
            const SizedBox(height: 20),
            // People list
            Expanded(
              child: ListView(
                children: [
                  _buildPersonListItem(
                    name: 'Alice Johnson',
                    email: 'alice@company.com',
                    initial: 'A',
                    permission: 'Viewer',
                    onPermissionChanged: (value) {},
                  ),
                  const Divider(height: 1),
                  _buildPersonListItem(
                    name: 'Bob Smith',
                    email: 'bob@company.com',
                    initial: 'B',
                    permission: 'Viewer',
                    hasImage: true,
                    onPermissionChanged: (value) {},
                  ),
                  const Divider(height: 1),
                  _buildPersonListItem(
                    name: 'Carol Davis',
                    email: 'carol@company.com',
                    initial: 'C',
                    permission: 'Viewer',
                    hasImage: true,
                    onPermissionChanged: (value) {},
                  ),
                ],
              ),
            ),
          ],
            ),
          ),
        );
      },
    );
  }
  
  Widget _buildPersonListItem({
    required String name,
    required String email,
    required String initial,
    required String permission,
    bool hasImage = false,
    required Function(String) onPermissionChanged,
  }) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        children: [
          // Avatar
          CircleAvatar(
            radius: 20,
            backgroundColor: hasImage ? Colors.grey[400] : AppTheme.infoLight,
            child: hasImage
                ? Icon(
                    Icons.person,
                    color: Colors.white.withValues(alpha: 0.8),
                    size: 24,
                  )
                : Text(
                    initial,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
          const SizedBox(width: 16),
          // Name and email
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  email,
                  style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
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
            ),
            onSelected: (value) {
              if (value == 'viewer' || value == 'editor') {
                onPermissionChanged(value == 'viewer' ? 'Viewer' : 'Editor');
              } else if (value == 'remove') {
                // Handle remove action
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'viewer',
                child: Row(
                  children: [
                    Icon(
                      Icons.visibility_outlined,
                      size: 20,
                      color: permission == 'Viewer' ? AppTheme.infoLight : null,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Viewer',
                      style: TextStyle(
                        color: permission == 'Viewer' ? AppTheme.infoLight : null,
                        fontWeight: permission == 'Viewer' ? FontWeight.w600 : null,
                      ),
                    ),
                    if (permission == 'Viewer') ...[
                      const Spacer(),
                      const Icon(Icons.check, size: 18, color: AppTheme.infoLight),
                    ],
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'editor',
                child: Row(
                  children: [
                    Icon(
                      Icons.edit_outlined,
                      size: 20,
                      color: permission == 'Editor' ? AppTheme.infoLight : null,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Editor',
                      style: TextStyle(
                        color: permission == 'Editor' ? AppTheme.infoLight : null,
                        fontWeight: permission == 'Editor' ? FontWeight.w600 : null,
                      ),
                    ),
                    if (permission == 'Editor') ...[
                      const Spacer(),
                      const Icon(Icons.check, size: 18, color: AppTheme.infoLight),
                    ],
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'remove',
                child: Row(
                  children: [
                    Icon(
                      Icons.remove_circle_outline,
                      size: 20,
                      color: Colors.red,
                    ),
                    SizedBox(width: 12),
                    Text(
                      'Remove access',
                      style: TextStyle(color: Colors.red),
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

  Widget _buildFileLinkSharingTab(FileItem file) {
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
                          'Anyone with the link can access this file',
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
                          controller: TextEditingController(text: 'Share link will be generated here'),
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
                            final controller = TextEditingController(text: 'Share link will be generated here');
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
                          final link = 'Share link will be generated here';
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
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: isDarkMode ? const Color(0xFF2A2A2A) : Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                        ),
                      ),
                      child: DropdownButton<String>(
                        value: selectedPermission,
                        isExpanded: true,
                        underline: const SizedBox(),
                        dropdownColor: isDarkMode ? const Color(0xFF2A2F3A) : Theme.of(context).colorScheme.surface,
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                        items: [
                          DropdownMenuItem(
                            value: 'view',
                            child: Row(
                              children: [
                                const Icon(Icons.visibility, size: 20),
                                const SizedBox(width: 8),
                                const Text('Viewer - Can view and download'),
                              ],
                            ),
                          ),
                          DropdownMenuItem(
                            value: 'edit',
                            child: Row(
                              children: [
                                const Icon(Icons.edit, size: 20),
                                const SizedBox(width: 8),
                                const Text('Editor - Can view, download and edit'),
                              ],
                            ),
                          ),
                        ],
                        onChanged: (value) {
                          if (value != null) {
                            setState(() {
                              selectedPermission = value;
                            });
                          }
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                // Link permissions
                const Text(
                  'Link permissions',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 16),
                // Allow editing
                SwitchListTile(
                  title: const Text('Allow editing'),
                  value: allowEditing,
                  onChanged: (value) {
                    setState(() {
                      allowEditing = value;
                    });
                  },
                  activeColor: AppTheme.infoLight,
                  contentPadding: EdgeInsets.zero,
                ),
                // Allow downloading
                SwitchListTile(
                  title: const Text('Allow downloading'),
                  value: allowDownloading,
                  onChanged: (value) {
                    setState(() {
                      allowDownloading = value;
                    });
                  },
                  activeColor: AppTheme.infoLight,
                  contentPadding: EdgeInsets.zero,
                ),
                // Allow copying
                SwitchListTile(
                  title: const Text('Allow copying'),
                  value: allowCopying,
                  onChanged: (value) {
                    setState(() {
                      allowCopying = value;
                    });
                  },
                  activeColor: AppTheme.infoLight,
                  contentPadding: EdgeInsets.zero,
                ),
                // Allow printing
                SwitchListTile(
                  title: const Text('Allow printing'),
                  value: allowPrinting,
                  onChanged: (value) {
                    setState(() {
                      allowPrinting = value;
                    });
                  },
                  activeColor: AppTheme.infoLight,
                  contentPadding: EdgeInsets.zero,
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildFilePersonItem(String name, String email, String initial, {bool hasImage = false}) {
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

  Widget _buildShareOption({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: Theme.of(context).colorScheme.primary,
                size: 24,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  void _showQRCodeDialog(FileItem file) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        title: Text('Share ${file.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                children: [
                  Container(
                    width: 200,
                    height: 200,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.qr_code, size: 100, color: Colors.grey),
                        SizedBox(height: 8),
                        Text('QR Code', style: TextStyle(color: Colors.grey)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Scan to access file',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('QR Code saved to gallery')),
              );
            },
            icon: const Icon(Icons.download, size: 18),
            label: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showRenameDialog(FileItem file) {
    final TextEditingController renameController = TextEditingController(text: file.name);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        title: const Text('Rename File'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: renameController,
              autofocus: true,
              decoration: InputDecoration(
                labelText: 'File Name',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
              ),
              onSubmitted: (value) {
                if (value.trim().isNotEmpty && value.trim() != file.name) {
                  _renameFile(file, value.trim());
                  Navigator.pop(context);
                }
              },
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Icon(
                  Icons.info_outline,
                  size: 16,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Press Enter to confirm rename',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ],
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
                  _renameFile(file, newName);
                  Navigator.pop(context);
                } else if (newName.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('File name cannot be empty'),
                      backgroundColor: Colors.red,
                    ),
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


  Future<void> _renameFile(FileItem file, String newName) async {
    // Validate the file name
    if (newName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('File name cannot be empty'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Check for invalid characters
    if (newName.contains(RegExp(r'[<>:"/\\|?*]'))) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('File name contains invalid characters'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Get the API file from the map
    final apiFile = _fileMap[file.name];

    if (apiFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to rename file: File not found'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Call the update API
    final success = await _fileService.updateFile(
      apiFile.id,
      name: newName,
    );

    if (success && mounted) {
      // Refresh the file list
      await _fetchFolders();

      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('File renamed to "$newName"'),
          backgroundColor: Colors.green,
        ),
      );
    } else if (mounted) {
      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to rename file to "$newName"'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showDeleteDialog(FileItem file) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(5),
        ),
        title: const Text('Move to Trash'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Are you sure you want to move "${file.name}" to trash?'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.errorContainer.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Theme.of(context).colorScheme.error.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.warning_amber_rounded,
                    color: Theme.of(context).colorScheme.error,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'This action will remove the file from your files list.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              _moveToTrash(file);
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Move to Trash'),
          ),
        ],
      ),
    );
  }

  Future<void> _moveToTrash(FileItem file) async {
    // Get the API file from the map
    final apiFile = _fileMap[file.name];

    if (apiFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to delete file: File not found'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Call the delete API
    final success = await _fileService.deleteFile(apiFile.id);

    if (success && mounted) {
      // Refresh the file list
      await _fetchFolders();

      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${file.name} moved to trash'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 3),
          // action: SnackBarAction(
          //   label: 'Undo',
          //   textColor: Colors.white,
          //   onPressed: () {
          //     // TODO: Implement restore from trash
          //     ScaffoldMessenger.of(context).showSnackBar(
          //       SnackBar(
          //         content: Text('${file.name} restored'),
          //         backgroundColor: Colors.green,
          //         duration: const Duration(seconds: 2),
        //       ),
        //     );
        //   },
        // ),
        ),
      );
    } else if (mounted) {
      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to delete ${file.name}'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Future<void> _toggleFileStar(FileItem file) async {
    // Get the API file from the map
    final apiFile = _fileMap[file.name];

    if (apiFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to star/unstar file'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Toggle the starred status
    final newStarredStatus = !(file.isStarred);

    // Call the API to update starred status
    final success = await _fileService.toggleStarred(apiFile.id, newStarredStatus);

    if (success) {
      // Refresh the file list to show updated status
      await _fetchFolders();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              newStarredStatus
                ? '${file.name} added to starred files'
                : '${file.name} removed from starred files'
            ),
            backgroundColor: newStarredStatus ? Colors.amber : null,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to ${newStarredStatus ? 'star' : 'unstar'} ${file.name}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showVersionHistoryDialog(FileItem file) {
    final apiFile = _fileMap[file.name];
    if (apiFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('files.file_not_found'.tr()),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final workspaceId = _currentWorkspace?.id;
    if (workspaceId == null) return;

    showDialog(
      context: context,
      builder: (context) => _VersionHistoryDialog(
        file: apiFile,
        workspaceId: workspaceId,
        onVersionRestored: () {
          _fetchFolders();
        },
      ),
    );
  }

  void _showFilePropertiesDialog(FileItem file) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Properties: ${file.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildPropertyRow('Name', file.name),
            _buildPropertyRow('Type', file.type.toUpperCase()),
            _buildPropertyRow('Size', file.size),
            _buildPropertyRow('Owner', file.owner),
            _buildPropertyRow('Created', _formatDate(file.lastModified)),
            _buildPropertyRow('Modified', _formatDate(file.lastModified)),
            _buildPropertyRow('Starred', file.isStarred ? 'Yes' : 'No'),
            _buildPropertyRow('Shared', file.isShared ? 'Yes' : 'No'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  /// Share dialog with workspace members
  void _showShareWithMembersDialog(
    String itemName, {
    required bool isFolder,
    String? itemId,
  }) {
    final workspaceMgmt = WorkspaceManagementService.instance;
    final members = workspaceMgmt.currentWorkspaceMembers;
    final workspaceId = _currentWorkspace?.id;

    showDialog(
      context: context,
      builder: (context) => _ShareWithMembersDialog(
        itemName: itemName,
        isFolder: isFolder,
        members: members,
        itemId: itemId,
        workspaceId: workspaceId,
      ),
    );
  }
}

/// Share with Members Dialog Widget
class _ShareWithMembersDialog extends StatefulWidget {
  final String itemName;
  final bool isFolder;
  final List<WorkspaceMember> members;
  final String? itemId;
  final String? workspaceId;

  const _ShareWithMembersDialog({
    required this.itemName,
    required this.isFolder,
    required this.members,
    this.itemId,
    this.workspaceId,
  });

  @override
  State<_ShareWithMembersDialog> createState() => _ShareWithMembersDialogState();
}

class _ShareWithMembersDialogState extends State<_ShareWithMembersDialog> {
  final TextEditingController _searchController = TextEditingController();
  final Set<String> _selectedMemberIds = {};
  String _searchQuery = '';
  String? _currentUserId;
  bool _isSharing = false;
  bool _isLoadingMembers = true;
  List<WorkspaceMember> _members = [];

  @override
  void initState() {
    super.initState();
    _loadCurrentUser();
    _loadMembers();
  }

  Future<void> _loadCurrentUser() async {
    final userId = await AppConfig.getCurrentUserId();
    if (mounted) {
      setState(() {
        _currentUserId = userId;
      });
    }
  }

  Future<void> _loadMembers() async {
    if (widget.workspaceId == null) {
      setState(() {
        _members = widget.members;
        _isLoadingMembers = false;
      });
      return;
    }

    try {
      // Fetch fresh members from API
      final workspaceService = WorkspaceManagementService.instance;
      await workspaceService.refresh();

      if (mounted) {
        setState(() {
          _members = workspaceService.currentWorkspaceMembers;
          _isLoadingMembers = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading members: $e');
      if (mounted) {
        setState(() {
          _members = widget.members; // Fallback to passed members
          _isLoadingMembers = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<WorkspaceMember> get _filteredMembers {
    // Filter out current user
    var members = _members.where((member) {
      return member.userId != _currentUserId;
    }).toList();

    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      members = members.where((member) {
        final name = (member.name ?? '').toLowerCase();
        final email = member.email.toLowerCase();
        final query = _searchQuery.toLowerCase();
        return name.contains(query) || email.contains(query);
      }).toList();
    }

    return members;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Container(
        width: 500,
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Share "${widget.itemName}"',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Share this ${widget.isFolder ? 'folder' : 'file'} with workspace members',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Search bar
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search members...',
                prefixIcon: const Icon(Icons.search, size: 20),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: AppTheme.infoLight),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              onChanged: (value) {
                setState(() {
                  _searchQuery = value;
                });
              },
            ),
            const SizedBox(height: 16),

            // Members list
            Flexible(
              child: Container(
                constraints: const BoxConstraints(maxHeight: 300),
                child: _isLoadingMembers
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  : _filteredMembers.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Text(
                          _searchQuery.isEmpty
                              ? 'No members in this workspace'
                              : 'No members found',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      ),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      itemCount: _filteredMembers.length,
                      itemBuilder: (context, index) {
                        final member = _filteredMembers[index];
                        final isSelected = _selectedMemberIds.contains(member.userId);
                        final isOwner = member.role == WorkspaceRole.owner;

                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          leading: CircleAvatar(
                            backgroundColor: AppTheme.infoLight,
                            child: Text(
                              _getInitials(member.name ?? member.email),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          title: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  member.name ?? member.email.split('@')[0].toUpperCase(),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w500,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (isOwner)
                                Container(
                                  margin: const EdgeInsets.only(left: 8),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.grey[200],
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'owner',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          subtitle: Text(
                            member.email,
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey[600],
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: Checkbox(
                            value: isSelected,
                            onChanged: (value) {
                              setState(() {
                                if (value == true) {
                                  _selectedMemberIds.add(member.userId);
                                } else {
                                  _selectedMemberIds.remove(member.userId);
                                }
                              });
                            },
                            activeColor: AppTheme.infoLight,
                          ),
                          onTap: () {
                            setState(() {
                              if (_selectedMemberIds.contains(member.userId)) {
                                _selectedMemberIds.remove(member.userId);
                              } else {
                                _selectedMemberIds.add(member.userId);
                              }
                            });
                          },
                        );
                      },
                    ),
              ),
            ),

            const SizedBox(height: 16),

            // Footer with member count and buttons
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_selectedMemberIds.length} member${_selectedMemberIds.length != 1 ? 's' : ''} selected',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[700],
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      ),
                      child: Text(
                        'Cancel',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[700],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton.icon(
                      onPressed: _selectedMemberIds.isEmpty || _isSharing
                          ? null
                          : () async {
                              if (widget.itemId == null || widget.workspaceId == null) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Cannot share: Missing item or workspace ID'),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                                return;
                              }

                              // Folder sharing is not yet supported by the backend
                              if (widget.isFolder) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Folder sharing is coming soon. Please share individual files for now.'),
                                    backgroundColor: Colors.orange,
                                  ),
                                );
                                Navigator.pop(context);
                                return;
                              }

                              setState(() {
                                _isSharing = true;
                              });

                              try {
                                final fileService = FileService.instance;
                                final result = await fileService.shareFile(
                                  workspaceId: widget.workspaceId!,
                                  fileId: widget.itemId!,
                                  userIds: _selectedMemberIds.toList(),
                                  permissions: {
                                    'read': true,
                                    'download': true,
                                    'edit': false,
                                  },
                                );

                                if (mounted) {
                                  Navigator.pop(context);

                                  if (result != null && result['success'] == true) {
                                    final sharedCount = result['shared_count'] ?? _selectedMemberIds.length;
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          'Shared "${widget.itemName}" with $sharedCount member${sharedCount != 1 ? 's' : ''}',
                                        ),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('Failed to share file'),
                                        backgroundColor: Colors.red,
                                      ),
                                    );
                                  }
                                }
                              } catch (e) {
                                if (mounted) {
                                  Navigator.pop(context);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Error sharing file: $e'),
                                      backgroundColor: Colors.red,
                                    ),
                                  );
                                }
                              } finally {
                                if (mounted) {
                                  setState(() {
                                    _isSharing = false;
                                  });
                                }
                              }
                            },
                      icon: _isSharing
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Icon(Icons.share, size: 18),
                      label: Text(
                        _isSharing ? 'Sharing...' : 'Share',
                        style: const TextStyle(fontSize: 16),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.infoLight,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        disabledBackgroundColor: Colors.grey[300],
                        disabledForegroundColor: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
      return parts[0][0].toUpperCase();
    }
    return 'U';
  }
}

class FileItem {
  final String id;
  final String name;
  final String size;
  final String type;
  final DateTime lastModified;
  final String owner;
  final bool isStarred;
  final bool isShared;
  final String? url;

  FileItem({
    required this.id,
    required this.name,
    required this.size,
    required this.type,
    required this.lastModified,
    required this.owner,
    required this.isStarred,
    required this.isShared,
    this.url,
  });
}

/// Version History Dialog - Shows file version history and allows restore/upload
class _VersionHistoryDialog extends StatefulWidget {
  final file_model.File file;
  final String workspaceId;
  final VoidCallback? onVersionRestored;

  const _VersionHistoryDialog({
    required this.file,
    required this.workspaceId,
    this.onVersionRestored,
  });

  @override
  State<_VersionHistoryDialog> createState() => _VersionHistoryDialogState();
}

class _VersionHistoryDialogState extends State<_VersionHistoryDialog> {
  final StorageApiService _storageService = StorageApiService();
  List<FileVersion> _versions = [];
  bool _isLoading = true;
  bool _isUploading = false;
  bool _isRestoring = false;
  String? _error;
  final TextEditingController _commentController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadVersions();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _loadVersions() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _storageService.getFileVersions(
        widget.workspaceId,
        widget.file.id,
      );

      if (response.success && response.data != null) {
        setState(() {
          _versions = response.data!;
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = response.message ?? 'files.failed_to_load_versions'.tr();
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'files.failed_to_load_versions'.tr();
        _isLoading = false;
      });
    }
  }

  Future<void> _uploadNewVersion() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.any,
      withData: true,
    );

    if (result == null || result.files.isEmpty) return;

    final file = result.files.first;
    if (file.bytes == null) return;

    setState(() => _isUploading = true);

    try {
      final response = await _storageService.uploadNewVersion(
        workspaceId: widget.workspaceId,
        fileId: widget.file.id,
        fileName: file.name,
        fileBytes: file.bytes!,
        mimeType: _getMimeType(file.name),
        comment: _commentController.text.isNotEmpty ? _commentController.text : null,
      );

      if (response.success) {
        _commentController.clear();
        await _loadVersions();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('files.version_uploaded'.tr()),
              backgroundColor: Colors.green,
            ),
          );
          widget.onVersionRestored?.call();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('files.failed_to_upload_version'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('files.failed_to_upload_version'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUploading = false);
      }
    }
  }

  Future<void> _restoreVersion(FileVersion version) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('files.restore_version'.tr()),
        content: Text('files.restore_version_confirm'.tr(args: [version.versionNumber.toString()])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('files.cancel'.tr()),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
            ),
            child: Text('files.restore'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isRestoring = true);

    try {
      final response = await _storageService.restoreVersion(
        widget.workspaceId,
        widget.file.id,
        version.id,
      );

      if (response.success) {
        await _loadVersions();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('files.version_restored'.tr(args: [version.versionNumber.toString()])),
              backgroundColor: Colors.green,
            ),
          );
          widget.onVersionRestored?.call();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('files.failed_to_restore_version'.tr()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('files.failed_to_restore_version'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isRestoring = false);
      }
    }
  }

  String _getMimeType(String fileName) {
    final ext = fileName.split('.').last.toLowerCase();
    final mimeTypes = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
      'txt': 'text/plain',
      'json': 'application/json',
      'xml': 'application/xml',
      'zip': 'application/zip',
    };
    return mimeTypes[ext] ?? 'application/octet-stream';
  }

  String _formatDate(DateTime date) {
    return DateFormat('MMM d, yyyy h:mm a').format(date);
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Container(
        width: 500,
        constraints: const BoxConstraints(maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.history,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'files.version_history'.tr(),
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          widget.file.name,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),

            // Upload new version section
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: Theme.of(context).dividerColor,
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'files.upload_new_version'.tr(),
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _commentController,
                    decoration: InputDecoration(
                      hintText: 'files.version_comment_hint'.tr(),
                      border: const OutlineInputBorder(),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: (_isUploading || _isRestoring) ? null : _uploadNewVersion,
                      icon: _isUploading
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.upload_file, size: 18),
                      label: Text(_isUploading
                          ? 'files.uploading_version'.tr()
                          : 'files.upload_new_version'.tr()),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Versions list
            Flexible(
              child: _isLoading
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  : _error != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.error_outline,
                                  size: 48,
                                  color: Colors.red.shade400,
                                ),
                                const SizedBox(height: 8),
                                Text(_error!),
                                const SizedBox(height: 8),
                                TextButton(
                                  onPressed: _loadVersions,
                                  child: Text('files.retry'.tr()),
                                ),
                              ],
                            ),
                          ),
                        )
                      : _versions.isEmpty
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.all(32),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.history,
                                      size: 48,
                                      color: Colors.grey.shade400,
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'files.no_versions'.tr(),
                                      style: Theme.of(context).textTheme.titleMedium,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'files.no_versions_hint'.tr(),
                                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              ),
                            )
                          : ListView.separated(
                              shrinkWrap: true,
                              padding: const EdgeInsets.all(16),
                              itemCount: _versions.length,
                              separatorBuilder: (context, index) => const SizedBox(height: 8),
                              itemBuilder: (context, index) {
                                final version = _versions[index];
                                final isCurrentVersion = index == 0;

                                return Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: isCurrentVersion
                                        ? Theme.of(context).colorScheme.primary.withOpacity(0.05)
                                        : Theme.of(context).cardColor,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: isCurrentVersion
                                          ? Theme.of(context).colorScheme.primary.withOpacity(0.3)
                                          : Theme.of(context).dividerColor,
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          color: isCurrentVersion
                                              ? Theme.of(context).colorScheme.primary
                                              : Colors.grey.shade300,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Center(
                                          child: Text(
                                            'v${version.versionNumber}',
                                            style: TextStyle(
                                              color: isCurrentVersion ? Colors.white : Colors.grey.shade700,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Text(
                                                  'files.version_number'.tr(args: [version.versionNumber.toString()]),
                                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                ),
                                                if (isCurrentVersion) ...[
                                                  const SizedBox(width: 8),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: Theme.of(context).colorScheme.primary,
                                                      borderRadius: BorderRadius.circular(12),
                                                    ),
                                                    child: Text(
                                                      'files.current_version'.tr(),
                                                      style: const TextStyle(
                                                        color: Colors.white,
                                                        fontSize: 10,
                                                        fontWeight: FontWeight.w500,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '${_formatDate(version.createdAt)} ${version.createdByName != null ? '• ${'files.version_by'.tr(args: [version.createdByName!])}' : ''}',
                                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                                              ),
                                            ),
                                            if (version.comment != null && version.comment!.isNotEmpty) ...[
                                              const SizedBox(height: 4),
                                              Text(
                                                version.comment!,
                                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                                  fontStyle: FontStyle.italic,
                                                ),
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ],
                                            const SizedBox(height: 2),
                                            Text(
                                              'files.version_size'.tr(args: [version.formattedSize]),
                                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (!isCurrentVersion)
                                        TextButton.icon(
                                          onPressed: _isRestoring ? null : () => _restoreVersion(version),
                                          icon: _isRestoring
                                              ? const SizedBox(
                                                  width: 14,
                                                  height: 14,
                                                  child: CircularProgressIndicator(strokeWidth: 2),
                                                )
                                              : const Icon(Icons.restore, size: 16),
                                          label: Text('files.restore'.tr()),
                                          style: TextButton.styleFrom(
                                            foregroundColor: Theme.of(context).colorScheme.primary,
                                          ),
                                        ),
                                    ],
                                  ),
                                );
                              },
                            ),
            ),

            // Footer
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: Theme.of(context).dividerColor),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text('files.close'.tr()),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Storage Details Dialog - Shows storage breakdown from API
class StorageDetailsDialog extends StatefulWidget {
  final FileService fileService;
  final Workspace? workspace;

  const StorageDetailsDialog({
    super.key,
    required this.fileService,
    this.workspace,
  });

  @override
  State<StorageDetailsDialog> createState() => _StorageDetailsDialogState();
}

class _StorageDetailsDialogState extends State<StorageDetailsDialog> {
  DashboardStats? _stats;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchStorageStats();
  }

  Future<void> _fetchStorageStats() async {
    try {
      final stats = await widget.fileService.getDashboardStats();
      if (mounted) {
        setState(() {
          _stats = stats;
          _isLoading = false;
          if (stats == null) {
            _error = 'Failed to load storage statistics';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error: $e';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(5),
      ),
      title: const Text('Storage Details'),
      content: _isLoading
          ? const SizedBox(
              height: 200,
              child: Center(child: CircularProgressIndicator()),
            )
          : _error != null
              ? SizedBox(
                  height: 200,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.red),
                        const SizedBox(height: 16),
                        Text(_error!, textAlign: TextAlign.center),
                      ],
                    ),
                  ),
                )
              : _buildStorageContent(),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
        // Show upgrade button only for workspace owners or admins
        if (_stats != null && _canUpgradeStorage())
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Navigate to billing screen
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const BillingScreen(),
                ),
              );
            },
            child: const Text('Upgrade'),
          ),
      ],
    );
  }

  /// Check if current user can upgrade storage (owner or admin)
  bool _canUpgradeStorage() {
    final currentUser = AuthService.instance.currentUser;

    if (widget.workspace == null || currentUser == null) {
      return false;
    }

    // Check if user is owner
    if (currentUser.id == widget.workspace!.ownerId) {
      return true;
    }

    // Check if user is admin via membership
    if (widget.workspace!.membership != null) {
      return widget.workspace!.membership!.canManageWorkspace();
    }

    return false;
  }

  Widget _buildStorageContent() {
    if (_stats == null) {
      return const SizedBox(
        height: 200,
        child: Center(child: Text('No data available')),
      );
    }

    final breakdown = _stats!.fileTypeBreakdown;
    final totalStorage = _stats!.storageTotalBytes;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Overall storage summary
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Total Storage',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    '${_stats!.storageUsedFormatted} / ${_stats!.storageTotalFormatted}',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: _stats!.storagePercentageUsed / 100,
                backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${_stats!.storagePercentageUsed.toStringAsFixed(1)}% used',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  Text(
                    '${_stats!.storageFreeFormatted} free',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.green.shade600,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'Storage by Type',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),

        // File type breakdown
        if (breakdown.images > 0)
          _buildStorageDetailItem(
            'Images',
            breakdown.images,
            totalStorage,
            Icons.image,
            Colors.blue,
          ),
        if (breakdown.videos > 0)
          _buildStorageDetailItem(
            'Videos',
            breakdown.videos,
            totalStorage,
            Icons.video_library,
            Colors.purple,
          ),
        if (breakdown.audio > 0)
          _buildStorageDetailItem(
            'Audio',
            breakdown.audio,
            totalStorage,
            Icons.audiotrack,
            Colors.orange,
          ),
        if (breakdown.documents > 0)
          _buildStorageDetailItem(
            'Documents',
            breakdown.documents,
            totalStorage,
            Icons.description,
            Colors.green,
          ),
        if (breakdown.spreadsheets > 0)
          _buildStorageDetailItem(
            'Spreadsheets',
            breakdown.spreadsheets,
            totalStorage,
            Icons.table_chart,
            Colors.teal,
          ),
        if (breakdown.pdfs > 0)
          _buildStorageDetailItem(
            'PDFs',
            breakdown.pdfs,
            totalStorage,
            Icons.picture_as_pdf,
            Colors.red,
          ),
      ],
    );
  }

  Widget _buildStorageDetailItem(
    String type,
    int fileCount,
    int totalStorage,
    IconData icon,
    Color color,
  ) {
    // Calculate percentage based on file count (approximation)
    // Handle division by zero when there are no files
    final percentage = totalStorage > 0 && _stats!.totalFiles > 0
        ? fileCount / _stats!.totalFiles
        : 0.0;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  type,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                Text(
                  '$fileCount ${fileCount == 1 ? 'file' : 'files'}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          SizedBox(
            width: 80,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${(percentage * 100).toStringAsFixed(1)}%',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 4),
                LinearProgressIndicator(
                  value: percentage,
                  backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                  color: color,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class FolderItem {
  final String name;
  final int itemCount;
  final DateTime lastModified;
  final bool isShared;
  final bool isStarred;
  final String? folderId; // API folder ID
  final String? workspaceId; // API workspace ID

  FolderItem({
    required this.name,
    required this.itemCount,
    required this.lastModified,
    required this.isShared,
    this.isStarred = false,
    this.folderId,
    this.workspaceId,
  });
}