import 'package:flutter/material.dart';
import 'dart:async';

/// Overlay entry holder for managing the floating notification
class FloatingNotificationManager {
  static final FloatingNotificationManager _instance =
      FloatingNotificationManager._internal();
  factory FloatingNotificationManager() => _instance;
  FloatingNotificationManager._internal();

  OverlayEntry? _currentOverlay;
  Timer? _dismissTimer;

  /// Show a floating notification using NavigatorState
  void showWithNavigator(
    NavigatorState navigatorState, {
    required String title,
    required String message,
    String? avatarUrl,
    VoidCallback? onTap,
    Duration duration = const Duration(seconds: 4),
  }) {
    try {
      // Remove any existing notification
      hide();

      // Create overlay entry
      _currentOverlay = OverlayEntry(
        builder: (context) => FloatingNotificationWidget(
          title: title,
          message: message,
          avatarUrl: avatarUrl,
          onTap: () {
            hide();
            onTap?.call();
          },
          onDismiss: hide,
        ),
      );

      // Insert overlay directly into navigator's overlay
      navigatorState.overlay?.insert(_currentOverlay!);

      // Auto dismiss after duration
      _dismissTimer = Timer(duration, hide);

    } catch (e) {
      _currentOverlay = null;
    }
  }

  /// Show a floating notification using BuildContext
  void show(
    BuildContext context, {
    required String title,
    required String message,
    String? avatarUrl,
    VoidCallback? onTap,
    Duration duration = const Duration(seconds: 4),
  }) {
    try {
      // Remove any existing notification
      hide();

      // Create overlay entry
      _currentOverlay = OverlayEntry(
        builder: (context) => FloatingNotificationWidget(
          title: title,
          message: message,
          avatarUrl: avatarUrl,
          onTap: () {
            hide();
            onTap?.call();
          },
          onDismiss: hide,
        ),
      );

      // Insert overlay
      final overlay = Overlay.of(context);
      overlay.insert(_currentOverlay!);

      // Auto dismiss after duration
      _dismissTimer = Timer(duration, hide);

    } catch (e) {
      _currentOverlay = null;
    }
  }

  /// Hide the current notification
  void hide() {
    _dismissTimer?.cancel();
    _dismissTimer = null;

    if (_currentOverlay != null) {
      try {
        _currentOverlay?.remove();
      } catch (e) {
      }
      _currentOverlay = null;
    }
  }
}

/// Floating notification widget that appears at the top of the screen
class FloatingNotificationWidget extends StatefulWidget {
  final String title;
  final String message;
  final String? avatarUrl;
  final VoidCallback? onTap;
  final VoidCallback? onDismiss;

  const FloatingNotificationWidget({
    Key? key,
    required this.title,
    required this.message,
    this.avatarUrl,
    this.onTap,
    this.onDismiss,
  }) : super(key: key);

  @override
  State<FloatingNotificationWidget> createState() =>
      _FloatingNotificationWidgetState();
}

class _FloatingNotificationWidgetState
    extends State<FloatingNotificationWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    ));

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleDismiss() async {
    await _controller.reverse();
    widget.onDismiss?.call();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = Theme.of(context).primaryColor;

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SlideTransition(
        position: _slideAnimation,
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
              child: GestureDetector(
                onTap: widget.onTap,
                onHorizontalDragEnd: (details) {
                  if (details.primaryVelocity!.abs() > 300) {
                    _handleDismiss();
                  }
                },
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: isDark
                          ? [
                              const Color(0xFF2C2C2E),
                              const Color(0xFF1C1C1E),
                            ]
                          : [
                              Colors.white,
                              Colors.grey.shade50,
                            ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: isDark
                            ? Colors.black.withOpacity(0.5)
                            : Colors.black.withOpacity(0.1),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                        spreadRadius: 0,
                      ),
                      BoxShadow(
                        color: isDark
                            ? Colors.black.withOpacity(0.3)
                            : primaryColor.withOpacity(0.05),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                        spreadRadius: 0,
                      ),
                    ],
                    border: Border.all(
                      color: isDark
                          ? Colors.white.withOpacity(0.1)
                          : Colors.black.withOpacity(0.06),
                      width: 0.5,
                    ),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Stack(
                      children: [
                        // Accent bar on the left
                        Positioned(
                          left: 0,
                          top: 0,
                          bottom: 0,
                          child: Container(
                            width: 3,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  primaryColor,
                                  primaryColor.withOpacity(0.7),
                                ],
                              ),
                            ),
                          ),
                        ),
                        // Main content
                        Padding(
                          padding: const EdgeInsets.only(
                            left: 12,
                            right: 10,
                            top: 10,
                            bottom: 10,
                          ),
                          child: Row(
                            children: [
                              // Avatar with glow effect
                              Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: primaryColor.withOpacity(0.3),
                                      blurRadius: 8,
                                      spreadRadius: 0,
                                    ),
                                  ],
                                ),
                                child: CircleAvatar(
                                  radius: 18,
                                  backgroundColor: primaryColor,
                                  backgroundImage: widget.avatarUrl != null
                                      ? NetworkImage(widget.avatarUrl!)
                                      : null,
                                  child: widget.avatarUrl == null
                                      ? Text(
                                          widget.title[0].toUpperCase(),
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w600,
                                            fontSize: 14,
                                          ),
                                        )
                                      : null,
                                ),
                              ),
                              const SizedBox(width: 12),
                              // Content
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            widget.title,
                                            style: TextStyle(
                                              fontWeight: FontWeight.w700,
                                              fontSize: 13,
                                              letterSpacing: 0.1,
                                              color: isDark
                                                  ? Colors.white
                                                  : const Color(0xFF1C1C1E),
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      widget.message,
                                      style: TextStyle(
                                        fontSize: 12,
                                        height: 1.3,
                                        color: isDark
                                            ? Colors.grey.shade400
                                            : Colors.grey.shade600,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              // Dismiss button with hover effect
                              Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: _handleDismiss,
                                  borderRadius: BorderRadius.circular(16),
                                  child: Container(
                                    padding: const EdgeInsets.all(6.0),
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: isDark
                                          ? Colors.white.withOpacity(0.05)
                                          : Colors.black.withOpacity(0.03),
                                    ),
                                    child: Icon(
                                      Icons.close_rounded,
                                      size: 16,
                                      color: isDark
                                          ? Colors.grey.shade400
                                          : Colors.grey.shade600,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
