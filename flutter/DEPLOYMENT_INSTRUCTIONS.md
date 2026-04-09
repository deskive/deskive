# Flutter-Backend Integration Deployment Instructions

## Overview

This document provides comprehensive instructions for setting up, testing, and deploying the Workspace Suite application with its Flutter frontend and NestJS backend integration.

## Prerequisites

### System Requirements
- **Operating System**: Linux, macOS, or Windows
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: At least 5GB free space
- **Network**: Stable internet connection for downloading dependencies

### Required Software
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher  
- **Flutter SDK**: v3.7.2 or higher
- **Git**: For version control
- **Android Studio**: For Android development
- **Xcode**: For iOS development (macOS only)

## Phase 1: Environment Setup

### 1.1 Install Flutter SDK

#### Linux/macOS:
```bash
# Option 1: Using Snap (Linux)
sudo snap install flutter --classic

# Option 2: Manual Installation
cd ~/
wget https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.16.5-stable.tar.xz
tar xf flutter_linux_3.16.5-stable.tar.xz
export PATH="$PATH:$HOME/flutter/bin"
echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.bashrc
source ~/.bashrc
```

#### Windows:
```powershell
# Download Flutter SDK from https://flutter.dev/docs/get-started/install/windows
# Extract to C:\flutter
# Add C:\flutter\bin to PATH environment variable
```

### 1.2 Verify Flutter Installation
```bash
flutter doctor

# Expected output should show:
# [✓] Flutter (Channel stable, version 3.x.x)
# [✓] Android toolchain - develop for Android devices
# [✓] Chrome - develop for the web
# [✓] Android Studio (version 202x.x)
```

### 1.3 Install Android Development Tools

#### Android Studio:
1. Download from https://developer.android.com/studio
2. Install Android SDK and Android SDK Command-line Tools
3. Accept Android licenses:
```bash
flutter doctor --android-licenses
```

#### Configure Android Emulator:
```bash
# Open Android Studio
# Tools > AVD Manager
# Create Virtual Device
# Choose device and system image
# Start emulator
```

### 1.4 Install iOS Development Tools (macOS only)

```bash
# Install Xcode from Mac App Store
# Install iOS Simulator
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch

# Install CocoaPods
sudo gem install cocoapods
pod setup
```

## Phase 2: Project Setup

### 2.1 Clone and Setup Backend

```bash
# Navigate to backend directory
cd /home/nymul/DEVELOP/deskive/backend

# Verify environment file exists
ls -la ..env  # Should exist

# Install dependencies (if not already done)
npm install

# Start backend development server
npm run start:dev

# Verify backend is running
curl http://localhost:3002/api/v1/auth/me
# Should return 401 Unauthorized (expected without token)
```

### 2.2 Setup Flutter Frontend

```bash
# Navigate to Flutter directory
cd /home/nymul/DEVELOP/deskive/flutter

# Install Flutter dependencies
flutter pub get

# Verify dependencies installation
flutter pub deps
```

### 2.3 Firebase Configuration (Required)

#### Create Firebase Project:
1. Go to https://console.firebase.google.com/
2. Create new project or select existing
3. Enable Authentication, Cloud Messaging, and Firestore

#### Download Configuration Files:

**For Android:**
1. Add Android app to Firebase project
2. Package name: `com.example.workspace_suite_flutter` (check `android/app/build.gradle`)
3. Download `google-services.json`
4. Place in `android/app/` directory

**For iOS:**
1. Add iOS app to Firebase project
2. Bundle ID: check `ios/Runner.xcodeproj/project.pbxproj`
3. Download `GoogleService-Info.plist`
4. Place in `ios/Runner/` directory

**For Web:**
1. Add Web app to Firebase project
2. Copy configuration to `web/index.html`

### 2.4 Environment Configuration

#### Backend Environment Variables:
```bash
# File: /home/nymul/DEVELOP/deskive/backend/..env
APPATONCE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
APPATONCE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3002
NODE_ENV=development
JWT_SECRET=lifeos@12024
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
API_PREFIX=api/v1
```

#### Flutter Configuration:
```dart
// File: lib/config/app_config.dart
// Verify these keys are present:
static const String appAtOnceApiKey = 'eyJhbGciOiJIUzI1NiI...';
static const String appAtOnceAnonKey = 'eyJhbGciOiJIUzI1NiI...';
```

## Phase 3: Build and Test

### 3.1 Build Flutter Application

#### For Android:
```bash
cd /home/nymul/DEVELOP/deskive/flutter

# Debug build
flutter build apk --debug

# Release build
flutter build apk --release

# Install on connected device/emulator
flutter install
```

#### For iOS:
```bash
# Debug build
flutter build ios --debug

# Release build  
flutter build ios --release

# Open in Xcode for signing and deployment
open ios/Runner.xcworkspace
```

#### For Web:
```bash
# Build for web
flutter build web

# Serve locally
cd build/web
python -m http.server 8000
# Or use any web server
```

### 3.2 Run Integration Tests

```bash
# Navigate to Flutter directory
cd /home/nymul/DEVELOP/deskive/flutter

# Make test script executable
chmod +x test_api_integration.sh

# Run backend API tests
./test_api_integration.sh

# Run Flutter tests
flutter test

# Run integration tests (requires running app)
flutter test integration_test/
```

### 3.3 Manual Testing Checklist

#### Backend Testing:
- [ ] Server starts without errors
- [ ] All API endpoints return proper responses
- [ ] WebSocket connections work
- [ ] Database operations succeed
- [ ] File upload/download works

#### Frontend Testing:
- [ ] App builds without errors
- [ ] App starts and loads main screen
- [ ] User registration/login works
- [ ] Navigation between screens works
- [ ] Real-time chat functionality
- [ ] File management features
- [ ] Calendar and notes features
- [ ] Video calling (if configured)

## Phase 4: Development Workflow

### 4.1 Start Development Environment

#### Terminal 1 - Backend:
```bash
cd /home/nymul/DEVELOP/deskive/backend
npm run start:dev
# Backend will run on http://localhost:3002
```

#### Terminal 2 - Flutter:
```bash
cd /home/nymul/DEVELOP/deskive/flutter

# For mobile development
flutter run

# For web development
flutter run -d chrome

# For specific device
flutter run -d <device-id>
```

### 4.2 Hot Reload Development

- **Flutter**: Save files to trigger hot reload
- **Backend**: NestJS watch mode will restart on changes
- **Database**: Changes persist through AppAtOnce backend

### 4.3 Debugging

#### Flutter Debugging:
```bash
# Run with debug mode
flutter run --debug

# Enable debugging in IDE
# VS Code: Dart/Flutter extensions
# Android Studio: Flutter plugin
```

#### Backend Debugging:
```bash
# Run with debug mode
npm run start:debug

# Attach debugger on port 9229
# VS Code: Node.js debugging configuration
```

## Phase 5: Production Deployment

### 5.1 Backend Deployment

#### Environment Preparation:
```bash
# Production environment variables
NODE_ENV=production
PORT=3002
APPATONCE_API_KEY=<production-key>
JWT_SECRET=<secure-production-secret>
CORS_ORIGIN=<production-frontend-domain>
```

#### Docker Deployment:
```dockerfile
# Dockerfile already exists in backend directory
cd /home/nymul/DEVELOP/deskive/backend

# Build Docker image
docker build -t workspace-suite-backend .

# Run container
docker run -p 3002:3002 \
  -e APPATONCE_API_KEY=<key> \
  -e JWT_SECRET=<secret> \
  workspace-suite-backend
```

#### Cloud Deployment Options:
- **AppAtOnce Deploy**: Use built-in deployment features
- **Heroku**: `heroku create` and push
- **Google Cloud Run**: Deploy containerized app
- **AWS ECS/EC2**: Container or instance deployment
- **DigitalOcean App Platform**: Simplified deployment

### 5.2 Flutter Production Build

#### Android Production:
```bash
cd /home/nymul/DEVELOP/deskive/flutter

# Generate keystore (first time)
keytool -genkey -v -keystore ~/android-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias android-keystore

# Configure android/key.properties
storePassword=<password>
keyPassword=<password>
keyAlias=android-keystore
storeFile=<path-to-keystore>

# Build signed APK
flutter build apk --release

# Build App Bundle (for Play Store)
flutter build appbundle --release
```

#### iOS Production:
```bash
# Build for App Store
flutter build ios --release

# Open in Xcode for signing and submission
open ios/Runner.xcworkspace

# Archive and submit through Xcode
# Or use command line tools
# flutter build ipa --release
```

#### Web Production:
```bash
# Build optimized web version
flutter build web --release

# Deploy to web server
cp -r build/web/* /var/www/html/

# Or deploy to CDN/hosting service
```

### 5.3 Database and Storage

#### AppAtOnce Configuration:
- Production API keys configured
- Database tables created and migrated
- Storage buckets configured with proper permissions
- Real-time subscriptions configured

#### Backup Strategy:
```bash
# AppAtOnce provides automated backups
# Configure backup retention policies
# Test backup restoration procedures
```

## Phase 6: Monitoring and Maintenance

### 6.1 Application Monitoring

#### Backend Monitoring:
- **Health Checks**: Implement `/health` endpoint
- **Logging**: Use structured logging (Winston/Pino)
- **Error Tracking**: Sentry, Bugsnag, or similar
- **Performance**: APM tools (New Relic, DataDog)
- **Uptime**: Pingdom, StatusPage

#### Frontend Monitoring:
- **Crash Reporting**: Firebase Crashlytics
- **Analytics**: Firebase Analytics, Mixpanel
- **Performance**: Firebase Performance Monitoring
- **User Feedback**: In-app feedback systems

### 6.2 Maintenance Procedures

#### Regular Updates:
```bash
# Update Flutter SDK
flutter upgrade

# Update Flutter dependencies
flutter pub upgrade

# Update backend dependencies
npm update

# Security updates
npm audit fix
```

#### Performance Monitoring:
- Monitor API response times
- Track app startup times
- Monitor memory usage
- Track user engagement metrics

## Phase 7: Troubleshooting

### 7.1 Common Issues

#### Flutter Build Issues:
```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter build apk

# Clear caches
flutter pub cache clean
rm -rf ~/.pub-cache
```

#### Backend Connection Issues:
```bash
# Check backend status
curl http://localhost:3002/api/v1/auth/me

# Verify CORS settings
# Check firewall/network settings
# Verify AppAtOnce connectivity
```

#### Firebase Issues:
```bash
# Verify configuration files are in correct locations
ls -la android/app/google-services.json
ls -la ios/Runner/GoogleService-Info.plist

# Check Firebase console for proper setup
# Verify API keys and project configuration
```

### 7.2 Performance Optimization

#### Flutter Optimization:
```bash
# Profile app performance
flutter run --profile

# Analyze bundle size
flutter build apk --analyze-size

# Optimize images and assets
flutter pub run flutter_launcher_icons:main
```

#### Backend Optimization:
```bash
# Profile API performance
# Implement caching strategies
# Optimize database queries
# Use connection pooling
```

## Phase 8: Security Checklist

### 8.1 Security Measures

#### API Security:
- [ ] JWT tokens with proper expiration
- [ ] Input validation and sanitization
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] HTTPS in production
- [ ] API key rotation strategy

#### Mobile App Security:
- [ ] Certificate pinning
- [ ] Secure storage for sensitive data
- [ ] Biometric authentication (if applicable)
- [ ] Code obfuscation in release builds
- [ ] App signing with production certificates

#### Data Security:
- [ ] Database access controls
- [ ] Encrypted data in transit and at rest
- [ ] Regular security audits
- [ ] Compliance with data protection regulations

## Deployment Checklist

### Pre-deployment:
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Monitoring configured

### Deployment:
- [ ] Backend deployed and verified
- [ ] Database migrations completed
- [ ] Frontend deployed to app stores/web
- [ ] DNS/CDN configured
- [ ] SSL certificates installed
- [ ] Monitoring dashboards active

### Post-deployment:
- [ ] Smoke tests executed
- [ ] User acceptance testing
- [ ] Performance monitoring active
- [ ] Error tracking configured
- [ ] Backup systems verified
- [ ] Team notified of deployment

## Support and Resources

### Documentation:
- **Flutter**: https://flutter.dev/docs
- **NestJS**: https://nestjs.com/
- **AppAtOnce**: AppAtOnce documentation portal
- **Firebase**: https://firebase.google.com/docs

### Community:
- Flutter Community: https://flutter.dev/community
- NestJS Discord: https://discord.gg/nestjs
- Stack Overflow: Tag questions appropriately

### Emergency Contacts:
- Development team lead
- DevOps/Infrastructure team
- AppAtOnce support
- Hosting provider support

---

**Document Version**: 1.0  
**Last Updated**: September 4, 2025  
**Maintained by**: Development Team  
**Review Schedule**: Monthly