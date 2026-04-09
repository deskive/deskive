import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/workspace_management_service.dart';
import '../models/workspace.dart';
import '../screens/workspace/workspace_selector_screen.dart';
import '../screens/workspace/member_management_screen.dart';

/// Widget that displays current workspace context with switching capability
class WorkspaceContextHeader extends StatelessWidget {
  final bool showTitle;
  final bool showMembers;
  
  const WorkspaceContextHeader({
    super.key,
    this.showTitle = true,
    this.showMembers = true,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<WorkspaceManagementService>(
      builder: (context, service, child) {
        final currentWorkspace = service.currentWorkspace;
        
        if (currentWorkspace == null) {
          return _buildNoWorkspaceState(context, service);
        }
        
        return _buildWorkspaceHeader(context, currentWorkspace, service);
      },
    );
  }

  Widget _buildNoWorkspaceState(BuildContext context, WorkspaceManagementService service) {
    // Check if user has any workspaces at all
    final hasWorkspaces = service.workspaces.isNotEmpty;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
        ),
      ),
      child: Column(
        children: [
          Icon(
            hasWorkspaces ? Icons.business_center_outlined : Icons.add_business_outlined,
            size: 48,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 12),
          Text(
            hasWorkspaces ? 'No Workspace Selected' : 'No Workspace Found',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            hasWorkspaces
                ? 'Select a workspace to get started'
                : 'Create your first workspace to get started',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () => _navigateToWorkspaceSelector(context),
            icon: Icon(hasWorkspaces ? Icons.folder_open : Icons.add),
            label: Text(hasWorkspaces ? 'Select Workspace' : 'Create Workspace'),
          ),
        ],
      ),
    );
  }

  Widget _buildWorkspaceHeader(
    BuildContext context,
    Workspace currentWorkspace,
    WorkspaceManagementService service,
  ) {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).colorScheme.shadow.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _navigateToWorkspaceSelector(context),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // Workspace avatar/logo
                    _buildWorkspaceAvatar(context, currentWorkspace),
                    const SizedBox(width: 12),
                    
                    // Workspace info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (showTitle) ...[
                            Text(
                              'Current Workspace',
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: Theme.of(context).colorScheme.onPrimaryContainer.withOpacity(0.8),
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                          ],
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  currentWorkspace.name,
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (currentWorkspace.isPremium)
                                Container(
                                  margin: const EdgeInsets.only(left: 8),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.amber.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    'PRO',
                                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                      color: Colors.amber.shade700,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          if (currentWorkspace.membership != null)
                            Text(
                              'Your role: ${currentWorkspace.membership!.role.displayName}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Theme.of(context).colorScheme.onPrimaryContainer.withOpacity(0.8),
                              ),
                            ),
                        ],
                      ),
                    ),
                    
                    // Actions
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (showMembers && service.canManageMembers)
                          IconButton(
                            icon: const Icon(Icons.people),
                            onPressed: () => _navigateToMemberManagement(context),
                            tooltip: 'Manage Members',
                            color: Theme.of(context).colorScheme.onPrimaryContainer,
                          ),
                        Icon(
                          Icons.swap_horiz,
                          color: Theme.of(context).colorScheme.onPrimaryContainer.withOpacity(0.6),
                        ),
                        const SizedBox(width: 4),
                      ],
                    ),
                  ],
                ),
                
                // Quick stats
                if (showMembers) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _buildStatChip(
                        context,
                        Icons.people,
                        '${service.currentWorkspaceMembers.length} members',
                      ),
                      const SizedBox(width: 8),
                      if (service.canManageMembers && service.pendingInvitations.isNotEmpty)
                        _buildStatChip(
                          context,
                          Icons.pending_actions,
                          '${service.pendingInvitations.length} pending',
                          color: Colors.orange,
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWorkspaceAvatar(BuildContext context, Workspace workspace) {
    if (workspace.logo != null && workspace.logo!.startsWith('http')) {
      return CircleAvatar(
        radius: 20,
        backgroundImage: NetworkImage(workspace.logo!),
        backgroundColor: Theme.of(context).colorScheme.primary,
      );
    }

    return CircleAvatar(
      radius: 20,
      backgroundColor: Theme.of(context).colorScheme.primary,
      child: Text(
        workspace.avatarText,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: Theme.of(context).colorScheme.onPrimary,
        ),
      ),
    );
  }

  Widget _buildStatChip(
    BuildContext context,
    IconData icon,
    String label, {
    Color? color,
  }) {
    final chipColor = color ?? Theme.of(context).colorScheme.onPrimaryContainer.withOpacity(0.1);
    final textColor = color ?? Theme.of(context).colorScheme.onPrimaryContainer;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: chipColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 14,
            color: textColor,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }

  void _navigateToWorkspaceSelector(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const WorkspaceSelectorScreen(),
      ),
    );
  }

  void _navigateToMemberManagement(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const MemberManagementScreen(),
      ),
    );
  }
}

/// Compact version of workspace context for app bars
class CompactWorkspaceContextHeader extends StatelessWidget {
  const CompactWorkspaceContextHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<WorkspaceManagementService>(
      builder: (context, service, child) {
        final currentWorkspace = service.currentWorkspace;
        
        if (currentWorkspace == null) {
          return TextButton.icon(
            onPressed: () => _navigateToWorkspaceSelector(context),
            icon: const Icon(Icons.business_center_outlined),
            label: const Text('Select Workspace'),
          );
        }
        
        return InkWell(
          onTap: () => _navigateToWorkspaceSelector(context),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  child: currentWorkspace.logo != null && currentWorkspace.logo!.startsWith('http')
                      ? ClipOval(child: Image.network(currentWorkspace.logo!, width: 32, height: 32, fit: BoxFit.cover))
                      : Text(
                          currentWorkspace.avatarText,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onPrimary,
                          ),
                        ),
                ),
                const SizedBox(width: 8),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 120),
                  child: Text(
                    currentWorkspace.name,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.expand_more, size: 16),
              ],
            ),
          ),
        );
      },
    );
  }

  void _navigateToWorkspaceSelector(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const WorkspaceSelectorScreen(),
      ),
    );
  }
}