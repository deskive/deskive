# Japanese Localization Guide with easy_localization

This guide explains how to properly handle singular/plural forms and other localization considerations when translating from English to Japanese using the `easy_localization` package.

## Table of Contents

1. [Understanding Japanese Pluralization](#understanding-japanese-pluralization)
2. [Plural Forms in easy_localization](#plural-forms-in-easy_localization)
3. [Implementation Examples](#implementation-examples)
4. [Japanese Counters (Josushi)](#japanese-counters-josushi)
5. [Best Practices](#best-practices)
6. [Common Patterns](#common-patterns)

---

## Understanding Japanese Pluralization

### Key Difference from English

**English** has distinct singular and plural forms:
- 1 file / 2 files
- 1 member / 5 members

**Japanese** does NOT have grammatical plural forms. The same word is used regardless of quantity:
- 1 file = 1つのファイル (hitotsu no fairu)
- 2 files = 2つのファイル (futatsu no fairu)

The noun "ファイル" (file) stays the same - only the counter/number changes.

### CLDR Plural Rules

The Unicode CLDR (Common Locale Data Repository) defines plural categories for each language:

| Language | Plural Categories |
|----------|------------------|
| English  | `one`, `other`   |
| Japanese | `other` only     |
| Arabic   | `zero`, `one`, `two`, `few`, `many`, `other` |
| Russian  | `one`, `few`, `many`, `other` |

Since Japanese only uses `other`, you must still define it in your translation files, but you'll only need one form.

---

## Plural Forms in easy_localization

### JSON Structure for Plurals

easy_localization uses a special structure for plural translations:

```json
{
  "key": {
    "zero": "No items",
    "one": "{} item",
    "two": "{} items",
    "few": "{} items",
    "many": "{} items",
    "other": "{} items"
  }
}
```

### English Translation File (en.json)

```json
{
  "items": {
    "member_count": {
      "one": "{} member",
      "other": "{} members"
    },
    "file_count": {
      "one": "{} file",
      "other": "{} files"
    },
    "message_count": {
      "zero": "No messages",
      "one": "{} message",
      "other": "{} messages"
    },
    "task_count": {
      "one": "{} task",
      "other": "{} tasks"
    },
    "event_count": {
      "one": "{} event",
      "other": "{} events"
    },
    "project_count": {
      "one": "{} project",
      "other": "{} projects"
    },
    "notification_count": {
      "one": "{} notification",
      "other": "{} notifications"
    },
    "day_count": {
      "one": "{} day",
      "other": "{} days"
    },
    "hour_count": {
      "one": "{} hour",
      "other": "{} hours"
    },
    "minute_count": {
      "one": "{} minute",
      "other": "{} minutes"
    }
  }
}
```

### Japanese Translation File (ja.json)

```json
{
  "items": {
    "member_count": {
      "other": "{}人のメンバー"
    },
    "file_count": {
      "other": "{}個のファイル"
    },
    "message_count": {
      "zero": "メッセージはありません",
      "other": "{}件のメッセージ"
    },
    "task_count": {
      "other": "{}件のタスク"
    },
    "event_count": {
      "other": "{}件のイベント"
    },
    "project_count": {
      "other": "{}件のプロジェクト"
    },
    "notification_count": {
      "other": "{}件の通知"
    },
    "day_count": {
      "other": "{}日"
    },
    "hour_count": {
      "other": "{}時間"
    },
    "minute_count": {
      "other": "{}分"
    }
  }
}
```

---

## Implementation Examples

### Dart Code Usage

```dart
import 'package:easy_localization/easy_localization.dart';

// Using plural() method
Text('items.member_count'.plural(memberCount));
Text('items.file_count'.plural(fileCount));
Text('items.message_count'.plural(messageCount));

// With named arguments
Text('items.task_count'.plural(taskCount, args: [taskCount.toString()]));

// Alternative syntax using tr() with plural
Text(plural('items.member_count', memberCount));
```

### Complete Widget Example

```dart
class DashboardStats extends StatelessWidget {
  final int memberCount;
  final int fileCount;
  final int messageCount;

  const DashboardStats({
    required this.memberCount,
    required this.fileCount,
    required this.messageCount,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Plural translation
        Text('items.member_count'.plural(memberCount)),

        // With additional formatting
        Text(
          'items.file_count'.plural(fileCount),
          style: TextStyle(fontWeight: FontWeight.bold),
        ),

        // Zero handling
        Text('items.message_count'.plural(messageCount)),
      ],
    );
  }
}
```

---

## Japanese Counters (Josushi)

Japanese uses counting words called "josushi" (助数詞). Using the correct counter makes translations natural.

### Common Counters

| Counter | Reading | Usage | Example |
|---------|---------|-------|---------|
| 人 (にん) | nin | People | 3人のメンバー (3 members) |
| 個 (こ) | ko | General small objects | 5個のファイル (5 files) |
| 件 (けん) | ken | Cases, matters, messages | 10件のメッセージ (10 messages) |
| 枚 (まい) | mai | Flat objects (photos, papers) | 2枚の写真 (2 photos) |
| 台 (だい) | dai | Machines, vehicles | 3台のデバイス (3 devices) |
| つ | tsu | General counter (1-9) | 4つのフォルダ (4 folders) |
| 本 (ほん) | hon | Long objects, calls | 1本の通話 (1 call) |
| 回 (かい) | kai | Times, occurrences | 5回のミーティング (5 meetings) |
| 日 (にち) | nichi | Days | 3日前 (3 days ago) |
| 時間 (じかん) | jikan | Hours | 2時間 (2 hours) |
| 分 (ふん/ぷん) | fun/pun | Minutes | 30分 (30 minutes) |

### Counter Selection Guide

```json
{
  "items": {
    "people": {
      "other": "{}人"
    },
    "general_items": {
      "other": "{}個"
    },
    "cases_messages": {
      "other": "{}件"
    },
    "flat_items": {
      "other": "{}枚"
    },
    "devices": {
      "other": "{}台"
    },
    "generic_count": {
      "other": "{}つ"
    }
  }
}
```

---

## Best Practices

### 1. Always Define `other` for Japanese

Even if you define `zero`, `one`, etc. for English, Japanese only needs `other`:

```json
// en.json
{
  "unread": {
    "zero": "No unread messages",
    "one": "1 unread message",
    "other": "{} unread messages"
  }
}

// ja.json
{
  "unread": {
    "zero": "未読メッセージはありません",
    "other": "{}件の未読メッセージ"
  }
}
```

### 2. Use Zero Form for Empty States

Japanese can benefit from a `zero` form for better UX:

```json
// ja.json
{
  "notifications": {
    "zero": "通知はありません",
    "other": "{}件の通知"
  }
}
```

### 3. Position of Numbers in Japanese

Numbers typically come BEFORE the counter in Japanese:

```
English: "5 new messages"
Japanese: "5件の新しいメッセージ" (5-ken no atarashii messeeji)
          [number][counter] no [adjective] [noun]
```

### 4. Handling Large Numbers

For large numbers, consider formatting:

```dart
// Format number with commas
String formatNumber(int number) {
  return NumberFormat('#,###').format(number);
}

// Usage
Text('items.file_count'.plural(
  fileCount,
  args: [formatNumber(fileCount)]
));
```

### 5. Context-Aware Translations

Sometimes the same English word needs different Japanese translations:

```json
// en.json
{
  "new_items": "{} new"
}

// ja.json - depends on context
{
  "new_messages": "{}件の新着",
  "new_files": "{}個の新規",
  "new_members": "{}人の新規"
}
```

---

## Common Patterns

### Pattern 1: Dashboard Statistics

```json
// en.json
{
  "dashboard": {
    "stats": {
      "members": {
        "one": "{} Member",
        "other": "{} Members"
      },
      "active_projects": {
        "one": "{} Active Project",
        "other": "{} Active Projects"
      },
      "pending_tasks": {
        "zero": "No Pending Tasks",
        "one": "{} Pending Task",
        "other": "{} Pending Tasks"
      }
    }
  }
}

// ja.json
{
  "dashboard": {
    "stats": {
      "members": {
        "other": "{}人のメンバー"
      },
      "active_projects": {
        "other": "{}件のアクティブプロジェクト"
      },
      "pending_tasks": {
        "zero": "保留中のタスクはありません",
        "other": "{}件の保留中タスク"
      }
    }
  }
}
```

### Pattern 2: Time Ago

```json
// en.json
{
  "time": {
    "seconds_ago": {
      "one": "{} second ago",
      "other": "{} seconds ago"
    },
    "minutes_ago": {
      "one": "{} minute ago",
      "other": "{} minutes ago"
    },
    "hours_ago": {
      "one": "{} hour ago",
      "other": "{} hours ago"
    },
    "days_ago": {
      "one": "{} day ago",
      "other": "{} days ago"
    }
  }
}

// ja.json
{
  "time": {
    "seconds_ago": {
      "other": "{}秒前"
    },
    "minutes_ago": {
      "other": "{}分前"
    },
    "hours_ago": {
      "other": "{}時間前"
    },
    "days_ago": {
      "other": "{}日前"
    }
  }
}
```

### Pattern 3: Item Selection

```json
// en.json
{
  "selection": {
    "selected_items": {
      "zero": "No items selected",
      "one": "{} item selected",
      "other": "{} items selected"
    }
  }
}

// ja.json
{
  "selection": {
    "selected_items": {
      "zero": "選択されたアイテムはありません",
      "other": "{}件選択中"
    }
  }
}
```

### Pattern 4: Notifications Badge

```json
// en.json
{
  "notifications": {
    "badge": {
      "one": "{} new notification",
      "other": "{} new notifications"
    },
    "unread": {
      "zero": "All caught up!",
      "one": "You have {} unread notification",
      "other": "You have {} unread notifications"
    }
  }
}

// ja.json
{
  "notifications": {
    "badge": {
      "other": "{}件の新しい通知"
    },
    "unread": {
      "zero": "すべて確認済みです！",
      "other": "{}件の未読通知があります"
    }
  }
}
```

---

## Usage in Deskive Project

### Current Translation Files Location

```
flutter/
  assets/
    translations/
      en.json
      ja.json
```

### Adding Plural Support to Existing Keys

Update your `en.json` and `ja.json` files:

```json
// en.json - Add to "dashboard" section
{
  "dashboard": {
    "total_members": {
      "one": "{} Member",
      "other": "{} Members"
    },
    "events": {
      "zero": "No Events",
      "one": "{} Event",
      "other": "{} Events"
    },
    "tasks": {
      "zero": "No Tasks",
      "one": "{} Task",
      "other": "{} Tasks"
    },
    "messages": {
      "zero": "No Messages",
      "one": "{} Message",
      "other": "{} Messages"
    },
    "files": {
      "zero": "No Files",
      "one": "{} File",
      "other": "{} Files"
    },
    "projects": {
      "zero": "No Projects",
      "one": "{} Project",
      "other": "{} Projects"
    }
  }
}

// ja.json - Add to "dashboard" section
{
  "dashboard": {
    "total_members": {
      "other": "{}人のメンバー"
    },
    "events": {
      "zero": "イベントはありません",
      "other": "{}件のイベント"
    },
    "tasks": {
      "zero": "タスクはありません",
      "other": "{}件のタスク"
    },
    "messages": {
      "zero": "メッセージはありません",
      "other": "{}件のメッセージ"
    },
    "files": {
      "zero": "ファイルはありません",
      "other": "{}個のファイル"
    },
    "projects": {
      "zero": "プロジェクトはありません",
      "other": "{}件のプロジェクト"
    }
  }
}
```

### Dart Implementation

```dart
// In dashboard_screen.dart
import 'package:easy_localization/easy_localization.dart';

// Replace static text with plural translations
Text('dashboard.total_members'.plural(memberCount)),
Text('dashboard.events'.plural(eventCount)),
Text('dashboard.tasks'.plural(taskCount)),
Text('dashboard.messages'.plural(messageCount)),
Text('dashboard.files'.plural(fileCount)),
Text('dashboard.projects'.plural(projectCount)),
```

---

## Testing Pluralization

### Test Cases

```dart
void testPluralization() {
  // Test zero
  print('dashboard.messages'.plural(0));
  // EN: "No Messages", JA: "メッセージはありません"

  // Test one
  print('dashboard.messages'.plural(1));
  // EN: "1 Message", JA: "1件のメッセージ"

  // Test many
  print('dashboard.messages'.plural(5));
  // EN: "5 Messages", JA: "5件のメッセージ"

  // Test large numbers
  print('dashboard.messages'.plural(1000));
  // EN: "1000 Messages", JA: "1000件のメッセージ"
}
```

---

## Summary

1. **Japanese uses only `other` form** - No grammatical plurals
2. **Use appropriate counters** - 人 for people, 件 for cases, 個 for items
3. **Define `zero` for empty states** - Better user experience
4. **Numbers come before counters** - 5件のメッセージ, not メッセージ5件
5. **Use `.plural()` method** - `'key'.plural(count)`
6. **Test all cases** - 0, 1, and multiple values

---

## References

- [easy_localization package](https://pub.dev/packages/easy_localization)
- [CLDR Plural Rules](https://cldr.unicode.org/index/cldr-spec/plural-rules)
- [Japanese Counter Words](https://en.wikipedia.org/wiki/Japanese_counter_word)
