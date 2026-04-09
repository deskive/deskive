import 'package:flutter/material.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/main_screen.dart';
import '../screens/workspace/create_workspace_screen.dart';
import '../services/workspace_management_service.dart';
import '../utils/theme_notifier.dart';
import '../main.dart' show handlePendingCallAction;

/// Widget that wraps the app and handles authentication state
class AuthWrapper extends StatefulWidget {
  final ThemeNotifier themeNotifier;

  const AuthWrapper({
    super.key,
    required this.themeNotifier,
  });

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  final AuthProvider _authProvider = AuthProvider.instance;
  final WorkspaceManagementService _workspaceService = WorkspaceManagementService.instance;

  @override
  void initState() {
    super.initState();
    // ⭐ Pending call check moved to MainScreen.initState() for immediate handling
    // No need to check here anymore
  }

  @override
  Widget build(BuildContext context) {
    // Listen to BOTH auth and workspace changes
    return AnimatedBuilder(
      animation: Listenable.merge([_authProvider, _workspaceService]),
      builder: (context, child) {
        if (_authProvider.isAuthenticated) {
          final workspaceCount = _workspaceService.workspaces.length;
          final hasWorkspaces = _workspaceService.hasWorkspaces;
          final isLoadingWorkspaces = _workspaceService.isLoading;


          // Show loading indicator while workspaces are being fetched
          if (isLoadingWorkspaces) {
            return const Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            );
          }

          // CRITICAL: Only show MainScreen if user has at least one workspace
          if (workspaceCount == 0 || !hasWorkspaces) {
            return const CreateWorkspaceScreen();
          }

          // User has workspaces - show main screen
          return MainScreen(themeNotifier: widget.themeNotifier);
        } else {
          return LoginScreen(themeNotifier: widget.themeNotifier);
        }
      },
    );
  }
}