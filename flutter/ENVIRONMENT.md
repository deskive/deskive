# Environment Configuration for Deskive Flutter

This document explains how to configure and manage environments in the Deskive Flutter application, making it consistent with the React frontend environment handling.

## Overview

The Flutter app now uses environment variables to manage configuration across different environments (development, staging, production), similar to how the React frontend handles environment configuration.

## Environment Files

### Available Environment Files

- `.env` - Default environment file (currently points to development)
- `.env.development` - Development environment configuration
- `.env.production` - Production environment configuration 
- `.env.example` - Template with all available environment variables

### Environment Variables

| Variable | Description | Development | Production |
|----------|-------------|-------------|------------|
| `FLUTTER_ENV` | Current environment | `development` | `production` |
| `APP_NAME` | Application name | `Deskive` | `Deskive` |
| `APP_VERSION` | Application version | `1.0.0` | `1.0.0` |
| `API_BASE_URL` | Backend API URL | `http://localhost:3002/api/v1` | `https://api.deskive.com/api/v1` |
| `WEBSOCKET_URL` | WebSocket server URL | `http://localhost:3002` | `https://ws.deskive.com` |
| `API_TIMEOUT` | API timeout (ms) | `30000` | `30000` |
| `API_RETRY_ATTEMPTS` | API retry attempts | `3` | `3` |
| `APPATONCE_API_KEY` | App at Once service key | Development key | Production key |
| `APPATONCE_ANON_KEY` | App at Once anon key | Development key | Production key |
| `DEBUG_MODE` | Enable debug mode | `true` | `false` |
| `ENABLE_LOGGING` | Enable logging | `true` | `false` |
| `LOG_LEVEL` | Logging level | `debug` | `error` |
| `IS_PRODUCTION` | Production flag | `false` | `true` |
| `DEFAULT_WORKSPACE_ID` | Default workspace (dev only) | Set | Empty |
| `DEFAULT_USER_ID` | Default user (dev only) | Set | Empty |

## Setup Instructions

### 1. Initial Setup

1. Copy the example environment file:
   ```bash
   cp ..env.example ..env
   ```

2. Edit `.env` with your specific configuration values.

### 2. Environment Switching

You can switch between environments using the provided script:

```bash
# Switch to development
./scripts/switch-.env.sh development

# Switch to production  
./scripts/switch-.env.sh production

# Check current environment
./scripts/switch-.env.sh current
```

Or manually copy the desired environment file:

```bash
# For development
cp ...env.development ..env

# For production
cp ...env.production ..env
```

### 3. Flutter Configuration

The app automatically loads the appropriate environment configuration based on:

1. The `.env` file in the project root
2. Flutter's release mode (`kReleaseMode`)
3. Explicit environment parameter passed to `EnvConfig.initialize()`

## Usage in Code

### Accessing Environment Variables

```dart
import 'package:your_app/config/env_config.dart';

// API Configuration
String apiUrl = EnvConfig.apiBaseUrl;
String wsUrl = EnvConfig.websocketUrl;
int timeout = EnvConfig.apiTimeout;

// App Configuration  
String appName = EnvConfig.appName;
String version = EnvConfig.appVersion;
bool isProduction = EnvConfig.isProduction;

// Feature Flags
bool debugMode = EnvConfig.isDebugMode;
bool loggingEnabled = EnvConfig.isLoggingEnabled;
String logLevel = EnvConfig.logLevel;

// App at Once Keys
String apiKey = EnvConfig.appAtOnceApiKey;
String anonKey = EnvConfig.appAtOnceAnonKey;
```

### Environment-Specific Logic

```dart
if (EnvConfig.isDevelopment) {
  // Development-specific code
  print('Running in development mode');
}

if (EnvConfig.isProduction) {
  // Production-specific code
  // Disable debugging, enable analytics, etc.
}

// Check specific environment
if (EnvConfig.isDev) {
  // Same as isDevelopment
}

if (EnvConfig.isProd) {
  // Same as isProduction
}
```

### Initialization

The environment configuration is automatically initialized in `main.dart`:

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize environment configuration
  await EnvConfig.initialize();
  
  // Rest of app initialization...
}
```

## Build Configuration

### Development Build

```bash
# Regular debug build (uses ...env.development by default)
flutter run

# Force development environment
flutter run --dart-define=FLUTTER_ENV=development
```

### Production Build

```bash
# Make sure ..env points to production
./scripts/switch-.env.sh production

# Build for production
flutter build apk --release
flutter build ios --release
```

## Best Practices

### 1. Environment File Management

- **Never commit sensitive keys** to version control
- Keep `.env.example` updated with all required variables
- Use different API keys for different environments
- Set production default values to empty for security

### 2. Code Practices

- Always use `EnvConfig` class instead of hardcoding values
- Check environment flags for conditional logic
- Use appropriate log levels for different environments
- Validate required environment variables at startup

### 3. Deployment

- Set up CI/CD to automatically switch environments
- Validate environment configuration before deployment
- Use secure methods to inject production secrets
- Monitor environment-specific behavior in production

## Troubleshooting

### Common Issues

1. **Environment not loading**
   - Check that `.env` file exists in project root
   - Verify file is added to `pubspec.yaml` assets
   - Ensure `EnvConfig.initialize()` is called before use

2. **Wrong environment active**
   - Run `./scripts/switch-env.sh current` to check
   - Use switch script to change environments
   - Restart Flutter app after environment changes

3. **Missing environment variables**
   - Check `.env.example` for required variables
   - Verify variable names match exactly (case-sensitive)
   - Ensure no extra spaces around `=` in `.env` files

### Debugging

```dart
// Print all environment variables (development only)
if (EnvConfig.isDebugMode) {
  print('Environment Config: ${EnvConfig.getEnvironmentConfig()}');
  print('All Env Vars: ${EnvConfig.allEnvVars}');
}
```

## Comparison with React Frontend

The Flutter environment system now mirrors the React frontend:

| Feature | React Frontend | Flutter |
|---------|----------------|---------|
| Environment files | `.env`, `.env.development`, `.env.production` | ✅ Same |
| Environment switching | Manual copy or build scripts | ✅ Script provided |
| Variable access | `import.meta.env.VITE_*` | `EnvConfig.*` |
| Build-time loading | ✅ Vite loads at build time | ✅ `flutter_dotenv` loads at runtime |
| Environment detection | `import.meta.env.PROD` | `EnvConfig.isProduction` |
| Development flags | `import.meta.env.DEV` | `EnvConfig.isDevelopment` |

## Migration from Hardcoded Values

If you're migrating from hardcoded configuration:

1. **Identify hardcoded values** in your codebase
2. **Add corresponding variables** to environment files
3. **Update code** to use `EnvConfig` instead of constants
4. **Test in both environments** to ensure consistency
5. **Remove old hardcoded constants**

The migration has been completed for:
- ✅ `BaseApiClient` - API URLs and timeouts
- ✅ `AppConfig` - App configuration and API keys
- ✅ `main.dart` - App initialization and title