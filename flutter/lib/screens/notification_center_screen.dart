import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/notification.dart';
import '../services/notification_service.dart';
import '../widgets/notification_card.dart';
import 'notification_settings_screen.dart';

class NotificationCenterScreen extends StatefulWidget {
  const NotificationCenterScreen({super.key});

  @override
  State<NotificationCenterScreen> createState() => _NotificationCenterScreenState();
}

class _NotificationCenterScreenState extends State<NotificationCenterScreen>
    with SingleTickerProviderStateMixin {
  final NotificationService _notificationService = NotificationService.instance;
  late TabController _tabController;

  List<NotificationModel> _allNotifications = [];
  List<NotificationModel> _filteredNotifications = [];
  NotificationCategory? _selectedCategory;
  NotificationStatus _selectedStatus = NotificationStatus.unread;
  bool _isLoading = true;
  bool _isSelectionMode = false;
  Set<String> _selectedNotificationIds = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);
    _initializeAndLoadNotifications();
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _initializeAndLoadNotifications() async {
    try {
      if (!_notificationService.isInitialized) {
        await _notificationService.initialize();
      }
      await _loadNotifications();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('notifications.failed_to_load'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) {
      switch (_tabController.index) {
        case 0:
          _selectedStatus = NotificationStatus.unread;
          break;
        case 1:
          _selectedStatus = NotificationStatus.read;
          break;
        case 2:
          _selectedStatus = NotificationStatus.archived;
          break;
      }
      _filterNotifications();
    }
  }

  Future<void> _loadNotifications({bool forceRefresh = false}) async {
    setState(() {
      _isLoading = true;
    });

    try {
      _allNotifications = await _notificationService.getNotifications(
        forceRefresh: forceRefresh,
      );
      _filterNotifications();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('notifications.failed_to_load'.tr(args: [e.toString()]))),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _filterNotifications() {
    _filteredNotifications = _allNotifications.where((notification) {
      // Filter by status
      bool statusMatch = false;
      switch (_selectedStatus) {
        case NotificationStatus.unread:
          statusMatch = !notification.isRead;
          break;
        case NotificationStatus.read:
          statusMatch = notification.isRead && !notification.isArchived;
          break;
        case NotificationStatus.archived:
          statusMatch = notification.isArchived;
          break;
      }

      if (!statusMatch) return false;

      // Filter by category if selected
      if (_selectedCategory != null && notification.category != _selectedCategory) {
        return false;
      }

      return true;
    }).toList();

    // Sort by creation date (newest first)
    _filteredNotifications.sort((a, b) => b.createdAt.compareTo(a.createdAt));

    setState(() {});
  }

  /// Mark a notification as read
  Future<void> _markNotificationAsRead(String notificationId) async {
    try {
      await _notificationService.markAsRead(notificationId);
      await _loadNotifications(forceRefresh: true);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notifications.marked_as_read'.tr()),
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notifications.failed_to_mark_read'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  /// Archive a notification
  Future<void> _archiveNotification(String notificationId) async {
    try {
      await _notificationService.archiveNotification(notificationId);
      await _loadNotifications(forceRefresh: true);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notifications.archived'.tr()),
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notifications.failed_to_archive'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  /// Delete a notification
  Future<void> _deleteNotification(String notificationId) async {
    try {
      await _notificationService.deleteNotification(notificationId);
      await _loadNotifications(forceRefresh: true);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notifications.deleted'.tr()),
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notifications.failed_to_delete'.tr(args: [e.toString()])),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await _notificationService.markAllAsRead();
      await _loadNotifications();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('notifications.all_marked_as_read'.tr())),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('notifications.failed_to_mark_all_read'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  /// Clear all notifications with confirmation dialog
  Future<void> _clearAllNotifications() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('notifications.clear_all_title'.tr()),
        content: Text('notifications.clear_all_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('notifications.clear_all'.tr()),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _notificationService.clearAllNotifications();
        await _loadNotifications(forceRefresh: true);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('notifications.all_cleared'.tr()),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('notifications.failed_to_clear'.tr(args: [e.toString()])),
              backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
  }

  void _toggleSelectionMode() {
    setState(() {
      _isSelectionMode = !_isSelectionMode;
      _selectedNotificationIds.clear();
    });
  }

  void _toggleNotificationSelection(String notificationId) {
    setState(() {
      if (_selectedNotificationIds.contains(notificationId)) {
        _selectedNotificationIds.remove(notificationId);
      } else {
        _selectedNotificationIds.add(notificationId);
      }
    });
  }

  Future<void> _bulkMarkAsRead() async {
    if (_selectedNotificationIds.isEmpty) return;

    try {
      await _notificationService.bulkUpdateStatus(
        _selectedNotificationIds.toList(),
        NotificationStatus.read,
      );
      await _loadNotifications();
      _toggleSelectionMode();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notifications.bulk_marked_as_read'.tr(args: [_selectedNotificationIds.length.toString()])),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('notifications.failed_to_update'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  Future<void> _bulkArchive() async {
    if (_selectedNotificationIds.isEmpty) return;

    try {
      await _notificationService.bulkUpdateStatus(
        _selectedNotificationIds.toList(),
        NotificationStatus.archived,
      );
      await _loadNotifications();
      _toggleSelectionMode();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('notifications.bulk_archived'.tr(args: [_selectedNotificationIds.length.toString()])),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('notifications.failed_to_archive_bulk'.tr(args: [e.toString()]))),
        );
      }
    }
  }

  Future<void> _bulkDelete() async {
    if (_selectedNotificationIds.isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('notifications.delete_title'.tr()),
        content: Text('notifications.delete_confirm'.tr(args: [_selectedNotificationIds.length.toString()])),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _notificationService.bulkDelete(_selectedNotificationIds.toList());
        await _loadNotifications();
        _toggleSelectionMode();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('notifications.bulk_deleted'.tr(args: [_selectedNotificationIds.length.toString()])),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('notifications.failed_to_delete_bulk'.tr(args: [e.toString()]))),
          );
        }
      }
    }
  }

  void _showCategoryFilter() {
    showModalBottomSheet<NotificationCategory?>(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text(
                  'notifications.filter_by_category'.tr(),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              Flexible(
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ListTile(
                        leading: const Icon(Icons.clear_all),
                        title: Text('notifications.all_categories'.tr()),
                        onTap: () {
                          Navigator.of(context).pop(null);
                        },
                        selected: _selectedCategory == null,
                      ),
                      ...NotificationCategory.values.map((category) {
                        return ListTile(
                          leading: Icon(_getCategoryIcon(category)),
                          title: Text(_getCategoryName(category)),
                          onTap: () {
                            Navigator.of(context).pop(category);
                          },
                          selected: _selectedCategory == category,
                        );
                      }),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    ).then((category) {
      if (category != _selectedCategory) {
        setState(() {
          _selectedCategory = category;
        });
        _filterNotifications();
      }
    });
  }

  String _getCategoryName(NotificationCategory category) {
    switch (category) {
      case NotificationCategory.task:
        return 'notifications.category_task'.tr();
      case NotificationCategory.project:
        return 'notifications.category_project'.tr();
      case NotificationCategory.calendar:
        return 'notifications.category_calendar'.tr();
      case NotificationCategory.chat:
        return 'notifications.category_chat'.tr();
      case NotificationCategory.file:
        return 'notifications.category_file'.tr();
      case NotificationCategory.workspace:
        return 'notifications.category_workspace'.tr();
      case NotificationCategory.system:
        return 'notifications.category_system'.tr();
      case NotificationCategory.reminder:
        return 'notifications.category_reminder'.tr();
      case NotificationCategory.mention:
        return 'notifications.category_mention'.tr();
      default:
        return category.name.toUpperCase();
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('notifications.title'.tr()),
        actions: [
          if (_isSelectionMode) ...[
            IconButton(
              onPressed: _selectedNotificationIds.isNotEmpty ? _bulkMarkAsRead : null,
              icon: const Icon(Icons.mark_email_read),
              tooltip: 'notifications.mark_as_read'.tr(),
            ),
            IconButton(
              onPressed: _selectedNotificationIds.isNotEmpty ? _bulkArchive : null,
              icon: const Icon(Icons.archive),
              tooltip: 'notifications.archive'.tr(),
            ),
            IconButton(
              onPressed: _selectedNotificationIds.isNotEmpty ? _bulkDelete : null,
              icon: const Icon(Icons.delete),
              tooltip: 'common.delete'.tr(),
            ),
            IconButton(
              onPressed: _toggleSelectionMode,
              icon: const Icon(Icons.close),
              tooltip: 'notifications.cancel_selection'.tr(),
            ),
          ] else ...[
            // IconButton(
            //   onPressed: _showCategoryFilter,
            //   icon: Badge(
            //     isLabelVisible: _selectedCategory != null,
            //     child: const Icon(Icons.filter_list),
            //   ),
            //   tooltip: 'Filter',
            // ),
            PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'mark_all_read':
                    _markAllAsRead();
                    break;
                  case 'clear_all':
                    _clearAllNotifications();
                    break;
                  case 'select_mode':
                    _toggleSelectionMode();
                    break;
                  case 'refresh':
                    _loadNotifications(forceRefresh: true);
                    break;
                  case 'settings':
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const NotificationSettingsScreen(),
                      ),
                    );
                    break;
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'mark_all_read',
                  child: ListTile(
                    leading: const Icon(Icons.mark_email_read),
                    title: Text('notifications.mark_all_as_read'.tr()),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                PopupMenuItem(
                  value: 'clear_all',
                  child: ListTile(
                    leading: const Icon(Icons.clear_all, color: Colors.red),
                    title: Text('notifications.clear_all'.tr(), style: const TextStyle(color: Colors.red)),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                PopupMenuItem(
                  value: 'select_mode',
                  child: ListTile(
                    leading: const Icon(Icons.checklist),
                    title: Text('notifications.select_notifications'.tr()),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                PopupMenuItem(
                  value: 'refresh',
                  child: ListTile(
                    leading: const Icon(Icons.refresh),
                    title: Text('common.refresh'.tr()),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                PopupMenuItem(
                  value: 'settings',
                  child: ListTile(
                    leading: const Icon(Icons.settings),
                    title: Text('common.settings'.tr()),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
          ],
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              child: StreamBuilder<int>(
                stream: _notificationService.unreadCountStream,
                builder: (context, snapshot) {
                  final unreadCount = snapshot.data ?? 0;
                  return Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('notifications.tab_unread'.tr()),
                      if (unreadCount > 0) ...[
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.error,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
                          child: Text(
                            unreadCount > 99 ? '99+' : unreadCount.toString(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ],
                  );
                },
              ),
            ),
            Tab(text: 'notifications.tab_read'.tr()),
            Tab(text: 'notifications.tab_archived'.tr()),
          ],
        ),
      ),
      body: Column(
        children: [
          // if (_selectedCategory != null)
          //   Container(
          //     width: double.infinity,
          //     padding: const EdgeInsets.all(12),
          //     color: Theme.of(context).colorScheme.primaryContainer,
          //     child: Row(
          //       children: [
          //         Icon(_getCategoryIcon(_selectedCategory!)),
          //         const SizedBox(width: 8),
          //         Expanded(
          //           child: Text(
          //             'Filtered by ${_selectedCategory!.name.toUpperCase()}',
          //             overflow: TextOverflow.ellipsis,
          //             maxLines: 1,
          //           ),
          //         ),
          //         const SizedBox(width: 8),
          //         TextButton(
          //           onPressed: () {
          //             setState(() {
          //               _selectedCategory = null;
          //             });
          //             _filterNotifications();
          //           },
          //           child: const Text('Clear filter'),
          //         ),
          //       ],
          //     ),
          //   ),
          if (_isSelectionMode)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              color: Theme.of(context).colorScheme.secondaryContainer,
              child: Text(
                'notifications.selected_count'.tr(args: [_selectedNotificationIds.length.toString()]),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildNotificationsList(),
                _buildNotificationsList(),
                _buildNotificationsList(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationsList() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_filteredNotifications.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_none,
              size: 64,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
            ),
            const SizedBox(height: 16),
            Text(
              _getEmptyStateMessage(),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  ),
              textAlign: TextAlign.center,
            ),
            if (_selectedStatus == NotificationStatus.unread) ...[
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => _loadNotifications(forceRefresh: true),
                child: Text('common.refresh'.tr()),
              ),
            ],
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadNotifications(forceRefresh: true),
      child: ListView.builder(
        itemCount: _filteredNotifications.length,
        itemBuilder: (context, index) {
          final notification = _filteredNotifications[index];
          final isSelected = _selectedNotificationIds.contains(notification.id);

          if (_isSelectionMode) {
            return CheckboxListTile(
              value: isSelected,
              onChanged: (selected) => _toggleNotificationSelection(notification.id),
              secondary: CircleAvatar(
                backgroundColor: _getCategoryColor(notification.category),
                child: Icon(
                  _getCategoryIcon(notification.category),
                  color: Colors.white,
                  size: 20,
                ),
              ),
              title: Text(
                notification.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text(
                notification.body,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            );
          }

          return NotificationCard(
            notification: notification,
            onTap: () async {
              // Mark as read when tapped (if unread)
              if (!notification.isRead) {
                await _markNotificationAsRead(notification.id);
              }
              // Handle notification tap - could navigate to relevant screen
            },
            onMarkAsRead: () async {
              await _markNotificationAsRead(notification.id);
            },
            onArchive: () async {
              await _archiveNotification(notification.id);
            },
            onDelete: () async {
              await _deleteNotification(notification.id);
            },
          );
        },
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

  String _getEmptyStateMessage() {
    if (_selectedCategory != null) {
      return 'notifications.no_in_category'.tr(args: [_selectedStatus.name, _selectedCategory!.name]);
    }

    switch (_selectedStatus) {
      case NotificationStatus.unread:
        return 'notifications.no_unread'.tr();
      case NotificationStatus.read:
        return 'notifications.no_read'.tr();
      case NotificationStatus.archived:
        return 'notifications.no_archived'.tr();
    }
  }
}