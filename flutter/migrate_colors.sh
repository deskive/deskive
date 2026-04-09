#!/bin/bash

# Color Migration Script for Deskive Flutter App
# This script automatically migrates hardcoded colors to use the centralized theme system

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deskive Color Migration Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Base directory
LIB_DIR="/Users/user/StudioProjects/deskive/flutter/lib"

# Function to add theme import if not present
add_theme_import() {
    local file=$1

    # Check if import already exists
    if grep -q "import.*theme/app_theme.dart" "$file"; then
        return 0
    fi

    # Find the last import statement
    last_import_line=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)

    if [ -n "$last_import_line" ]; then
        # Add import after last import
        sed -i '' "${last_import_line}a\\
import '../theme/app_theme.dart';
" "$file"
        echo -e "${GREEN}  ✓ Added theme import${NC}"
    fi
}

# Function to migrate colors in a file
migrate_file() {
    local file=$1
    local filename=$(basename "$file")

    # Skip if file doesn't contain Color(0x
    if ! grep -q "Color(0x" "$file"; then
        return 0
    fi

    echo -e "\n${YELLOW}Migrating: ${filename}${NC}"

    # Add theme import
    add_theme_import "$file"

    # Apply color replacements
    sed -i '' \
        -e 's/isDark ? const Color(0xFF0D1117) : const Color(0xFFF6F8FA)/context.backgroundColor/g' \
        -e 's/isDarkMode ? const Color(0xFF0D1117) : const Color(0xFFF6F8FA)/context.backgroundColor/g' \
        -e 's/isDark ? const Color(0xFF0A0E15) : const Color(0xFFF8F9FA)/context.backgroundColor/g' \
        -e 's/isDarkMode ? const Color(0xFF0A0E15) : const Color(0xFFF8F9FA)/context.backgroundColor/g' \
        -e 's/isDark ? const Color(0xFF161B22) : Colors\.white/context.cardColor/g' \
        -e 's/isDarkMode ? const Color(0xFF161B22) : Colors\.white/context.cardColor/g' \
        -e 's/isDark ? const Color(0xFF1A1F2A) : Colors\.white/context.cardColor/g' \
        -e 's/isDarkMode ? const Color(0xFF1A1F2A) : Colors\.white/context.cardColor/g' \
        -e 's/isDark ? const Color(0xFF30363D) : const Color(0xFFD0D7DE)/context.borderColor/g' \
        -e 's/isDarkMode ? const Color(0xFF30363D) : const Color(0xFFD0D7DE)/context.borderColor/g' \
        -e 's/Color(0xFF2464EC)/context.primaryColor/g' \
        -e 's/Color(0xFF87CEFA)/context.primaryColor/g' \
        -e 's/Color(0xFF2196F3)/AppTheme.infoLight/g' \
        -e 's/const Color(0xFF2196F3)/AppTheme.infoLight/g' \
        -e 's/Color(0xFFF44336)/context.colorScheme.error/g' \
        -e 's/Color(0xFF4CAF50)/AppTheme.successLight/g' \
        -e 's/Color(0xFF9C27B0)/AppTheme.infoLight/g' \
        -e 's/Color(0xFFFF9800)/AppTheme.warningLight/g' \
        -e 's/isDark ? const Color(0xFF0F1419) : Colors\.grey\[100\]/isDark ? AppTheme.mutedDark : AppTheme.mutedLight/g' \
        -e 's/isDarkMode ? const Color(0xFF0F1419) : Colors\.grey\[100\]/isDarkMode ? AppTheme.mutedDark : AppTheme.mutedLight/g' \
        -e 's/isDark ? const Color(0xFF1A1F2A) : Colors\.grey\[100\]/isDark ? AppTheme.cardDark : AppTheme.mutedLight/g' \
        -e 's/isDarkMode ? const Color(0xFF1A1F2A) : Colors\.grey\[100\]/isDarkMode ? AppTheme.cardDark : AppTheme.mutedLight/g' \
        "$file"

    # Fix const keyword issues
    sed -i '' \
        -e 's/const context\./AppTheme./g' \
        -e 's/const AppTheme\./AppTheme./g' \
        "$file"

    echo -e "${GREEN}  ✓ Colors migrated${NC}"
}

# Migrate high-priority screens
echo -e "\n${BLUE}=== Migrating High-Priority Screens ===${NC}"

# Files
if [ -f "$LIB_DIR/files/files_screen.dart" ]; then
    migrate_file "$LIB_DIR/files/files_screen.dart"
fi

# Calendar
if [ -f "$LIB_DIR/calendar/calendar_screen.dart" ]; then
    migrate_file "$LIB_DIR/calendar/calendar_screen.dart"
fi

# Projects
if [ -f "$LIB_DIR/projects/projects_screen.dart" ]; then
    migrate_file "$LIB_DIR/projects/projects_screen.dart"
fi

# Notes
if [ -f "$LIB_DIR/notes/notes_screen.dart" ]; then
    migrate_file "$LIB_DIR/notes/notes_screen.dart"
fi

# Video calls
if [ -f "$LIB_DIR/videocalls/video_call_screen.dart" ]; then
    migrate_file "$LIB_DIR/videocalls/video_call_screen.dart"
fi

# Main screen
if [ -f "$LIB_DIR/screens/main_screen.dart" ]; then
    migrate_file "$LIB_DIR/screens/main_screen.dart"
fi

# Profile, Settings, Workspace
if [ -f "$LIB_DIR/screens/profile_screen.dart" ]; then
    migrate_file "$LIB_DIR/screens/profile_screen.dart"
fi

if [ -f "$LIB_DIR/screens/settings_screen.dart" ]; then
    migrate_file "$LIB_DIR/screens/settings_screen.dart"
fi

if [ -f "$LIB_DIR/screens/workspace_screen.dart" ]; then
    migrate_file "$LIB_DIR/screens/workspace_screen.dart"
fi

# Migrate all remaining screens
echo -e "\n${BLUE}=== Migrating Remaining Screens ===${NC}"

# Find all .dart files with hardcoded colors
find "$LIB_DIR/screens" -name "*.dart" -type f | while read -r file; do
    migrate_file "$file"
done

find "$LIB_DIR/widgets" -name "*.dart" -type f | while read -r file; do
    migrate_file "$file"
done

# Additional module screens
for dir in files calendar projects notes videocalls message team search; do
    if [ -d "$LIB_DIR/$dir" ]; then
        find "$LIB_DIR/$dir" -name "*.dart" -type f | while read -r file; do
            migrate_file "$file"
        done
    fi
done

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Migration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nNext steps:"
echo -e "1. Run: ${YELLOW}flutter analyze${NC} to check for any issues"
echo -e "2. Run: ${YELLOW}flutter run${NC} to test the app"
echo -e "3. Test theme switching (light ↔️ dark mode)"
