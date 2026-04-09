import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../api/services/chat_api_service.dart';
import '../config/env_config.dart';
import '../config/app_config.dart';
import 'callkit_service.dart';

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

/// Video call event types
enum VideoCallEventType {
  incoming,     // Incoming call from another user
  accepted,     // Call was accepted
  rejected,     // Call was rejected
  ended,        // Call was ended
  cancelled,    // Call was cancelled before being answered
  participantJoined,  // New participant joined
  participantLeft,    // Participant left
}

/// Video call event data
class VideoCallEvent {
  final String callId;
  final VideoCallEventType type;
  final String? fromUserId;
  final String? fromUserName;
  final String? fromUserAvatar;
  final String? channelId;
  final String? conversationId;
  final List<String> participants;
  final bool isVideoCall; // true for video, false for audio only
  final DateTime timestamp;
  final Map<String, dynamic>? metadata;

  VideoCallEvent({
    required this.callId,
    required this.type,
    this.fromUserId,
    this.fromUserName,
    this.fromUserAvatar,
    this.channelId,
    this.conversationId,
    this.participants = const [],
    this.isVideoCall = true,
    required this.timestamp,
    this.metadata,
  });

  factory VideoCallEvent.fromJson(Map<String, dynamic> json) {
    return VideoCallEvent(
      callId: json['call_id'] ?? json['callId'] ?? '',
      type: VideoCallEventType.values.firstWhere(
        (e) => e.name == (json['type'] ?? json['event_type']),
        orElse: () => VideoCallEventType.incoming,
      ),
      // Backend sends caller_id, caller_name, caller_avatar
      fromUserId: json['from_user_id'] ?? json['fromUserId'] ?? json['caller_id'],
      fromUserName: json['from_user_name'] ?? json['fromUserName'] ?? json['caller_name'],
      fromUserAvatar: json['from_user_avatar'] ?? json['fromUserAvatar'] ?? json['caller_avatar'],
      channelId: json['channel_id'] ?? json['channelId'],
      conversationId: json['conversation_id'] ?? json['conversationId'],
      participants: json['participants'] != null
          ? List<String>.from(json['participants'])
          : (json['participant_ids'] != null
              ? List<String>.from(json['participant_ids'])
              : []),
      // Backend sends call_type: 'video' or 'audio'
      isVideoCall: json['is_video_call'] ?? json['isVideoCall'] ?? (json['call_type'] == 'video'),
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : (json['created_at'] != null
              ? DateTime.parse(json['created_at'])
              : DateTime.now()),
      metadata: json['metadata'],
    );
  }

  Map<String, dynamic> toJson() => {
    'call_id': callId,
    'type': type.name,
    'from_user_id': fromUserId,
    'from_user_name': fromUserName,
    'from_user_avatar': fromUserAvatar,
    'channel_id': channelId,
    'conversation_id': conversationId,
    'participants': participants,
    'is_video_call': isVideoCall,
    'timestamp': timestamp.toIso8601String(),
    if (metadata != null) 'metadata': metadata,
  };
}

/// Real-time message data with delivery status
class RealtimeMessage extends Message {
  final MessageDeliveryStatus deliveryStatus;

  RealtimeMessage({
    required super.id,
    required super.content,
    super.contentHtml,
    required super.userId,
    super.senderName,
    super.senderAvatar,
    super.channelId,
    super.conversationId,
    super.threadId,
    super.parentId,
    super.replyCount,
    super.attachments,
    super.mentions,
    super.reactions,
    super.collaborativeData,
    super.linkedContent,
    required super.isEdited,
    required super.isDeleted,
    required super.createdAt,
    required super.updatedAt,
    super.encryptedContent,
    super.encryptionMetadata,
    super.isEncrypted,
    this.deliveryStatus = MessageDeliveryStatus.sent,
  });

  factory RealtimeMessage.fromMessage(Message message, {MessageDeliveryStatus? deliveryStatus}) {
    return RealtimeMessage(
      id: message.id,
      content: message.content,
      contentHtml: message.contentHtml,
      userId: message.userId,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar,
      channelId: message.channelId,
      conversationId: message.conversationId,
      threadId: message.threadId,
      parentId: message.parentId,
      replyCount: message.replyCount,
      attachments: message.attachments,
      mentions: message.mentions,
      reactions: message.reactions,
      collaborativeData: message.collaborativeData,
      linkedContent: message.linkedContent,
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      encryptedContent: message.encryptedContent,
      encryptionMetadata: message.encryptionMetadata,
      isEncrypted: message.isEncrypted,
      deliveryStatus: deliveryStatus ?? MessageDeliveryStatus.sent,
    );
  }
}

/// Socket.IO based real-time chat service
class SocketIOChatService {
  static SocketIOChatService? _instance;
  static SocketIOChatService get instance => _instance ??= SocketIOChatService._();
  
  SocketIOChatService._();
  
  IO.Socket? _socket; // Main socket for /chat namespace
  IO.Socket? _rootSocket; // Secondary socket for root namespace (/) to receive edit/delete events
  final ChatApiService _chatApiService = ChatApiService();
  
  bool _initialized = false;
  String? _currentUserId;
  String? _currentWorkspaceId;
  String? _currentUserName;
  
  // Stream controllers for broadcasting events
  final StreamController<RealtimeMessage> _messageController =
      StreamController<RealtimeMessage>.broadcast();
  final StreamController<UserPresence> _presenceController =
      StreamController<UserPresence>.broadcast();
  final StreamController<TypingIndicator> _typingController =
      StreamController<TypingIndicator>.broadcast();
  final StreamController<MessageDeliveryStatus> _deliveryStatusController =
      StreamController<MessageDeliveryStatus>.broadcast();
  final StreamController<VideoCallEvent> _videoCallController =
      StreamController<VideoCallEvent>.broadcast();
  final StreamController<Map<String, dynamic>> _notificationController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _memberLeftController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _reactionController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _readReceiptController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _pinController =
      StreamController<Map<String, dynamic>>.broadcast();

  // Unread count stream controllers
  final StreamController<Map<String, dynamic>> _workspaceMessageController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _channelReadController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _conversationReadController =
      StreamController<Map<String, dynamic>>.broadcast();

  // Bookmark stream controller
  final StreamController<Map<String, dynamic>> _bookmarkController =
      StreamController<Map<String, dynamic>>.broadcast();

  // Poll stream controller
  final StreamController<Map<String, dynamic>> _pollController =
      StreamController<Map<String, dynamic>>.broadcast();

  // Approval stream controller
  final StreamController<Map<String, dynamic>> _approvalController =
      StreamController<Map<String, dynamic>>.broadcast();

  // WebRTC signaling stream controllers
  final StreamController<Map<String, dynamic>> _webrtcOfferController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _webrtcAnswerController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _iceCandidateController =
      StreamController<Map<String, dynamic>>.broadcast();
  
  // Typing indicator management
  final Map<String, Timer> _typingTimers = {};
  final Map<String, List<String>> _typingUsers = {}; // channelId -> [userIds]
  
  // Presence tracking
  final Map<String, UserPresence> _userPresences = {};
  Timer? _presenceHeartbeatTimer;
  
  /// Initialize the Socket.IO chat service
  Future<void> initialize({
    required String workspaceId,
    required String userId,
    required String userName,
  }) async {
    if (_initialized) return;
    
    try {
      debugPrint('🔧 Initializing SocketIOChatService...');
      
      _currentWorkspaceId = workspaceId;
      _currentUserId = userId;
      _currentUserName = userName;
      
      // Get auth token for Socket.IO authentication
      final authToken = await AppConfig.getAccessToken();

      // Initialize TWO Socket.IO connections:
      // 1. /chat namespace - for new messages and room joining
      // 2. root (/) namespace - for edit/delete events from appGateway

      debugPrint('🌍 EnvConfig.websocketUrl: ${EnvConfig.websocketUrl}');

      // Primary socket: /chat namespace
      final chatSocketUrl = '${EnvConfig.websocketUrl}/chat';
      debugPrint('🔌 Connecting to /chat namespace: $chatSocketUrl');

      _socket = IO.io(
        chatSocketUrl,
        IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .setAuth({
            'token': authToken,
            'userId': userId,
            'workspaceId': workspaceId,
          })
          .setQuery({
            'workspaceId': workspaceId,
          })
          .build(),
      );

      // Secondary socket: root (/) namespace for edit/delete events
      final rootSocketUrl = EnvConfig.websocketUrl;
      debugPrint('🔌 Connecting to root (/) namespace: $rootSocketUrl');

      _rootSocket = IO.io(
        rootSocketUrl,
        IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .setAuth({
            'token': authToken,
            'userId': userId,
            'workspaceId': workspaceId,
          })
          .setQuery({
            'workspaceId': workspaceId,
          })
          .build(),
      );

      // Set up event listeners on both sockets
      _setupSocketListeners();
      _setupRootSocketListeners();

      // Connect both sockets
      _socket!.connect();
      _rootSocket!.connect();
      
      debugPrint('✅ SocketIOChatService initialized for user: $userId in workspace: $workspaceId');
      
      _initialized = true;
      
    } catch (e) {
      debugPrint('❌ Failed to initialize SocketIOChatService: $e');
      rethrow;
    }
  }
  
  /// Set up Socket.IO event listeners
  void _setupSocketListeners() {
    if (_socket == null) return;
    
    // Connection events
    _socket!.onConnect((_) {
      debugPrint('✅ Socket.IO connected successfully!');
      debugPrint('   Socket ID: ${_socket!.id}');
      debugPrint('   Namespace: ${_socket!.nsp}');
      debugPrint('   Connected: ${_socket!.connected}');
      debugPrint('   User ID: $_currentUserId');
      debugPrint('   Workspace ID: $_currentWorkspaceId');
      debugPrint('🔔 [SOCKET] Ready to receive events');

      // Test: Emit a join event to ensure we're in the right room
      if (_currentWorkspaceId != null && _currentUserId != null) {
        _socket!.emit('join_workspace', {
          'workspaceId': _currentWorkspaceId,
          'userId': _currentUserId,
        });
        debugPrint('📤 [SOCKET] Emitted join_workspace event');
      }

      _startPresenceTracking();
    });

    _socket!.onDisconnect((reason) {
      debugPrint('🔌 Socket.IO disconnected');
      debugPrint('   Reason: $reason');
    });

    _socket!.onConnectError((error) {
      debugPrint('❌ Socket.IO connection error: $error');
    });

    _socket!.onError((error) {
      debugPrint('❌ Socket.IO error: $error');
    });

    // Debug: Listen to ALL events
    _socket!.onAny((event, data) {
      debugPrint('🔔 Socket.IO: ANY event received');
      debugPrint('   Event name: $event');
      debugPrint('   Data: $data');
    });

    // Chat message events - listen for multiple event names to match frontend pattern
    // Backend may emit 'new_message', 'message:new', or 'message_created'
    _socket!.on('new_message', (data) {
      debugPrint('🔔 Socket.IO: Received "new_message" event');
      debugPrint('   Raw data type: ${data.runtimeType}');
      debugPrint('   Raw data: $data');
      _handleNewMessage(data);
    });

    // Also listen for 'message:new' - this is what frontend listens for
    _socket!.on('message:new', (data) {
      debugPrint('🔔 Socket.IO: Received "message:new" event');
      debugPrint('   Raw data type: ${data.runtimeType}');
      debugPrint('   Raw data: $data');
      _handleNewMessage(data);
    });

    // Also listen for 'message_created' - alternative event name used by some backends
    _socket!.on('message_created', (data) {
      debugPrint('🔔 Socket.IO: Received "message_created" event');
      debugPrint('   Raw data type: ${data.runtimeType}');
      debugPrint('   Raw data: $data');
      _handleNewMessage(data);
    });

    // Note: message:updated and message:deleted events are handled by root socket
    // because backend emits them via appGateway to root namespace

    // Typing events
    _socket!.on('user_typing', (data) {
      _handleUserTyping(data);
    });
    
    _socket!.on('user_stop_typing', (data) {
      _handleUserStopTyping(data);
    });
    
    // Presence events
    _socket!.on('user_presence_update', (data) {
      _handlePresenceUpdate(data);
    });
    
    // Message delivery events
    _socket!.on('message_delivered', (data) {
      _handleMessageDelivered(data);
    });

    _socket!.on('message_read', (data) {
      _handleMessageRead(data);
    });

    // Also listen to 'messages:read' event (used by web frontend)
    _socket!.on('messages:read', (data) {
      _handleMessageRead(data);
    });

    // Listen for message pinned/unpinned events
    _socket!.on('message:pinned', (data) {
      debugPrint('📌 Socket.IO: Received "message:pinned" event');
      debugPrint('   Data: $data');
      _handleMessagePinned(data);
    });

    // Video call events
    _socket!.on('video_call_incoming', (data) {
      debugPrint('🔔 Socket.IO: Received "video_call_incoming" event');
      _handleVideoCallIncoming(data);
    });

    _socket!.on('video_call_initiated', (data) {
      debugPrint('🔔 Socket.IO: Received "video_call_initiated" event');
      debugPrint('📋 Event data: $data');
      _handleVideoCallIncoming(data); // Use same handler as incoming
    });

    _socket!.on('video_call_accepted', (data) {
      debugPrint('🔔 Socket.IO: Received "video_call_accepted" event');
      _handleVideoCallAccepted(data);
    });

    _socket!.on('video_call_rejected', (data) {
      debugPrint('🔔 Socket.IO: Received "video_call_rejected" event');
      _handleVideoCallRejected(data);
    });

    _socket!.on('video_call_ended', (data) {
      debugPrint('🔔 Socket.IO: Received "video_call_ended" event');
      _handleVideoCallEnded(data);
    });

    _socket!.on('video_call_cancelled', (data) {
      debugPrint('🔔 Socket.IO: Received "video_call_cancelled" event');
      _handleVideoCallCancelled(data);
    });

    _socket!.on('video_call_participant_joined', (data) {
      debugPrint('🔔 Socket.IO: Received "video_call_participant_joined" event');
      _handleVideoCallParticipantJoined(data);
    });

    _socket!.on('video_call_participant_left', (data) {
      debugPrint('🔔 Socket.IO: Received "video_call_participant_left" event');
      _handleVideoCallParticipantLeft(data);
    });

    // Notification events
    _socket!.on('notification:event', (data) {
      debugPrint('🔔 Socket.IO: Received "notification:event" event');
      debugPrint('   Notification data: $data');
      _handleNotificationEvent(data);
    });

    // Approval events
    _socket!.on('approval:request_created', (data) {
      debugPrint('🔔 Socket.IO: Received "approval:request_created" event');
      _handleApprovalEvent('request_created', data);
    });

    _socket!.on('approval:status_updated', (data) {
      debugPrint('🔔 Socket.IO: Received "approval:status_updated" event');
      _handleApprovalEvent('status_updated', data);
    });

    _socket!.on('approval:request_deleted', (data) {
      debugPrint('🔔 Socket.IO: Received "approval:request_deleted" event');
      _handleApprovalEvent('request_deleted', data);
    });

    _socket!.on('approval:comment_added', (data) {
      debugPrint('🔔 Socket.IO: Received "approval:comment_added" event');
      _handleApprovalEvent('comment_added', data);
    });

    // Debug: Log all socket events
    _socket!.onAny((event, data) {
      debugPrint('🔔 [ALL EVENTS] Socket.IO event: $event');
    });

    // WebRTC signaling events
    _socket!.on('webrtc:offer', (data) {
      debugPrint('🔔 Socket.IO: Received "webrtc:offer" event');
      _handleWebRTCOffer(data);
    });

    _socket!.on('webrtc:answer', (data) {
      debugPrint('🔔 Socket.IO: Received "webrtc:answer" event');
      _handleWebRTCAnswer(data);
    });

    _socket!.on('webrtc:ice-candidate', (data) {
      debugPrint('🔔 Socket.IO: Received "webrtc:ice-candidate" event');
      _handleICECandidate(data);
    });
  }

  /// Set up Root Socket.IO event listeners for edit/delete events
  void _setupRootSocketListeners() {
    if (_rootSocket == null) return;

    debugPrint('📡 Setting up ROOT socket listeners for edit/delete events...');

    // Connection events for root socket
    _rootSocket!.onConnect((_) {
      debugPrint('✅ ROOT Socket.IO connected!');
      debugPrint('   Socket ID: ${_rootSocket!.id}');
      debugPrint('   Namespace: ${_rootSocket!.nsp} (root)');

      // Join workspace on root namespace to receive edit/delete events
      if (_currentWorkspaceId != null) {
        _rootSocket!.emit('join:workspace', {
          'workspaceId': _currentWorkspaceId,
        });
        debugPrint('📤 ROOT Socket: Emitted join:workspace event');
      }
    });

    // Listen for workspace joined confirmation
    _rootSocket!.on('workspace:joined', (data) {
      debugPrint('✅ ROOT Socket: Joined workspace successfully!');
      debugPrint('   Data: $data');
    });

    _rootSocket!.onDisconnect((reason) {
      debugPrint('🔌 ROOT Socket.IO disconnected: $reason');
    });

    _rootSocket!.onConnectError((error) {
      debugPrint('❌ ROOT Socket.IO connection error: $error');
    });

    // Listen for message:updated events on root namespace
    _rootSocket!.on('message:updated', (data) {
      debugPrint('🔔 ROOT Socket: Received "message:updated" event');
      debugPrint('   Data: $data');
      _handleMessageUpdated(data);
    });

    // Listen for message:deleted events on root namespace
    _rootSocket!.on('message:deleted', (data) {
      debugPrint('🔔 ROOT Socket: Received "message:deleted" event');
      debugPrint('   Data: $data');
      _handleMessageDeleted(data);
    });

    // Listen for workspace-wide update events on root namespace
    _rootSocket!.on('message:updated:workspace', (data) {
      debugPrint('🔔 ROOT Socket: Received "message:updated:workspace" event');
      _handleMessageUpdated(data);
    });

    // Listen for workspace-wide delete events on root namespace
    _rootSocket!.on('message:deleted:workspace', (data) {
      debugPrint('🔔 ROOT Socket: Received "message:deleted:workspace" event');
      _handleMessageDeleted(data);
    });

    // ✅ FIX: Listen for notification events on root namespace
    _rootSocket!.on('notification:event', (data) {
      debugPrint('🔔 ROOT Socket: Received "notification:event" event');
      debugPrint('   Notification data: $data');
      _handleNotificationEvent(data);
    });

    // Listen for member:left events on root namespace
    _rootSocket!.on('member:left', (data) {
      debugPrint('🔔 ROOT Socket: Received "member:left" event');
      debugPrint('   Data: $data');
      _handleMemberLeft(data);
    });

    // Listen for reaction events on root namespace
    _rootSocket!.on('reaction_added', (data) {
      debugPrint('🔔 ROOT Socket: Received "reaction_added" event');
      debugPrint('   Data: $data');
      _handleReactionEvent(data, 'added');
    });

    _rootSocket!.on('reaction_removed', (data) {
      debugPrint('🔔 ROOT Socket: Received "reaction_removed" event');
      debugPrint('   Data: $data');
      _handleReactionEvent(data, 'removed');
    });

    // Listen for messages:read events on root namespace (for read receipts)
    _rootSocket!.on('messages:read', (data) {
      debugPrint('👁️ ROOT Socket: Received "messages:read" event');
      debugPrint('   Data: $data');
      _handleMessageRead(data);
    });

    // Listen for message:pinned events on root namespace
    _rootSocket!.on('message:pinned', (data) {
      debugPrint('📌 ROOT Socket: Received "message:pinned" event');
      debugPrint('   Data: $data');
      _handleMessagePinned(data);
    });

    // Listen for workspace-wide new message events (for unread count updates)
    _rootSocket!.on('message:new:workspace', (data) {
      debugPrint('📬 ROOT Socket: Received "message:new:workspace" event');
      debugPrint('   Data: $data');
      _handleWorkspaceMessage(data);
    });

    // Also listen for direct message events on root socket (some backends emit here)
    _rootSocket!.on('message:new', (data) {
      debugPrint('🔔 ROOT Socket: Received "message:new" event');
      debugPrint('   Raw data type: ${data.runtimeType}');
      debugPrint('   Raw data: $data');
      _handleNewMessage(data);
    });

    _rootSocket!.on('message_created', (data) {
      debugPrint('🔔 ROOT Socket: Received "message_created" event');
      debugPrint('   Raw data type: ${data.runtimeType}');
      debugPrint('   Raw data: $data');
      _handleNewMessage(data);
    });

    _rootSocket!.on('new_message', (data) {
      debugPrint('🔔 ROOT Socket: Received "new_message" event');
      debugPrint('   Raw data type: ${data.runtimeType}');
      debugPrint('   Raw data: $data');
      _handleNewMessage(data);
    });

    // Listen for channel:read events (when a channel is marked as read)
    _rootSocket!.on('channel:read', (data) {
      debugPrint('✅ ROOT Socket: Received "channel:read" event');
      debugPrint('   Data: $data');
      _handleChannelRead(data);
    });

    // Listen for conversation:read events (when a conversation is marked as read)
    _rootSocket!.on('conversation:read', (data) {
      debugPrint('✅ ROOT Socket: Received "conversation:read" event');
      debugPrint('   Data: $data');
      _handleConversationRead(data);
    });

    // Listen for message:bookmarked events (when a message is bookmarked/unbookmarked)
    _rootSocket!.on('message:bookmarked', (data) {
      debugPrint('🔖 ROOT Socket: Received "message:bookmarked" event');
      debugPrint('   Data: $data');
      _handleMessageBookmarked(data);
    });

    // Listen for poll:voted events
    _rootSocket!.on('poll:voted', (data) {
      debugPrint('🗳️ ROOT Socket: Received "poll:voted" event');
      debugPrint('   Data: $data');
      _handlePollEvent(data, 'voted');
    });

    // Listen for poll:closed events
    _rootSocket!.on('poll:closed', (data) {
      debugPrint('🔒 ROOT Socket: Received "poll:closed" event');
      debugPrint('   Data: $data');
      _handlePollEvent(data, 'closed');
    });

    // Approval events (backend emits to root namespace via appGateway.emitToRoom)
    _rootSocket!.on('approval:request_created', (data) {
      debugPrint('🔔 ROOT Socket: Received "approval:request_created" event');
      _handleApprovalEvent('request_created', data);
    });

    _rootSocket!.on('approval:status_updated', (data) {
      debugPrint('🔔 ROOT Socket: Received "approval:status_updated" event');
      _handleApprovalEvent('status_updated', data);
    });

    _rootSocket!.on('approval:request_deleted', (data) {
      debugPrint('🔔 ROOT Socket: Received "approval:request_deleted" event');
      _handleApprovalEvent('request_deleted', data);
    });

    _rootSocket!.on('approval:comment_added', (data) {
      debugPrint('🔔 ROOT Socket: Received "approval:comment_added" event');
      _handleApprovalEvent('comment_added', data);
    });

    // Debug: Log all root socket events with data
    _rootSocket!.onAny((event, data) {
      debugPrint('🔔 [ROOT SOCKET] Event: $event');
      if (event == 'message:pinned') {
        debugPrint('   📌 onAny pin data: $data');
        debugPrint('   📌 onAny data type: ${data.runtimeType}');
        // Also manually call the handler from onAny as fallback
        _handleMessagePinned(data);
      }
    });

    debugPrint('✅ ROOT socket listeners configured');
  }

  /// Dispose of the service and clean up resources
  void dispose() {
    // Cancel typing timers
    for (final timer in _typingTimers.values) {
      timer.cancel();
    }
    _typingTimers.clear();
    
    // Cancel presence heartbeat
    _presenceHeartbeatTimer?.cancel();

    // Disconnect both sockets
    _socket?.disconnect();
    _socket?.dispose();
    _rootSocket?.disconnect();
    _rootSocket?.dispose();
    
    // Close stream controllers
    _messageController.close();
    _presenceController.close();
    _typingController.close();
    _deliveryStatusController.close();
    _videoCallController.close();
    _notificationController.close();
    _memberLeftController.close();
    _reactionController.close();
    _readReceiptController.close();
    _pinController.close();
    _pollController.close();
    _approvalController.close();
    _webrtcOfferController.close();
    _webrtcAnswerController.close();
    _iceCandidateController.close();

    _initialized = false;
    debugPrint('🧹 SocketIOChatService disposed');
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

  /// Stream of video call events
  Stream<VideoCallEvent> get videoCallStream => _videoCallController.stream;

  /// Stream of real-time notification events
  Stream<Map<String, dynamic>> get notificationStream => _notificationController.stream;

  /// Stream of WebRTC offers
  Stream<Map<String, dynamic>> get webrtcOfferStream => _webrtcOfferController.stream;

  /// Stream of WebRTC answers
  Stream<Map<String, dynamic>> get webrtcAnswerStream => _webrtcAnswerController.stream;

  /// Stream of ICE candidates
  Stream<Map<String, dynamic>> get iceCandidateStream => _iceCandidateController.stream;

  /// Stream of member left events
  Stream<Map<String, dynamic>> get memberLeftStream => _memberLeftController.stream;

  /// Stream of reaction events (reaction added/removed)
  Stream<Map<String, dynamic>> get reactionStream => _reactionController.stream;

  /// Stream of read receipt events (when messages are read by others)
  Stream<Map<String, dynamic>> get readReceiptStream => _readReceiptController.stream;

  /// Stream of pin events (when messages are pinned/unpinned)
  Stream<Map<String, dynamic>> get pinStream => _pinController.stream;

  /// Stream of workspace-wide new message events (for unread count updates)
  Stream<Map<String, dynamic>> get workspaceMessageStream => _workspaceMessageController.stream;

  /// Stream of channel read events (when a channel is marked as read)
  Stream<Map<String, dynamic>> get channelReadStream => _channelReadController.stream;

  /// Stream of conversation read events (when a conversation is marked as read)
  Stream<Map<String, dynamic>> get conversationReadStream => _conversationReadController.stream;

  /// Stream of bookmark events (when a message is bookmarked/unbookmarked)
  Stream<Map<String, dynamic>> get bookmarkStream => _bookmarkController.stream;

  /// Stream of poll events (when a poll is voted on or closed)
  Stream<Map<String, dynamic>> get pollStream => _pollController.stream;

  /// Stream of approval events (request created, status updated, deleted, comment added)
  Stream<Map<String, dynamic>> get approvalStream => _approvalController.stream;

  // ==================== MESSAGE OPERATIONS ====================
  
  /// Subscribe to real-time messages for a channel
  Future<void> subscribeToChannelMessages(String channelId) async {
    if (!_initialized || _socket == null) {
      throw Exception('SocketIOChatService not initialized');
    }

    try {

      // Listen for the joined_channel acknowledgment
      _socket!.once('joined_channel', (data) {
        debugPrint('✅ Backend confirmed channel join!');
        debugPrint('   Data: $data');
      });

      // Listen for any errors
      _socket!.once('error', (data) {
        debugPrint('❌ Backend returned error during join!');
        debugPrint('   Error: $data');
      });

      _socket!.emit('join_channel', {
        'channelId': channelId,
        'workspaceId': _currentWorkspaceId,
      });

      // Also join room on root socket for events like messages:read
      if (_rootSocket != null && _rootSocket!.connected) {
        _rootSocket!.emit('join:room', {
          'room': 'channel:$channelId',
        });
        debugPrint('✅ Also joined room on root socket: channel:$channelId');
      }

      debugPrint('✅ Emitted join_channel event');
      debugPrint('   Now listening for messages in room: channel:$channelId');

    } catch (e) {
      debugPrint('❌ Failed to subscribe to channel messages: $e');
      rethrow;
    }
  }
  
  /// Subscribe to real-time messages for a conversation
  Future<void> subscribeToConversationMessages(String conversationId) async {
    if (!_initialized || _socket == null) {
      throw Exception('SocketIOChatService not initialized');
    }

    try {
      debugPrint('🔔 Subscribing to conversation messages: $conversationId');
      debugPrint('   Workspace ID: $_currentWorkspaceId');
      debugPrint('   Socket connected: ${_socket!.connected}');
      debugPrint('   Socket ID: ${_socket!.id}');
      debugPrint('   Namespace: ${_socket!.nsp}');

      // Listen for the joined conversation acknowledgment
      _socket!.once('joined_conversation', (data) {
        debugPrint('✅ Backend confirmed conversation join!');
        debugPrint('   Data: $data');
      });

      // Listen for any errors
      _socket!.once('error', (data) {
        debugPrint('❌ Backend returned error during join!');
        debugPrint('   Error: $data');
      });

      _socket!.emit('join_conversation', {
        'conversationId': conversationId,
        'workspaceId': _currentWorkspaceId,
      });

      // Also join room on root socket for events like messages:read, message:pinned
      if (_rootSocket != null && _rootSocket!.connected) {
        final roomName = 'conversation:$conversationId';

        // Listen for room join confirmation
        _rootSocket!.once('room:joined', (data) {
          debugPrint('✅ ROOT Socket: Room join confirmed!');
          debugPrint('   Data: $data');
        });

        // Listen for errors
        _rootSocket!.once('error', (data) {
          debugPrint('❌ ROOT Socket: Error joining room!');
          debugPrint('   Error: $data');
        });

        _rootSocket!.emit('join:room', {
          'room': roomName,
        });
        debugPrint('📤 Emitted join:room on root socket: $roomName');
      } else {
        debugPrint('⚠️ Root socket not connected, cannot join room');
      }

      debugPrint('✅ Emitted join_conversation event');
      debugPrint('   Now listening for messages in room: conversation:$conversationId');

    } catch (e) {
      debugPrint('❌ Failed to subscribe to conversation messages: $e');
      rethrow;
    }
  }
  
  /// Send a message to a channel using REST API
  Future<RealtimeMessage> sendChannelMessage({
    required String channelId,
    required String content,
    String? contentHtml,
    List<AttachmentDto>? attachments,
    List<String>? mentions,
    String? parentId,
    List<Map<String, dynamic>>? linkedContent,
  }) async {
    if (!_initialized || _currentWorkspaceId == null) {
      throw Exception('SocketIOChatService not initialized');
    }

    try {
      debugPrint('📤 Sending channel message: $channelId');

      final dto = SendMessageDto(
        content: content,
        contentHtml: contentHtml,
        attachments: attachments,
        mentions: mentions,
        parentId: parentId,
        linkedContent: linkedContent,
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

        // Note: Backend will emit 'new_message' to other clients via Socket.IO
        // No need to emit here as the REST API already handled it

        return realtimeMessage;
      } else {
        throw Exception(response.message ?? 'Failed to send message');
      }

    } catch (e) {
      debugPrint('❌ Failed to send channel message: $e');
      rethrow;
    }
  }
  
  /// Send a message to a conversation using REST API
  Future<RealtimeMessage> sendConversationMessage({
    required String conversationId,
    required String content,
    String? contentHtml,
    List<AttachmentDto>? attachments,
    List<String>? mentions,
    String? parentId,
    List<Map<String, dynamic>>? linkedContent,
  }) async {
    if (!_initialized || _currentWorkspaceId == null) {
      throw Exception('SocketIOChatService not initialized');
    }

    try {
      debugPrint('📤 Sending conversation message: $conversationId');

      final dto = SendMessageDto(
        content: content,
        contentHtml: contentHtml,
        attachments: attachments,
        mentions: mentions,
        parentId: parentId,
        linkedContent: linkedContent,
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

        // Note: Backend will emit 'new_message' to other clients via Socket.IO
        // No need to emit here as the REST API already handled it

        return realtimeMessage;
      } else {
        throw Exception(response.message ?? 'Failed to send message');
      }

    } catch (e) {
      debugPrint('❌ Failed to send conversation message: $e');
      rethrow;
    }
  }
  
  // ==================== TYPING INDICATORS ====================
  
  /// Send typing indicator
  Future<void> sendTypingIndicator({
    required String channelId,
    bool isConversation = false,
  }) async {
    if (!_initialized || _socket == null || _currentUserId == null) return;
    
    try {
      final typingData = TypingIndicator(
        userId: _currentUserId!,
        userName: _currentUserName ?? 'Unknown User',
        channelId: channelId,
        timestamp: DateTime.now(),
      );
      
      _socket!.emit('user_typing', {
        'channelId': channelId,
        'workspaceId': _currentWorkspaceId,
        'isConversation': isConversation,
        ...typingData.toJson(),
      });
      
      // Set a timer to stop typing after 3 seconds
      _typingTimers[channelId]?.cancel();
      _typingTimers[channelId] = Timer(const Duration(seconds: 3), () {
        stopTypingIndicator(channelId: channelId, isConversation: isConversation);
      });
      
    } catch (e) {
      debugPrint('❌ Failed to send typing indicator: $e');
    }
  }
  
  /// Stop typing indicator
  Future<void> stopTypingIndicator({
    required String channelId,
    bool isConversation = false,
  }) async {
    if (!_initialized || _socket == null || _currentUserId == null) return;
    
    try {
      _socket!.emit('user_stop_typing', {
        'channelId': channelId,
        'workspaceId': _currentWorkspaceId,
        'isConversation': isConversation,
        'userId': _currentUserId,
        'timestamp': DateTime.now().toIso8601String(),
      });
      
      // Cancel timer
      _typingTimers[channelId]?.cancel();
      _typingTimers.remove(channelId);
      
    } catch (e) {
      debugPrint('❌ Failed to stop typing indicator: $e');
    }
  }
  
  // ==================== PRESENCE TRACKING ====================
  
  /// Start presence tracking for the current user
  void _startPresenceTracking() {
    if (!_initialized || _socket == null || _currentUserId == null) return;
    
    try {
      debugPrint('👤 Starting presence tracking for user: $_currentUserName');
      
      // Set initial presence as online
      _updateUserPresence(
        userId: _currentUserId!,
        userName: _currentUserName ?? 'Unknown User',
        status: UserPresenceStatus.online,
      );
      
      // Start heartbeat to maintain presence
      _presenceHeartbeatTimer = Timer.periodic(
        const Duration(seconds: 30),
        (_) => _sendPresenceHeartbeat(),
      );
      
    } catch (e) {
      debugPrint('❌ Failed to start presence tracking: $e');
    }
  }
  
  /// Update user presence status
  Future<void> updatePresenceStatus({
    required UserPresenceStatus status,
    String? statusMessage,
  }) async {
    if (!_initialized || _currentUserId == null) return;
    
    _updateUserPresence(
      userId: _currentUserId!,
      userName: _currentUserName ?? 'Unknown User',
      status: status,
      statusMessage: statusMessage,
    );
  }
  
  /// Internal method to update user presence
  void _updateUserPresence({
    required String userId,
    required String userName,
    required UserPresenceStatus status,
    String? statusMessage,
  }) {
    if (_socket == null) return;
    
    try {
      final presence = UserPresence(
        userId: userId,
        userName: userName,
        status: status,
        lastSeen: DateTime.now(),
        statusMessage: statusMessage,
      );
      
      // Broadcast presence update
      _socket!.emit('user_presence_update', {
        'workspaceId': _currentWorkspaceId,
        ...presence.toJson(),
      });
      
      // Update local cache
      _userPresences[userId] = presence;
      
      // Emit to presence stream
      _presenceController.add(presence);
      
    } catch (e) {
      debugPrint('❌ Failed to update user presence: $e');
    }
  }
  
  /// Send presence heartbeat
  void _sendPresenceHeartbeat() {
    if (_currentUserId != null && _currentUserName != null) {
      _updateUserPresence(
        userId: _currentUserId!,
        userName: _currentUserName!,
        status: UserPresenceStatus.online,
      );
    }
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
    if (_socket == null) return;
    
    try {
      _socket!.emit('message_read', {
        'messageId': messageId,
        'workspaceId': _currentWorkspaceId,
        'readBy': _currentUserId,
      });
    } catch (e) {
      debugPrint('❌ Failed to mark message as read: $e');
    }
  }
  
  /// Mark all messages in channel as read
  Future<void> markChannelAsRead(String channelId) async {
    if (_socket == null) return;
    
    try {
      _socket!.emit('channel_read', {
        'channelId': channelId,
        'workspaceId': _currentWorkspaceId,
        'readBy': _currentUserId,
      });
      
      debugPrint('✅ Marked channel as read: $channelId');
    } catch (e) {
      debugPrint('❌ Failed to mark channel as read: $e');
    }
  }
  
  // ==================== EVENT HANDLERS ====================
  
  /// Handle new message event
  /// Supports multiple data formats from backend:
  /// 1. Direct message: { id, content, userId, ... }
  /// 2. Wrapped message: { message: { id, content, userId, ... } }
  /// 3. Data array: { data: [{ id, content, userId, ... }] }
  void _handleNewMessage(dynamic data) {
    try {
      debugPrint('📥 _handleNewMessage called');
      debugPrint('   Data is Map: ${data is Map<String, dynamic>}');
      debugPrint('   Data: $data');

      if (data is Map<String, dynamic>) {
        // Extract actual message data from various wrapper formats
        dynamic messageData = data;

        // Check if message is wrapped in { message: {...} }
        if (data.containsKey('message') && data['message'] is Map<String, dynamic>) {
          messageData = data['message'];
          debugPrint('   📦 Unwrapped message from "message" key');
        }

        // Check if message is wrapped in { data: [...] } structure
        if (messageData is Map<String, dynamic> && messageData.containsKey('data')) {
          final dataArray = messageData['data'];
          if (dataArray is List && dataArray.isNotEmpty) {
            messageData = dataArray[0];
            debugPrint('   📦 Unwrapped message from "data" array');
          }
        }

        // Ensure messageData is a Map
        if (messageData is! Map<String, dynamic>) {
          debugPrint('   ⚠️ messageData is not a Map<String, dynamic>: ${messageData.runtimeType}');
          return;
        }

        debugPrint('   Parsing message from JSON...');
        final message = Message.fromJson(messageData);
        debugPrint('   Message parsed successfully:');
        debugPrint('      ID: ${message.id}');
        debugPrint('      Content: ${message.content}');
        debugPrint('      User: ${message.userId}');
        debugPrint('      Channel: ${message.channelId}');
        debugPrint('      Conversation: ${message.conversationId}');

        final realtimeMessage = RealtimeMessage.fromMessage(
          message,
          deliveryStatus: MessageDeliveryStatus.delivered,
        );

        debugPrint('   Adding message to stream...');
        _messageController.add(realtimeMessage);
        debugPrint('   ✅ Message added to stream successfully');
      } else {
        debugPrint('   ⚠️ Data is not a Map<String, dynamic>');
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Error handling new message: $e');
      debugPrint('Stack trace: $stackTrace');
    }
  }
  
  /// Handle message updated event
  void _handleMessageUpdated(dynamic data) {
    try {
      debugPrint('📥 _handleMessageUpdated called');
      debugPrint('   Data: $data');

      if (data is Map<String, dynamic>) {
        // Backend sends different structures:
        // 1. Workspace-wide: { message: { data: [{...}], count: 1 }, conversation_id: '...' }
        // 2. Room-specific: { message: {...}, conversation_id: '...' }

        dynamic messageData = data['message'] ?? data;

        // Check if message is wrapped in { data: [...], count: ... } structure
        if (messageData is Map<String, dynamic> && messageData.containsKey('data')) {
          final dataArray = messageData['data'];
          if (dataArray is List && dataArray.isNotEmpty) {
            messageData = dataArray[0]; // Extract first message from array
            debugPrint('   📦 Unwrapped message from data array');
          }
        }

        debugPrint('   Parsing message from JSON...');
        final message = Message.fromJson(messageData);
        debugPrint('   Message parsed: ${message.id}, content: ${message.content}');

        final realtimeMessage = RealtimeMessage.fromMessage(message);

        debugPrint('   Adding updated message to stream...');
        _messageController.add(realtimeMessage);
        debugPrint('   ✅ Updated message added to stream successfully');
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Error handling message update: $e');
      debugPrint('Stack trace: $stackTrace');
    }
  }
  
  /// Handle message deleted event
  void _handleMessageDeleted(dynamic data) {
    try {
      debugPrint('📥 _handleMessageDeleted called');
      debugPrint('   Data: $data');

      if (data is Map<String, dynamic>) {
        // Backend sends: { messageId: '...', conversation_id: '...', channel_id: '...' }
        String? messageId = data['messageId'] as String?;
        String? conversationId = data['conversation_id'] as String?;
        String? channelId = data['channel_id'] as String?;

        // Sometimes backend might wrap the data differently for workspace events
        // Check if there's a nested structure
        if (messageId == null && data.containsKey('message')) {
          final messageData = data['message'];
          if (messageData is Map<String, dynamic>) {
            messageId = messageData['id'] as String?;
            conversationId = messageData['conversation_id'] as String?;
            channelId = messageData['channel_id'] as String?;
          }
        }

        if (messageId == null) {
          debugPrint('⚠️ No message ID found in delete event');
          return;
        }

        debugPrint('   Message ID: $messageId');
        debugPrint('   Creating deleted message marker...');

        // Create a minimal message object to signal deletion
        final deletedMessage = Message(
          id: messageId,
          content: '[Deleted]',
          userId: '',
          channelId: channelId,
          conversationId: conversationId,
          isEdited: false,
          isDeleted: true,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        final realtimeMessage = RealtimeMessage.fromMessage(deletedMessage);

        debugPrint('   Adding deleted message to stream...');
        _messageController.add(realtimeMessage);
        debugPrint('   ✅ Deleted message added to stream successfully');
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Error handling message deletion: $e');
      debugPrint('Stack trace: $stackTrace');
    }
  }
  
  /// Handle user typing event
  void _handleUserTyping(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        final typingIndicator = TypingIndicator.fromJson(data);
        
        // Don't show our own typing
        if (typingIndicator.userId != _currentUserId) {
          _typingController.add(typingIndicator);
          
          // Add to typing users list
          final channelId = typingIndicator.channelId;
          _typingUsers[channelId] ??= [];
          if (!_typingUsers[channelId]!.contains(typingIndicator.userId)) {
            _typingUsers[channelId]!.add(typingIndicator.userId);
          }
          
          // Set timer to remove typing indicator
          Timer(const Duration(seconds: 5), () {
            _typingUsers[channelId]?.remove(typingIndicator.userId);
          });
        }
      }
    } catch (e) {
      debugPrint('❌ Error handling typing event: $e');
    }
  }
  
  /// Handle user stop typing event
  void _handleUserStopTyping(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        final userId = data['userId'];
        final channelId = data['channelId'];
        _typingUsers[channelId]?.remove(userId);
      }
    } catch (e) {
      debugPrint('❌ Error handling stop typing event: $e');
    }
  }
  
  /// Handle presence update event
  void _handlePresenceUpdate(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        final presence = UserPresence.fromJson(data);
        
        // Update local cache
        _userPresences[presence.userId] = presence;
        
        // Emit to presence stream
        _presenceController.add(presence);
      }
    } catch (e) {
      debugPrint('❌ Error handling presence event: $e');
    }
  }
  
  /// Handle message delivered event
  void _handleMessageDelivered(dynamic data) {
    try {
      _deliveryStatusController.add(MessageDeliveryStatus.delivered);
    } catch (e) {
      debugPrint('❌ Error handling message delivered: $e');
    }
  }
  
  /// Handle message read event
  void _handleMessageRead(dynamic data) {
    try {
      _deliveryStatusController.add(MessageDeliveryStatus.read);

      // Emit read receipt data to stream for UI update
      // Handle both Map and other types
      dynamic messageIds;
      dynamic userId;

      if (data is Map) {
        messageIds = data['messageIds'] ?? data['message_ids'];
        userId = data['userId'] ?? data['user_id'];
        debugPrint('   Parsed messageIds: $messageIds, userId: $userId');
      }

      if (messageIds != null) {
        final List<dynamic> idsList = messageIds is List ? messageIds : [messageIds];
        debugPrint('👁️ Emitting read receipt to stream: messageIds=$idsList, userId=$userId');
        _readReceiptController.add({
          'messageIds': idsList,
          'userId': userId,
        });
      } else {
        debugPrint('⚠️ No messageIds found in read event data');
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Error handling message read: $e');
      debugPrint('   Stack: $stackTrace');
    }
  }

  /// Handle message pinned/unpinned event
  void _handleMessagePinned(dynamic data) {
    try {
      debugPrint('📌 Message pinned event received: $data');
      debugPrint('   Data type: ${data.runtimeType}');

      if (data is Map) {
        final messageId = data['messageId'] ?? data['message_id'];
        final pinned = data['pinned'] ?? false;
        final conversationId = data['conversationId'] ?? data['conversation_id'];

        debugPrint('   Parsed: messageId=$messageId, pinned=$pinned, conversationId=$conversationId');

        _pinController.add({
          'messageId': messageId,
          'pinned': pinned,
          'conversationId': conversationId,
        });
      } else {
        debugPrint('⚠️ Unexpected data format for pin event');
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Error handling message pinned: $e');
      debugPrint('   Stack: $stackTrace');
    }
  }

  // ==================== VIDEO CALL OPERATIONS ====================

  /// Initiate a video call
  Future<String?> initiateVideoCall({
    String? channelId,
    String? conversationId,
    List<String> participantIds = const [],
    bool isVideoCall = true,
  }) async {
    if (!_initialized || _socket == null || _currentUserId == null) {
      debugPrint('❌ Cannot initiate call: service not initialized');
      return null;
    }

    try {
      final callId = 'call_${DateTime.now().millisecondsSinceEpoch}';
      debugPrint('📞 Initiating ${isVideoCall ? 'video' : 'audio'} call: $callId');

      _socket!.emit('initiate_video_call', {
        'callId': callId,
        'workspaceId': _currentWorkspaceId,
        'channelId': channelId,
        'conversationId': conversationId,
        'fromUserId': _currentUserId,
        'fromUserName': _currentUserName,
        'participantIds': participantIds,
        'isVideoCall': isVideoCall,
        'timestamp': DateTime.now().toIso8601String(),
      });

      debugPrint('✅ Video call initiated: $callId');
      return callId;
    } catch (e) {
      debugPrint('❌ Failed to initiate video call: $e');
      return null;
    }
  }

  /// Accept a video call
  Future<void> acceptVideoCall(String callId) async {
    if (!_initialized || _socket == null || _currentUserId == null) return;

    try {

      _socket!.emit('accept_video_call', {
        'callId': callId,
        'workspaceId': _currentWorkspaceId,
        'userId': _currentUserId,
        'userName': _currentUserName,
        'timestamp': DateTime.now().toIso8601String(),
      });

    } catch (e) {
    }
  }

  /// Reject a video call
  Future<void> rejectVideoCall(String callId) async {
    if (!_initialized || _socket == null || _currentUserId == null) return;

    try {

      _socket!.emit('reject_video_call', {
        'callId': callId,
        'workspaceId': _currentWorkspaceId,
        'userId': _currentUserId,
        'timestamp': DateTime.now().toIso8601String(),
      });

    } catch (e) {
    }
  }

  /// End a video call
  Future<void> endVideoCall(String callId) async {
    if (!_initialized || _socket == null || _currentUserId == null) return;

    try {

      _socket!.emit('end_video_call', {
        'callId': callId,
        'workspaceId': _currentWorkspaceId,
        'userId': _currentUserId,
        'timestamp': DateTime.now().toIso8601String(),
      });

    } catch (e) {
    }
  }

  /// Cancel a video call (before it's answered)
  Future<void> cancelVideoCall(String callId) async {
    if (!_initialized || _socket == null || _currentUserId == null) return;

    try {

      _socket!.emit('cancel_video_call', {
        'callId': callId,
        'workspaceId': _currentWorkspaceId,
        'userId': _currentUserId,
        'timestamp': DateTime.now().toIso8601String(),
      });

    } catch (e) {
    }
  }

  // ==================== VIDEO CALL EVENT HANDLERS ====================

  /// Handle incoming video call event
  void _handleVideoCallIncoming(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        final event = VideoCallEvent.fromJson(data);
        _videoCallController.add(event);
      }
    } catch (e) {
    }
  }

  /// Handle video call accepted event
  void _handleVideoCallAccepted(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        final event = VideoCallEvent.fromJson(data);
        _videoCallController.add(event);
      }
    } catch (e) {
    }
  }

  /// Handle video call rejected event
  void _handleVideoCallRejected(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        final event = VideoCallEvent.fromJson(data);
        _videoCallController.add(event);
      }
    } catch (e) {
    }
  }

  /// Handle video call ended event
  void _handleVideoCallEnded(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        final event = VideoCallEvent.fromJson(data);
        _videoCallController.add(event);
      }
    } catch (e) {
    }
  }

  /// Handle video call cancelled event
  void _handleVideoCallCancelled(dynamic data) {
    try {
      debugPrint('📞 [SocketIOChatService] _handleVideoCallCancelled called with data: $data');
      if (data is Map<String, dynamic>) {
        final event = VideoCallEvent.fromJson(data);
        debugPrint('📞 [SocketIOChatService] Parsed VideoCallEvent - callId: ${event.callId}, type: ${event.type}');

        // ⭐ CRITICAL: Dismiss CallKit notification on iOS when call is cancelled
        // This handles the case where caller ends the call while callee's phone is ringing
        if (Platform.isIOS && event.callId.isNotEmpty) {
          debugPrint('📞 [SocketIOChatService] iOS detected - dismissing CallKit for callId: ${event.callId}');
          CallKitService.instance.endCall(event.callId);
        }

        _videoCallController.add(event);
        debugPrint('📞 [SocketIOChatService] Added event to _videoCallController');
      }
    } catch (e) {
      debugPrint('❌ [SocketIOChatService] Error in _handleVideoCallCancelled: $e');
    }
  }

  /// Handle external video call event (forwarded from VideoCallSocketService)
  /// This allows events from the /video-calls namespace to be processed by the main service
  void handleExternalVideoCallEvent(Map<String, dynamic> data, String eventType) {
    try {
      debugPrint('📞 [SocketIOChatService] handleExternalVideoCallEvent called - type: $eventType, data: $data');
      // Ensure the type is set in the data
      final eventData = Map<String, dynamic>.from(data);
      eventData['type'] = eventType;
      final event = VideoCallEvent.fromJson(eventData);
      debugPrint('📞 [SocketIOChatService] Parsed external event - callId: ${event.callId}, type: ${event.type}');

      // ⭐ CRITICAL: Dismiss CallKit notification on iOS when call is cancelled
      if (Platform.isIOS && eventType == 'cancelled' && event.callId.isNotEmpty) {
        debugPrint('📞 [SocketIOChatService] iOS detected - dismissing CallKit for external cancelled event, callId: ${event.callId}');
        CallKitService.instance.endCall(event.callId);
      }

      _videoCallController.add(event);
      debugPrint('📞 [SocketIOChatService] Added external event to _videoCallController');
    } catch (e) {
      debugPrint('❌ [SocketIOChatService] Error in handleExternalVideoCallEvent: $e');
    }
  }

  /// Handle participant joined event
  void _handleVideoCallParticipantJoined(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        final event = VideoCallEvent.fromJson(data);
        _videoCallController.add(event);
      }
    } catch (e) {
    }
  }

  /// Handle participant left event
  void _handleVideoCallParticipantLeft(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        final event = VideoCallEvent.fromJson(data);
        _videoCallController.add(event);
      }
    } catch (e) {
    }
  }

  /// Handle notification event from Socket.IO
  void _handleNotificationEvent(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {

        // Emit to notification stream for NotificationService to handle
        _notificationController.add(data);

      } else {
      }
    } catch (e) {
    }
  }

  /// Handle approval event from Socket.IO
  void _handleApprovalEvent(String eventType, dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        // Add event type to the data so listeners know which event it is
        final eventData = {
          'eventType': eventType,
          ...data,
        };
        // Emit to approval stream for ApprovalsScreen to handle
        _approvalController.add(eventData);
      }
    } catch (e) {
      debugPrint('Error handling approval event: $e');
    }
  }

  /// Handle member left event from Socket.IO
  void _handleMemberLeft(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {

        // Emit to member left stream
        _memberLeftController.add(data);

      } else {
      }
    } catch (e) {
    }
  }

  /// Handle reaction event from Socket.IO
  void _handleReactionEvent(dynamic data, String eventType) {
    try {
      debugPrint('🔔 Processing reaction $eventType event...');
      if (data is Map<String, dynamic>) {
        final messageId = data['messageId'] ?? data['message_id'];
        final emoji = data['emoji'] ?? data['reaction'];
        final userId = data['userId'] ?? data['user_id'];

        debugPrint('   Message ID: $messageId');
        debugPrint('   Emoji: $emoji');
        debugPrint('   User ID: $userId');
        debugPrint('   Event type: $eventType');

        // Add event type to the data
        final reactionData = Map<String, dynamic>.from(data);
        reactionData['eventType'] = eventType;
        reactionData['messageId'] = messageId;
        reactionData['emoji'] = emoji;
        reactionData['userId'] = userId;

        // Emit to reaction stream
        _reactionController.add(reactionData);

        debugPrint('✅ Reaction $eventType event emitted to stream');
      } else {
        debugPrint('⚠️ Invalid reaction data format: ${data.runtimeType}');
      }
    } catch (e) {
      debugPrint('❌ Error handling reaction $eventType event: $e');
    }
  }

  /// Handle workspace-wide new message event (for unread count updates AND chat display)
  void _handleWorkspaceMessage(dynamic data) {
    try {
      debugPrint('📬 Processing workspace message event...');
      if (data is Map<String, dynamic>) {
        // Extract relevant data
        final channelId = data['channelId'] ?? data['channel_id'];
        final conversationId = data['conversationId'] ?? data['conversation_id'];
        final type = data['type']; // 'channel' or 'conversation'

        debugPrint('   Type: $type');
        debugPrint('   Channel ID: $channelId');
        debugPrint('   Conversation ID: $conversationId');

        // Emit to workspace message stream (for unread count updates)
        _workspaceMessageController.add({
          'type': type,
          'channelId': channelId,
          'conversationId': conversationId,
          ...data,
        });

        debugPrint('✅ Workspace message event emitted to stream');

        // IMPORTANT: Also emit to message stream for chat screen to display
        // This is needed because REST API messages (including bot responses)
        // are emitted via message:new:workspace, not new_message
        final messageData = data['message'];
        if (messageData is Map<String, dynamic>) {
          debugPrint('   📨 Message data found, emitting to message stream...');
          debugPrint('   Message content: ${messageData['content']}');
          debugPrint('   Message user_id: ${messageData['user_id']}');

          try {
            final message = Message.fromJson(messageData);
            final realtimeMessage = RealtimeMessage.fromMessage(
              message,
              deliveryStatus: MessageDeliveryStatus.delivered,
            );

            _messageController.add(realtimeMessage);
            debugPrint('   ✅ Message also emitted to message stream for chat display');
          } catch (e) {
            debugPrint('   ⚠️ Failed to parse message for chat display: $e');
          }
        }
      } else {
        debugPrint('⚠️ Invalid workspace message data format: ${data.runtimeType}');
      }
    } catch (e) {
      debugPrint('❌ Error handling workspace message event: $e');
    }
  }

  /// Handle channel read event (when a channel is marked as read)
  void _handleChannelRead(dynamic data) {
    try {
      debugPrint('✅ Processing channel read event...');
      if (data is Map<String, dynamic>) {
        final channelId = data['channelId'] ?? data['channel_id'];

        debugPrint('   Channel ID: $channelId');

        // Emit to channel read stream
        _channelReadController.add({
          'channelId': channelId,
          ...data,
        });

        debugPrint('✅ Channel read event emitted to stream');
      } else {
        debugPrint('⚠️ Invalid channel read data format: ${data.runtimeType}');
      }
    } catch (e) {
      debugPrint('❌ Error handling channel read event: $e');
    }
  }

  /// Handle conversation read event (when a conversation is marked as read)
  void _handleConversationRead(dynamic data) {
    try {
      debugPrint('✅ Processing conversation read event...');
      if (data is Map<String, dynamic>) {
        final conversationId = data['conversationId'] ?? data['conversation_id'];

        debugPrint('   Conversation ID: $conversationId');

        // Emit to conversation read stream
        _conversationReadController.add({
          'conversationId': conversationId,
          ...data,
        });

        debugPrint('✅ Conversation read event emitted to stream');
      } else {
        debugPrint('⚠️ Invalid conversation read data format: ${data.runtimeType}');
      }
    } catch (e) {
      debugPrint('❌ Error handling conversation read event: $e');
    }
  }

  /// Handle message bookmarked event
  void _handleMessageBookmarked(dynamic data) {
    try {
      debugPrint('🔖 Processing message bookmarked event...');
      if (data is Map<String, dynamic>) {
        final messageId = data['messageId'] ?? data['message_id'];
        final userId = data['userId'] ?? data['user_id'];

        // Check multiple possible field names for bookmark status
        // The event uses 'bookmarked', nested message uses 'is_bookmarked'
        final messageData = data['message'] as Map<String, dynamic>?;
        final isBookmarked = data['bookmarked'] ??
                             data['isBookmarked'] ??
                             data['is_bookmarked'] ??
                             messageData?['is_bookmarked'] ??
                             true;

        debugPrint('   Message ID: $messageId');
        debugPrint('   Is Bookmarked: $isBookmarked');
        debugPrint('   User ID: $userId');

        // Emit to bookmark stream
        _bookmarkController.add({
          'messageId': messageId,
          'isBookmarked': isBookmarked,
          'userId': userId,
          ...data,
        });

        debugPrint('✅ Bookmark event emitted to stream');
      } else {
        debugPrint('⚠️ Invalid bookmark data format: ${data.runtimeType}');
      }
    } catch (e) {
      debugPrint('❌ Error handling bookmark event: $e');
    }
  }

  /// Handle poll event (voted or closed)
  void _handlePollEvent(dynamic data, String eventType) {
    try {
      debugPrint('🗳️ Processing poll $eventType event...');
      if (data is Map<String, dynamic>) {
        final messageId = data['messageId'] ?? data['message_id'];
        final pollId = data['pollId'] ?? data['poll_id'];
        final poll = data['poll'];

        debugPrint('   Message ID: $messageId');
        debugPrint('   Poll ID: $pollId');
        debugPrint('   Event type: $eventType');

        // Emit to poll stream
        _pollController.add({
          'eventType': eventType,
          'messageId': messageId,
          'pollId': pollId,
          'poll': poll,
          ...data,
        });

        debugPrint('✅ Poll $eventType event emitted to stream');
      } else {
        debugPrint('⚠️ Invalid poll data format: ${data.runtimeType}');
      }
    } catch (e) {
      debugPrint('❌ Error handling poll $eventType event: $e');
    }
  }

  // ==================== REACTION OPERATIONS ====================

  /// Add reaction to a message via WebSocket (same as web frontend)
  void addReaction({
    required String messageId,
    required String emoji,
  }) {
    if (_socket == null && _rootSocket == null) {
      debugPrint('❌ Cannot add reaction: no socket connection');
      return;
    }

    try {
      final data = {
        'messageId': messageId,
        'emoji': emoji,
      };

      // Emit on root socket (where AppGateway listens)
      if (_rootSocket != null && _rootSocket!.connected) {
        _rootSocket!.emit('add_reaction', data);
        debugPrint('📤 Emitted add_reaction via root socket: $emoji for message: $messageId');
      } else if (_socket != null && _socket!.connected) {
        _socket!.emit('add_reaction', data);
        debugPrint('📤 Emitted add_reaction via chat socket: $emoji for message: $messageId');
      }
    } catch (e) {
      debugPrint('❌ Error emitting add_reaction: $e');
    }
  }

  /// Remove reaction from a message via WebSocket (same as web frontend)
  void removeReaction({
    required String messageId,
    required String emoji,
  }) {
    if (_socket == null && _rootSocket == null) {
      debugPrint('❌ Cannot remove reaction: no socket connection');
      return;
    }

    try {
      final data = {
        'messageId': messageId,
        'emoji': emoji,
      };

      // Emit on root socket (where AppGateway listens)
      if (_rootSocket != null && _rootSocket!.connected) {
        _rootSocket!.emit('remove_reaction', data);
        debugPrint('📤 Emitted remove_reaction via root socket: $emoji for message: $messageId');
      } else if (_socket != null && _socket!.connected) {
        _socket!.emit('remove_reaction', data);
        debugPrint('📤 Emitted remove_reaction via chat socket: $emoji for message: $messageId');
      }
    } catch (e) {
      debugPrint('❌ Error emitting remove_reaction: $e');
    }
  }

  // ==================== WEBRTC SIGNALING OPERATIONS ====================

  /// Send WebRTC offer
  void sendWebRTCOffer(String callId, RTCSessionDescription offer, {String? to}) {
    if (_socket == null) return;

    try {
      _socket!.emit('webrtc:offer', {
        'callId': callId,
        'to': to, // Recipient user ID
        'offer': {
          'type': offer.type,
          'sdp': offer.sdp,
        },
      });
    } catch (e) {
    }
  }

  /// Send WebRTC answer
  void sendWebRTCAnswer(String callId, RTCSessionDescription answer, {String? to}) {
    if (_socket == null) return;

    try {
      _socket!.emit('webrtc:answer', {
        'callId': callId,
        'to': to, // Recipient user ID
        'answer': {
          'type': answer.type,
          'sdp': answer.sdp,
        },
      });
    } catch (e) {
    }
  }

  /// Send ICE candidate
  void sendICECandidate(String callId, RTCIceCandidate candidate, {String? to}) {
    if (_socket == null) return;

    try {
      _socket!.emit('webrtc:ice-candidate', {
        'callId': callId,
        'to': to, // Recipient user ID
        'candidate': {
          'candidate': candidate.candidate,
          'sdpMid': candidate.sdpMid,
          'sdpMLineIndex': candidate.sdpMLineIndex,
        },
      });
    } catch (e) {
    }
  }

  /// Toggle media in call (audio/video/screen)
  void toggleMediaInCall(String callId, String mediaType, bool enabled) {
    if (_socket == null) return;

    try {
      _socket!.emit('media:toggle', {
        'callId': callId,
        'mediaType': mediaType, // 'audio', 'video', 'screen'
        'enabled': enabled,
        'userId': _currentUserId,
      });
    } catch (e) {
    }
  }

  // ==================== WEBRTC EVENT HANDLERS ====================

  /// Handle WebRTC offer
  void _handleWebRTCOffer(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        _webrtcOfferController.add(data);
      }
    } catch (e) {
    }
  }

  /// Handle WebRTC answer
  void _handleWebRTCAnswer(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        _webrtcAnswerController.add(data);
      }
    } catch (e) {
    }
  }

  /// Handle ICE candidate
  void _handleICECandidate(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        _iceCandidateController.add(data);
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
  
  /// Check if socket is connected
  bool get isConnected => _socket?.connected ?? false;
  
  /// Unsubscribe from channel messages
  Future<void> unsubscribeFromChannel(String channelId) async {
    if (_socket == null) return;
    
    _socket!.emit('leave_channel', {
      'channelId': channelId,
      'workspaceId': _currentWorkspaceId,
    });

  }
  
  /// Unsubscribe from conversation messages
  Future<void> unsubscribeFromConversation(String conversationId) async {
    if (_socket == null) return;

    _socket!.emit('leave_conversation', {
      'conversationId': conversationId,
      'workspaceId': _currentWorkspaceId,
    });

  }

  /// Helper method to convert message to JSON for Socket.IO
  Map<String, dynamic> _messageToJson(Message message) {
    return {
      'id': message.id,
      'content': message.content,
      'content_html': message.contentHtml,
      'user_id': message.userId,
      'sender_name': message.senderName,
      'sender_avatar': message.senderAvatar,
      'channel_id': message.channelId,
      'conversation_id': message.conversationId,
      'thread_id': message.threadId,
      'parent_id': message.parentId,
      'reply_count': message.replyCount,
      'attachments': message.attachments,
      'mentions': message.mentions,
      'reactions': message.reactions,
      'collaborative_data': message.collaborativeData,
      'is_edited': message.isEdited,
      'is_deleted': message.isDeleted,
      'created_at': message.createdAt.toIso8601String(),
      'updated_at': message.updatedAt.toIso8601String(),
    };
  }
}

/// Extension methods for Message class
extension MessageExtension on Message {
  Message copyWith({
    String? id,
    String? content,
    String? contentHtml,
    String? userId,
    String? senderName,
    String? senderAvatar,
    String? channelId,
    String? conversationId,
    String? threadId,
    String? parentId,
    int? replyCount,
    List<dynamic>? attachments,
    List<dynamic>? mentions,
    Map<String, dynamic>? reactions,
    Map<String, dynamic>? collaborativeData,
    bool? isEdited,
    bool? isDeleted,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Message(
      id: id ?? this.id,
      content: content ?? this.content,
      contentHtml: contentHtml ?? this.contentHtml,
      userId: userId ?? this.userId,
      senderName: senderName ?? this.senderName,
      senderAvatar: senderAvatar ?? this.senderAvatar,
      channelId: channelId ?? this.channelId,
      conversationId: conversationId ?? this.conversationId,
      threadId: threadId ?? this.threadId,
      parentId: parentId ?? this.parentId,
      replyCount: replyCount ?? this.replyCount,
      attachments: attachments ?? this.attachments,
      mentions: mentions ?? this.mentions,
      reactions: reactions ?? this.reactions,
      collaborativeData: collaborativeData ?? this.collaborativeData,
      isEdited: isEdited ?? this.isEdited,
      isDeleted: isDeleted ?? this.isDeleted,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}