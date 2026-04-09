import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/file/file.dart' as file_model;
import '../../services/offline_storage_service.dart';
import '../../services/offline_sync_service.dart';

/// Reusable PopupMenuItem for offline file actions
/// Usage: Add to any PopupMenuButton itemBuilder list
class OfflineMenuItem extends StatefulWidget {
  final file_model.File file;
  final VoidCallback? onComplete;

  const OfflineMenuItem({
    super.key,
    required this.file,
    this.onComplete,
  });

  @override
  State<OfflineMenuItem> createState() => _OfflineMenuItemState();
}

class _OfflineMenuItemState extends State<OfflineMenuItem> {
  final OfflineStorageService _storageService = OfflineStorageService.instance;
  bool _isOffline = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkStatus();
  }

  Future<void> _checkStatus() async {
    final metadata = await _storageService.getFileMetadata(widget.file.id);
    if (mounted) {
      setState(() {
        _isOffline = metadata != null;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const PopupMenuItem(
        enabled: false,
        child: Row(
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 12),
            Text('Loading...'),
          ],
        ),
      );
    }

    return PopupMenuItem(
      value: 'offline_toggle',
      child: Row(
        children: [
          Icon(
            _isOffline ? Icons.cloud_off : Icons.cloud_download_outlined,
            size: 18,
          ),
          const SizedBox(width: 12),
          Text(
            _isOffline
                ? 'files.offline.remove_offline'.tr()
                : 'files.offline.make_available'.tr(),
          ),
        ],
      ),
    );
  }
}

/// Helper function to handle offline action from PopupMenuButton onSelected
/// Call this in your onSelected handler when value is 'offline_toggle'
Future<bool> handleOfflineAction({
  required BuildContext context,
  required file_model.File file,
}) async {
  final storageService = OfflineStorageService.instance;
  final syncService = OfflineSyncService.instance;

  final metadata = await storageService.getFileMetadata(file.id);
  final isOffline = metadata != null;

  try {
    if (isOffline) {
      final success = await syncService.removeFileOffline(file.id);
      if (success && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('files.offline.removed'.tr())),
        );
      }
      return success;
    } else {
      syncService.initialize(file.workspaceId);
      final success = await syncService.markFileOffline(
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        size: file.sizeInBytes,
        version: file.version,
        fileUrl: file.url,
      );
      if (success && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('files.offline.available'.tr(args: [file.name])),
          ),
        );
      } else if (!success && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('files.offline.failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
      return success;
    }
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('files.offline.error'.tr()),
          backgroundColor: Colors.red,
        ),
      );
    }
    return false;
  }
}

/// Static helper to build the PopupMenuItem widget for offline action
/// Usage: Add `buildOfflineMenuItem(file)` to your itemBuilder list
PopupMenuItem<String> buildOfflineMenuItem({
  required file_model.File file,
  required bool isOffline,
}) {
  return PopupMenuItem(
    value: 'offline_toggle',
    child: Row(
      children: [
        Icon(
          isOffline ? Icons.cloud_off : Icons.cloud_download_outlined,
          size: 18,
        ),
        const SizedBox(width: 12),
        Text(
          isOffline
              ? 'files.offline.remove_offline'.tr()
              : 'files.offline.make_available'.tr(),
        ),
      ],
    ),
  );
}
