import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/workspace_management_service.dart';

/// Screen for accepting workspace invitations via deep links
class AcceptInvitationScreen extends StatefulWidget {
  final String invitationToken;
  
  const AcceptInvitationScreen({
    super.key,
    required this.invitationToken,
  });

  @override
  State<AcceptInvitationScreen> createState() => _AcceptInvitationScreenState();
}

class _AcceptInvitationScreenState extends State<AcceptInvitationScreen> {
  late WorkspaceManagementService _workspaceService;
  bool _isLoading = true;
  bool _hasAccepted = false;
  String? _error;
  String? _workspaceName;

  @override
  void initState() {
    super.initState();
    _workspaceService = WorkspaceManagementService.instance;
    _handleInvitation();
  }

  Future<void> _handleInvitation() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Attempt to accept the invitation
      final success = await _workspaceService.acceptInvitation(widget.invitationToken);
      
      setState(() {
        _hasAccepted = success;
        if (!success) {
          _error = _workspaceService.error ?? 'Failed to accept invitation';
        } else {
          _workspaceName = _workspaceService.currentWorkspace?.name;
        }
        _isLoading = false;
      });

      if (success) {
        // Navigate to main app after a brief delay
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) {
          Navigator.of(context).popUntil((route) => route.isFirst);
        }
      }
    } catch (e) {
      setState(() {
        _error = 'Unexpected error: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Join Workspace'),
        centerTitle: true,
      ),
      body: Consumer<WorkspaceManagementService>(
        builder: (context, service, child) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_isLoading)
                    _buildLoadingState()
                  else if (_hasAccepted)
                    _buildSuccessState()
                  else
                    _buildErrorState(),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLoadingState() {
    return Column(
      children: [
        const SizedBox(
          width: 64,
          height: 64,
          child: CircularProgressIndicator(strokeWidth: 3),
        ),
        const SizedBox(height: 24),
        Text(
          'Processing Invitation...',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Please wait while we add you to the workspace.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildSuccessState() {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: Colors.green.withOpacity(0.2),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.check_circle,
            size: 48,
            color: Colors.green,
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Welcome to the Team!',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: Colors.green,
          ),
        ),
        const SizedBox(height: 8),
        if (_workspaceName != null)
          Text(
            'You have successfully joined $_workspaceName',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        const SizedBox(height: 8),
        Text(
          'You will be redirected to the app shortly.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 32),
        ElevatedButton.icon(
          onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
          icon: const Icon(Icons.home),
          label: const Text('Go to App'),
        ),
      ],
    );
  }

  Widget _buildErrorState() {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: Colors.red.withOpacity(0.2),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.error,
            size: 48,
            color: Colors.red,
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Invitation Error',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: Colors.red,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          _error ?? 'Unable to accept invitation',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 32),
        Column(
          children: [
            ElevatedButton.icon(
              onPressed: _handleInvitation,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            ),
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
              icon: const Icon(Icons.home),
              label: const Text('Go to App'),
            ),
          ],
        ),
      ],
    );
  }
}

/// Service for handling deep link navigation
class InvitationDeepLinkService {
  static const String invitationPath = '/invite/';
  
  /// Parse invitation token from deep link URL
  static String? parseInvitationToken(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return null;
    
    // Handle different URL formats
    if (uri.path.startsWith(invitationPath)) {
      final token = uri.path.substring(invitationPath.length);
      return token.isNotEmpty ? token : null;
    }
    
    // Handle query parameter format
    return uri.queryParameters['token'];
  }
  
  /// Check if URL is an invitation deep link
  static bool isInvitationLink(String url) {
    return parseInvitationToken(url) != null;
  }
  
  /// Handle deep link navigation
  static void handleDeepLink(BuildContext context, String url) {
    final token = parseInvitationToken(url);
    
    if (token != null) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => AcceptInvitationScreen(invitationToken: token),
        ),
      );
    }
  }
}