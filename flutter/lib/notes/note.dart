import 'package:flutter/material.dart';

class NoteEmojis {
  static const List<String> popular = [
    '📝', '📄', '📃', '📑', '🗒️', '📋', '📌', '📍', '🔖', '🏷️',
    '💡', '💭', '🎯', '🎨', '✨', '⭐', '🌟', '🔥', '💎', '🚀',
    '📚', '📖', '📘', '📙', '📗', '📕', '📓', '📔', '🗂️', '📂',
    '💼', '👔', '🏢', '💰', '💸', '📊', '📈', '📉', '🗓️', '📅',
    '🏃', '🏋️', '🧘', '🎾', '⚽', '🏀', '🎮', '🎲', '🎪', '🎭',
    '🍎', '🥗', '🍕', '🍔', '🍳', '🍰', '☕', '🍵', '🥤', '🍷',
    '✈️', '🚗', '🚂', '🛳️', '🏖️', '🏔️', '🗺️', '🧳', '📸', '🎒',
    '❤️', '💚', '💙', '💜', '💛', '🧡', '🖤', '🤍', '💗', '💖',
    '✅', '❌', '⚠️', '🚨', '🔔', '🔕', '📢', '💬', '💭', '🗨️',
    '🎉', '🎊', '🎁', '🎈', '🏆', '🥇', '🏅', '👑', '🌈', '🦄'
  ];

  static const List<Map<String, dynamic>> categories = [
    {'title': 'Common', 'emojis': ['📝', '📄', '📃', '📑', '🗒️', '📋', '📌', '📍', '🔖', '🏷️']},
    {'title': 'Ideas', 'emojis': ['💡', '💭', '🎯', '🎨', '✨', '⭐', '🌟', '🔥', '💎', '🚀']},
    {'title': 'Study', 'emojis': ['📚', '📖', '📘', '📙', '📗', '📕', '📓', '📔', '🗂️', '📂']},
    {'title': 'Work', 'emojis': ['💼', '👔', '🏢', '💰', '💸', '📊', '📈', '📉', '🗓️', '📅']},
    {'title': 'Activity', 'emojis': ['🏃', '🏋️', '🧘', '🎾', '⚽', '🏀', '🎮', '🎲', '🎪', '🎭']},
    {'title': 'Food', 'emojis': ['🍎', '🥗', '🍕', '🍔', '🍳', '🍰', '☕', '🍵', '🥤', '🍷']},
    {'title': 'Travel', 'emojis': ['✈️', '🚗', '🚂', '🛳️', '🏖️', '🏔️', '🗺️', '🧳', '📸', '🎒']},
    {'title': 'Hearts', 'emojis': ['❤️', '💚', '💙', '💜', '💛', '🧡', '🖤', '🤍', '💗', '💖']},
    {'title': 'Status', 'emojis': ['✅', '❌', '⚠️', '🚨', '🔔', '🔕', '📢', '💬', '💭', '🗨️']},
    {'title': 'Celebration', 'emojis': ['🎉', '🎊', '🎁', '🎈', '🏆', '🥇', '🏅', '👑', '🌈', '🦄']},
  ];
}

class NoteCategory {
  final String id;
  final String name;
  final String icon;

  const NoteCategory({
    required this.id,
    required this.name,
    required this.icon,
  });

  static const List<NoteCategory> categories = [
    NoteCategory(
      id: 'work',
      name: 'Work',
      icon: '💼',
    ),
    NoteCategory(
      id: 'personal',
      name: 'Personal',
      icon: '👤',
    ),
    NoteCategory(
      id: 'study',
      name: 'Study',
      icon: '📚',
    ),
    NoteCategory(
      id: 'project',
      name: 'Project',
      icon: '📊',
    ),
    NoteCategory(
      id: 'meeting',
      name: 'Meeting',
      icon: '🤝',
    ),
  ];

  static NoteCategory? getCategoryById(String id) {
    try {
      return categories.firstWhere((cat) => cat.id == id);
    } catch (e) {
      return null;
    }
  }
}

enum CollaboratorRole { editor, viewer }

enum ActivityType { created, updated, shared, favorited, unfavorited, collaboratorAdded, collaboratorRemoved, collaboratorRoleChanged }

class Activity {
  final String id;
  final String noteId;
  final String userId;
  final String userName;
  final String userAvatar;
  final ActivityType type;
  final String description;
  final DateTime timestamp;
  final Map<String, dynamic>? metadata;

  const Activity({
    required this.id,
    required this.noteId,
    required this.userId,
    required this.userName,
    required this.userAvatar,
    required this.type,
    required this.description,
    required this.timestamp,
    this.metadata,
  });

  Activity copyWith({
    String? id,
    String? noteId,
    String? userId,
    String? userName,
    String? userAvatar,
    ActivityType? type,
    String? description,
    DateTime? timestamp,
    Map<String, dynamic>? metadata,
  }) {
    return Activity(
      id: id ?? this.id,
      noteId: noteId ?? this.noteId,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      userAvatar: userAvatar ?? this.userAvatar,
      type: type ?? this.type,
      description: description ?? this.description,
      timestamp: timestamp ?? this.timestamp,
      metadata: metadata ?? this.metadata,
    );
  }

  IconData get icon {
    switch (type) {
      case ActivityType.created:
        return Icons.add_circle;
      case ActivityType.updated:
        return Icons.edit;
      case ActivityType.shared:
        return Icons.share;
      case ActivityType.favorited:
        return Icons.favorite;
      case ActivityType.unfavorited:
        return Icons.favorite_border;
      case ActivityType.collaboratorAdded:
        return Icons.person_add;
      case ActivityType.collaboratorRemoved:
        return Icons.person_remove;
      case ActivityType.collaboratorRoleChanged:
        return Icons.swap_horiz;
    }
  }

  Color getColor(BuildContext context) {
    switch (type) {
      case ActivityType.created:
        return Colors.green;
      case ActivityType.updated:
        return Theme.of(context).colorScheme.primary;
      case ActivityType.shared:
        return Colors.blue;
      case ActivityType.favorited:
        return Colors.red;
      case ActivityType.unfavorited:
        return Colors.grey;
      case ActivityType.collaboratorAdded:
        return Colors.teal;
      case ActivityType.collaboratorRemoved:
        return Colors.orange;
      case ActivityType.collaboratorRoleChanged:
        return Colors.purple;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'noteId': noteId,
      'userId': userId,
      'userName': userName,
      'userAvatar': userAvatar,
      'type': type.name,
      'description': description,
      'timestamp': timestamp.toIso8601String(),
      'metadata': metadata,
    };
  }

  factory Activity.fromJson(Map<String, dynamic> json) {
    return Activity(
      id: json['id'],
      noteId: json['noteId'],
      userId: json['userId'],
      userName: json['userName'],
      userAvatar: json['userAvatar'],
      type: ActivityType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => ActivityType.updated,
      ),
      description: json['description'],
      timestamp: DateTime.parse(json['timestamp']),
      metadata: json['metadata'],
    );
  }
}

class Collaborator {
  final String id;
  final String name;
  final String email;
  final String avatar;
  final CollaboratorRole role;
  final DateTime addedAt;

  const Collaborator({
    required this.id,
    required this.name,
    required this.email,
    required this.avatar,
    required this.role,
    required this.addedAt,
  });

  Collaborator copyWith({
    String? id,
    String? name,
    String? email,
    String? avatar,
    CollaboratorRole? role,
    DateTime? addedAt,
  }) {
    return Collaborator(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      avatar: avatar ?? this.avatar,
      role: role ?? this.role,
      addedAt: addedAt ?? this.addedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'avatar': avatar,
      'role': role.name,
      'addedAt': addedAt.toIso8601String(),
    };
  }

  factory Collaborator.fromJson(Map<String, dynamic> json) {
    return Collaborator(
      id: json['id'],
      name: json['name'],
      email: json['email'],
      avatar: json['avatar'] ?? '',
      role: CollaboratorRole.values.firstWhere(
        (e) => e.name == json['role'],
        orElse: () => CollaboratorRole.viewer,
      ),
      addedAt: DateTime.parse(json['addedAt']),
    );
  }
}

class Note {
  final String id;
  final String? parentId;
  final String title;
  final String description;
  final String content;
  final String icon;
  final String categoryId;
  final String subcategory;
  final List<String> keywords;
  final bool isFavorite;
  final bool isTemplate;
  final bool isDeleted;
  final String createdBy;
  final List<Collaborator> collaborators;
  final List<Activity> activities;
  final DateTime createdAt;
  final DateTime updatedAt;

  Note({
    required this.id,
    this.parentId,
    required this.title,
    required this.description,
    required this.content,
    required this.icon,
    required this.categoryId,
    required this.subcategory,
    required this.keywords,
    this.isFavorite = false,
    this.isTemplate = false,
    this.isDeleted = false,
    this.createdBy = '',
    this.collaborators = const [],
    this.activities = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  Note copyWith({
    String? id,
    String? parentId,
    String? title,
    String? description,
    String? content,
    String? icon,
    String? categoryId,
    String? subcategory,
    List<String>? keywords,
    bool? isFavorite,
    bool? isTemplate,
    bool? isDeleted,
    String? createdBy,
    List<Collaborator>? collaborators,
    List<Activity>? activities,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Note(
      id: id ?? this.id,
      parentId: parentId ?? this.parentId,
      title: title ?? this.title,
      description: description ?? this.description,
      content: content ?? this.content,
      icon: icon ?? this.icon,
      categoryId: categoryId ?? this.categoryId,
      subcategory: subcategory ?? this.subcategory,
      keywords: keywords ?? this.keywords,
      isFavorite: isFavorite ?? this.isFavorite,
      isTemplate: isTemplate ?? this.isTemplate,
      isDeleted: isDeleted ?? this.isDeleted,
      createdBy: createdBy ?? this.createdBy,
      collaborators: collaborators ?? this.collaborators,
      activities: activities ?? this.activities,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  NoteCategory? get category => NoteCategory.getCategoryById(categoryId);

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'parentId': parentId,
      'title': title,
      'description': description,
      'content': content,
      'icon': icon,
      'categoryId': categoryId,
      'subcategory': subcategory,
      'keywords': keywords,
      'isFavorite': isFavorite,
      'isTemplate': isTemplate,
      'isDeleted': isDeleted,
      'createdBy': createdBy,
      'collaborators': collaborators.map((c) => c.toJson()).toList(),
      'activities': activities.map((a) => a.toJson()).toList(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory Note.fromJson(Map<String, dynamic> json) {
    return Note(
      id: json['id'],
      parentId: json['parentId'],
      title: json['title'],
      description: json['description'] ?? '',
      content: json['content'],
      icon: json['icon'] ?? '📝',
      categoryId: json['categoryId'] ?? 'work',
      subcategory: json['subcategory'] ?? 'Tasks',
      keywords: List<String>.from(json['keywords'] ?? []),
      isFavorite: json['isFavorite'] ?? false,
      isTemplate: json['isTemplate'] ?? false,
      isDeleted: json['isDeleted'] ?? false,
      createdBy: json['createdBy'] ?? '',
      collaborators: (json['collaborators'] as List<dynamic>?)
          ?.map((c) => Collaborator.fromJson(c))
          .toList() ?? [],
      activities: (json['activities'] as List<dynamic>?)
          ?.map((a) => Activity.fromJson(a))
          .toList() ?? [],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }
}