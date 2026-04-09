import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../api/services/file_api_service.dart';
import 'package:intl/intl.dart';

/// Show the share link bottom sheet
void showShareLinkSheet(
  BuildContext context, {
  required String workspaceId,
  required String fileId,
  required String fileName,
}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => ShareLinkSheet(
        workspaceId: workspaceId,
        fileId: fileId,
        fileName: fileName,
        scrollController: scrollController,
      ),
    ),
  );
}

/// Bottom sheet widget for managing share links
class ShareLinkSheet extends StatefulWidget {
  final String workspaceId;
  final String fileId;
  final String fileName;
  final ScrollController scrollController;

  const ShareLinkSheet({
    super.key,
    required this.workspaceId,
    required this.fileId,
    required this.fileName,
    required this.scrollController,
  });

  @override
  State<ShareLinkSheet> createState() => _ShareLinkSheetState();
}

class _ShareLinkSheetState extends State<ShareLinkSheet> {
  final FileApiService _apiService = FileApiService();

  List<ShareLink> _shareLinks = [];
  bool _isLoading = true;
  bool _isCreating = false;
  String? _copiedId;

  // Create link form state
  String _accessLevel = 'view';
  bool _usePassword = false;
  String _password = '';
  bool _useExpiration = false;
  DateTime? _expiresAt;
  bool _useDownloadLimit = false;
  int _maxDownloads = 10;

  final _passwordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchShareLinks();
  }

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _fetchShareLinks() async {
    setState(() => _isLoading = true);

    try {
      final response = await _apiService.getFileShareLinks(
        widget.workspaceId,
        widget.fileId,
      );

      if (mounted && response.isSuccess) {
        setState(() {
          _shareLinks = response.data ?? [];
          _isLoading = false;
        });
      } else {
        if (mounted) {
          setState(() => _isLoading = false);
        }
      }
    } catch (e) {
      debugPrint('Failed to fetch share links: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _createShareLink() async {
    if (_isCreating) return;
    if (_usePassword && _password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a password')),
      );
      return;
    }

    setState(() => _isCreating = true);

    try {
      final dto = CreateShareLinkDto(
        accessLevel: _accessLevel,
        password: _usePassword ? _password : null,
        expiresAt: _useExpiration ? _expiresAt : null,
        maxDownloads: _useDownloadLimit ? _maxDownloads : null,
      );

      final response = await _apiService.createShareLink(
        widget.workspaceId,
        widget.fileId,
        dto,
      );

      if (mounted && response.isSuccess && response.data != null) {
        final newLink = response.data!;
        setState(() {
          _shareLinks.insert(0, newLink);
          _copiedId = newLink.id;
        });

        // Copy to clipboard
        await Clipboard.setData(ClipboardData(text: newLink.shareUrl));

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Link created and copied to clipboard!')),
          );
        }

        // Reset form
        _resetForm();

        // Clear copied indicator after delay
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            setState(() => _copiedId = null);
          }
        });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to create link: ${response.message}')),
          );
        }
      }
    } catch (e) {
      debugPrint('Failed to create share link: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create link: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isCreating = false);
      }
    }
  }

  void _resetForm() {
    setState(() {
      _accessLevel = 'view';
      _usePassword = false;
      _password = '';
      _passwordController.clear();
      _useExpiration = false;
      _expiresAt = null;
      _useDownloadLimit = false;
      _maxDownloads = 10;
    });
  }

  Future<void> _copyLink(ShareLink link) async {
    await Clipboard.setData(ClipboardData(text: link.shareUrl));
    setState(() => _copiedId = link.id);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Link copied to clipboard!')),
      );
    }

    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() => _copiedId = null);
      }
    });
  }

  Future<void> _deleteLink(ShareLink link) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Share Link'),
        content: const Text(
          'Users with this link will no longer be able to access the file. This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final response = await _apiService.deleteShareLink(
        widget.workspaceId,
        link.id,
      );

      if (mounted && response.isSuccess) {
        setState(() {
          _shareLinks.removeWhere((l) => l.id == link.id);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Share link deleted')),
        );
      }
    } catch (e) {
      debugPrint('Failed to delete share link: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete link: $e')),
        );
      }
    }
  }

  Future<void> _selectExpirationDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _expiresAt ?? now.add(const Duration(days: 7)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );

    if (picked != null && mounted) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(_expiresAt ?? now),
      );

      if (time != null && mounted) {
        setState(() {
          _expiresAt = DateTime(
            picked.year,
            picked.month,
            picked.day,
            time.hour,
            time.minute,
          );
        });
      } else {
        setState(() {
          _expiresAt = DateTime(
            picked.year,
            picked.month,
            picked.day,
            23,
            59,
          );
        });
      }
    }
  }

  IconData _getAccessLevelIcon(String level) {
    switch (level) {
      case 'view':
        return Icons.visibility_outlined;
      case 'download':
        return Icons.download_outlined;
      case 'edit':
        return Icons.edit_outlined;
      default:
        return Icons.visibility_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          _buildHeader(theme),

          // Divider
          Divider(
            height: 1,
            color: theme.colorScheme.outline.withValues(alpha: 0.2),
          ),

          // Content
          Expanded(
            child: SingleChildScrollView(
              controller: widget.scrollController,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Create link section
                  _buildCreateLinkSection(theme),

                  const SizedBox(height: 24),

                  // Existing links
                  if (_shareLinks.isNotEmpty) ...[
                    Text(
                      'Active Links (${_shareLinks.length})',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ..._shareLinks.map((link) => _buildLinkItem(theme, link)),
                  ] else if (!_isLoading) ...[
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          children: [
                            Icon(
                              Icons.link_off,
                              size: 48,
                              color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No active share links',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],

                  if (_isLoading)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Icon(
            Icons.link,
            color: theme.colorScheme.primary,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Get Link',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  widget.fileName,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: Icon(
              Icons.close,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCreateLinkSection(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Access level
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Access Level',
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
              DropdownButton<String>(
                value: _accessLevel,
                underline: const SizedBox(),
                items: const [
                  DropdownMenuItem(
                    value: 'view',
                    child: Row(
                      children: [
                        Icon(Icons.visibility_outlined, size: 18),
                        SizedBox(width: 8),
                        Text('View only'),
                      ],
                    ),
                  ),
                  DropdownMenuItem(
                    value: 'download',
                    child: Row(
                      children: [
                        Icon(Icons.download_outlined, size: 18),
                        SizedBox(width: 8),
                        Text('Download'),
                      ],
                    ),
                  ),
                  DropdownMenuItem(
                    value: 'edit',
                    child: Row(
                      children: [
                        Icon(Icons.edit_outlined, size: 18),
                        SizedBox(width: 8),
                        Text('Edit'),
                      ],
                    ),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _accessLevel = value);
                  }
                },
              ),
            ],
          ),

          const Divider(height: 24),

          // Password toggle
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.lock_outline, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'Password',
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
              Switch(
                value: _usePassword,
                onChanged: (value) {
                  setState(() => _usePassword = value);
                },
              ),
            ],
          ),
          if (_usePassword) ...[
            const SizedBox(height: 8),
            TextField(
              controller: _passwordController,
              obscureText: true,
              decoration: InputDecoration(
                hintText: 'Enter password',
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              onChanged: (value) => _password = value,
            ),
          ],

          const SizedBox(height: 12),

          // Expiration toggle
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.schedule_outlined, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'Expiration',
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
              Switch(
                value: _useExpiration,
                onChanged: (value) {
                  setState(() {
                    _useExpiration = value;
                    if (value && _expiresAt == null) {
                      _expiresAt = DateTime.now().add(const Duration(days: 7));
                    }
                  });
                },
              ),
            ],
          ),
          if (_useExpiration) ...[
            const SizedBox(height: 8),
            InkWell(
              onTap: _selectExpirationDate,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: theme.colorScheme.outline.withValues(alpha: 0.5),
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _expiresAt != null
                          ? DateFormat('MMM d, yyyy HH:mm').format(_expiresAt!)
                          : 'Select date',
                      style: theme.textTheme.bodyMedium,
                    ),
                    const Icon(Icons.calendar_today, size: 18),
                  ],
                ),
              ),
            ),
          ],

          const SizedBox(height: 12),

          // Download limit toggle
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.tag, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'Download limit',
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
              Switch(
                value: _useDownloadLimit,
                onChanged: (value) {
                  setState(() => _useDownloadLimit = value);
                },
              ),
            ],
          ),
          if (_useDownloadLimit) ...[
            const SizedBox(height: 8),
            TextField(
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                hintText: 'Max downloads',
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              controller: TextEditingController(text: _maxDownloads.toString()),
              onChanged: (value) {
                final parsed = int.tryParse(value);
                if (parsed != null && parsed > 0) {
                  _maxDownloads = parsed;
                }
              },
            ),
          ],

          const SizedBox(height: 16),

          // Create button
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _isCreating ? null : _createShareLink,
              icon: _isCreating
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.link),
              label: Text(_isCreating ? 'Creating...' : 'Create & Copy Link'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLinkItem(ThemeData theme, ShareLink link) {
    final isCopied = _copiedId == link.id;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: theme.colorScheme.outline.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          // Access level badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _getAccessLevelIcon(link.accessLevel),
                  size: 14,
                  color: theme.colorScheme.onPrimaryContainer,
                ),
                const SizedBox(width: 4),
                Text(
                  link.accessLevelLabel,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onPrimaryContainer,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(width: 8),

          // Password indicator
          if (link.hasPassword)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Icon(
                Icons.lock,
                size: 14,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),

          // View count
          Text(
            '${link.viewCount} views',
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),

          const Spacer(),

          // Copy button
          IconButton(
            onPressed: () => _copyLink(link),
            icon: Icon(
              isCopied ? Icons.check : Icons.copy,
              size: 18,
              color: isCopied ? Colors.green : null,
            ),
            tooltip: 'Copy link',
          ),

          // Delete button
          IconButton(
            onPressed: () => _deleteLink(link),
            icon: Icon(
              Icons.delete_outline,
              size: 18,
              color: theme.colorScheme.error,
            ),
            tooltip: 'Delete link',
          ),
        ],
      ),
    );
  }
}
