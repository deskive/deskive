#!/usr/bin/env python3
"""
Fix translation file issues:
1. Remove duplicate modules (integrationsModule1, notesProduct1) from ja.json
2. Merge notes-translations into main translation files
"""

import json
import sys
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def deep_merge(dict1, dict2):
    """Recursively merge dict2 into dict1"""
    result = dict1.copy()
    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result

def main():
    print("Loading translation files...")

    # Load main translation files
    with open('frontend/src/i18n/en.json', 'r', encoding='utf-8') as f:
        en = json.load(f)

    with open('frontend/src/i18n/ja.json', 'r', encoding='utf-8') as f:
        ja = json.load(f)

    # Load notes translation files
    try:
        with open('frontend/src/i18n/notes-translations-en.json', 'r', encoding='utf-8') as f:
            notes_en = json.load(f)

        with open('frontend/src/i18n/notes-translations-ja.json', 'r', encoding='utf-8') as f:
            notes_ja = json.load(f)

        print("[OK] Notes translation files loaded")
        notes_exist = True
    except FileNotFoundError:
        print("[WARN] Notes translation files not found, skipping merge")
        notes_exist = False

    # Fix ja.json - remove duplicate modules
    print("\nFixing ja.json...")
    duplicates_removed = []

    # Check in modules section
    if 'modules' in ja:
        if 'integrationsModule1' in ja['modules']:
            del ja['modules']['integrationsModule1']
            duplicates_removed.append('integrationsModule1')
            print("[OK] Removed duplicate: modules.integrationsModule1")

        if 'notesProduct1' in ja['modules']:
            del ja['modules']['notesProduct1']
            duplicates_removed.append('notesProduct1')
            print("[OK] Removed duplicate: modules.notesProduct1")

    # Also check top-level (just in case)
    if 'integrationsModule1' in ja:
        del ja['integrationsModule1']
        duplicates_removed.append('integrationsModule1 (top-level)')
        print("[OK] Removed duplicate: integrationsModule1 (top-level)")

    if 'notesProduct1' in ja:
        del ja['notesProduct1']
        duplicates_removed.append('notesProduct1 (top-level)')
        print("[OK] Removed duplicate: notesProduct1 (top-level)")

    if not duplicates_removed:
        print("  No duplicates found")

    # Merge notes translations
    if notes_exist:
        print("\nMerging notes translations...")
        en = deep_merge(en, notes_en)
        ja = deep_merge(ja, notes_ja)
        print("[OK] Notes translations merged into main files")

    # Save updated files
    print("\nSaving updated files...")

    with open('frontend/src/i18n/en.json', 'w', encoding='utf-8') as f:
        json.dump(en, f, ensure_ascii=False, indent=2)
    print("[OK] Saved en.json")

    with open('frontend/src/i18n/ja.json', 'w', encoding='utf-8') as f:
        json.dump(ja, f, ensure_ascii=False, indent=2)
    print("[OK] Saved ja.json")

    print("\n[SUCCESS] Translation files fixed successfully!")
    print(f"\nSummary:")
    print(f"  - Removed {len(duplicates_removed)} duplicate modules from ja.json")
    print(f"  - Merged notes translations: {'Yes' if notes_exist else 'No'}")

    return 0

if __name__ == '__main__':
    sys.exit(main())
