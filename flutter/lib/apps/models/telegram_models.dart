// Models for Telegram integration

/// Telegram connection status
class TelegramConnection {
  final String id;
  final String workspaceId;
  final String userId;
  final String? botToken;
  final String? botUsername;
  final String? botName;
  final bool isActive;
  final DateTime createdAt;

  TelegramConnection({
    required this.id,
    required this.workspaceId,
    required this.userId,
    this.botToken,
    this.botUsername,
    this.botName,
    required this.isActive,
    required this.createdAt,
  });

  factory TelegramConnection.fromJson(Map<String, dynamic> json) {
    return TelegramConnection(
      id: json['id'] as String,
      workspaceId: json['workspaceId'] as String,
      userId: json['userId'] as String,
      botToken: json['botToken'] as String?,
      botUsername: json['botUsername'] as String?,
      botName: json['botName'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'userId': userId,
      'botToken': botToken,
      'botUsername': botUsername,
      'botName': botName,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

/// Telegram chat model
class TelegramChat {
  final int id;
  final String type;
  final String? title;
  final String? username;
  final String? firstName;
  final String? lastName;
  final String? description;

  TelegramChat({
    required this.id,
    required this.type,
    this.title,
    this.username,
    this.firstName,
    this.lastName,
    this.description,
  });

  factory TelegramChat.fromJson(Map<String, dynamic> json) {
    return TelegramChat(
      id: json['id'] as int,
      type: json['type'] as String,
      title: json['title'] as String?,
      username: json['username'] as String?,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      if (title != null) 'title': title,
      if (username != null) 'username': username,
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
      if (description != null) 'description': description,
    };
  }

  /// Get display name for the chat
  String get displayName {
    if (title != null && title!.isNotEmpty) return title!;
    if (firstName != null || lastName != null) {
      return [firstName, lastName].where((e) => e != null).join(' ');
    }
    if (username != null) return '@$username';
    return 'Chat $id';
  }
}

/// Telegram user model
class TelegramUser {
  final int id;
  final String? username;
  final String? firstName;
  final String? lastName;
  final bool isBot;

  TelegramUser({
    required this.id,
    this.username,
    this.firstName,
    this.lastName,
    required this.isBot,
  });

  factory TelegramUser.fromJson(Map<String, dynamic> json) {
    return TelegramUser(
      id: json['id'] as int,
      username: json['username'] as String?,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      isBot: json['isBot'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (username != null) 'username': username,
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
      'isBot': isBot,
    };
  }

  /// Get full name of the user
  String get fullName {
    if (firstName != null || lastName != null) {
      return [firstName, lastName].where((e) => e != null).join(' ');
    }
    if (username != null) return '@$username';
    return 'User $id';
  }
}

/// Telegram message model
class TelegramMessage {
  final int messageId;
  final int chatId;
  final String? text;
  final int date;
  final TelegramUser? from;

  TelegramMessage({
    required this.messageId,
    required this.chatId,
    this.text,
    required this.date,
    this.from,
  });

  factory TelegramMessage.fromJson(Map<String, dynamic> json) {
    return TelegramMessage(
      messageId: json['messageId'] as int,
      chatId: json['chatId'] as int,
      text: json['text'] as String?,
      date: json['date'] as int,
      from: json['from'] != null
          ? TelegramUser.fromJson(json['from'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'messageId': messageId,
      'chatId': chatId,
      if (text != null) 'text': text,
      'date': date,
      if (from != null) 'from': from!.toJson(),
    };
  }

  /// Get message timestamp as DateTime
  DateTime get timestamp => DateTime.fromMillisecondsSinceEpoch(date * 1000);
}

/// Telegram callback query model
class TelegramCallbackQuery {
  final String id;
  final TelegramUser? from;
  final TelegramMessage? message;
  final String? chatInstance;
  final String? data;

  TelegramCallbackQuery({
    required this.id,
    this.from,
    this.message,
    this.chatInstance,
    this.data,
  });

  factory TelegramCallbackQuery.fromJson(Map<String, dynamic> json) {
    return TelegramCallbackQuery(
      id: json['id'] as String,
      from: json['from'] != null
          ? TelegramUser.fromJson(json['from'] as Map<String, dynamic>)
          : null,
      message: json['message'] != null
          ? TelegramMessage.fromJson(json['message'] as Map<String, dynamic>)
          : null,
      chatInstance: json['chatInstance'] as String?,
      data: json['data'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      if (from != null) 'from': from!.toJson(),
      if (message != null) 'message': message!.toJson(),
      if (chatInstance != null) 'chatInstance': chatInstance,
      if (data != null) 'data': data,
    };
  }
}

/// Telegram update model
class TelegramUpdate {
  final int updateId;
  final TelegramMessage? message;
  final TelegramCallbackQuery? callbackQuery;

  TelegramUpdate({
    required this.updateId,
    this.message,
    this.callbackQuery,
  });

  factory TelegramUpdate.fromJson(Map<String, dynamic> json) {
    return TelegramUpdate(
      updateId: json['updateId'] as int,
      message: json['message'] != null
          ? TelegramMessage.fromJson(json['message'] as Map<String, dynamic>)
          : null,
      callbackQuery: json['callbackQuery'] != null
          ? TelegramCallbackQuery.fromJson(
              json['callbackQuery'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'updateId': updateId,
      if (message != null) 'message': message!.toJson(),
      if (callbackQuery != null) 'callbackQuery': callbackQuery!.toJson(),
    };
  }
}

/// Request model for sending Telegram message
class SendTelegramMessageRequest {
  final dynamic chatId;
  final String text;
  final String? parseMode;
  final bool? disableNotification;

  SendTelegramMessageRequest({
    required this.chatId,
    required this.text,
    this.parseMode,
    this.disableNotification,
  });

  Map<String, dynamic> toJson() {
    return {
      'chatId': chatId,
      'text': text,
      if (parseMode != null) 'parseMode': parseMode,
      if (disableNotification != null) 'disableNotification': disableNotification,
    };
  }
}

/// Response model for sending Telegram message
class SendTelegramMessageResponse {
  final int messageId;
  final int date;

  SendTelegramMessageResponse({
    required this.messageId,
    required this.date,
  });

  factory SendTelegramMessageResponse.fromJson(Map<String, dynamic> json) {
    return SendTelegramMessageResponse(
      messageId: json['messageId'] as int,
      date: json['date'] as int,
    );
  }

  /// Get message timestamp as DateTime
  DateTime get timestamp => DateTime.fromMillisecondsSinceEpoch(date * 1000);
}

/// Response model for getting bot info
class TelegramBotInfo {
  final int id;
  final bool isBot;
  final String firstName;
  final String? username;
  final bool? canJoinGroups;
  final bool? canReadAllGroupMessages;
  final bool? supportsInlineQueries;

  TelegramBotInfo({
    required this.id,
    required this.isBot,
    required this.firstName,
    this.username,
    this.canJoinGroups,
    this.canReadAllGroupMessages,
    this.supportsInlineQueries,
  });

  factory TelegramBotInfo.fromJson(Map<String, dynamic> json) {
    return TelegramBotInfo(
      id: json['id'] as int,
      isBot: json['isBot'] as bool? ?? true,
      firstName: json['firstName'] as String,
      username: json['username'] as String?,
      canJoinGroups: json['canJoinGroups'] as bool?,
      canReadAllGroupMessages: json['canReadAllGroupMessages'] as bool?,
      supportsInlineQueries: json['supportsInlineQueries'] as bool?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'isBot': isBot,
      'firstName': firstName,
      if (username != null) 'username': username,
      if (canJoinGroups != null) 'canJoinGroups': canJoinGroups,
      if (canReadAllGroupMessages != null)
        'canReadAllGroupMessages': canReadAllGroupMessages,
      if (supportsInlineQueries != null)
        'supportsInlineQueries': supportsInlineQueries,
    };
  }
}

/// Response model for listing chats
class TelegramListChatsResponse {
  final List<TelegramChat> chats;

  TelegramListChatsResponse({
    required this.chats,
  });

  factory TelegramListChatsResponse.fromJson(Map<String, dynamic> json) {
    return TelegramListChatsResponse(
      chats: (json['chats'] as List<dynamic>?)
              ?.map((e) => TelegramChat.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

/// Response model for getting updates
class TelegramGetUpdatesResponse {
  final List<TelegramUpdate> updates;

  TelegramGetUpdatesResponse({
    required this.updates,
  });

  factory TelegramGetUpdatesResponse.fromJson(Map<String, dynamic> json) {
    return TelegramGetUpdatesResponse(
      updates: (json['updates'] as List<dynamic>?)
              ?.map((e) => TelegramUpdate.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

/// Response model for test connection
class TelegramTestConnectionResponse {
  final bool success;
  final String? message;
  final TelegramBotInfo? botInfo;

  TelegramTestConnectionResponse({
    required this.success,
    this.message,
    this.botInfo,
  });

  factory TelegramTestConnectionResponse.fromJson(Map<String, dynamic> json) {
    return TelegramTestConnectionResponse(
      success: json['success'] as bool? ?? false,
      message: json['message'] as String?,
      botInfo: json['botInfo'] != null
          ? TelegramBotInfo.fromJson(json['botInfo'] as Map<String, dynamic>)
          : null,
    );
  }
}
