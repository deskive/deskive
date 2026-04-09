import 'package:flutter/material.dart';
import '../../models/file/file_comment.dart';

/// Widget for displaying a single file comment
class FileCommentItem extends StatelessWidget {
  /// The comment to display
  final FileComment comment;

  /// Current user ID (to determine if user owns this comment)
  final String currentUserId;

  /// Whether this is a reply (nested comment)
  final bool isReply;

  /// Called when user wants to reply to this comment
  final VoidCallback? onReply;

  /// Called when user wants to edit this comment
  final VoidCallback? onEdit;

  /// Called when user wants to delete this comment
  final VoidCallback? onDelete;

  /// Called when user wants to resolve/reopen this comment
  final VoidCallback? onResolve;

  /// Nested replies to display
  final List<FileComment>? replies;

  /// Called when tapping on a reply's reply button
  final void Function(FileComment)? onReplyToReply;

  /// Called when editing a reply
  final void Function(FileComment)? onEditReply;

  /// Called when deleting a reply
  final void Function(FileComment)? onDeleteReply;

  /// Called when resolving a reply
  final void Function(FileComment)? onResolveReply;

  const FileCommentItem({
    super.key,
    required this.comment,
    required this.currentUserId,
    this.isReply = false,
    this.onReply,
    this.onEdit,
    this.onDelete,
    this.onResolve,
    this.replies,
    this.onReplyToReply,
    this.onEditReply,
    this.onDeleteReply,
    this.onResolveReply,
  });

  /// Get initials from name
  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[parts.length - 1][0]}'.toUpperCase();
  }

  /// Format relative time
  String _formatRelativeTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      final mins = difference.inMinutes;
      return '$mins ${mins == 1 ? 'minute' : 'minutes'} ago';
    } else if (difference.inHours < 24) {
      final hours = difference.inHours;
      return '$hours ${hours == 1 ? 'hour' : 'hours'} ago';
    } else if (difference.inDays < 7) {
      final days = difference.inDays;
      return '$days ${days == 1 ? 'day' : 'days'} ago';
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return '$weeks ${weeks == 1 ? 'week' : 'weeks'} ago';
    } else if (difference.inDays < 365) {
      final months = (difference.inDays / 30).floor();
      return '$months ${months == 1 ? 'month' : 'months'} ago';
    } else {
      final years = (difference.inDays / 365).floor();
      return '$years ${years == 1 ? 'year' : 'years'} ago';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isOwner = comment.userId == currentUserId;
    final authorName = comment.author?.name ?? 'Unknown User';
    final initials = _getInitials(authorName);
    final timeAgo = _formatRelativeTime(comment.createdAt);

    return Container(
      margin: EdgeInsets.only(
        left: isReply ? 40 : 0,
        bottom: 12,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar
              _buildAvatar(theme, initials),
              const SizedBox(width: 12),
              // Comment content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header row
                    _buildHeader(theme, authorName, timeAgo, isOwner),
                    const SizedBox(height: 4),
                    // Comment text
                    _buildContent(theme),
                    const SizedBox(height: 8),
                    // Action buttons
                    _buildActions(theme),
                  ],
                ),
              ),
            ],
          ),
          // Replies
          if (replies != null && replies!.isNotEmpty) ...[
            const SizedBox(height: 8),
            ...replies!.map((reply) => FileCommentItem(
              comment: reply,
              currentUserId: currentUserId,
              isReply: true,
              onReply: onReplyToReply != null ? () => onReplyToReply!(reply) : null,
              onEdit: onEditReply != null && reply.userId == currentUserId
                  ? () => onEditReply!(reply)
                  : null,
              onDelete: onDeleteReply != null && reply.userId == currentUserId
                  ? () => onDeleteReply!(reply)
                  : null,
              onResolve: onResolveReply != null ? () => onResolveReply!(reply) : null,
            )),
          ],
        ],
      ),
    );
  }

  Widget _buildAvatar(ThemeData theme, String initials) {
    if (comment.author?.avatarUrl != null) {
      return CircleAvatar(
        radius: isReply ? 14 : 18,
        backgroundImage: NetworkImage(comment.author!.avatarUrl!),
        onBackgroundImageError: (_, __) {},
        child: Text(
          initials,
          style: TextStyle(
            fontSize: isReply ? 10 : 12,
            fontWeight: FontWeight.w600,
            color: theme.colorScheme.onPrimary,
          ),
        ),
      );
    }

    return CircleAvatar(
      radius: isReply ? 14 : 18,
      backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.2),
      child: Text(
        initials,
        style: TextStyle(
          fontSize: isReply ? 10 : 12,
          fontWeight: FontWeight.w600,
          color: theme.colorScheme.primary,
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme, String authorName, String timeAgo, bool isOwner) {
    return Row(
      children: [
        // Author name
        Flexible(
          child: Text(
            authorName,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
        const SizedBox(width: 8),
        // Timestamp
        Text(
          timeAgo,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
          ),
        ),
        // Edited indicator
        if (comment.isEdited) ...[
          const SizedBox(width: 4),
          Text(
            '(edited)',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
        // Resolved badge
        if (comment.isResolved) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.check_circle,
                  size: 12,
                  color: Colors.green.shade700,
                ),
                const SizedBox(width: 4),
                Text(
                  'Resolved',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: Colors.green.shade700,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildContent(ThemeData theme) {
    return Text(
      comment.content,
      style: theme.textTheme.bodyMedium?.copyWith(
        height: 1.4,
      ),
    );
  }

  Widget _buildActions(ThemeData theme) {
    final isOwner = comment.userId == currentUserId;

    return Row(
      children: [
        // Reply button
        if (onReply != null && !isReply)
          _ActionButton(
            icon: Icons.reply,
            label: 'Reply',
            onTap: onReply,
          ),
        // Resolve/Reopen button
        if (onResolve != null)
          _ActionButton(
            icon: comment.isResolved ? Icons.refresh : Icons.check_circle_outline,
            label: comment.isResolved ? 'Reopen' : 'Resolve',
            onTap: onResolve,
          ),
        // Edit button (only for owner)
        if (isOwner && onEdit != null)
          _ActionButton(
            icon: Icons.edit_outlined,
            label: 'Edit',
            onTap: onEdit,
          ),
        // Delete button (only for owner)
        if (isOwner && onDelete != null)
          _ActionButton(
            icon: Icons.delete_outline,
            label: 'Delete',
            onTap: onDelete,
            isDestructive: true,
          ),
      ],
    );
  }
}

/// A small action button for comment actions
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final bool isDestructive;

  const _ActionButton({
    required this.icon,
    required this.label,
    this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = isDestructive
        ? theme.colorScheme.error
        : theme.colorScheme.onSurface.withValues(alpha: 0.6);

    return Padding(
      padding: const EdgeInsets.only(right: 16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
