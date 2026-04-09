import 'package:flutter/material.dart';
import '../../../api/services/workflow_api_service.dart';
import '../../../models/workflow.dart';
import '../../../services/workspace_service.dart';

class NaturalLanguageBuilderSheet extends StatefulWidget {
  final String? workspaceId;
  final Function(Workflow)? onWorkflowCreated;
  final Function(Map<String, dynamic>)? onEditWorkflow;

  const NaturalLanguageBuilderSheet({
    super.key,
    this.workspaceId,
    this.onWorkflowCreated,
    this.onEditWorkflow,
  });

  @override
  State<NaturalLanguageBuilderSheet> createState() => _NaturalLanguageBuilderSheetState();
}

class _NaturalLanguageBuilderSheetState extends State<NaturalLanguageBuilderSheet> {
  final _descriptionController = TextEditingController();
  bool _isGenerating = false;
  bool _isCreating = false;
  GeneratedWorkflowResult? _generatedResult;
  String? _error;
  List<String> _suggestions = [];

  @override
  void initState() {
    super.initState();
    _loadInitialSuggestions();
    _descriptionController.addListener(_onDescriptionChanged);
  }

  @override
  void dispose() {
    _descriptionController.removeListener(_onDescriptionChanged);
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialSuggestions() async {
    final response = await WorkflowApiService.instance.getAISuggestions('');
    if (mounted && response.success && response.data != null) {
      setState(() {
        _suggestions = response.data!;
      });
    }
  }

  void _onDescriptionChanged() {
    // Debounce suggestion updates
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted && _descriptionController.text.isNotEmpty) {
        _updateSuggestions();
      }
    });
  }

  Future<void> _updateSuggestions() async {
    final response = await WorkflowApiService.instance.getAISuggestions(
      _descriptionController.text,
    );
    if (mounted && response.success && response.data != null) {
      setState(() {
        _suggestions = response.data!;
      });
    }
  }

  String? get _workspaceId => widget.workspaceId ?? WorkspaceService.instance.currentWorkspace?.id;

  Future<void> _generateWorkflow() async {
    if (_descriptionController.text.trim().isEmpty) {
      setState(() {
        _error = 'Please enter a description';
      });
      return;
    }

    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      setState(() {
        _error = 'No workspace selected';
      });
      return;
    }

    setState(() {
      _isGenerating = true;
      _error = null;
      _generatedResult = null;
    });

    final response = await WorkflowApiService.instance.generateWorkflow(
      workspaceId,
      _descriptionController.text.trim(),
    );

    if (mounted) {
      setState(() {
        _isGenerating = false;
        if (response.success && response.data != null) {
          _generatedResult = response.data;
        } else {
          _error = response.error ?? 'Failed to generate workflow';
        }
      });
    }
  }

  Future<void> _createWorkflow() async {
    if (_generatedResult == null) return;

    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      setState(() {
        _error = 'No workspace selected';
      });
      return;
    }

    setState(() {
      _isCreating = true;
      _error = null;
    });

    final response = await WorkflowApiService.instance.generateAndCreateWorkflow(
      workspaceId,
      _descriptionController.text.trim(),
    );

    if (mounted) {
      setState(() {
        _isCreating = false;
      });

      if (response.success && response.data != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Workflow created successfully!')),
        );
        widget.onWorkflowCreated?.call(response.data!);
        Navigator.pop(context, response.data);
      } else {
        setState(() {
          _error = response.error ?? 'Failed to create workflow';
        });
      }
    }
  }

  void _useSuggestion(String suggestion) {
    _descriptionController.text = suggestion;
    _generateWorkflow();
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
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Icons.auto_awesome,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'AI Automation Builder',
                            style: theme.textTheme.titleLarge,
                          ),
                          Text(
                            'Describe what you want to automate',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurface.withOpacity(0.6),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
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
                    // Description input
                    TextField(
                      controller: _descriptionController,
                      maxLines: 4,
                      decoration: InputDecoration(
                        hintText: 'Example: "When a high-priority task is created, notify the team lead and send a Slack message to the #urgent channel"',
                        labelText: 'Describe your automation',
                        border: const OutlineInputBorder(),
                        alignLabelWithHint: true,
                        suffixIcon: _descriptionController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  _descriptionController.clear();
                                  setState(() {
                                    _generatedResult = null;
                                    _error = null;
                                  });
                                },
                              )
                            : null,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Generate button
                    ElevatedButton.icon(
                      onPressed: _isGenerating ? null : _generateWorkflow,
                      icon: _isGenerating
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.auto_awesome),
                      label: Text(_isGenerating ? 'Generating...' : 'Generate Workflow'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),

                    // Error message
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.errorContainer,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.error_outline, color: theme.colorScheme.error),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                _error!,
                                style: TextStyle(color: theme.colorScheme.onErrorContainer),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Suggestions
                    if (_suggestions.isNotEmpty && _generatedResult == null) ...[
                      const SizedBox(height: 24),
                      Text(
                        'SUGGESTIONS',
                        style: theme.textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _suggestions.map((suggestion) {
                          return ActionChip(
                            label: Text(
                              suggestion.length > 50
                                  ? '${suggestion.substring(0, 50)}...'
                                  : suggestion,
                            ),
                            onPressed: () => _useSuggestion(suggestion),
                          );
                        }).toList(),
                      ),
                    ],

                    // Generated result
                    if (_generatedResult != null) ...[
                      const SizedBox(height: 24),
                      _buildGeneratedResult(theme),
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

  Widget _buildGeneratedResult(ThemeData theme) {
    final result = _generatedResult!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Confidence indicator
        Row(
          children: [
            Icon(
              result.confidence >= 0.8
                  ? Icons.check_circle
                  : result.confidence >= 0.5
                      ? Icons.info
                      : Icons.warning,
              color: result.confidence >= 0.8
                  ? Colors.green
                  : result.confidence >= 0.5
                      ? Colors.orange
                      : Colors.red,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              'Confidence: ${(result.confidence * 100).toStringAsFixed(0)}%',
              style: theme.textTheme.labelMedium,
            ),
          ],
        ),

        const SizedBox(height: 16),

        // Warnings
        if (result.warnings.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.orange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.orange.withOpacity(0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.warning_amber, color: Colors.orange, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Warnings',
                      style: theme.textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.orange,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ...result.warnings.map((warning) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('• $warning', style: theme.textTheme.bodySmall),
                )),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Workflow preview
        Text(
          'GENERATED WORKFLOW',
          style: theme.textTheme.labelMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: theme.colorScheme.primary,
          ),
        ),
        const SizedBox(height: 12),

        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name
                Row(
                  children: [
                    Icon(
                      Icons.auto_awesome,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        result.workflow['name'] ?? 'Untitled Workflow',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),

                if (result.workflow['description'] != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    result.workflow['description'],
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.7),
                    ),
                  ),
                ],

                const Divider(height: 24),

                // Trigger
                Text(
                  'TRIGGER',
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                _buildTriggerChip(theme, result.workflow['triggerType'], result.workflow['triggerConfig']),

                const SizedBox(height: 16),

                // Steps
                Text(
                  'STEPS',
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                ...((result.workflow['steps'] as List?) ?? []).asMap().entries.map((entry) {
                  final index = entry.key;
                  final step = entry.value as Map<String, dynamic>;
                  return _buildStepPreview(theme, index + 1, step);
                }),
              ],
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Suggestions for improvement
        if (result.suggestions.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer.withOpacity(0.3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.lightbulb_outline, color: theme.colorScheme.primary, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Suggestions',
                      style: theme.textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ...result.suggestions.map((suggestion) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('• $suggestion', style: theme.textTheme.bodySmall),
                )),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Action buttons
        Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      setState(() {
                        _generatedResult = null;
                      });
                    },
                    child: const Text('Regenerate'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: _isCreating ? null : _createWorkflow,
                    icon: _isCreating
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.add),
                    label: Text(_isCreating ? 'Creating...' : 'Create Workflow'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
              ],
            ),
            if (widget.onEditWorkflow != null) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: () {
                    widget.onEditWorkflow?.call(_generatedResult!.workflow);
                  },
                  icon: const Icon(Icons.edit),
                  label: const Text('Edit before creating'),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildTriggerChip(ThemeData theme, String? triggerType, Map<String, dynamic>? config) {
    String label;
    IconData icon;

    switch (triggerType) {
      case 'entity_change':
        final entityType = config?['entityType'] ?? 'entity';
        final eventType = config?['eventType'] ?? 'changes';
        label = 'When $entityType $eventType';
        icon = Icons.bolt;
        break;
      case 'schedule':
        final cron = config?['cronExpression'] ?? 'scheduled';
        label = 'Schedule: $cron';
        icon = Icons.schedule;
        break;
      case 'webhook':
        label = 'Webhook trigger';
        icon = Icons.webhook;
        break;
      default:
        label = 'Manual trigger';
        icon = Icons.play_arrow;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: theme.colorScheme.primary),
          const SizedBox(width: 8),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onPrimaryContainer,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepPreview(ThemeData theme, int stepNumber, Map<String, dynamic> step) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '$stepNumber',
                style: TextStyle(
                  color: theme.colorScheme.onPrimary,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step['name'] ?? 'Step $stepNumber',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (step['actionType'] != null)
                  Text(
                    step['actionType'].toString().replaceAll('_', ' '),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

