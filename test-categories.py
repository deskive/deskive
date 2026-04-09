import json

with open('frontend/src/i18n/ja.json', encoding='utf-8') as f:
    ja = json.load(f)

categories = ja['templates']['categories']

print("Testing categories structure:")
print(f"Total categories: {len(categories)}")
print(f"\nFirst 5 categories:")
for key in list(categories.keys())[:5]:
    value = categories[key]
    print(f"  {key}: {value} (type: {type(value).__name__})")

print(f"\n✓ All categories are strings: {all(isinstance(v, str) for v in categories.values())}")
