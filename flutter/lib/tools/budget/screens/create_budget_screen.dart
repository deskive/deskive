import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';
import '../../../projects/project_service.dart';
import '../../../projects/project_model.dart';

class CreateBudgetScreen extends StatefulWidget {
  final Budget? budget; // If provided, edit mode

  const CreateBudgetScreen({super.key, this.budget});

  @override
  State<CreateBudgetScreen> createState() => _CreateBudgetScreenState();
}

class _CreateBudgetScreenState extends State<CreateBudgetScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _amountController = TextEditingController();

  String _selectedType = BudgetTypes.project;
  String _selectedCurrency = 'USD';
  int _alertThreshold = 80;
  DateTime? _startDate;
  DateTime? _endDate;
  bool _createDefaultCategories = true;
  bool _isSaving = false;

  // Project linking
  final ProjectService _projectService = ProjectService();
  List<Project> _projects = [];
  String? _selectedProjectId;
  bool _isLoadingProjects = true;
  bool _autoCreateCategoriesFromProject = false;

  bool get _isEditMode => widget.budget != null;

  @override
  void initState() {
    super.initState();
    _loadProjects();
    if (_isEditMode) {
      _nameController.text = widget.budget!.name;
      _descriptionController.text = widget.budget!.description ?? '';
      _amountController.text = widget.budget!.totalBudget.toString();
      _selectedType = widget.budget!.budgetType;
      _selectedCurrency = widget.budget!.currency;
      _alertThreshold = widget.budget!.alertThreshold;
      _startDate = widget.budget!.startDate;
      _endDate = widget.budget!.endDate;
      _selectedProjectId = widget.budget!.projectId;
    }
  }

  Future<void> _loadProjects() async {
    try {
      final projects = await _projectService.getActiveProjects();
      if (mounted) {
        setState(() {
          _projects = projects;
          _isLoadingProjects = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingProjects = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditMode ? 'budget.edit'.tr() : 'budget.create'.tr()),
        actions: [
          if (_isSaving)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          else
            TextButton(
              onPressed: _saveBudget,
              child: Text(
                'common.save'.tr(),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Name field
              _buildSectionTitle('budget.name'.tr()),
              const SizedBox(height: 8),
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  hintText: 'Enter budget name',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  filled: true,
                  fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Budget name is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Description field
              _buildSectionTitle('budget.description'.tr()),
              const SizedBox(height: 8),
              TextFormField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Enter description (optional)',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  filled: true,
                  fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                ),
              ),
              const SizedBox(height: 20),

              // Budget Type dropdown
              _buildSectionTitle('budget.type'.tr()),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _selectedType,
                decoration: InputDecoration(
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  filled: true,
                  fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                ),
                items: BudgetTypes.all.map((type) {
                  return DropdownMenuItem(
                    value: type,
                    child: Text('budget.type_options.$type'.tr()),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _selectedType = value);
                  }
                },
              ),
              const SizedBox(height: 20),

              // Link to Project (Optional)
              _buildSectionTitle('Link to Project (Optional)'),
              const SizedBox(height: 8),
              _buildProjectDropdown(isDark),
              const SizedBox(height: 20),

              // Amount and Currency row
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildSectionTitle('budget.total_budget'.tr()),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _amountController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: InputDecoration(
                            hintText: '0.00',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            filled: true,
                            fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Amount is required';
                            }
                            final amount = double.tryParse(value);
                            if (amount == null || amount < 0) {
                              return 'Enter a valid amount';
                            }
                            return null;
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildSectionTitle('budget.currency'.tr()),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          value: _selectedCurrency,
                          decoration: InputDecoration(
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            filled: true,
                            fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                          ),
                          items: Currencies.supported.map((currency) {
                            return DropdownMenuItem(
                              value: currency,
                              child: Text(currency),
                            );
                          }).toList(),
                          onChanged: (value) {
                            if (value != null) {
                              setState(() => _selectedCurrency = value);
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Date range
              _buildSectionTitle('Date Range'),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildDatePicker(
                      label: 'budget.start_date'.tr(),
                      date: _startDate,
                      onTap: () => _selectDate(isStartDate: true),
                      isDark: isDark,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildDatePicker(
                      label: 'budget.end_date'.tr(),
                      date: _endDate,
                      onTap: () => _selectDate(isStartDate: false),
                      isDark: isDark,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Alert Threshold
              _buildSectionTitle('budget.alert_threshold'.tr()),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? Colors.grey.shade800 : Colors.grey.shade300,
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Alert when budget reaches:',
                          style: TextStyle(
                            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                          ),
                        ),
                        Text(
                          '$_alertThreshold%',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _alertThreshold >= 90
                                ? Colors.red
                                : (_alertThreshold >= 70 ? Colors.orange : Colors.teal),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Slider(
                      value: _alertThreshold.toDouble(),
                      min: 50,
                      max: 100,
                      divisions: 10,
                      activeColor: Colors.teal,
                      onChanged: (value) {
                        setState(() => _alertThreshold = value.toInt());
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Create default categories (only for new budgets and when no project is selected)
              if (!_isEditMode && _selectedProjectId == null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark ? Colors.grey.shade800 : Colors.grey.shade300,
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'budget.create_default_categories'.tr(),
                              style: const TextStyle(fontWeight: FontWeight.w500),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Creates Labor, Materials, Software, Travel, and Overhead categories',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: _createDefaultCategories,
                        onChanged: (value) {
                          setState(() => _createDefaultCategories = value);
                        },
                        activeTrackColor: Colors.teal.withValues(alpha: 0.5),
                        thumbColor: WidgetStateProperty.resolveWith((states) =>
                            states.contains(WidgetState.selected)
                                ? Colors.teal
                                : null),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildDatePicker({
    required String label,
    required DateTime? date,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? Colors.grey.shade800 : Colors.grey.shade300,
          ),
        ),
        child: Row(
          children: [
            Icon(
              Icons.calendar_today_outlined,
              size: 18,
              color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                date != null ? DateFormat('MMM d, y').format(date) : label,
                style: TextStyle(
                  color: date != null
                      ? (isDark ? Colors.white : Colors.black)
                      : (isDark ? Colors.grey.shade500 : Colors.grey.shade600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProjectDropdown(bool isDark) {
    if (_isLoadingProjects) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? Colors.grey.shade800 : Colors.grey.shade300,
          ),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(
                  isDark ? Colors.grey.shade500 : Colors.grey.shade600,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Loading projects...',
              style: TextStyle(
                color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DropdownButtonFormField<String?>(
          value: _selectedProjectId,
          isExpanded: true,
          decoration: InputDecoration(
            hintText: 'No project',
            prefixIcon: const Icon(Icons.folder_outlined),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            filled: true,
            fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
          ),
          selectedItemBuilder: (context) {
            // Build the selected item display for each possible value
            return [
              // For null (No project)
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('No project'),
              ),
              // For each project
              ..._projects.map((project) {
                return Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    project.name,
                    overflow: TextOverflow.ellipsis,
                  ),
                );
              }),
            ];
          },
          items: [
            const DropdownMenuItem<String?>(
              value: null,
              child: Text('No project'),
            ),
            ..._projects.map((project) {
              return DropdownMenuItem<String?>(
                value: project.id,
                child: Text(
                  project.name,
                  overflow: TextOverflow.ellipsis,
                ),
              );
            }),
          ],
          onChanged: (value) {
            setState(() {
              _selectedProjectId = value;
              // Reset auto-create categories when project changes
              if (value == null) {
                _autoCreateCategoriesFromProject = false;
              }
            });
          },
        ),
        const SizedBox(height: 8),
        Text(
          'Link this budget to a specific project for better tracking (${_projects.length} projects available)',
          style: TextStyle(
            fontSize: 12,
            color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
          ),
        ),
        // Auto-create categories from project option
        if (_selectedProjectId != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.teal.shade900.withValues(alpha: 0.3)
                  : Colors.teal.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.teal.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Auto-create categories from project',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Creates categories based on project phases',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _autoCreateCategoriesFromProject,
                  onChanged: (value) {
                    setState(() {
                      _autoCreateCategoriesFromProject = value;
                      // Disable default categories if auto-create is enabled
                      if (value) {
                        _createDefaultCategories = false;
                      }
                    });
                  },
                  activeTrackColor: Colors.teal.withValues(alpha: 0.5),
                  thumbColor: WidgetStateProperty.resolveWith((states) =>
                      states.contains(WidgetState.selected)
                          ? Colors.teal
                          : null),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _selectDate({required bool isStartDate}) async {
    final initialDate = isStartDate
        ? (_startDate ?? DateTime.now())
        : (_endDate ?? DateTime.now().add(const Duration(days: 30)));

    final pickedDate = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );

    if (pickedDate != null) {
      setState(() {
        if (isStartDate) {
          _startDate = pickedDate;
          // Ensure end date is after start date
          if (_endDate != null && _endDate!.isBefore(pickedDate)) {
            _endDate = pickedDate.add(const Duration(days: 1));
          }
        } else {
          _endDate = pickedDate;
        }
      });
    }
  }

  Future<void> _saveBudget() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isSaving = true);

    try {
      final amount = double.parse(_amountController.text.trim());

      if (_isEditMode) {
        // Update existing budget
        final request = UpdateBudgetRequest(
          name: _nameController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          totalBudget: amount,
          currency: _selectedCurrency,
          startDate: _startDate,
          endDate: _endDate,
          alertThreshold: _alertThreshold,
        );

        await BudgetService.instance.updateBudget(widget.budget!.id, request);
      } else {
        // Create new budget
        // If auto-create from project is enabled, we'll create categories based on project
        // Otherwise, use the default categories toggle
        final shouldCreateDefaultCategories = _autoCreateCategoriesFromProject || _createDefaultCategories;

        final request = CreateBudgetRequest(
          name: _nameController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          budgetType: _selectedType,
          totalBudget: amount,
          currency: _selectedCurrency,
          startDate: _startDate,
          endDate: _endDate,
          alertThreshold: _alertThreshold,
          projectId: _selectedProjectId,
          createDefaultCategories: shouldCreateDefaultCategories,
        );

        await BudgetService.instance.createBudget(request);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('budget.saved'.tr()),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}
