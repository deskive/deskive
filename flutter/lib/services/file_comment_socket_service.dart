import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/env_config.dart';
import '../config/app_config.dart';
import '../models/file/file_comment.dart';

/// Socket.IO service for real-time file comment updates
class FileCommentSocketService {
  static FileCommentSocketService? _instance;
  static FileCommentSocketService get instance =>
      _instance ??= FileCommentSocketService._();

  FileCommentSocketService._();

  IO.Socket? _socket;
  bool _initialized = false;
  String? _currentFileId;
  String? _currentWorkspaceId;
  String? _currentUserId;

  // Stream controllers for broadcasting events
  final StreamController<FileComment> _commentCreatedController =
      StreamController<FileComment>.broadcast();
  final StreamController<FileComment> _commentUpdatedController =
      StreamController<FileComment>.broadcast();
  final StreamController<String> _commentDeletedController =
      StreamController<String>.broadcast();
  final StreamController<Map<String, dynamic>> _commentResolvedController =
      StreamController<Map<String, dynamic>>.broadcast();

  // Stream getters
  Stream<FileComment> get commentCreatedStream =>
      _commentCreatedController.stream;
  Stream<FileComment> get commentUpdatedStream =>
      _commentUpdatedController.stream;
  Stream<String> get commentDeletedStream => _commentDeletedController.stream;
  Stream<Map<String, dynamic>> get commentResolvedStream =>
      _commentResolvedController.stream;

  /// Initialize the socket service
  Future<void> initialize({
    required String workspaceId,
    required String userId,
  }) async {
    if (_initialized) return;

    try {
      debugPrint('🔧 Initializing FileCommentSocketService...');

      _currentWorkspaceId = workspaceId;
      _currentUserId = userId;

      final authToken = await AppConfig.getAccessToken();
      final socketUrl = EnvConfig.websocketUrl;

      debugPrint('🔌 Connecting to socket: $socketUrl');

      _socket = IO.io(
        socketUrl,
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

      _setupSocketListeners();
      _socket!.connect();

      _initialized = true;
      debugPrint('✅ FileCommentSocketService initialized');
    } catch (e) {
      debugPrint('❌ Failed to initialize FileCommentSocketService: $e');
      rethrow;
    }
  }

  /// Set up socket event listeners
  void _setupSocketListeners() {
    if (_socket == null) return;

    _socket!.onConnect((_) {
      debugPrint('✅ FileCommentSocketService connected');
      debugPrint('   Socket ID: ${_socket!.id}');

      // Join workspace room
      if (_currentWorkspaceId != null) {
        _socket!.emit('join:workspace', {
          'workspaceId': _currentWorkspaceId,
        });
      }

      // Rejoin file comment room if we had one
      if (_currentFileId != null) {
        _joinRoom(_currentFileId!);
      }
    });

    _socket!.onDisconnect((reason) {
      debugPrint('🔌 FileCommentSocketService disconnected: $reason');
    });

    _socket!.onConnectError((error) {
      debugPrint('❌ FileCommentSocketService connection error: $error');
    });

    // Listen for comment events
    _socket!.on('file:comment:created', _handleCommentCreated);
    _socket!.on('file:comment:updated', _handleCommentUpdated);
    _socket!.on('file:comment:deleted', _handleCommentDeleted);
    _socket!.on('file:comment:resolved', _handleCommentResolved);

    // Debug: Log all events
    _socket!.onAny((event, data) {
      if (event.toString().contains('comment')) {
        debugPrint('🔔 [FileComment] Event: $event');
        debugPrint('   Data: $data');
      }
    });
  }

  /// Join a file's comment room for real-time updates
  Future<void> joinFileCommentRoom(String fileId) async {
    if (!_initialized || _socket == null) {
      debugPrint('⚠️ FileCommentSocketService not initialized, attempting init...');
      // Try to get the current workspace and user from the existing socket service
      return;
    }

    // Leave previous room if any
    if (_currentFileId != null && _currentFileId != fileId) {
      await leaveFileCommentRoom(_currentFileId!);
    }

    _currentFileId = fileId;
    _joinRoom(fileId);
  }

  void _joinRoom(String fileId) {
    final room = 'file:$fileId:comments';
    debugPrint('📤 Joining room: $room');

    _socket!.emit('join:room', {'room': room});
  }

  /// Leave a file's comment room
  Future<void> leaveFileCommentRoom(String fileId) async {
    if (_socket == null) return;

    final room = 'file:$fileId:comments';
    debugPrint('📤 Leaving room: $room');

    _socket!.emit('leave:room', {'room': room});

    if (_currentFileId == fileId) {
      _currentFileId = null;
    }
  }

  /// Handle comment created event
  void _handleCommentCreated(dynamic data) {
    try {
      debugPrint('📥 Comment created event received');
      debugPrint('   Data: $data');

      if (data is Map<String, dynamic>) {
        final commentData = data['comment'] ?? data;
        final comment = FileComment.fromJson(commentData);
        _commentCreatedController.add(comment);
        debugPrint('✅ Comment created: ${comment.id}');
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Error handling comment created: $e');
      debugPrint('Stack: $stackTrace');
    }
  }

  /// Handle comment updated event
  void _handleCommentUpdated(dynamic data) {
    try {
      debugPrint('📥 Comment updated event received');
      debugPrint('   Data: $data');

      if (data is Map<String, dynamic>) {
        final commentData = data['comment'] ?? data;
        final comment = FileComment.fromJson(commentData);
        _commentUpdatedController.add(comment);
        debugPrint('✅ Comment updated: ${comment.id}');
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Error handling comment updated: $e');
      debugPrint('Stack: $stackTrace');
    }
  }

  /// Handle comment deleted event
  void _handleCommentDeleted(dynamic data) {
    try {
      debugPrint('📥 Comment deleted event received');
      debugPrint('   Data: $data');

      if (data is Map<String, dynamic>) {
        final commentId = data['commentId'] ?? data['comment_id'] ?? data['id'];
        if (commentId != null) {
          _commentDeletedController.add(commentId.toString());
          debugPrint('✅ Comment deleted: $commentId');
        }
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Error handling comment deleted: $e');
      debugPrint('Stack: $stackTrace');
    }
  }

  /// Handle comment resolved event
  void _handleCommentResolved(dynamic data) {
    try {
      debugPrint('📥 Comment resolved event received');
      debugPrint('   Data: $data');

      if (data is Map<String, dynamic>) {
        final commentId = data['commentId'] ?? data['comment_id'] ?? data['id'];
        final isResolved = data['isResolved'] ?? data['is_resolved'] ?? false;

        _commentResolvedController.add({
          'commentId': commentId,
          'isResolved': isResolved,
        });
        debugPrint('✅ Comment resolved status: $commentId -> $isResolved');
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Error handling comment resolved: $e');
      debugPrint('Stack: $stackTrace');
    }
  }

  /// Check if service is initialized
  bool get isInitialized => _initialized;

  /// Check if socket is connected
  bool get isConnected => _socket?.connected ?? false;

  /// Get current file ID
  String? get currentFileId => _currentFileId;

  /// Dispose of the service
  void dispose() {
    debugPrint('🧹 Disposing FileCommentSocketService');

    // Leave current room if any
    if (_currentFileId != null) {
      leaveFileCommentRoom(_currentFileId!);
    }

    // Disconnect socket
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;

    // Close stream controllers
    _commentCreatedController.close();
    _commentUpdatedController.close();
    _commentDeletedController.close();
    _commentResolvedController.close();

    _initialized = false;
    _currentFileId = null;
    _currentWorkspaceId = null;
    _currentUserId = null;

    debugPrint('✅ FileCommentSocketService disposed');
  }

  /// Reset the singleton instance (for testing or re-initialization)
  static void reset() {
    _instance?.dispose();
    _instance = null;
  }
}
