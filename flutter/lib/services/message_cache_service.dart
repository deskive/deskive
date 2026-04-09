import 'package:flutter/foundation.dart';
import '../message/chat_screen.dart';

/// Simple in-memory message cache service
/// - Stores messages in memory for fast access
/// - Supports pagination
/// - Does NOT persist across app restarts (intentional - lightweight)
class MessageCacheService {
  static MessageCacheService? _instance;
  static MessageCacheService get instance => _instance ??= MessageCacheService._();

  MessageCacheService._();

  // In-memory storage: chatId -> list of messages
  final Map<String, List<ChatMessage>> _messageCache = {};

  // Metadata: chatId -> {lastUpdated, count}
  final Map<String, Map<String, dynamic>> _metadataCache = {};

  bool _isInitialized = false;

  /// Initialize the cache service (no-op for in-memory cache)
  Future<void> initialize() async {
    if (_isInitialized) return;

    _isInitialized = true;
  }

  /// Get cached messages for a conversation/channel
  /// Returns messages sorted by timestamp (newest first)
  List<ChatMessage>? getCachedMessages(String chatId, {int limit = 50}) {
    if (!_isInitialized) return null;

    try {
      final messages = _messageCache[chatId];
      if (messages == null || messages.isEmpty) return null;

      // Return limited number of messages
      final limitedMessages = messages.take(limit).toList();

      return limitedMessages;
    } catch (e) {
      return null;
    }
  }

  /// Cache messages for a conversation/channel
  Future<void> cacheMessages(String chatId, List<ChatMessage> messages) async {
    if (!_isInitialized) return;

    try {
      // Store messages
      _messageCache[chatId] = List.from(messages);

      // Update metadata
      _metadataCache[chatId] = {
        'lastUpdated': DateTime.now().toIso8601String(),
        'count': messages.length,
      };

    } catch (e) {
    }
  }

  /// Add a new message to cache (for real-time updates)
  Future<void> addMessageToCache(String chatId, ChatMessage message) async {
    if (!_isInitialized) return;

    try {
      final messagesList = _messageCache[chatId] ?? [];

      // Add new message at the end (newest last for display order)
      messagesList.add(message);

      // Keep only last 200 messages to prevent cache from growing too large
      if (messagesList.length > 200) {
        messagesList.removeRange(0, messagesList.length - 200);
      }

      _messageCache[chatId] = messagesList;

      // Update metadata
      _metadataCache[chatId] = {
        'lastUpdated': DateTime.now().toIso8601String(),
        'count': messagesList.length,
      };

    } catch (e) {
    }
  }

  /// Update a message in cache
  Future<void> updateMessageInCache(String chatId, ChatMessage updatedMessage) async {
    if (!_isInitialized) return;

    try {
      final messages = _messageCache[chatId];
      if (messages == null) return;

      final index = messages.indexWhere((m) => m.id == updatedMessage.id);
      if (index != -1) {
        messages[index] = updatedMessage;

        _metadataCache[chatId] = {
          'lastUpdated': DateTime.now().toIso8601String(),
          'count': messages.length,
        };

      }
    } catch (e) {
    }
  }

  /// Remove a message from cache
  Future<void> removeMessageFromCache(String chatId, String messageId) async {
    if (!_isInitialized) return;

    try {
      final messages = _messageCache[chatId];
      if (messages == null) return;

      messages.removeWhere((m) => m.id == messageId);

      _metadataCache[chatId] = {
        'lastUpdated': DateTime.now().toIso8601String(),
        'count': messages.length,
      };

    } catch (e) {
    }
  }

  /// Get last message timestamp for incremental loading
  DateTime? getLastMessageTimestamp(String chatId) {
    if (!_isInitialized) return null;

    try {
      final metadata = _metadataCache[chatId];
      if (metadata == null) return null;

      final messages = _messageCache[chatId];
      if (messages == null || messages.isEmpty) return null;

      return messages.last.timestamp;
    } catch (e) {
      return null;
    }
  }

  /// Check if cache exists for a conversation
  bool hasCachedMessages(String chatId) {
    if (!_isInitialized) return false;
    return _messageCache.containsKey(chatId) && (_messageCache[chatId]?.isNotEmpty ?? false);
  }

  /// Clear cache for a specific conversation
  Future<void> clearCache(String chatId) async {
    if (!_isInitialized) return;

    try {
      _messageCache.remove(chatId);
      _metadataCache.remove(chatId);
    } catch (e) {
    }
  }

  /// Clear all caches (e.g., on logout)
  Future<void> clearAllCaches() async {
    if (!_isInitialized) return;

    try {
      _messageCache.clear();
      _metadataCache.clear();
    } catch (e) {
    }
  }

  /// Get cache stats for debugging
  Map<String, dynamic> getCacheStats() {
    if (!_isInitialized) {
      return {'status': 'not_initialized'};
    }

    int totalMessages = 0;
    for (var messages in _messageCache.values) {
      totalMessages += messages.length;
    }

    return {
      'status': 'initialized',
      'total_conversations': _messageCache.length,
      'total_cached_messages': totalMessages,
      'conversations': _messageCache.keys.toList(),
    };
  }
}
