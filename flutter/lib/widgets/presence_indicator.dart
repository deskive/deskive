import 'package:flutter/material.dart';
import '../services/real_time_chat_service.dart';

/// Widget to display user presence status
class PresenceIndicator extends StatelessWidget {
  final String userId;
  final double size;
  final bool showText;
  final UserPresence? presence;
  
  const PresenceIndicator({
    super.key,
    required this.userId,
    this.size = 12.0,
    this.showText = false,
    this.presence,
  });
  
  @override
  Widget build(BuildContext context) {
    final userPresence = presence ?? RealTimeChatService.instance.getUserPresence(userId);
    
    if (userPresence == null) {
      // Unknown status
      return _buildIndicator(
        color: Colors.grey[400]!,
        status: UserPresenceStatus.offline,
        statusText: 'Unknown',
      );
    }
    
    return _buildIndicator(
      color: _getStatusColor(userPresence.status),
      status: userPresence.status,
      statusText: _getStatusText(userPresence),
    );
  }
  
  Widget _buildIndicator({
    required Color color,
    required UserPresenceStatus status,
    required String statusText,
  }) {
    final indicator = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
        border: Border.all(
          color: Colors.white,
          width: size > 16 ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.3),
            blurRadius: size / 4,
            spreadRadius: size / 8,
          ),
        ],
      ),
      child: status == UserPresenceStatus.away
          ? Icon(
              Icons.schedule,
              size: size * 0.6,
              color: Colors.white,
            )
          : status == UserPresenceStatus.busy
              ? Icon(
                  Icons.do_not_disturb,
                  size: size * 0.6,
                  color: Colors.white,
                )
              : null,
    );
    
    if (showText) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          indicator,
          const SizedBox(width: 6),
          Text(
            statusText,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      );
    }
    
    return indicator;
  }
  
  Color _getStatusColor(UserPresenceStatus status) {
    switch (status) {
      case UserPresenceStatus.online:
        return Colors.green;
      case UserPresenceStatus.away:
        return Colors.orange;
      case UserPresenceStatus.busy:
        return Colors.red;
      case UserPresenceStatus.offline:
        return Colors.grey[400]!;
    }
  }
  
  String _getStatusText(UserPresence presence) {
    if (presence.statusMessage?.isNotEmpty == true) {
      return presence.statusMessage!;
    }
    
    switch (presence.status) {
      case UserPresenceStatus.online:
        return 'Online';
      case UserPresenceStatus.away:
        return 'Away';
      case UserPresenceStatus.busy:
        return 'Busy';
      case UserPresenceStatus.offline:
        final timeSinceLastSeen = DateTime.now().difference(presence.lastSeen);
        if (timeSinceLastSeen.inMinutes < 5) {
          return 'Just now';
        } else if (timeSinceLastSeen.inMinutes < 60) {
          return '${timeSinceLastSeen.inMinutes}m ago';
        } else if (timeSinceLastSeen.inHours < 24) {
          return '${timeSinceLastSeen.inHours}h ago';
        } else {
          return '${timeSinceLastSeen.inDays}d ago';
        }
    }
  }
}

/// Widget to display a list of online users
class OnlineUsersList extends StatefulWidget {
  final List<String> userIds;
  final bool showAvatars;
  final VoidCallback? onTap;
  
  const OnlineUsersList({
    super.key,
    required this.userIds,
    this.showAvatars = true,
    this.onTap,
  });
  
  @override
  State<OnlineUsersList> createState() => _OnlineUsersListState();
}

class _OnlineUsersListState extends State<OnlineUsersList> {
  late Stream<UserPresence> _presenceStream;
  final Map<String, UserPresence> _presences = {};
  
  @override
  void initState() {
    super.initState();
    _presenceStream = RealTimeChatService.instance.presenceStream;
    
    // Load initial presences
    for (final userId in widget.userIds) {
      final presence = RealTimeChatService.instance.getUserPresence(userId);
      if (presence != null) {
        _presences[userId] = presence;
      }
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return StreamBuilder<UserPresence>(
      stream: _presenceStream,
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          final presence = snapshot.data!;
          if (widget.userIds.contains(presence.userId)) {
            _presences[presence.userId] = presence;
          }
        }
        
        final onlineUsers = _presences.values
            .where((p) => p.status == UserPresenceStatus.online)
            .toList();
        
        if (onlineUsers.isEmpty) {
          return const SizedBox.shrink();
        }
        
        return GestureDetector(
          onTap: widget.onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.green.withOpacity(0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                PresenceIndicator(
                  userId: '',
                  size: 8,
                  presence: UserPresence(
                    userId: '',
                    userName: '',
                    status: UserPresenceStatus.online,
                    lastSeen: DateTime.now(),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '${onlineUsers.length} online',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.green,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (widget.showAvatars && onlineUsers.length <= 3) ...[
                  const SizedBox(width: 6),
                  ...onlineUsers.take(3).map((presence) => Padding(
                        padding: const EdgeInsets.only(left: 2),
                        child: CircleAvatar(
                          radius: 8,
                          backgroundColor: Colors.green,
                          child: Text(
                            presence.userName.isNotEmpty 
                                ? presence.userName[0].toUpperCase()
                                : '?',
                            style: const TextStyle(
                              fontSize: 8,
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      )),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Widget to show typing indicators
class TypingIndicatorsWidget extends StatefulWidget {
  final String channelId;
  final TextStyle? textStyle;
  
  const TypingIndicatorsWidget({
    super.key,
    required this.channelId,
    this.textStyle,
  });
  
  @override
  State<TypingIndicatorsWidget> createState() => _TypingIndicatorsWidgetState();
}

class _TypingIndicatorsWidgetState extends State<TypingIndicatorsWidget>
    with TickerProviderStateMixin {
  late Stream<TypingIndicator> _typingStream;
  final Map<String, String> _typingUsers = {};
  late AnimationController _animationController;
  late Animation<double> _animation;
  
  @override
  void initState() {
    super.initState();
    _typingStream = RealTimeChatService.instance.typingStream;
    
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat();
    
    _animation = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
  }
  
  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return StreamBuilder<TypingIndicator>(
      stream: _typingStream,
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          final indicator = snapshot.data!;
          if (indicator.channelId == widget.channelId) {
            _typingUsers[indicator.userId] = indicator.userName;
            
            // Remove typing indicator after 5 seconds
            Future.delayed(const Duration(seconds: 5), () {
              if (mounted) {
                setState(() {
                  _typingUsers.remove(indicator.userId);
                });
              }
            });
          }
        }
        
        if (_typingUsers.isEmpty) {
          return const SizedBox.shrink();
        }
        
        final typingUserNames = _typingUsers.values.toList();
        String typingText;
        
        if (typingUserNames.length == 1) {
          typingText = '${typingUserNames.first} is typing';
        } else if (typingUserNames.length == 2) {
          typingText = '${typingUserNames.join(' and ')} are typing';
        } else {
          typingText = '${typingUserNames.take(2).join(', ')} and ${typingUserNames.length - 2} others are typing';
        }
        
        return AnimatedBuilder(
          animation: _animation,
          builder: (context, child) {
            return Opacity(
              opacity: _animation.value,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Row(
                  children: [
                    _buildTypingDots(),
                    const SizedBox(width: 8),
                    Text(
                      typingText,
                      style: widget.textStyle ??
                          TextStyle(
                            fontSize: 12,
                            fontStyle: FontStyle.italic,
                            color: Colors.grey[600],
                          ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
  
  Widget _buildTypingDots() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (index) {
        return AnimatedBuilder(
          animation: _animationController,
          builder: (context, child) {
            final delay = index * 0.2;
            final animationValue = (_animationController.value + delay) % 1.0;
            final opacity = animationValue < 0.5 ? animationValue * 2 : (1 - animationValue) * 2;
            
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 1),
              width: 4,
              height: 4,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.grey[600]!.withOpacity(0.3 + opacity * 0.7),
              ),
            );
          },
        );
      }),
    );
  }
}

/// Utility extension for UserPresence to handle null lastSeen
extension UserPresenceExtension on UserPresence {
  UserPresence copyWith({
    String? userId,
    String? userName,
    UserPresenceStatus? status,
    DateTime? lastSeen,
    String? statusMessage,
  }) {
    return UserPresence(
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      status: status ?? this.status,
      lastSeen: lastSeen ?? this.lastSeen,
      statusMessage: statusMessage ?? this.statusMessage,
    );
  }
}