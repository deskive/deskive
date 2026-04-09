#!/bin/bash
set -e

echo "🚀 Building Deskive for Google Play Store"
echo "=========================================="
echo ""

# Check if we're in the Flutter directory
if [ ! -f "pubspec.yaml" ]; then
    echo "❌ Error: Not in Flutter project directory"
    echo "Please run this script from the flutter directory"
    exit 1
fi

echo "📋 Pre-flight Checklist:"
echo ""

# Check Flutter
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter not found. Please install Flutter first."
    exit 1
fi
echo "✅ Flutter found: $(flutter --version | head -1)"

# Check if keystore exists
KEYSTORE_PATH="$HOME/deskive-release-key.jks"
if [ ! -f "$KEYSTORE_PATH" ]; then
    echo ""
    echo "🔐 Creating release keystore..."
    echo "You'll be asked several questions. Please answer them:"
    echo ""

    keytool -genkey -v -keystore "$KEYSTORE_PATH" -keyalg RSA -keysize 2048 -validity 10000 -alias deskive

    echo ""
    echo "✅ Keystore created at: $KEYSTORE_PATH"
    echo "⚠️  IMPORTANT: Save your keystore and passwords securely!"
    echo "   You'll need them for every app update."
    echo ""
else
    echo "✅ Keystore found at: $KEYSTORE_PATH"
fi

# Check if key.properties exists
if [ ! -f "android/key.properties" ]; then
    echo ""
    echo "⚠️  key.properties file not found!"
    echo "Creating template. You need to fill in your passwords."
    echo ""

    cat > android/key.properties << EOF
storePassword=YOUR_KEYSTORE_PASSWORD_HERE
keyPassword=YOUR_KEY_PASSWORD_HERE
keyAlias=deskive
storeFile=$KEYSTORE_PATH
EOF

    echo "📝 Created android/key.properties"
    echo "⚠️  Please edit android/key.properties and add your passwords!"
    echo ""
    read -p "Press Enter when you've added your passwords..."
fi

echo ""
echo "🔨 Building release version..."
echo ""

# Clean previous builds
flutter clean

# Get dependencies
flutter pub get

# Build release AAB (recommended for Play Store)
echo "Building Android App Bundle (AAB)..."
flutter build appbundle --release

# Also build APK for testing
echo "Building APK for testing..."
flutter build apk --release

echo ""
echo "=========================================="
echo "✅ BUILD SUCCESSFUL!"
echo "=========================================="
echo ""
echo "📦 Your files are ready:"
echo ""
echo "   For Play Store (upload this):"
echo "   📄 build/app/outputs/bundle/release/app-release.aab"
echo ""
echo "   For testing:"
echo "   📄 build/app/outputs/flutter-apk/app-release.apk"
echo ""
echo "📊 File sizes:"
ls -lh build/app/outputs/bundle/release/app-release.aab 2>/dev/null || echo "   AAB not found"
ls -lh build/app/outputs/flutter-apk/app-release.apk 2>/dev/null || echo "   APK not found"
echo ""
echo "🎯 Next steps:"
echo "1. Go to Play Console: https://play.google.com/console"
echo "2. Navigate to: Production → Create new release"
echo "3. Upload: build/app/outputs/bundle/release/app-release.aab"
echo "4. Follow the submission guide: ../GOOGLE_PLAY_SUBMISSION_GUIDE.md"
echo ""
