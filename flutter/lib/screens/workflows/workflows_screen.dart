import 'package:flutter/material.dart';
import '../../models/workflow.dart';
import '../../api/services/workflow_api_service.dart';
import '../../services/workspace_service.dart';
import 'workflow_builder_screen.dart';
import 'templates_screen.dart';
import 'widgets/natural_language_builder_sheet.dart';

class WorkflowsScreen extends StatefulWidget {
  const WorkflowsScreen({super.key});

  @override
  State<WorkflowsScreen> createState() => _WorkflowsScreenState();
}

class _WorkflowsScreenState extends State<WorkflowsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Workflow> _workflows = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadWorkflows();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadWorkflows() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() {
        _error = 'No workspace selected';
        _isLoading = false;
      });
      return;
    }

    final response = await WorkflowApiService.instance.getWorkflows(workspaceId);

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (response.success && response.data != null) {
          _workflows = response.data!;
        } else {
          _error = response.error ?? 'Failed to load workflows';
        }
      });
    }
  }

  Future<void> _toggleWorkflow(Workflow workflow) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    final response = await WorkflowApiService.instance.toggleWorkflow(
      workspaceId,
      workflow.id,
    );

    if (response.success) {
      _loadWorkflows();
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(response.error ?? 'Failed to toggle workflow')),
        );
      }
    }
  }

  Future<void> _deleteWorkflow(Workflow workflow) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Workflow'),
        content: Text('Are you sure you want to delete "${workflow.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    final response = await WorkflowApiService.instance.deleteWorkflow(
      workspaceId,
      workflow.id,
    );

    if (response.success) {
      _loadWorkflows();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Workflow deleted')),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(response.error ?? 'Failed to delete workflow')),
        );
      }
    }
  }

  Future<void> _duplicateWorkflow(Workflow workflow) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    final response = await WorkflowApiService.instance.duplicateWorkflow(
      workspaceId,
      workflow.id,
    );

    if (response.success) {
      _loadWorkflows();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Workflow duplicated')),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(response.error ?? 'Failed to duplicate workflow')),
        );
      }
    }
  }

  Future<void> _runWorkflow(Workflow workflow) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    final response = await WorkflowApiService.instance.executeWorkflow(
      workspaceId,
      workflow.id,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            response.success
                ? 'Workflow started'
                : response.error ?? 'Failed to run workflow',
          ),
        ),
      );
    }
  }

  void _openWorkflowBuilder([Workflow? workflow]) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => WorkflowBuilderScreen(workflow: workflow),
      ),
    ).then((_) => _loadWorkflows());
  }

  void _openTemplates() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const TemplatesScreen(),
      ),
    ).then((_) => _loadWorkflows());
  }

  void _openNaturalLanguageBuilder() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => NaturalLanguageBuilderSheet(
        onWorkflowCreated: (workflow) {
          Navigator.pop(context);
          _loadWorkflows();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Workflow "${workflow.name}" created!')),
          );
        },
        onEditWorkflow: (generatedWorkflow) {
          Navigator.pop(context);
          // Open the workflow builder with the generated workflow data
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => WorkflowBuilderScreen(
                initialData: generatedWorkflow,
              ),
            ),
          ).then((_) => _loadWorkflows());
        },
      ),
    );
  }

  void _showCreateOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Create Workflow',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.purple.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.auto_awesome, color: Colors.purple),
              ),
              title: const Text('Create with AI'),
              subtitle: const Text('Describe your automation in plain language'),
              onTap: () {
                Navigator.pop(context);
                _openNaturalLanguageBuilder();
              },
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.build, color: Colors.blue),
              ),
              title: const Text('Build Manually'),
              subtitle: const Text('Use the visual workflow builder'),
              onTap: () {
                Navigator.pop(context);
                _openWorkflowBuilder();
              },
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.dashboard_customize, color: Colors.green),
              ),
              title: const Text('Start from Template'),
              subtitle: const Text('Choose from pre-built automations'),
              onTap: () {
                Navigator.pop(context);
                _openTemplates();
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Automations'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'My Workflows'),
            Tab(text: 'Templates'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadWorkflows,
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildWorkflowsList(theme),
          const TemplatesScreen(embedded: true),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateOptions,
        icon: const Icon(Icons.add),
        label: const Text('New Workflow'),
      ),
    );
  }

  Widget _buildWorkflowsList(ThemeData theme) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 16),
            Text(_error!, style: theme.textTheme.bodyLarge),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadWorkflows,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_workflows.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.auto_awesome,
              size: 64,
              color: theme.colorScheme.primary.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            Text(
              'No workflows yet',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Create your first automation to get started',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
            ),
            const SizedBox(height: 24),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 12,
              runSpacing: 12,
              children: [
                ElevatedButton.icon(
                  onPressed: _openNaturalLanguageBuilder,
                  icon: const Icon(Icons.auto_awesome),
                  label: const Text('Create with AI'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.purple,
                    foregroundColor: Colors.white,
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: () => _openWorkflowBuilder(),
                  icon: const Icon(Icons.build),
                  label: const Text('Build Manually'),
                ),
                OutlinedButton.icon(
                  onPressed: _openTemplates,
                  icon: const Icon(Icons.dashboard_customize),
                  label: const Text('Browse Templates'),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadWorkflows,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _workflows.length,
        itemBuilder: (context, index) {
          final workflow = _workflows[index];
          return _WorkflowCard(
            workflow: workflow,
            onTap: () => _openWorkflowBuilder(workflow),
            onToggle: () => _toggleWorkflow(workflow),
            onRun: workflow.triggerType == WorkflowTriggerType.manual
                ? () => _runWorkflow(workflow)
                : null,
            onDuplicate: () => _duplicateWorkflow(workflow),
            onDelete: () => _deleteWorkflow(workflow),
          );
        },
      ),
    );
  }
}

class _WorkflowCard extends StatelessWidget {
  final Workflow workflow;
  final VoidCallback onTap;
  final VoidCallback onToggle;
  final VoidCallback? onRun;
  final VoidCallback onDuplicate;
  final VoidCallback onDelete;

  const _WorkflowCard({
    required this.workflow,
    required this.onTap,
    required this.onToggle,
    this.onRun,
    required this.onDuplicate,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = workflow.color != null
        ? Color(int.parse(workflow.color!.replaceFirst('#', '0xFF')))
        : theme.colorScheme.primary;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      _getIconData(workflow.icon ?? workflow.triggerType.icon),
                      color: color,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          workflow.name,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          workflow.triggerDescription,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface.withOpacity(0.6),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: workflow.isActive,
                    onChanged: (_) => onToggle(),
                  ),
                ],
              ),
              if (workflow.description != null && workflow.description!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  workflow.description!,
                  style: theme.textTheme.bodySmall,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  _StatChip(
                    icon: Icons.play_arrow,
                    label: '${workflow.runCount} runs',
                  ),
                  const SizedBox(width: 8),
                  if (workflow.runCount > 0)
                    _StatChip(
                      icon: Icons.check_circle_outline,
                      label: '${workflow.successRate.toStringAsFixed(0)}% success',
                      color: workflow.successRate >= 80
                          ? Colors.green
                          : workflow.successRate >= 50
                              ? Colors.orange
                              : Colors.red,
                    ),
                  const Spacer(),
                  if (onRun != null)
                    IconButton(
                      icon: const Icon(Icons.play_circle_outline),
                      onPressed: onRun,
                      tooltip: 'Run now',
                      iconSize: 20,
                    ),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, size: 20),
                    onSelected: (value) {
                      switch (value) {
                        case 'duplicate':
                          onDuplicate();
                          break;
                        case 'delete':
                          onDelete();
                          break;
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'duplicate',
                        child: Row(
                          children: [
                            Icon(Icons.copy, size: 20),
                            SizedBox(width: 12),
                            Text('Duplicate'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete, size: 20, color: Colors.red),
                            SizedBox(width: 12),
                            Text('Delete', style: TextStyle(color: Colors.red)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getIconData(String iconName) {
    switch (iconName) {
      case 'bolt':
        return Icons.bolt;
      case 'schedule':
        return Icons.schedule;
      case 'webhook':
        return Icons.webhook;
      case 'play_arrow':
        return Icons.play_arrow;
      case 'task_alt':
        return Icons.task_alt;
      case 'folder_special':
        return Icons.folder_special;
      case 'alarm':
        return Icons.alarm;
      case 'warning':
        return Icons.warning;
      case 'groups':
        return Icons.groups;
      case 'assessment':
        return Icons.assessment;
      case 'verified':
        return Icons.verified;
      case 'thumb_up':
        return Icons.thumb_up;
      case 'person_add':
        return Icons.person_add;
      case 'event_note':
        return Icons.event_note;
      case 'notifications_active':
        return Icons.notifications_active;
      case 'transform':
        return Icons.transform;
      case 'chat':
        return Icons.chat;
      default:
        return Icons.auto_awesome;
    }
  }
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;

  const _StatChip({
    required this.icon,
    required this.label,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final chipColor = color ?? theme.colorScheme.onSurface.withOpacity(0.6);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: chipColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: chipColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: chipColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
