import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';

class AddCategoryScreen extends StatefulWidget {
  final String budgetId;

  const AddCategoryScreen({super.key, required this.budgetId});

  @override
  State<AddCategoryScreen> createState() => _AddCategoryScreenState();
}

class _AddCategoryScreenState extends State<AddCategoryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();

  String _selectedType = CategoryTypes.other;
  String _selectedColor = CategoryTypes.defaultColors[CategoryTypes.other]!;
  bool _isSaving = false;

  final List<String> _colorOptions = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Orange
    '#EF4444', // Red
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#6B7280', // Gray
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('budget.category.add'.tr()),
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
              onPressed: _saveCategory,
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
              // Name
              _buildSectionTitle('budget.category.name'.tr()),
              const SizedBox(height: 8),
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  hintText: 'Enter category name',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  filled: true,
                  fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Category name is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Category Type
              _buildSectionTitle('budget.category.type'.tr()),
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
                items: CategoryTypes.all.map((type) {
                  return DropdownMenuItem(
                    value: type,
                    child: Row(
                      children: [
                        Icon(_getCategoryIcon(type), size: 20),
                        const SizedBox(width: 12),
                        Text('budget.category.type_options.$type'.tr()),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _selectedType = value;
                      _selectedColor = CategoryTypes.defaultColors[value] ?? _selectedColor;
                    });
                  }
                },
              ),
              const SizedBox(height: 20),

              // Allocated Amount
              _buildSectionTitle('budget.category.allocated'.tr()),
              const SizedBox(height: 8),
              TextFormField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  hintText: '0.00',
                  prefixText: '\$ ',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  filled: true,
                  fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Allocated amount is required';
                  }
                  final amount = double.tryParse(value);
                  if (amount == null || amount < 0) {
                    return 'Enter a valid amount';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Color Picker
              _buildSectionTitle('budget.category.color'.tr()),
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
                child: Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: _colorOptions.map((color) {
                    final isSelected = _selectedColor == color;
                    final colorValue = Color(int.parse(color.replaceFirst('#', '0xFF')));
                    return GestureDetector(
                      onTap: () => setState(() => _selectedColor = color),
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: colorValue,
                          borderRadius: BorderRadius.circular(10),
                          border: isSelected
                              ? Border.all(color: Colors.white, width: 3)
                              : null,
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color: colorValue.withValues(alpha: 0.5),
                                    blurRadius: 8,
                                    spreadRadius: 2,
                                  ),
                                ]
                              : null,
                        ),
                        child: isSelected
                            ? const Icon(Icons.check, color: Colors.white, size: 20)
                            : null,
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 20),

              // Description
              _buildSectionTitle('budget.description'.tr()),
              const SizedBox(height: 8),
              TextFormField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Add description (optional)',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  filled: true,
                  fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                ),
              ),
              const SizedBox(height: 40),

              // Preview
              _buildSectionTitle('Preview'),
              const SizedBox(height: 8),
              _buildPreviewCard(isDark),
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

  Widget _buildPreviewCard(bool isDark) {
    final colorValue = Color(int.parse(_selectedColor.replaceFirst('#', '0xFF')));
    final amount = double.tryParse(_amountController.text) ?? 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade800 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey.shade700 : Colors.grey.shade200,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: colorValue.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              _getCategoryIcon(_selectedType),
              color: colorValue,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _nameController.text.isEmpty ? 'Category Name' : _nameController.text,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  'budget.category.type_options.$_selectedType'.tr(),
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
          Text(
            BudgetService.formatCurrency(amount, 'USD'),
            style: const TextStyle(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getCategoryIcon(String type) {
    switch (type) {
      case 'labor':
        return Icons.people_outline;
      case 'materials':
        return Icons.inventory_2_outlined;
      case 'software':
        return Icons.code;
      case 'travel':
        return Icons.flight_outlined;
      case 'overhead':
        return Icons.business_outlined;
      default:
        return Icons.category_outlined;
    }
  }

  Future<void> _saveCategory() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isSaving = true);

    try {
      final request = CreateCategoryRequest(
        name: _nameController.text.trim(),
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        allocatedAmount: double.parse(_amountController.text.trim()),
        categoryType: _selectedType,
        color: _selectedColor,
      );

      await BudgetService.instance.createCategory(widget.budgetId, request);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('budget.category_added'.tr()),
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
