import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/offline/offline_file_metadata.dart';
import '../../services/offline_storage_service.dart';

/// Badge showing the offline status of a file
class OfflineStatusBadge extends StatefulWidget {
  final String fileId;
  final double size;
  final bool showTooltip;

  const OfflineStatusBadge({
    super.key,
    required this.fileId,
    this.size = 16,
    this.showTooltip = true,
  });

  @override
  State<OfflineStatusBadge> createState() => _OfflineStatusBadgeState();
}

class _OfflineStatusBadgeState extends State<OfflineStatusBadge> {
  final OfflineStorageService _storageService = OfflineStorageService.instance;

  OfflineFileMetadata? _metadata;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkStatus();
  }

  @override
  void didUpdateWidget(OfflineStatusBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.fileId != widget.fileId) {
      _checkStatus();
    }
  }

  Future<void> _checkStatus() async {
    try {
      final metadata = await _storageService.getFileMetadata(widget.fileId);
      if (mounted) {
        setState(() {
          _metadata = metadata;
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

  @override
  Widget build(BuildContext context) {
    if (_isLoading || _metadata == null) {
      return const SizedBox.shrink();
    }

    final (icon, color, tooltip) = _getStatusInfo(context);

    final badge = Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Icon(
        icon,
        size: widget.size,
        color: color,
      ),
    );

    if (widget.showTooltip) {
      return Tooltip(
        message: tooltip,
        child: badge,
      );
    }

    return badge;
  }

  (IconData, Color, String) _getStatusInfo(BuildContext context) {
    final metadata = _metadata!;

    switch (metadata.syncStatus) {
      case SyncStatus.pending:
        return (
          Icons.cloud_queue,
          Colors.blue,
          'files.offline.status.pending'.tr(),
        );
      case SyncStatus.syncing:
        return (
          Icons.cloud_sync,
          Colors.blue,
          'files.offline.status.syncing'.tr(),
        );
      case SyncStatus.synced:
        return (
          Icons.cloud_done,
          Colors.green,
          'files.offline.status.synced'.tr(),
        );
      case SyncStatus.error:
        return (
          Icons.cloud_off,
          Colors.red,
          'files.offline.status.error'.tr(),
        );
      case SyncStatus.outdated:
        return (
          Icons.cloud_sync,
          Colors.orange,
          'files.offline.status.outdated'.tr(),
        );
    }
  }
}

/// Small indicator icon for file list items
class OfflineIndicator extends StatefulWidget {
  final String fileId;
  final double size;

  const OfflineIndicator({
    super.key,
    required this.fileId,
    this.size = 14,
  });

  @override
  State<OfflineIndicator> createState() => _OfflineIndicatorState();
}

class _OfflineIndicatorState extends State<OfflineIndicator> {
  final OfflineStorageService _storageService = OfflineStorageService.instance;
  bool _isOffline = false;
  SyncStatus? _status;

  @override
  void initState() {
    super.initState();
    _checkStatus();
  }

  @override
  void didUpdateWidget(OfflineIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.fileId != widget.fileId) {
      _checkStatus();
    }
  }

  Future<void> _checkStatus() async {
    try {
      final metadata = await _storageService.getFileMetadata(widget.fileId);
      if (mounted) {
        setState(() {
          _isOffline = metadata != null;
          _status = metadata?.syncStatus;
        });
      }
    } catch (e) {
      // Ignore errors
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_isOffline) {
      return const SizedBox.shrink();
    }

    Color color;
    switch (_status) {
      case SyncStatus.synced:
        color = Colors.green;
        break;
      case SyncStatus.outdated:
      case SyncStatus.pending:
      case SyncStatus.syncing:
        color = Colors.orange;
        break;
      case SyncStatus.error:
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }

    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Icon(
        Icons.cloud_done_outlined,
        size: widget.size,
        color: color,
      ),
    );
  }
}

/// Sync progress indicator for the header/app bar
class SyncProgressIndicator extends StatelessWidget {
  final int total;
  final int completed;
  final String? currentFileName;
  final bool isError;

  const SyncProgressIndicator({
    super.key,
    required this.total,
    required this.completed,
    this.currentFileName,
    this.isError = false,
  });

  @override
  Widget build(BuildContext context) {
    if (total == 0) {
      return const SizedBox.shrink();
    }

    final progress = total > 0 ? completed / total : 0.0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isError
            ? Colors.red.withValues(alpha: 0.1)
            : Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!isError) ...[
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                value: progress,
                strokeWidth: 2,
                backgroundColor: Colors.grey.withValues(alpha: 0.3),
              ),
            ),
            const SizedBox(width: 8),
          ],
          if (isError)
            const Icon(
              Icons.error_outline,
              size: 16,
              color: Colors.red,
            ),
          const SizedBox(width: 4),
          Text(
            isError
                ? 'files.offline.sync_error'.tr()
                : 'files.offline.syncing_progress'.tr(
                    args: ['$completed', '$total'],
                  ),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: isError
                      ? Colors.red
                      : Theme.of(context).colorScheme.onPrimaryContainer,
                ),
          ),
        ],
      ),
    );
  }
}
