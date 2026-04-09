import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:appatonce/appatonce.dart';
import '../api/services/chat_api_service.dart';
import '../config/app_config.dart';
import 'app_at_once_service.dart';

/// Enum for message delivery status
enum MessageDeliveryStatus {
  sending,
  sent,
  delivered,
  read,
  failed
}

/// Enum for user presence status
enum UserPresenceStatus {
  online,
  offline,
  away,
  busy
}

/// Real-time typing indicator data
class TypingIndicator {
  final String userId;
  final String userName;
  final String channelId;
  final DateTime timestamp;
  
  TypingIndicator({
    required this.userId,
    required this.userName,
    required this.channelId,
    required this.timestamp,
  });
  
  factory TypingIndicator.fromJson(Map<String, dynamic> json) {
    return TypingIndicator(
      userId: json['user_id'],
      userName: json['user_name'],
      channelId: json['channel_id'],
      timestamp: DateTime.parse(json['timestamp']),
    );
  }
  
  Map<String, dynamic> toJson() => {
    'user_id': userId,
    'user_name': userName,
    'channel_id': channelId,
    'timestamp': timestamp.toIso8601String(),
  };
}

/// User presence information
class UserPresence {
  final String userId;
  final String userName;
  final UserPresenceStatus status;
  final DateTime lastSeen;
  final String? statusMessage;
  
  UserPresence({
    required this.userId,
    required this.userName,
    required this.status,
    required this.lastSeen,
    this.statusMessage,
  });
  
  factory UserPresence.fromJson(Map<String, dynamic> json) {
    return UserPresence(
      userId: json['user_id'],
      userName: json['user_name'],
      status: UserPresenceStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => UserPresenceStatus.offline,
      ),
      lastSeen: DateTime.parse(json['last_seen']),
      statusMessage: json['status_message'],
    );
  }
  
  Map<String, dynamic> toJson() => {
    'user_id': userId,
    'user_name': userName,
    'status': status.name,
    'last_seen': lastSeen.toIso8601String(),
    if (statusMessage != null) 'status_message': statusMessage,
  };
}

/// Real-time message data with delivery status
class RealtimeMessage extends Message {
  final MessageDeliveryStatus deliveryStatus;
  
  RealtimeMessage({
    required super.id,
    required super.content,
    required super.type,
    required super.senderId,
    super.senderName,
    super.senderAvatar,
    super.channelId,
    super.conversationId,
    super.replyToId,
    super.replyToMessage,
    super.fileIds,
    super.reactions,
    super.metadata,
    required super.isEdited,
    required super.isDeleted,
    required super.createdAt,
    required super.updatedAt,
    this.deliveryStatus = MessageDeliveryStatus.sent,
  });
  
  factory RealtimeMessage.fromMessage(Message message, {MessageDeliveryStatus? deliveryStatus}) {
    return RealtimeMessage(
      id: message.id,
      content: message.content,
      type: message.type,
      senderId: message.senderId,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar,
      channelId: message.channelId,
      conversationId: message.conversationId,
      replyToId: message.replyToId,
      replyToMessage: message.replyToMessage,
      fileIds: message.fileIds,
      reactions: message.reactions,
      metadata: message.metadata,
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      deliveryStatus: deliveryStatus ?? MessageDeliveryStatus.sent,
    );
  }
}

/// Real-time chat service using AppAtOnce subscriptions
class RealTimeChatService {
  static RealTimeChatService? _instance;
  static RealTimeChatService get instance => _instance ??= RealTimeChatService._();
  
  RealTimeChatService._();
  
  late AppAtOnceClient _client;
  final ChatApiService _chatApiService = ChatApiService();
  final AppAtOnceService _appAtOnceService = AppAtOnceService.instance;
  
  bool _initialized = false;
  String? _currentUserId;
  String? _currentWorkspaceId;
  
  // Subscriptions for real-time updates
  final Map<String, StreamSubscription> _messageSubscriptions = {};
  final Map<String, StreamSubscription> _presenceSubscriptions = {};
  final Map<String, StreamSubscription> _typingSubscriptions = {};
  
  // Stream controllers for broadcasting events
  final StreamController<RealtimeMessage> _messageController = 
      StreamController<RealtimeMessage>.broadcast();
  final StreamController<UserPresence> _presenceController = 
      StreamController<UserPresence>.broadcast();
  final StreamController<TypingIndicator> _typingController = 
      StreamController<TypingIndicator>.broadcast();
  final StreamController<MessageDeliveryStatus> _deliveryStatusController = 
      StreamController<MessageDeliveryStatus>.broadcast();
  
  // Typing indicator management
  final Map<String, Timer> _typingTimers = {};
  final Map<String, List<String>> _typingUsers = {}; // channelId -> [userIds]
  
  // Presence tracking
  final Map<String, UserPresence> _userPresences = {};
  Timer? _presenceHeartbeatTimer;
  
  /// Initialize the real-time chat service
  Future<void> initialize({
    required String workspaceId,
    required String userId,
    required String userName,
  }) async {
    if (_initialized) return;
    
    try {
      
      // Ensure AppAtOnce service is initialized
      await _appAtOnceService.initialize();
      _client = AppAtOnceClient(
        apiKey: AppConfig.appAtOnceApiKey,
        debug: kDebugMode,
      );
      
      _currentWorkspaceId = workspaceId;
      _currentUserId = userId;
      
      
      // Start presence tracking
      await _startPresenceTracking(userId, userName);
      
      _initialized = true;
      
    } catch (e) {
      rethrow;
    }
  }
  
  /// Dispose of the service and clean up resources
  void dispose() {
    // Cancel all subscriptions
    for (final subscription in _messageSubscriptions.values) {
      subscription.cancel();
    }
    for (final subscription in _presenceSubscriptions.values) {
      subscription.cancel();
    }
    for (final subscription in _typingSubscriptions.values) {
      subscription.cancel();
    }
    
    // Cancel typing timers
    for (final timer in _typingTimers.values) {
      timer.cancel();
    }
    
    // Cancel presence heartbeat
    _presenceHeartbeatTimer?.cancel();
    
    // Close stream controllers
    _messageController.close();
    _presenceController.close();
    _typingController.close();
    _deliveryStatusController.close();
    
    _initialized = false;
  }
  
  // ==================== STREAM GETTERS ====================
  
  /// Stream of real-time messages
  Stream<RealtimeMessage> get messageStream => _messageController.stream;
  
  /// Stream of user presence updates
  Stream<UserPresence> get presenceStream => _presenceController.stream;
  
  /// Stream of typing indicators
  Stream<TypingIndicator> get typingStream => _typingController.stream;
  
  /// Stream of message delivery status updates
  Stream<MessageDeliveryStatus> get deliveryStatusStream => _deliveryStatusController.stream;
  
  // ==================== MESSAGE OPERATIONS ====================
  
  /// Subscribe to real-time messages for a channel
  Future<void> subscribeToChannelMessages(String channelId) async {
    if (!_initialized || _currentWorkspaceId == null) {
      throw Exception('RealTimeChatService not initialized');
    }
    
    try {
      
      // Create subscription for channel messages using AppAtOnce subscriptions
      final subscription = _client.channel('messages_$channelId').subscribe();
      
      subscription.listen((event) {
        _handleMessageEvent(event, channelId);
      });
      
      _messageSubscriptions[channelId] = subscription;
      
      
    } catch (e) {
      rethrow;
    }
  }
  
  /// Subscribe to real-time messages for a conversation
  Future<void> subscribeToConversationMessages(String conversationId) async {
    if (!_initialized || _currentWorkspaceId == null) {
      throw Exception('RealTimeChatService not initialized');
    }
    
    try {
      
      // Create subscription for conversation messages
      final subscription = _client.channel('conversation_messages_$conversationId').subscribe();
      
      subscription.listen((event) {
        _handleMessageEvent(event, conversationId, isConversation: true);
      });
      
      _messageSubscriptions['conversation_$conversationId'] = subscription;
      
      
    } catch (e) {
      rethrow;
    }
  }
  
  /// Send a message to a channel using REST API
  Future<RealtimeMessage> sendChannelMessage({
    required String channelId,
    required String content,
    String type = 'text',
    List<String>? fileIds,
    Map<String, dynamic>? metadata,
    String? replyToId,
  }) async {
    if (!_initialized || _currentWorkspaceId == null) {
      throw Exception('RealTimeChatService not initialized');
    }
    
    try {
      
      final dto = SendMessageDto(
        content: content,
        type: type,
        fileIds: fileIds,
        metadata: metadata,
        replyToId: replyToId,
      );
      
      final response = await _chatApiService.sendChannelMessage(
        _currentWorkspaceId!,
        channelId,
        dto,
      );
      
      if (response.isSuccess && response.data != null) {
        final realtimeMessage = RealtimeMessage.fromMessage(
          response.data!,
          deliveryStatus: MessageDeliveryStatus.sent,
        );
        
        // Emit the message immediately to local listeners
        _messageController.add(realtimeMessage);
        
        return realtimeMessage;
      } else {
        throw Exception(response.error ?? 'Failed to send message');
      }
      
    } catch (e) {
      rethrow;
    }
  }
  
  /// Send a message to a conversation using REST API
  Future<RealtimeMessage> sendConversationMessage({
    required String conversationId,
    required String content,
    String type = 'text',
    List<String>? fileIds,
    Map<String, dynamic>? metadata,
    String? replyToId,
  }) async {
    if (!_initialized || _currentWorkspaceId == null) {
      throw Exception('RealTimeChatService not initialized');
    }
    
    try {
      
      final dto = SendMessageDto(
        content: content,
        type: type,
        fileIds: fileIds,
        metadata: metadata,
        replyToId: replyToId,
      );
      
      final response = await _chatApiService.sendConversationMessage(
        _currentWorkspaceId!,
        conversationId,
        dto,
      );
      
      if (response.isSuccess && response.data != null) {
        final realtimeMessage = RealtimeMessage.fromMessage(
          response.data!,
          deliveryStatus: MessageDeliveryStatus.sent,
        );
        
        // Emit the message immediately to local listeners
        _messageController.add(realtimeMessage);
        
        return realtimeMessage;
      } else {
        throw Exception(response.error ?? 'Failed to send message');
      }
      
    } catch (e) {
      rethrow;
    }
  }
  
  // ==================== TYPING INDICATORS ====================
  
  /// Subscribe to typing indicators for a channel
  Future<void> subscribeToTypingIndicators(String channelId) async {
    if (!_initialized) {
      throw Exception('RealTimeChatService not initialized');
    }
    
    try {
      
      // Create subscription for typing indicators
      final subscription = _client.channel('typing_$channelId').subscribe();
      
      subscription.listen((event) {
        _handleTypingEvent(event, channelId);
      });
      
      _typingSubscriptions[channelId] = subscription;
      
    } catch (e) {
    }
  }
  
  /// Send typing indicator
  Future<void> sendTypingIndicator({
    required String channelId,
    required String userName,
  }) async {
    if (!_initialized || _currentUserId == null) return;
    
    try {
      final typingData = TypingIndicator(
        userId: _currentUserId!,
        userName: userName,
        channelId: channelId,
        timestamp: DateTime.now(),
      );
      
      // Broadcast typing indicator
      await _client.channel('typing_$channelId').send('typing', typingData.toJson());
      
      // Set a timer to stop typing after 3 seconds
      _typingTimers[channelId]?.cancel();
      _typingTimers[channelId] = Timer(const Duration(seconds: 3), () {
        _stopTypingIndicator(channelId, userName);
      });
      
    } catch (e) {
    }
  }
  
  /// Stop typing indicator
  Future<void> stopTypingIndicator({
    required String channelId,
    required String userName,
  }) async {
    _stopTypingIndicator(channelId, userName);
  }
  
  /// Internal method to stop typing indicator
  void _stopTypingIndicator(String channelId, String userName) async {
    if (!_initialized || _currentUserId == null) return;
    
    try {
      final stopTypingData = {
        'user_id': _currentUserId!,
        'user_name': userName,
        'channel_id': channelId,
        'timestamp': DateTime.now().toIso8601String(),
      };
      
      // Broadcast stop typing indicator
      await _client.channel('typing_$channelId').send('stop_typing', stopTypingData);
      
      // Cancel timer
      _typingTimers[channelId]?.cancel();
      _typingTimers.remove(channelId);
      
    } catch (e) {
    }
  }
  
  // ==================== PRESENCE TRACKING ====================
  
  /// Start presence tracking for the current user
  Future<void> _startPresenceTracking(String userId, String userName) async {
    try {
      
      // Set initial presence as online
      await _updateUserPresence(
        userId: userId,
        userName: userName,
        status: UserPresenceStatus.online,
      );
      
      // Start heartbeat to maintain presence
      _presenceHeartbeatTimer = Timer.periodic(
        const Duration(seconds: 30),
        (_) => _sendPresenceHeartbeat(userId, userName),
      );
      
    } catch (e) {
    }
  }
  
  /// Subscribe to presence updates for a channel
  Future<void> subscribeToPresence(String channelId) async {
    if (!_initialized) {
      throw Exception('RealTimeChatService not initialized');
    }
    
    try {
      
      // Create subscription for presence updates
      final subscription = _client.channel('presence_$channelId').subscribe();
      
      subscription.listen((event) {
        _handlePresenceEvent(event);
      });
      
      _presenceSubscriptions[channelId] = subscription;
      
    } catch (e) {
    }
  }
  
  /// Update user presence status
  Future<void> updatePresenceStatus({
    required UserPresenceStatus status,
    String? statusMessage,
  }) async {
    if (!_initialized || _currentUserId == null) return;
    
    await _updateUserPresence(
      userId: _currentUserId!,
      userName: _currentUser?.name ?? 'Current User',
      status: status,
      statusMessage: statusMessage,
    );
  }
  
  /// Internal method to update user presence
  Future<void> _updateUserPresence({
    required String userId,
    required String userName,
    required UserPresenceStatus status,
    String? statusMessage,
  }) async {
    try {
      final presence = UserPresence(
        userId: userId,
        userName: userName,
        status: status,
        lastSeen: DateTime.now(),
        statusMessage: statusMessage,
      );
      
      // Broadcast presence update
      await _client.channel('presence_global').send('presence', presence.toJson());
      
      // Update local cache
      _userPresences[userId] = presence;
      
      // Emit to presence stream
      _presenceController.add(presence);
      
    } catch (e) {
    }
  }
  
  /// Send presence heartbeat
  Future<void> _sendPresenceHeartbeat(String userId, String userName) async {
    await _updateUserPresence(
      userId: userId,
      userName: userName,
      status: UserPresenceStatus.online,
    );
  }
  
  /// Get current presence for a user
  UserPresence? getUserPresence(String userId) {
    return _userPresences[userId];
  }
  
  /// Get all cached user presences
  List<UserPresence> getAllUserPresences() {
    return _userPresences.values.toList();
  }
  
  // ==================== MESSAGE DELIVERY STATUS ====================
  
  /// Mark message as read
  Future<void> markMessageAsRead(String messageId) async {
    try {
      // Update read status via API
      await _chatApiService.markMessageAsRead(_currentWorkspaceId!, messageId);
      _deliveryStatusController.add(MessageDeliveryStatus.read);
    } catch (e) {
    }
  }
  
  /// Mark all messages in channel as read
  Future<void> markChannelAsRead(String channelId) async {
    try {
      // Mark channel as read via API
      await _chatApiService.markChannelAsRead(_currentWorkspaceId!, channelId);
    } catch (e) {
    }
  }
  
  // ==================== EVENT HANDLERS ====================
  
  /// Handle incoming message events
  void _handleMessageEvent(dynamic event, String channelId, {bool isConversation = false}) {
    try {
      if (event is Map<String, dynamic>) {
        final eventType = event['type'];
        final payload = event['payload'];
        
        if (eventType == 'INSERT' && payload is Map<String, dynamic>) {
          // New message received
          final message = Message.fromJson(payload);
          final realtimeMessage = RealtimeMessage.fromMessage(
            message,
            deliveryStatus: MessageDeliveryStatus.delivered,
          );
          
          _messageController.add(realtimeMessage);
          
        } else if (eventType == 'UPDATE' && payload is Map<String, dynamic>) {
          // Message updated
          final message = Message.fromJson(payload);
          final realtimeMessage = RealtimeMessage.fromMessage(message);
          
          _messageController.add(realtimeMessage);
          
        } else if (eventType == 'DELETE' && payload is Map<String, dynamic>) {
          // Message deleted
          final message = Message.fromJson(payload);
          final realtimeMessage = RealtimeMessage.fromMessage(
            message.copyWith(isDeleted: true),
          );
          
          _messageController.add(realtimeMessage);
        }
      }
    } catch (e) {
    }
  }
  
  /// Handle typing indicator events
  void _handleTypingEvent(dynamic event, String channelId) {
    try {
      if (event is Map<String, dynamic>) {
        final eventType = event['type'];
        final payload = event['payload'];
        
        if (payload is Map<String, dynamic>) {
          if (eventType == 'typing') {
            final typingIndicator = TypingIndicator.fromJson(payload);
            
            // Don't show our own typing
            if (typingIndicator.userId != _currentUserId) {
              _typingController.add(typingIndicator);
              
              // Add to typing users list
              _typingUsers[channelId] ??= [];
              if (!_typingUsers[channelId]!.contains(typingIndicator.userId)) {
                _typingUsers[channelId]!.add(typingIndicator.userId);
              }
              
              // Set timer to remove typing indicator
              Timer(const Duration(seconds: 5), () {
                _typingUsers[channelId]?.remove(typingIndicator.userId);
              });
            }
            
          } else if (eventType == 'stop_typing') {
            final userId = payload['user_id'];
            _typingUsers[channelId]?.remove(userId);
          }
        }
      }
    } catch (e) {
    }
  }
  
  /// Handle presence events
  void _handlePresenceEvent(dynamic event) {
    try {
      if (event is Map<String, dynamic>) {
        final payload = event['payload'];
        
        if (payload is Map<String, dynamic>) {
          final presence = UserPresence.fromJson(payload);
          
          // Update local cache
          _userPresences[presence.userId] = presence;
          
          // Emit to presence stream
          _presenceController.add(presence);
        }
      }
    } catch (e) {
    }
  }
  
  // ==================== UTILITY METHODS ====================
  
  /// Get typing users for a channel
  List<String> getTypingUsers(String channelId) {
    return _typingUsers[channelId] ?? [];
  }
  
  /// Check if service is initialized
  bool get isInitialized => _initialized;
  
  /// Get current user ID
  String? get currentUserId => _currentUserId;
  
  /// Get current workspace ID
  String? get currentWorkspaceId => _currentWorkspaceId;
  
  /// Unsubscribe from channel messages
  Future<void> unsubscribeFromChannel(String channelId) async {
    _messageSubscriptions[channelId]?.cancel();
    _messageSubscriptions.remove(channelId);
    
    _typingSubscriptions[channelId]?.cancel();
    _typingSubscriptions.remove(channelId);
    
    _presenceSubscriptions[channelId]?.cancel();
    _presenceSubscriptions.remove(channelId);
    
  }
  
  /// Unsubscribe from conversation messages
  Future<void> unsubscribeFromConversation(String conversationId) async {
    _messageSubscriptions['conversation_$conversationId']?.cancel();
    _messageSubscriptions.remove('conversation_$conversationId');
    
  }
}

/// Extension methods for Message class
extension MessageExtension on Message {
  Message copyWith({
    String? id,
    String? content,
    String? type,
    String? senderId,
    String? senderName,
    String? senderAvatar,
    String? channelId,
    String? conversationId,
    String? replyToId,
    Message? replyToMessage,
    List<String>? fileIds,
    List<MessageReaction>? reactions,
    Map<String, dynamic>? metadata,
    bool? isEdited,
    bool? isDeleted,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Message(
      id: id ?? this.id,
      content: content ?? this.content,
      type: type ?? this.type,
      senderId: senderId ?? this.senderId,
      senderName: senderName ?? this.senderName,
      senderAvatar: senderAvatar ?? this.senderAvatar,
      channelId: channelId ?? this.channelId,
      conversationId: conversationId ?? this.conversationId,
      replyToId: replyToId ?? this.replyToId,
      replyToMessage: replyToMessage ?? this.replyToMessage,
      fileIds: fileIds ?? this.fileIds,
      reactions: reactions ?? this.reactions,
      metadata: metadata ?? this.metadata,
      isEdited: isEdited ?? this.isEdited,
      isDeleted: isDeleted ?? this.isDeleted,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}