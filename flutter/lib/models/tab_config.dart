import 'dart:convert';
import 'package:flutter/material.dart';

/// Represents a single navigable tab in the app
class TabItem {
  final String id;
  final String labelKey; // i18n key for label
  final IconData icon;
  final IconData activeIcon;
  final bool isRemovable; // false for required tabs like 'home'

  const TabItem({
    required this.id,
    required this.labelKey,
    required this.icon,
    required this.activeIcon,
    this.isRemovable = true,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'labelKey': labelKey,
        'iconCodePoint': icon.codePoint,
        'activeIconCodePoint': activeIcon.codePoint,
        'isRemovable': isRemovable,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TabItem && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// User's tab arrangement configuration
class TabConfiguration {
  final List<String> bottomNavTabIds; // Tab IDs in bottom nav (ordered, max 5)
  final List<String> moreMenuTabIds; // Tab IDs in More menu (ordered)
  final DateTime? lastModified;

  const TabConfiguration({
    required this.bottomNavTabIds,
    required this.moreMenuTabIds,
    this.lastModified,
  });

  /// Default configuration matching current app behavior
  factory TabConfiguration.defaultConfig() {
    return TabConfiguration(
      bottomNavTabIds: const ['home', 'autopilot', 'messages', 'projects', 'notes'],
      moreMenuTabIds: const [
        'calendar',
        'video_calls',
        'files',
        'email',
        'search',
        'connectors',
        'tools',
        'bots',
        'settings',
      ],
      lastModified: null,
    );
  }

  /// Create from JSON string
  factory TabConfiguration.fromJson(Map<String, dynamic> json) {
    return TabConfiguration(
      bottomNavTabIds: List<String>.from(json['bottomNavTabIds'] ?? []),
      moreMenuTabIds: List<String>.from(json['moreMenuTabIds'] ?? []),
      lastModified: json['lastModified'] != null
          ? DateTime.tryParse(json['lastModified'])
          : null,
    );
  }

  /// Convert to JSON for storage
  Map<String, dynamic> toJson() => {
        'bottomNavTabIds': bottomNavTabIds,
        'moreMenuTabIds': moreMenuTabIds,
        'lastModified': lastModified?.toIso8601String(),
      };

  /// Convert to JSON string for SharedPreferences
  String toJsonString() => jsonEncode(toJson());

  /// Create from JSON string
  factory TabConfiguration.fromJsonString(String jsonString) {
    return TabConfiguration.fromJson(jsonDecode(jsonString));
  }

  /// Create a copy with modifications
  TabConfiguration copyWith({
    List<String>? bottomNavTabIds,
    List<String>? moreMenuTabIds,
    DateTime? lastModified,
  }) {
    return TabConfiguration(
      bottomNavTabIds: bottomNavTabIds ?? this.bottomNavTabIds,
      moreMenuTabIds: moreMenuTabIds ?? this.moreMenuTabIds,
      lastModified: lastModified ?? this.lastModified,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TabConfiguration &&
          runtimeType == other.runtimeType &&
          _listEquals(bottomNavTabIds, other.bottomNavTabIds) &&
          _listEquals(moreMenuTabIds, other.moreMenuTabIds);

  @override
  int get hashCode => bottomNavTabIds.hashCode ^ moreMenuTabIds.hashCode;

  bool _listEquals(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
