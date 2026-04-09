# Workspace Management Implementation

This document describes the comprehensive workspace management system implemented in the Flutter app, which includes workspace creation, member management, and invitation system using AppAtOnce teams.

## Overview

The workspace management system provides:
- Multi-workspace support with easy switching
- Email-based member invitations using AppAtOnce teams
- Role-based permissions (Owner, Admin, Member, Viewer)
- Comprehensive member management
- Deep link invitation handling
- Subscription plan support

## Architecture

### Services

#### 1. WorkspaceApiService (`/lib/api/services/workspace_api_service.dart`)
- RESTful API integration with backend workspace endpoints
- Handles CRUD operations for workspaces and members
- Updated to match backend data structures with proper role enums

#### 2. WorkspaceInvitationApiService (`/lib/api/services/workspace_invitation_api_service.dart`)
- Handles AppAtOnce team invitation system
- Manages invitation acceptance, cancellation, and resending
- Supports workspace migration to AppAtOnce teams

#### 3. WorkspaceManagementService (`/lib/services/workspace_management_service.dart`)
- Central business logic service extending ChangeNotifier
- Coordinates API calls and manages application state
- Provides reactive updates to UI components
- Handles workspace switching and member management

### Models

#### Workspace Models (`/lib/models/workspace.dart`)
- **Workspace**: Complete workspace data model with membership info
- **WorkspaceMember**: Member information with roles and permissions
- **WorkspaceMembership**: User's membership details in a workspace
- **Enums**: SubscriptionPlan, WorkspaceRole with utility methods
- **Extensions**: Convenience methods for role comparison and display

### UI Screens

#### Core Workspace Management
1. **WorkspaceSelectorScreen** - View and switch between workspaces
2. **CreateWorkspaceScreen** - Create new workspaces with subscription plans

#### Member Management
3. **InviteMemberScreen** - Send email invitations with role selection
4. **MemberManagementScreen** - View, update roles, and remove members
5. **PendingInvitationsScreen** - Manage pending invitations

#### Invitation Handling
6. **AcceptInvitationScreen** - Handle invitation deep links

### Widgets

#### WorkspaceContextHeader (`/lib/widgets/workspace_context_header.dart`)
- Displays current workspace context
- Quick access to member management
- Workspace switching functionality
- Compact version for app bars

## Backend Integration

### API Endpoints

The implementation matches the backend API structure:

```
POST   /workspaces                           - Create workspace
GET    /workspaces                           - Get user's workspaces
GET    /workspaces/:id                       - Get workspace details
PATCH  /workspaces/:id                       - Update workspace
DELETE /workspaces/:id                       - Delete workspace (owner only)

POST   /workspaces/:id/members/invite        - Invite member
GET    /workspaces/:id/members               - Get workspace members
PATCH  /workspaces/:id/members/:memberId/role - Update member role
DELETE /workspaces/:id/members/:memberId     - Remove member

POST   /invitations/accept                   - Accept invitation
GET    /invitations/workspace/:workspaceId   - List pending invitations
DELETE /invitations/:id                      - Cancel invitation
POST   /invitations/:id/resend               - Resend invitation
```

### AppAtOnce Integration

The system uses AppAtOnce teams for invitation management:
- Workspaces map to AppAtOnce teams
- Invitations use AppAtOnce team invitation system
- Role mapping: Owner/Admin → admin, Member/Viewer → member
- Automatic email delivery and invitation tracking

## Role-Based Permissions

### Role Hierarchy (highest to lowest)
1. **Owner** - Full workspace control, billing, deletion
2. **Admin** - Member management, workspace settings
3. **Member** - Project participation, content creation
4. **Viewer** - Read-only access

### Permission Matrix

| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|---------|---------|
| Delete Workspace | ✅ | ❌ | ❌ | ❌ |
| Update Workspace | ✅ | ✅ | ❌ | ❌ |
| Invite Members | ✅ | ✅ | ❌ | ❌ |
| Remove Members | ✅ | ✅ | ❌ | ❌ |
| Update Member Roles | ✅ | ✅* | ❌ | ❌ |
| View Members | ✅ | ✅ | ✅ | ✅ |
| Create Projects | ✅ | ✅ | ✅ | ❌ |
| View Content | ✅ | ✅ | ✅ | ✅ |

*Admin can only manage roles lower than their own

## Usage

### 1. Initialize Workspace Management

Add to your app's main.dart:

```dart
import 'services/workspace_management_service.dart';

// In main() function
await WorkspaceManagementService.instance.initialize();

// In MultiProvider
ChangeNotifierProvider<WorkspaceManagementService>.value(
  value: WorkspaceManagementService.instance,
),
```

### 2. Display Workspace Context

Use in any screen:

```dart
import 'widgets/workspace_context_header.dart';

// Full workspace header
WorkspaceContextHeader()

// Compact version for app bars
CompactWorkspaceContextHeader()
```

### 3. Navigation to Workspace Features

```dart
import 'screens/workspace/workspace_screens.dart';

// Navigate to workspace selector
Navigator.push(context, MaterialPageRoute(
  builder: (context) => WorkspaceSelectorScreen(),
));

// Navigate to member management
Navigator.push(context, MaterialPageRoute(
  builder: (context) => MemberManagementScreen(),
));
```

### 4. Handle Invitation Deep Links

```dart
import 'screens/workspace/accept_invitation_screen.dart';

// Handle deep link
if (InvitationDeepLinkService.isInvitationLink(url)) {
  InvitationDeepLinkService.handleDeepLink(context, url);
}
```

### 5. Access Workspace State

```dart
Consumer<WorkspaceManagementService>(
  builder: (context, service, child) {
    final currentWorkspace = service.currentWorkspace;
    final canManageMembers = service.canManageMembers;
    final members = service.currentWorkspaceMembers;
    
    return YourWidget();
  },
)
```

## Subscription Plans

### Available Plans
- **Free**: 5 members, 1GB storage
- **Pro**: 50 members, 100GB storage, advanced features
- **Enterprise**: 1000 members, 1TB storage, custom integrations, SSO

### Plan Features
```dart
// Check if workspace supports a feature
if (workspace.subscriptionPlan.supportsFeature('sso')) {
  // Show SSO options
}

// Check member limit
if (workspace.isAtMemberLimit) {
  // Show upgrade prompt
}
```

## Deep Link Support

### URL Formats
```
https://yourapp.com/invite/TOKEN
https://yourapp.com/invite?token=TOKEN
```

### Implementation
The system automatically handles invitation deep links and guides users through the acceptance process.

## Error Handling

The system provides comprehensive error handling:
- Network connectivity issues
- Invalid invitation tokens
- Expired invitations
- Permission errors
- Server validation errors

## State Management

### Reactive Updates
- All UI components automatically update when workspace state changes
- Real-time member list updates
- Invitation status synchronization

### Persistence
- Current workspace selection persists across app restarts
- Automatic workspace loading on app startup

## Security Considerations

1. **Token-based authentication** for all API calls
2. **Role validation** on both client and server
3. **Invitation token security** with expiration
4. **Permission checks** before sensitive operations

## Testing

### Unit Tests
- Service layer business logic
- Model serialization/deserialization
- Permission checking utilities

### Integration Tests
- API endpoint integration
- Workspace switching flows
- Invitation acceptance flows

### Widget Tests
- Screen rendering with different states
- User interaction handling
- Error state displays

## Future Enhancements

1. **Real-time collaboration** using WebSockets
2. **Advanced analytics** for workspace usage
3. **Custom role definitions** with granular permissions
4. **Workspace templates** for quick setup
5. **Bulk member import** via CSV
6. **Advanced search** and filtering
7. **Workspace archiving** instead of deletion
8. **Activity feeds** for workspace events

## Troubleshooting

### Common Issues

1. **Workspace not loading**
   - Check network connectivity
   - Verify authentication token
   - Refresh workspace list

2. **Invitation acceptance fails**
   - Verify token validity
   - Check user authentication status
   - Ensure workspace still exists

3. **Permission denied errors**
   - Verify user role in workspace
   - Check if workspace is active
   - Refresh user permissions

### Debug Information

Enable debug logging in WorkspaceManagementService to see detailed operation logs.

## Migration Guide

For existing apps adding workspace management:

1. Update main.dart with workspace service initialization
2. Add workspace context headers to relevant screens  
3. Update navigation to include workspace selection
4. Migrate existing single-workspace data if needed
5. Test invitation flows thoroughly

## Dependencies

The workspace management system requires:
- `provider` for state management
- `shared_preferences` for persistence
- `dio` for HTTP requests
- AppAtOnce SDK for team management

## Conclusion

This comprehensive workspace management system provides a solid foundation for multi-tenant applications with sophisticated member management and invitation capabilities. The implementation leverages AppAtOnce teams for reliable invitation delivery and management while providing a Flutter-native user experience.