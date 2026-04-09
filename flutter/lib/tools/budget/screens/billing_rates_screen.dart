import 'package:flutter/material.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';

/// Screen for managing billing rates
class BillingRatesScreen extends StatefulWidget {
  const BillingRatesScreen({super.key});

  @override
  State<BillingRatesScreen> createState() => _BillingRatesScreenState();
}

class _BillingRatesScreenState extends State<BillingRatesScreen> {
  final BudgetService _budgetService = BudgetService.instance;

  List<BillingRate> _billingRates = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadBillingRates();
  }

  Future<void> _loadBillingRates() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final rates = await _budgetService.getBillingRates();
      setState(() {
        _billingRates = rates;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _showAddRateDialog() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => const AddBillingRateDialog(),
    );

    if (result == true) {
      _loadBillingRates();
    }
  }

  Future<void> _deleteRate(BillingRate rate) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Billing Rate'),
        content: Text(
          'Are you sure you want to delete this billing rate${rate.roleName != null ? ' for ${rate.roleName}' : ''}?',
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

    try {
      await _budgetService.deleteBillingRate(rate.id);
      _loadBillingRates();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Billing rate deleted'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to delete: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Billing Rates'),
        elevation: 0,
        actions: [
          IconButton(
            onPressed: _loadBillingRates,
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _buildBody(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddRateDialog,
        icon: const Icon(Icons.add),
        label: const Text('Add Rate'),
        backgroundColor: Colors.teal,
      ),
    );
  }

  Widget _buildBody() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text('Error: $_error'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadBillingRates,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_billingRates.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.attach_money,
              size: 64,
              color: isDark ? Colors.grey.shade700 : Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'No billing rates',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Add billing rates for team members',
              style: TextStyle(
                color: isDark ? Colors.grey.shade600 : Colors.grey.shade500,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _showAddRateDialog,
              icon: const Icon(Icons.add),
              label: const Text('Add Billing Rate'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadBillingRates,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _billingRates.length,
        itemBuilder: (context, index) {
          final rate = _billingRates[index];
          return BillingRateCard(
            rate: rate,
            onDelete: () => _deleteRate(rate),
          );
        },
      ),
    );
  }
}

/// Card widget for displaying a billing rate
class BillingRateCard extends StatelessWidget {
  final BillingRate rate;
  final VoidCallback? onDelete;
  final VoidCallback? onTap;

  const BillingRateCard({
    super.key,
    required this.rate,
    this.onDelete,
    this.onTap,
  });

  IconData _getRoleIcon() {
    switch (rate.roleType) {
      case RoleTypes.user:
        return Icons.person;
      case RoleTypes.role:
        return Icons.group;
      case RoleTypes.defaultRate:
        return Icons.public;
      default:
        return Icons.attach_money;
    }
  }

  String _getRoleLabel() {
    switch (rate.roleType) {
      case RoleTypes.user:
        return 'User Rate';
      case RoleTypes.role:
        return 'Role Rate';
      case RoleTypes.defaultRate:
        return 'Default Rate';
      default:
        return 'Billing Rate';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Icon
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.teal.shade900.withOpacity(0.3)
                      : Colors.teal.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getRoleIcon(),
                  color: Colors.teal,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      rate.roleName ?? _getRoleLabel(),
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: isDark
                                ? Colors.grey.shade800
                                : Colors.grey.shade200,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _getRoleLabel(),
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark
                                  ? Colors.grey.shade400
                                  : Colors.grey.shade600,
                            ),
                          ),
                        ),
                        if (rate.isDefault) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.green.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'Default',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.green,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              // Rate
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    BudgetService.formatCurrency(rate.hourlyRate, rate.currency),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: Colors.green,
                    ),
                  ),
                  Text(
                    '/hour',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
              // Delete button
              if (onDelete != null) ...[
                const SizedBox(width: 8),
                IconButton(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline),
                  color: Colors.red,
                  tooltip: 'Delete',
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Dialog for adding a new billing rate
class AddBillingRateDialog extends StatefulWidget {
  const AddBillingRateDialog({super.key});

  @override
  State<AddBillingRateDialog> createState() => _AddBillingRateDialogState();
}

class _AddBillingRateDialogState extends State<AddBillingRateDialog> {
  final _formKey = GlobalKey<FormState>();
  final _rateController = TextEditingController();
  final _nameController = TextEditingController();

  final BudgetService _budgetService = BudgetService.instance;

  String _roleType = RoleTypes.role;
  String _currency = 'USD';
  bool _isDefault = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _rateController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final request = CreateBillingRateRequest(
        roleType: _roleType,
        roleName: _nameController.text.trim().isEmpty
            ? null
            : _nameController.text.trim(),
        hourlyRate: double.parse(_rateController.text),
        currency: _currency,
        isDefault: _isDefault,
      );

      await _budgetService.createBillingRate(request);

      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create: $e'),
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

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add Billing Rate'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Role type
              DropdownButtonFormField<String>(
                value: _roleType,
                decoration: const InputDecoration(
                  labelText: 'Rate Type',
                  border: OutlineInputBorder(),
                ),
                items: RoleTypes.all.map((type) {
                  return DropdownMenuItem<String>(
                    value: type,
                    child: Text(
                      type.substring(0, 1).toUpperCase() + type.substring(1),
                    ),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _roleType = value);
                  }
                },
              ),
              const SizedBox(height: 16),

              // Name
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Name (optional)',
                  hintText: 'e.g., Senior Developer',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),

              // Rate
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      controller: _rateController,
                      decoration: const InputDecoration(
                        labelText: 'Hourly Rate',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Required';
                        }
                        final rate = double.tryParse(value);
                        if (rate == null || rate < 0) {
                          return 'Invalid rate';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _currency,
                      decoration: const InputDecoration(
                        labelText: 'Currency',
                        border: OutlineInputBorder(),
                      ),
                      items: Currencies.supported.map((currency) {
                        return DropdownMenuItem<String>(
                          value: currency,
                          child: Text(currency),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _currency = value);
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Default toggle
              SwitchListTile(
                title: const Text('Set as default'),
                value: _isDefault,
                onChanged: (value) {
                  setState(() => _isDefault = value);
                },
                contentPadding: EdgeInsets.zero,
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _save,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.teal,
            foregroundColor: Colors.white,
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
              : const Text('Save'),
        ),
      ],
    );
  }
}
