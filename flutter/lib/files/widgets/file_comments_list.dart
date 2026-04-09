import 'package:flutter/material.dart';
import '../../models/file/file_comment.dart';
import 'file_comment_item.dart';

/// Widget for displaying a list of file comments with threading support
class FileCommentsList extends StatelessWidget {
  /// List of comments to display
  final List<FileComment> comments;

  /// Current user ID
  final String currentUserId;

  /// Whether the list is loading
  final bool isLoading;

  /// Called when user wants to reply to a comment
  final void Function(FileComment)? onReply;

  /// Called when user wants to edit a comment
  final void Function(FileComment)? onEdit;

  /// Called when user wants to delete a comment
  final void Function(FileComment)? onDelete;

  /// Called when user wants to resolve/reopen a comment
  final void Function(FileComment)? onResolve;

  /// Called when refreshing the list
  final Future<void> Function()? onRefresh;

  /// Scroll controller
  final ScrollController? scrollController;

  const FileCommentsList({
    super.key,
    required this.comments,
    required this.currentUserId,
    this.isLoading = false,
    this.onReply,
    this.onEdit,
    this.onDelete,
    this.onResolve,
    this.onRefresh,
    this.scrollController,
  });

  /// Group comments by parent (threading)
  Map<String?, List<FileComment>> _groupCommentsByParent() {
    final Map<String?, List<FileComment>> grouped = {};

    for (final comment in comments) {
      final parentId = comment.parentId;
      grouped.putIfAbsent(parentId, () => []);
      grouped[parentId]!.add(comment);
    }

    // Sort each group by creation date
    for (final list in grouped.values) {
      list.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    }

    return grouped;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (isLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (comments.isEmpty) {
      return _buildEmptyState(theme);
    }

    final groupedComments = _groupCommentsByParent();
    final topLevelComments = groupedComments[null] ?? [];

    // Sort top-level comments by creation date (newest first)
    topLevelComments.sort((a, b) => b.createdAt.compareTo(a.createdAt));

    Widget listView = ListView.builder(
      controller: scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: topLevelComments.length,
      itemBuilder: (context, index) {
        final comment = topLevelComments[index];
        final replies = groupedComments[comment.id] ?? [];

        return FileCommentItem(
          comment: comment,
          currentUserId: currentUserId,
          replies: replies,
          onReply: onReply != null ? () => onReply!(comment) : null,
          onEdit: onEdit != null && comment.userId == currentUserId
              ? () => onEdit!(comment)
              : null,
          onDelete: onDelete != null && comment.userId == currentUserId
              ? () => onDelete!(comment)
              : null,
          onResolve: onResolve != null ? () => onResolve!(comment) : null,
          onReplyToReply: onReply,
          onEditReply: onEdit,
          onDeleteReply: onDelete,
          onResolveReply: onResolve,
        );
      },
    );

    if (onRefresh != null) {
      return RefreshIndicator(
        onRefresh: onRefresh!,
        child: listView,
      );
    }

    return listView;
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.chat_bubble_outline,
              size: 64,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 16),
            Text(
              'No comments yet',
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Be the first to add a comment',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
