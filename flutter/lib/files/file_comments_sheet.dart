import 'dart:async';
import 'package:flutter/material.dart';
import '../models/file/file_comment.dart';
import '../api/services/file_api_service.dart';
import '../services/file_comment_socket_service.dart';
import '../config/app_config.dart';
import 'widgets/file_comments_list.dart';
import 'widgets/file_comment_input.dart';

/// Show the file comments bottom sheet
void showFileCommentsSheet(
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
      builder: (context, scrollController) => FileCommentsSheet(
        workspaceId: workspaceId,
        fileId: fileId,
        fileName: fileName,
        scrollController: scrollController,
      ),
    ),
  );
}

/// Bottom sheet widget for displaying and managing file comments
class FileCommentsSheet extends StatefulWidget {
  final String workspaceId;
  final String fileId;
  final String fileName;
  final ScrollController scrollController;

  const FileCommentsSheet({
    super.key,
    required this.workspaceId,
    required this.fileId,
    required this.fileName,
    required this.scrollController,
  });

  @override
  State<FileCommentsSheet> createState() => _FileCommentsSheetState();
}

class _FileCommentsSheetState extends State<FileCommentsSheet> {
  final FileApiService _apiService = FileApiService();
  final FileCommentSocketService _socketService = FileCommentSocketService.instance;

  List<FileComment> _comments = [];
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _currentUserId;

  // For replying/editing
  FileComment? _replyingTo;
  FileComment? _editingComment;

  // Stream subscriptions
  StreamSubscription<FileComment>? _createdSubscription;
  StreamSubscription<FileComment>? _updatedSubscription;
  StreamSubscription<String>? _deletedSubscription;
  StreamSubscription<Map<String, dynamic>>? _resolvedSubscription;

  @override
  void initState() {
    super.initState();
    _initializeAndFetch();
  }

  Future<void> _initializeAndFetch() async {
    // Get current user ID
    _currentUserId = await AppConfig.getCurrentUserId();

    // Initialize socket service and join room
    try {
      final userId = _currentUserId ?? '';
      await _socketService.initialize(
        workspaceId: widget.workspaceId,
        userId: userId,
      );
      await _socketService.joinFileCommentRoom(widget.fileId);
    } catch (e) {
      debugPrint('Failed to initialize socket service: $e');
    }

    // Set up stream subscriptions
    _setupStreamSubscriptions();

    // Fetch comments
    await _fetchComments();
  }

  void _setupStreamSubscriptions() {
    // Listen for new comments
    _createdSubscription = _socketService.commentCreatedStream.listen((comment) {
      if (mounted && comment.fileId == widget.fileId) {
        setState(() {
          // Check if comment already exists (avoid duplicates)
          final existingIndex = _comments.indexWhere((c) => c.id == comment.id);
          if (existingIndex == -1) {
            _comments.insert(0, comment);
          }
        });
      }
    });

    // Listen for updated comments
    _updatedSubscription = _socketService.commentUpdatedStream.listen((comment) {
      if (mounted && comment.fileId == widget.fileId) {
        setState(() {
          final index = _comments.indexWhere((c) => c.id == comment.id);
          if (index != -1) {
            _comments[index] = comment;
          }
        });
      }
    });

    // Listen for deleted comments
    _deletedSubscription = _socketService.commentDeletedStream.listen((commentId) {
      if (mounted) {
        setState(() {
          _comments.removeWhere((c) => c.id == commentId);
        });
      }
    });

    // Listen for resolved comments
    _resolvedSubscription = _socketService.commentResolvedStream.listen((data) {
      if (mounted) {
        final commentId = data['commentId'];
        final isResolved = data['isResolved'] ?? false;
        setState(() {
          final index = _comments.indexWhere((c) => c.id == commentId);
          if (index != -1) {
            _comments[index] = _comments[index].copyWith(isResolved: isResolved);
          }
        });
      }
    });
  }

  @override
  void dispose() {
    // Cancel subscriptions
    _createdSubscription?.cancel();
    _updatedSubscription?.cancel();
    _deletedSubscription?.cancel();
    _resolvedSubscription?.cancel();

    // Leave the room
    _socketService.leaveFileCommentRoom(widget.fileId);

    super.dispose();
  }

  Future<void> _fetchComments() async {
    setState(() => _isLoading = true);

    try {
      final response = await _apiService.getFileComments(
        widget.workspaceId,
        widget.fileId,
      );

      if (mounted) {
        setState(() {
          _comments = response.data ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Failed to fetch comments: $e');
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load comments: $e')),
        );
      }
    }
  }

  Future<void> _submitComment(String content) async {
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);

    try {
      if (_editingComment != null) {
        // Update existing comment
        final response = await _apiService.updateFileComment(
          widget.workspaceId,
          widget.fileId,
          _editingComment!.id,
          UpdateFileCommentDto(content: content),
        );

        if (response.isSuccess && response.data != null) {
          setState(() {
            final index = _comments.indexWhere((c) => c.id == _editingComment!.id);
            if (index != -1) {
              _comments[index] = response.data!;
            }
            _editingComment = null;
          });
        }
      } else {
        // Create new comment
        final dto = CreateFileCommentDto(
          content: content,
          parentId: _replyingTo?.id,
        );

        final response = await _apiService.createFileComment(
          widget.workspaceId,
          widget.fileId,
          dto,
        );

        if (response.isSuccess && response.data != null) {
          setState(() {
            _comments.insert(0, response.data!);
            _replyingTo = null;
          });
        }
      }
    } catch (e) {
      debugPrint('Failed to submit comment: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to submit comment: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _deleteComment(FileComment comment) async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Comment'),
        content: const Text('Are you sure you want to delete this comment?'),
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
      final response = await _apiService.deleteFileComment(
        widget.workspaceId,
        widget.fileId,
        comment.id,
      );

      if (response.isSuccess) {
        setState(() {
          _comments.removeWhere((c) => c.id == comment.id);
        });
      }
    } catch (e) {
      debugPrint('Failed to delete comment: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete comment: $e')),
        );
      }
    }
  }

  Future<void> _resolveComment(FileComment comment) async {
    try {
      final response = await _apiService.resolveFileComment(
        widget.workspaceId,
        widget.fileId,
        comment.id,
        !comment.isResolved,
      );

      if (response.isSuccess && response.data != null) {
        setState(() {
          final index = _comments.indexWhere((c) => c.id == comment.id);
          if (index != -1) {
            _comments[index] = response.data!;
          }
        });
      }
    } catch (e) {
      debugPrint('Failed to resolve comment: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update comment: $e')),
        );
      }
    }
  }

  void _handleReply(FileComment comment) {
    setState(() {
      _replyingTo = comment;
      _editingComment = null;
    });
  }

  void _handleEdit(FileComment comment) {
    setState(() {
      _editingComment = comment;
      _replyingTo = null;
    });
  }

  void _cancelReplyOrEdit() {
    setState(() {
      _replyingTo = null;
      _editingComment = null;
    });
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

          // Comments list
          Expanded(
            child: FileCommentsList(
              comments: _comments,
              currentUserId: _currentUserId ?? '',
              isLoading: _isLoading,
              scrollController: widget.scrollController,
              onRefresh: _fetchComments,
              onReply: _handleReply,
              onEdit: _handleEdit,
              onDelete: _deleteComment,
              onResolve: _resolveComment,
            ),
          ),

          // Input field
          FileCommentInput(
            onSubmit: _submitComment,
            replyTo: _replyingTo,
            editingComment: _editingComment,
            onCancel: _cancelReplyOrEdit,
            isSubmitting: _isSubmitting,
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
            Icons.comment_outlined,
            color: theme.colorScheme.primary,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Comments',
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
          // Comment count badge
          if (!_isLoading && _comments.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${_comments.length}',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          const SizedBox(width: 8),
          // Close button
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
}
