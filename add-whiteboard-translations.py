#!/usr/bin/env python3
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Complete whiteboard functional translations for WhiteboardPage
whiteboard_functional_en = {
    # General
    "title": "Whiteboard",
    "loading": "Loading...",
    "defaultName": "Untitled Whiteboard",
    "defaultNameWithDate": "Whiteboard {date}",
    "updated": "Updated:",
    "noWhiteboardsYet": "No whiteboards yet. Create one to get started!",
    "newWhiteboard": "New Whiteboard",
    "showMenu": "Show Menu",
    "hideGrid": "Hide Grid",
    "showGrid": "Show Grid",
    "canvasBackground": "Canvas Background",
    "copyData": "Copy Whiteboard Data",
    "deleteWhiteboard": "Delete Whiteboard",
    "hideMenuBar": "Hide Menu Bar",
    "hideHeader": "Hide Header",
    "showHeader": "Show Header",

    # Errors
    "error": {
        "loadFailed": "Failed to load whiteboard",
        "notFound": "Whiteboard not found",
        "saveFailed": "Failed to save whiteboard",
        "createFailed": "Failed to create whiteboard",
        "deleteFailed": "Failed to delete whiteboard",
        "exportFailed": "Failed to export whiteboard",
        "missingWorkspaceId": "Missing Workspace ID",
        "couldNotExtractWorkspaceId": "Could not extract workspace ID from the URL."
    },

    # Success messages
    "success": {
        "saved": "Whiteboard saved successfully",
        "created": "Whiteboard created successfully",
        "deleted": "Whiteboard deleted successfully",
        "exportedPNG": "Exported as PNG",
        "exportedSVG": "Exported as SVG",
        "copiedToClipboard": "Whiteboard data copied to clipboard"
    },

    # Status
    "status": {
        "saving": "Saving...",
        "failedToSave": "Failed to save",
        "allChangesSaved": "All changes saved"
    },

    # Tools
    "tools": {
        "lock": "Lock Canvas",
        "unlock": "Unlock Canvas",
        "hand": "Hand Tool",
        "select": "Select",
        "rectangle": "Rectangle",
        "diamond": "Diamond",
        "ellipse": "Ellipse",
        "arrow": "Arrow",
        "line": "Line",
        "draw": "Draw",
        "text": "Text",
        "image": "Image",
        "eraser": "Eraser"
    },

    # Export
    "export": {
        "png": "Export as PNG",
        "svg": "Export as SVG"
    },

    # Dialogs
    "dialog": {
        "createNew": "Create New Whiteboard",
        "enterName": "Enter a name for your new whiteboard",
        "name": "Name",
        "namePlaceholder": "My Whiteboard",
        "create": "Create",
        "open": "Open Whiteboard",
        "select": "Select a whiteboard to open",
        "selectOrCreate": "Select a whiteboard to open or create a new one",
        "deleteTitle": "Delete Whiteboard?",
        "deleteDescription": "Are you sure you want to delete \"{name}\"? This action cannot be undone."
    },

    # Sticky Notes
    "stickyNote": {
        "add": "Add Sticky Note",
        "clickToEdit": "Click to edit",
        "selectColor": "Select sticky note color:"
    },

    # Mind Map
    "mindMap": {
        "mode": "Mind Map Mode",
        "modeShort": "Mind Map",
        "exit": "Exit Mind Map Mode",
        "instructions": "Click to add nodes. Connect nodes by clicking and dragging."
    }
}

whiteboard_functional_ja = {
    # General
    "title": "ホワイトボード",
    "loading": "読み込み中...",
    "defaultName": "無題のホワイトボード",
    "defaultNameWithDate": "ホワイトボード {date}",
    "updated": "更新日時:",
    "noWhiteboardsYet": "まだホワイトボードがありません。作成を開始してください！",
    "newWhiteboard": "新しいホワイトボード",
    "showMenu": "メニューを表示",
    "hideGrid": "グリッドを非表示",
    "showGrid": "グリッドを表示",
    "canvasBackground": "キャンバスの背景",
    "copyData": "ホワイトボードデータをコピー",
    "deleteWhiteboard": "ホワイトボードを削除",
    "hideMenuBar": "メニューバーを非表示",
    "hideHeader": "ヘッダーを非表示",
    "showHeader": "ヘッダーを表示",

    # Errors
    "error": {
        "loadFailed": "ホワイトボードの読み込みに失敗しました",
        "notFound": "ホワイトボードが見つかりません",
        "saveFailed": "ホワイトボードの保存に失敗しました",
        "createFailed": "ホワイトボードの作成に失敗しました",
        "deleteFailed": "ホワイトボードの削除に失敗しました",
        "exportFailed": "ホワイトボードのエクスポートに失敗しました",
        "missingWorkspaceId": "ワークスペースIDがありません",
        "couldNotExtractWorkspaceId": "URLからワークスペースIDを抽出できませんでした。"
    },

    # Success messages
    "success": {
        "saved": "ホワイトボードを保存しました",
        "created": "ホワイトボードを作成しました",
        "deleted": "ホワイトボードを削除しました",
        "exportedPNG": "PNGとしてエクスポートしました",
        "exportedSVG": "SVGとしてエクスポートしました",
        "copiedToClipboard": "ホワイトボードデータをクリップボードにコピーしました"
    },

    # Status
    "status": {
        "saving": "保存中...",
        "failedToSave": "保存に失敗しました",
        "allChangesSaved": "すべての変更を保存しました"
    },

    # Tools
    "tools": {
        "lock": "キャンバスをロック",
        "unlock": "キャンバスのロックを解除",
        "hand": "手のツール",
        "select": "選択",
        "rectangle": "長方形",
        "diamond": "ダイヤモンド",
        "ellipse": "楕円",
        "arrow": "矢印",
        "line": "線",
        "draw": "描画",
        "text": "テキスト",
        "image": "画像",
        "eraser": "消しゴム"
    },

    # Export
    "export": {
        "png": "PNGとしてエクスポート",
        "svg": "SVGとしてエクスポート"
    },

    # Dialogs
    "dialog": {
        "createNew": "新しいホワイトボードを作成",
        "enterName": "新しいホワイトボードの名前を入力してください",
        "name": "名前",
        "namePlaceholder": "マイホワイトボード",
        "create": "作成",
        "open": "ホワイトボードを開く",
        "select": "開くホワイトボードを選択してください",
        "selectOrCreate": "開くホワイトボードを選択するか、新しく作成してください",
        "deleteTitle": "ホワイトボードを削除しますか？",
        "deleteDescription": "「{name}」を削除してもよろしいですか？この操作は元に戻せません。"
    },

    # Sticky Notes
    "stickyNote": {
        "add": "付箋を追加",
        "clickToEdit": "クリックして編集",
        "selectColor": "付箋の色を選択："
    },

    # Mind Map
    "mindMap": {
        "mode": "マインドマップモード",
        "modeShort": "マインドマップ",
        "exit": "マインドマップモードを終了",
        "instructions": "クリックしてノードを追加。ドラッグしてノードを接続します。"
    }
}

def main():
    print("Loading translation files...")

    with open('frontend/src/i18n/en.json', 'r', encoding='utf-8') as f:
        en = json.load(f)

    with open('frontend/src/i18n/ja.json', 'r', encoding='utf-8') as f:
        ja = json.load(f)

    print("\nMerging whiteboard functional translations...")

    # Get existing whiteboard sections (marketing content)
    if 'whiteboard' not in en:
        en['whiteboard'] = {}
    if 'whiteboard' not in ja:
        ja['whiteboard'] = {}

    # Merge the functional translations into existing whiteboard section
    en['whiteboard'].update(whiteboard_functional_en)
    ja['whiteboard'].update(whiteboard_functional_ja)

    print(f"[OK] Added {len(whiteboard_functional_en)} functional keys to en.json whiteboard section")
    print(f"[OK] Added {len(whiteboard_functional_ja)} functional keys to ja.json whiteboard section")

    # Save files
    print("\nSaving files...")

    with open('frontend/src/i18n/en.json', 'w', encoding='utf-8') as f:
        json.dump(en, f, ensure_ascii=False, indent=2)
    print("[OK] Saved en.json")

    with open('frontend/src/i18n/ja.json', 'w', encoding='utf-8') as f:
        json.dump(ja, f, ensure_ascii=False, indent=2)
    print("[OK] Saved ja.json")

    print("\n[SUCCESS] Whiteboard functional translations added!")
    print("\nThe whiteboard page will now show Japanese instead of translation keys.")

    return 0

if __name__ == '__main__':
    sys.exit(main())
