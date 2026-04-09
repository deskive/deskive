import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/offline/offline_file_metadata.dart';
import '../services/offline_storage_service.dart';
import '../services/offline_sync_service.dart';
import '../services/workspace_service.dart';
import '../widgets/offline/offline_status_badge.dart';

/// Screen showing all offline files for the current workspace
class OfflineFilesScreen extends StatefulWidget {
  const OfflineFilesScreen({super.key});

  @override
  State<OfflineFilesScreen> createState() => _OfflineFilesScreenState();
}

class _OfflineFilesScreenState extends State<OfflineFilesScreen> {
  final OfflineStorageService _storageService = OfflineStorageService.instance;
  final OfflineSyncService _syncService = OfflineSyncService.instance;
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  List<OfflineFileMetadata> _files = [];
  OfflineStorageStats? _stats;
  bool _isLoading = true;
  String? _workspaceId;

  @override
  void initState() {
    super.initState();
    _initialize();
    _syncService.addListener(_onSyncUpdate);
  }

  @override
  void dispose() {
    _syncService.removeListener(_onSyncUpdate);
    super.dispose();
  }

  void _onSyncUpdate() {
    _loadData();
  }

  Future<void> _initialize() async {
    final workspace = _workspaceService.currentWorkspace;
    if (workspace != null) {
      _workspaceId = workspace.id;
      _syncService.initialize(workspace.id);
      await _loadData();
    } else {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadData() async {
    if (_workspaceId == null) return;

    try {
      final files = await _storageService.getOfflineFiles(_workspaceId!);
      final stats = await _storageService.getStorageStats(
        workspaceId: _workspaceId,
      );

      if (mounted) {
        setState(() {
          _files = files;
          _stats = stats;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _syncAll() async {
    await _syncService.syncAllFiles();
    await _loadData();
  }

  Future<void> _syncFile(String fileId) async {
    await _syncService.syncFile(fileId);
    await _loadData();
  }

  Future<void> _removeFile(String fileId) async {
    final success = await _syncService.removeFileOffline(fileId);
    if (success) {
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('files.offline.removed'.tr())),
        );
      }
    }
  }

  Future<void> _clearAll() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('files.offline.clear_all_title'.tr()),
        content: Text('files.offline.clear_all_message'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('common.clear'.tr()),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _syncService.clearOfflineData();
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('files.offline.cleared'.tr())),
        );
      }
    }
  }

  String _formatSize(int bytes) {
    const suffixes = ['B', 'KB', 'MB', 'GB'];
    var i = 0;
    double size = bytes.toDouble();

    while (size >= 1024 && i < suffixes.length - 1) {
      size /= 1024;
      i++;
    }

    return '${size.toStringAsFixed(i == 0 ? 0 : 1)} ${suffixes[i]}';
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
    if (mimeType.startsWith('text/')) return Icons.article;
    if (mimeType.contains('zip') || mimeType.contains('archive')) {
      return Icons.folder_zip;
    }
    return Icons.insert_drive_file;
  }

  Color _getFileColor(String mimeType) {
    if (mimeType.startsWith('image/')) return Colors.pink;
    if (mimeType.startsWith('video/')) return Colors.purple;
    if (mimeType.startsWith('audio/')) return Colors.orange;
    if (mimeType == 'application/pdf') return Colors.red;
    if (mimeType.contains('word')) return Colors.blue;
    if (mimeType.contains('excel') || mimeType.contains('spreadsheet')) {
      return Colors.green;
    }
    if (mimeType.contains('powerpoint') || mimeType.contains('presentation')) {
      return Colors.deepOrange;
    }
    return Colors.grey;
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) {
      return 'common.today'.tr();
    } else if (diff.inDays == 1) {
      return 'common.yesterday'.tr();
    } else if (diff.inDays < 7) {
      return 'common.days_ago'.tr(args: ['${diff.inDays}']);
    } else {
      return DateFormat.yMMMd().format(date);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('files.offline.title'.tr()),
        actions: [
          if (_files.isNotEmpty) ...[
            IconButton(
              icon: const Icon(Icons.sync),
              onPressed: _syncService.isSyncing ? null : _syncAll,
              tooltip: 'files.offline.sync_all'.tr(),
            ),
            IconButton(
              icon: const Icon(Icons.delete_sweep),
              onPressed: _clearAll,
              tooltip: 'files.offline.clear_all'.tr(),
            ),
          ],
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Stats header
                if (_stats != null) _buildStatsHeader(),

                // Sync progress
                if (_syncService.isSyncing) _buildSyncProgress(),

                // Files list
                Expanded(
                  child: _files.isEmpty
                      ? _buildEmptyState()
                      : _buildFilesList(),
                ),
              ],
            ),
    );
  }

  Widget _buildStatsHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
      ),
      child: Row(
        children: [
          _buildStatChip(
            label: 'files.offline.total_files'.tr(
              args: ['${_stats!.totalFiles}'],
            ),
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(width: 8),
          _buildStatChip(
            label: _formatSize(_stats!.totalSize),
            color: Theme.of(context).colorScheme.secondary,
          ),
          if (_stats!.outdatedCount > 0) ...[
            const SizedBox(width: 8),
            _buildStatChip(
              label: 'files.offline.needs_sync'.tr(
                args: ['${_stats!.outdatedCount}'],
              ),
              color: Colors.orange,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatChip({required String label, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w500,
            ),
      ),
    );
  }

  Widget _buildSyncProgress() {
    final progress = _syncService.syncProgress;
    return Container(
      padding: const EdgeInsets.all(12),
      color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3),
      child: Row(
        children: [
          const SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'files.offline.syncing_progress'.tr(
                    args: ['${progress.completed}', '${progress.total}'],
                  ),
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                if (progress.currentFileName != null)
                  Text(
                    progress.currentFileName!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.cloud_off_outlined,
            size: 80,
            color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 24),
          Text(
            'files.offline.empty_title'.tr(),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 48),
            child: Text(
              'files.offline.empty_message'.tr(),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilesList() {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: _files.length,
        itemBuilder: (context, index) {
          final file = _files[index];
          return _buildFileItem(file);
        },
      ),
    );
  }

  Widget _buildFileItem(OfflineFileMetadata file) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: _getFileColor(file.mimeType).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            _getFileIcon(file.mimeType),
            color: _getFileColor(file.mimeType),
          ),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                file.fileName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            OfflineStatusBadge(fileId: file.fileId, size: 16),
          ],
        ),
        subtitle: Text(
          '${_formatSize(file.size)}${file.lastSyncedAt != null ? '  •  ${_formatDate(file.lastSyncedAt!)}' : ''}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        trailing: PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert),
          onSelected: (value) async {
            switch (value) {
              case 'sync':
                await _syncFile(file.fileId);
                break;
              case 'remove':
                await _removeFile(file.fileId);
                break;
            }
          },
          itemBuilder: (context) => [
            if (file.needsSync)
              PopupMenuItem(
                value: 'sync',
                child: Row(
                  children: [
                    Icon(Icons.sync, color: Colors.blue[600]),
                    const SizedBox(width: 12),
                    Text('files.offline.sync'.tr()),
                  ],
                ),
              ),
            PopupMenuItem(
              value: 'remove',
              child: Row(
                children: [
                  Icon(Icons.delete_outline, color: Colors.red[400]),
                  const SizedBox(width: 12),
                  Text(
                    'files.offline.remove'.tr(),
                    style: TextStyle(color: Colors.red[400]),
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
