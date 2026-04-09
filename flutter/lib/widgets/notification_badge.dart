import 'package:flutter/material.dart';
import '../services/notification_service.dart';
import '../models/notification.dart';

class NotificationBadge extends StatefulWidget {
  final Widget child;
  final Color badgeColor;
  final Color textColor;
  final double badgeSize;
  final EdgeInsets badgePadding;
  final bool showZero;
  final VoidCallback? onTap;

  const NotificationBadge({
    super.key,
    required this.child,
    this.badgeColor = Colors.red,
    this.textColor = Colors.white,
    this.badgeSize = 16.0,
    this.badgePadding = const EdgeInsets.all(2.0),
    this.showZero = false,
    this.onTap,
  });

  @override
  State<NotificationBadge> createState() => _NotificationBadgeState();
}

class _NotificationBadgeState extends State<NotificationBadge> {
  final NotificationService _notificationService = NotificationService.instance;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<int>(
      stream: _notificationService.unreadCountStream,
      initialData: _notificationService.unreadCount,
      builder: (context, snapshot) {
        final count = snapshot.data ?? 0;
        
        if (count == 0 && !widget.showZero) {
          return GestureDetector(
            onTap: widget.onTap,
            child: widget.child,
          );
        }

        return Stack(
          clipBehavior: Clip.none,
          children: [
            GestureDetector(
              onTap: widget.onTap,
              child: widget.child,
            ),
            Positioned(
              right: -2,
              top: -2,
              child: Container(
                padding: const EdgeInsets.all(4),
                constraints: BoxConstraints(
                  minWidth: widget.badgeSize,
                  minHeight: widget.badgeSize,
                ),
                decoration: BoxDecoration(
                  color: widget.badgeColor,
                  shape: count <= 9 ? BoxShape.circle : BoxShape.rectangle,
                  borderRadius: count > 9 ? BorderRadius.circular(widget.badgeSize / 2) : null,
                  border: Border.all(color: Colors.white, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.2),
                      blurRadius: 2,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    count > 99 ? '99+' : count.toString(),
                    style: TextStyle(
                      color: widget.textColor,
                      fontSize: widget.badgeSize * 0.55,
                      fontWeight: FontWeight.bold,
                      height: 1,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class NotificationAppBarBadge extends StatelessWidget {
  final VoidCallback? onPressed;
  final Color? badgeColor;
  final IconData icon;
  final double iconSize;

  const NotificationAppBarBadge({
    super.key,
    this.onPressed,
    this.badgeColor,
    this.icon = Icons.notifications_outlined,
    this.iconSize = 24.0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return NotificationBadge(
      badgeColor: badgeColor ?? Theme.of(context).colorScheme.error,
      badgeSize: 18.0, // Slightly larger badge
      onTap: onPressed,
      child: IconButton(
        onPressed: onPressed,
        padding: const EdgeInsets.all(8.0), // Reduced padding
        constraints: const BoxConstraints(
          minWidth: 40,
          minHeight: 40,
        ),
        icon: Icon(
          icon,
          size: iconSize,
          color: isDark ? Colors.white70 : Colors.grey[700],
        ),
        tooltip: 'Notifications',
      ),
    );
  }
}

class NotificationFloatingBadge extends StatelessWidget {
  final VoidCallback? onPressed;
  final Color? backgroundColor;
  final Color? badgeColor;
  final IconData icon;

  const NotificationFloatingBadge({
    super.key,
    this.onPressed,
    this.backgroundColor,
    this.badgeColor,
    this.icon = Icons.notifications,
  });

  @override
  Widget build(BuildContext context) {
    return NotificationBadge(
      badgeColor: badgeColor ?? Theme.of(context).colorScheme.error,
      child: FloatingActionButton(
        onPressed: onPressed,
        backgroundColor: backgroundColor ?? Theme.of(context).primaryColor,
        child: Icon(icon),
      ),
    );
  }
}

class NotificationTabBadge extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final bool isSelected;
  final Color? selectedColor;
  final Color? unselectedColor;
  final Color? badgeColor;

  const NotificationTabBadge({
    super.key,
    required this.label,
    this.onTap,
    this.isSelected = false,
    this.selectedColor,
    this.unselectedColor,
    this.badgeColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveSelectedColor = selectedColor ?? theme.primaryColor;
    final effectiveUnselectedColor = unselectedColor ?? theme.unselectedWidgetColor;

    return NotificationBadge(
      badgeColor: badgeColor ?? theme.colorScheme.error,
      badgeSize: 14.0,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? effectiveSelectedColor.withOpacity(0.1) : null,
          borderRadius: BorderRadius.circular(20),
          border: isSelected
              ? Border.all(color: effectiveSelectedColor)
              : Border.all(color: Colors.transparent),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? effectiveSelectedColor : effectiveUnselectedColor,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

class NotificationListTileBadge extends StatelessWidget {
  final Widget title;
  final Widget? subtitle;
  final Widget? leading;
  final VoidCallback? onTap;
  final Color? badgeColor;

  const NotificationListTileBadge({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    this.onTap,
    this.badgeColor,
  });

  @override
  Widget build(BuildContext context) {
    return NotificationBadge(
      badgeColor: badgeColor ?? Theme.of(context).colorScheme.error,
      onTap: onTap,
      child: ListTile(
        leading: leading,
        title: title,
        subtitle: subtitle,
        onTap: onTap,
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}

class CategoryNotificationBadge extends StatefulWidget {
  final Widget child;
  final String? categoryFilter;
  final Color? badgeColor;
  final VoidCallback? onTap;

  const CategoryNotificationBadge({
    super.key,
    required this.child,
    this.categoryFilter,
    this.badgeColor,
    this.onTap,
  });

  @override
  State<CategoryNotificationBadge> createState() => _CategoryNotificationBadgeState();
}

class _CategoryNotificationBadgeState extends State<CategoryNotificationBadge> {
  final NotificationService _notificationService = NotificationService.instance;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<NotificationModel>>(
      stream: _notificationService.notificationsListStream,
      initialData: _notificationService.notifications,
      builder: (context, snapshot) {
        final notifications = snapshot.data ?? [];
        
        int count = 0;
        if (widget.categoryFilter != null) {
          // Count unread notifications for specific category
          count = notifications
              .where((n) => !n.isRead && n.category.name == widget.categoryFilter)
              .length;
        } else {
          // Count all unread notifications
          count = notifications.where((n) => !n.isRead).length;
        }

        if (count == 0) {
          return GestureDetector(
            onTap: widget.onTap,
            child: widget.child,
          );
        }

        return Stack(
          clipBehavior: Clip.none,
          children: [
            GestureDetector(
              onTap: widget.onTap,
              child: widget.child,
            ),
            Positioned(
              right: -8,
              top: -8,
              child: Container(
                padding: const EdgeInsets.all(4),
                constraints: const BoxConstraints(
                  minWidth: 18,
                  minHeight: 18,
                ),
                decoration: BoxDecoration(
                  color: widget.badgeColor ?? Theme.of(context).colorScheme.error,
                  borderRadius: BorderRadius.circular(9),
                  border: Border.all(color: Colors.white, width: 1),
                ),
                child: Center(
                  child: Text(
                    count > 99 ? '99+' : count.toString(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class PulsingNotificationBadge extends StatefulWidget {
  final Widget child;
  final Color? badgeColor;
  final Duration pulseDuration;
  final VoidCallback? onTap;

  const PulsingNotificationBadge({
    super.key,
    required this.child,
    this.badgeColor,
    this.pulseDuration = const Duration(seconds: 2),
    this.onTap,
  });

  @override
  State<PulsingNotificationBadge> createState() => _PulsingNotificationBadgeState();
}

class _PulsingNotificationBadgeState extends State<PulsingNotificationBadge>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _pulseAnimation;
  final NotificationService _notificationService = NotificationService.instance;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: widget.pulseDuration,
      vsync: this,
    );
    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.3,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    // Start pulsing if there are unread notifications
    _checkAndStartPulse();

    // Listen for notification changes
    _notificationService.unreadCountStream.listen((count) {
      if (mounted) {
        if (count > 0) {
          _animationController.repeat(reverse: true);
        } else {
          _animationController.stop();
          _animationController.reset();
        }
      }
    });
  }

  void _checkAndStartPulse() {
    if (_notificationService.unreadCount > 0) {
      _animationController.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<int>(
      stream: _notificationService.unreadCountStream,
      initialData: _notificationService.unreadCount,
      builder: (context, snapshot) {
        final count = snapshot.data ?? 0;
        
        if (count == 0) {
          return GestureDetector(
            onTap: widget.onTap,
            child: widget.child,
          );
        }

        return AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) {
            return Stack(
              clipBehavior: Clip.none,
              children: [
                GestureDetector(
                  onTap: widget.onTap,
                  child: widget.child,
                ),
                Positioned(
                  right: -8,
                  top: -8,
                  child: Transform.scale(
                    scale: _pulseAnimation.value,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      constraints: const BoxConstraints(
                        minWidth: 18,
                        minHeight: 18,
                      ),
                      decoration: BoxDecoration(
                        color: widget.badgeColor ?? Theme.of(context).colorScheme.error,
                        borderRadius: BorderRadius.circular(9),
                        border: Border.all(color: Colors.white, width: 1),
                        boxShadow: [
                          BoxShadow(
                            color: (widget.badgeColor ?? Theme.of(context).colorScheme.error)
                                .withOpacity(0.4),
                            blurRadius: 4,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          count > 99 ? '99+' : count.toString(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }
}