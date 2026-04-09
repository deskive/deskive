import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../services/workspace_management_service.dart';
import '../../models/workspace.dart';
import 'create_workspace_screen.dart';

/// Screen for selecting and switching between workspaces
class WorkspaceSelectorScreen extends StatefulWidget {
  const WorkspaceSelectorScreen({super.key});

  @override
  State<WorkspaceSelectorScreen> createState() => _WorkspaceSelectorScreenState();
}

class _WorkspaceSelectorScreenState extends State<WorkspaceSelectorScreen> {
  late WorkspaceManagementService _workspaceService;

  @override
  void initState() {
    super.initState();
    _workspaceService = WorkspaceManagementService.instance;
    _loadWorkspaces();
  }

  Future<void> _loadWorkspaces() async {
    await _workspaceService.refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('workspace.select_workspace'.tr()),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadWorkspaces,
            tooltip: 'common.refresh'.tr(),
          ),
        ],
      ),
      body: Consumer<WorkspaceManagementService>(
        builder: (context, service, child) {
          if (service.isLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (service.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Theme.of(context).colorScheme.error,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'workspace.error_loading_workspaces'.tr(),
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Text(
                      service.error!,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _loadWorkspaces,
                    child: Text('common.retry'.tr()),
                  ),
                ],
              ),
            );
          }

          if (!service.hasWorkspaces) {
            return _buildEmptyState();
          }

          return RefreshIndicator(
            onRefresh: _loadWorkspaces,
            child: Column(
              children: [
                // Current workspace header
                if (service.currentWorkspace != null)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'workspace.current_workspace'.tr(),
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onPrimaryContainer,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _buildWorkspaceAvatar(service.currentWorkspace!, isSelected: true),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    service.currentWorkspace!.name,
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  if (service.currentWorkspace!.membership != null)
                                    Text(
                                      service.currentWorkspace!.membership!.role.displayName,
                                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Icon(
                              Icons.check_circle,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                // Workspaces list
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      Text(
                        'workspace.all_workspaces'.tr(),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ...service.workspaces.map((workspace) => 
                        _buildWorkspaceCard(workspace, service.currentWorkspace)),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _navigateToCreateWorkspace,
        icon: const Icon(Icons.add),
        label: Text('workspace.create_workspace'.tr()),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.business,
              size: 64,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 24),
            Text(
              'workspace.no_workspaces_yet'.tr(),
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'workspace.no_workspaces_description'.tr(),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: _navigateToCreateWorkspace,
              icon: const Icon(Icons.add),
              label: Text('workspace.create_first_workspace'.tr()),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWorkspaceCard(Workspace workspace, Workspace? currentWorkspace) {
    final isSelected = currentWorkspace?.id == workspace.id;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: _buildWorkspaceAvatar(workspace, isSelected: isSelected),
        title: Text(
          workspace.name,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (workspace.description != null)
              Text(
                workspace.description!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            const SizedBox(height: 4),
            Row(
              children: [
                if (workspace.membership != null) ...[
                  Chip(
                    label: Text(workspace.membership!.role.displayName),
                    backgroundColor: isSelected 
                        ? Theme.of(context).colorScheme.primaryContainer
                        : Theme.of(context).colorScheme.surfaceVariant,
                    labelStyle: TextStyle(
                      fontSize: 12,
                      color: isSelected
                          ? Theme.of(context).colorScheme.onPrimaryContainer
                          : Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                Chip(
                  label: Text(workspace.subscriptionPlan.displayName),
                  backgroundColor: workspace.isPremium
                      ? Colors.amber.withOpacity(0.2)
                      : Theme.of(context).colorScheme.surfaceVariant,
                  labelStyle: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ],
        ),
        trailing: isSelected
            ? Icon(
                Icons.check_circle,
                color: Theme.of(context).colorScheme.primary,
              )
            : const Icon(Icons.chevron_right),
        onTap: isSelected ? null : () => _switchWorkspace(workspace),
      ),
    );
  }

  Widget _buildWorkspaceAvatar(Workspace workspace, {bool isSelected = false}) {
    if (workspace.logo != null && workspace.logo!.startsWith('http')) {
      return CircleAvatar(
        radius: 24,
        backgroundImage: NetworkImage(workspace.logo!),
        backgroundColor: Theme.of(context).colorScheme.primaryContainer,
      );
    }

    return CircleAvatar(
      radius: 24,
      backgroundColor: isSelected
          ? Theme.of(context).colorScheme.primary
          : Theme.of(context).colorScheme.primaryContainer,
      child: Text(
        workspace.avatarText,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
          color: isSelected
              ? Theme.of(context).colorScheme.onPrimary
              : Theme.of(context).colorScheme.onPrimaryContainer,
        ),
      ),
    );
  }

  Future<void> _switchWorkspace(Workspace workspace) async {
    final success = await _workspaceService.switchWorkspace(workspace.id);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('workspace.switched_to_workspace'.tr(args: [workspace.name])),
          backgroundColor: Colors.green,
        ),
      );

      // Pop back to main screen
      Navigator.of(context).pop();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_workspaceService.error ?? 'workspace.failed_to_switch_workspace'.tr()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _navigateToCreateWorkspace() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const CreateWorkspaceScreen(),
      ),
    ).then((_) {
      // Refresh workspaces when returning from create screen
      _loadWorkspaces();
    });
  }
}