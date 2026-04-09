#!/usr/bin/env python3
"""
Add comprehensive i18n translations for Chat, Files, Calendar, and Notes modules
"""

import json
import sys

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')  # Add newline at end of file

# Comprehensive English translations
en_chat_translations = {
    "title": "Chat",
    "description": "Real-time messaging and collaboration",
    "benefits": "Connect your team with real-time chat, organized channels, and seamless file sharing.",
    "features": {
        "channels": "Channels & DMs",
        "fileSharing": "File Sharing",
        "threads": "Threads",
        "mentions": "@Mentions"
    },
    "page": {
        "title": "Chat",
        "loadingMessages": "Loading messages...",
        "loadingChannels": "Loading channels...",
        "noChannelSelected": "Select a channel or conversation to start messaging",
        "emptyState": "No messages yet. Start the conversation!",
        "searchPlaceholder": "Search messages..."
    },
    "channels": {
        "title": "Channels",
        "browse": "Browse Channels",
        "create": "Create Channel",
        "public": "Public Channels",
        "private": "Private Channels",
        "archived": "Archived Channels",
        "noChannels": "No channels yet"
    },
    "conversations": {
        "title": "Direct Messages",
        "start": "Start Conversation",
        "noConversations": "No conversations yet"
    },
    "messages": {
        "typeMessage": "Type a message...",
        "send": "Send",
        "edit": "Edit message",
        "delete": "Delete message",
        "reply": "Reply",
        "thread": "Thread",
        "bookmark": "Bookmark",
        "unbookmark": "Remove bookmark",
        "pin": "Pin message",
        "unpin": "Unpin message",
        "copy": "Copy",
        "share": "Share",
        "edited": "edited",
        "deleted": "Message deleted",
        "replyingTo": "Replying to",
        "cancelReply": "Cancel reply"
    },
    "input": {
        "placeholder": "Type a message...",
        "placeholderThread": "Reply to thread...",
        "attachFile": "Attach file",
        "emoji": "Add emoji",
        "mention": "Mention someone",
        "aiMode": "AI mode",
        "schedule": "Schedule message",
        "recording": "Recording..."
    },
    "thread": {
        "title": "Thread",
        "replies": "replies",
        "noReplies": "No replies yet. Start the conversation!",
        "viewThread": "View thread",
        "closeThread": "Close thread"
    },
    "members": {
        "title": "Members",
        "online": "Online",
        "offline": "Offline",
        "typing": "is typing...",
        "typingMultiple": "are typing..."
    },
    "actions": {
        "audioCall": "Start audio call",
        "videoCall": "Start video call",
        "search": "Search in conversation",
        "info": "Show details",
        "pin": "Show pinned messages",
        "bookmark": "Show bookmarked messages",
        "files": "Show shared files"
    },
    "modals": {
        "createChannel": {
            "title": "Create Channel",
            "name": "Channel name",
            "namePlaceholder": "e.g. marketing-team",
            "description": "Description",
            "descriptionPlaceholder": "What's this channel about?",
            "private": "Private channel",
            "create": "Create channel",
            "cancel": "Cancel"
        },
        "startConversation": {
            "title": "Start Conversation",
            "search": "Search members...",
            "noResults": "No members found",
            "start": "Start conversation"
        },
        "scheduleMessage": {
            "title": "Schedule Message",
            "date": "Date",
            "time": "Time",
            "schedule": "Schedule",
            "cancel": "Cancel"
        },
        "bookmarkedMessages": {
            "title": "Bookmarked Messages",
            "empty": "No bookmarked messages",
            "close": "Close"
        },
        "aiHistory": {
            "title": "AI Chat History",
            "empty": "No AI conversations yet",
            "close": "Close"
        }
    },
    "errors": {
        "loadFailed": "Failed to load messages",
        "sendFailed": "Failed to send message",
        "deleteFailed": "Failed to delete message",
        "createChannelFailed": "Failed to create channel"
    },
    "success": {
        "messageSent": "Message sent",
        "messageDeleted": "Message deleted",
        "channelCreated": "Channel created"
    }
}

en_files_translations = {
    "title": "Files",
    "description": "Cloud storage and file management",
    "benefits": "Store, organize, and share files securely with version control and instant previews.",
    "features": {
        "storage": "Cloud Storage",
        "versionControl": "Version Control",
        "preview": "Preview",
        "sharing": "Sharing"
    },
    "page": {
        "title": "Files",
        "loading": "Loading files...",
        "searchPlaceholder": "Search files, content, tags...",
        "noFiles": "No files yet",
        "emptyFolder": "This folder is empty"
    },
    "tabs": {
        "allFiles": "All Files",
        "dashboard": "Dashboard"
    },
    "views": {
        "allFiles": "All Files",
        "recent": "Recent",
        "starred": "Starred",
        "sharedWithMe": "Shared with Me",
        "trash": "Trash",
        "documents": "Documents",
        "pdfs": "PDFs",
        "images": "Images",
        "spreadsheets": "Spreadsheets",
        "videos": "Videos",
        "audio": "Audio"
    },
    "actions": {
        "upload": "Upload",
        "newFolder": "New Folder",
        "download": "Download",
        "delete": "Delete",
        "rename": "Rename",
        "move": "Move",
        "copy": "Copy",
        "share": "Share",
        "star": "Star",
        "unstar": "Unstar",
        "restore": "Restore",
        "viewMode": "View mode",
        "gridView": "Grid view",
        "listView": "List view"
    },
    "modals": {
        "upload": {
            "title": "Upload Files",
            "dropZone": "Drop files here or click to browse",
            "uploading": "Uploading...",
            "cancel": "Cancel",
            "done": "Done"
        },
        "createFolder": {
            "title": "Create Folder",
            "name": "Folder name",
            "namePlaceholder": "Enter folder name",
            "description": "Description (optional)",
            "descriptionPlaceholder": "Enter description",
            "create": "Create",
            "cancel": "Cancel"
        },
        "rename": {
            "title": "Rename",
            "newName": "New name",
            "rename": "Rename",
            "cancel": "Cancel"
        },
        "delete": {
            "title": "Delete",
            "message": "Are you sure you want to delete this item?",
            "messageMultiple": "Are you sure you want to delete {count} items?",
            "confirm": "Delete",
            "cancel": "Cancel"
        },
        "share": {
            "title": "Share",
            "copyLink": "Copy link",
            "permissions": "Permissions",
            "canView": "Can view",
            "canEdit": "Can edit",
            "share": "Share",
            "cancel": "Cancel"
        }
    },
    "storage": {
        "used": "used",
        "of": "of",
        "available": "available",
        "upgrade": "Upgrade for more storage"
    },
    "breadcrumbs": {
        "home": "All Files"
    },
    "contextMenu": {
        "open": "Open",
        "download": "Download",
        "rename": "Rename",
        "move": "Move",
        "copy": "Copy",
        "delete": "Delete",
        "share": "Share",
        "details": "Details",
        "star": "Add to starred",
        "unstar": "Remove from starred"
    },
    "errors": {
        "uploadFailed": "Failed to upload file",
        "deleteFailed": "Failed to delete file",
        "renameFailed": "Failed to rename file",
        "loadFailed": "Failed to load files"
    },
    "success": {
        "uploaded": "File uploaded successfully",
        "deleted": "File deleted successfully",
        "renamed": "File renamed successfully",
        "folderCreated": "Folder created successfully",
        "restored": "File restored successfully"
    }
}

en_calendar_translations = {
    "title": "Calendar",
    "description": "Schedule meetings and events",
    "benefits": "Never miss a meeting with smart scheduling, reminders, and calendar synchronization.",
    "features": {
        "scheduling": "Event Scheduling",
        "meetingRooms": "Meeting Rooms",
        "sync": "Sync",
        "reminders": "Reminders"
    },
    "page": {
        "title": "Calendar",
        "loading": "Loading calendar...",
        "noEvents": "No events scheduled",
        "today": "Today"
    },
    "views": {
        "day": "Day",
        "week": "Week",
        "month": "Month",
        "year": "Year",
        "agenda": "Agenda",
        "timeline": "Timeline"
    },
    "actions": {
        "newEvent": "New Event",
        "quickMeeting": "Quick Meeting",
        "today": "Today",
        "previous": "Previous",
        "next": "Next",
        "filters": "Filters",
        "settings": "Settings"
    },
    "event": {
        "title": "Event title",
        "titlePlaceholder": "Enter event title",
        "description": "Description",
        "descriptionPlaceholder": "Enter description",
        "location": "Location",
        "locationPlaceholder": "Enter location or add video link",
        "startDate": "Start date",
        "endDate": "End date",
        "startTime": "Start time",
        "endTime": "End time",
        "allDay": "All day",
        "repeat": "Repeat",
        "category": "Category",
        "color": "Color",
        "attendees": "Attendees",
        "addAttendees": "Add attendees",
        "reminders": "Reminders",
        "videoCall": "Video call",
        "save": "Save event",
        "cancel": "Cancel",
        "delete": "Delete event",
        "edit": "Edit event"
    },
    "repeat": {
        "never": "Never",
        "daily": "Daily",
        "weekly": "Weekly",
        "monthly": "Monthly",
        "yearly": "Yearly",
        "custom": "Custom"
    },
    "categories": {
        "work": "Work",
        "personal": "Personal",
        "meeting": "Meeting",
        "reminder": "Reminder",
        "birthday": "Birthday",
        "other": "Other"
    },
    "quickMeeting": {
        "title": "Quick Meeting",
        "duration": "Duration",
        "minutes": "minutes",
        "create": "Create meeting",
        "cancel": "Cancel"
    },
    "modals": {
        "deleteEvent": {
            "title": "Delete Event",
            "message": "Are you sure you want to delete this event?",
            "confirm": "Delete",
            "cancel": "Cancel"
        }
    },
    "errors": {
        "loadFailed": "Failed to load calendar",
        "createFailed": "Failed to create event",
        "updateFailed": "Failed to update event",
        "deleteFailed": "Failed to delete event"
    },
    "success": {
        "created": "Event created successfully",
        "updated": "Event updated successfully",
        "deleted": "Event deleted successfully"
    }
}

en_notes_translations = {
    "title": "Notes",
    "description": "Rich text editor and documentation",
    "benefits": "Document everything with a powerful editor, templates, and real-time collaboration.",
    "features": {
        "richEditor": "Rich Editor",
        "templates": "Templates",
        "collaboration": "Collaboration",
        "export": "Export"
    },
    "page": {
        "title": "Notes",
        "loading": "Loading notes...",
        "searchPlaceholder": "Search notes...",
        "noNotes": "No notes yet",
        "emptyNote": "Start writing..."
    },
    "sidebar": {
        "allNotes": "All Notes",
        "favorites": "Favorites",
        "recent": "Recent",
        "shared": "Shared with me",
        "archived": "Archived",
        "trash": "Trash"
    },
    "actions": {
        "newNote": "New Note",
        "newFolder": "New Folder",
        "delete": "Delete",
        "archive": "Archive",
        "favorite": "Add to favorites",
        "unfavorite": "Remove from favorites",
        "share": "Share",
        "export": "Export",
        "duplicate": "Duplicate",
        "merge": "Merge notes",
        "import": "Import"
    },
    "editor": {
        "untitled": "Untitled",
        "placeholder": "Start writing...",
        "formatting": "Formatting",
        "bold": "Bold",
        "italic": "Italic",
        "underline": "Underline",
        "strikethrough": "Strikethrough",
        "code": "Code",
        "link": "Link",
        "heading1": "Heading 1",
        "heading2": "Heading 2",
        "heading3": "Heading 3",
        "bulletList": "Bullet list",
        "numberedList": "Numbered list",
        "taskList": "Task list",
        "blockquote": "Quote",
        "codeBlock": "Code block",
        "table": "Table",
        "image": "Image",
        "divider": "Divider",
        "emoji": "Emoji"
    },
    "ai": {
        "title": "AI Assistant",
        "improve": "Improve writing",
        "summarize": "Summarize",
        "translate": "Translate",
        "expand": "Expand",
        "shorten": "Shorten",
        "changeTone": "Change tone",
        "fixSpelling": "Fix spelling & grammar",
        "continue": "Continue writing"
    },
    "modals": {
        "createNote": {
            "title": "Create Note",
            "name": "Note title",
            "namePlaceholder": "Enter note title",
            "template": "Template",
            "blank": "Blank note",
            "create": "Create",
            "cancel": "Cancel"
        },
        "share": {
            "title": "Share Note",
            "copyLink": "Copy link",
            "permissions": "Permissions",
            "canView": "Can view",
            "canEdit": "Can edit",
            "share": "Share",
            "cancel": "Cancel"
        },
        "export": {
            "title": "Export Note",
            "format": "Format",
            "pdf": "PDF",
            "markdown": "Markdown",
            "html": "HTML",
            "export": "Export",
            "cancel": "Cancel"
        },
        "import": {
            "title": "Import Notes",
            "dropZone": "Drop files here or click to browse",
            "supportedFormats": "Supported formats: Markdown, HTML, TXT",
            "import": "Import",
            "cancel": "Cancel"
        }
    },
    "templates": {
        "meeting": "Meeting Notes",
        "project": "Project Plan",
        "task": "Task List",
        "documentation": "Documentation",
        "research": "Research Notes"
    },
    "errors": {
        "loadFailed": "Failed to load notes",
        "saveFailed": "Failed to save note",
        "deleteFailed": "Failed to delete note",
        "exportFailed": "Failed to export note"
    },
    "success": {
        "created": "Note created successfully",
        "saved": "Note saved successfully",
        "deleted": "Note deleted successfully",
        "exported": "Note exported successfully",
        "shared": "Note shared successfully"
    }
}

# Japanese translations (comprehensive)
ja_chat_translations = {
    "title": "チャット",
    "description": "リアルタイムメッセージングとコラボレーション",
    "benefits": "リアルタイムチャット、整理されたチャンネル、シームレスなファイル共有でチームをつなぎます。",
    "features": {
        "channels": "チャンネルとDM",
        "fileSharing": "ファイル共有",
        "threads": "スレッド",
        "mentions": "@メンション"
    },
    "page": {
        "title": "チャット",
        "loadingMessages": "メッセージを読み込み中...",
        "loadingChannels": "チャンネルを読み込み中...",
        "noChannelSelected": "チャンネルまたは会話を選択してメッセージを開始",
        "emptyState": "まだメッセージがありません。会話を始めましょう！",
        "searchPlaceholder": "メッセージを検索..."
    },
    "channels": {
        "title": "チャンネル",
        "browse": "チャンネルを閲覧",
        "create": "チャンネルを作成",
        "public": "公開チャンネル",
        "private": "プライベートチャンネル",
        "archived": "アーカイブされたチャンネル",
        "noChannels": "まだチャンネルがありません"
    },
    "conversations": {
        "title": "ダイレクトメッセージ",
        "start": "会話を開始",
        "noConversations": "まだ会話がありません"
    },
    "messages": {
        "typeMessage": "メッセージを入力...",
        "send": "送信",
        "edit": "メッセージを編集",
        "delete": "メッセージを削除",
        "reply": "返信",
        "thread": "スレッド",
        "bookmark": "ブックマーク",
        "unbookmark": "ブックマークを解除",
        "pin": "メッセージをピン留め",
        "unpin": "ピン留めを解除",
        "copy": "コピー",
        "share": "共有",
        "edited": "編集済み",
        "deleted": "メッセージが削除されました",
        "replyingTo": "返信先",
        "cancelReply": "返信をキャンセル"
    },
    "input": {
        "placeholder": "メッセージを入力...",
        "placeholderThread": "スレッドに返信...",
        "attachFile": "ファイルを添付",
        "emoji": "絵文字を追加",
        "mention": "誰かをメンション",
        "aiMode": "AIモード",
        "schedule": "メッセージをスケジュール",
        "recording": "録音中..."
    },
    "thread": {
        "title": "スレッド",
        "replies": "件の返信",
        "noReplies": "まだ返信がありません。会話を始めましょう！",
        "viewThread": "スレッドを表示",
        "closeThread": "スレッドを閉じる"
    },
    "members": {
        "title": "メンバー",
        "online": "オンライン",
        "offline": "オフライン",
        "typing": "が入力中...",
        "typingMultiple": "が入力中..."
    },
    "actions": {
        "audioCall": "音声通話を開始",
        "videoCall": "ビデオ通話を開始",
        "search": "会話内を検索",
        "info": "詳細を表示",
        "pin": "ピン留めされたメッセージを表示",
        "bookmark": "ブックマークされたメッセージを表示",
        "files": "共有ファイルを表示"
    },
    "modals": {
        "createChannel": {
            "title": "チャンネルを作成",
            "name": "チャンネル名",
            "namePlaceholder": "例：マーケティングチーム",
            "description": "説明",
            "descriptionPlaceholder": "このチャンネルは何についてですか？",
            "private": "プライベートチャンネル",
            "create": "チャンネルを作成",
            "cancel": "キャンセル"
        },
        "startConversation": {
            "title": "会話を開始",
            "search": "メンバーを検索...",
            "noResults": "メンバーが見つかりません",
            "start": "会話を開始"
        },
        "scheduleMessage": {
            "title": "メッセージをスケジュール",
            "date": "日付",
            "time": "時刻",
            "schedule": "スケジュール",
            "cancel": "キャンセル"
        },
        "bookmarkedMessages": {
            "title": "ブックマークされたメッセージ",
            "empty": "ブックマークされたメッセージがありません",
            "close": "閉じる"
        },
        "aiHistory": {
            "title": "AIチャット履歴",
            "empty": "まだAI会話がありません",
            "close": "閉じる"
        }
    },
    "errors": {
        "loadFailed": "メッセージの読み込みに失敗しました",
        "sendFailed": "メッセージの送信に失敗しました",
        "deleteFailed": "メッセージの削除に失敗しました",
        "createChannelFailed": "チャンネルの作成に失敗しました"
    },
    "success": {
        "messageSent": "メッセージが送信されました",
        "messageDeleted": "メッセージが削除されました",
        "channelCreated": "チャンネルが作成されました"
    }
}

ja_files_translations = {
    "title": "ファイル",
    "description": "クラウドストレージとファイル管理",
    "benefits": "バージョン管理とインスタントプレビューでファイルを安全に保存、整理、共有します。",
    "features": {
        "storage": "クラウドストレージ",
        "versionControl": "バージョン管理",
        "preview": "プレビュー",
        "sharing": "共有"
    },
    "page": {
        "title": "ファイル",
        "loading": "ファイルを読み込み中...",
        "searchPlaceholder": "ファイル、コンテンツ、タグを検索...",
        "noFiles": "まだファイルがありません",
        "emptyFolder": "このフォルダは空です"
    },
    "tabs": {
        "allFiles": "すべてのファイル",
        "dashboard": "ダッシュボード"
    },
    "views": {
        "allFiles": "すべてのファイル",
        "recent": "最近のファイル",
        "starred": "スター付き",
        "sharedWithMe": "共有されたファイル",
        "trash": "ゴミ箱",
        "documents": "ドキュメント",
        "pdfs": "PDF",
        "images": "画像",
        "spreadsheets": "スプレッドシート",
        "videos": "ビデオ",
        "audio": "オーディオ"
    },
    "actions": {
        "upload": "アップロード",
        "newFolder": "新しいフォルダ",
        "download": "ダウンロード",
        "delete": "削除",
        "rename": "名前を変更",
        "move": "移動",
        "copy": "コピー",
        "share": "共有",
        "star": "スター",
        "unstar": "スターを解除",
        "restore": "復元",
        "viewMode": "表示モード",
        "gridView": "グリッド表示",
        "listView": "リスト表示"
    },
    "modals": {
        "upload": {
            "title": "ファイルをアップロード",
            "dropZone": "ここにファイルをドロップまたはクリックして参照",
            "uploading": "アップロード中...",
            "cancel": "キャンセル",
            "done": "完了"
        },
        "createFolder": {
            "title": "フォルダを作成",
            "name": "フォルダ名",
            "namePlaceholder": "フォルダ名を入力",
            "description": "説明（オプション）",
            "descriptionPlaceholder": "説明を入力",
            "create": "作成",
            "cancel": "キャンセル"
        },
        "rename": {
            "title": "名前を変更",
            "newName": "新しい名前",
            "rename": "名前を変更",
            "cancel": "キャンセル"
        },
        "delete": {
            "title": "削除",
            "message": "このアイテムを削除してもよろしいですか？",
            "messageMultiple": "{count}個のアイテムを削除してもよろしいですか？",
            "confirm": "削除",
            "cancel": "キャンセル"
        },
        "share": {
            "title": "共有",
            "copyLink": "リンクをコピー",
            "permissions": "権限",
            "canView": "閲覧可能",
            "canEdit": "編集可能",
            "share": "共有",
            "cancel": "キャンセル"
        }
    },
    "storage": {
        "used": "使用中",
        "of": "/",
        "available": "利用可能",
        "upgrade": "ストレージを増やす"
    },
    "breadcrumbs": {
        "home": "すべてのファイル"
    },
    "contextMenu": {
        "open": "開く",
        "download": "ダウンロード",
        "rename": "名前を変更",
        "move": "移動",
        "copy": "コピー",
        "delete": "削除",
        "share": "共有",
        "details": "詳細",
        "star": "スターを追加",
        "unstar": "スターを解除"
    },
    "errors": {
        "uploadFailed": "ファイルのアップロードに失敗しました",
        "deleteFailed": "ファイルの削除に失敗しました",
        "renameFailed": "ファイルの名前変更に失敗しました",
        "loadFailed": "ファイルの読み込みに失敗しました"
    },
    "success": {
        "uploaded": "ファイルが正常にアップロードされました",
        "deleted": "ファイルが正常に削除されました",
        "renamed": "ファイル名が正常に変更されました",
        "folderCreated": "フォルダが正常に作成されました",
        "restored": "ファイルが正常に復元されました"
    }
}

ja_calendar_translations = {
    "title": "カレンダー",
    "description": "ミーティングとイベントのスケジュール",
    "benefits": "スマートスケジューリング、リマインダー、カレンダー同期でミーティングを逃しません。",
    "features": {
        "scheduling": "イベントスケジューリング",
        "meetingRooms": "ミーティングルーム",
        "sync": "同期",
        "reminders": "リマインダー"
    },
    "page": {
        "title": "カレンダー",
        "loading": "カレンダーを読み込み中...",
        "noEvents": "スケジュールされたイベントがありません",
        "today": "今日"
    },
    "views": {
        "day": "日",
        "week": "週",
        "month": "月",
        "year": "年",
        "agenda": "アジェンダ",
        "timeline": "タイムライン"
    },
    "actions": {
        "newEvent": "新しいイベント",
        "quickMeeting": "クイックミーティング",
        "today": "今日",
        "previous": "前へ",
        "next": "次へ",
        "filters": "フィルター",
        "settings": "設定"
    },
    "event": {
        "title": "イベントタイトル",
        "titlePlaceholder": "イベントタイトルを入力",
        "description": "説明",
        "descriptionPlaceholder": "説明を入力",
        "location": "場所",
        "locationPlaceholder": "場所を入力またはビデオリンクを追加",
        "startDate": "開始日",
        "endDate": "終了日",
        "startTime": "開始時刻",
        "endTime": "終了時刻",
        "allDay": "終日",
        "repeat": "繰り返し",
        "category": "カテゴリー",
        "color": "色",
        "attendees": "参加者",
        "addAttendees": "参加者を追加",
        "reminders": "リマインダー",
        "videoCall": "ビデオ通話",
        "save": "イベントを保存",
        "cancel": "キャンセル",
        "delete": "イベントを削除",
        "edit": "イベントを編集"
    },
    "repeat": {
        "never": "なし",
        "daily": "毎日",
        "weekly": "毎週",
        "monthly": "毎月",
        "yearly": "毎年",
        "custom": "カスタム"
    },
    "categories": {
        "work": "仕事",
        "personal": "個人",
        "meeting": "ミーティング",
        "reminder": "リマインダー",
        "birthday": "誕生日",
        "other": "その他"
    },
    "quickMeeting": {
        "title": "クイックミーティング",
        "duration": "期間",
        "minutes": "分",
        "create": "ミーティングを作成",
        "cancel": "キャンセル"
    },
    "modals": {
        "deleteEvent": {
            "title": "イベントを削除",
            "message": "このイベントを削除してもよろしいですか？",
            "confirm": "削除",
            "cancel": "キャンセル"
        }
    },
    "errors": {
        "loadFailed": "カレンダーの読み込みに失敗しました",
        "createFailed": "イベントの作成に失敗しました",
        "updateFailed": "イベントの更新に失敗しました",
        "deleteFailed": "イベントの削除に失敗しました"
    },
    "success": {
        "created": "イベントが正常に作成されました",
        "updated": "イベントが正常に更新されました",
        "deleted": "イベントが正常に削除されました"
    }
}

ja_notes_translations = {
    "title": "ノート",
    "description": "リッチテキストエディタとドキュメント",
    "benefits": "強力なエディタ、テンプレート、リアルタイムコラボレーションですべてを文書化します。",
    "features": {
        "richEditor": "リッチエディタ",
        "templates": "テンプレート",
        "collaboration": "コラボレーション",
        "export": "エクスポート"
    },
    "page": {
        "title": "ノート",
        "loading": "ノートを読み込み中...",
        "searchPlaceholder": "ノートを検索...",
        "noNotes": "まだノートがありません",
        "emptyNote": "書き始める..."
    },
    "sidebar": {
        "allNotes": "すべてのノート",
        "favorites": "お気に入り",
        "recent": "最近",
        "shared": "共有されたノート",
        "archived": "アーカイブ",
        "trash": "ゴミ箱"
    },
    "actions": {
        "newNote": "新しいノート",
        "newFolder": "新しいフォルダ",
        "delete": "削除",
        "archive": "アーカイブ",
        "favorite": "お気に入りに追加",
        "unfavorite": "お気に入りから削除",
        "share": "共有",
        "export": "エクスポート",
        "duplicate": "複製",
        "merge": "ノートを統合",
        "import": "インポート"
    },
    "editor": {
        "untitled": "無題",
        "placeholder": "書き始める...",
        "formatting": "書式設定",
        "bold": "太字",
        "italic": "斜体",
        "underline": "下線",
        "strikethrough": "取り消し線",
        "code": "コード",
        "link": "リンク",
        "heading1": "見出し1",
        "heading2": "見出し2",
        "heading3": "見出し3",
        "bulletList": "箇条書きリスト",
        "numberedList": "番号付きリスト",
        "taskList": "タスクリスト",
        "blockquote": "引用",
        "codeBlock": "コードブロック",
        "table": "表",
        "image": "画像",
        "divider": "区切り線",
        "emoji": "絵文字"
    },
    "ai": {
        "title": "AIアシスタント",
        "improve": "文章を改善",
        "summarize": "要約",
        "translate": "翻訳",
        "expand": "展開",
        "shorten": "短縮",
        "changeTone": "トーンを変更",
        "fixSpelling": "スペルと文法を修正",
        "continue": "執筆を続ける"
    },
    "modals": {
        "createNote": {
            "title": "ノートを作成",
            "name": "ノートのタイトル",
            "namePlaceholder": "ノートのタイトルを入力",
            "template": "テンプレート",
            "blank": "空白のノート",
            "create": "作成",
            "cancel": "キャンセル"
        },
        "share": {
            "title": "ノートを共有",
            "copyLink": "リンクをコピー",
            "permissions": "権限",
            "canView": "閲覧可能",
            "canEdit": "編集可能",
            "share": "共有",
            "cancel": "キャンセル"
        },
        "export": {
            "title": "ノートをエクスポート",
            "format": "形式",
            "pdf": "PDF",
            "markdown": "Markdown",
            "html": "HTML",
            "export": "エクスポート",
            "cancel": "キャンセル"
        },
        "import": {
            "title": "ノートをインポート",
            "dropZone": "ここにファイルをドロップまたはクリックして参照",
            "supportedFormats": "対応形式：Markdown、HTML、TXT",
            "import": "インポート",
            "cancel": "キャンセル"
        }
    },
    "templates": {
        "meeting": "ミーティングノート",
        "project": "プロジェクト計画",
        "task": "タスクリスト",
        "documentation": "ドキュメント",
        "research": "リサーチノート"
    },
    "errors": {
        "loadFailed": "ノートの読み込みに失敗しました",
        "saveFailed": "ノートの保存に失敗しました",
        "deleteFailed": "ノートの削除に失敗しました",
        "exportFailed": "ノートのエクスポートに失敗しました"
    },
    "success": {
        "created": "ノートが正常に作成されました",
        "saved": "ノートが正常に保存されました",
        "deleted": "ノートが正常に削除されました",
        "exported": "ノートが正常にエクスポートされました",
        "shared": "ノートが正常に共有されました"
    }
}

def main():
    # Load current translations
    en_path = sys.argv[1] if len(sys.argv) > 1 else '/Users/islamnymul/DEVELOP/INFOINLET-PROD/deskive/frontend/src/i18n/en.json'
    ja_path = sys.argv[2] if len(sys.argv) > 2 else '/Users/islamnymul/DEVELOP/INFOINLET-PROD/deskive/frontend/src/i18n/ja.json'

    print(f"Loading translations from:\n  EN: {en_path}\n  JA: {ja_path}")

    en_data = load_json(en_path)
    ja_data = load_json(ja_path)

    # Update English translations
    en_data['modules']['chat'] = en_chat_translations
    en_data['modules']['files'] = en_files_translations
    en_data['modules']['calendar'] = en_calendar_translations
    en_data['modules']['notes'] = en_notes_translations

    # Update Japanese translations
    ja_data['modules']['chat'] = ja_chat_translations
    ja_data['modules']['files'] = ja_files_translations
    ja_data['modules']['calendar'] = ja_calendar_translations
    ja_data['modules']['notes'] = ja_notes_translations

    # Save updated translations
    print("\nSaving updated translations...")
    save_json(en_path, en_data)
    save_json(ja_path, ja_data)

    print("\n✅ Translations updated successfully!")
    print("\nAdded comprehensive translations for:")
    print("  - Chat module (60+ keys)")
    print("  - Files module (65+ keys)")
    print("  - Calendar module (55+ keys)")
    print("  - Notes module (70+ keys)")
    print("\nTotal: 250+ new translation keys added in both EN and JA")

if __name__ == '__main__':
    main()
