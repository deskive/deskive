import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';

class AddExpenseScreen extends StatefulWidget {
  final String budgetId;
  final List<BudgetCategory> categories;
  final String currency;

  const AddExpenseScreen({
    super.key,
    required this.budgetId,
    required this.categories,
    this.currency = 'USD',
  });

  @override
  State<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends State<AddExpenseScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _vendorController = TextEditingController();
  final _invoiceController = TextEditingController();

  String? _selectedCategoryId;
  String _selectedType = ExpenseTypes.manual;
  DateTime _expenseDate = DateTime.now();
  bool _billable = false;
  bool _isSaving = false;
  bool _showOverBudgetWarning = false;

  @override
  void dispose() {
    _titleController.dispose();
    _amountController.dispose();
    _descriptionController.dispose();
    _vendorController.dispose();
    _invoiceController.dispose();
    super.dispose();
  }

  void _checkCategoryBudget() {
    if (_selectedCategoryId == null) {
      setState(() => _showOverBudgetWarning = false);
      return;
    }

    final amount = double.tryParse(_amountController.text) ?? 0;
    if (amount <= 0) {
      setState(() => _showOverBudgetWarning = false);
      return;
    }

    final category = widget.categories.firstWhere(
      (c) => c.id == _selectedCategoryId,
      orElse: () => widget.categories.first,
    );

    // This is a simplified check - in production, you'd want to fetch current spending
    setState(() {
      _showOverBudgetWarning = amount > category.allocatedAmount;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('budget.expense.add'.tr()),
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
              onPressed: _saveExpense,
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
              // Warning if over budget
              if (_showOverBudgetWarning)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.warning_amber, color: Colors.orange),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'budget.expense.warning_over_category'.tr(),
                          style: TextStyle(color: Colors.orange.shade800),
                        ),
                      ),
                    ],
                  ),
                ),

              // Title
              _buildSectionTitle('budget.expense.title'.tr()),
              const SizedBox(height: 8),
              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(
                  hintText: 'Enter expense title',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  filled: true,
                  fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Title is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Amount
              _buildSectionTitle('budget.expense.amount'.tr()),
              const SizedBox(height: 8),
              TextFormField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  hintText: '0.00',
                  prefixText: '${Currencies.symbols[widget.currency] ?? widget.currency} ',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  filled: true,
                  fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                ),
                onChanged: (_) => _checkCategoryBudget(),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Amount is required';
                  }
                  final amount = double.tryParse(value);
                  if (amount == null || amount <= 0) {
                    return 'Enter a valid amount';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Category
              if (widget.categories.isNotEmpty) ...[
                _buildSectionTitle('budget.expense.category'.tr()),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: _selectedCategoryId,
                  decoration: InputDecoration(
                    hintText: 'Select category (optional)',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                  ),
                  items: [
                    const DropdownMenuItem<String>(
                      value: null,
                      child: Text('No category'),
                    ),
                    ...widget.categories.map((category) {
                      return DropdownMenuItem(
                        value: category.id,
                        child: Text(category.name),
                      );
                    }),
                  ],
                  onChanged: (value) {
                    setState(() => _selectedCategoryId = value);
                    _checkCategoryBudget();
                  },
                ),
                const SizedBox(height: 20),
              ],

              // Expense Type
              _buildSectionTitle('budget.expense.type'.tr()),
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
                items: [
                  DropdownMenuItem(
                    value: ExpenseTypes.manual,
                    child: Text('budget.expense.type_options.manual'.tr()),
                  ),
                  DropdownMenuItem(
                    value: ExpenseTypes.invoice,
                    child: Text('budget.expense.type_options.invoice'.tr()),
                  ),
                  DropdownMenuItem(
                    value: ExpenseTypes.purchase,
                    child: Text('budget.expense.type_options.purchase'.tr()),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _selectedType = value);
                  }
                },
              ),
              const SizedBox(height: 20),

              // Date
              _buildSectionTitle('budget.expense.date'.tr()),
              const SizedBox(height: 8),
              InkWell(
                onTap: _selectDate,
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
                      const SizedBox(width: 12),
                      Text(
                        DateFormat('MMMM d, y').format(_expenseDate),
                        style: const TextStyle(fontSize: 15),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Description
              _buildSectionTitle('budget.expense.description'.tr()),
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
              const SizedBox(height: 20),

              // Vendor and Invoice (for invoice/purchase types)
              if (_selectedType == ExpenseTypes.invoice || _selectedType == ExpenseTypes.purchase) ...[
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSectionTitle('budget.expense.vendor'.tr()),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _vendorController,
                            decoration: InputDecoration(
                              hintText: 'Vendor name',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              filled: true,
                              fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSectionTitle('budget.expense.invoice'.tr()),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _invoiceController,
                            decoration: InputDecoration(
                              hintText: 'Invoice #',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              filled: true,
                              fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
              ],

              // Billable toggle
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
                    Icon(
                      Icons.attach_money,
                      color: _billable ? Colors.green : Colors.grey,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'budget.expense.billable'.tr(),
                            style: const TextStyle(fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Mark this expense as billable to client',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _billable,
                      onChanged: (value) => setState(() => _billable = value),
                      activeTrackColor: Colors.green.withValues(alpha: 0.5),
                      thumbColor: WidgetStateProperty.resolveWith((states) =>
                          states.contains(WidgetState.selected)
                              ? Colors.green
                              : null),
                    ),
                  ],
                ),
              ),
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

  Future<void> _selectDate() async {
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _expenseDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (pickedDate != null) {
      setState(() => _expenseDate = pickedDate);
    }
  }

  Future<void> _saveExpense() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isSaving = true);

    try {
      final request = CreateExpenseRequest(
        budgetId: widget.budgetId,
        categoryId: _selectedCategoryId,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        amount: double.parse(_amountController.text.trim()),
        currency: widget.currency,
        expenseType: _selectedType,
        expenseDate: _expenseDate,
        billable: _billable,
        vendor: _vendorController.text.trim().isEmpty ? null : _vendorController.text.trim(),
        invoiceNumber: _invoiceController.text.trim().isEmpty ? null : _invoiceController.text.trim(),
      );

      await BudgetService.instance.createExpense(request);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('budget.expense_added'.tr()),
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
