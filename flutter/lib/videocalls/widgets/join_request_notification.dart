import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/videocalls/join_request.dart';

/// Join Request Notification Card
/// Shows to the host when someone requests to join the call
class JoinRequestNotification extends StatelessWidget {
  final JoinRequest request;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const JoinRequestNotification({
    super.key,
    required this.request,
    required this.onAccept,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
        border: const Border(
          left: BorderSide(
            color: Colors.blue,
            width: 4,
          ),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header row with avatar and name
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: Colors.blue,
                  backgroundImage: request.avatar != null
                      ? NetworkImage(request.avatar!)
                      : null,
                  child: request.avatar == null
                      ? Text(
                          request.displayName.isNotEmpty
                              ? request.displayName.substring(0, 1).toUpperCase()
                              : 'U',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(
                            Icons.person_add,
                            size: 16,
                            color: Colors.blue,
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              request.displayName,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Wants to join the call',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            // Optional message
            if (request.message != null && request.message!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.format_quote,
                      size: 16,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        request.message!,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[700],
                          fontStyle: FontStyle.italic,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 12),

            // Action buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: onAccept,
                    icon: const Icon(Icons.check, size: 18),
                    label: Text('videocalls.accept'.tr()),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: onReject,
                    icon: const Icon(Icons.close, size: 18),
                    label: Text('videocalls.reject'.tr()),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Join Request List Widget
/// Displays multiple join requests stacked on top of each other
class JoinRequestList extends StatelessWidget {
  final List<JoinRequest> requests;
  final void Function(String requestId) onAccept;
  final void Function(String requestId) onReject;

  const JoinRequestList({
    super.key,
    required this.requests,
    required this.onAccept,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    if (requests.isEmpty) {
      return const SizedBox.shrink();
    }

    return Positioned(
      top: 80,
      right: 16,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 320),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: requests
              .map((request) => JoinRequestNotification(
                    request: request,
                    onAccept: () => onAccept(request.id),
                    onReject: () => onReject(request.id),
                  ))
              .toList(),
        ),
      ),
    );
  }
}

/// Animated join request notification that slides in from the right
class AnimatedJoinRequestNotification extends StatefulWidget {
  final JoinRequest request;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const AnimatedJoinRequestNotification({
    super.key,
    required this.request,
    required this.onAccept,
    required this.onReject,
  });

  @override
  State<AnimatedJoinRequestNotification> createState() =>
      _AnimatedJoinRequestNotificationState();
}

class _AnimatedJoinRequestNotificationState
    extends State<AnimatedJoinRequestNotification>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(1.0, 0.0),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    ));

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    ));

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slideAnimation,
      child: FadeTransition(
        opacity: _fadeAnimation,
        child: JoinRequestNotification(
          request: widget.request,
          onAccept: widget.onAccept,
          onReject: widget.onReject,
        ),
      ),
    );
  }
}
