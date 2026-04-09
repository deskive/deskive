import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/budget_models.dart';
import '../services/budget_service.dart';
import '../widgets/budget_card.dart';
import 'create_budget_screen.dart';
import 'budget_detail_screen.dart';

class BudgetListScreen extends StatefulWidget {
  const BudgetListScreen({super.key});

  @override
  State<BudgetListScreen> createState() => _BudgetListScreenState();
}

class _BudgetListScreenState extends State<BudgetListScreen> {
  final BudgetService _budgetService = BudgetService.instance;

  List<Budget> _budgets = [];
  bool _isLoading = true;
  String? _error;
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    _loadBudgets();
  }

  Future<void> _loadBudgets() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final budgets = await _budgetService.getBudgets();

      setState(() {
        _budgets = budgets;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  List<Budget> get _filteredBudgets {
    if (_selectedFilter == 'all') {
      return _budgets;
    }
    return _budgets.where((b) => b.status == _selectedFilter).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('budget.title'.tr()),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() => _selectedFilter = value);
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'all',
                child: Row(
                  children: [
                    Icon(
                      Icons.all_inclusive,
                      size: 20,
                      color: _selectedFilter == 'all' ? Colors.teal : null,
                    ),
                    const SizedBox(width: 8),
                    Text('common.all'.tr()),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'active',
                child: Row(
                  children: [
                    Icon(
                      Icons.play_circle_outline,
                      size: 20,
                      color: _selectedFilter == 'active' ? Colors.green : null,
                    ),
                    const SizedBox(width: 8),
                    Text('budget.status.active'.tr()),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'exceeded',
                child: Row(
                  children: [
                    Icon(
                      Icons.warning_amber_outlined,
                      size: 20,
                      color: _selectedFilter == 'exceeded' ? Colors.red : null,
                    ),
                    const SizedBox(width: 8),
                    Text('budget.status.exceeded'.tr()),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'completed',
                child: Row(
                  children: [
                    Icon(
                      Icons.check_circle_outline,
                      size: 20,
                      color: _selectedFilter == 'completed' ? Colors.blue : null,
                    ),
                    const SizedBox(width: 8),
                    Text('budget.status.completed'.tr()),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'archived',
                child: Row(
                  children: [
                    Icon(
                      Icons.archive_outlined,
                      size: 20,
                      color: _selectedFilter == 'archived' ? Colors.grey : null,
                    ),
                    const SizedBox(width: 8),
                    Text('budget.status.archived'.tr()),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadBudgets,
        child: _buildBody(isDark),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _navigateToCreateBudget,
        icon: const Icon(Icons.add),
        label: Text('budget.create'.tr()),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildBody(bool isDark) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              'common.error'.tr(),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                _error!,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                ),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadBudgets,
              icon: const Icon(Icons.refresh),
              label: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_filteredBudgets.isEmpty) {
      return _buildEmptyState(isDark);
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _filteredBudgets.length,
      itemBuilder: (context, index) {
        final budget = _filteredBudgets[index];
        return BudgetCard(
          budget: budget,
          onTap: () => _navigateToBudgetDetail(budget),
        );
      },
    );
  }

  Widget _buildEmptyState(bool isDark) {
    final isFiltered = _selectedFilter != 'all';

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.account_balance_wallet_outlined,
            size: 80,
            color: isDark ? Colors.grey.shade600 : Colors.grey.shade400,
          ),
          const SizedBox(height: 24),
          Text(
            isFiltered
                ? 'No $_selectedFilter budgets'
                : 'budget.empty.no_budgets'.tr(),
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 48),
            child: Text(
              isFiltered
                  ? 'Try changing the filter or create a new budget'
                  : 'budget.empty.no_budgets_desc'.tr(),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
              ),
            ),
          ),
          if (!isFiltered) ...[
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: _navigateToCreateBudget,
              icon: const Icon(Icons.add),
              label: Text('budget.create'.tr()),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _navigateToCreateBudget() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const CreateBudgetScreen(),
      ),
    );

    if (result == true) {
      _loadBudgets();
    }
  }

  void _navigateToBudgetDetail(Budget budget) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => BudgetDetailScreen(budgetId: budget.id),
      ),
    );

    if (result == true) {
      _loadBudgets();
    }
  }
}
