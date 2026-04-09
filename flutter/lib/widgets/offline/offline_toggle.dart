import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/offline/offline_file_metadata.dart';
import '../../services/offline_storage_service.dart';
import '../../services/offline_sync_service.dart';

/// Toggle widget for making a file available offline
class OfflineToggle extends StatefulWidget {
  final String workspaceId;
  final String fileId;
  final String fileName;
  final String mimeType;
  final int size;
  final int version;
  final String? fileUrl;
  final bool showLabel;
  final ValueChanged<bool>? onStatusChange;

  const OfflineToggle({
    super.key,
    required this.workspaceId,
    required this.fileId,
    required this.fileName,
    required this.mimeType,
    required this.size,
    required this.version,
    this.fileUrl,
    this.showLabel = true,
    this.onStatusChange,
  });

  @override
  State<OfflineToggle> createState() => _OfflineToggleState();
}

class _OfflineToggleState extends State<OfflineToggle> {
  final OfflineStorageService _storageService = OfflineStorageService.instance;
  final OfflineSyncService _syncService = OfflineSyncService.instance;

  bool _isOffline = false;
  bool _isLoading = true;
  bool _needsSync = false;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _checkStatus();
  }

  Future<void> _checkStatus() async {
    try {
      final metadata = await _storageService.getFileMetadata(widget.fileId);
      if (mounted) {
        setState(() {
          _isOffline = metadata != null;
          if (metadata != null) {
            _needsSync = metadata.serverVersion > metadata.localVersion ||
                metadata.syncStatus == SyncStatus.outdated;
          }
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

  Future<void> _handleToggle() async {
    if (_isProcessing) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      if (_isOffline) {
        final success = await _syncService.removeFileOffline(widget.fileId);
        if (success && mounted) {
          setState(() {
            _isOffline = false;
          });
          widget.onStatusChange?.call(false);
          _showSnackBar('files.offline.removed'.tr());
        }
      } else {
        _syncService.initialize(widget.workspaceId);
        final success = await _syncService.markFileOffline(
          fileId: widget.fileId,
          fileName: widget.fileName,
          mimeType: widget.mimeType,
          size: widget.size,
          version: widget.version,
          fileUrl: widget.fileUrl,
        );
        if (success && mounted) {
          setState(() {
            _isOffline = true;
            _needsSync = false;
          });
          widget.onStatusChange?.call(true);
          _showSnackBar('files.offline.available'.tr(args: [widget.fileName]));
        } else if (mounted) {
          _showSnackBar('files.offline.failed'.tr(), isError: true);
        }
      }
    } catch (e) {
      if (mounted) {
        _showSnackBar('files.offline.error'.tr(), isError: true);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  Future<void> _handleSync() async {
    if (_isProcessing) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      _syncService.initialize(widget.workspaceId);
      final success = await _syncService.syncFile(widget.fileId);
      if (success && mounted) {
        setState(() {
          _needsSync = false;
        });
        _showSnackBar('files.offline.synced'.tr(args: [widget.fileName]));
      }
    } catch (e) {
      if (mounted) {
        _showSnackBar('files.offline.sync_failed'.tr(), isError: true);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          if (widget.showLabel) ...[
            const SizedBox(width: 8),
            Text(
              'files.offline.checking'.tr(),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ],
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          _isOffline ? Icons.cloud_off : Icons.cloud_outlined,
          size: 18,
          color: _isOffline
              ? Theme.of(context).colorScheme.primary
              : Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        if (widget.showLabel) ...[
          const SizedBox(width: 8),
          Text(
            'files.offline.available_offline'.tr(),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
        const SizedBox(width: 8),
        Switch(
          value: _isOffline,
          onChanged: _isProcessing ? null : (_) => _handleToggle(),
        ),
        if (_isProcessing)
          const Padding(
            padding: EdgeInsets.only(left: 8),
            child: SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        if (_isOffline && _needsSync && !_isProcessing)
          IconButton(
            icon: Icon(
              Icons.refresh,
              size: 18,
              color: Colors.amber[700],
            ),
            onPressed: _handleSync,
            tooltip: 'files.offline.sync'.tr(),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(
              minWidth: 32,
              minHeight: 32,
            ),
          ),
      ],
    );
  }
}

/// Simple button variant for context menus
class OfflineButton extends StatefulWidget {
  final String workspaceId;
  final String fileId;
  final String fileName;
  final String mimeType;
  final int size;
  final int version;
  final String? fileUrl;
  final VoidCallback? onComplete;

  const OfflineButton({
    super.key,
    required this.workspaceId,
    required this.fileId,
    required this.fileName,
    required this.mimeType,
    required this.size,
    required this.version,
    this.fileUrl,
    this.onComplete,
  });

  @override
  State<OfflineButton> createState() => _OfflineButtonState();
}

class _OfflineButtonState extends State<OfflineButton> {
  final OfflineStorageService _storageService = OfflineStorageService.instance;
  final OfflineSyncService _syncService = OfflineSyncService.instance;

  bool _isOffline = false;
  bool _isLoading = true;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _checkStatus();
  }

  Future<void> _checkStatus() async {
    try {
      final metadata = await _storageService.getFileMetadata(widget.fileId);
      if (mounted) {
        setState(() {
          _isOffline = metadata != null;
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

  Future<void> _handleClick() async {
    if (_isProcessing) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      if (_isOffline) {
        final success = await _syncService.removeFileOffline(widget.fileId);
        if (success && mounted) {
          setState(() {
            _isOffline = false;
          });
        }
      } else {
        _syncService.initialize(widget.workspaceId);
        final success = await _syncService.markFileOffline(
          fileId: widget.fileId,
          fileName: widget.fileName,
          mimeType: widget.mimeType,
          size: widget.size,
          version: widget.version,
          fileUrl: widget.fileUrl,
        );
        if (success && mounted) {
          setState(() {
            _isOffline = true;
          });
        }
      }
      widget.onComplete?.call();
    } catch (e) {
      // Handle error
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isPending = _isProcessing || _isLoading;

    return ListTile(
      leading: isPending
          ? const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(
              _isOffline ? Icons.cloud_off : Icons.cloud_download_outlined,
              color: Theme.of(context).colorScheme.onSurface,
            ),
      title: Text(
        _isOffline
            ? 'files.offline.remove_offline'.tr()
            : 'files.offline.make_available'.tr(),
      ),
      onTap: isPending ? null : _handleClick,
    );
  }
}
