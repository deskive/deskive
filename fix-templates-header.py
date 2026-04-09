#!/usr/bin/env python3
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Complete templates section for TemplatesPage header
templates_en = {
    "pageTitle": "Project Templates",
    "pageDescription": "Choose a template to quickly create a new project with predefined tasks and structure.",
    "refreshButton": "Refresh Templates",
    "seedSuccess": {
        "title": "Templates seeded",
        "description": "System templates have been added successfully."
    },
    "seedError": {
        "title": "Error",
        "description": "Failed to seed templates."
    },
    "workspaceNotFound": "Workspace not found",
    "searchPlaceholder": "Search templates...",
    "noTemplatesFound": "No templates found.",
    "featured": "Featured",
    "system": "System",
    "tasks": "tasks",
    "usedTimes": "Used {count} times",
    "showingTemplates": "Showing {start} - {end} of {total} templates",
    "previous": "Previous",
    "next": "Next",
    "cancel": "Cancel",
    "useThisTemplate": "Use This Template",
    "createFromTemplate": "Create Project from Template",
    "customizeProject": "Customize your new project before creating it.",
    "projectName": "Project Name",
    "enterProjectName": "Enter project name",
    "description": "Description (optional)",
    "enterProjectDescription": "Enter project description",
    "createProject": "Create Project",
    "templateStructure": "Template Structure",
    "customFields": "Custom Fields",
    "boardStages": "Board Stages",
    "blankProject": "Blank Project",
    "startFromScratch": "Start from scratch",
    "projectCreated": "Project created",
    "projectCreatedDescription": "\"{projectName}\" has been created from the \"{templateName}\" template.",
    "createProjectError": "Failed to create project from template.",
    "complexity": "complexity",
    "moreTasks": "+{count} more tasks...",
}

templates_ja = {
    "pageTitle": "プロジェクトテンプレート",
    "pageDescription": "テンプレートを選択して、事前定義されたタスクと構造で新しいプロジェクトを素早く作成できます。",
    "refreshButton": "テンプレートを更新",
    "seedSuccess": {
        "title": "テンプレートを追加しました",
        "description": "システムテンプレートが正常に追加されました。"
    },
    "seedError": {
        "title": "エラー",
        "description": "テンプレートの追加に失敗しました。"
    },
    "workspaceNotFound": "ワークスペースが見つかりません",
    "searchPlaceholder": "テンプレートを検索...",
    "noTemplatesFound": "テンプレートが見つかりません。",
    "featured": "おすすめ",
    "system": "システム",
    "tasks": "タスク",
    "usedTimes": "{count}回使用",
    "showingTemplates": "{total}個中{start} - {end}個のテンプレートを表示",
    "previous": "前へ",
    "next": "次へ",
    "cancel": "キャンセル",
    "useThisTemplate": "このテンプレートを使用",
    "createFromTemplate": "テンプレートからプロジェクトを作成",
    "customizeProject": "新しいプロジェクトを作成する前にカスタマイズします。",
    "projectName": "プロジェクト名",
    "enterProjectName": "プロジェクト名を入力",
    "description": "説明（任意）",
    "enterProjectDescription": "プロジェクトの説明を入力",
    "createProject": "プロジェクトを作成",
    "templateStructure": "テンプレート構造",
    "customFields": "カスタムフィールド",
    "boardStages": "ボードステージ",
    "blankProject": "空のプロジェクト",
    "startFromScratch": "最初から始める",
    "projectCreated": "プロジェクトを作成しました",
    "projectCreatedDescription": "「{projectName}」が「{templateName}」テンプレートから作成されました。",
    "createProjectError": "テンプレートからプロジェクトの作成に失敗しました。",
    "complexity": "複雑さ",
    "moreTasks": "さらに{count}個のタスク...",
}

def main():
    print("Loading translation files...")

    with open('frontend/src/i18n/en.json', 'r', encoding='utf-8') as f:
        en = json.load(f)

    with open('frontend/src/i18n/ja.json', 'r', encoding='utf-8') as f:
        ja = json.load(f)

    print("\nAdding header translations to templates section...")

    # Get existing templates sections
    if 'templates' not in en:
        en['templates'] = {}
    if 'templates' not in ja:
        ja['templates'] = {}

    # Merge the header translations into existing templates
    en['templates'].update(templates_en)
    ja['templates'].update(templates_ja)

    print(f"[OK] Added {len(templates_en)} keys to en.json templates section")
    print(f"[OK] Added {len(templates_ja)} keys to ja.json templates section")

    # Save files
    print("\nSaving files...")

    with open('frontend/src/i18n/en.json', 'w', encoding='utf-8') as f:
        json.dump(en, f, ensure_ascii=False, indent=2)
    print("[OK] Saved en.json")

    with open('frontend/src/i18n/ja.json', 'w', encoding='utf-8') as f:
        json.dump(ja, f, ensure_ascii=False, indent=2)
    print("[OK] Saved ja.json")

    print("\n[SUCCESS] Templates header translations added!")
    print("\nThe header (title, description, buttons) will now show in Japanese.")

    return 0

if __name__ == '__main__':
    sys.exit(main())
