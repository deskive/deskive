import 'package:flutter/material.dart';
import '../../../models/workflow.dart';

class TriggerPickerSheet extends StatefulWidget {
  final WorkflowTriggerType currentType;
  final Map<String, dynamic> currentConfig;

  const TriggerPickerSheet({
    super.key,
    required this.currentType,
    required this.currentConfig,
  });

  @override
  State<TriggerPickerSheet> createState() => _TriggerPickerSheetState();
}

class _TriggerPickerSheetState extends State<TriggerPickerSheet> {
  late WorkflowTriggerType _selectedType;
  late Map<String, dynamic> _config;

  // Entity trigger fields
  EntityType _entityType = EntityType.task;
  EntityEventType _eventType = EntityEventType.created;

  // Schedule trigger fields
  final _cronController = TextEditingController();
  String _schedulePreset = 'daily_9am';

  @override
  void initState() {
    super.initState();
    _selectedType = widget.currentType;
    _config = Map.from(widget.currentConfig);

    // Load existing config
    if (_config.isNotEmpty) {
      if (_selectedType == WorkflowTriggerType.entityChange) {
        _entityType = EntityType.fromString(_config['entityType'] ?? 'task');
        _eventType = EntityEventType.fromString(_config['eventType'] ?? 'created');
      } else if (_selectedType == WorkflowTriggerType.schedule) {
        _cronController.text = _config['cronExpression'] ?? '';
      }
    }
  }

  @override
  void dispose() {
    _cronController.dispose();
    super.dispose();
  }

  void _save() {
    Map<String, dynamic> config = {};

    switch (_selectedType) {
      case WorkflowTriggerType.entityChange:
        config = {
          'entityType': _entityType.value,
          'eventType': _eventType.value,
        };
        break;
      case WorkflowTriggerType.schedule:
        config = {
          'cronExpression': _cronController.text,
          'timezone': 'UTC',
        };
        break;
      case WorkflowTriggerType.webhook:
        config = {};
        break;
      case WorkflowTriggerType.manual:
        config = {};
        break;
    }

    Navigator.pop(context, {
      'type': _selectedType,
      'config': config,
    });
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
                      'Select Trigger',
                      style: theme.textTheme.titleLarge,
                    ),
                    TextButton(
                      onPressed: _save,
                      child: const Text('Done'),
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
                    // Trigger type selection
                    ...WorkflowTriggerType.values.map((type) => _TriggerTypeCard(
                      type: type,
                      isSelected: _selectedType == type,
                      onTap: () => setState(() => _selectedType = type),
                    )),

                    const SizedBox(height: 24),

                    // Configuration based on selected type
                    if (_selectedType == WorkflowTriggerType.entityChange) ...[
                      Text(
                        'CONFIGURE TRIGGER',
                        style: theme.textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildEntityConfig(theme),
                    ],

                    if (_selectedType == WorkflowTriggerType.schedule) ...[
                      Text(
                        'CONFIGURE SCHEDULE',
                        style: theme.textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildScheduleConfig(theme),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEntityConfig(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Entity type dropdown
        DropdownButtonFormField<EntityType>(
          value: _entityType,
          decoration: const InputDecoration(
            labelText: 'When this',
            border: OutlineInputBorder(),
          ),
          items: EntityType.values.map((type) => DropdownMenuItem(
            value: type,
            child: Row(
              children: [
                Icon(_getEntityIcon(type), size: 20),
                const SizedBox(width: 12),
                Text(type.displayName),
              ],
            ),
          )).toList(),
          onChanged: (value) {
            if (value != null) {
              setState(() => _entityType = value);
            }
          },
        ),
        const SizedBox(height: 16),

        // Event type dropdown
        DropdownButtonFormField<EntityEventType>(
          value: _eventType,
          decoration: const InputDecoration(
            labelText: 'Event',
            border: OutlineInputBorder(),
          ),
          items: _getValidEventTypes().map((type) => DropdownMenuItem(
            value: type,
            child: Text(type.displayName),
          )).toList(),
          onChanged: (value) {
            if (value != null) {
              setState(() => _eventType = value);
            }
          },
        ),

        const SizedBox(height: 16),

        // Preview
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: theme.colorScheme.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(Icons.info_outline, color: theme.colorScheme.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'This workflow will run when a ${_entityType.displayName.toLowerCase()} ${_eventType.displayName}',
                  style: theme.textTheme.bodyMedium,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  List<EntityEventType> _getValidEventTypes() {
    switch (_entityType) {
      case EntityType.task:
        return [
          EntityEventType.created,
          EntityEventType.updated,
          EntityEventType.deleted,
          EntityEventType.statusChanged,
          EntityEventType.assigned,
          EntityEventType.completed,
          EntityEventType.dueDateChanged,
          EntityEventType.priorityChanged,
        ];
      case EntityType.approval:
        return [
          EntityEventType.created,
          EntityEventType.approved,
          EntityEventType.rejected,
        ];
      case EntityType.event:
        return [
          EntityEventType.created,
          EntityEventType.updated,
          EntityEventType.deleted,
          EntityEventType.started,
          EntityEventType.ended,
        ];
      default:
        return [
          EntityEventType.created,
          EntityEventType.updated,
          EntityEventType.deleted,
        ];
    }
  }

  Widget _buildScheduleConfig(ThemeData theme) {
    final presets = {
      'daily_9am': 'Every day at 9 AM',
      'weekdays_9am': 'Weekdays at 9 AM',
      'weekly_monday': 'Every Monday at 9 AM',
      'hourly': 'Every hour',
      'custom': 'Custom cron expression',
    };

    final cronExpressions = {
      'daily_9am': '0 9 * * *',
      'weekdays_9am': '0 9 * * 1-5',
      'weekly_monday': '0 9 * * 1',
      'hourly': '0 * * * *',
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Preset selection
        ...presets.entries.map((entry) => RadioListTile<String>(
          value: entry.key,
          groupValue: _schedulePreset,
          title: Text(entry.value),
          onChanged: (value) {
            if (value != null) {
              setState(() {
                _schedulePreset = value;
                if (cronExpressions.containsKey(value)) {
                  _cronController.text = cronExpressions[value]!;
                }
              });
            }
          },
        )),

        if (_schedulePreset == 'custom') ...[
          const SizedBox(height: 16),
          TextFormField(
            controller: _cronController,
            decoration: const InputDecoration(
              labelText: 'Cron Expression',
              hintText: '0 9 * * *',
              helperText: 'minute hour day month weekday',
              border: OutlineInputBorder(),
            ),
          ),
        ],

        const SizedBox(height: 16),

        // Preview
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: theme.colorScheme.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(Icons.schedule, color: theme.colorScheme.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Schedule: ${_cronController.text.isNotEmpty ? _cronController.text : "Not set"}',
                  style: theme.textTheme.bodyMedium,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  IconData _getEntityIcon(EntityType type) {
    switch (type) {
      case EntityType.task:
        return Icons.task_alt;
      case EntityType.note:
        return Icons.note;
      case EntityType.event:
        return Icons.event;
      case EntityType.file:
        return Icons.folder;
      case EntityType.project:
        return Icons.folder_special;
      case EntityType.message:
        return Icons.chat;
      case EntityType.approval:
        return Icons.verified;
    }
  }
}

class _TriggerTypeCard extends StatelessWidget {
  final WorkflowTriggerType type;
  final bool isSelected;
  final VoidCallback onTap;

  const _TriggerTypeCard({
    required this.type,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: isSelected ? theme.colorScheme.primaryContainer : null,
      child: ListTile(
        onTap: onTap,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isSelected
                ? theme.colorScheme.primary.withOpacity(0.2)
                : theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            _getIcon(type),
            color: isSelected ? theme.colorScheme.primary : null,
          ),
        ),
        title: Text(
          type.displayName,
          style: TextStyle(
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        subtitle: Text(_getDescription(type)),
        trailing: isSelected
            ? Icon(Icons.check_circle, color: theme.colorScheme.primary)
            : null,
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

  String _getDescription(WorkflowTriggerType type) {
    switch (type) {
      case WorkflowTriggerType.entityChange:
        return 'Run when tasks, notes, or events change';
      case WorkflowTriggerType.schedule:
        return 'Run on a specific schedule';
      case WorkflowTriggerType.webhook:
        return 'Run when a webhook is called';
      case WorkflowTriggerType.manual:
        return 'Run manually when you choose';
    }
  }
}
