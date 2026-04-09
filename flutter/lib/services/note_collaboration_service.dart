import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/env_config.dart';
import '../config/app_config.dart';

/// User presence status in collaboration session
enum CollaborationStatus {
  online,
  away,
  editing,
}

/// Represents a collaborator in a note editing session
class CollaborationUser {
  final String id;
  final String name;
  final String? avatar;
  final String color;
  final int? cursorIndex;
  final int? selectionLength;
  final DateTime joinedAt;
  final CollaborationStatus status;

  CollaborationUser({
    required this.id,
    required this.name,
    this.avatar,
    required this.color,
    this.cursorIndex,
    this.selectionLength,
    required this.joinedAt,
    this.status = CollaborationStatus.online,
  });

  factory CollaborationUser.fromJson(Map<String, dynamic> json) {
    return CollaborationUser(
      id: json['id'] ?? json['userId'] ?? '',
      name: json['name'] ?? json['userName'] ?? 'User',
      avatar: json['avatar'] ?? json['userAvatar'],
      color: json['color'] ?? json['userColor'] ?? '#3B82F6',
      cursorIndex: json['cursorIndex'] ?? json['index'],
      selectionLength: json['selectionLength'] ?? json['length'],
      joinedAt: json['joinedAt'] != null
          ? DateTime.parse(json['joinedAt'])
          : DateTime.now(),
      status: CollaborationStatus.online,
    );
  }

  CollaborationUser copyWith({
    String? id,
    String? name,
    String? avatar,
    String? color,
    int? cursorIndex,
    int? selectionLength,
    DateTime? joinedAt,
    CollaborationStatus? status,
  }) {
    return CollaborationUser(
      id: id ?? this.id,
      name: name ?? this.name,
      avatar: avatar ?? this.avatar,
      color: color ?? this.color,
      cursorIndex: cursorIndex ?? this.cursorIndex,
      selectionLength: selectionLength ?? this.selectionLength,
      joinedAt: joinedAt ?? this.joinedAt,
      status: status ?? this.status,
    );
  }
}

/// Cursor position data for real-time cursor sync
class CursorData {
  final String userId;
  final String userName;
  final String userColor;
  final int index;
  final int? length;

  CursorData({
    required this.userId,
    required this.userName,
    required this.userColor,
    required this.index,
    this.length,
  });

  factory CursorData.fromJson(Map<String, dynamic> json) {
    return CursorData(
      userId: json['userId'] ?? '',
      userName: json['userName'] ?? 'User',
      userColor: json['userColor'] ?? '#3B82F6',
      index: json['index'] ?? 0,
      length: json['length'],
    );
  }
}

/// Remote content update notification
/// Emitted when another user makes changes to the note
class RemoteContentUpdate {
  final String noteId;
  final String userId;
  final String userName;
  final DateTime timestamp;

  RemoteContentUpdate({
    required this.noteId,
    required this.userId,
    required this.userName,
    required this.timestamp,
  });

  factory RemoteContentUpdate.fromJson(Map<String, dynamic> json) {
    return RemoteContentUpdate(
      noteId: json['noteId'] ?? '',
      userId: json['userId'] ?? '',
      userName: json['userName'] ?? 'User',
      timestamp: DateTime.now(),
    );
  }
}

/// Real-time delta update from another user
/// Contains Quill Delta for character-by-character sync
class RemoteDeltaUpdate {
  final String noteId;
  final String userId;
  final String userName;
  final List<dynamic> delta;
  final String? fullContent;
  final DateTime timestamp;

  RemoteDeltaUpdate({
    required this.noteId,
    required this.userId,
    required this.userName,
    required this.delta,
    this.fullContent,
    required this.timestamp,
  });

  factory RemoteDeltaUpdate.fromJson(Map<String, dynamic> json) {
    return RemoteDeltaUpdate(
      noteId: json['noteId'] ?? '',
      userId: json['userId'] ?? '',
      userName: json['userName'] ?? 'User',
      delta: json['delta'] is List ? json['delta'] : [],
      fullContent: json['fullContent'],
      timestamp: DateTime.now(),
    );
  }
}

/// Full sync data when joining a note or reconnecting
class FullSyncData {
  final String noteId;
  final String senderId;
  final String senderName;
  final String content;
  final String? title;
  final DateTime timestamp;

  FullSyncData({
    required this.noteId,
    required this.senderId,
    required this.senderName,
    required this.content,
    this.title,
    required this.timestamp,
  });

  factory FullSyncData.fromJson(Map<String, dynamic> json) {
    return FullSyncData(
      noteId: json['noteId'] ?? '',
      senderId: json['senderId'] ?? '',
      senderName: json['senderName'] ?? 'User',
      content: json['content'] ?? '',
      title: json['title'],
      timestamp: DateTime.now(),
    );
  }
}

/// Service for real-time note collaboration using Socket.IO
/// Connects to the /notes namespace on the backend
class NoteCollaborationService {
  static NoteCollaborationService? _instance;
  static NoteCollaborationService get instance => _instance ??= NoteCollaborationService._();

  NoteCollaborationService._();

  IO.Socket? _socket;
  bool _initialized = false;
  String? _currentUserId;
  String? _currentUserName;
  String? _currentWorkspaceId;
  String? _currentNoteId;
  String? _currentSocketId; // Store socket ID to filter own emissions

  // Stream controllers for broadcasting events
  final StreamController<List<CollaborationUser>> _usersController =
      StreamController<List<CollaborationUser>>.broadcast();
  final StreamController<CollaborationUser> _userJoinedController =
      StreamController<CollaborationUser>.broadcast();
  final StreamController<String> _userLeftController =
      StreamController<String>.broadcast();
  final StreamController<CursorData> _cursorController =
      StreamController<CursorData>.broadcast();
  final StreamController<bool> _connectionController =
      StreamController<bool>.broadcast();
  final StreamController<RemoteContentUpdate> _contentUpdateController =
      StreamController<RemoteContentUpdate>.broadcast();
  final StreamController<RemoteDeltaUpdate> _deltaUpdateController =
      StreamController<RemoteDeltaUpdate>.broadcast();
  final StreamController<FullSyncData> _fullSyncController =
      StreamController<FullSyncData>.broadcast();
  final StreamController<Map<String, dynamic>> _syncRequestController =
      StreamController<Map<String, dynamic>>.broadcast();

  // Current collaborators
  final Map<String, CollaborationUser> _collaborators = {};

  /// Stream of all current collaborators
  Stream<List<CollaborationUser>> get usersStream => _usersController.stream;

  /// Stream of user joined events
  Stream<CollaborationUser> get userJoinedStream => _userJoinedController.stream;

  /// Stream of user left events (userId)
  Stream<String> get userLeftStream => _userLeftController.stream;

  /// Stream of cursor position updates
  Stream<CursorData> get cursorStream => _cursorController.stream;

  /// Stream of connection status changes
  Stream<bool> get connectionStream => _connectionController.stream;

  /// Stream of remote content updates (when other users edit the note)
  Stream<RemoteContentUpdate> get contentUpdateStream => _contentUpdateController.stream;

  /// Stream of real-time delta updates (character-by-character sync)
  Stream<RemoteDeltaUpdate> get deltaUpdateStream => _deltaUpdateController.stream;

  /// Stream of full sync data (when joining or reconnecting)
  Stream<FullSyncData> get fullSyncStream => _fullSyncController.stream;

  /// Stream of sync requests (when another user wants our current content)
  Stream<Map<String, dynamic>> get syncRequestStream => _syncRequestController.stream;

  /// Get current user ID
  String? get currentUserId => _currentUserId;

  /// Get current collaborators (excluding self)
  List<CollaborationUser> get collaborators => _collaborators.values
      .where((user) => user.id != _currentUserId)
      .toList();

  /// Check if connected
  bool get isConnected => _socket?.connected ?? false;

  /// Check if initialized
  bool get isInitialized => _initialized;

  /// Get current note ID
  String? get currentNoteId => _currentNoteId;

  /// Initialize the collaboration service
  Future<void> initialize({
    required String workspaceId,
    required String userId,
    required String userName,
  }) async {
    if (_initialized && _currentWorkspaceId == workspaceId) {
      debugPrint('[NoteCollaboration] Already initialized for workspace: $workspaceId');
      return;
    }

    // Disconnect existing connection if any
    await disconnect();

    try {
      debugPrint('[NoteCollaboration] Initializing for workspace: $workspaceId');

      _currentWorkspaceId = workspaceId;
      _currentUserId = userId;
      _currentUserName = userName;

      // Get auth token
      final authToken = await AppConfig.getAccessToken();
      if (authToken == null || authToken.isEmpty) {
        debugPrint('[NoteCollaboration] No auth token available');
        return;
      }

      // Build WebSocket URL for /notes namespace with query parameters
      // Append workspaceId and token directly to URL for reliable handshake
      final wsUrl = '${EnvConfig.websocketUrl}/notes?workspaceId=$workspaceId&token=$authToken';
      debugPrint('[NoteCollaboration] Connecting to: ${EnvConfig.websocketUrl}/notes with workspaceId: $workspaceId');

      _socket = IO.io(
        wsUrl,
        IO.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({
            'token': authToken,
            'userId': userId,
            'workspaceId': workspaceId,
          })
          .build(),
      );

      _setupSocketListeners();
      _socket!.connect();

      _initialized = true;
      debugPrint('[NoteCollaboration] Service initialized');

    } catch (e) {
      debugPrint('[NoteCollaboration] Failed to initialize: $e');
      rethrow;
    }
  }

  /// Set up Socket.IO event listeners
  void _setupSocketListeners() {
    if (_socket == null) return;

    // Connection events
    _socket!.onConnect((_) {
      debugPrint('[NoteCollaboration] Connected to server');
      // Store socket ID to filter own emissions for cross-device sync
      _currentSocketId = _socket!.id;
      debugPrint('[NoteCollaboration] Socket ID: $_currentSocketId');
      _connectionController.add(true);
    });

    _socket!.onDisconnect((reason) {
      debugPrint('[NoteCollaboration] Disconnected: $reason');
      _connectionController.add(false);
      _collaborators.clear();
      _usersController.add([]);
    });

    _socket!.onConnectError((error) {
      debugPrint('[NoteCollaboration] Connection error: $error');
      _connectionController.add(false);
    });

    _socket!.onError((error) {
      debugPrint('[NoteCollaboration] Socket error: $error');
    });

    // Connected confirmation
    _socket!.on('connected', (data) {
      debugPrint('[NoteCollaboration] Server confirmed connection: $data');
    });

    // Presence events
    _socket!.on('note:presence', (data) {
      debugPrint('[NoteCollaboration] Presence update: $data');
      _handlePresenceUpdate(data);
    });

    _socket!.on('note:user-joined', (data) {
      debugPrint('[NoteCollaboration] User joined: $data');
      _handleUserJoined(data);
    });

    _socket!.on('note:user-left', (data) {
      debugPrint('[NoteCollaboration] User left: $data');
      _handleUserLeft(data);
    });

    // Cursor events
    _socket!.on('note:cursor', (data) {
      _handleCursorUpdate(data);
    });

    // Sync events (for future Yjs integration)
    _socket!.on('note:sync', (data) {
      debugPrint('[NoteCollaboration] Sync received: ${data['noteId']}');
      // TODO: Handle Yjs sync when implemented
    });

    _socket!.on('note:update', (data) {
      debugPrint('[NoteCollaboration] Update received from: ${data['userId']}');
      _handleContentUpdate(data);
    });

    // Listen for simple content-changed notifications (from Flutter or other non-Yjs clients)
    _socket!.on('note:content-changed', (data) {
      debugPrint('[NoteCollaboration] Content-changed received from: ${data['userId']}');
      _handleContentUpdate(data);
    });

    // Listen for real-time delta updates (character-by-character sync)
    _socket!.on('note:delta', (data) {
      debugPrint('[NoteCollaboration] Delta received from: ${data['userName']}');
      _handleDeltaUpdate(data);
    });

    // Listen for full sync data (when joining or reconnecting)
    _socket!.on('note:full-sync', (data) {
      debugPrint('[NoteCollaboration] Full sync received from: ${data['senderName']}');
      _handleFullSync(data);
    });

    // Listen for sync requests (another user wants our current content)
    _socket!.on('note:sync-request', (data) {
      debugPrint('[NoteCollaboration] Sync request from: ${data['requesterName']}');
      // This will be handled by the editor to send current content
      _syncRequestController.add(data);
    });

    // Debug: Log all events
    _socket!.onAny((event, data) {
      debugPrint('[NoteCollaboration] Event: $event');
    });
  }

  /// Handle real-time delta update
  void _handleDeltaUpdate(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        final noteId = data['noteId'] as String?;
        final socketId = data['socketId'] as String?;

        // Only process updates for the current note
        if (noteId != _currentNoteId) return;

        // Filter out our own emissions to prevent applying our own changes
        // This is important because backend now broadcasts to ALL clients including sender
        if (socketId != null && socketId == _currentSocketId) {
          debugPrint('[NoteCollaboration] Ignoring own delta update');
          return;
        }

        final update = RemoteDeltaUpdate.fromJson(data);
        debugPrint('[NoteCollaboration] Emitting delta update from: ${update.userName}');
        _deltaUpdateController.add(update);
      }
    } catch (e) {
      debugPrint('[NoteCollaboration] Error handling delta update: $e');
    }
  }

  /// Handle full sync data
  void _handleFullSync(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        final noteId = data['noteId'] as String?;
        final targetId = data['targetId'] as String?;

        // Only process sync for the current note
        if (noteId != _currentNoteId) return;

        // Only process if we're the target (or broadcast)
        if (targetId != null && targetId != _currentUserId) return;

        final syncData = FullSyncData.fromJson(data);
        debugPrint('[NoteCollaboration] Emitting full sync from: ${syncData.senderName}');
        _fullSyncController.add(syncData);
      }
    } catch (e) {
      debugPrint('[NoteCollaboration] Error handling full sync: $e');
    }
  }

  /// Handle presence update (full list of users)
  void _handlePresenceUpdate(dynamic data) {
    try {
      if (data is Map) {
        final noteId = data['noteId'];
        if (noteId != _currentNoteId) return;

        final usersData = data['users'];
        if (usersData is List) {
          _collaborators.clear();
          for (final userData in usersData) {
            if (userData is Map<String, dynamic>) {
              final user = CollaborationUser.fromJson(userData);
              _collaborators[user.id] = user;
            }
          }
          _usersController.add(collaborators);
        }
      }
    } catch (e) {
      debugPrint('[NoteCollaboration] Error handling presence: $e');
    }
  }

  /// Handle user joined event
  void _handleUserJoined(dynamic data) {
    try {
      if (data is Map) {
        final noteId = data['noteId'];
        if (noteId != _currentNoteId) return;

        final userData = data['user'];
        if (userData is Map<String, dynamic>) {
          final user = CollaborationUser.fromJson(userData);
          _collaborators[user.id] = user;
          _userJoinedController.add(user);
          _usersController.add(collaborators);
        }
      }
    } catch (e) {
      debugPrint('[NoteCollaboration] Error handling user joined: $e');
    }
  }

  /// Handle user left event
  void _handleUserLeft(dynamic data) {
    try {
      if (data is Map) {
        final noteId = data['noteId'];
        if (noteId != _currentNoteId) return;

        final userId = data['userId'] as String?;
        if (userId != null) {
          _collaborators.remove(userId);
          _userLeftController.add(userId);
          _usersController.add(collaborators);
        }
      }
    } catch (e) {
      debugPrint('[NoteCollaboration] Error handling user left: $e');
    }
  }

  /// Handle cursor position update
  void _handleCursorUpdate(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        final noteId = data['noteId'];
        if (noteId != _currentNoteId) return;

        final cursor = CursorData.fromJson(data);

        // Update or add collaborator with cursor position
        if (_collaborators.containsKey(cursor.userId)) {
          _collaborators[cursor.userId] = _collaborators[cursor.userId]!.copyWith(
            cursorIndex: cursor.index,
            selectionLength: cursor.length,
          );
        } else {
          // Add new collaborator from cursor data
          _collaborators[cursor.userId] = CollaborationUser(
            id: cursor.userId,
            name: cursor.userName,
            color: cursor.userColor,
            cursorIndex: cursor.index,
            selectionLength: cursor.length,
            joinedAt: DateTime.now(),
          );
          debugPrint('[NoteCollaboration] Added collaborator from cursor: ${cursor.userName}');
        }

        // Don't emit our own cursor updates
        if (cursor.userId != _currentUserId) {
          _cursorController.add(cursor);
          _usersController.add(collaborators);
        }
      }
    } catch (e) {
      debugPrint('[NoteCollaboration] Error handling cursor update: $e');
    }
  }

  /// Handle remote content update
  void _handleContentUpdate(dynamic data) {
    try {
      if (data is Map<String, dynamic>) {
        final noteId = data['noteId'] as String?;
        final userId = data['userId'] as String?;
        final socketId = data['socketId'] as String?;

        // Only process updates for the current note
        if (noteId != _currentNoteId) return;

        // Filter out our own emissions to prevent refresh loop
        // This is important because backend now broadcasts to ALL clients including sender
        if (socketId != null && socketId == _currentSocketId) {
          debugPrint('[NoteCollaboration] Ignoring own content update');
          return;
        }

        // Get user name from collaborators or data
        String userName = 'User';
        if (_collaborators.containsKey(userId)) {
          userName = _collaborators[userId]!.name;
        } else if (data['userName'] != null) {
          userName = data['userName'] as String;
        }

        final update = RemoteContentUpdate(
          noteId: noteId ?? '',
          userId: userId ?? '',
          userName: userName,
          timestamp: DateTime.now(),
        );

        debugPrint('[NoteCollaboration] Emitting content update from: $userName');
        _contentUpdateController.add(update);
      }
    } catch (e) {
      debugPrint('[NoteCollaboration] Error handling content update: $e');
    }
  }

  /// Join a note editing session
  Future<bool> joinNote(String noteId) async {
    if (_socket == null || !_socket!.connected) {
      debugPrint('[NoteCollaboration] Cannot join note: not connected');
      return false;
    }

    try {
      debugPrint('[NoteCollaboration] Joining note: $noteId');

      // Leave current note if any
      if (_currentNoteId != null && _currentNoteId != noteId) {
        await leaveNote();
      }

      _currentNoteId = noteId;
      _collaborators.clear();

      // Emit join event with callback
      final completer = Completer<bool>();

      _socket!.emitWithAck('note:join', {'noteId': noteId}, ack: (response) {
        debugPrint('[NoteCollaboration] Join response: $response');

        if (response is Map) {
          if (response['success'] == true) {
            // Process initial users list
            final usersData = response['users'];
            if (usersData is List) {
              for (final userData in usersData) {
                if (userData is Map<String, dynamic>) {
                  final user = CollaborationUser.fromJson(userData);
                  _collaborators[user.id] = user;
                }
              }
              _usersController.add(collaborators);
            }
            completer.complete(true);
          } else {
            debugPrint('[NoteCollaboration] Join failed: ${response['error']}');
            completer.complete(false);
          }
        } else {
          completer.complete(false);
        }
      });

      // Wait for response with timeout
      return await completer.future.timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          debugPrint('[NoteCollaboration] Join timeout');
          return false;
        },
      );

    } catch (e) {
      debugPrint('[NoteCollaboration] Failed to join note: $e');
      return false;
    }
  }

  /// Leave the current note editing session
  Future<void> leaveNote() async {
    if (_socket == null || _currentNoteId == null) return;

    try {
      debugPrint('[NoteCollaboration] Leaving note: $_currentNoteId');

      _socket!.emit('note:leave', {'noteId': _currentNoteId});

      _currentNoteId = null;
      _collaborators.clear();
      _usersController.add([]);

    } catch (e) {
      debugPrint('[NoteCollaboration] Failed to leave note: $e');
    }
  }

  /// Update cursor position
  void updateCursor(int index, {int? length}) {
    if (_socket == null || !_socket!.connected || _currentNoteId == null) return;

    try {
      _socket!.emit('note:cursor', {
        'noteId': _currentNoteId,
        'index': index,
        'length': length ?? 0,
      });
    } catch (e) {
      debugPrint('[NoteCollaboration] Failed to update cursor: $e');
    }
  }

  /// Send document update (for future Yjs integration)
  void sendUpdate(String base64Update) {
    if (_socket == null || !_socket!.connected || _currentNoteId == null) return;

    try {
      _socket!.emit('note:update', {
        'noteId': _currentNoteId,
        'update': base64Update,
      });
    } catch (e) {
      debugPrint('[NoteCollaboration] Failed to send update: $e');
    }
  }

  /// Request sync (for future Yjs integration)
  void requestSync() {
    if (_socket == null || !_socket!.connected || _currentNoteId == null) return;

    try {
      _socket!.emit('note:sync-request', {
        'noteId': _currentNoteId,
      });
    } catch (e) {
      debugPrint('[NoteCollaboration] Failed to request sync: $e');
    }
  }

  /// Disconnect from the collaboration service
  Future<void> disconnect() async {
    try {
      if (_currentNoteId != null) {
        await leaveNote();
      }

      _socket?.disconnect();
      _socket?.dispose();
      _socket = null;

      _initialized = false;
      _currentNoteId = null;
      _collaborators.clear();

      debugPrint('[NoteCollaboration] Disconnected');

    } catch (e) {
      debugPrint('[NoteCollaboration] Error disconnecting: $e');
    }
  }

  /// Dispose of the service
  void dispose() {
    disconnect();
    _usersController.close();
    _userJoinedController.close();
    _userLeftController.close();
    _cursorController.close();
    _connectionController.close();
    _contentUpdateController.close();
    debugPrint('[NoteCollaboration] Service disposed');
  }

  /// Notify other users that content has been updated locally
  /// Call this after saving content to trigger refresh on other devices
  void notifyContentUpdate() {
    if (_socket == null || !_socket!.connected || _currentNoteId == null) return;

    try {
      // Send a lightweight content-changed notification
      // We don't send the actual content - clients will fetch from API
      _socket!.emit('note:content-changed', {
        'noteId': _currentNoteId,
      });
      debugPrint('[NoteCollaboration] Sent content-changed notification for note: $_currentNoteId');
    } catch (e) {
      debugPrint('[NoteCollaboration] Failed to notify content update: $e');
    }
  }

  /// Send a real-time delta update to other collaborators
  /// This provides character-by-character sync
  void sendDelta(List<dynamic> delta, {String? fullContent}) {
    if (_socket == null || !_socket!.connected || _currentNoteId == null) return;

    try {
      _socket!.emit('note:delta', {
        'noteId': _currentNoteId,
        'delta': delta,
        if (fullContent != null) 'fullContent': fullContent,
      });
      debugPrint('[NoteCollaboration] Sent delta update for note: $_currentNoteId');
    } catch (e) {
      debugPrint('[NoteCollaboration] Failed to send delta: $e');
    }
  }

  /// Request full sync from other collaborators
  /// Use when joining a note or after reconnection
  void requestFullSync() {
    if (_socket == null || !_socket!.connected || _currentNoteId == null) return;

    try {
      _socket!.emit('note:request-full-sync', {
        'noteId': _currentNoteId,
      });
      debugPrint('[NoteCollaboration] Requested full sync for note: $_currentNoteId');
    } catch (e) {
      debugPrint('[NoteCollaboration] Failed to request full sync: $e');
    }
  }

  /// Send our current content in response to a sync request
  void sendSyncResponse(String requesterId, String content, {String? title}) {
    if (_socket == null || !_socket!.connected || _currentNoteId == null) return;

    try {
      _socket!.emit('note:sync-response', {
        'noteId': _currentNoteId,
        'requesterId': requesterId,
        'content': content,
        if (title != null) 'title': title,
      });
      debugPrint('[NoteCollaboration] Sent sync response to: $requesterId');
    } catch (e) {
      debugPrint('[NoteCollaboration] Failed to send sync response: $e');
    }
  }
}
