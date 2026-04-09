import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../services/file_service.dart';
import '../api/services/file_api_service.dart';

/// Widget for managing file sharing
class FileShareWidget extends StatefulWidget {
  final FileModel file;
  final VoidCallback? onShareCreated;

  const FileShareWidget({
    super.key,
    required this.file,
    this.onShareCreated,
  });

  @override
  State<FileShareWidget> createState() => _FileShareWidgetState();
}

class _FileShareWidgetState extends State<FileShareWidget> {
  List<FileShare> _shares = [];
  bool _isLoading = false;
  bool _isCreatingShare = false;

  @override
  void initState() {
    super.initState();
    _loadShares();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Row(
          children: [
            Icon(
              Icons.share,
              size: 20,
              color: Theme.of(context).primaryColor,
            ),
            const SizedBox(width: 8),
            Text(
              'Share ${widget.file.name}',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const Spacer(),
            IconButton(
              onPressed: _showCreateShareDialog,
              icon: const Icon(Icons.add),
              tooltip: 'Create new share link',
            ),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Loading state
        if (_isLoading)
          const Center(
            child: CircularProgressIndicator(),
          )
        else if (_shares.isEmpty)
          // Empty state
          Center(
            child: Column(
              children: [
                Icon(
                  Icons.link_off,
                  size: 48,
                  color: Colors.grey.shade400,
                ),
                const SizedBox(height: 16),
                Text(
                  'No share links created',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: Colors.grey.shade600,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Create a share link to give others access to this file',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey.shade500,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _showCreateShareDialog,
                  icon: const Icon(Icons.add),
                  label: const Text('Create Share Link'),
                ),
              ],
            ),
          )
        else
          // Share links list
          Column(
            children: _shares.map((share) => _buildShareItem(share)).toList(),
          ),
      ],
    );
  }

  Widget _buildShareItem(FileShare share) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Share link header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    share.permission.toUpperCase(),
                    style: TextStyle(
                      color: Theme.of(context).primaryColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                if (share.hasPassword) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.lock, size: 12, color: Colors.orange),
                        SizedBox(width: 4),
                        Text(
                          'PASSWORD',
                          style: TextStyle(
                            color: Colors.orange,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const Spacer(),
                PopupMenuButton<String>(
                  onSelected: (value) => _handleShareAction(value, share),
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'copy',
                      child: Row(
                        children: [
                          Icon(Icons.copy, size: 16),
                          SizedBox(width: 8),
                          Text('Copy Link'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'revoke',
                      child: Row(
                        children: [
                          Icon(Icons.delete, size: 16, color: Colors.red),
                          SizedBox(width: 8),
                          Text('Revoke', style: TextStyle(color: Colors.red)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Share link URL
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _getShareUrl(share.token),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontFamily: 'monospace',
                          ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    onPressed: () => _copyLink(share),
                    icon: const Icon(Icons.copy, size: 16),
                    tooltip: 'Copy link',
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 8),
            
            // Share details
            Row(
              children: [
                if (share.expiresAt != null) ...[
                  Icon(Icons.schedule, size: 14, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text(
                    'Expires: ${_formatDate(share.expiresAt!)}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                  ),
                ] else ...[
                  Icon(Icons.all_inclusive, size: 14, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text(
                    'Never expires',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                  ),
                ],
                const Spacer(),
                Text(
                  'Created: ${_formatDate(share.createdAt)}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey.shade500,
                      ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _loadShares() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final fileService = Provider.of<FileService>(context, listen: false);
      final response = await fileService.getFileShares(widget.file.id);

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (response.success && response.data != null) {
            _shares = response.data!;
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to load shares: ${response.message}'),
                backgroundColor: Colors.red,
              ),
            );
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load shares: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showCreateShareDialog() {
    showDialog(
      context: context,
      builder: (context) => CreateShareDialog(
        file: widget.file,
        onShareCreated: (share) {
          setState(() {
            _shares.insert(0, share);
          });
          widget.onShareCreated?.call();
        },
      ),
    );
  }

  void _handleShareAction(String action, FileShare share) {
    switch (action) {
      case 'copy':
        _copyLink(share);
        break;
      case 'revoke':
        _revokeShare(share);
        break;
    }
  }

  void _copyLink(FileShare share) {
    Clipboard.setData(ClipboardData(text: _getShareUrl(share.token)));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Share link copied to clipboard'),
        backgroundColor: Colors.green,
      ),
    );
  }

  Future<void> _revokeShare(FileShare share) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Revoke Share Link'),
        content: const Text('Are you sure you want to revoke this share link? Users with this link will no longer be able to access the file.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Revoke', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final fileService = Provider.of<FileService>(context, listen: false);
      final response = await fileService.revokeFileShare(share.id);

      if (mounted) {
        if (response.success) {
          setState(() {
            _shares.removeWhere((s) => s.id == share.id);
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Share link revoked successfully'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to revoke share: ${response.message}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to revoke share: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _getShareUrl(String token) {
    // TODO: Replace with actual base URL
    return 'https://your-app.com/shared/$token';
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}

/// Dialog for creating new share links
class CreateShareDialog extends StatefulWidget {
  final FileModel file;
  final Function(FileShare) onShareCreated;

  const CreateShareDialog({
    super.key,
    required this.file,
    required this.onShareCreated,
  });

  @override
  State<CreateShareDialog> createState() => _CreateShareDialogState();
}

class _CreateShareDialogState extends State<CreateShareDialog> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  
  String _permission = 'read';
  bool _hasPassword = false;
  bool _hasExpiration = false;
  DateTime? _expirationDate;
  bool _isCreating = false;

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        padding: const EdgeInsets.all(24),
        constraints: const BoxConstraints(maxWidth: 500),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Icon(
                    Icons.share,
                    color: Theme.of(context).primaryColor,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Create Share Link',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // File info
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      _getFileIcon(widget.file.mimeType),
                      color: Theme.of(context).primaryColor,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.file.name,
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w500,
                                ),
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            '${FileService.instance.formatFileSize(widget.file.size)} • ${widget.file.mimeType}',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Colors.grey.shade600,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Permission selection
              Text(
                'Permission Level',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _permission,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                items: const [
                  DropdownMenuItem(
                    value: 'read',
                    child: Row(
                      children: [
                        Icon(Icons.visibility, size: 16),
                        SizedBox(width: 8),
                        Text('View Only'),
                      ],
                    ),
                  ),
                  DropdownMenuItem(
                    value: 'write',
                    child: Row(
                      children: [
                        Icon(Icons.edit, size: 16),
                        SizedBox(width: 8),
                        Text('Can Edit'),
                      ],
                    ),
                  ),
                ],
                onChanged: (value) {
                  setState(() {
                    _permission = value!;
                  });
                },
              ),
              
              const SizedBox(height: 16),
              
              // Password protection
              CheckboxListTile(
                title: const Text('Password Protection'),
                subtitle: const Text('Require a password to access the file'),
                value: _hasPassword,
                onChanged: (value) {
                  setState(() {
                    _hasPassword = value!;
                  });
                },
                controlAffinity: ListTileControlAffinity.leading,
              ),
              
              if (_hasPassword) ...[
                const SizedBox(height: 8),
                TextFormField(
                  controller: _passwordController,
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.lock),
                  ),
                  obscureText: true,
                  validator: (value) {
                    if (_hasPassword && (value == null || value.isEmpty)) {
                      return 'Password is required';
                    }
                    return null;
                  },
                ),
              ],
              
              const SizedBox(height: 16),
              
              // Expiration date
              CheckboxListTile(
                title: const Text('Set Expiration Date'),
                subtitle: const Text('Link will automatically expire'),
                value: _hasExpiration,
                onChanged: (value) {
                  setState(() {
                    _hasExpiration = value!;
                    if (!_hasExpiration) {
                      _expirationDate = null;
                    }
                  });
                },
                controlAffinity: ListTileControlAffinity.leading,
              ),
              
              if (_hasExpiration) ...[
                const SizedBox(height: 8),
                ListTile(
                  leading: const Icon(Icons.calendar_today),
                  title: Text(_expirationDate?.toString().split(' ')[0] ?? 'Select Date'),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: _selectExpirationDate,
                  shape: RoundedRectangleBorder(
                    side: BorderSide(color: Colors.grey.shade400),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
              
              const SizedBox(height: 24),
              
              // Actions
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isCreating ? null : _createShare,
                      child: _isCreating
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Create Link'),
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

  Future<void> _selectExpirationDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now().add(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    
    if (date != null) {
      setState(() {
        _expirationDate = date;
      });
    }
  }

  Future<void> _createShare() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_hasExpiration && _expirationDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Please select an expiration date'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isCreating = true;
    });

    try {
      // NOTE: This widget needs to be updated to work with the new sharing API
      // which requires workspaceId and userIds (sharing with specific users)
      // For now, this is disabled until the backend supports public share links

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Public share links are not yet supported. Please share with specific team members instead.'),
          backgroundColor: Colors.orange,
        ),
      );

      setState(() {
        _isCreating = false;
      });
      Navigator.of(context).pop();
      return;

      /* Old code - needs backend support for public share links
      final fileService = Provider.of<FileService>(context, listen: false);
      final response = await fileService.shareFile(
        workspaceId: 'workspace-id-needed',
        fileId: widget.file.id,
        userIds: [], // Need to collect user IDs
        permissions: {
          'read': _permission == 'read' || _permission == 'edit',
          'download': true,
          'edit': _permission == 'edit',
        },
        expiresAt: _expirationDate,
      );
      */

      if (mounted) {
        setState(() {
          _isCreating = false;
        });

        if (response.success && response.data != null) {
          widget.onShareCreated(response.data!);
          Navigator.of(context).pop();
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Share link created successfully'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to create share link: ${response.message}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isCreating = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create share link: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  IconData _getFileIcon(String mimeType) {
    if (mimeType.startsWith('image/')) return Icons.image;
    if (mimeType.startsWith('video/')) return Icons.video_file;
    if (mimeType.startsWith('audio/')) return Icons.audio_file;
    if (mimeType == 'application/pdf') return Icons.picture_as_pdf;
    if (mimeType.contains('word') || mimeType.contains('document')) return Icons.description;
    if (mimeType.contains('excel') || mimeType.contains('spreadsheet')) return Icons.table_chart;
    if (mimeType.contains('powerpoint') || mimeType.contains('presentation')) return Icons.slideshow;
    if (mimeType.startsWith('text/')) return Icons.text_fields;
    if (mimeType.contains('zip') || mimeType.contains('archive')) return Icons.archive;
    return Icons.insert_drive_file;
  }
}

/// Simple share button widget
class ShareButton extends StatelessWidget {
  final FileModel file;
  final bool compact;

  const ShareButton({
    super.key,
    required this.file,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: () => _showShareDialog(context),
      icon: const Icon(Icons.share),
      tooltip: 'Share ${file.name}',
      iconSize: compact ? 20 : 24,
    );
  }

  void _showShareDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 600, maxHeight: 500),
          child: FileShareWidget(file: file),
        ),
      ),
    );
  }
}