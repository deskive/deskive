// Models for Slack integration

/// Slack connection status
class SlackConnection {
  final String id;
  final String workspaceId;
  final String userId;
  final String? teamId;
  final String? teamName;
  final String? slackUserId;
  final String? slackEmail;
  final String? slackName;
  final String? slackPicture;
  final bool isActive;
  final DateTime? lastSyncedAt;
  final DateTime createdAt;

  SlackConnection({
    required this.id,
    required this.workspaceId,
    required this.userId,
    this.teamId,
    this.teamName,
    this.slackUserId,
    this.slackEmail,
    this.slackName,
    this.slackPicture,
    required this.isActive,
    this.lastSyncedAt,
    required this.createdAt,
  });

  factory SlackConnection.fromJson(Map<String, dynamic> json) {
    return SlackConnection(
      id: json['id'] as String,
      workspaceId: json['workspaceId'] as String,
      userId: json['userId'] as String,
      teamId: json['teamId'] as String?,
      teamName: json['teamName'] as String?,
      slackUserId: json['slackUserId'] as String?,
      slackEmail: json['slackEmail'] as String?,
      slackName: json['slackName'] as String?,
      slackPicture: json['slackPicture'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      lastSyncedAt: json['lastSyncedAt'] != null
          ? DateTime.parse(json['lastSyncedAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

/// Slack channel model
class SlackChannel {
  final String id;
  final String name;
  final String? topic;
  final String? purpose;
  final bool isPrivate;
  final bool isIm;
  final bool isMember;
  final int numMembers;
  final int? created;

  SlackChannel({
    required this.id,
    required this.name,
    this.topic,
    this.purpose,
    required this.isPrivate,
    required this.isIm,
    required this.isMember,
    required this.numMembers,
    this.created,
  });

  factory SlackChannel.fromJson(Map<String, dynamic> json) {
    return SlackChannel(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      topic: json['topic'] as String?,
      purpose: json['purpose'] as String?,
      isPrivate: json['isPrivate'] as bool? ?? false,
      isIm: json['isIm'] as bool? ?? false,
      isMember: json['isMember'] as bool? ?? false,
      numMembers: json['numMembers'] as int? ?? 0,
      created: json['created'] as int?,
    );
  }
}

/// Slack message model
class SlackMessage {
  final String ts;
  final String text;
  final String user;
  final String? username;
  final String? threadTs;
  final int? replyCount;
  final List<dynamic>? attachments;
  final List<dynamic>? blocks;
  final List<SlackReaction>? reactions;

  SlackMessage({
    required this.ts,
    required this.text,
    required this.user,
    this.username,
    this.threadTs,
    this.replyCount,
    this.attachments,
    this.blocks,
    this.reactions,
  });

  factory SlackMessage.fromJson(Map<String, dynamic> json) {
    return SlackMessage(
      ts: json['ts'] as String,
      text: json['text'] as String? ?? '',
      user: json['user'] as String? ?? '',
      username: json['username'] as String?,
      threadTs: json['threadTs'] as String?,
      replyCount: json['replyCount'] as int?,
      attachments: json['attachments'] as List<dynamic>?,
      blocks: json['blocks'] as List<dynamic>?,
      reactions: (json['reactions'] as List<dynamic>?)
          ?.map((r) => SlackReaction.fromJson(r as Map<String, dynamic>))
          .toList(),
    );
  }

  DateTime get timestamp => DateTime.fromMillisecondsSinceEpoch(
        (double.parse(ts) * 1000).toInt(),
      );
}

/// Slack reaction model
class SlackReaction {
  final String name;
  final int count;
  final List<String> users;

  SlackReaction({
    required this.name,
    required this.count,
    required this.users,
  });

  factory SlackReaction.fromJson(Map<String, dynamic> json) {
    return SlackReaction(
      name: json['name'] as String,
      count: json['count'] as int? ?? 0,
      users: (json['users'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }
}

/// Slack user model
class SlackUser {
  final String id;
  final String name;
  final String? realName;
  final String? displayName;
  final String? email;
  final String? image;
  final bool isBot;
  final bool isAdmin;
  final String? statusText;
  final String? statusEmoji;

  SlackUser({
    required this.id,
    required this.name,
    this.realName,
    this.displayName,
    this.email,
    this.image,
    required this.isBot,
    required this.isAdmin,
    this.statusText,
    this.statusEmoji,
  });

  factory SlackUser.fromJson(Map<String, dynamic> json) {
    return SlackUser(
      id: json['id'] as String,
      name: json['name'] as String,
      realName: json['realName'] as String?,
      displayName: json['displayName'] as String?,
      email: json['email'] as String?,
      image: json['image'] as String?,
      isBot: json['isBot'] as bool? ?? false,
      isAdmin: json['isAdmin'] as bool? ?? false,
      statusText: json['statusText'] as String?,
      statusEmoji: json['statusEmoji'] as String?,
    );
  }

  String get bestName => displayName ?? realName ?? name;
}

/// Slack file model
class SlackFile {
  final String id;
  final String name;
  final String? title;
  final String mimetype;
  final int size;
  final String? urlPrivate;
  final String? permalink;
  final String? thumb;
  final int created;
  final String user;

  SlackFile({
    required this.id,
    required this.name,
    this.title,
    required this.mimetype,
    required this.size,
    this.urlPrivate,
    this.permalink,
    this.thumb,
    required this.created,
    required this.user,
  });

  factory SlackFile.fromJson(Map<String, dynamic> json) {
    return SlackFile(
      id: json['id'] as String,
      name: json['name'] as String,
      title: json['title'] as String?,
      mimetype: json['mimetype'] as String? ?? 'application/octet-stream',
      size: json['size'] as int? ?? 0,
      urlPrivate: json['urlPrivate'] as String?,
      permalink: json['permalink'] as String?,
      thumb: json['thumb'] as String?,
      created: json['created'] as int? ?? 0,
      user: json['user'] as String? ?? '',
    );
  }

  DateTime get createdAt =>
      DateTime.fromMillisecondsSinceEpoch(created * 1000);
}

/// List channels response
class SlackListChannelsResponse {
  final List<SlackChannel> channels;
  final String? nextCursor;

  SlackListChannelsResponse({
    required this.channels,
    this.nextCursor,
  });

  factory SlackListChannelsResponse.fromJson(Map<String, dynamic> json) {
    return SlackListChannelsResponse(
      channels: (json['channels'] as List<dynamic>?)
              ?.map((e) => SlackChannel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      nextCursor: json['nextCursor'] as String?,
    );
  }
}

/// List messages response
class SlackListMessagesResponse {
  final List<SlackMessage> messages;
  final bool hasMore;
  final String? nextCursor;

  SlackListMessagesResponse({
    required this.messages,
    required this.hasMore,
    this.nextCursor,
  });

  factory SlackListMessagesResponse.fromJson(Map<String, dynamic> json) {
    return SlackListMessagesResponse(
      messages: (json['messages'] as List<dynamic>?)
              ?.map((e) => SlackMessage.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      hasMore: json['hasMore'] as bool? ?? false,
      nextCursor: json['nextCursor'] as String?,
    );
  }
}

/// List users response
class SlackListUsersResponse {
  final List<SlackUser> members;
  final String? nextCursor;

  SlackListUsersResponse({
    required this.members,
    this.nextCursor,
  });

  factory SlackListUsersResponse.fromJson(Map<String, dynamic> json) {
    return SlackListUsersResponse(
      members: (json['members'] as List<dynamic>?)
              ?.map((e) => SlackUser.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      nextCursor: json['nextCursor'] as String?,
    );
  }
}

/// Send message response
class SlackSendMessageResponse {
  final bool ok;
  final String channel;
  final String ts;
  final SlackMessage? message;

  SlackSendMessageResponse({
    required this.ok,
    required this.channel,
    required this.ts,
    this.message,
  });

  factory SlackSendMessageResponse.fromJson(Map<String, dynamic> json) {
    return SlackSendMessageResponse(
      ok: json['ok'] as bool? ?? false,
      channel: json['channel'] as String? ?? '',
      ts: json['ts'] as String? ?? '',
      message: json['message'] != null
          ? SlackMessage.fromJson(json['message'] as Map<String, dynamic>)
          : null,
    );
  }
}
