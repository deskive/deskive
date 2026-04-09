import 'package:flutter/material.dart';
import 'dart:async';
import '../main.dart' show navigatorKey;
import '../message/chat_screen.dart';

/// Service to track current navigation state and route
class NavigationService {
  static final NavigationService _instance = NavigationService._internal();
  factory NavigationService() => _instance;
  NavigationService._internal();

  // Stream controller for route changes
  final _routeController = StreamController<String?>.broadcast();
  Stream<String?> get routeStream => _routeController.stream;

  String? _currentRoute;
  String? get currentRoute => _currentRoute;

  // Track current conversation/channel being viewed
  String? _currentConversationId;
  String? _currentChannelId;
  bool _isOnChatScreen = false;
  bool _isOnMessagesScreen = false;

  String? get currentConversationId => _currentConversationId;
  String? get currentChannelId => _currentChannelId;
  bool get isOnChatScreen => _isOnChatScreen;
  bool get isOnMessagesScreen => _isOnMessagesScreen;
  bool get isOnAnyMessageScreen => _isOnChatScreen || _isOnMessagesScreen;

  /// Update current route
  void updateRoute(String? route) {
    _currentRoute = route;
    _routeController.add(route);
  }

  /// Set that user is on chat screen with specific conversation/channel
  void setOnChatScreen({
    String? conversationId,
    String? channelId,
  }) {
    _isOnChatScreen = true;
    _currentConversationId = conversationId;
    _currentChannelId = channelId;

    if (conversationId != null) {
    }
    if (channelId != null) {
    }
  }

  /// Set that user left the chat screen
  void leftChatScreen() {
    _isOnChatScreen = false;
    _currentConversationId = null;
    _currentChannelId = null;
  }

  /// Set that user is on messages list screen
  void setOnMessagesScreen() {
    _isOnMessagesScreen = true;
  }

  /// Set that user left the messages list screen
  void leftMessagesScreen() {
    _isOnMessagesScreen = false;
  }

  /// Check if user is viewing a specific conversation
  bool isViewingConversation(String? conversationId) {
    if (!_isOnChatScreen || conversationId == null) return false;
    return _currentConversationId == conversationId;
  }

  /// Check if user is viewing a specific channel
  bool isViewingChannel(String? channelId) {
    if (!_isOnChatScreen || channelId == null) return false;
    return _currentChannelId == channelId;
  }

  /// Navigate to a route
  Future<dynamic>? navigateTo(String routeName, {Object? arguments}) {
    return navigatorKey.currentState?.pushNamed(routeName, arguments: arguments);
  }

  /// Navigate and replace current route
  Future<dynamic>? navigateToAndReplace(String routeName, {Object? arguments}) {
    return navigatorKey.currentState?.pushReplacementNamed(
      routeName,
      arguments: arguments,
    );
  }

  /// Go back
  void goBack() {
    navigatorKey.currentState?.pop();
  }

  /// Navigate to chat screen with conversation/channel
  Future<dynamic>? navigateToChatScreen({
    String? conversationId,
    String? channelId,
    String? userName,
    String? channelName,
    bool isPrivateChannel = false,
  }) {

    final context = navigatorKey.currentContext;
    if (context == null) {
      return null;
    }

    // Determine if it's a channel or direct message
    final bool isChannel = channelId != null;

    // Get the chat name (channel name or user name)
    final String chatDisplayName = isChannel
        ? (channelName ?? 'Channel')
        : (userName ?? 'Direct Message');

    // Navigate to ChatScreen with appropriate parameters
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ChatScreen(
          chatName: chatDisplayName,
          conversationId: conversationId,
          channelId: channelId,
          isChannel: isChannel,
          isPrivateChannel: isPrivateChannel,
        ),
      ),
    );
  }

  /// Dispose the service
  void dispose() {
    _routeController.close();
  }
}
