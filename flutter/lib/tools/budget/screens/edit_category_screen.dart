import 'package:flutter/material.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';

/// Screen for editing an existing budget category
class EditCategoryScreen extends StatefulWidget {
  final String budgetId;
  final BudgetCategory category;

  const EditCategoryScreen({
    super.key,
    required this.budgetId,
    required this.category,
  });

  @override
  State<EditCategoryScreen> createState() => _EditCategoryScreenState();
}

class _EditCategoryScreenState extends State<EditCategoryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _allocatedAmountController = TextEditingController();

  final BudgetService _budgetService = BudgetService.instance;

  String _categoryType = CategoryTypes.other;
  String _selectedColor = '#6B7280';
  String _costNature = CostNature.variable;
  bool _isLoading = false;
  bool _isDeleting = false;

  final List<String> _availableColors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Orange
    '#EF4444', // Red
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#6B7280', // Gray
  ];

  @override
  void initState() {
    super.initState();
    _initializeForm();
  }

  void _initializeForm() {
    _nameController.text = widget.category.name;
    _descriptionController.text = widget.category.description ?? '';
    _allocatedAmountController.text = widget.category.allocatedAmount.toString();
    _categoryType = widget.category.categoryType;
    _selectedColor = widget.category.color ?? CategoryTypes.defaultColors[_categoryType] ?? '#6B7280';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _allocatedAmountController.dispose();
    super.dispose();
  }

  IconData _getCategoryIcon(String type) {
    switch (type) {
      case CategoryTypes.labor:
        return Icons.people;
      case CategoryTypes.materials:
        return Icons.inventory;
      case CategoryTypes.software:
        return Icons.code;
      case CategoryTypes.travel:
        return Icons.flight;
      case CategoryTypes.overhead:
        return Icons.business;
      default:
        return Icons.category;
    }
  }

  Future<void> _saveCategory() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final request = UpdateCategoryRequest(
        name: _nameController.text.trim(),
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        allocatedAmount: double.parse(_allocatedAmountController.text),
        categoryType: _categoryType,
        color: _selectedColor,
        costNature: _costNature,
      );

      await _budgetService.updateCategory(
        widget.budgetId,
        widget.category.id,
        request,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Category updated successfully'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update category: $e'),
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

  Future<void> _deleteCategory() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Category'),
        content: Text(
          'Are you sure you want to delete "${widget.category.name}"? '
          'This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isDeleting = true);

    try {
      await _budgetService.deleteCategory(widget.budgetId, widget.category.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Category deleted'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop('deleted');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete category: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isDeleting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Category'),
        elevation: 0,
        actions: [
          IconButton(
            onPressed: _isDeleting ? null : _deleteCategory,
            icon: _isDeleting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.delete_outline),
            color: Colors.red,
            tooltip: 'Delete Category',
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Preview card
            _buildPreviewCard(isDark),
            const SizedBox(height: 24),

            // Name field
            TextFormField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'Category Name',
                hintText: 'e.g., Development',
                prefixIcon: const Icon(Icons.label),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter a category name';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Category type dropdown
            DropdownButtonFormField<String>(
              value: _categoryType,
              decoration: InputDecoration(
                labelText: 'Category Type',
                prefixIcon: Icon(_getCategoryIcon(_categoryType)),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              items: CategoryTypes.all.map((type) {
                return DropdownMenuItem<String>(
                  value: type,
                  child: Row(
                    children: [
                      Icon(_getCategoryIcon(type), size: 20),
                      const SizedBox(width: 8),
                      Text(type.substring(0, 1).toUpperCase() + type.substring(1)),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    _categoryType = value;
                    _selectedColor = CategoryTypes.defaultColors[value] ?? '#6B7280';
                  });
                }
              },
            ),
            const SizedBox(height: 16),

            // Allocated amount
            TextFormField(
              controller: _allocatedAmountController,
              decoration: InputDecoration(
                labelText: 'Allocated Amount',
                hintText: 'e.g., 5000',
                prefixIcon: const Icon(Icons.attach_money),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter an amount';
                }
                final amount = double.tryParse(value);
                if (amount == null || amount < 0) {
                  return 'Please enter a valid amount';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Cost nature selector
            _buildCostNatureSelector(isDark),
            const SizedBox(height: 16),

            // Color picker
            _buildColorPicker(isDark),
            const SizedBox(height: 16),

            // Description
            TextFormField(
              controller: _descriptionController,
              decoration: InputDecoration(
                labelText: 'Description (optional)',
                hintText: 'Add a description for this category',
                prefixIcon: const Icon(Icons.description),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 32),

            // Save button
            SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _saveCategory,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text(
                        'Save Changes',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPreviewCard(bool isDark) {
    final selectedColorValue = Color(int.parse(_selectedColor.replaceFirst('#', '0xFF')));

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: selectedColorValue.withOpacity(0.5),
          width: 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Preview',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: selectedColorValue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _getCategoryIcon(_categoryType),
                  color: selectedColorValue,
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
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      _categoryType.substring(0, 1).toUpperCase() + _categoryType.substring(1),
                      style: TextStyle(
                        color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                BudgetService.formatCurrency(
                  double.tryParse(_allocatedAmountController.text) ?? 0,
                  'USD',
                ),
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCostNatureSelector(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Cost Nature',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: CostNature.all.map((nature) {
            final isSelected = _costNature == nature;
            return Expanded(
              child: GestureDetector(
                onTap: () {
                  setState(() => _costNature = nature);
                },
                child: Container(
                  margin: EdgeInsets.only(
                    right: nature == CostNature.fixed ? 8 : 0,
                  ),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? Colors.teal.withOpacity(0.1)
                        : (isDark ? Colors.grey.shade900 : Colors.grey.shade100),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? Colors.teal : Colors.transparent,
                      width: 2,
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        nature == CostNature.fixed ? Icons.lock : Icons.trending_up,
                        color: isSelected ? Colors.teal : Colors.grey,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        nature.substring(0, 1).toUpperCase() + nature.substring(1),
                        style: TextStyle(
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                          color: isSelected ? Colors.teal : null,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 4),
        Text(
          CostNature.descriptions[_costNature] ?? '',
          style: TextStyle(
            fontSize: 12,
            color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
          ),
        ),
      ],
    );
  }

  Widget _buildColorPicker(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Color',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: _availableColors.map((color) {
            final isSelected = _selectedColor == color;
            final colorValue = Color(int.parse(color.replaceFirst('#', '0xFF')));

            return GestureDetector(
              onTap: () {
                setState(() => _selectedColor = color);
              },
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: colorValue,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected ? Colors.white : Colors.transparent,
                    width: 3,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: colorValue.withOpacity(0.5),
                            blurRadius: 8,
                            spreadRadius: 2,
                          ),
                        ]
                      : null,
                ),
                child: isSelected
                    ? const Icon(
                        Icons.check,
                        color: Colors.white,
                        size: 20,
                      )
                    : null,
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
