import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/notification.dart';
import '../services/notification_service.dart';
import '../utils/notification_navigator.dart';

class NotificationCard extends StatelessWidget {
  final NotificationModel notification;
  final VoidCallback? onTap;
  final VoidCallback? onMarkAsRead;
  final VoidCallback? onArchive;
  final VoidCallback? onDelete;
  final bool showActions;
  final bool compact;

  const NotificationCard({
    super.key,
    required this.notification,
    this.onTap,
    this.onMarkAsRead,
    this.onArchive,
    this.onDelete,
    this.showActions = true,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isUnread = !notification.isRead;

    return Card(
      margin: EdgeInsets.symmetric(
        horizontal: compact ? 8.0 : 16.0,
        vertical: compact ? 4.0 : 8.0,
      ),
      elevation: isUnread ? 4.0 : 2.0,
      color: isUnread
          ? theme.colorScheme.surface
          : theme.colorScheme.surface.withOpacity(0.7),
      child: InkWell(
        onTap: () {
          if (isUnread) {
            onMarkAsRead?.call();
          }
          // Navigate to the notification source
          NotificationNavigator.navigateToSource(context, notification);
          onTap?.call();
        },
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: EdgeInsets.all(compact ? 12.0 : 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(context, theme, isUnread),
              if (!compact) const SizedBox(height: 8),
              _buildContent(context, theme),
              if (!compact && notification.actions.isNotEmpty) ...[
                const SizedBox(height: 12),
                _buildNotificationActions(context, theme),
              ],
              if (showActions) ...[
                const SizedBox(height: 12),
                _buildActionButtons(context, theme),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, ThemeData theme, bool isUnread) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Avatar or category icon
        CircleAvatar(
          radius: compact ? 16 : 20,
          backgroundColor: _getCategoryColor(notification.category),
          backgroundImage: notification.senderAvatar != null
              ? NetworkImage(notification.senderAvatar!)
              : null,
          child: notification.senderAvatar == null
              ? Icon(
                  _getCategoryIcon(notification.category),
                  color: Colors.white,
                  size: compact ? 16 : 20,
                )
              : null,
        ),
        const SizedBox(width: 12),
        
        // Title and metadata
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      notification.title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: isUnread ? FontWeight.bold : FontWeight.normal,
                        fontSize: compact ? 14 : 16,
                      ),
                      maxLines: compact ? 1 : 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (isUnread) ...[
                    const SizedBox(width: 8),
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: theme.primaryColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ],
              ),
              if (!compact) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    if (notification.senderName != null) ...[
                      Text(
                        notification.senderName!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const Text(' • '),
                    ],
                    Text(
                      _formatTime(notification.createdAt),
                      style: theme.textTheme.bodySmall,
                    ),
                    const Spacer(),
                    _buildPriorityIndicator(theme),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildContent(BuildContext context, ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          notification.body,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontSize: compact ? 12 : 14,
          ),
          maxLines: compact ? 2 : 4,
          overflow: TextOverflow.ellipsis,
        ),
        if (notification.imageUrl != null) ...[
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              notification.imageUrl!,
              height: compact ? 60 : 120,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  height: compact ? 60 : 120,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceVariant,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.broken_image),
                );
              },
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildNotificationActions(BuildContext context, ThemeData theme) {
    if (notification.actions.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 8,
      children: notification.actions.map((action) {
        return OutlinedButton.icon(
          onPressed: () => _handleNotificationAction(context, action),
          icon: Icon(
            _getActionIcon(action.type),
            size: 16,
          ),
          label: Text(action.label),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            minimumSize: const Size(0, 32),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildActionButtons(BuildContext context, ThemeData theme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        if (!notification.isRead)
          TextButton.icon(
            onPressed: onMarkAsRead,
            icon: const Icon(Icons.mark_email_read, size: 16),
            label: Text('notifications.mark_as_read'.tr()),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: const Size(0, 32),
            ),
          ),

        PopupMenuButton<String>(
          onSelected: (value) => _handleMenuAction(context, value),
          itemBuilder: (context) => [
            if (notification.isRead)
              PopupMenuItem(
                value: 'mark_unread',
                child: ListTile(
                  leading: const Icon(Icons.mark_email_unread, size: 20),
                  title: Text('notifications.mark_as_unread'.tr()),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            PopupMenuItem(
              value: 'archive',
              child: ListTile(
                leading: const Icon(Icons.archive, size: 20),
                title: Text('notifications.archive'.tr()),
                contentPadding: EdgeInsets.zero,
              ),
            ),
            PopupMenuItem(
              value: 'delete',
              child: ListTile(
                leading: const Icon(Icons.delete, size: 20),
                title: Text('common.delete'.tr()),
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ],
          child: const Icon(Icons.more_vert),
        ),
      ],
    );
  }

  Widget _buildPriorityIndicator(ThemeData theme) {
    if (notification.priority == NotificationPriority.low) {
      return const SizedBox.shrink();
    }

    Color color;
    IconData icon;

    switch (notification.priority) {
      case NotificationPriority.highest:
        color = Colors.red;
        icon = Icons.priority_high;
        break;
      case NotificationPriority.high:
        color = Colors.orange;
        icon = Icons.keyboard_arrow_up;
        break;
      case NotificationPriority.medium:
        color = Colors.blue;
        icon = Icons.remove;
        break;
      case NotificationPriority.low:
        color = Colors.green;
        icon = Icons.keyboard_arrow_down;
        break;
      case NotificationPriority.lowest:
        color = Colors.grey;
        icon = Icons.keyboard_double_arrow_down;
        break;
      default:
        return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 12),
          const SizedBox(width: 2),
          Text(
            notification.priority.name.toUpperCase(),
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Color _getCategoryColor(NotificationCategory category) {
    switch (category) {
      case NotificationCategory.task:
        return Colors.blue;
      case NotificationCategory.project:
        return Colors.green;
      case NotificationCategory.calendar:
        return Colors.orange;
      case NotificationCategory.chat:
        return Colors.purple;
      case NotificationCategory.file:
        return Colors.teal;
      case NotificationCategory.workspace:
        return Colors.indigo;
      case NotificationCategory.system:
        return Colors.grey;
      case NotificationCategory.reminder:
        return Colors.amber;
      case NotificationCategory.mention:
        return Colors.pink;
      default:
        return Colors.blueGrey;
    }
  }

  IconData _getCategoryIcon(NotificationCategory category) {
    switch (category) {
      case NotificationCategory.task:
        return Icons.task_alt;
      case NotificationCategory.project:
        return Icons.folder;
      case NotificationCategory.calendar:
        return Icons.event;
      case NotificationCategory.chat:
        return Icons.chat;
      case NotificationCategory.file:
        return Icons.attach_file;
      case NotificationCategory.workspace:
        return Icons.business;
      case NotificationCategory.system:
        return Icons.settings;
      case NotificationCategory.reminder:
        return Icons.alarm;
      case NotificationCategory.mention:
        return Icons.alternate_email;
      default:
        return Icons.notifications;
    }
  }

  IconData _getActionIcon(NotificationActionType type) {
    switch (type) {
      case NotificationActionType.markAsRead:
        return Icons.mark_email_read;
      case NotificationActionType.archive:
        return Icons.archive;
      case NotificationActionType.delete:
        return Icons.delete;
      case NotificationActionType.openItem:
        return Icons.open_in_new;
      case NotificationActionType.respond:
        return Icons.reply;
      case NotificationActionType.approve:
        return Icons.check;
      case NotificationActionType.reject:
        return Icons.close;
      default:
        return Icons.touch_app;
    }
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'notifications.time_now'.tr();
    } else if (difference.inHours < 1) {
      return 'search.minutes_ago'.tr(args: [difference.inMinutes.toString()]);
    } else if (difference.inDays < 1) {
      return 'search.hours_ago'.tr(args: [difference.inHours.toString()]);
    } else if (difference.inDays < 7) {
      return 'search.days_ago'.tr(args: [difference.inDays.toString()]);
    } else {
      return DateFormat('MMM dd').format(dateTime);
    }
  }

  void _handleNotificationAction(BuildContext context, NotificationAction action) {
    NotificationService.instance.executeNotificationAction(
      notification.id,
      action.id,
      action.data,
    );
  }

  void _handleMenuAction(BuildContext context, String action) {
    switch (action) {
      case 'mark_unread':
        NotificationService.instance.markAsUnread(notification.id);
        break;
      case 'archive':
        onArchive?.call();
        NotificationService.instance.archiveNotification(notification.id);
        break;
      case 'delete':
        onDelete?.call();
        NotificationService.instance.deleteNotification(notification.id);
        break;
    }
  }
}

class NotificationListTile extends StatelessWidget {
  final NotificationModel notification;
  final VoidCallback? onTap;
  final bool showActions;

  const NotificationListTile({
    super.key,
    required this.notification,
    this.onTap,
    this.showActions = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isUnread = !notification.isRead;

    return Container(
      color: isUnread 
          ? theme.colorScheme.primaryContainer.withOpacity(0.1)
          : null,
      child: ListTile(
        onTap: () {
          if (isUnread) {
            NotificationService.instance.markAsRead(notification.id);
          }
          // Navigate to the notification source
          NotificationNavigator.navigateToSource(context, notification);
          onTap?.call();
        },
        leading: CircleAvatar(
          backgroundColor: _getCategoryColor(notification.category),
          backgroundImage: notification.senderAvatar != null
              ? NetworkImage(notification.senderAvatar!)
              : null,
          child: notification.senderAvatar == null
              ? Icon(
                  _getCategoryIcon(notification.category),
                  color: Colors.white,
                  size: 20,
                )
              : null,
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                notification.title,
                style: TextStyle(
                  fontWeight: isUnread ? FontWeight.bold : FontWeight.normal,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (isUnread)
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: theme.primaryColor,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              notification.body,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                if (notification.senderName != null) ...[
                  Text(
                    notification.senderName!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const Text(' • '),
                ],
                Text(
                  _formatTime(notification.createdAt),
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ],
        ),
        trailing: showActions
            ? PopupMenuButton<String>(
                onSelected: (value) => _handleMenuAction(context, value),
                itemBuilder: (context) => [
                  if (notification.isRead)
                    PopupMenuItem(
                      value: 'mark_unread',
                      child: Text('notifications.mark_as_unread'.tr()),
                    )
                  else
                    PopupMenuItem(
                      value: 'mark_read',
                      child: Text('notifications.mark_as_read'.tr()),
                    ),
                  PopupMenuItem(
                    value: 'archive',
                    child: Text('notifications.archive'.tr()),
                  ),
                  PopupMenuItem(
                    value: 'delete',
                    child: Text('common.delete'.tr()),
                  ),
                ],
              )
            : Icon(
                Icons.chevron_right,
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
      ),
    );
  }

  Color _getCategoryColor(NotificationCategory category) {
    switch (category) {
      case NotificationCategory.task:
        return Colors.blue;
      case NotificationCategory.project:
        return Colors.green;
      case NotificationCategory.calendar:
        return Colors.orange;
      case NotificationCategory.chat:
        return Colors.purple;
      case NotificationCategory.file:
        return Colors.teal;
      case NotificationCategory.workspace:
        return Colors.indigo;
      case NotificationCategory.system:
        return Colors.grey;
      case NotificationCategory.reminder:
        return Colors.amber;
      case NotificationCategory.mention:
        return Colors.pink;
      default:
        return Colors.blueGrey;
    }
  }

  IconData _getCategoryIcon(NotificationCategory category) {
    switch (category) {
      case NotificationCategory.task:
        return Icons.task_alt;
      case NotificationCategory.project:
        return Icons.folder;
      case NotificationCategory.calendar:
        return Icons.event;
      case NotificationCategory.chat:
        return Icons.chat;
      case NotificationCategory.file:
        return Icons.attach_file;
      case NotificationCategory.workspace:
        return Icons.business;
      case NotificationCategory.system:
        return Icons.settings;
      case NotificationCategory.reminder:
        return Icons.alarm;
      case NotificationCategory.mention:
        return Icons.alternate_email;
      default:
        return Icons.notifications;
    }
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'notifications.time_now'.tr();
    } else if (difference.inHours < 1) {
      return 'search.minutes_ago'.tr(args: [difference.inMinutes.toString()]);
    } else if (difference.inDays < 1) {
      return 'search.hours_ago'.tr(args: [difference.inHours.toString()]);
    } else if (difference.inDays < 7) {
      return 'search.days_ago'.tr(args: [difference.inDays.toString()]);
    } else {
      return DateFormat('MMM dd').format(dateTime);
    }
  }

  void _handleMenuAction(BuildContext context, String action) {
    switch (action) {
      case 'mark_read':
        NotificationService.instance.markAsRead(notification.id);
        break;
      case 'mark_unread':
        NotificationService.instance.markAsUnread(notification.id);
        break;
      case 'archive':
        NotificationService.instance.archiveNotification(notification.id);
        break;
      case 'delete':
        NotificationService.instance.deleteNotification(notification.id);
        break;
    }
  }
}