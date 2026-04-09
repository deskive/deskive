import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:easy_localization/easy_localization.dart';
import 'project_model.dart';
import 'project_service.dart';

class EnhancedCreateProjectScreen extends StatefulWidget {
  const EnhancedCreateProjectScreen({super.key});

  @override
  State<EnhancedCreateProjectScreen> createState() => _EnhancedCreateProjectScreenState();
}

class _EnhancedCreateProjectScreenState extends State<EnhancedCreateProjectScreen>
    with SingleTickerProviderStateMixin {
  final ProjectService _projectService = ProjectService();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  
  late TabController _tabController;
  
  // Form controllers
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _estimatedHoursController = TextEditingController();
  final TextEditingController _budgetController = TextEditingController();
  
  // Form state
  ProjectType _selectedType = ProjectType.kanban;
  ProjectPriority _selectedPriority = ProjectPriority.medium;
  DateTime? _startDate;
  DateTime? _endDate;
  bool _isTemplate = false;
  ProjectTemplate? _selectedTemplate;
  List<ProjectTemplate> _templates = [];
  List<KanbanStage> _customStages = [];
  
  bool _isLoading = false;
  bool _showAdvancedOptions = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadTemplates();
    _initializeDefaultStages();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _descriptionController.dispose();
    _estimatedHoursController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  Future<void> _loadTemplates() async {
    try {
      final templates = await _projectService.getProjectTemplates();
      setState(() => _templates = templates);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading templates: $e')),
        );
      }
    }
  }

  void _initializeDefaultStages() {
    _customStages = List.from(KanbanStage.getDefaultStages());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('projects.create_new_project'.tr()),
        actions: [
          if (_selectedTemplate != null)
            TextButton(
              onPressed: _clearTemplate,
              child: Text('projects.clear_template'.tr()),
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            // Tab Bar
            Container(
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: TabBar(
                controller: _tabController,
                tabs: [
                  Tab(icon: const Icon(Icons.info_outline), text: 'projects.basic_info'.tr()),
                  Tab(icon: const Icon(Icons.template_outlined), text: 'projects.template'.tr()),
                  Tab(icon: const Icon(Icons.tune), text: 'projects.advanced'.tr()),
                ],
              ),
            ),
            
            // Tab Content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildBasicInfoTab(),
                  _buildTemplateTab(),
                  _buildAdvancedTab(),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 4,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ElevatedButton(
                onPressed: _isLoading ? null : _createProject,
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text('projects.create_project'.tr()),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBasicInfoTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Project Name
          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Project Name *',
              hintText: 'Enter project name',
              prefixIcon: Icon(Icons.folder),
              border: OutlineInputBorder(),
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Project name is required';
              }
              return null;
            },
            textCapitalization: TextCapitalization.words,
          ),
          
          const SizedBox(height: 16),
          
          // Project Description
          TextFormField(
            controller: _descriptionController,
            decoration: const InputDecoration(
              labelText: 'Description',
              hintText: 'Enter project description',
              prefixIcon: Icon(Icons.description),
              border: OutlineInputBorder(),
            ),
            maxLines: 3,
            textCapitalization: TextCapitalization.sentences,
          ),
          
          const SizedBox(height: 16),
          
          // Project Type
          DropdownButtonFormField<ProjectType>(
            value: _selectedType,
            decoration: InputDecoration(
              labelText: 'projects.project_type_required'.tr(),
              prefixIcon: const Icon(Icons.category),
              border: const OutlineInputBorder(),
            ),
            items: ProjectType.values.map((type) => DropdownMenuItem(
              value: type,
              child: Row(
                children: [
                  Icon(_getProjectTypeIcon(type), size: 20),
                  const SizedBox(width: 8),
                  Text(_getTranslatedProjectTypeName(type)),
                ],
              ),
            )).toList(),
            onChanged: (value) {
              setState(() {
                _selectedType = value!;
                // Reset template if type changes
                if (_selectedTemplate != null && _selectedTemplate!.type != value) {
                  _selectedTemplate = null;
                }
                // Update stages for kanban projects
                if (value == ProjectType.kanban) {
                  _customStages = List.from(KanbanStage.getDefaultStages());
                }
              });
            },
          ),
          
          const SizedBox(height: 16),
          
          // Priority
          DropdownButtonFormField<ProjectPriority>(
            value: _selectedPriority,
            decoration: InputDecoration(
              labelText: 'projects.priority'.tr(),
              prefixIcon: const Icon(Icons.flag),
              border: const OutlineInputBorder(),
            ),
            items: ProjectPriority.values.map((priority) => DropdownMenuItem(
              value: priority,
              child: Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: _getPriorityColor(priority),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(_getTranslatedProjectPriorityName(priority)),
                ],
              ),
            )).toList(),
            onChanged: (value) => setState(() => _selectedPriority = value!),
          ),
          
          const SizedBox(height: 16),
          
          // Date Range
          Row(
            children: [
              Expanded(
                child: _buildDateField(
                  label: 'Start Date',
                  icon: Icons.play_arrow,
                  date: _startDate,
                  onTap: () => _selectDate(isStartDate: true),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildDateField(
                  label: 'End Date',
                  icon: Icons.flag,
                  date: _endDate,
                  onTap: () => _selectDate(isStartDate: false),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Advanced Options Toggle
          ExpansionTile(
            title: const Text('Additional Options'),
            leading: const Icon(Icons.tune),
            children: [
              // Estimated Hours
              TextFormField(
                controller: _estimatedHoursController,
                decoration: const InputDecoration(
                  labelText: 'Estimated Hours',
                  hintText: 'Total estimated hours',
                  prefixIcon: Icon(Icons.schedule),
                  border: OutlineInputBorder(),
                  suffixText: 'hours',
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value != null && value.isNotEmpty) {
                    final hours = double.tryParse(value);
                    if (hours == null || hours < 0) {
                      return 'Enter a valid number of hours';
                    }
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Budget
              TextFormField(
                controller: _budgetController,
                decoration: const InputDecoration(
                  labelText: 'Budget',
                  hintText: 'Project budget',
                  prefixIcon: Icon(Icons.attach_money),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value != null && value.isNotEmpty) {
                    final budget = double.tryParse(value);
                    if (budget == null || budget < 0) {
                      return 'Enter a valid budget amount';
                    }
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Save as Template
              SwitchListTile(
                title: const Text('Save as Template'),
                subtitle: const Text('Make this project available as a template'),
                value: _isTemplate,
                onChanged: (value) => setState(() => _isTemplate = value),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTemplateTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_selectedTemplate != null) ...[
            // Selected Template Card
            Card(
              color: Theme.of(context).primaryColor.withOpacity(0.1),
              child: ListTile(
                leading: Icon(
                  _getProjectTypeIcon(_selectedTemplate!.type),
                  color: Theme.of(context).primaryColor,
                ),
                title: Text(
                  _selectedTemplate!.name,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
                subtitle: Text(_selectedTemplate!.description ?? ''),
                trailing: IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: _clearTemplate,
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Template Details
            if (_selectedTemplate!.taskTemplates != null &&
                _selectedTemplate!.taskTemplates!.isNotEmpty) ...[
              const Text(
                'Template Tasks:',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              ...(_selectedTemplate!.taskTemplates!.map((taskTemplate) => Card(
                child: ListTile(
                  leading: Icon(_getTaskTypeIcon(taskTemplate.taskType)),
                  title: Text(taskTemplate.name),
                  subtitle: Text(taskTemplate.description ?? ''),
                  trailing: Chip(
                    label: Text(_getTranslatedTaskPriorityName(taskTemplate.priority)),
                    backgroundColor: _getPriorityColor(taskTemplate.priority),
                  ),
                ),
              ))),
              
              const SizedBox(height: 16),
            ],
          ] else ...[
            // Template Selection
            const Text(
              'Choose a Template',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            
            const SizedBox(height: 8),
            
            const Text(
              'Start with a pre-configured project template or create from scratch.',
              style: TextStyle(color: Colors.grey),
            ),
            
            const SizedBox(height: 16),
            
            // Template Grid
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 1.2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: _templates.length + 1, // +1 for blank template
              itemBuilder: (context, index) {
                if (index == 0) {
                  // Blank Template
                  return _buildTemplateCard(
                    title: 'Blank Project',
                    description: 'Start with an empty project',
                    icon: Icons.add_box_outlined,
                    type: _selectedType,
                    onTap: _clearTemplate,
                  );
                }
                
                final template = _templates[index - 1];
                return _buildTemplateCard(
                  title: template.name,
                  description: template.description ?? '',
                  icon: _getProjectTypeIcon(template.type),
                  type: template.type,
                  onTap: () => _selectTemplate(template),
                  isSelected: _selectedTemplate == template,
                );
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAdvancedTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Kanban Stages (only for Kanban projects)
          if (_selectedType == ProjectType.kanban) ...[
            const Text(
              'Kanban Board Stages',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            
            const SizedBox(height: 8),
            
            const Text(
              'Customize the stages for your Kanban board.',
              style: TextStyle(color: Colors.grey),
            ),
            
            const SizedBox(height: 16),
            
            // Stages List
            ReorderableListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _customStages.length,
              onReorder: (oldIndex, newIndex) {
                setState(() {
                  if (newIndex > oldIndex) {
                    newIndex -= 1;
                  }
                  final stage = _customStages.removeAt(oldIndex);
                  _customStages.insert(newIndex, stage);
                  
                  // Update order values
                  for (int i = 0; i < _customStages.length; i++) {\n                    _customStages[i] = KanbanStage(\n                      id: _customStages[i].id,\n                      name: _customStages[i].name,\n                      order: i + 1,\n                      color: _customStages[i].color,\n                    );\n                  }
                });
              },
              itemBuilder: (context, index) {
                final stage = _customStages[index];
                return Card(
                  key: ValueKey(stage.id),
                  child: ListTile(
                    leading: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color: Color(int.parse(stage.color.replaceFirst('#', '0xFF'))),
                        shape: BoxShape.circle,
                      ),
                    ),
                    title: Text(stage.name),
                    subtitle: Text('Order: ${stage.order}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () => _editStage(index),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete),
                          onPressed: _customStages.length > 2
                              ? () => _deleteStage(index)
                              : null, // Don't allow deleting if less than 2 stages
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
            
            const SizedBox(height: 16),
            
            // Add Stage Button
            OutlinedButton.icon(
              onPressed: _addStage,
              icon: const Icon(Icons.add),
              label: const Text('Add Stage'),
            ),
            
            const SizedBox(height: 24),
          ],
          
          // Additional Settings
          const Text(
            'Additional Settings',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          
          const SizedBox(height: 16),
          
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  // Auto-assign tasks
                  SwitchListTile(
                    title: const Text('Auto-assign Tasks'),
                    subtitle: const Text('Automatically assign new tasks to project owner'),
                    value: false, // This could be a state variable
                    onChanged: (value) {
                      // Handle auto-assign setting
                    },
                  ),
                  
                  // Email notifications
                  SwitchListTile(
                    title: const Text('Email Notifications'),
                    subtitle: const Text('Send email notifications for project updates'),
                    value: true, // This could be a state variable
                    onChanged: (value) {
                      // Handle email notifications setting
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateField({
    required String label,
    required IconData icon,
    DateTime? date,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon),
          border: const OutlineInputBorder(),
        ),
        child: Text(
          date != null 
              ? DateFormat('MMM dd, yyyy').format(date)
              : 'Select date',
          style: TextStyle(
            color: date != null ? null : Colors.grey,
          ),
        ),
      ),
    );
  }

  Widget _buildTemplateCard({
    required String title,
    required String description,
    required IconData icon,
    required ProjectType type,
    required VoidCallback onTap,
    bool isSelected = false,
  }) {
    return Card(
      elevation: isSelected ? 8 : 2,
      color: isSelected 
          ? Theme.of(context).primaryColor.withOpacity(0.1)
          : null,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 32,
                color: isSelected 
                    ? Theme.of(context).primaryColor
                    : Colors.grey[600],
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isSelected 
                      ? Theme.of(context).primaryColor
                      : null,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getProjectTypeIcon(ProjectType type) {
    switch (type) {
      case ProjectType.kanban:
        return Icons.view_kanban;
      case ProjectType.scrum:
        return Icons.sprint;
      case ProjectType.waterfall:
        return Icons.water_drop;
      case ProjectType.task:
        return Icons.task;
      case ProjectType.development:
        return Icons.code;
      case ProjectType.design:
        return Icons.palette;
      case ProjectType.research:
        return Icons.science;
    }
  }

  IconData _getTaskTypeIcon(TaskType type) {
    switch (type) {
      case TaskType.task:
        return Icons.task;
      case TaskType.story:
        return Icons.book;
      case TaskType.bug:
        return Icons.bug_report;
      case TaskType.epic:
        return Icons.flag;
      case TaskType.subtask:
        return Icons.subdirectory_arrow_right;
    }
  }

  Color _getPriorityColor(TaskPriority priority) {
    switch (priority) {
      case TaskPriority.lowest:
        return Colors.grey;
      case TaskPriority.low:
        return Colors.blue;
      case TaskPriority.medium:
        return Colors.orange;
      case TaskPriority.high:
        return Colors.red;
      case TaskPriority.highest:
        return Colors.purple;
    }
  }

  String _getTranslatedProjectTypeName(ProjectType type) {
    switch (type) {
      case ProjectType.kanban:
        return 'projects.type_kanban'.tr();
      case ProjectType.scrum:
        return 'projects.type_scrum'.tr();
      case ProjectType.waterfall:
        return 'projects.type_waterfall'.tr();
      case ProjectType.task:
        return 'projects.type_task'.tr();
      case ProjectType.development:
        return 'projects.type_development'.tr();
      case ProjectType.design:
        return 'projects.type_design'.tr();
      case ProjectType.research:
        return 'projects.type_research'.tr();
    }
  }

  String _getTranslatedProjectPriorityName(ProjectPriority priority) {
    switch (priority) {
      case ProjectPriority.low:
        return 'tasks.priority_low'.tr();
      case ProjectPriority.medium:
        return 'tasks.priority_medium'.tr();
      case ProjectPriority.high:
        return 'tasks.priority_high'.tr();
      case ProjectPriority.critical:
        return 'tasks.priority_highest'.tr();
    }
  }

  String _getTranslatedTaskPriorityName(TaskPriority priority) {
    switch (priority) {
      case TaskPriority.lowest:
        return 'tasks.priority_lowest'.tr();
      case TaskPriority.low:
        return 'tasks.priority_low'.tr();
      case TaskPriority.medium:
        return 'tasks.priority_medium'.tr();
      case TaskPriority.high:
        return 'tasks.priority_high'.tr();
      case TaskPriority.highest:
        return 'tasks.priority_highest'.tr();
    }
  }

  Future<void> _selectDate({required bool isStartDate}) async {
    final initialDate = isStartDate 
        ? (_startDate ?? DateTime.now())
        : (_endDate ?? _startDate ?? DateTime.now());
    
    final date = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );
    
    if (date != null) {
      setState(() {
        if (isStartDate) {
          _startDate = date;
          // If end date is before start date, clear it
          if (_endDate != null && _endDate!.isBefore(date)) {
            _endDate = null;
          }
        } else {
          _endDate = date;
        }
      });
    }
  }

  void _selectTemplate(ProjectTemplate template) {
    setState(() {
      _selectedTemplate = template;
      _selectedType = template.type;
      
      // Update custom stages if it's a Kanban template
      if (template.type == ProjectType.kanban && 
          template.kanbanStages != null && 
          template.kanbanStages!.isNotEmpty) {
        _customStages = List.from(template.kanbanStages!);
      }
    });
  }

  void _clearTemplate() {
    setState(() {
      _selectedTemplate = null;
      _initializeDefaultStages();
    });
  }

  void _addStage() {
    showDialog(
      context: context,
      builder: (context) => _StageEditDialog(
        onSave: (name, color) {
          setState(() {
            _customStages.add(KanbanStage(
              id: 'stage_${DateTime.now().millisecondsSinceEpoch}',
              name: name,
              order: _customStages.length + 1,
              color: color,
            ));
          });
        },
      ),
    );
  }

  void _editStage(int index) {
    final stage = _customStages[index];
    showDialog(
      context: context,
      builder: (context) => _StageEditDialog(
        initialName: stage.name,
        initialColor: stage.color,
        onSave: (name, color) {
          setState(() {
            _customStages[index] = KanbanStage(
              id: stage.id,
              name: name,
              order: stage.order,
              color: color,
            );
          });
        },
      ),
    );
  }

  void _deleteStage(int index) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Stage'),
        content: Text('Are you sure you want to delete "${_customStages[index].name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              setState(() {
                _customStages.removeAt(index);
                // Update order values
                for (int i = 0; i < _customStages.length; i++) {
                  _customStages[i] = KanbanStage(
                    id: _customStages[i].id,
                    name: _customStages[i].name,
                    order: i + 1,
                    color: _customStages[i].color,
                  );
                }
              });
              Navigator.pop(context);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _createProject() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    setState(() => _isLoading = true);
    
    try {
      final project = await _projectService.createProject(
        name: _nameController.text.trim(),
        description: _descriptionController.text.trim().isNotEmpty 
            ? _descriptionController.text.trim() 
            : null,
        type: _selectedType,
        priority: _selectedPriority,
        startDate: _startDate,
        endDate: _endDate,
        estimatedHours: _estimatedHoursController.text.isNotEmpty 
            ? double.tryParse(_estimatedHoursController.text) 
            : null,
        budget: _budgetController.text.isNotEmpty 
            ? double.tryParse(_budgetController.text) 
            : null,
        isTemplate: _isTemplate,
        kanbanStages: _selectedType == ProjectType.kanban 
            ? _customStages 
            : null,
        template: _selectedTemplate,
      );
      
      if (project != null && mounted) {
        Navigator.pop(context, project);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Project created successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create project'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error creating project: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}

class _StageEditDialog extends StatefulWidget {
  final String? initialName;
  final String? initialColor;
  final Function(String name, String color) onSave;

  const _StageEditDialog({
    this.initialName,
    this.initialColor,
    required this.onSave,
  });

  @override
  State<_StageEditDialog> createState() => _StageEditDialogState();
}

class _StageEditDialogState extends State<_StageEditDialog> {
  late TextEditingController _nameController;
  String _selectedColor = '#6B7280';

  final List<String> _colors = [
    '#6B7280', '#3B82F6', '#10B981', '#F59E0B', 
    '#EF4444', '#8B5CF6', '#F97316', '#06B6D4'
  ];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialName ?? '');
    _selectedColor = widget.initialColor ?? '#6B7280';
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.initialName != null ? 'Edit Stage' : 'Add Stage'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Stage Name',
              border: OutlineInputBorder(),
            ),
            textCapitalization: TextCapitalization.words,
          ),
          
          const SizedBox(height: 16),
          
          const Text('Color'),
          const SizedBox(height: 8),
          
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _colors.map((color) => GestureDetector(
              onTap: () => setState(() => _selectedColor = color),
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Color(int.parse(color.replaceFirst('#', '0xFF'))),
                  shape: BoxShape.circle,
                  border: _selectedColor == color
                      ? Border.all(color: Colors.black, width: 2)
                      : null,
                ),
                child: _selectedColor == color
                    ? const Icon(Icons.check, color: Colors.white, size: 16)
                    : null,
              ),
            )).toList(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            if (_nameController.text.trim().isNotEmpty) {
              widget.onSave(_nameController.text.trim(), _selectedColor);
              Navigator.pop(context);
            }
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}