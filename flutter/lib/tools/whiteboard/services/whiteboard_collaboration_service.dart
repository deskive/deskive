import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../../config/env_config.dart';
import '../../../services/auth_service.dart';
import '../models/whiteboard_element.dart';
import '../models/collaborator_presence.dart';

/// Service for real-time whiteboard collaboration using Socket.IO
class WhiteboardCollaborationService {
  final String workspaceId;
  final String whiteboardId; // This is used as sessionId in backend
  final Function(List<WhiteboardElement>) onElementsUpdate;
  final Function(String odontId, double x, double y) onPointerUpdate;
  final Function(Map<String, CollaboratorPresence>) onPresenceUpdate;
  final Function()? onConnected;
  final Function()? onDisconnected;
  final Function(String)? onError;

  io.Socket? _socket;
  bool _isConnected = false;
  Timer? _elementsUpdateThrottle;
  Timer? _pointerUpdateThrottle;

  // Throttle intervals (same as web implementation)
  static const int _elementsThrottleMs = 50;
  static const int _pointerThrottleMs = 30;

  // Pending updates for throttling
  List<WhiteboardElement>? _pendingElements;
  double? _pendingPointerX;
  double? _pendingPointerY;

  bool get isConnected => _isConnected;

  WhiteboardCollaborationService({
    required this.workspaceId,
    required this.whiteboardId,
    required this.onElementsUpdate,
    required this.onPointerUpdate,
    required this.onPresenceUpdate,
    this.onConnected,
    this.onDisconnected,
    this.onError,
  });

  /// Connect to the whiteboard collaboration namespace
  Future<void> connect() async {
    if (_socket != null && _isConnected) {
      debugPrint('[WhiteboardCollab] Already connected');
      return;
    }

    final token = AuthService.instance.accessToken;
    if (token == null) {
      debugPrint('[WhiteboardCollab] ERROR: No authentication token available');
      onError?.call('No authentication token available');
      return;
    }

    // Get WebSocket URL - convert ws:// to http:// for Socket.IO client
    String wsUrl = EnvConfig.websocketUrl;
    // Socket.IO client expects http/https, not ws/wss
    wsUrl = wsUrl.replaceFirst('ws://', 'http://').replaceFirst('wss://', 'https://');

    debugPrint('[WhiteboardCollab] ====================================');
    debugPrint('[WhiteboardCollab] Connecting to: $wsUrl/whiteboards');
    debugPrint('[WhiteboardCollab] WorkspaceId: $workspaceId');
    debugPrint('[WhiteboardCollab] WhiteboardId (sessionId): $whiteboardId');
    debugPrint('[WhiteboardCollab] Token: ${token.substring(0, 20)}...');
    debugPrint('[WhiteboardCollab] ====================================');

    try {
      _socket = io.io(
        '$wsUrl/whiteboards',
        io.OptionBuilder()
            .setTransports(['websocket'])
            .setAuth({
              'token': token,
              'workspaceId': workspaceId, // Required by backend
            })
            .setQuery({
              'workspaceId': workspaceId, // Also in query for compatibility
            })
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionAttempts(5)
            .setReconnectionDelay(1000)
            .build(),
      );

      _setupEventListeners();
      _socket!.connect();
    } catch (e) {
      debugPrint('[WhiteboardCollab] Connection error: $e');
      onError?.call('Failed to connect: $e');
    }
  }

  void _setupEventListeners() {
    _socket!.onConnect((_) {
      debugPrint('[WhiteboardCollab] ✅ Connected to socket');
      _isConnected = true;
      _joinWhiteboard();
      onConnected?.call();
    });

    _socket!.onDisconnect((reason) {
      debugPrint('[WhiteboardCollab] ❌ Disconnected: $reason');
      _isConnected = false;
      onDisconnected?.call();
    });

    _socket!.onConnectError((error) {
      debugPrint('[WhiteboardCollab] ❌ Connection error: $error');
      onError?.call('Connection error: $error');
    });

    _socket!.onError((error) {
      debugPrint('[WhiteboardCollab] ❌ Socket error: $error');
      onError?.call('Socket error: $error');
    });

    // Backend emits 'connected' on successful connection
    _socket!.on('connected', (data) {
      debugPrint('[WhiteboardCollab] ✅ Authenticated by backend: $data');
    });

    // Backend emits 'whiteboard:elements' (not 'whiteboard:elements-update')
    _socket!.on('whiteboard:elements', (data) {
      debugPrint('[WhiteboardCollab] 📥 Received whiteboard:elements event');
      _handleElementsUpdate(data);
    });

    // Also listen for the update event in case it's used
    _socket!.on('whiteboard:elements-update', (data) {
      debugPrint('[WhiteboardCollab] 📥 Received whiteboard:elements-update event');
      _handleElementsUpdate(data);
    });

    // Pointer updates from backend
    _socket!.on('whiteboard:pointer', (data) {
      debugPrint('[WhiteboardCollab] 📥 Received pointer update');
      _handlePointerUpdate(data);
    });

    // Presence updates
    _socket!.on('whiteboard:presence', (data) {
      debugPrint('[WhiteboardCollab] 📥 Received presence update');
      _handlePresenceUpdate(data);
    });

    // User joined/left notifications
    _socket!.on('whiteboard:user-joined', _handleUserJoined);
    _socket!.on('whiteboard:user-left', _handleUserLeft);

    // Error handling
    _socket!.on('whiteboard:error', _handleWhiteboardError);
  }

  void _joinWhiteboard() {
    debugPrint('[WhiteboardCollab] 🚪 Joining whiteboard session: $whiteboardId');
    // Backend uses 'sessionId' which is the whiteboardId
    _socket!.emitWithAck('whiteboard:join', {
      'sessionId': whiteboardId,
    }, ack: (data) {
      debugPrint('[WhiteboardCollab] 🚪 Join response received');
      debugPrint('[WhiteboardCollab] Response data: $data');
      if (data != null && data['success'] == true) {
        debugPrint('[WhiteboardCollab] ✅ Successfully joined whiteboard');
        // Handle initial elements if provided
        if (data['elements'] != null) {
          debugPrint('[WhiteboardCollab] 📥 Received ${(data['elements'] as List?)?.length ?? 0} initial elements');
          _handleElementsUpdate({'elements': data['elements']});
        }
        // Handle initial users/presence
        if (data['users'] != null) {
          debugPrint('[WhiteboardCollab] 👥 Received ${(data['users'] as List?)?.length ?? 0} users');
          _handlePresenceUpdate({'users': data['users']});
        }
      } else {
        debugPrint('[WhiteboardCollab] ❌ Failed to join: ${data?['error'] ?? 'Unknown error'}');
      }
    });
  }

  void _handleElementsUpdate(dynamic data) {
    try {
      if (data == null) return;

      List<dynamic> elementsList;
      if (data is Map && data['elements'] != null) {
        elementsList = data['elements'] as List;
      } else if (data is List) {
        elementsList = data;
      } else {
        return;
      }

      // Handle potentially nested arrays (backend bug fix)
      // If the first element is a List, flatten it
      if (elementsList.isNotEmpty && elementsList.first is List) {
        debugPrint('[WhiteboardCollab] ⚠️ Received nested array, flattening...');
        elementsList = elementsList.expand((e) => e is List ? e : [e]).toList();
      }

      final elements = <WhiteboardElement>[];
      for (final e in elementsList) {
        if (e is Map<String, dynamic>) {
          try {
            elements.add(WhiteboardElement.fromJson(e));
          } catch (parseError) {
            debugPrint('[WhiteboardCollab] Error parsing element: $parseError');
          }
        } else if (e is Map) {
          // Handle Map<dynamic, dynamic>
          try {
            elements.add(WhiteboardElement.fromJson(Map<String, dynamic>.from(e)));
          } catch (parseError) {
            debugPrint('[WhiteboardCollab] Error parsing element: $parseError');
          }
        }
      }

      debugPrint('[WhiteboardCollab] Received ${elements.length} elements');
      onElementsUpdate(elements);
    } catch (e, stackTrace) {
      debugPrint('[WhiteboardCollab] Error handling elements update: $e');
      debugPrint('[WhiteboardCollab] Stack trace: $stackTrace');
    }
  }

  void _handlePointerUpdate(dynamic data) {
    try {
      if (data == null) return;

      // Backend sends: { oderId, odername, pointer: {x, y}, button, username, color, avatarUrl }
      final odontId = data['oderId'] as String? ??
                      data['odontId'] as String? ??
                      data['userId'] as String?;

      double x = 0;
      double y = 0;

      // Handle nested pointer object from backend
      if (data['pointer'] != null && data['pointer'] is Map) {
        x = (data['pointer']['x'] as num?)?.toDouble() ?? 0;
        y = (data['pointer']['y'] as num?)?.toDouble() ?? 0;
      } else {
        x = (data['x'] as num?)?.toDouble() ?? 0;
        y = (data['y'] as num?)?.toDouble() ?? 0;
      }

      if (odontId != null) {
        onPointerUpdate(odontId, x, y);
      }
    } catch (e) {
      debugPrint('[WhiteboardCollab] Error handling pointer update: $e');
    }
  }

  void _handlePresenceUpdate(dynamic data) {
    try {
      if (data == null) return;

      // Backend sends: { sessionId, users: [...] }
      List<dynamic>? usersList;
      if (data is Map && data['users'] != null) {
        usersList = data['users'] as List;
      } else if (data is List) {
        usersList = data;
      }

      if (usersList == null) return;

      // Convert users list to collaborators map
      final presence = <String, CollaboratorPresence>{};
      for (final user in usersList) {
        if (user is Map<String, dynamic>) {
          final id = user['id'] as String? ?? user['odontId'] as String? ?? '';
          if (id.isNotEmpty) {
            presence[id] = CollaboratorPresence(
              odontId: id,
              odontName: user['name'] as String? ?? user['odontName'] as String? ?? 'User',
              odontAvatar: user['avatar'] as String? ?? user['odontAvatar'] as String?,
              pointerX: (user['pointer']?['x'] as num?)?.toDouble() ?? 0,
              pointerY: (user['pointer']?['y'] as num?)?.toDouble() ?? 0,
              isActive: true,
            );
          }
        }
      }

      debugPrint('[WhiteboardCollab] Presence update: ${presence.length} collaborators');
      onPresenceUpdate(presence);
    } catch (e) {
      debugPrint('[WhiteboardCollab] Error handling presence update: $e');
    }
  }

  void _handleUserJoined(dynamic data) {
    debugPrint('[WhiteboardCollab] User joined: $data');
    // Request updated presence
    _socket?.emit('whiteboard:get-presence', {'sessionId': whiteboardId});
  }

  void _handleUserLeft(dynamic data) {
    debugPrint('[WhiteboardCollab] User left: $data');
    // Request updated presence
    _socket?.emit('whiteboard:get-presence', {'sessionId': whiteboardId});
  }

  void _handleWhiteboardError(dynamic data) {
    final message = data is Map ? data['message'] as String? : data?.toString();
    debugPrint('[WhiteboardCollab] Whiteboard error: $message');
    onError?.call(message ?? 'Unknown error');
  }

  /// Send elements update to collaborators (throttled)
  void sendElementsUpdate(List<WhiteboardElement> elements) {
    _pendingElements = elements;

    // Cancel existing throttle timer
    _elementsUpdateThrottle?.cancel();

    // Set new throttle timer
    _elementsUpdateThrottle = Timer(
      const Duration(milliseconds: _elementsThrottleMs),
      () {
        if (_pendingElements != null && _isConnected) {
          debugPrint('[WhiteboardCollab] 📤 Sending ${_pendingElements!.length} elements to session: $whiteboardId');
          _socket?.emit('whiteboard:elements-update', {
            'sessionId': whiteboardId,
            'elements': _pendingElements!.map((e) => e.toJson()).toList(),
          });
          _pendingElements = null;
        } else {
          debugPrint('[WhiteboardCollab] ⚠️ Cannot send elements: connected=$_isConnected, hasPending=${_pendingElements != null}');
        }
      },
    );
  }

  /// Send pointer position to collaborators (throttled)
  void sendPointer(double x, double y, {String? tool, bool pressing = false}) {
    _pendingPointerX = x;
    _pendingPointerY = y;

    // Cancel existing throttle timer
    _pointerUpdateThrottle?.cancel();

    // Set new throttle timer
    _pointerUpdateThrottle = Timer(
      const Duration(milliseconds: _pointerThrottleMs),
      () {
        if (_pendingPointerX != null && _pendingPointerY != null && _isConnected) {
          _socket?.emit('whiteboard:pointer', {
            'sessionId': whiteboardId,
            'x': _pendingPointerX,
            'y': _pendingPointerY,
            'tool': tool,
            'pressing': pressing,
          });
          _pendingPointerX = null;
          _pendingPointerY = null;
        }
      },
    );
  }

  /// Send selection change
  void sendSelection(String? elementId) {
    if (!_isConnected) return;

    _socket?.emit('whiteboard:selection', {
      'sessionId': whiteboardId,
      'elementId': elementId,
    });
  }

  /// Request current state from server
  void requestSync() {
    if (!_isConnected) return;

    _socket?.emit('whiteboard:sync-request', {
      'sessionId': whiteboardId,
    });
  }

  /// Disconnect from the whiteboard collaboration
  void disconnect() {
    debugPrint('[WhiteboardCollab] Disconnecting');

    // Cancel throttle timers
    _elementsUpdateThrottle?.cancel();
    _pointerUpdateThrottle?.cancel();

    // Leave whiteboard room
    if (_isConnected) {
      _socket?.emit('whiteboard:leave', {
        'sessionId': whiteboardId,
      });
    }

    // Disconnect socket
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }

  /// Dispose the service
  void dispose() {
    disconnect();
  }
}

/// Helper class for merging elements from multiple sources
class ElementMerger {
  /// Merge local and remote elements using version-based conflict resolution
  static List<WhiteboardElement> merge(
    List<WhiteboardElement> local,
    List<WhiteboardElement> remote,
  ) {
    final merged = <String, WhiteboardElement>{};

    // Add all local elements
    for (final element in local) {
      merged[element.id] = element;
    }

    // Merge remote elements
    for (final element in remote) {
      final existing = merged[element.id];

      if (existing == null) {
        // New element from remote
        merged[element.id] = element;
      } else if (element.version > existing.version) {
        // Remote has newer version
        merged[element.id] = element;
      } else if (element.version == existing.version) {
        // Same version - use versionNonce as tiebreaker
        if (element.versionNonce > existing.versionNonce) {
          merged[element.id] = element;
        }
      }
      // else: local has newer version, keep it
    }

    return merged.values.toList();
  }
}
