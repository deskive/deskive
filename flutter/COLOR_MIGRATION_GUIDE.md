# Color Migration Guide - Deskive Flutter App

## ✅ Completed
1. **Created centralized theme system** (`lib/theme/app_theme.dart`)
2. **Updated main.dart** to use new theme
3. **Migrated dashboard_screen.dart** as reference example

## 🎯 What Was Done

### 1. Created AppTheme Class (`lib/theme/app_theme.dart`)
- Matches frontend React+Vite colors exactly
- Primary: `#175CF8` (light) / `#2563EB` (dark)
- Provides complete light and dark themes
- Includes ThemeExtension for easy access

### 2. Updated main.dart
- Replaced `ColorScheme.fromSeed()` with `AppTheme.lightTheme` and `AppTheme.darkTheme`
- Old seed color `#87CEFA` (Sky Blue) → New primary `#175CF8` (Vibrant Blue)

### 3. Dashboard Screen Migration (Example Pattern)
See `lib/dashboard/dashboard_screen.dart` for complete example.

## 📋 Migration Pattern for Remaining Files

### Step 1: Add Theme Import
```dart
import '../theme/app_theme.dart';
```

### Step 2: Replace Common Hardcoded Colors

#### **Background Colors**
```dart
// OLD
backgroundColor: isDark ? const Color(0xFF0D1117) : const Color(0xFFF6F8FA)

// NEW
backgroundColor: context.backgroundColor
```

#### **Card/Container Colors**
```dart
// OLD
color: isDark ? const Color(0xFF161B22) : Colors.white

// NEW
color: context.cardColor
```

#### **Border Colors**
```dart
// OLD
color: isDark ? const Color(0xFF30363D) : const Color(0xFFD0D7DE)

// NEW
color: context.borderColor
```

#### **Primary Blue Colors**
```dart
// OLD
Color(0xFF2464EC)  // or Color(0xFF87CEFA) or Color(0xFF2196F3)

// NEW (runtime)
context.primaryColor

// NEW (const contexts)
AppTheme.primaryLight  // or AppTheme.primaryDark based on theme
```

#### **Text Colors**
```dart
// OLD
color: isDark ? Colors.white : Colors.black

// NEW
color: context.colorScheme.onSurface
```

```dart
// OLD
color: isDark ? Colors.white70 : Colors.grey[700]

// NEW
color: context.mutedForegroundColor
```

#### **Muted Background**
```dart
// OLD
color: isDark ? const Color(0xFF0D1117) : const Color(0xFFF6F8FA)

// NEW
color: context.mutedColor
```

#### **Status Colors**
```dart
// Success (Green)
// OLD: Color(0xFF4CAF50) or Colors.green
// NEW: context.successColor or AppTheme.successLight

// Error (Red)
// OLD: Color(0xFFEF4444) or Colors.red
// NEW: context.colorScheme.error or AppTheme.destructiveLight

// Warning (Orange)
// OLD: Color(0xFFFF9800) or Colors.orange
// NEW: context.warningColor or AppTheme.warningLight

// Info (Blue)
// OLD: Color(0xFF2196F3) or Colors.blue
// NEW: context.infoColor or AppTheme.infoLight
```

### Step 3: Use Theme Extension Helpers

The `ThemeExtension` provides convenient access:

```dart
// Get theme properties
context.isDarkMode           // bool
context.primaryColor         // Color
context.backgroundColor      // Color
context.cardColor           // Color
context.borderColor         // Color
context.mutedColor          // Color
context.mutedForegroundColor // Color
context.successColor        // Color
context.warningColor        // Color
context.infoColor           // Color
context.colorScheme         // ColorScheme
context.textTheme           // TextTheme
```

## 🔄 Bulk Replacement Commands

For files with many hardcoded colors, use sed:

```bash
cd /path/to/screen/directory

# Replace common patterns
sed -i '' \
  -e 's/isDark ? const Color(0xFF0D1117) : const Color(0xFFF6F8FA)/context.backgroundColor/g' \
  -e 's/isDark ? const Color(0xFF161B22) : Colors.white/context.cardColor/g' \
  -e 's/isDark ? const Color(0xFF30363D) : const Color(0xFFD0D7DE)/context.borderColor/g' \
  -e 's/Color(0xFF2464EC)/context.primaryColor/g' \
  -e 's/Color(0xFF87CEFA)/context.primaryColor/g' \
  -e 's/Color(0xFF2196F3)/context.infoColor/g' \
  -e 's/Color(0xFFF44336)/context.colorScheme.error/g' \
  -e 's/Color(0xFF4CAF50)/context.successColor/g' \
  -e 's/Color(0xFFFF9800)/context.warningColor/g' \
  your_screen.dart

# Fix const keyword issues
sed -i '' \
  -e 's/const context\./AppTheme./g' \
  -e 's/AppTheme\.infoColor/AppTheme.infoLight/g' \
  -e 's/AppTheme\.successColor/AppTheme.successLight/g' \
  -e 's/AppTheme\.warningColor/AppTheme.warningLight/g' \
  your_screen.dart
```

## 📝 Priority Files to Migrate

### High Priority (User-Facing)
1. ✅ `lib/dashboard/dashboard_screen.dart` - DONE
2. `lib/message/real_time_chat_screen.dart`
3. `lib/message/real_time_chat_list_screen.dart`
4. `lib/files/files_screen.dart`
5. `lib/calendar/calendar_screen.dart`
6. `lib/projects/projects_screen.dart`
7. `lib/notes/notes_screen.dart`
8. `lib/videocalls/video_call_screen.dart`

### Medium Priority (Common Components)
9. `lib/screens/main_screen.dart`
10. `lib/screens/profile_screen.dart`
11. `lib/screens/settings_screen.dart`
12. `lib/screens/workspace_screen.dart`
13. `lib/widgets/*.dart` (all widget files)

### Low Priority (Less Visible)
- All remaining screens in `lib/screens/`
- Helper screens and dialogs
- Admin/settings screens

## 🎨 Complete Color Reference

### Light Theme Colors
```dart
Primary:              #175CF8
Secondary:            #F1F5F9
Background:           #FFFFFF
Card:                 #FFFFFF
Border:               #E2E8F0
Muted:                #F1F5F9
Muted Foreground:     #64748B
Success:              #10B981
Warning:              #F59E0B
Info:                 #3B82F6
Destructive:          #EF4444
```

### Dark Theme Colors
```dart
Primary:              #2563EB
Secondary:            #1E293B
Background:           #020817
Card:                 #020817
Border:               #1E293B
Muted:                #1E293B
Muted Foreground:     #94A3B8
Success:              #059669
Warning:              #D97706
Info:                 #2563EB
Destructive:          #991B1B
```

## ✨ Benefits

1. **Consistency**: All screens use same color scheme as frontend
2. **Maintainability**: Change colors in one place (AppTheme)
3. **Theme Support**: Automatic light/dark mode switching
4. **Type Safety**: No more hardcoded hex values scattered everywhere
5. **Better DX**: Use `context.primaryColor` instead of `isDark ? Color(0xFF...) : Color(0xFF...)`

## 🚀 Next Steps

1. Migrate high-priority screens one by one
2. Test theme switching after each migration
3. Use dashboard_screen.dart as reference
4. Gradually migrate remaining 115+ files

## 📊 Current Progress

- **Theme System**: ✅ Complete
- **Main App**: ✅ Complete
- **Dashboard**: ✅ Complete (Reference Example)
- **Remaining Screens**: 🔄 To Do (115+ files)

---

**Remember**: Always test theme switching (light ↔️ dark) after migrating each screen to ensure colors look good in both modes!
