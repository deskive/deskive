import 'package:flutter/material.dart';
import '../../models/workflow.dart';
import '../../api/services/workflow_api_service.dart';
import '../../services/workspace_service.dart';

class TemplatesScreen extends StatefulWidget {
  final bool embedded;

  const TemplatesScreen({super.key, this.embedded = false});

  @override
  State<TemplatesScreen> createState() => _TemplatesScreenState();
}

class _TemplatesScreenState extends State<TemplatesScreen> {
  List<AutomationTemplate> _templates = [];
  List<TemplateCategory> _categories = [];
  String? _selectedCategory;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final categoriesResponse = await WorkflowApiService.instance.getTemplateCategories();
    final templatesResponse = await WorkflowApiService.instance.getTemplates();

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (categoriesResponse.success && categoriesResponse.data != null) {
          _categories = categoriesResponse.data!;
        }
        if (templatesResponse.success && templatesResponse.data != null) {
          _templates = templatesResponse.data!;
        } else {
          _error = templatesResponse.error ?? 'Failed to load templates';
        }
      });
    }
  }

  Future<void> _useTemplate(AutomationTemplate template) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No workspace selected')),
      );
      return;
    }

    // Show configuration dialog if template has variables
    Map<String, dynamic>? variables;
    if (template.variables.isNotEmpty) {
      variables = await _showVariablesDialog(template);
      if (variables == null) return; // User cancelled
    }

    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    final response = await WorkflowApiService.instance.useTemplate(
      template.id,
      workspaceId,
      variables: variables,
    );

    if (mounted) {
      Navigator.pop(context); // Close loading

      if (response.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Workflow "${response.data?.name}" created!')),
        );
        if (!widget.embedded) {
          Navigator.pop(context, response.data);
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(response.error ?? 'Failed to create workflow')),
        );
      }
    }
  }

  Future<Map<String, dynamic>?> _showVariablesDialog(AutomationTemplate template) async {
    final controllers = <String, TextEditingController>{};
    for (final variable in template.variables) {
      controllers[variable.name] = TextEditingController(
        text: variable.defaultValue?.toString() ?? '',
      );
    }

    return showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Configure ${template.name}'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (template.description != null) ...[
                Text(
                  template.description!,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 16),
              ],
              ...template.variables.map((variable) => Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: TextField(
                  controller: controllers[variable.name],
                  decoration: InputDecoration(
                    labelText: variable.name.replaceAll('_', ' ').toUpperCase(),
                    helperText: variable.description,
                    border: const OutlineInputBorder(),
                  ),
                ),
              )),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final variables = <String, dynamic>{};
              for (final entry in controllers.entries) {
                variables[entry.key] = entry.value.text;
              }
              Navigator.pop(context, variables);
            },
            child: const Text('Create Workflow'),
          ),
        ],
      ),
    );
  }

  List<AutomationTemplate> get _filteredTemplates {
    if (_selectedCategory == null) return _templates;
    return _templates.where((t) => t.category == _selectedCategory).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final content = _isLoading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
                    const SizedBox(height: 16),
                    Text(_error!),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _loadData,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              )
            : CustomScrollView(
                slivers: [
                  // Category chips
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 50,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        children: [
                          _CategoryChip(
                            label: 'All',
                            isSelected: _selectedCategory == null,
                            onTap: () => setState(() => _selectedCategory = null),
                          ),
                          ..._categories.map((category) => _CategoryChip(
                            label: category.name,
                            isSelected: _selectedCategory == category.id,
                            onTap: () => setState(() => _selectedCategory = category.id),
                          )),
                        ],
                      ),
                    ),
                  ),
                  // Featured section
                  if (_selectedCategory == null) ...[
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text(
                          'Featured',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: SizedBox(
                        height: 180,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _templates.where((t) => t.isFeatured).length,
                          itemBuilder: (context, index) {
                            final template = _templates.where((t) => t.isFeatured).toList()[index];
                            return _FeaturedTemplateCard(
                              template: template,
                              onTap: () => _useTemplate(template),
                            );
                          },
                        ),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text(
                          'All Templates',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                  // Templates grid
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 1.2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final template = _filteredTemplates[index];
                          return _TemplateCard(
                            template: template,
                            onTap: () => _useTemplate(template),
                          );
                        },
                        childCount: _filteredTemplates.length,
                      ),
                    ),
                  ),
                  const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
                ],
              );

    if (widget.embedded) {
      return content;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Automation Templates'),
      ),
      body: content,
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => onTap(),
        selectedColor: theme.colorScheme.primaryContainer,
        checkmarkColor: theme.colorScheme.onPrimaryContainer,
      ),
    );
  }
}

class _FeaturedTemplateCard extends StatelessWidget {
  final AutomationTemplate template;
  final VoidCallback onTap;

  const _FeaturedTemplateCard({
    required this.template,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = template.color != null
        ? Color(int.parse(template.color!.replaceFirst('#', '0xFF')))
        : theme.colorScheme.primary;

    return Container(
      width: 280,
      margin: const EdgeInsets.only(right: 12),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  color.withOpacity(0.1),
                  color.withOpacity(0.05),
                ],
              ),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        _getIconData(template.icon ?? 'auto_awesome'),
                        color: color,
                        size: 24,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Featured',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Text(
                  template.name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  template.description ?? '',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withOpacity(0.7),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(
                      Icons.download,
                      size: 14,
                      color: theme.colorScheme.onSurface.withOpacity(0.5),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${template.useCount} uses',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withOpacity(0.5),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  IconData _getIconData(String iconName) {
    switch (iconName) {
      case 'folder_special':
        return Icons.folder_special;
      case 'task_alt':
        return Icons.task_alt;
      case 'alarm':
        return Icons.alarm;
      case 'warning':
        return Icons.warning;
      case 'groups':
        return Icons.groups;
      case 'verified':
        return Icons.verified;
      case 'person_add':
        return Icons.person_add;
      case 'event_note':
        return Icons.event_note;
      default:
        return Icons.auto_awesome;
    }
  }
}

class _TemplateCard extends StatelessWidget {
  final AutomationTemplate template;
  final VoidCallback onTap;

  const _TemplateCard({
    required this.template,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = template.color != null
        ? Color(int.parse(template.color!.replaceFirst('#', '0xFF')))
        : theme.colorScheme.primary;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _getIconData(template.icon ?? 'auto_awesome'),
                  color: color,
                  size: 20,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                template.name,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Expanded(
                child: Text(
                  template.description ?? '',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withOpacity(0.6),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getIconData(String iconName) {
    switch (iconName) {
      case 'folder_special':
        return Icons.folder_special;
      case 'task_alt':
        return Icons.task_alt;
      case 'assignment_ind':
        return Icons.assignment_ind;
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
