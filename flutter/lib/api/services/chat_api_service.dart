import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../base_api_client.dart';

/// DTO classes for Chat operations

class AttachmentDto {
  final String id;
  final String fileName;
  final String url;
  final String mimeType;
  final String fileSize;

  AttachmentDto({
    required this.id,
    required this.fileName,
    required this.url,
    required this.mimeType,
    required this.fileSize,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'fileName': fileName,
    'url': url,
    'mimeType': mimeType,
    'fileSize': fileSize,
  };

  factory AttachmentDto.fromJson(Map<String, dynamic> json) {
    return AttachmentDto(
      id: json['id'],
      fileName: json['fileName'] ?? json['file_name'] ?? '',
      url: json['url'],
      mimeType: json['mimeType'] ?? json['mime_type'] ?? '',
      fileSize: json['fileSize']?.toString() ?? json['file_size']?.toString() ?? '0',
    );
  }
}

class CreateChannelDto {
  final String name;
  final String? description;
  final String type; // 'channel'
  final bool isPrivate;
  final List<String>? memberIds;

  CreateChannelDto({
    required this.name,
    this.description,
    this.type = 'channel',
    this.isPrivate = false,
    this.memberIds,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    if (description != null && description!.isNotEmpty) 'description': description,
    'type': type,
    'is_private': isPrivate,
    if (memberIds != null) 'member_ids': memberIds,
  };
}

class CreateConversationDto {
  final List<String> participantIds;
  final String? name;
  final String type;

  CreateConversationDto({
    required this.participantIds,
    this.name,
    this.type = 'direct',
  });

  Map<String, dynamic> toJson() => {
    'participants': participantIds,
    if (name != null) 'name': name,
    'type': type,
  };
}

class SendMessageDto {
  final String content;
  final String? contentHtml;
  final List<AttachmentDto>? attachments;
  final List<String>? mentions;
  final String? parentId; // For threaded messages
  final List<Map<String, dynamic>>? linkedContent; // For / attached content (notes, events, files)

  // E2EE fields
  final String? encryptedContent;
  final Map<String, dynamic>? encryptionMetadata;
  final bool? isEncrypted;

  SendMessageDto({
    required this.content,
    this.contentHtml,
    this.attachments,
    this.mentions,
    this.parentId,
    this.linkedContent,
    this.encryptedContent,
    this.encryptionMetadata,
    this.isEncrypted,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'content': content,
    };

    if (contentHtml != null) json['content_html'] = contentHtml;
    if (attachments != null && attachments!.isNotEmpty) {
      json['attachments'] = attachments!.map((a) => a.toJson()).toList();
    }
    if (mentions != null && mentions!.isNotEmpty) json['mentions'] = mentions;
    if (parentId != null) json['parent_id'] = parentId;
    if (linkedContent != null && linkedContent!.isNotEmpty) {
      json['linked_content'] = linkedContent;
    }

    // Add E2EE fields
    if (encryptedContent != null) json['encrypted_content'] = encryptedContent;
    if (encryptionMetadata != null) json['encryption_metadata'] = encryptionMetadata;
    if (isEncrypted != null) json['is_encrypted'] = isEncrypted;

    return json;
  }
}

class UpdateMessageDto {
  final String? content;
  final String? contentHtml;
  final String? threadId;
  final String? parentId;
  final List<AttachmentDto>? attachments;
  final List<String>? mentions;
  final Map<String, dynamic>? metadata;

  UpdateMessageDto({
    this.content,
    this.contentHtml,
    this.threadId,
    this.parentId,
    this.attachments,
    this.mentions,
    this.metadata,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (content != null) map['content'] = content;
    if (contentHtml != null) map['content_html'] = contentHtml;
    if (threadId != null) map['thread_id'] = threadId;
    if (parentId != null) map['parent_id'] = parentId;
    if (attachments != null && attachments!.isNotEmpty) {
      map['attachments'] = attachments!.map((a) => a.toJson()).toList();
    }
    if (mentions != null && mentions!.isNotEmpty) {
      map['mentions'] = mentions;
    }
    if (metadata != null) map['metadata'] = metadata;
    return map;
  }
}

/// Model classes

class ChannelMember {
  final String userId;
  final String email;
  final String? name;
  final String? avatar;
  final String role; // 'admin', 'member'
  final DateTime joinedAt;

  ChannelMember({
    required this.userId,
    required this.email,
    this.name,
    this.avatar,
    required this.role,
    required this.joinedAt,
  });

  factory ChannelMember.fromJson(Map<String, dynamic> json) {
    // Debug: Print the raw JSON to see what fields are available

    // Try multiple possible field names for the display name
    final displayName = json['name'] ??
                        json['full_name'] ??
                        json['fullName'] ??
                        json['display_name'] ??
                        json['displayName'] ??
                        json['username'] ??
                        json['user_name'];


    return ChannelMember(
      userId: json['user_id'] ?? json['userId'],
      email: json['email'],
      name: displayName,
      avatar: json['avatar'] ?? json['avatar_url'] ?? json['avatarUrl'],
      role: json['role'] ?? 'member',
      joinedAt: json['joined_at'] != null || json['joinedAt'] != null
          ? DateTime.parse(json['joined_at'] ?? json['joinedAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'user_id': userId,
    'email': email,
    if (name != null) 'name': name,
    if (avatar != null) 'avatar': avatar,
    'role': role,
    'joined_at': joinedAt.toIso8601String(),
  };
}

class Channel {
  final String id;
  final String name;
  final String? description;
  final String type;
  final String workspaceId;
  final String createdBy;
  final bool isPrivate;
  final bool isArchived;
  final String? archivedBy;
  final DateTime? archivedAt;
  final Map<String, dynamic>? collaborativeData;
  final int memberCount;
  final DateTime? lastMessageAt;
  final int unreadCount;
  final bool isMember; // NEW: Indicates if current user is a member
  final DateTime createdAt;
  final DateTime updatedAt;

  Channel({
    required this.id,
    required this.name,
    this.description,
    required this.type,
    required this.workspaceId,
    required this.createdBy,
    required this.isPrivate,
    required this.isArchived,
    this.archivedBy,
    this.archivedAt,
    this.collaborativeData,
    this.memberCount = 0,
    this.lastMessageAt,
    this.unreadCount = 0,
    this.isMember = true, // Default to true for backward compatibility
    required this.createdAt,
    required this.updatedAt,
  });

  factory Channel.fromJson(Map<String, dynamic> json) {
    return Channel(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      type: json['type'],
      workspaceId: json['workspaceId'] ?? json['workspace_id'],
      createdBy: json['createdBy'] ?? json['created_by'],
      isPrivate: json['isPrivate'] ?? json['is_private'] ?? false,
      isArchived: json['isArchived'] ?? json['is_archived'] ?? false,
      archivedBy: json['archivedBy'] ?? json['archived_by'],
      archivedAt: json['archivedAt'] != null || json['archived_at'] != null
          ? DateTime.parse(json['archivedAt'] ?? json['archived_at'])
          : null,
      collaborativeData: json['collaborativeData'] ?? json['collaborative_data'],
      memberCount: json['memberCount'] ?? json['member_count'] ?? 0,
      lastMessageAt: json['lastMessageAt'] != null || json['last_message_at'] != null
          ? DateTime.parse(json['lastMessageAt'] ?? json['last_message_at'])
          : null,
      unreadCount: json['unreadCount'] ?? json['unread_count'] ?? 0,
      isMember: json['isMember'] ?? json['is_member'] ?? true, // Parse isMember field
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at']),
    );
  }
}

class Conversation {
  final String id;
  final String? name;
  final String? description;
  final String type; // 'direct', 'group'
  final String workspaceId;
  final List<String> participants;
  final String createdBy;
  final bool isActive;
  final bool isArchived;
  final String? archivedBy;
  final DateTime? archivedAt;
  final DateTime? lastMessageAt;
  final int messageCount;
  final Map<String, dynamic>? settings;
  final Map<String, dynamic>? collaborativeData;
  final int unreadCount;
  final bool isStarred;
  final DateTime? starredAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  Conversation({
    required this.id,
    this.name,
    this.description,
    required this.type,
    required this.workspaceId,
    required this.participants,
    required this.createdBy,
    required this.isActive,
    required this.isArchived,
    this.archivedBy,
    this.archivedAt,
    this.lastMessageAt,
    required this.messageCount,
    this.settings,
    this.collaborativeData,
    this.unreadCount = 0,
    this.isStarred = false,
    this.starredAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      type: json['type'] ?? 'direct',
      workspaceId: json['workspaceId'] ?? json['workspace_id'],
      participants: List<String>.from(json['participants'] ?? []),
      createdBy: json['createdBy'] ?? json['created_by'],
      isActive: json['isActive'] ?? json['is_active'] ?? true,
      isArchived: json['isArchived'] ?? json['is_archived'] ?? false,
      archivedBy: json['archivedBy'] ?? json['archived_by'],
      archivedAt: json['archivedAt'] != null || json['archived_at'] != null
          ? DateTime.parse(json['archivedAt'] ?? json['archived_at'])
          : null,
      lastMessageAt: json['lastMessageAt'] != null || json['last_message_at'] != null
          ? DateTime.parse(json['lastMessageAt'] ?? json['last_message_at'])
          : null,
      messageCount: json['messageCount'] ?? json['message_count'] ?? 0,
      settings: json['settings'],
      collaborativeData: json['collaborativeData'] ?? json['collaborative_data'],
      unreadCount: json['unreadCount'] ?? json['unread_count'] ?? 0,
      isStarred: json['isStarred'] ?? json['is_starred'] ?? false,
      starredAt: json['starredAt'] != null || json['starred_at'] != null
          ? DateTime.parse(json['starredAt'] ?? json['starred_at'])
          : null,
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at']),
    );
  }

  /// Create a copy with updated fields
  Conversation copyWith({
    String? id,
    String? name,
    String? description,
    String? type,
    String? workspaceId,
    List<String>? participants,
    String? createdBy,
    bool? isActive,
    bool? isArchived,
    String? archivedBy,
    DateTime? archivedAt,
    DateTime? lastMessageAt,
    int? messageCount,
    Map<String, dynamic>? settings,
    Map<String, dynamic>? collaborativeData,
    int? unreadCount,
    bool? isStarred,
    DateTime? starredAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Conversation(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      type: type ?? this.type,
      workspaceId: workspaceId ?? this.workspaceId,
      participants: participants ?? this.participants,
      createdBy: createdBy ?? this.createdBy,
      isActive: isActive ?? this.isActive,
      isArchived: isArchived ?? this.isArchived,
      archivedBy: archivedBy ?? this.archivedBy,
      archivedAt: archivedAt ?? this.archivedAt,
      lastMessageAt: lastMessageAt ?? this.lastMessageAt,
      messageCount: messageCount ?? this.messageCount,
      settings: settings ?? this.settings,
      collaborativeData: collaborativeData ?? this.collaborativeData,
      unreadCount: unreadCount ?? this.unreadCount,
      isStarred: isStarred ?? this.isStarred,
      starredAt: starredAt ?? this.starredAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Helper function to parse reactions from various API formats
/// Handles both List format: [{id, value, count, memberIds}]
/// and Map format: {"👍": 2, "❤️": 1}
/// Returns Map with emoji as key and {count: int, memberIds: List} as value
Map<String, dynamic> _parseReactions(dynamic reactions) {
  if (reactions == null) return {};

  // If it's already a Map, return it with structure normalization
  if (reactions is Map) {
    final Map<String, dynamic> result = {};
    reactions.forEach((key, value) {
      if (value is int) {
        result[key.toString()] = {'count': value, 'memberIds': <String>[]};
      } else if (value is Map) {
        result[key.toString()] = {
          'count': value['count'] ?? 1,
          'memberIds': List<String>.from(value['memberIds'] ?? []),
        };
      } else {
        result[key.toString()] = {'count': 1, 'memberIds': <String>[]};
      }
    });
    return result;
  }

  // If it's a List of reaction objects, convert to Map<emoji, {count, memberIds}>
  if (reactions is List) {
    final Map<String, dynamic> result = {};
    for (final reaction in reactions) {
      if (reaction is Map) {
        // Format: {id, value: "👍", count: 1, memberIds: [...]}
        final emoji = reaction['value'] ?? reaction['emoji'];
        final count = reaction['count'] ??
                     (reaction['memberIds'] as List?)?.length ??
                     1;
        final memberIds = reaction['memberIds'] != null
            ? List<String>.from(reaction['memberIds'])
            : <String>[];
        if (emoji != null) {
          result[emoji.toString()] = {'count': count, 'memberIds': memberIds};
        }
      }
    }
    return result;
  }

  return {};
}

class Message {
  final String id;
  final String content;
  final String? contentHtml;
  final String userId;
  final String? senderName;
  final String? senderAvatar;
  final String? channelId;
  final String? conversationId;
  final String? threadId;
  final String? parentId;
  final int replyCount;
  final List<dynamic> attachments;
  final List<dynamic> mentions;
  final Map<String, dynamic> reactions;
  final Map<String, dynamic>? collaborativeData;
  final List<Map<String, dynamic>>? linkedContent; // For / attached content (notes, events, files)
  final bool isEdited;
  final bool isDeleted;
  final bool isPinned;
  final DateTime? pinnedAt;
  final String? pinnedBy;
  final bool isBookmarked;
  final DateTime? bookmarkedAt;
  final String? bookmarkedBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int readByCount;

  // E2EE fields
  final String? encryptedContent;
  final Map<String, dynamic>? encryptionMetadata;
  final bool isEncrypted;

  Message({
    required this.id,
    required this.content,
    this.contentHtml,
    required this.userId,
    this.senderName,
    this.senderAvatar,
    this.channelId,
    this.conversationId,
    this.threadId,
    this.parentId,
    this.replyCount = 0,
    this.attachments = const [],
    this.mentions = const [],
    this.reactions = const {},
    this.collaborativeData,
    this.linkedContent,
    required this.isEdited,
    required this.isDeleted,
    this.isPinned = false,
    this.pinnedAt,
    this.pinnedBy,
    this.isBookmarked = false,
    this.bookmarkedAt,
    this.bookmarkedBy,
    required this.createdAt,
    required this.updatedAt,
    this.readByCount = 0,
    this.encryptedContent,
    this.encryptionMetadata,
    this.isEncrypted = false,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    // Extract user data if available
    final user = json['user'] as Map<String, dynamic>?;
    final extractedAvatar = json['senderAvatar'] ?? json['sender_avatar'] ?? user?['avatarUrl'] ?? user?['avatar_url'];

    // Debug: Check for parent_id in API response
    final parentId = json['parentId'] ?? json['parent_id'];
    if (parentId != null) {
      print('🔗 API Message has parent_id: $parentId (content: ${(json['content'] ?? '').toString().substring(0, (json['content'] ?? '').toString().length > 20 ? 20 : (json['content'] ?? '').toString().length)}...)');
    }

    return Message(
      id: json['id'],
      content: json['content'] ?? '',
      contentHtml: json['contentHtml'] ?? json['content_html'],
      userId: json['userId'] ?? json['user_id'],
      senderName: json['senderName'] ?? json['sender_name'] ?? user?['name'],
      senderAvatar: extractedAvatar,
      channelId: json['channelId'] ?? json['channel_id'],
      conversationId: json['conversationId'] ?? json['conversation_id'],
      threadId: json['threadId'] ?? json['thread_id'],
      parentId: json['parentId'] ?? json['parent_id'],
      replyCount: json['replyCount'] ?? json['reply_count'] ?? 0,
      attachments: json['attachments'] ?? [],
      mentions: json['mentions'] ?? [],
      reactions: _parseReactions(json['reactions']),
      collaborativeData: json['collaborativeData'] ?? json['collaborative_data'],
      linkedContent: json['linkedContent'] != null || json['linked_content'] != null
          ? List<Map<String, dynamic>>.from(
              (json['linkedContent'] ?? json['linked_content']).map((e) => Map<String, dynamic>.from(e)))
          : null,
      isEdited: json['isEdited'] ?? json['is_edited'] ?? false,
      isDeleted: json['isDeleted'] ?? json['is_deleted'] ?? false,
      isPinned: json['isPinned'] ?? json['is_pinned'] ?? false,
      pinnedAt: json['pinnedAt'] != null || json['pinned_at'] != null
          ? DateTime.parse(json['pinnedAt'] ?? json['pinned_at'])
          : null,
      pinnedBy: json['pinnedBy'] ?? json['pinned_by'],
      isBookmarked: json['isBookmarked'] ?? json['is_bookmarked'] ?? false,
      bookmarkedAt: json['bookmarkedAt'] != null || json['bookmarked_at'] != null
          ? DateTime.parse(json['bookmarkedAt'] ?? json['bookmarked_at'])
          : null,
      bookmarkedBy: json['bookmarkedBy'] ?? json['bookmarked_by'],
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at']),
      readByCount: json['readByCount'] ?? json['read_by_count'] ?? 0,
      encryptedContent: json['encrypted_content'] ?? json['encryptedContent'],
      encryptionMetadata: json['encryption_metadata'] ?? json['encryptionMetadata'],
      isEncrypted: json['is_encrypted'] ?? json['isEncrypted'] ?? false,
    );
  }

  // Backward compatibility getters
  String get senderId => userId;
  String? get replyToId => parentId;
}

class MessageReaction {
  final String id;
  final String messageId;
  final String emoji;
  final String userId;
  final String? userName;
  final DateTime createdAt;

  MessageReaction({
    required this.id,
    required this.messageId,
    required this.emoji,
    required this.userId,
    this.userName,
    required this.createdAt,
  });

  factory MessageReaction.fromJson(Map<String, dynamic> json) {
    return MessageReaction(
      id: json['id'],
      messageId: json['messageId'] ?? json['message_id'],
      emoji: json['emoji'],
      userId: json['userId'] ?? json['user_id'],
      userName: json['userName'] ?? json['user_name'],
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
    );
  }
}

// ==================== POLL MODELS ====================

/// Individual poll option
class PollOption {
  final String id;
  final String text;
  final int voteCount;

  PollOption({
    required this.id,
    required this.text,
    this.voteCount = 0,
  });

  factory PollOption.fromJson(Map<String, dynamic> json) {
    return PollOption(
      id: json['id'] ?? '',
      text: json['text'] ?? '',
      voteCount: json['voteCount'] ?? json['vote_count'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'text': text,
    'voteCount': voteCount,
  };

  PollOption copyWith({
    String? id,
    String? text,
    int? voteCount,
  }) {
    return PollOption(
      id: id ?? this.id,
      text: text ?? this.text,
      voteCount: voteCount ?? this.voteCount,
    );
  }
}

/// Poll data structure
class Poll {
  final String id;
  final String question;
  final List<PollOption> options;
  final bool isOpen;
  final bool showResultsBeforeVoting;
  final String createdBy;
  final int totalVotes;
  final String? userVotedOptionId;

  Poll({
    required this.id,
    required this.question,
    required this.options,
    this.isOpen = true,
    this.showResultsBeforeVoting = false,
    required this.createdBy,
    this.totalVotes = 0,
    this.userVotedOptionId,
  });

  factory Poll.fromJson(Map<String, dynamic> json) {
    return Poll(
      id: json['id'] ?? '',
      question: json['question'] ?? '',
      options: (json['options'] as List<dynamic>?)
          ?.map((o) => PollOption.fromJson(o))
          .toList() ?? [],
      isOpen: json['isOpen'] ?? json['is_open'] ?? true,
      showResultsBeforeVoting: json['showResultsBeforeVoting'] ??
          json['show_results_before_voting'] ?? false,
      createdBy: json['createdBy'] ?? json['created_by'] ?? '',
      totalVotes: json['totalVotes'] ?? json['total_votes'] ?? 0,
      userVotedOptionId: json['userVotedOptionId'] ?? json['user_voted_option_id'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'question': question,
    'options': options.map((o) => o.toJson()).toList(),
    'isOpen': isOpen,
    'showResultsBeforeVoting': showResultsBeforeVoting,
    'createdBy': createdBy,
    'totalVotes': totalVotes,
    if (userVotedOptionId != null) 'userVotedOptionId': userVotedOptionId,
  };

  Poll copyWith({
    String? id,
    String? question,
    List<PollOption>? options,
    bool? isOpen,
    bool? showResultsBeforeVoting,
    String? createdBy,
    int? totalVotes,
    String? userVotedOptionId,
  }) {
    return Poll(
      id: id ?? this.id,
      question: question ?? this.question,
      options: options ?? this.options,
      isOpen: isOpen ?? this.isOpen,
      showResultsBeforeVoting: showResultsBeforeVoting ?? this.showResultsBeforeVoting,
      createdBy: createdBy ?? this.createdBy,
      totalVotes: totalVotes ?? this.totalVotes,
      userVotedOptionId: userVotedOptionId ?? this.userVotedOptionId,
    );
  }
}

/// DTO for creating a poll (used in linkedContent)
class CreatePollDto {
  final String id;
  final String question;
  final List<PollOption> options;
  final bool showResultsBeforeVoting;
  final String createdBy;

  CreatePollDto({
    required this.id,
    required this.question,
    required this.options,
    this.showResultsBeforeVoting = false,
    required this.createdBy,
  });

  Map<String, dynamic> toLinkedContent() => {
    'id': id,
    'title': question,
    'type': 'poll',
    'poll': {
      'id': id,
      'question': question,
      'options': options.map((o) => o.toJson()).toList(),
      'isOpen': true,
      'showResultsBeforeVoting': showResultsBeforeVoting,
      'createdBy': createdBy,
      'totalVotes': 0,
    },
  };
}

// ==================== SCHEDULED MESSAGE MODELS ====================

/// Scheduled message status
enum ScheduledMessageStatus {
  pending,
  sent,
  cancelled,
  failed,
}

/// Scheduled message model
class ScheduledMessage {
  final String id;
  final String workspaceId;
  final String? channelId;
  final String? conversationId;
  final String userId;
  final String content;
  final String? contentHtml;
  final List<dynamic> attachments;
  final List<String> mentions;
  final List<Map<String, dynamic>> linkedContent;
  final DateTime scheduledFor;
  final ScheduledMessageStatus status;
  final DateTime? sentAt;
  final String? messageId;
  final String? errorMessage;
  final DateTime createdAt;
  final DateTime updatedAt;

  ScheduledMessage({
    required this.id,
    required this.workspaceId,
    this.channelId,
    this.conversationId,
    required this.userId,
    required this.content,
    this.contentHtml,
    this.attachments = const [],
    this.mentions = const [],
    this.linkedContent = const [],
    required this.scheduledFor,
    required this.status,
    this.sentAt,
    this.messageId,
    this.errorMessage,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ScheduledMessage.fromJson(Map<String, dynamic> json) {
    return ScheduledMessage(
      id: json['id'],
      workspaceId: json['workspaceId'] ?? json['workspace_id'],
      channelId: json['channelId'] ?? json['channel_id'],
      conversationId: json['conversationId'] ?? json['conversation_id'],
      userId: json['userId'] ?? json['user_id'],
      content: json['content'] ?? '',
      contentHtml: json['contentHtml'] ?? json['content_html'],
      attachments: json['attachments'] ?? [],
      mentions: List<String>.from(json['mentions'] ?? []),
      linkedContent: json['linkedContent'] != null || json['linked_content'] != null
          ? List<Map<String, dynamic>>.from(
              (json['linkedContent'] ?? json['linked_content']).map((e) => Map<String, dynamic>.from(e)))
          : [],
      scheduledFor: DateTime.parse(json['scheduledFor'] ?? json['scheduled_for'] ?? json['scheduledAt'] ?? json['scheduled_at']).toLocal(),
      status: _parseStatus(json['status']),
      sentAt: json['sentAt'] != null || json['sent_at'] != null
          ? DateTime.parse(json['sentAt'] ?? json['sent_at'])
          : null,
      messageId: json['messageId'] ?? json['message_id'] ?? json['sentMessageId'] ?? json['sent_message_id'],
      errorMessage: json['errorMessage'] ?? json['error_message'] ?? json['failureReason'] ?? json['failure_reason'],
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at']),
      updatedAt: DateTime.parse(json['updatedAt'] ?? json['updated_at']),
    );
  }

  static ScheduledMessageStatus _parseStatus(String? status) {
    switch (status) {
      case 'sent':
        return ScheduledMessageStatus.sent;
      case 'cancelled':
        return ScheduledMessageStatus.cancelled;
      case 'failed':
        return ScheduledMessageStatus.failed;
      default:
        return ScheduledMessageStatus.pending;
    }
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'workspaceId': workspaceId,
    if (channelId != null) 'channelId': channelId,
    if (conversationId != null) 'conversationId': conversationId,
    'userId': userId,
    'content': content,
    if (contentHtml != null) 'contentHtml': contentHtml,
    'attachments': attachments,
    'mentions': mentions,
    'linkedContent': linkedContent,
    'scheduledFor': scheduledFor.toIso8601String(),
    'status': status.name,
    if (sentAt != null) 'sentAt': sentAt!.toIso8601String(),
    if (messageId != null) 'messageId': messageId,
    if (errorMessage != null) 'errorMessage': errorMessage,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };

  ScheduledMessage copyWith({
    String? id,
    String? workspaceId,
    String? channelId,
    String? conversationId,
    String? userId,
    String? content,
    String? contentHtml,
    List<dynamic>? attachments,
    List<String>? mentions,
    List<Map<String, dynamic>>? linkedContent,
    DateTime? scheduledFor,
    ScheduledMessageStatus? status,
    DateTime? sentAt,
    String? messageId,
    String? errorMessage,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ScheduledMessage(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      channelId: channelId ?? this.channelId,
      conversationId: conversationId ?? this.conversationId,
      userId: userId ?? this.userId,
      content: content ?? this.content,
      contentHtml: contentHtml ?? this.contentHtml,
      attachments: attachments ?? this.attachments,
      mentions: mentions ?? this.mentions,
      linkedContent: linkedContent ?? this.linkedContent,
      scheduledFor: scheduledFor ?? this.scheduledFor,
      status: status ?? this.status,
      sentAt: sentAt ?? this.sentAt,
      messageId: messageId ?? this.messageId,
      errorMessage: errorMessage ?? this.errorMessage,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// DTO for creating a scheduled message
class CreateScheduledMessageDto {
  final String content;
  final String? contentHtml;
  final String? channelId;
  final String? conversationId;
  final DateTime scheduledFor;
  final List<AttachmentDto>? attachments;
  final List<String>? mentions;
  final List<Map<String, dynamic>>? linkedContent;

  CreateScheduledMessageDto({
    required this.content,
    this.contentHtml,
    this.channelId,
    this.conversationId,
    required this.scheduledFor,
    this.attachments,
    this.mentions,
    this.linkedContent,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'content': content,
      'scheduledAt': scheduledFor.toIso8601String(),
    };

    if (contentHtml != null) json['contentHtml'] = contentHtml;
    if (channelId != null) json['channelId'] = channelId;
    if (conversationId != null) json['conversationId'] = conversationId;
    if (attachments != null && attachments!.isNotEmpty) {
      json['attachments'] = attachments!.map((a) => a.toJson()).toList();
    }
    if (mentions != null && mentions!.isNotEmpty) json['mentions'] = mentions;
    if (linkedContent != null && linkedContent!.isNotEmpty) {
      json['linkedContent'] = linkedContent;
    }

    return json;
  }
}

/// DTO for updating a scheduled message
class UpdateScheduledMessageDto {
  final String? content;
  final String? contentHtml;
  final DateTime? scheduledFor;
  final List<AttachmentDto>? attachments;
  final List<String>? mentions;
  final List<Map<String, dynamic>>? linkedContent;

  UpdateScheduledMessageDto({
    this.content,
    this.contentHtml,
    this.scheduledFor,
    this.attachments,
    this.mentions,
    this.linkedContent,
  });

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};

    if (content != null) json['content'] = content;
    if (contentHtml != null) json['contentHtml'] = contentHtml;
    if (scheduledFor != null) json['scheduledAt'] = scheduledFor!.toIso8601String();
    if (attachments != null) {
      json['attachments'] = attachments!.map((a) => a.toJson()).toList();
    }
    if (mentions != null) json['mentions'] = mentions;
    if (linkedContent != null) json['linkedContent'] = linkedContent;

    return json;
  }
}

/// API service for chat operations (non-realtime)
class ChatApiService {
  final BaseApiClient _apiClient;
  
  ChatApiService({BaseApiClient? apiClient}) 
      : _apiClient = apiClient ?? BaseApiClient.instance;
  
  // ==================== CHANNEL OPERATIONS ====================
  
  /// Create a new channel
  Future<ApiResponse<Channel>> createChannel(
    String workspaceId,
    CreateChannelDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/channels',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        Channel.fromJson(response.data),
        message: 'Channel created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create channel',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get all channels in workspace
  Future<ApiResponse<List<Channel>>> getChannels(String workspaceId) async {
    try {
      final response = await _apiClient.get('/workspaces/$workspaceId/channels');

      // Backend returns { data: [...] }
      final responseData = response.data is Map ? response.data['data'] : response.data;
      final channels = (responseData as List)
          .map((json) => Channel.fromJson(json))
          .toList();

      return ApiResponse.success(
        channels,
        message: 'Channels retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get channels',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Search private channels by name
  Future<ApiResponse<List<Channel>>> searchPrivateChannels(
    String workspaceId,
    String searchQuery,
  ) async {
    try {

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/channels/search-private',
        queryParameters: {'name': searchQuery},
      );

      // Backend returns { data: [...] }
      final responseData = response.data is Map ? response.data['data'] : response.data;
      final channels = (responseData as List)
          .map((json) => Channel.fromJson(json))
          .toList();

      return ApiResponse.success(
        channels,
        message: 'Found ${channels.length} private channel(s)',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to search private channels',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Join a public channel
  Future<ApiResponse<void>> joinChannel(
    String workspaceId,
    String channelId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/channels/$channelId/join',
      );
      
      return ApiResponse.success(
        null,
        message: 'Successfully joined channel',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to join channel',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Leave a channel
  Future<ApiResponse<void>> leaveChannel(
    String workspaceId,
    String channelId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/channels/$channelId/leave',
      );

      return ApiResponse.success(
        null,
        message: 'Successfully left channel',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to leave channel',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Update channel details
  Future<ApiResponse<Channel>> updateChannel(
    String workspaceId,
    String channelId, {
    String? name,
    String? description,
    bool? isPrivate,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (name != null) data['name'] = name;
      if (description != null) data['description'] = description;
      if (isPrivate != null) data['is_private'] = isPrivate;

      final response = await _apiClient.put(
        '/workspaces/$workspaceId/channels/$channelId',
        data: data,
      );

      // Handle response: {"data":[{...}],"count":1} or {"data":{...}} or direct object
      dynamic channelData;
      if (response.data is Map && response.data['data'] != null) {
        final dataField = response.data['data'];
        channelData = dataField is List ? dataField.first : dataField;
      } else {
        channelData = response.data;
      }

      return ApiResponse.success(
        Channel.fromJson(channelData),
        message: 'Channel updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update channel',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Delete a channel
  Future<ApiResponse<void>> deleteChannel(
    String workspaceId,
    String channelId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/channels/$channelId',
      );

      return ApiResponse.success(
        null,
        message: 'Channel deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete channel',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get channel members
  Future<ApiResponse<List<ChannelMember>>> getChannelMembers(
    String workspaceId,
    String channelId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/channels/$channelId/members',
      );

      // Handle both direct list response and wrapped response
      final List<dynamic> membersJson = response.data is List
          ? response.data
          : (response.data['data'] ?? []);
      final members = membersJson.map((json) => ChannelMember.fromJson(json)).toList();

      return ApiResponse.success(
        members,
        message: 'Channel members fetched successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to fetch channel members',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Add members to a channel
  /// Uses PUT /workspaces/{workspaceId}/channels/{channelId} with member_ids
  Future<ApiResponse<void>> addChannelMembers(
    String workspaceId,
    String channelId,
    List<String> userIds, {
    bool isPrivate = true,
  }) async {
    try {
      final response = await _apiClient.put(
        '/workspaces/$workspaceId/channels/$channelId',
        data: {
          'is_private': isPrivate,
          'member_ids': userIds,
        },
      );

      return ApiResponse.success(
        null,
        message: 'Members added successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to add members',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Remove a member from a channel
  /// Uses PUT endpoint with updated member_ids list (excluding the member to remove)
  /// Note: is_private: true is required for the backend to process member updates
  Future<ApiResponse<void>> removeChannelMember(
    String workspaceId,
    String channelId,
    String userIdToRemove,
    List<String> currentMemberIds,
  ) async {
    try {
      // Filter out the member to remove
      final updatedMemberIds = currentMemberIds
          .where((id) => id != userIdToRemove)
          .toList();

      final response = await _apiClient.put(
        '/workspaces/$workspaceId/channels/$channelId',
        data: {
          'is_private': true, // Required for backend to process member updates
          'member_ids': updatedMemberIds,
        },
      );

      return ApiResponse.success(
        null,
        message: 'Member removed successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to remove member',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get channel messages
  Future<ApiResponse<List<Message>>> getChannelMessages(
    String workspaceId,
    String channelId, {
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/channels/$channelId/messages',
        queryParameters: {
          'limit': limit,
          'offset': offset,
        },
      );
      
      final messages = (response.data as List)
          .map((json) => Message.fromJson(json))
          .toList();
      
      return ApiResponse.success(
        messages,
        message: 'Channel messages retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get channel messages',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Send message to channel
  Future<ApiResponse<Message>> sendChannelMessage(
    String workspaceId,
    String channelId,
    SendMessageDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/channels/$channelId/messages',
        data: dto.toJson(),
      );
      
      return ApiResponse.success(
        Message.fromJson(response.data),
        message: 'Message sent successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to send message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  // ==================== CONVERSATION OPERATIONS ====================
  
  /// Create a new conversation
  Future<ApiResponse<Conversation>> createConversation(
    String workspaceId,
    CreateConversationDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/conversations',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        Conversation.fromJson(response.data),
        message: 'Conversation created successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to create conversation',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get all conversations for user
  Future<ApiResponse<List<Conversation>>> getConversations(String workspaceId) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/conversations',
      );

      // Backend returns { data: [...] }
      final responseData = response.data is Map ? response.data['data'] : response.data;
      final conversations = (responseData as List)
          .map((json) => Conversation.fromJson(json))
          .toList();

      return ApiResponse.success(
        conversations,
        message: 'Conversations retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get conversations',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Get conversation messages
  Future<ApiResponse<List<Message>>> getConversationMessages(
    String workspaceId,
    String conversationId, {
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/conversations/$conversationId/messages',
        queryParameters: {
          'limit': limit,
          'offset': offset,
        },
      );

      final messages = (response.data as List)
          .map((json) => Message.fromJson(json))
          .toList();

      return ApiResponse.success(
        messages,
        message: 'Conversation messages retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get conversation messages',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Send message to conversation
  Future<ApiResponse<Message>> sendConversationMessage(
    String workspaceId,
    String conversationId,
    SendMessageDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/conversations/$conversationId/messages',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        Message.fromJson(response.data),
        message: 'Message sent successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to send message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  // ==================== MESSAGE OPERATIONS ====================
  
  /// Update a message
  Future<ApiResponse<Message>> updateMessage(
    String workspaceId,
    String messageId,
    UpdateMessageDto dto,
  ) async {
    try {
      final response = await _apiClient.patch(
        '/workspaces/$workspaceId/messages/$messageId',
        data: dto.toJson(),
      );

      // API returns {"data": [{...message...}], "count": 1}
      final messageData = response.data['data'] is List && (response.data['data'] as List).isNotEmpty
          ? response.data['data'][0]
          : response.data;

      return ApiResponse.success(
        Message.fromJson(messageData),
        message: 'Message updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Delete a message
  Future<ApiResponse<void>> deleteMessage(
    String workspaceId,
    String messageId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/messages/$messageId',
      );
      
      return ApiResponse.success(
        null,
        message: 'Message deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Add reaction to message
  Future<ApiResponse<MessageReaction>> addReaction(
    String workspaceId,
    String messageId,
    String emoji,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/messages/$messageId/reactions/$emoji',
      );

      // API returns {"added":true/false,"reaction":{...}}
      final reactionData = response.data['reaction'];
      if (reactionData == null) {
        return ApiResponse.error(
          'No reaction data in response',
          statusCode: response.statusCode,
        );
      }

      return ApiResponse.success(
        MessageReaction.fromJson(reactionData),
        message: response.data['added'] == true ? 'Reaction added' : 'Reaction removed',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to add reaction',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
  
  /// Remove reaction from message
  Future<ApiResponse<void>> removeReaction(
    String workspaceId,
    String messageId,
    String emoji,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/messages/$messageId/reactions/$emoji',
      );
      
      return ApiResponse.success(
        null,
        message: 'Reaction removed successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to remove reaction',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Mark message as read
  Future<ApiResponse<void>> markMessageAsRead(
    String workspaceId,
    String messageId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/messages/$messageId/read',
      );
      
      return ApiResponse.success(
        null,
        message: 'Message marked as read',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to mark message as read',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Mark all messages in channel as read
  Future<ApiResponse<void>> markChannelAsRead(
    String workspaceId,
    String channelId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/channels/$channelId/read',
      );

      return ApiResponse.success(
        null,
        message: 'Channel marked as read',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to mark channel as read',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Mark all messages in conversation as read
  /// This creates read receipts and triggers the messages:read WebSocket event
  Future<ApiResponse<void>> markConversationAsRead(
    String workspaceId,
    String conversationId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/conversations/$conversationId/read',
      );

      return ApiResponse.success(
        null,
        message: 'Conversation marked as read',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to mark conversation as read',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== PIN MESSAGE OPERATIONS ====================

  /// Pin a message in a conversation
  /// Only one message can be pinned per conversation at a time
  Future<ApiResponse<Map<String, dynamic>>> pinMessage(
    String workspaceId,
    String conversationId,
    String messageId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/conversations/$conversationId/messages/$messageId/pin',
      );

      return ApiResponse.success(
        response.data is Map<String, dynamic> ? response.data : {'data': response.data},
        message: 'Message pinned successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to pin message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Unpin a message in a conversation
  Future<ApiResponse<void>> unpinMessage(
    String workspaceId,
    String conversationId,
    String messageId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/conversations/$conversationId/messages/$messageId/pin',
      );

      return ApiResponse.success(
        null,
        message: 'Message unpinned successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to unpin message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get the currently pinned message in a conversation
  Future<ApiResponse<Message?>> getPinnedMessage(
    String workspaceId,
    String conversationId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/conversations/$conversationId/pinned',
      );

      // Handle response - may return null if no pinned message
      if (response.data == null || (response.data is Map && response.data['data'] == null)) {
        return ApiResponse.success(
          null,
          message: 'No pinned message',
          statusCode: response.statusCode,
        );
      }

      final messageData = response.data is Map && response.data['data'] != null
          ? response.data['data']
          : response.data;

      return ApiResponse.success(
        Message.fromJson(messageData),
        message: 'Pinned message retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      // 404 means no pinned message, not an error
      if (e.response?.statusCode == 404) {
        return ApiResponse.success(
          null,
          message: 'No pinned message',
          statusCode: 404,
        );
      }
      return ApiResponse.error(
        e.message ?? 'Failed to get pinned message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get unread message count for a channel
  Future<ApiResponse<int>> getChannelUnreadCount(
    String workspaceId,
    String channelId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/channels/$channelId/unread-count',
      );

      final count = response.data is Map
          ? (response.data['count'] ?? 0)
          : (response.data ?? 0);

      return ApiResponse.success(
        count is int ? count : int.tryParse(count.toString()) ?? 0,
        message: 'Unread count retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get channel unread count',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get unread message count for a conversation
  Future<ApiResponse<int>> getConversationUnreadCount(
    String workspaceId,
    String conversationId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/conversations/$conversationId/unread-count',
      );

      final count = response.data is Map
          ? (response.data['count'] ?? 0)
          : (response.data ?? 0);

      return ApiResponse.success(
        count is int ? count : int.tryParse(count.toString()) ?? 0,
        message: 'Unread count retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get conversation unread count',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== BOOKMARK OPERATIONS ====================

  /// Bookmark a message
  Future<ApiResponse<void>> bookmarkMessage(
    String workspaceId,
    String messageId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/messages/$messageId/bookmark',
        data: {},
      );

      return ApiResponse.success(
        null,
        message: 'Message bookmarked successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to bookmark message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Remove bookmark from a message
  Future<ApiResponse<void>> removeBookmark(
    String workspaceId,
    String messageId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/messages/$messageId/bookmark',
      );

      return ApiResponse.success(
        null,
        message: 'Bookmark removed successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to remove bookmark',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get bookmarked messages in a channel
  Future<ApiResponse<List<Message>>> getChannelBookmarks(
    String workspaceId,
    String channelId, {
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/channels/$channelId/bookmarks',
        queryParameters: {
          'page': page,
          'limit': limit,
        },
      );

      // Handle response format: { data: [...], total: number }
      final List<dynamic> messagesJson = response.data is Map
          ? (response.data['data'] ?? [])
          : (response.data ?? []);

      final messages = messagesJson.map((json) => Message.fromJson(json)).toList();

      return ApiResponse.success(
        messages,
        message: 'Bookmarked messages retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get bookmarked messages',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get bookmarked messages in a conversation
  Future<ApiResponse<List<Message>>> getConversationBookmarks(
    String workspaceId,
    String conversationId, {
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/conversations/$conversationId/bookmarks',
        queryParameters: {
          'page': page,
          'limit': limit,
        },
      );

      // Handle response format: { data: [...], total: number }
      final List<dynamic> messagesJson = response.data is Map
          ? (response.data['data'] ?? [])
          : (response.data ?? []);

      final messages = messagesJson.map((json) => Message.fromJson(json)).toList();

      return ApiResponse.success(
        messages,
        message: 'Bookmarked messages retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get bookmarked messages',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== POLL OPERATIONS ====================

  /// Vote on a poll option
  Future<ApiResponse<Map<String, dynamic>>> votePoll(
    String workspaceId,
    String messageId,
    String pollId,
    String optionId,
  ) async {
    final url = '/workspaces/$workspaceId/messages/$messageId/polls/$pollId/vote';
    debugPrint('🗳️ [ChatApiService] votePoll - URL: $url');
    debugPrint('🗳️ [ChatApiService] votePoll - workspaceId: $workspaceId, messageId: $messageId, pollId: $pollId, optionId: $optionId');

    try {
      final response = await _apiClient.post(
        url,
        data: {'optionId': optionId},
      );

      debugPrint('🗳️ [ChatApiService] votePoll - Response status: ${response.statusCode}');
      debugPrint('🗳️ [ChatApiService] votePoll - Response data: ${response.data}');

      // Response: { message: string, data: { poll: Poll, userVotedOptionId: string } }
      final data = response.data is Map<String, dynamic>
          ? response.data['data'] ?? response.data
          : response.data;

      debugPrint('🗳️ [ChatApiService] votePoll - Parsed data: $data');

      return ApiResponse.success(
        data is Map<String, dynamic> ? data : {'poll': data},
        message: 'Vote recorded successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      debugPrint('🗳️ [ChatApiService] votePoll - Error: ${e.message}');
      debugPrint('🗳️ [ChatApiService] votePoll - Error response: ${e.response?.data}');
      debugPrint('🗳️ [ChatApiService] votePoll - Error status: ${e.response?.statusCode}');
      return ApiResponse.error(
        e.message ?? 'Failed to vote on poll',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Close a poll (only poll creator can close)
  Future<ApiResponse<Poll>> closePoll(
    String workspaceId,
    String messageId,
    String pollId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/messages/$messageId/polls/$pollId/close',
        data: {},
      );

      // Response: { message: string, data: { poll: Poll } }
      final data = response.data is Map<String, dynamic>
          ? response.data['data'] ?? response.data
          : response.data;

      final pollData = data is Map<String, dynamic>
          ? (data['poll'] ?? data)
          : data;

      return ApiResponse.success(
        Poll.fromJson(pollData),
        message: 'Poll closed successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to close poll',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get poll data with current user's vote status
  Future<ApiResponse<Map<String, dynamic>>> getPoll(
    String workspaceId,
    String messageId,
    String pollId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/messages/$messageId/polls/$pollId',
      );

      // Response: { data: { poll: Poll, userVotedOptionId: string | null, canViewResults: boolean } }
      final data = response.data is Map<String, dynamic>
          ? response.data['data'] ?? response.data
          : response.data;

      return ApiResponse.success(
        data is Map<String, dynamic> ? data : {'poll': data},
        message: 'Poll retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get poll',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== STAR/UNSTAR CONVERSATION OPERATIONS ====================

  /// Star a conversation
  Future<ApiResponse<Conversation?>> starConversation(
    String workspaceId,
    String conversationId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/conversations/$conversationId/star',
        data: {},
      );

      // Response may contain the updated conversation or just success
      if (response.data is Map<String, dynamic>) {
        final data = response.data['data'] ?? response.data;
        if (data is Map<String, dynamic> && data['id'] != null) {
          return ApiResponse.success(
            Conversation.fromJson(data),
            message: 'Conversation starred successfully',
            statusCode: response.statusCode,
          );
        }
      }

      // If response doesn't contain conversation data, return null
      // The caller should refresh the conversation list
      return ApiResponse.success(
        null,
        message: 'Conversation starred successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to star conversation',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Unstar a conversation
  Future<ApiResponse<Conversation?>> unstarConversation(
    String workspaceId,
    String conversationId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/conversations/$conversationId/star',
      );

      // Response may contain the updated conversation or just success
      if (response.data is Map<String, dynamic>) {
        final data = response.data['data'] ?? response.data;
        if (data is Map<String, dynamic> && data['id'] != null) {
          return ApiResponse.success(
            Conversation.fromJson(data),
            message: 'Conversation unstarred successfully',
            statusCode: response.statusCode,
          );
        }
      }

      // If response doesn't contain conversation data, return null
      // The caller should refresh the conversation list
      return ApiResponse.success(
        null,
        message: 'Conversation unstarred successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to unstar conversation',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Delete a conversation (archive it)
  Future<ApiResponse<void>> deleteConversation(
    String workspaceId,
    String conversationId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/conversations/$conversationId',
      );

      return ApiResponse.success(
        null,
        message: 'Conversation deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete conversation',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  // ==================== SCHEDULED MESSAGE OPERATIONS ====================

  /// Create a scheduled message
  Future<ApiResponse<ScheduledMessage>> createScheduledMessage(
    String workspaceId,
    CreateScheduledMessageDto dto,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/scheduled-messages',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        ScheduledMessage.fromJson(response.data),
        message: 'Message scheduled successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to schedule message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get scheduled messages for the current user
  Future<ApiResponse<List<ScheduledMessage>>> getScheduledMessages(
    String workspaceId, {
    String? status,
    String? channelId,
    String? conversationId,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'offset': ((page - 1) * limit).toString(),
        'limit': limit.toString(),
      };
      if (status != null) queryParams['status'] = status;
      if (channelId != null) queryParams['channelId'] = channelId;
      if (conversationId != null) queryParams['conversationId'] = conversationId;

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/scheduled-messages',
        queryParameters: queryParams,
      );

      final List<dynamic> messagesJson = response.data is Map
          ? (response.data['data'] ?? [])
          : (response.data ?? []);

      final messages = messagesJson.map((json) => ScheduledMessage.fromJson(json)).toList();

      return ApiResponse.success(
        messages,
        message: 'Scheduled messages retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get scheduled messages',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Get a single scheduled message
  Future<ApiResponse<ScheduledMessage>> getScheduledMessage(
    String workspaceId,
    String scheduledMessageId,
  ) async {
    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/scheduled-messages/$scheduledMessageId',
      );

      return ApiResponse.success(
        ScheduledMessage.fromJson(response.data),
        message: 'Scheduled message retrieved successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to get scheduled message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Update a scheduled message
  Future<ApiResponse<ScheduledMessage>> updateScheduledMessage(
    String workspaceId,
    String scheduledMessageId,
    UpdateScheduledMessageDto dto,
  ) async {
    try {
      final response = await _apiClient.put(
        '/workspaces/$workspaceId/scheduled-messages/$scheduledMessageId',
        data: dto.toJson(),
      );

      return ApiResponse.success(
        ScheduledMessage.fromJson(response.data),
        message: 'Scheduled message updated successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to update scheduled message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Cancel a scheduled message
  Future<ApiResponse<void>> cancelScheduledMessage(
    String workspaceId,
    String scheduledMessageId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/scheduled-messages/$scheduledMessageId/cancel',
        data: {},
      );

      return ApiResponse.success(
        null,
        message: 'Scheduled message cancelled successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to cancel scheduled message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Delete a scheduled message
  Future<ApiResponse<void>> deleteScheduledMessage(
    String workspaceId,
    String scheduledMessageId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '/workspaces/$workspaceId/scheduled-messages/$scheduledMessageId',
      );

      return ApiResponse.success(
        null,
        message: 'Scheduled message deleted successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to delete scheduled message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }

  /// Send a scheduled message immediately
  Future<ApiResponse<Message>> sendScheduledMessageNow(
    String workspaceId,
    String scheduledMessageId,
  ) async {
    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/scheduled-messages/$scheduledMessageId/send-now',
        data: {},
      );

      return ApiResponse.success(
        Message.fromJson(response.data),
        message: 'Message sent successfully',
        statusCode: response.statusCode,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        e.message ?? 'Failed to send scheduled message',
        statusCode: e.response?.statusCode,
        data: e.response?.data,
      );
    }
  }
}