import 'package:flutter/material.dart';
import '../../../models/workflow.dart';

class ActionPickerSheet extends StatefulWidget {
  final WorkflowActionType? currentType;
  final Map<String, dynamic> currentConfig;

  const ActionPickerSheet({
    super.key,
    this.currentType,
    required this.currentConfig,
  });

  @override
  State<ActionPickerSheet> createState() => _ActionPickerSheetState();
}

class _ActionPickerSheetState extends State<ActionPickerSheet> {
  WorkflowActionType? _selectedType;
  late Map<String, dynamic> _config;
  String _selectedCategory = 'all';

  // Controllers for different action types
  final _recipientController = TextEditingController();
  final _subjectController = TextEditingController();
  final _bodyController = TextEditingController();
  final _urlController = TextEditingController();
  final _delayController = TextEditingController(text: '0');

  @override
  void initState() {
    super.initState();
    _selectedType = widget.currentType;
    _config = Map.from(widget.currentConfig);
    _loadExistingConfig();
  }

  void _loadExistingConfig() {
    if (_config.isEmpty) return;

    _recipientController.text = _config['recipient'] ?? _config['userId'] ?? '';
    _subjectController.text = _config['subject'] ?? _config['title'] ?? '';
    _bodyController.text = _config['body'] ?? _config['message'] ?? _config['content'] ?? '';
    _urlController.text = _config['url'] ?? '';
    _delayController.text = (_config['delayMinutes'] ?? 0).toString();
  }

  @override
  void dispose() {
    _recipientController.dispose();
    _subjectController.dispose();
    _bodyController.dispose();
    _urlController.dispose();
    _delayController.dispose();
    super.dispose();
  }

  void _save() {
    if (_selectedType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an action type')),
      );
      return;
    }

    Map<String, dynamic> config = _buildConfig();

    Navigator.pop(context, {
      'type': _selectedType,
      'config': config,
    });
  }

  Map<String, dynamic> _buildConfig() {
    switch (_selectedType) {
      case WorkflowActionType.sendEmail:
        return {
          'recipient': _recipientController.text,
          'subject': _subjectController.text,
          'body': _bodyController.text,
        };
      case WorkflowActionType.sendNotification:
        return {
          'userId': _recipientController.text,
          'title': _subjectController.text,
          'message': _bodyController.text,
        };
      case WorkflowActionType.createTask:
        return {
          'title': _subjectController.text,
          'description': _bodyController.text,
          'assigneeId': _recipientController.text,
        };
      case WorkflowActionType.updateTask:
        return {
          'taskId': _recipientController.text,
          'updates': {
            'title': _subjectController.text,
            'description': _bodyController.text,
          },
        };
      case WorkflowActionType.createNote:
        return {
          'title': _subjectController.text,
          'content': _bodyController.text,
        };
      case WorkflowActionType.createEvent:
        return {
          'title': _subjectController.text,
          'description': _bodyController.text,
        };
      case WorkflowActionType.sendSlackMessage:
        return {
          'channel': _recipientController.text,
          'message': _bodyController.text,
        };
      case WorkflowActionType.callWebhook:
        return {
          'url': _urlController.text,
          'method': 'POST',
          'body': _bodyController.text,
        };
      case WorkflowActionType.delay:
        return {
          'delayMinutes': int.tryParse(_delayController.text) ?? 0,
        };
      case WorkflowActionType.assignUser:
        return {
          'userId': _recipientController.text,
        };
      case WorkflowActionType.changeStatus:
        return {
          'status': _subjectController.text,
        };
      case WorkflowActionType.addTag:
      case WorkflowActionType.removeTag:
        return {
          'tag': _subjectController.text,
        };
      case WorkflowActionType.moveToProject:
        return {
          'projectId': _recipientController.text,
        };
      case WorkflowActionType.setDueDate:
        return {
          'daysFromNow': int.tryParse(_delayController.text) ?? 1,
        };
      case WorkflowActionType.setPriority:
        return {
          'priority': _subjectController.text,
        };
      case WorkflowActionType.requestApproval:
        return {
          'approverIds': _recipientController.text.split(',').map((e) => e.trim()).toList(),
          'message': _bodyController.text,
        };
      case WorkflowActionType.runAiAction:
        return {
          'prompt': _bodyController.text,
          'model': 'gpt-4',
        };
      default:
        return {};
    }
  }

  List<WorkflowActionType> get _filteredActions {
    if (_selectedCategory == 'all') {
      return WorkflowActionType.values;
    }
    return WorkflowActionType.values.where((type) {
      return _getCategory(type) == _selectedCategory;
    }).toList();
  }

  String _getCategory(WorkflowActionType type) {
    switch (type) {
      case WorkflowActionType.sendEmail:
      case WorkflowActionType.sendNotification:
      case WorkflowActionType.sendSlackMessage:
      case WorkflowActionType.sendMessage:
      case WorkflowActionType.postComment:
        return 'communication';
      case WorkflowActionType.createTask:
      case WorkflowActionType.updateTask:
      case WorkflowActionType.deleteTask:
      case WorkflowActionType.completeTask:
      case WorkflowActionType.assignTask:
      case WorkflowActionType.assignUser:
      case WorkflowActionType.changeStatus:
      case WorkflowActionType.addTag:
      case WorkflowActionType.removeTag:
      case WorkflowActionType.moveToProject:
      case WorkflowActionType.moveTask:
      case WorkflowActionType.duplicateTask:
      case WorkflowActionType.setDueDate:
      case WorkflowActionType.setPriority:
      case WorkflowActionType.addSubtask:
        return 'tasks';
      case WorkflowActionType.createNote:
      case WorkflowActionType.updateNote:
      case WorkflowActionType.shareNote:
      case WorkflowActionType.appendToNote:
        return 'notes';
      case WorkflowActionType.createEvent:
      case WorkflowActionType.updateEvent:
      case WorkflowActionType.sendInvite:
      case WorkflowActionType.addAttendee:
        return 'events';
      case WorkflowActionType.callWebhook:
      case WorkflowActionType.callApi:
        return 'integrations';
      case WorkflowActionType.delay:
        return 'control';
      case WorkflowActionType.requestApproval:
      case WorkflowActionType.createApproval:
      case WorkflowActionType.approve:
      case WorkflowActionType.reject:
        return 'approvals';
      case WorkflowActionType.runAiAction:
      case WorkflowActionType.aiGenerate:
      case WorkflowActionType.aiSummarize:
      case WorkflowActionType.aiTranslate:
      case WorkflowActionType.aiAnalyze:
      case WorkflowActionType.aiAutopilot:
        return 'ai';
      case WorkflowActionType.createProject:
      case WorkflowActionType.addProjectMember:
      case WorkflowActionType.updateProjectStatus:
        return 'projects';
      case WorkflowActionType.createFolder:
      case WorkflowActionType.moveFile:
      case WorkflowActionType.generateDocument:
        return 'files';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
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
                      'Select Action',
                      style: theme.textTheme.titleLarge,
                    ),
                    TextButton(
                      onPressed: _selectedType != null ? _save : null,
                      child: const Text('Done'),
                    ),
                  ],
                ),
              ),
              // Category filter
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    _CategoryChip(
                      label: 'All',
                      isSelected: _selectedCategory == 'all',
                      onTap: () => setState(() => _selectedCategory = 'all'),
                    ),
                    _CategoryChip(
                      label: 'Tasks',
                      isSelected: _selectedCategory == 'tasks',
                      onTap: () => setState(() => _selectedCategory = 'tasks'),
                    ),
                    _CategoryChip(
                      label: 'Communication',
                      isSelected: _selectedCategory == 'communication',
                      onTap: () => setState(() => _selectedCategory = 'communication'),
                    ),
                    _CategoryChip(
                      label: 'Notes',
                      isSelected: _selectedCategory == 'notes',
                      onTap: () => setState(() => _selectedCategory = 'notes'),
                    ),
                    _CategoryChip(
                      label: 'Events',
                      isSelected: _selectedCategory == 'events',
                      onTap: () => setState(() => _selectedCategory = 'events'),
                    ),
                    _CategoryChip(
                      label: 'Integrations',
                      isSelected: _selectedCategory == 'integrations',
                      onTap: () => setState(() => _selectedCategory = 'integrations'),
                    ),
                    _CategoryChip(
                      label: 'AI',
                      isSelected: _selectedCategory == 'ai',
                      onTap: () => setState(() => _selectedCategory = 'ai'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              const Divider(height: 1),
              // Content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Action type selection
                    ..._filteredActions.map((type) => _ActionTypeCard(
                      type: type,
                      isSelected: _selectedType == type,
                      onTap: () => setState(() => _selectedType = type),
                    )),

                    // Configuration based on selected type
                    if (_selectedType != null) ...[
                      const SizedBox(height: 24),
                      Text(
                        'CONFIGURE ACTION',
                        style: theme.textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildActionConfig(theme),
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

  Widget _buildActionConfig(ThemeData theme) {
    switch (_selectedType) {
      case WorkflowActionType.sendEmail:
        return _buildEmailConfig(theme);
      case WorkflowActionType.sendNotification:
        return _buildNotificationConfig(theme);
      case WorkflowActionType.createTask:
        return _buildCreateTaskConfig(theme);
      case WorkflowActionType.callWebhook:
        return _buildWebhookConfig(theme);
      case WorkflowActionType.delay:
        return _buildDelayConfig(theme);
      case WorkflowActionType.sendSlackMessage:
        return _buildSlackConfig(theme);
      case WorkflowActionType.runAiAction:
        return _buildAiConfig(theme);
      case WorkflowActionType.changeStatus:
        return _buildStatusConfig(theme);
      case WorkflowActionType.setPriority:
        return _buildPriorityConfig(theme);
      default:
        return _buildGenericConfig(theme);
    }
  }

  Widget _buildEmailConfig(ThemeData theme) {
    return Column(
      children: [
        TextFormField(
          controller: _recipientController,
          decoration: const InputDecoration(
            labelText: 'Recipient Email',
            hintText: 'user@example.com or {{triggerData.email}}',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.person),
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _subjectController,
          decoration: const InputDecoration(
            labelText: 'Subject',
            hintText: 'Email subject',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.subject),
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _bodyController,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Body',
            hintText: 'Email content. Use {{variable}} for dynamic values.',
            border: OutlineInputBorder(),
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 16),
        _buildVariableHint(theme),
      ],
    );
  }

  Widget _buildNotificationConfig(ThemeData theme) {
    return Column(
      children: [
        TextFormField(
          controller: _recipientController,
          decoration: const InputDecoration(
            labelText: 'User ID',
            hintText: '{{triggerData.assigneeId}} or specific user ID',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.person),
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _subjectController,
          decoration: const InputDecoration(
            labelText: 'Title',
            hintText: 'Notification title',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.title),
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _bodyController,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Message',
            hintText: 'Notification message',
            border: OutlineInputBorder(),
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 16),
        _buildVariableHint(theme),
      ],
    );
  }

  Widget _buildCreateTaskConfig(ThemeData theme) {
    return Column(
      children: [
        TextFormField(
          controller: _subjectController,
          decoration: const InputDecoration(
            labelText: 'Task Title',
            hintText: 'Enter task title',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.task_alt),
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _bodyController,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Description',
            hintText: 'Task description',
            border: OutlineInputBorder(),
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _recipientController,
          decoration: const InputDecoration(
            labelText: 'Assignee ID (optional)',
            hintText: '{{triggerData.userId}} or specific user ID',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.person_add),
          ),
        ),
        const SizedBox(height: 16),
        _buildVariableHint(theme),
      ],
    );
  }

  Widget _buildWebhookConfig(ThemeData theme) {
    return Column(
      children: [
        TextFormField(
          controller: _urlController,
          decoration: const InputDecoration(
            labelText: 'Webhook URL',
            hintText: 'https://api.example.com/webhook',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.link),
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _bodyController,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Request Body (JSON)',
            hintText: '{"key": "{{triggerData.value}}"}',
            border: OutlineInputBorder(),
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 16),
        _buildVariableHint(theme),
      ],
    );
  }

  Widget _buildDelayConfig(ThemeData theme) {
    return Column(
      children: [
        TextFormField(
          controller: _delayController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Delay (minutes)',
            hintText: '30',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.timer),
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: theme.colorScheme.primaryContainer.withOpacity(0.3),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(Icons.info_outline, color: theme.colorScheme.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'The workflow will pause for the specified duration before continuing to the next step.',
                  style: theme.textTheme.bodySmall,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSlackConfig(ThemeData theme) {
    return Column(
      children: [
        TextFormField(
          controller: _recipientController,
          decoration: const InputDecoration(
            labelText: 'Slack Channel',
            hintText: '#general or @username',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.tag),
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _bodyController,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Message',
            hintText: 'Slack message content',
            border: OutlineInputBorder(),
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 16),
        _buildVariableHint(theme),
      ],
    );
  }

  Widget _buildAiConfig(ThemeData theme) {
    return Column(
      children: [
        TextFormField(
          controller: _bodyController,
          maxLines: 5,
          decoration: const InputDecoration(
            labelText: 'AI Prompt',
            hintText: 'Summarize the following task: {{triggerData.title}}',
            border: OutlineInputBorder(),
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: theme.colorScheme.primaryContainer.withOpacity(0.3),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(Icons.auto_awesome, color: theme.colorScheme.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'The AI will process this prompt and the result will be available in the next step as {{previousStep.result}}.',
                  style: theme.textTheme.bodySmall,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatusConfig(ThemeData theme) {
    final statuses = ['todo', 'in_progress', 'review', 'done', 'cancelled'];
    return DropdownButtonFormField<String>(
      value: _subjectController.text.isNotEmpty ? _subjectController.text : null,
      decoration: const InputDecoration(
        labelText: 'New Status',
        border: OutlineInputBorder(),
        prefixIcon: Icon(Icons.sync),
      ),
      items: statuses.map((status) => DropdownMenuItem(
        value: status,
        child: Text(status.replaceAll('_', ' ').toUpperCase()),
      )).toList(),
      onChanged: (value) {
        if (value != null) {
          _subjectController.text = value;
        }
      },
    );
  }

  Widget _buildPriorityConfig(ThemeData theme) {
    final priorities = ['low', 'medium', 'high', 'urgent'];
    return DropdownButtonFormField<String>(
      value: _subjectController.text.isNotEmpty ? _subjectController.text : null,
      decoration: const InputDecoration(
        labelText: 'Priority',
        border: OutlineInputBorder(),
        prefixIcon: Icon(Icons.flag),
      ),
      items: priorities.map((priority) => DropdownMenuItem(
        value: priority,
        child: Text(priority.toUpperCase()),
      )).toList(),
      onChanged: (value) {
        if (value != null) {
          _subjectController.text = value;
        }
      },
    );
  }

  Widget _buildGenericConfig(ThemeData theme) {
    return Column(
      children: [
        TextFormField(
          controller: _subjectController,
          decoration: const InputDecoration(
            labelText: 'Title / Name',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _bodyController,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Content / Description',
            border: OutlineInputBorder(),
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 16),
        _buildVariableHint(theme),
      ],
    );
  }

  Widget _buildVariableHint(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.code, size: 16, color: theme.colorScheme.primary),
              const SizedBox(width: 8),
              Text(
                'Available Variables',
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              _VariableChip(label: '{{triggerData.id}}'),
              _VariableChip(label: '{{triggerData.title}}'),
              _VariableChip(label: '{{triggerData.userId}}'),
              _VariableChip(label: '{{previousStep.result}}'),
              _VariableChip(label: '{{workflow.name}}'),
            ],
          ),
        ],
      ),
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

class _ActionTypeCard extends StatelessWidget {
  final WorkflowActionType type;
  final bool isSelected;
  final VoidCallback onTap;

  const _ActionTypeCard({
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

  IconData _getIcon(WorkflowActionType type) {
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

  String _getDescription(WorkflowActionType type) {
    switch (type) {
      case WorkflowActionType.sendEmail:
        return 'Send an email to specified recipients';
      case WorkflowActionType.sendNotification:
        return 'Send a push notification to users';
      case WorkflowActionType.createTask:
        return 'Create a new task automatically';
      case WorkflowActionType.updateTask:
        return 'Update an existing task';
      case WorkflowActionType.createNote:
        return 'Create a new note';
      case WorkflowActionType.createEvent:
        return 'Create a calendar event';
      case WorkflowActionType.sendSlackMessage:
        return 'Send a message to Slack';
      case WorkflowActionType.callWebhook:
        return 'Call an external webhook URL';
      case WorkflowActionType.delay:
        return 'Wait for a specified time';
      case WorkflowActionType.assignUser:
        return 'Assign a user to an item';
      case WorkflowActionType.changeStatus:
        return 'Change the status of an item';
      case WorkflowActionType.addTag:
        return 'Add a tag to an item';
      case WorkflowActionType.removeTag:
        return 'Remove a tag from an item';
      case WorkflowActionType.moveToProject:
        return 'Move item to a different project';
      case WorkflowActionType.setDueDate:
        return 'Set or update due date';
      case WorkflowActionType.setPriority:
        return 'Set priority level';
      case WorkflowActionType.requestApproval:
        return 'Request approval from users';
      case WorkflowActionType.runAiAction:
        return 'Run an AI-powered action';
      default:
        return type.displayName;
    }
  }
}

class _VariableChip extends StatelessWidget {
  final String label;

  const _VariableChip({required this.label});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: theme.colorScheme.primary.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: theme.textTheme.bodySmall?.copyWith(
          fontFamily: 'monospace',
          color: theme.colorScheme.primary,
        ),
      ),
    );
  }
}
