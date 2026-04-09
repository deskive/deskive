# App at Once Integration Setup

## Overview
This project integrates with App at Once SDK for real-time data synchronization and backend services.

## Setup Instructions

1. **API Key Configuration**
   - Copy `lib/config/app_config.dart.template` to `lib/config/app_config.dart`
   - Replace `YOUR_API_KEY_HERE` with your actual API key:
     ```dart
     static const String appAtOnceApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm9qZWN0SWQiOiJjbWRwbTY3bzAwMDAwczVkMjB6d2h6a3dzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsInBlcm1pc3Npb25zIjpbIioiXX0.k4cSDc1TLNCp5dgznZ1x1alOENN3uCYupFum_okD8FM';
     ```

2. **Security**
   - The `app_config.dart` file is ignored by git to prevent API keys from being committed
   - Never commit actual API keys to version control
   - Use environment variables in production

3. **Usage**
   The App at Once service is automatically initialized in `main.dart` and can be accessed throughout the app:
   
   ```dart
   import 'services/app_at_once_service.dart';
   
   // Use the service
   final service = AppAtOnceService.instance;
   await service.insertData('todos', {'title': 'My Todo', 'completed': false});
   ```

## Current Status
- ✅ Package added to pubspec.yaml
- ✅ API key configured securely
- ✅ Service class created
- ⏳ Waiting for correct SDK API documentation
- ⏳ Implementation pending proper API methods

## Next Steps
Once the correct App at Once SDK API is documented:
1. Update the service implementation with actual SDK calls
2. Replace placeholder methods with real functionality
3. Add proper error handling and logging
4. Implement real-time subscriptions

## Environment Variables (Optional)
For production deployment, consider using environment variables:

```bash
export APPATONCE_API_KEY=your_api_key_here
```

Then modify `app_config.dart` to read from environment:
```dart
static const String appAtOnceApiKey = String.fromEnvironment('APPATONCE_API_KEY', defaultValue: 'development_key');
```