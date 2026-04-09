import 'package:flutter/material.dart';
import '../../../models/workflow.dart';

/// Logical operator for combining conditions
enum LogicalOperator { and, or }

/// Step condition for the UI
class StepCondition {
  final String field;
  final ConditionOperator operator;
  final dynamic value;
  final LogicalOperator? logicalOperator;

  StepCondition({
    required this.field,
    required this.operator,
    this.value,
    this.logicalOperator,
  });

  Map<String, dynamic> toJson() {
    return {
      'field': field,
      'operator': operator.value,
      'value': value,
      'logicalOperator': logicalOperator?.name,
    };
  }
}

class StepConfigSheet extends StatefulWidget {
  final WorkflowStep? step;
  final int stepOrder;
  final Function(WorkflowStep) onSave;

  const StepConfigSheet({
    super.key,
    this.step,
    required this.stepOrder,
    required this.onSave,
  });

  @override
  State<StepConfigSheet> createState() => _StepConfigSheetState();
}

class _StepConfigSheetState extends State<StepConfigSheet> {
  late WorkflowStepType _stepType;
  late String _name;
  WorkflowActionType? _actionType;
  Map<String, dynamic> _actionConfig = {};
  List<StepCondition> _conditions = [];
  bool _continueOnError = false;
  int _maxRetries = 0;

  final _nameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.step != null) {
      _stepType = widget.step!.stepType;
      _name = widget.step!.stepName ?? 'Step ${widget.stepOrder}';
      _nameController.text = _name;

      // Extract values from stepConfig
      final config = widget.step!.stepConfig;
      final actionTypeStr = config['actionType'] as String?;
      if (actionTypeStr != null) {
        _actionType = WorkflowActionType.fromString(actionTypeStr);
      }
      _actionConfig = Map<String, dynamic>.from(config['actionConfig'] ?? {});

      // Parse conditions
      final condList = config['conditions'] as List?;
      if (condList != null) {
        _conditions = condList.asMap().entries.map((entry) {
          final c = entry.value as Map<String, dynamic>;
          return StepCondition(
            field: c['field'] ?? '',
            operator: _parseOperator(c['operator']),
            value: c['value'],
            logicalOperator: entry.key == 0 ? null : _parseLogicalOperator(c['logicalOperator']),
          );
        }).toList();
      }

      _continueOnError = config['continueOnError'] ?? false;
      _maxRetries = config['maxRetries'] ?? 0;
    } else {
      _stepType = WorkflowStepType.action;
      _name = 'Step ${widget.stepOrder}';
      _nameController.text = _name;
    }
  }

  ConditionOperator _parseOperator(String? value) {
    if (value == null) return ConditionOperator.equals;
    return ConditionOperator.values.firstWhere(
      (o) => o.value == value || o.name == value,
      orElse: () => ConditionOperator.equals,
    );
  }

  LogicalOperator? _parseLogicalOperator(String? value) {
    if (value == null) return null;
    return LogicalOperator.values.firstWhere(
      (o) => o.name == value,
      orElse: () => LogicalOperator.and,
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _save() {
    if (_stepType == WorkflowStepType.action && _actionType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an action')),
      );
      return;
    }

    // Build the step config with all the properties
    final stepConfig = <String, dynamic>{
      'actionType': _actionType?.value,
      'actionConfig': _actionConfig,
      'conditions': _conditions.map((c) => c.toJson()).toList(),
      'continueOnError': _continueOnError,
      'maxRetries': _maxRetries,
    };

    final step = WorkflowStep(
      id: widget.step?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
      workflowId: widget.step?.workflowId ?? '',
      stepName: _nameController.text.trim().isEmpty
          ? 'Step ${widget.stepOrder}'
          : _nameController.text.trim(),
      stepOrder: widget.stepOrder,
      stepType: _stepType,
      stepConfig: stepConfig,
      isActive: true,
      createdAt: widget.step?.createdAt ?? DateTime.now(),
      updatedAt: DateTime.now(),
    );

    widget.onSave(step);
    Navigator.pop(context);
  }

  void _addCondition() {
    setState(() {
      _conditions.add(StepCondition(
        field: '',
        operator: ConditionOperator.equals,
        value: '',
        logicalOperator: _conditions.isEmpty ? null : LogicalOperator.and,
      ));
    });
  }

  void _removeCondition(int index) {
    setState(() {
      _conditions.removeAt(index);
      if (_conditions.isNotEmpty && _conditions[0].logicalOperator != null) {
        _conditions[0] = StepCondition(
          field: _conditions[0].field,
          operator: _conditions[0].operator,
          value: _conditions[0].value,
          logicalOperator: null,
        );
      }
    });
  }

  void _updateCondition(int index, StepCondition condition) {
    setState(() {
      _conditions[index] = condition;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: theme.scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outline.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      widget.step == null ? 'Add Step' : 'Edit Step',
                      style: theme.textTheme.titleLarge,
                    ),
                    Row(
                      children: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cancel'),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: _save,
                          child: const Text('Save'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              // Content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Step name
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                        labelText: 'Step Name',
                        hintText: 'Enter a descriptive name',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.label),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Step type selection
                    Text(
                      'STEP TYPE',
                      style: theme.textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildStepTypeSelector(theme),

                    const SizedBox(height: 24),

                    // Action configuration (for action steps)
                    if (_stepType == WorkflowStepType.action) ...[
                      Text(
                        'ACTION',
                        style: theme.textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildActionSelector(theme),
                    ],

                    // Condition configuration (for condition steps)
                    if (_stepType == WorkflowStepType.condition) ...[
                      Text(
                        'CONDITIONS',
                        style: theme.textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildConditionsEditor(theme),
                    ],

                    const SizedBox(height: 24),

                    // Advanced settings
                    ExpansionTile(
                      title: const Text('Advanced Settings'),
                      leading: const Icon(Icons.settings),
                      children: [
                        _buildAdvancedSettings(theme),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStepTypeSelector(ThemeData theme) {
    return Row(
      children: WorkflowStepType.values.map((type) {
        final isSelected = _stepType == type;
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(
              right: type != WorkflowStepType.values.last ? 8 : 0,
            ),
            child: InkWell(
              onTap: () => setState(() => _stepType = type),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isSelected
                      ? theme.colorScheme.primaryContainer
                      : theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected
                        ? theme.colorScheme.primary
                        : Colors.transparent,
                    width: 2,
                  ),
                ),
                child: Column(
                  children: [
                    Icon(
                      _getStepTypeIcon(type),
                      color: isSelected
                          ? theme.colorScheme.primary
                          : theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      type.displayName,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: isSelected ? FontWeight.bold : null,
                        color: isSelected
                            ? theme.colorScheme.primary
                            : theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  IconData _getStepTypeIcon(WorkflowStepType type) {
    switch (type) {
      case WorkflowStepType.action:
        return Icons.play_arrow;
      case WorkflowStepType.condition:
        return Icons.call_split;
      case WorkflowStepType.loop:
        return Icons.loop;
      case WorkflowStepType.parallel:
        return Icons.fork_right;
      case WorkflowStepType.subWorkflow:
        return Icons.account_tree;
      case WorkflowStepType.delay:
        return Icons.timer;
      case WorkflowStepType.setVariable:
        return Icons.data_object;
      case WorkflowStepType.stop:
        return Icons.stop_circle;
    }
  }

  Widget _buildActionSelector(ThemeData theme) {
    return Card(
      child: ListTile(
        onTap: _showActionPicker,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: _actionType != null
                ? theme.colorScheme.primaryContainer
                : theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            _actionType != null ? _getActionIcon(_actionType!) : Icons.add,
            color: _actionType != null
                ? theme.colorScheme.primary
                : theme.colorScheme.onSurfaceVariant,
          ),
        ),
        title: Text(
          _actionType?.displayName ?? 'Select Action',
          style: TextStyle(
            fontWeight: _actionType != null ? FontWeight.w600 : null,
          ),
        ),
        subtitle: _actionType != null && _actionConfig.isNotEmpty
            ? Text(
                _getActionSummary(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              )
            : const Text('Tap to choose an action'),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }

  void _showActionPicker() async {
    // Import the action picker sheet
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ActionPickerInline(
        currentType: _actionType,
        currentConfig: _actionConfig,
      ),
    );

    if (result != null) {
      setState(() {
        _actionType = result['type'] as WorkflowActionType;
        _actionConfig = result['config'] as Map<String, dynamic>;
      });
    }
  }

  IconData _getActionIcon(WorkflowActionType type) {
    switch (type) {
      case WorkflowActionType.sendEmail:
        return Icons.email;
      case WorkflowActionType.sendNotification:
        return Icons.notifications;
      case WorkflowActionType.createTask:
        return Icons.add_task;
      case WorkflowActionType.updateTask:
        return Icons.edit;
      case WorkflowActionType.createNote:
        return Icons.note_add;
      case WorkflowActionType.createEvent:
        return Icons.event;
      case WorkflowActionType.sendSlackMessage:
        return Icons.chat;
      case WorkflowActionType.callWebhook:
        return Icons.webhook;
      case WorkflowActionType.delay:
        return Icons.timer;
      case WorkflowActionType.assignUser:
        return Icons.person_add;
      case WorkflowActionType.changeStatus:
        return Icons.sync;
      case WorkflowActionType.addTag:
        return Icons.label;
      case WorkflowActionType.removeTag:
        return Icons.label_off;
      case WorkflowActionType.moveToProject:
        return Icons.drive_file_move;
      case WorkflowActionType.setDueDate:
        return Icons.event;
      case WorkflowActionType.setPriority:
        return Icons.flag;
      case WorkflowActionType.requestApproval:
        return Icons.approval;
      case WorkflowActionType.runAiAction:
        return Icons.auto_awesome;
      default:
        return Icons.play_arrow;
    }
  }

  String _getActionSummary() {
    if (_actionConfig.isEmpty) return '';

    switch (_actionType) {
      case WorkflowActionType.sendEmail:
        return 'To: ${_actionConfig['recipient'] ?? ''}';
      case WorkflowActionType.sendNotification:
        return _actionConfig['title'] ?? '';
      case WorkflowActionType.createTask:
        return _actionConfig['title'] ?? '';
      case WorkflowActionType.callWebhook:
        return _actionConfig['url'] ?? '';
      case WorkflowActionType.delay:
        return '${_actionConfig['delayMinutes'] ?? 0} minutes';
      default:
        return _actionConfig.entries.take(1).map((e) => '${e.key}: ${e.value}').join();
    }
  }

  Widget _buildConditionsEditor(ThemeData theme) {
    return Column(
      children: [
        ..._conditions.asMap().entries.map((entry) {
          final index = entry.key;
          final condition = entry.value;
          return _ConditionRow(
            condition: condition,
            showLogicalOperator: index > 0,
            onUpdate: (updated) => _updateCondition(index, updated),
            onDelete: () => _removeCondition(index),
          );
        }),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _addCondition,
          icon: const Icon(Icons.add),
          label: const Text('Add Condition'),
        ),
        if (_conditions.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: theme.colorScheme.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Add conditions to control when this step should execute. If no conditions are set, the step always runs.',
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildAdvancedSettings(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          SwitchListTile(
            title: const Text('Continue on Error'),
            subtitle: const Text('Continue workflow even if this step fails'),
            value: _continueOnError,
            onChanged: (value) => setState(() => _continueOnError = value),
          ),
          const Divider(),
          ListTile(
            title: const Text('Max Retries'),
            subtitle: const Text('Number of times to retry on failure'),
            trailing: SizedBox(
              width: 80,
              child: DropdownButtonFormField<int>(
                value: _maxRetries,
                decoration: const InputDecoration(
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  border: OutlineInputBorder(),
                ),
                items: [0, 1, 2, 3, 5].map((v) => DropdownMenuItem(
                  value: v,
                  child: Text('$v'),
                )).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _maxRetries = value);
                  }
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ConditionRow extends StatelessWidget {
  final StepCondition condition;
  final bool showLogicalOperator;
  final Function(StepCondition) onUpdate;
  final VoidCallback onDelete;

  const _ConditionRow({
    required this.condition,
    required this.showLogicalOperator,
    required this.onUpdate,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            if (showLogicalOperator)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    SegmentedButton<LogicalOperator>(
                      segments: const [
                        ButtonSegment(value: LogicalOperator.and, label: Text('AND')),
                        ButtonSegment(value: LogicalOperator.or, label: Text('OR')),
                      ],
                      selected: {condition.logicalOperator ?? LogicalOperator.and},
                      onSelectionChanged: (selected) {
                        onUpdate(StepCondition(
                          field: condition.field,
                          operator: condition.operator,
                          value: condition.value,
                          logicalOperator: selected.first,
                        ));
                      },
                    ),
                  ],
                ),
              ),
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: TextFormField(
                    initialValue: condition.field,
                    decoration: const InputDecoration(
                      labelText: 'Field',
                      hintText: 'triggerData.status',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (value) {
                      onUpdate(StepCondition(
                        field: value,
                        operator: condition.operator,
                        value: condition.value,
                        logicalOperator: condition.logicalOperator,
                      ));
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: DropdownButtonFormField<ConditionOperator>(
                    value: condition.operator,
                    decoration: const InputDecoration(
                      labelText: 'Operator',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                    items: ConditionOperator.values.map((op) => DropdownMenuItem(
                      value: op,
                      child: Text(
                        op.displayName,
                        overflow: TextOverflow.ellipsis,
                      ),
                    )).toList(),
                    onChanged: (value) {
                      if (value != null) {
                        onUpdate(StepCondition(
                          field: condition.field,
                          operator: value,
                          value: condition.value,
                          logicalOperator: condition.logicalOperator,
                        ));
                      }
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    initialValue: condition.value?.toString() ?? '',
                    decoration: const InputDecoration(
                      labelText: 'Value',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (value) {
                      onUpdate(StepCondition(
                        field: condition.field,
                        operator: condition.operator,
                        value: value,
                        logicalOperator: condition.logicalOperator,
                      ));
                    },
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: Icon(Icons.delete_outline, color: theme.colorScheme.error),
                  onPressed: onDelete,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// Inline action picker (simplified version)
class _ActionPickerInline extends StatefulWidget {
  final WorkflowActionType? currentType;
  final Map<String, dynamic> currentConfig;

  const _ActionPickerInline({
    this.currentType,
    required this.currentConfig,
  });

  @override
  State<_ActionPickerInline> createState() => _ActionPickerInlineState();
}

class _ActionPickerInlineState extends State<_ActionPickerInline> {
  WorkflowActionType? _selectedType;
  Map<String, dynamic> _config = {};

  @override
  void initState() {
    super.initState();
    _selectedType = widget.currentType;
    _config = Map.from(widget.currentConfig);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: theme.scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outline.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Select Action', style: theme.textTheme.titleLarge),
                    TextButton(
                      onPressed: _selectedType != null
                          ? () => Navigator.pop(context, {
                                'type': _selectedType,
                                'config': _config,
                              })
                          : null,
                      child: const Text('Done'),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  children: WorkflowActionType.values.map((type) {
                    final isSelected = _selectedType == type;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      color: isSelected ? theme.colorScheme.primaryContainer : null,
                      child: ListTile(
                        onTap: () => setState(() => _selectedType = type),
                        leading: Icon(_getActionIcon(type)),
                        title: Text(type.displayName),
                        trailing: isSelected
                            ? Icon(Icons.check_circle, color: theme.colorScheme.primary)
                            : null,
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  IconData _getActionIcon(WorkflowActionType type) {
    switch (type) {
      case WorkflowActionType.sendEmail:
        return Icons.email;
      case WorkflowActionType.sendNotification:
        return Icons.notifications;
      case WorkflowActionType.createTask:
        return Icons.add_task;
      case WorkflowActionType.updateTask:
        return Icons.edit;
      case WorkflowActionType.createNote:
        return Icons.note_add;
      case WorkflowActionType.createEvent:
        return Icons.event;
      case WorkflowActionType.sendSlackMessage:
        return Icons.chat;
      case WorkflowActionType.callWebhook:
        return Icons.webhook;
      case WorkflowActionType.delay:
        return Icons.timer;
      case WorkflowActionType.assignUser:
        return Icons.person_add;
      case WorkflowActionType.changeStatus:
        return Icons.sync;
      case WorkflowActionType.addTag:
        return Icons.label;
      case WorkflowActionType.removeTag:
        return Icons.label_off;
      case WorkflowActionType.moveToProject:
        return Icons.drive_file_move;
      case WorkflowActionType.setDueDate:
        return Icons.event;
      case WorkflowActionType.setPriority:
        return Icons.flag;
      case WorkflowActionType.requestApproval:
        return Icons.approval;
      case WorkflowActionType.runAiAction:
        return Icons.auto_awesome;
      default:
        return Icons.play_arrow;
    }
  }
}
