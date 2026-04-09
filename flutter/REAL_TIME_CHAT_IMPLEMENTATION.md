# Real-Time Chat Implementation with AppAtOnce

This document provides a comprehensive guide to the real-time chat functionality implemented using AppAtOnce subscriptions and REST API integration.

## Overview

The real-time chat system combines:
- **AppAtOnce subscriptions** for real-time updates (message listening, typing indicators, presence)
- **REST API** for message sending and data operations
- **WebSocket compatibility** with backend implementation
- **Comprehensive UI components** for chat interfaces

## Architecture

### Core Components

1. **RealTimeChatService** (`lib/services/real_time_chat_service.dart`)
   - Main service managing real-time subscriptions
   - Handles message sending via REST API
   - Manages user presence and typing indicators
   - Provides streams for real-time updates

2. **PresenceIndicator** (`lib/widgets/presence_indicator.dart`)
   - UI components for displaying user status
   - Online/offline indicators
   - Typing indicators with animations

3. **RealTimeChatScreen** (`lib/message/real_time_chat_screen.dart`)
   - Individual chat interface
   - Real-time message updates
   - Typing indicators and presence status
   - Message delivery status

4. **RealTimeChatListScreen** (`lib/message/real_time_chat_list_screen.dart`)
   - Chat list with real-time updates
   - Unread message counts
   - Search functionality
   - Channel and conversation management

## Features Implemented

### ✅ Real-Time Message Listening
- Subscribe to channel and conversation messages
- Live updates on INSERT/UPDATE/DELETE operations
- Message deduplication and ordering
- Automatic UI updates

### ✅ Message Sending via REST API
- Send messages to channels and conversations
- Support for reply threading
- File attachment support (planned)
- Message metadata handling

### ✅ Presence Detection
- Online/offline/away/busy status
- Real-time presence updates
- Heartbeat mechanism for active status
- Last seen timestamps

### ✅ Typing Indicators
- Real-time typing notifications
- Automatic timeout after inactivity
- Visual typing animations
- Multiple user support

### ✅ Message Delivery Status
- Sending/sent/delivered/read status
- Visual indicators in chat bubbles
- Read receipt tracking (planned)

### ✅ User Interface Components
- Modern chat interface design
- Dark/light theme support
- Responsive design
- Message search functionality

## Usage Guide

### Basic Setup

1. **Initialize the service:**
```dart
import '../services/real_time_chat_service.dart';

final chatService = RealTimeChatService.instance;

await chatService.initialize(
  workspaceId: 'your-workspace-id',
  userId: 'current-user-id',
  userName: 'Current User Name',
);
```

2. **Use the chat list screen:**
```dart
import '../message/real_time_chat_list_screen.dart';

RealTimeChatListScreen(
  workspaceId: workspaceId,
  currentUserId: currentUserId,
  currentUserName: currentUserName,
)
```

3. **Open a specific chat:**
```dart
import '../message/real_time_chat_screen.dart';

RealTimeChatScreen(
  chatId: channelId,
  chatName: 'General',
  isChannel: true,
  workspaceId: workspaceId,
  currentUserId: currentUserId,
  currentUserName: currentUserName,
)
```

### Listening to Real-Time Events

```dart
// Message updates
chatService.messageStream.listen((message) {
  print('New message: ${message.content}');
});

// Presence updates
chatService.presenceStream.listen((presence) {
  print('${presence.userName} is ${presence.status.name}');
});

// Typing indicators
chatService.typingStream.listen((typing) {
  print('${typing.userName} is typing');
});
```

### Sending Messages

```dart
// Channel message
final message = await chatService.sendChannelMessage(
  channelId: 'channel-id',
  content: 'Hello, world!',
  type: 'text',
);

// Conversation message
final message = await chatService.sendConversationMessage(
  conversationId: 'conversation-id',
  content: 'Hi there!',
  replyToId: 'message-to-reply-to',
);
```

### Managing Presence

```dart
// Update your status
await chatService.updatePresenceStatus(
  status: UserPresenceStatus.online,
  statusMessage: 'Working on chat features',
);

// Get user presence
final presence = chatService.getUserPresence('user-id');
```

### Typing Indicators

```dart
// Start typing
await chatService.sendTypingIndicator(
  channelId: 'channel-id',
  userName: 'Current User',
);

// Stop typing (automatically called after 3 seconds)
await chatService.stopTypingIndicator(
  channelId: 'channel-id',
  userName: 'Current User',
);
```

## AppAtOnce Integration Details

### Subscription Channels

- **Messages**: `messages_${channelId}` or `conversation_messages_${conversationId}`
- **Typing**: `typing_${channelId}`
- **Presence**: `presence_${channelId}` and `presence_global`

### Event Types

```dart
// Message events
{
  "type": "INSERT",
  "payload": { /* Message object */ }
}

{
  "type": "UPDATE", 
  "payload": { /* Updated message object */ }
}

{
  "type": "DELETE",
  "payload": { /* Message object with isDeleted: true */ }
}

// Typing events
{
  "type": "typing",
  "payload": {
    "user_id": "user-id",
    "user_name": "User Name",
    "channel_id": "channel-id",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}

// Presence events
{
  "type": "presence",
  "payload": {
    "user_id": "user-id",
    "user_name": "User Name", 
    "status": "online",
    "last_seen": "2024-01-01T12:00:00Z",
    "status_message": "Available"
  }
}
```

## Backend Compatibility

### WebSocket Events Support
The implementation is designed to be compatible with WebSocket-based backends that emit the following events:

- `message:new` - New message received
- `message:updated` - Message edited
- `message:deleted` - Message deleted
- `user:typing` - User started typing
- `user:stop_typing` - User stopped typing
- `user:presence` - User presence changed

### REST API Endpoints
The system uses the existing ChatApiService which supports:

- `POST /workspaces/{id}/chat/channels/{id}/messages` - Send channel message
- `POST /workspaces/{id}/chat/conversations/{id}/messages` - Send conversation message
- `GET /workspaces/{id}/chat/channels/{id}/messages` - Get channel messages
- `GET /workspaces/{id}/chat/conversations/{id}/messages` - Get conversation messages
- `PATCH /workspaces/{id}/chat/messages/{id}` - Update message
- `DELETE /workspaces/{id}/chat/messages/{id}` - Delete message

## Error Handling

The implementation includes comprehensive error handling:

```dart
try {
  await chatService.sendChannelMessage(/* ... */);
} catch (e) {
  // Handle network errors, validation errors, etc.
  print('Failed to send message: $e');
  showErrorSnackBar('Message sending failed');
}
```

### Common Error Scenarios
- Network connectivity issues
- AppAtOnce subscription failures
- API authentication errors
- Message validation failures
- Subscription timeout errors

## Performance Considerations

### Optimization Features
- **Message deduplication** - Prevents duplicate messages in UI
- **Lazy loading** - Messages loaded on demand
- **Stream management** - Proper subscription cleanup
- **Efficient UI updates** - Only rebuild affected widgets
- **Presence batching** - Heartbeat optimization

### Memory Management
- Automatic subscription cleanup on dispose
- Stream controller management
- Timer cancellation
- Resource cleanup on screen navigation

## Testing

### Unit Tests
```dart
test('should send message successfully', () async {
  final service = RealTimeChatService.instance;
  await service.initialize(/* ... */);
  
  final message = await service.sendChannelMessage(
    channelId: 'test-channel',
    content: 'Test message',
  );
  
  expect(message.content, equals('Test message'));
  expect(message.deliveryStatus, equals(MessageDeliveryStatus.sent));
});
```

### Integration Tests
- Real-time message flow
- Presence updates
- Typing indicator behavior
- Error recovery scenarios

## Future Enhancements

### Planned Features
- [ ] File attachment support
- [ ] Message reactions
- [ ] Message threading
- [ ] Push notifications
- [ ] Message encryption
- [ ] Voice messages
- [ ] Message search indexing
- [ ] Offline message queue
- [ ] Message drafts
- [ ] Custom emoji support

### Performance Improvements
- [ ] Message pagination optimization
- [ ] Connection pooling
- [ ] Background sync
- [ ] Cache management
- [ ] Bandwidth optimization

## Troubleshooting

### Common Issues

1. **AppAtOnce Connection Failed**
   ```
   Solution: Check API key configuration and network connectivity
   ```

2. **Messages Not Updating in Real-Time**
   ```
   Solution: Verify subscription setup and WebSocket connection
   ```

3. **Typing Indicators Not Working**
   ```
   Solution: Check typing subscription and timer management
   ```

4. **Presence Status Not Updating**
   ```
   Solution: Verify presence heartbeat and subscription
   ```

### Debug Mode
Enable debug logging:
```dart
AppAtOnceClient(
  apiKey: apiKey,
  debug: true, // Enable debug logs
)
```

### Logs Analysis
Look for these log patterns:
- `✅` - Successful operations
- `❌` - Error conditions
- `🔧` - Initialization steps
- `🔔` - Subscription events
- `📤` - Message sending
- `📨` - Message receiving

## Configuration

### Required Environment Variables
```dart
// lib/config/app_config.dart
static const String appAtOnceApiKey = 'your-api-key';
static const String defaultWorkspaceId = 'workspace-id';
```

### Optional Configuration
```dart
// Typing indicator timeout
static const Duration typingTimeout = Duration(seconds: 3);

// Presence heartbeat interval
static const Duration presenceHeartbeat = Duration(seconds: 30);

// Message pagination limit
static const int messageLimit = 50;
```

## Support

For issues and questions:
1. Check the AppAtOnce SDK documentation
2. Review the error logs with debug mode enabled
3. Test with the provided examples
4. Check network connectivity and API key validity

## Examples

See `lib/examples/real_time_chat_example.dart` for comprehensive usage examples including:
- Basic chat integration
- Event listening patterns
- Presence management
- Error handling strategies