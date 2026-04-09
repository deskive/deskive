#!/bin/bash
set -e

echo "🖥️  Building Deskive Desktop Apps (macOS + Windows)..."
echo "======================================================="

cd "$(dirname "$0")/../frontend"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf src-tauri/target/release/bundle

# Build for macOS ARM64 (native on M1)
echo "🍎 Building macOS ARM64..."
npm run tauri:build -- --target aarch64-apple-darwin

# Build for macOS x64 (Intel)
echo "🍎 Building macOS x64..."
npm run tauri:build -- --target x86_64-apple-darwin

# Build for Windows (cross-compile from Mac)
echo "🪟 Building Windows x64..."
echo "⚠️  Note: Windows build requires additional setup (see below)"
if command -v x86_64-w64-mingw32-gcc &> /dev/null; then
    npm run tauri:build -- --target x86_64-pc-windows-msvc || echo "⚠️  Windows build failed - cross-compilation not set up"
else
    echo "⚠️  Windows cross-compilation not available"
    echo "   To enable Windows builds from Mac:"
    echo "   1. Install Windows target: rustup target add x86_64-pc-windows-msvc"
    echo "   2. Install mingw-w64: brew install mingw-w64"
    echo "   3. Re-run this script"
fi

# List built files
echo ""
echo "📦 Built files:"
find src-tauri/target -name "*.dmg" -o -name "*.exe" -o -name "*.msi"

# Upload to server 236
echo ""
echo "📤 Uploading to production server..."

SERVER="root@46.62.146.236"
DEST="/var/www/deskive/downloads"
SSH_KEY="$HOME/.ssh/hetzner_fluxez"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    echo "Please check your SSH key path"
    exit 1
fi

# Create downloads directory if it doesn't exist
ssh -i "$SSH_KEY" $SERVER "mkdir -p $DEST"

# Upload macOS builds
echo "Uploading macOS ARM64..."
ARM64_DMG=$(find src-tauri/target/aarch64-apple-darwin/release/bundle/dmg -name "*.dmg" | head -1)
if [ -n "$ARM64_DMG" ]; then
    scp -i "$SSH_KEY" "$ARM64_DMG" $SERVER:$DEST/Deskive-macOS-arm64.dmg
    echo "✅ ARM64 uploaded"
else
    echo "⚠️ ARM64 build not found"
fi

echo "Uploading macOS x64..."
X64_DMG=$(find src-tauri/target/x86_64-apple-darwin/release/bundle/dmg -name "*.dmg" | head -1)
if [ -n "$X64_DMG" ]; then
    scp -i "$SSH_KEY" "$X64_DMG" $SERVER:$DEST/Deskive-macOS-x64.dmg
    echo "✅ x64 uploaded"
else
    echo "⚠️ x64 build not found"
fi

# Upload Windows build if it exists
echo "Uploading Windows x64..."
WIN_EXE=$(find src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis -name "*.exe" 2>/dev/null | head -1)
if [ -n "$WIN_EXE" ]; then
    scp -i "$SSH_KEY" "$WIN_EXE" $SERVER:$DEST/Deskive-Windows-x64.exe
    echo "✅ Windows x64 uploaded"
else
    echo "⚠️ Windows build not found (cross-compilation not enabled)"
fi

# Update versions.json
RELEASE_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')

# Check if Windows build exists for versions.json
if [ -n "$WIN_EXE" ]; then
cat > /tmp/versions.json << EOF
{
  "version": "$VERSION",
  "releaseDate": "$RELEASE_DATE",
  "downloads": {
    "macOS": {
      "arm64": "https://deskive.com/downloads/Deskive-macOS-arm64.dmg",
      "x64": "https://deskive.com/downloads/Deskive-macOS-x64.dmg"
    },
    "windows": {
      "x64": "https://deskive.com/downloads/Deskive-Windows-x64.exe"
    }
  }
}
EOF
else
cat > /tmp/versions.json << EOF
{
  "version": "$VERSION",
  "releaseDate": "$RELEASE_DATE",
  "downloads": {
    "macOS": {
      "arm64": "https://deskive.com/downloads/Deskive-macOS-arm64.dmg",
      "x64": "https://deskive.com/downloads/Deskive-macOS-x64.dmg"
    }
  },
  "note": "Windows build not available yet - cross-compilation setup required"
}
EOF
fi

scp -i "$SSH_KEY" /tmp/versions.json $SERVER:$DEST/versions.json

echo ""
echo "✅ Desktop apps uploaded successfully!"
echo "📱 Downloads available at:"
echo "   - macOS ARM64: https://deskive.com/downloads/Deskive-macOS-arm64.dmg"
echo "   - macOS x64:   https://deskive.com/downloads/Deskive-macOS-x64.dmg"
[ -n "$WIN_EXE" ] && echo "   - Windows x64: https://deskive.com/downloads/Deskive-Windows-x64.exe"
echo "   - Info:        https://deskive.com/downloads/versions.json"
