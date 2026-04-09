#!/usr/bin/env python3
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Correct flat category structure for the TemplatesPage component
categories_en = {
    "all": "All",
    "softwareDevelopment": "Software Development",
    "marketing": "Marketing",
    "hr": "HR & People",
    "design": "Design & Creative",
    "business": "Business & Operations",
    "events": "Events & Webinars",
    "research": "Research & Analysis",
    "personal": "Personal & Productivity",
    "sales": "Sales",
    "finance": "Finance",
    "itSupport": "IT Support",
    "education": "Education",
    "freelance": "Freelance",
    "operations": "Operations",
    "healthcare": "Healthcare",
    "legal": "Legal",
    "realEstate": "Real Estate",
    "manufacturing": "Manufacturing",
    "nonprofit": "Non-Profit",
    "media": "Media & Entertainment"
}

categories_ja = {
    "all": "すべて",
    "softwareDevelopment": "ソフトウェア開発",
    "marketing": "マーケティング",
    "hr": "人事",
    "design": "デザイン＆クリエイティブ",
    "business": "ビジネス＆運営",
    "events": "イベント＆ウェビナー",
    "research": "リサーチ＆分析",
    "personal": "個人＆生産性",
    "sales": "営業",
    "finance": "財務",
    "itSupport": "ITサポート",
    "education": "教育",
    "freelance": "フリーランス",
    "operations": "運営",
    "healthcare": "医療",
    "legal": "法務",
    "realEstate": "不動産",
    "manufacturing": "製造",
    "nonprofit": "非営利",
    "media": "メディア＆エンターテインメント"
}

def main():
    print("Loading translation files...")

    with open('frontend/src/i18n/en.json', 'r', encoding='utf-8') as f:
        en = json.load(f)

    with open('frontend/src/i18n/ja.json', 'r', encoding='utf-8') as f:
        ja = json.load(f)

    # Fix templates.categories in both files
    print("\nFixing templates.categories structure...")

    if 'templates' not in en:
        en['templates'] = {}
    if 'templates' not in ja:
        ja['templates'] = {}

    # Replace the nested structure with flat strings
    en['templates']['categories'] = categories_en
    ja['templates']['categories'] = categories_ja

    print("[OK] Replaced templates.categories with flat structure in en.json")
    print("[OK] Replaced templates.categories with flat structure in ja.json")

    # Save files
    print("\nSaving files...")

    with open('frontend/src/i18n/en.json', 'w', encoding='utf-8') as f:
        json.dump(en, f, ensure_ascii=False, indent=2)
    print("[OK] Saved en.json")

    with open('frontend/src/i18n/ja.json', 'w', encoding='utf-8') as f:
        json.dump(ja, f, ensure_ascii=False, indent=2)
    print("[OK] Saved ja.json")

    print("\n[SUCCESS] Templates categories fixed!")
    print("\nCategories are now flat strings, matching component expectations.")

    return 0

if __name__ == '__main__':
    sys.exit(main())
