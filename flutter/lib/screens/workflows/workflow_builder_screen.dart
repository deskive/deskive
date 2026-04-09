import 'package:flutter/material.dart';
import '../../models/workflow.dart';
import '../../api/services/workflow_api_service.dart';
import '../../services/workspace_service.dart';
import 'widgets/trigger_picker_sheet.dart';
import 'widgets/action_picker_sheet.dart';
import 'widgets/step_config_sheet.dart';

class WorkflowBuilderScreen extends StatefulWidget {
  final Workflow? workflow;
  final Map<String, dynamic>? initialData;

  const WorkflowBuilderScreen({super.key, this.workflow, this.initialData});

  @override
  State<WorkflowBuilderScreen> createState() => _WorkflowBuilderScreenState();
}

class _WorkflowBuilderScreenState extends State<WorkflowBuilderScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();

  bool _isLoading = false;
  bool _hasChanges = false;

  WorkflowTriggerType _triggerType = WorkflowTriggerType.manual;
  Map<String, dynamic> _triggerConfig = {};
  List<WorkflowStep> _steps = [];
  String? _selectedColor;

  @override
  void initState() {
    super.initState();
    if (widget.workflow != null) {
      _loadWorkflow();
    } else if (widget.initialData != null) {
      _loadFromInitialData();
    }
  }

  void _loadWorkflow() {
    final workflow = widget.workflow!;
    _nameController.text = workflow.name;
    _descriptionController.text = workflow.description ?? '';
    _triggerType = workflow.triggerType;
    _triggerConfig = Map.from(workflow.triggerConfig);
    _steps = workflow.steps?.toList() ?? [];
    _selectedColor = workflow.color;
  }

  void _loadFromInitialData() {
    final data = widget.initialData!;
    _nameController.text = data['name'] ?? '';
    _descriptionController.text = data['description'] ?? '';

    // Parse trigger type
    final triggerTypeStr = data['triggerType'] as String?;
    _triggerType = WorkflowTriggerType.values.firstWhere(
      (t) => t.name == triggerTypeStr,
      orElse: () => WorkflowTriggerType.manual,
    );

    _triggerConfig = Map<String, dynamic>.from(data['triggerConfig'] ?? {});
    _selectedColor = data['color'];

    // Parse steps
    final stepsData = data['steps'] as List?;
    if (stepsData != null) {
      _steps = stepsData.asMap().entries.map((entry) {
        final index = entry.key;
        final stepMap = entry.value as Map<String, dynamic>;

        // Build stepConfig from the AI-generated data
        final stepConfig = <String, dynamic>{
          'actionType': stepMap['actionType'],
          'actionConfig': Map<String, dynamic>.from(stepMap['actionConfig'] ?? {}),
          'conditions': (stepMap['conditions'] as List?)?.map((c) {
            final condMap = c as Map<String, dynamic>;
            return {
              'id': condMap['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
              'field': condMap['field'] ?? '',
              'operator': condMap['operator'] ?? 'equals',
              'value': condMap['value'],
              'logicalOperator': condMap['logicalOperator'],
            };
          }).toList() ?? [],
        };

        return WorkflowStep(
          id: stepMap['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
          workflowId: '',
          stepName: stepMap['name'] ?? 'Step ${index + 1}',
          stepOrder: stepMap['order'] ?? index,
          stepType: WorkflowStepType.values.firstWhere(
            (t) => t.name == stepMap['stepType'],
            orElse: () => WorkflowStepType.action,
          ),
          stepConfig: stepConfig,
          isActive: true,
          createdAt: DateTime.now(),
        );
      }).toList();
    }

    _hasChanges = true; // Mark as having changes since this is a new workflow from AI
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<bool> _onWillPop() async {
    if (!_hasChanges) return true;

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Discard changes?'),
        content: const Text('You have unsaved changes. Are you sure you want to leave?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Discard'),
          ),
        ],
      ),
    );

    return result ?? false;
  }

  Future<void> _saveWorkflow() async {
    if (!_formKey.currentState!.validate()) return;

    if (_steps.isEmpty && _triggerType != WorkflowTriggerType.manual) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least one action')),
      );
      return;
    }

    setState(() => _isLoading = true);

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No workspace selected')),
      );
      return;
    }

    try {
      if (widget.workflow != null) {
        // Update existing workflow
        final response = await WorkflowApiService.instance.updateWorkflow(
          workspaceId,
          widget.workflow!.id,
          name: _nameController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          triggerType: _triggerType,
          triggerConfig: _triggerConfig,
          color: _selectedColor,
        );

        if (response.success) {
          // Update steps
          for (final step in _steps) {
            if (step.id.startsWith('temp_')) {
              // New step
              await WorkflowApiService.instance.addWorkflowStep(
                workspaceId,
                widget.workflow!.id,
                stepOrder: step.stepOrder,
                stepType: step.stepType,
                stepName: step.stepName,
                stepConfig: step.stepConfig,
              );
            } else {
              // Existing step
              await WorkflowApiService.instance.updateWorkflowStep(
                workspaceId,
                widget.workflow!.id,
                step.id,
                stepOrder: step.stepOrder,
                stepType: step.stepType,
                stepName: step.stepName,
                stepConfig: step.stepConfig,
              );
            }
          }

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Workflow updated')),
            );
            Navigator.pop(context, true);
          }
        } else {
          throw Exception(response.error);
        }
      } else {
        // Create new workflow
        final steps = _steps.map((step) => {
          'stepOrder': step.stepOrder,
          'stepType': step.stepType.value,
          'stepName': step.stepName,
          'stepConfig': step.stepConfig,
        }).toList();

        final response = await WorkflowApiService.instance.createWorkflow(
          workspaceId,
          name: _nameController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          triggerType: _triggerType,
          triggerConfig: _triggerConfig,
          steps: steps,
          color: _selectedColor,
        );

        if (response.success) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Workflow created')),
            );
            Navigator.pop(context, true);
          }
        } else {
          throw Exception(response.error);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showTriggerPicker() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => TriggerPickerSheet(
        currentType: _triggerType,
        currentConfig: _triggerConfig,
      ),
    );

    if (result != null) {
      setState(() {
        _triggerType = result['type'] as WorkflowTriggerType;
        _triggerConfig = result['config'] as Map<String, dynamic>;
        _hasChanges = true;
      });
    }
  }

  void _addStep() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => const ActionPickerSheet(currentConfig: {}),
    );

    if (result != null) {
      setState(() {
        _steps.add(WorkflowStep(
          id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
          workflowId: widget.workflow?.id ?? '',
          stepOrder: _steps.length,
          stepType: result['type'] as WorkflowStepType,
          stepName: result['name'] as String?,
          stepConfig: result['config'] as Map<String, dynamic>,
          createdAt: DateTime.now(),
        ));
        _hasChanges = true;
      });
    }
  }

  void _editStep(int index) async {
    final step = _steps[index];
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StepConfigSheet(
        step: step,
        stepOrder: index,
        onSave: (updatedStep) {
          setState(() {
            _steps[index] = updatedStep;
            _hasChanges = true;
          });
        },
      ),
    );
  }

  void _deleteStep(int index) {
    setState(() {
      _steps.removeAt(index);
      // Reorder remaining steps
      for (int i = 0; i < _steps.length; i++) {
        _steps[i] = WorkflowStep(
          id: _steps[i].id,
          workflowId: _steps[i].workflowId,
          stepOrder: i,
          stepType: _steps[i].stepType,
          stepName: _steps[i].stepName,
          stepConfig: _steps[i].stepConfig,
          createdAt: _steps[i].createdAt,
        );
      }
      _hasChanges = true;
    });
  }

  void _reorderSteps(int oldIndex, int newIndex) {
    setState(() {
      if (newIndex > oldIndex) newIndex--;
      final step = _steps.removeAt(oldIndex);
      _steps.insert(newIndex, step);
      // Update step orders
      for (int i = 0; i < _steps.length; i++) {
        _steps[i] = WorkflowStep(
          id: _steps[i].id,
          workflowId: _steps[i].workflowId,
          stepOrder: i,
          stepType: _steps[i].stepType,
          stepName: _steps[i].stepName,
          stepConfig: _steps[i].stepConfig,
          createdAt: _steps[i].createdAt,
        );
      }
      _hasChanges = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isEditing = widget.workflow != null;

    return PopScope(
      canPop: !_hasChanges,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldPop = await _onWillPop();
        if (shouldPop && context.mounted) {
          Navigator.pop(context);
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(isEditing ? 'Edit Workflow' : 'New Workflow'),
          actions: [
            if (isEditing)
              IconButton(
                icon: const Icon(Icons.play_circle_outline),
                onPressed: () async {
                  final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
                  if (workspaceId != null) {
                    await WorkflowApiService.instance.testWorkflow(
                      workspaceId,
                      widget.workflow!.id,
                    );
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Test execution started')),
                      );
                    }
                  }
                },
                tooltip: 'Test workflow',
              ),
            TextButton(
              onPressed: _isLoading ? null : _saveWorkflow,
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save'),
            ),
          ],
        ),
        body: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Name field
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Workflow Name',
                  hintText: 'e.g., Task Completion Notification',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter a name';
                  }
                  return null;
                },
                onChanged: (_) => setState(() => _hasChanges = true),
              ),
              const SizedBox(height: 16),

              // Description field
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description (optional)',
                  hintText: 'What does this workflow do?',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
                onChanged: (_) => setState(() => _hasChanges = true),
              ),
              const SizedBox(height: 24),

              // Trigger section
              Text(
                'TRIGGER',
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(height: 8),
              _TriggerCard(
                triggerType: _triggerType,
                triggerConfig: _triggerConfig,
                onTap: _showTriggerPicker,
              ),
              const SizedBox(height: 24),

              // Steps section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'THEN DO',
                    style: theme.textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  TextButton.icon(
                    onPressed: _addStep,
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Add Step'),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              if (_steps.isEmpty)
                _EmptyStepsPlaceholder(onAdd: _addStep)
              else
                ReorderableListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _steps.length,
                  onReorder: _reorderSteps,
                  itemBuilder: (context, index) {
                    final step = _steps[index];
                    return _StepCard(
                      key: ValueKey(step.id),
                      step: step,
                      index: index,
                      onTap: () => _editStep(index),
                      onDelete: () => _deleteStep(index),
                    );
                  },
                ),

              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }
}

class _TriggerCard extends StatelessWidget {
  final WorkflowTriggerType triggerType;
  final Map<String, dynamic> triggerConfig;
  final VoidCallback onTap;

  const _TriggerCard({
    required this.triggerType,
    required this.triggerConfig,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    String subtitle;
    switch (triggerType) {
      case WorkflowTriggerType.entityChange:
        final entityType = triggerConfig['entityType'] ?? 'item';
        final eventType = triggerConfig['eventType'] ?? 'changes';
        subtitle = 'When $entityType $eventType';
        break;
      case WorkflowTriggerType.schedule:
        subtitle = triggerConfig['cronExpression'] ?? 'Not configured';
        break;
      case WorkflowTriggerType.webhook:
        subtitle = 'External webhook trigger';
        break;
      case WorkflowTriggerType.manual:
        subtitle = 'Run this workflow manually';
        break;
    }

    return Card(
      child: ListTile(
        onTap: onTap,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: theme.colorScheme.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            _getIcon(triggerType),
            color: theme.colorScheme.primary,
          ),
        ),
        title: Text(triggerType.displayName),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }

  IconData _getIcon(WorkflowTriggerType type) {
    switch (type) {
      case WorkflowTriggerType.entityChange:
        return Icons.bolt;
      case WorkflowTriggerType.schedule:
        return Icons.schedule;
      case WorkflowTriggerType.webhook:
        return Icons.webhook;
      case WorkflowTriggerType.manual:
        return Icons.play_arrow;
    }
  }
}

class _StepCard extends StatelessWidget {
  final WorkflowStep step;
  final int index;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _StepCard({
    super.key,
    required this.step,
    required this.index,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Color getStepColor() {
      switch (step.stepType) {
        case WorkflowStepType.action:
          return Colors.blue;
        case WorkflowStepType.condition:
          return Colors.orange;
        case WorkflowStepType.delay:
          return Colors.purple;
        case WorkflowStepType.loop:
          return Colors.teal;
        case WorkflowStepType.setVariable:
          return Colors.indigo;
        case WorkflowStepType.stop:
          return Colors.red;
        default:
          return theme.colorScheme.primary;
      }
    }

    final color = getStepColor();

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: onTap,
        leading: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            ReorderableDragStartListener(
              index: index,
              child: const Icon(Icons.drag_handle, color: Colors.grey),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                _getStepIcon(step.stepType),
                color: color,
                size: 20,
              ),
            ),
          ],
        ),
        title: Text(step.displayName),
        subtitle: Text(_getStepSubtitle(step)),
        trailing: IconButton(
          icon: const Icon(Icons.delete_outline, size: 20),
          onPressed: onDelete,
        ),
      ),
    );
  }

  IconData _getStepIcon(WorkflowStepType type) {
    switch (type) {
      case WorkflowStepType.action:
        return Icons.flash_on;
      case WorkflowStepType.condition:
        return Icons.call_split;
      case WorkflowStepType.delay:
        return Icons.timer;
      case WorkflowStepType.loop:
        return Icons.loop;
      case WorkflowStepType.parallel:
        return Icons.account_tree;
      case WorkflowStepType.setVariable:
        return Icons.data_object;
      case WorkflowStepType.subWorkflow:
        return Icons.schema;
      case WorkflowStepType.stop:
        return Icons.stop;
    }
  }

  String _getStepSubtitle(WorkflowStep step) {
    switch (step.stepType) {
      case WorkflowStepType.action:
        final action = step.stepConfig['action'] ?? '';
        return action.toString().replaceAll('_', ' ');
      case WorkflowStepType.condition:
        return 'If condition is met...';
      case WorkflowStepType.delay:
        final duration = step.stepConfig['duration'] ?? 0;
        final unit = step.stepConfig['unit'] ?? 'minutes';
        return 'Wait $duration $unit';
      case WorkflowStepType.loop:
        return 'Repeat for each item';
      case WorkflowStepType.setVariable:
        final name = step.stepConfig['variableName'] ?? '';
        return 'Set $name';
      case WorkflowStepType.stop:
        return 'Stop workflow';
      default:
        return '';
    }
  }
}

class _EmptyStepsPlaceholder extends StatelessWidget {
  final VoidCallback onAdd;

  const _EmptyStepsPlaceholder({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        border: Border.all(
          color: theme.colorScheme.outline.withOpacity(0.3),
          style: BorderStyle.solid,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.add_circle_outline,
            size: 48,
            color: theme.colorScheme.primary.withOpacity(0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No actions yet',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Add actions to define what happens when this workflow runs',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.6),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: onAdd,
            icon: const Icon(Icons.add),
            label: const Text('Add Action'),
          ),
        ],
      ),
    );
  }
}
