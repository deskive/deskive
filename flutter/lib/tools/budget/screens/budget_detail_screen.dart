import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:math' as math;
import 'dart:ui' as ui;
import '../models/budget_models.dart';
import '../services/budget_service.dart';
import '../widgets/expense_list_item.dart';
import '../widgets/category_progress_bar.dart';
import '../widgets/time_tracking_view.dart';
import '../widgets/task_breakdown_widget.dart';
import '../../../projects/project_service.dart';
import '../../../projects/project_model.dart' as project_model;
import '../../../services/workspace_service.dart';
import 'create_budget_screen.dart';
import 'add_expense_screen.dart';
import 'add_category_screen.dart';
import 'edit_category_screen.dart';
import 'start_timer_screen.dart';
import 'billing_rates_screen.dart';

class BudgetDetailScreen extends StatefulWidget {
  final String budgetId;

  const BudgetDetailScreen({super.key, required this.budgetId});

  @override
  State<BudgetDetailScreen> createState() => _BudgetDetailScreenState();
}

class _BudgetDetailScreenState extends State<BudgetDetailScreen>
    with SingleTickerProviderStateMixin {
  final BudgetService _budgetService = BudgetService.instance;
  final ProjectService _projectService = ProjectService();

  TabController? _tabController;
  Budget? _budget;
  BudgetSummary? _summary;
  List<BudgetCategory> _categories = [];
  List<BudgetExpense> _expenses = [];
  List<TimeEntry> _timeEntries = [];
  List<project_model.Task> _projectTasks = [];
  List<TaskBudgetAllocation> _taskAllocations = [];
  TimeEntry? _runningTimer;
  bool _isLoading = true;
  String? _error;

  bool get _hasProjectId => _budget?.projectId != null && _budget!.projectId!.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _initializeTabController(int length) {
    _tabController?.removeListener(_onTabChanged);
    _tabController?.dispose();
    _tabController = TabController(length: length, vsync: this);
    _tabController!.addListener(_onTabChanged);
  }

  void _onTabChanged() {
    // Trigger rebuild when tab changes if needed
    if (mounted) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _tabController?.removeListener(_onTabChanged);
    _tabController?.dispose();
    super.dispose();
  }

  Future<BudgetSummary?> _getSummaryOrNull() async {
    try {
      return await _budgetService.getBudgetSummary(widget.budgetId);
    } catch (_) {
      return null;
    }
  }

  Future<List<TimeEntry>> _getTimeEntriesOrEmpty() async {
    try {
      return await _budgetService.getAllTimeEntriesForBudget(widget.budgetId);
    } catch (_) {
      return [];
    }
  }

  Future<TimeEntry?> _getRunningTimerOrNull() async {
    try {
      return await _budgetService.getRunningTimer();
    } catch (_) {
      return null;
    }
  }

  Future<List<project_model.Task>> _getProjectTasksOrEmpty(String? projectId) async {
    if (projectId == null || projectId.isEmpty) return [];
    try {
      return await _projectService.getTasksForProject(projectId);
    } catch (_) {
      return [];
    }
  }

  Future<List<TaskBudgetAllocation>> _getTaskAllocationsOrEmpty() async {
    try {
      return await _budgetService.getTaskAllocations(widget.budgetId);
    } catch (_) {
      return [];
    }
  }

  Future<void> _loadData() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      // First fetch the budget to get the projectId
      final budget = await _budgetService.getBudget(widget.budgetId);

      // Then fetch remaining data including project tasks if applicable
      final results = await Future.wait([
        _getSummaryOrNull(),
        _budgetService.getCategories(widget.budgetId),
        _budgetService.getExpenses(widget.budgetId),
        _getTimeEntriesOrEmpty(),
        _getRunningTimerOrNull(),
        _getProjectTasksOrEmpty(budget.projectId),
        _getTaskAllocationsOrEmpty(),
      ]);

      // Determine tab count based on whether budget has a project
      final hasProject = budget.projectId != null && budget.projectId!.isNotEmpty;
      final tabCount = hasProject ? 6 : 5;

      // Initialize TabController with correct length before setState
      if (_tabController == null || _tabController!.length != tabCount) {
        _initializeTabController(tabCount);
      }

      setState(() {
        _budget = budget;
        _summary = results[0] as BudgetSummary?;
        _categories = results[1] as List<BudgetCategory>;
        _expenses = results[2] as List<BudgetExpense>;
        _timeEntries = results[3] as List<TimeEntry>;
        _runningTimer = results[4] as TimeEntry?;
        _projectTasks = results[5] as List<project_model.Task>;
        _taskAllocations = results[6] as List<TaskBudgetAllocation>;
        _isLoading = false;
      });
    } catch (e) {
      // Initialize default TabController on error if not already initialized
      if (_tabController == null) {
        _initializeTabController(5);
      }
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  double get _totalSpent {
    if (_summary != null) return _summary!.totalSpent;
    return _expenses.where((e) => !e.rejected).fold(0.0, (sum, e) => sum + e.amount);
  }

  double get _percentageUsed {
    if (_summary != null) return _summary!.percentageUsed;
    if (_budget == null || _budget!.totalBudget == 0) return 0;
    return (_totalSpent / _budget!.totalBudget) * 100;
  }

  double get _remaining => (_budget?.totalBudget ?? 0) - _totalSpent;

  int get _daysInBudget {
    if (_budget?.startDate == null || _budget?.endDate == null) return 0;
    return _budget!.endDate!.difference(_budget!.startDate!).inDays;
  }

  int get _daysElapsed {
    if (_budget?.startDate == null) return 0;
    final now = DateTime.now();
    if (now.isBefore(_budget!.startDate!)) return 0;
    return now.difference(_budget!.startDate!).inDays;
  }

  double get _idealDailyRate {
    if (_daysInBudget == 0) return 0;
    return (_budget?.totalBudget ?? 0) / _daysInBudget;
  }

  double get _actualDailyRate {
    if (_daysElapsed == 0) return 0;
    return _totalSpent / _daysElapsed;
  }

  // Frontend-matching calculations for health metrics
  double get _monthlyBurnRate {
    // Monthly burn rate = (totalSpent / monthsElapsed) where monthsElapsed = max(1, daysElapsed/30)
    final monthsElapsed = (_daysElapsed / 30).clamp(1.0, double.infinity);
    return _totalSpent / monthsElapsed;
  }

  double get _runwayMonths {
    // Runway (months) = remainingBudget / monthlyBurnRate
    if (_monthlyBurnRate <= 0) return double.infinity;
    return _remaining / _monthlyBurnRate;
  }

  DateTime? get _projectedCompletionDate {
    // Projected date when budget will be exhausted
    if (_runwayMonths.isInfinite || _runwayMonths.isNaN) return null;
    final today = DateTime.now();
    return DateTime(today.year, today.month + _runwayMonths.ceil(), today.day);
  }

  double get _healthScore {
    // Frontend formula: 100 - ((spendRatio * 50) + (projectionRatio * 50))
    final totalAllocated = _budget?.totalBudget ?? 0;
    if (totalAllocated <= 0) return 100.0;

    final spendRatio = _totalSpent / totalAllocated;
    final forecastedTotal = _actualDailyRate * _daysInBudget;
    final projectionRatio = _daysInBudget > 0 ? forecastedTotal / totalAllocated : 0.0;

    return (100 - (spendRatio * 50 + projectionRatio * 50)).clamp(0.0, 100.0);
  }

  String get _healthLabel {
    if (_healthScore >= 80) return 'Excellent';
    if (_healthScore >= 60) return 'Good';
    if (_healthScore >= 40) return 'Fair';
    return 'At Risk';
  }

  Color get _healthColor {
    if (_healthScore >= 80) return Colors.green;
    if (_healthScore >= 60) return Colors.blue;
    if (_healthScore >= 40) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? Colors.black : Colors.grey.shade50,
      appBar: AppBar(
        title: Text(_budget?.name ?? 'budget.title'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => _showSettingsMenu(context),
          ),
        ],
      ),
      body: Stack(
        children: [
          RefreshIndicator(
            onRefresh: _loadData,
            child: _buildBody(isDark),
          ),
        ],
      ),
      floatingActionButton: _budget != null
          ? FloatingActionButton(
              onPressed: _showAddOptions,
              backgroundColor: Colors.teal,
              foregroundColor: Colors.white,
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  void _showSettingsMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: Text('budget.edit'.tr()),
              onTap: () {
                Navigator.pop(context);
                _navigateToEditBudget();
              },
            ),
            ListTile(
              leading: const Icon(Icons.attach_money),
              title: const Text('Billing Rates'),
              onTap: () {
                Navigator.pop(context);
                _navigateToBillingRates();
              },
            ),
            ListTile(
              leading: Icon(Icons.delete_outline, color: Colors.red.shade400),
              title: Text('budget.delete'.tr(), style: TextStyle(color: Colors.red.shade400)),
              onTap: () {
                Navigator.pop(context);
                _showDeleteConfirmation();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(bool isDark) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
            const SizedBox(height: 16),
            Text('common.error'.tr(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(_error!, textAlign: TextAlign.center),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh),
              label: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_budget == null) {
      return const Center(child: Text('Budget not found'));
    }

    // Ensure TabController is initialized
    if (_tabController == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return CustomScrollView(
      slivers: [
        // Header with description and badge
        SliverToBoxAdapter(
          child: _buildHeader(isDark),
        ),
        // Summary Stats Cards
        SliverToBoxAdapter(
          child: _buildSummaryCards(isDark),
        ),
        // Budget Usage Progress
        SliverToBoxAdapter(
          child: _buildBudgetUsage(isDark),
        ),
        // Tab Bar
        SliverPersistentHeader(
          pinned: true,
          delegate: _SliverTabBarDelegate(
            TabBar(
              controller: _tabController,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              labelColor: Colors.teal,
              unselectedLabelColor: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              indicatorColor: Colors.teal,
              tabs: [
                const Tab(text: 'Analytics'),
                const Tab(text: 'Forecasting'),
                const Tab(text: 'Expenses'),
                const Tab(text: 'Categories'),
                const Tab(text: 'Time Tracking'),
                if (_hasProjectId) const Tab(text: 'Tasks'),
              ],
            ),
            isDark: isDark,
          ),
        ),
        // Tab Content
        SliverFillRemaining(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildAnalyticsTab(isDark),
              _buildForecastingTab(isDark),
              _buildExpensesTab(isDark),
              _buildCategoriesTab(isDark),
              _buildTimeTrackingTab(isDark),
              if (_hasProjectId) _buildTasksTab(isDark),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHeader(bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      _budget!.name,
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 12),
                    _buildStatusBadge(),
                  ],
                ),
                if (_budget!.description != null && _budget!.description!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    _budget!.description!,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge() {
    Color backgroundColor;
    Color textColor;
    String label;

    switch (_budget!.status) {
      case 'active':
        backgroundColor = Colors.green.withValues(alpha: 0.15);
        textColor = Colors.green;
        label = 'active';
        break;
      case 'exceeded':
        backgroundColor = Colors.red.withValues(alpha: 0.15);
        textColor = Colors.red;
        label = 'exceeded';
        break;
      case 'completed':
        backgroundColor = Colors.blue.withValues(alpha: 0.15);
        textColor = Colors.blue;
        label = 'completed';
        break;
      default:
        backgroundColor = Colors.grey.withValues(alpha: 0.15);
        textColor = Colors.grey;
        label = _budget!.status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildSummaryCards(bool isDark) {
    final remaining = _budget!.totalBudget - _totalSpent;
    final remainingPercent = _budget!.totalBudget > 0
        ? (remaining / _budget!.totalBudget * 100)
        : 0.0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildSummaryCard(
                  title: 'Total Budget',
                  value: BudgetService.formatCurrency(_budget!.totalBudget, _budget!.currency),
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  title: 'Total Spent',
                  value: BudgetService.formatCurrency(_totalSpent, _budget!.currency),
                  subtitle: '${_percentageUsed.toStringAsFixed(1)}% used',
                  valueColor: Colors.orange,
                  isDark: isDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildSummaryCard(
                  title: 'Remaining',
                  value: BudgetService.formatCurrency(remaining, _budget!.currency),
                  subtitle: '${remainingPercent.toStringAsFixed(1)}% left',
                  valueColor: remaining >= 0 ? Colors.green : Colors.red,
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActivityCard(isDark),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard({
    required String title,
    required String value,
    String? subtitle,
    Color? valueColor,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: valueColor ?? (isDark ? Colors.white : Colors.black87),
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.grey.shade500 : Colors.grey.shade500,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActivityCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Activity',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Expenses',
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
                ),
              ),
              Text(
                _expenses.length.toString(),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Time Entries',
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
                ),
              ),
              Row(
                children: [
                  if (_runningTimer != null)
                    Container(
                      width: 8,
                      height: 8,
                      margin: const EdgeInsets.only(right: 6),
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.red,
                      ),
                    ),
                  Text(
                    _timeEntries.length.toString(),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBudgetUsage(bool isDark) {
    Color progressColor;
    if (_percentageUsed >= 100) {
      progressColor = Colors.red;
    } else if (_percentageUsed >= (_budget?.alertThreshold ?? 80)) {
      progressColor = Colors.orange;
    } else {
      progressColor = Colors.teal;
    }

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Budget Usage',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              Text(
                '${_percentageUsed.toStringAsFixed(1)}% of budget used',
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: (_percentageUsed / 100).clamp(0.0, 1.0),
              backgroundColor: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
              valueColor: AlwaysStoppedAnimation<Color>(progressColor),
              minHeight: 10,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnalyticsTab(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Budget Overview and Spending by Category Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _buildBudgetOverviewCard(isDark)),
              const SizedBox(width: 12),
              Expanded(child: _buildSpendingByCategoryCard(isDark)),
            ],
          ),
          const SizedBox(height: 16),
          // Spending Timeline
          _buildSpendingTimelineCard(isDark),
          const SizedBox(height: 16),
          // Burn Rate Analysis
          _buildBurnRateCard(isDark),
        ],
      ),
    );
  }

  Widget _buildBudgetOverviewCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Budget Overview',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          Text(
            'Total budget utilization',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 20),
          Center(
            child: SizedBox(
              height: 150,
              width: 150,
              child: CustomPaint(
                painter: _DonutChartPainter(
                  percentage: _percentageUsed,
                  isDark: isDark,
                ),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${_percentageUsed.toStringAsFixed(1)}%',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.teal,
                        ),
                      ),
                      Text(
                        'Used',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Flexible(
                child: _buildLegendItem('Spent', Colors.orange,
                    BudgetService.formatCurrency(_totalSpent, _budget!.currency)),
              ),
              const SizedBox(width: 12),
              Flexible(
                child: _buildLegendItem('Remaining', Colors.teal,
                    BudgetService.formatCurrency(_remaining, _budget!.currency)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color, String value) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 6),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
              ),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  value,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSpendingByCategoryCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Spending by Category',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          Text(
            'Category-wise expense breakdown',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 20),
          if (_expenses.isEmpty)
            SizedBox(
              height: 150,
              child: Center(
                child: Text(
                  'No expenses recorded yet',
                  style: TextStyle(
                    color: isDark ? Colors.grey.shade500 : Colors.grey.shade400,
                  ),
                ),
              ),
            )
          else
            ..._categories.take(4).map((category) {
              final spent = _budgetService.calculateCategorySpending(category.id, _expenses);
              final percentage = _totalSpent > 0 ? (spent / _totalSpent * 100) : 0.0;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(category.name, style: const TextStyle(fontSize: 13)),
                        Text(
                          '${percentage.toStringAsFixed(1)}%',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: (percentage / 100).clamp(0.0, 1.0),
                        backgroundColor: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          Color(int.parse(category.color?.replaceFirst('#', '0xFF') ?? '0xFF6B7280')),
                        ),
                        minHeight: 6,
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildSpendingTimelineCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Spending Timeline',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          Text(
            'Cumulative spending over time',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 40),
          if (_expenses.isEmpty)
            Center(
              child: Text(
                'No expense timeline data available',
                style: TextStyle(
                  color: isDark ? Colors.grey.shade500 : Colors.grey.shade400,
                ),
              ),
            )
          else
            const SizedBox(
              height: 100,
              child: Center(child: Text('Timeline chart placeholder')),
            ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildBurnRateCard(bool isDark) {
    final timelineProgress = _daysInBudget > 0 ? (_daysElapsed / _daysInBudget * 100) : 0.0;
    final forecastedTotal = _actualDailyRate * _daysInBudget;
    final isOnTrack = _actualDailyRate <= _idealDailyRate;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Burn Rate Analysis',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          Text(
            'Budget consumption rate and forecast',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 16),
          // Stats Row - 2x2 grid for mobile
          Row(
            children: [
              Expanded(
                child: _buildBurnRateStat(
                  'Ideal Daily Rate',
                  BudgetService.formatCurrency(_idealDailyRate, _budget!.currency),
                  'per day',
                  Colors.blue,
                  isDark,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildBurnRateStat(
                  'Actual Daily Rate',
                  BudgetService.formatCurrency(_actualDailyRate, _budget!.currency),
                  isOnTrack ? 'On track' : 'Over budget',
                  isOnTrack ? Colors.green : Colors.red,
                  isDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildBurnRateStat(
                  'Timeline Progress',
                  '${timelineProgress.toStringAsFixed(1)}%',
                  '$_daysElapsed of $_daysInBudget days',
                  Colors.grey,
                  isDark,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildBurnRateStat(
                  'Forecasted Total',
                  BudgetService.formatCurrency(forecastedTotal, _budget!.currency),
                  forecastedTotal <= _budget!.totalBudget ? 'Within budget' : 'Over budget',
                  forecastedTotal <= _budget!.totalBudget ? Colors.green : Colors.red,
                  isDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Progress comparison
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Budget Progress vs Time Progress',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
              ),
              Text(
                isOnTrack ? 'On pace or under' : 'Over pace',
                style: TextStyle(
                  fontSize: 12,
                  color: isOnTrack ? Colors.green : Colors.red,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Budget Used Progress
          Row(
            children: [
              SizedBox(
                width: 80,
                child: Text(
                  'Budget Used',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                ),
              ),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: (_percentageUsed / 100).clamp(0.0, 1.0),
                    backgroundColor: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.teal),
                    minHeight: 8,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${_percentageUsed.toStringAsFixed(1)}%',
                style: const TextStyle(fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Time Elapsed Progress
          Row(
            children: [
              SizedBox(
                width: 80,
                child: Text(
                  'Time Elapsed',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                ),
              ),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: (timelineProgress / 100).clamp(0.0, 1.0),
                    backgroundColor: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
                    minHeight: 8,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${timelineProgress.toStringAsFixed(1)}%',
                style: const TextStyle(fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBurnRateStat(String label, String value, String subtitle, Color color, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          subtitle,
          style: TextStyle(
            fontSize: 10,
            color: color.withValues(alpha: 0.8),
          ),
        ),
      ],
    );
  }

  Widget _buildForecastingTab(bool isDark) {
    // Use frontend-matching calculations from getters
    final isOnTrack = _actualDailyRate <= _idealDailyRate || _totalSpent == 0;

    // Format completion date
    String completionDateValue;
    String completionDateSubtitle;
    Color completionDateColor;

    if (_projectedCompletionDate != null) {
      completionDateValue = DateFormat('MMM d, y').format(_projectedCompletionDate!);
      final daysUntil = _projectedCompletionDate!.difference(DateTime.now()).inDays;
      completionDateSubtitle = daysUntil > 0 ? 'in $daysUntil days' : 'Budget exhausted';
      completionDateColor = daysUntil > 30 ? Colors.green : (daysUntil > 0 ? Colors.orange : Colors.red);
    } else {
      completionDateValue = '∞';
      completionDateSubtitle = 'Budget sustainable';
      completionDateColor = Colors.green;
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Stats Row
          Row(
            children: [
              Expanded(
                child: _buildForecastStatCard(
                  icon: Icons.favorite_outline,
                  title: 'Health Score',
                  value: '${_healthScore.toStringAsFixed(0)}%',
                  subtitle: _healthLabel,
                  valueColor: _healthColor,
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildForecastStatCard(
                  icon: Icons.local_fire_department_outlined,
                  title: 'Burn Rate',
                  value: BudgetService.formatCurrency(_monthlyBurnRate, _budget!.currency),
                  subtitle: 'per month',
                  isDark: isDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildForecastStatCard(
                  icon: Icons.all_inclusive,
                  title: 'Runway',
                  value: _runwayMonths.isInfinite ? '∞' : '${_runwayMonths.toStringAsFixed(1)}mo',
                  subtitle: _runwayMonths.isInfinite ? 'Budget sustainable' : 'months remaining',
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildForecastStatCard(
                  icon: Icons.calendar_today_outlined,
                  title: 'Completion Date',
                  value: completionDateValue,
                  subtitle: completionDateSubtitle,
                  valueColor: completionDateColor,
                  isDark: isDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Spending Trend & Forecast
          _buildSpendingTrendCard(isDark),
          const SizedBox(height: 16),

          // Projected Monthly Spending by Category
          _buildProjectedSpendingCard(isDark),
          const SizedBox(height: 16),

          // Projection Summary
          _buildProjectionSummaryCard(isDark, _monthlyBurnRate, isOnTrack),
        ],
      ),
    );
  }

  Widget _buildForecastStatCard({
    required IconData icon,
    required String title,
    required String value,
    required String subtitle,
    Color? valueColor,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: isDark ? Colors.grey.shade400 : Colors.grey.shade600),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: valueColor ?? (isDark ? Colors.white : Colors.black87),
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 10,
              color: valueColor?.withValues(alpha: 0.8) ?? (isDark ? Colors.grey.shade500 : Colors.grey.shade500),
            ),
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
        ],
      ),
    );
  }

  Widget _buildSpendingTrendCard(bool isDark) {
    // Calculate monthly spending data from expenses
    final now = DateTime.now();
    final monthlySpending = <int, double>{};

    // Group expenses by month (relative to budget start)
    for (final expense in _expenses) {
      if (!expense.rejected) {
        final monthDiff = (expense.expenseDate.year - now.year) * 12 +
                          (expense.expenseDate.month - now.month);
        monthlySpending[monthDiff] = (monthlySpending[monthDiff] ?? 0) + expense.amount;
      }
    }

    // Calculate average monthly spending for projection
    final avgMonthlySpending = _daysElapsed > 0
        ? (_totalSpent / _daysElapsed) * 30
        : 0.0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Spending Trend & Forecast',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          Text(
            'Historical spending and projected future costs over the next 3 months',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 24),
          // Chart
          SizedBox(
            height: 200,
            child: CustomPaint(
              size: const Size(double.infinity, 200),
              painter: _SpendingTrendChartPainter(
                budget: _budget!.totalBudget,
                spent: _totalSpent,
                avgMonthlySpending: avgMonthlySpending,
                currency: _budget!.currency,
                isDark: isDark,
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Legend - wrapped for mobile
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 12,
            runSpacing: 8,
            children: [
              _buildChartLegend('Actual Spending', Colors.blue, isDark),
              _buildChartLegend('Budget Limit', Colors.red, isDark, isDashed: true),
              _buildChartLegend('Projected Spending', Colors.green, isDark),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChartLegend(String label, Color color, bool isDark, {bool isDashed = false}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 3,
          color: isDashed ? null : color,
          child: isDashed
              ? LayoutBuilder(
                  builder: (context, constraints) {
                    return CustomPaint(
                      size: Size(16, 3),
                      painter: _DashedLinePainter(color: color),
                    );
                  },
                )
              : null,
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
        ),
      ],
    );
  }

  Widget _buildProjectedSpendingCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Projected Monthly Spending by Category',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          Text(
            'Average monthly spending for each variable cost category',
            style: TextStyle(
              fontSize: 11,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 20),
          // Bar chart
          SizedBox(
            height: 180,
            child: _categories.isEmpty
                ? Center(
                    child: Text(
                      'No category data available',
                      style: TextStyle(
                        color: isDark ? Colors.grey.shade500 : Colors.grey.shade400,
                      ),
                    ),
                  )
                : ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _categories.length,
                    itemBuilder: (context, index) {
                      final category = _categories[index];
                      final spent = _budgetService.calculateCategorySpending(category.id, _expenses);
                      final allocated = category.allocatedAmount;
                      // Project based on current spending rate
                      final projectedTotal = _daysElapsed > 0 && _daysInBudget > 0
                          ? spent / _daysElapsed * _daysInBudget
                          : spent;
                      final maxValue = math.max(allocated, math.max(spent, projectedTotal));
                      final effectiveMax = maxValue > 0 ? maxValue : 1;

                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                _buildBarColumn(allocated / effectiveMax * 120, Colors.teal, isDark),
                                const SizedBox(width: 3),
                                _buildBarColumn(spent / effectiveMax * 120, Colors.blue, isDark),
                                const SizedBox(width: 3),
                                _buildBarColumn(projectedTotal / effectiveMax * 120, Colors.orange, isDark),
                              ],
                            ),
                            const SizedBox(height: 8),
                            SizedBox(
                              width: 55,
                              child: Text(
                                category.name,
                                style: TextStyle(
                                  fontSize: 9,
                                  color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                                ),
                                textAlign: TextAlign.center,
                                overflow: TextOverflow.ellipsis,
                                maxLines: 2,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
          const SizedBox(height: 12),
          // Legend - wrapped for mobile
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 10,
            runSpacing: 6,
            children: [
              _buildBarLegend('Allocated', Colors.teal, isDark),
              _buildBarLegend('Current Spent', Colors.blue, isDark),
              _buildBarLegend('Projected Total', Colors.orange, isDark),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBarColumn(double height, Color color, bool isDark) {
    return Container(
      width: 10,
      height: height.clamp(4.0, 120.0),
      decoration: BoxDecoration(
        color: color,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
      ),
    );
  }

  Widget _buildBarLegend(String label, Color color, bool isDark) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
        ),
      ],
    );
  }

  Widget _buildProjectionSummaryCard(bool isDark, double burnRate, bool isOnTrack) {
    final projectedSpending = burnRate * 3; // 3 months projection

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.attach_money, size: 18, color: Colors.green),
              ),
              const SizedBox(width: 10),
              const Text(
                'Projection Summary',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Use 2x2 grid for mobile
          Row(
            children: [
              Expanded(
                child: _buildProjectionStat(
                  'Total Variable Costs',
                  BudgetService.formatCurrency(_totalSpent, _budget!.currency),
                  isDark,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildProjectionStat(
                  'Projected Spending',
                  BudgetService.formatCurrency(projectedSpending, _budget!.currency),
                  isDark,
                  valueColor: Colors.orange,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildProjectionStat(
                  'Projection Period',
                  '3 Months',
                  isDark,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Status',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          isOnTrack ? Icons.trending_flat : Icons.trending_up,
                          size: 16,
                          color: isOnTrack ? Colors.green : Colors.red,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          isOnTrack ? 'On Track' : 'At Risk',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isOnTrack ? Colors.green : Colors.red,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProjectionStat(String label, String value, bool isDark, {Color? valueColor}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: valueColor ?? (isDark ? Colors.white : Colors.black87),
          ),
        ),
      ],
    );
  }

  Widget _buildExpensesTab(bool isDark) {
    if (_expenses.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.receipt_long_outlined,
              size: 64,
              color: isDark ? Colors.grey.shade600 : Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'budget.empty.no_expenses'.tr(),
              style: TextStyle(
                fontSize: 16,
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _navigateToAddExpense,
              icon: const Icon(Icons.add),
              label: Text('budget.expense.add'.tr()),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _expenses.length,
      itemBuilder: (context, index) {
        return ExpenseListItem(
          expense: _expenses[index],
          categories: _categories,
        );
      },
    );
  }

  Widget _buildCategoriesTab(bool isDark) {
    if (_categories.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.category_outlined,
              size: 64,
              color: isDark ? Colors.grey.shade600 : Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'budget.empty.no_categories'.tr(),
              style: TextStyle(
                fontSize: 16,
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _navigateToAddCategory,
              icon: const Icon(Icons.add),
              label: Text('budget.category.add'.tr()),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _categories.length,
      itemBuilder: (context, index) {
        final category = _categories[index];
        final spent = _budgetService.calculateCategorySpending(category.id, _expenses);
        return GestureDetector(
          onTap: () => _navigateToEditCategory(category),
          child: CategoryProgressBar(
            category: category,
            spent: spent,
          ),
        );
      },
    );
  }

  Widget _buildTimeTrackingTab(bool isDark) {
    return TimeTrackingView(
      budgetId: widget.budgetId,
      timeEntries: _timeEntries,
      categories: _categories,
      tasks: _projectTasks,
      onStopTimer: _stopTimer,
      onRefresh: _loadData,
    );
  }

  Widget _buildTasksTab(bool isDark) {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id ?? '';
    return TaskBreakdownWidget(
      budgetId: widget.budgetId,
      workspaceId: workspaceId,
      expenses: _expenses,
      timeEntries: _timeEntries,
      tasks: _projectTasks,
      totalBudget: _budget?.totalBudget ?? 0,
      currency: _budget?.currency ?? 'USD',
      canManageTimers: true,
      onStartTimer: _navigateToStartTimer,
      onStopTimer: _stopTimer,
      onRefresh: _loadData,
    );
  }

  void _showAddOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.teal.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.receipt_long_outlined, color: Colors.teal),
                  ),
                  title: Text('budget.expense.add'.tr()),
                  subtitle: const Text('Add a new expense to this budget'),
                  onTap: () {
                    Navigator.pop(context);
                    _navigateToAddExpense();
                  },
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.purple.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.category_outlined, color: Colors.purple),
                  ),
                  title: Text('budget.category.add'.tr()),
                  subtitle: const Text('Add a new category to organize expenses'),
                  onTap: () {
                    Navigator.pop(context);
                    _navigateToAddCategory();
                  },
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.timer_outlined, color: Colors.orange),
                  ),
                  title: const Text('Start Timer'),
                  subtitle: const Text('Go to Tasks to start a timer'),
                  onTap: () {
                    Navigator.pop(context);
                    // Navigate to Tasks tab (index 3)
                    _tabController?.animateTo(3);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Select a task to start a timer'),
                        backgroundColor: Colors.teal,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _navigateToEditBudget() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreateBudgetScreen(budget: _budget),
      ),
    );

    if (result == true) {
      _loadData();
    }
  }

  Future<void> _navigateToAddExpense() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AddExpenseScreen(
          budgetId: widget.budgetId,
          categories: _categories,
          currency: _budget?.currency ?? 'USD',
        ),
      ),
    );

    if (result == true) {
      _loadData();
    }
  }

  Future<void> _navigateToAddCategory() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AddCategoryScreen(budgetId: widget.budgetId),
      ),
    );

    if (result == true) {
      _loadData();
    }
  }

  Future<void> _navigateToEditCategory(BudgetCategory category) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EditCategoryScreen(
          budgetId: widget.budgetId,
          category: category,
        ),
      ),
    );

    if (result == true || result == 'deleted') {
      _loadData();
    }
  }

  Future<void> _navigateToStartTimer(String taskId, String taskName) async {
    // Check if task has budget allocations
    final hasAllocations = _taskAllocations.any((a) => a.taskId == taskId);

    if (!hasAllocations) {
      // Show dialog asking user to add budget allocations first
      final shouldProceed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.warning_amber, color: Colors.orange),
              SizedBox(width: 8),
              Expanded(child: Text('No Budget Allocation')),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Task "$taskName" has no budget categories allocated.',
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 12),
              const Text(
                'Time tracked without budget allocation will not create expenses or contribute to budget tracking.',
              ),
              const SizedBox(height: 12),
              const Text(
                'Would you like to add budget allocations to this task first?',
                style: TextStyle(fontStyle: FontStyle.italic),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Start Anyway'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, false),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
              ),
              child: const Text('Add Allocations'),
            ),
          ],
        ),
      );

      if (shouldProceed != true) {
        // User chose to add allocations - show snackbar with instructions
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Go to Categories tab to allocate budget to this task'),
              duration: Duration(seconds: 3),
            ),
          );
        }
        return;
      }
    }

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => StartTimerScreen(
          budgetId: widget.budgetId,
          taskId: taskId,
          taskName: taskName,
          categories: _categories,
        ),
      ),
    );

    if (result == true) {
      _loadData();
    }
  }

  void _navigateToBillingRates() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const BillingRatesScreen(),
      ),
    );
  }

  Future<void> _stopTimer(String entryId) async {
    try {
      await _budgetService.stopTimer(entryId);
      _loadData();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Timer stopped'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to stop timer: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showDeleteConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('budget.delete'.tr()),
        content: Text('budget.delete_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _deleteBudget();
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteBudget() async {
    try {
      await _budgetService.deleteBudget(widget.budgetId);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('budget.deleted'.tr()),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
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

// Custom Sliver Tab Bar Delegate
class _SliverTabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  final bool isDark;

  _SliverTabBarDelegate(this.tabBar, {required this.isDark});

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: isDark ? Colors.black : Colors.grey.shade50,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverTabBarDelegate oldDelegate) {
    return tabBar != oldDelegate.tabBar || isDark != oldDelegate.isDark;
  }
}

// Donut Chart Painter
class _DonutChartPainter extends CustomPainter {
  final double percentage;
  final bool isDark;

  _DonutChartPainter({required this.percentage, required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2;
    const strokeWidth = 16.0;

    // Background arc
    final bgPaint = Paint()
      ..color = isDark ? Colors.grey.shade800 : Colors.grey.shade200
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius - strokeWidth / 2, bgPaint);

    // Foreground arc (spent portion)
    if (percentage > 0) {
      final fgPaint = Paint()
        ..color = Colors.orange
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round;

      final sweepAngle = (percentage / 100) * 2 * math.pi;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius - strokeWidth / 2),
        -math.pi / 2,
        sweepAngle,
        false,
        fgPaint,
      );
    }

    // Remaining arc
    if (percentage < 100) {
      final remainingPaint = Paint()
        ..color = Colors.teal
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round;

      final startAngle = -math.pi / 2 + (percentage / 100) * 2 * math.pi;
      final sweepAngle = ((100 - percentage) / 100) * 2 * math.pi;

      if (percentage > 0) {
        canvas.drawArc(
          Rect.fromCircle(center: center, radius: radius - strokeWidth / 2),
          startAngle,
          sweepAngle,
          false,
          remainingPaint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(_DonutChartPainter oldDelegate) {
    return percentage != oldDelegate.percentage || isDark != oldDelegate.isDark;
  }
}

// Spending Trend Chart Painter
class _SpendingTrendChartPainter extends CustomPainter {
  final double budget;
  final double spent;
  final double avgMonthlySpending;
  final String currency;
  final bool isDark;

  _SpendingTrendChartPainter({
    required this.budget,
    required this.spent,
    required this.avgMonthlySpending,
    required this.currency,
    required this.isDark,
  });

  String _formatValue(double value) {
    if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(0)}k';
    }
    return value.toStringAsFixed(0);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final bgColor = isDark ? Colors.grey.shade800 : Colors.grey.shade200;
    final chartLeft = 45.0;
    final chartRight = size.width - 10;
    final chartTop = 10.0;
    final chartBottom = size.height - 30;
    final chartHeight = chartBottom - chartTop;
    final chartWidth = chartRight - chartLeft;

    // Determine max value for Y-axis (budget or projected max, whichever is higher)
    final projectedTotal = spent + (avgMonthlySpending * 3);
    final maxValue = math.max(budget, math.max(projectedTotal, spent)) * 1.1;
    final effectiveMax = maxValue > 0 ? maxValue : 1000;

    // Draw grid lines
    final gridPaint = Paint()
      ..color = bgColor
      ..strokeWidth = 1;

    final textStyle = TextStyle(
      fontSize: 9,
      color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
    );

    // Draw 5 horizontal grid lines with labels
    for (int i = 0; i <= 4; i++) {
      final y = chartBottom - (chartHeight / 4 * i);
      canvas.drawLine(Offset(chartLeft, y), Offset(chartRight, y), gridPaint);

      // Y-axis labels
      final value = (effectiveMax / 4 * i);
      final textSpan = TextSpan(text: _formatValue(value), style: textStyle);
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: ui.TextDirection.ltr,
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(chartLeft - textPainter.width - 5, y - 6));
    }

    // Draw X-axis labels
    final xLabels = ['Current', '+1M', '+2M', '+3M'];
    final xStep = chartWidth / 3;
    for (int i = 0; i < xLabels.length; i++) {
      final x = chartLeft + (xStep * i);
      final textSpan = TextSpan(text: xLabels[i], style: textStyle);
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: ui.TextDirection.ltr,
      );
      textPainter.layout();
      textPainter.paint(canvas, Offset(x - textPainter.width / 2, chartBottom + 8));
    }

    // Helper to convert value to Y coordinate
    double valueToY(double value) {
      return chartBottom - (value / effectiveMax * chartHeight);
    }

    // Draw budget limit line (red dashed)
    if (budget > 0) {
      final budgetY = valueToY(budget);
      final dashPaint = Paint()
        ..color = Colors.red
        ..strokeWidth = 2;

      const dashWidth = 8.0;
      const dashSpace = 4.0;
      double startX = chartLeft;
      while (startX < chartRight) {
        canvas.drawLine(
          Offset(startX, budgetY),
          Offset(math.min(startX + dashWidth, chartRight), budgetY),
          dashPaint,
        );
        startX += dashWidth + dashSpace;
      }
    }

    // Draw actual spending line (blue solid)
    final actualPaint = Paint()
      ..color = Colors.blue
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final actualPath = Path();
    final currentY = valueToY(spent);

    // Start from 0 at the beginning
    actualPath.moveTo(chartLeft, chartBottom);
    // Line to current spent
    actualPath.lineTo(chartLeft + xStep * 0.3, currentY);

    canvas.drawPath(actualPath, actualPaint);

    // Draw point at current spending
    canvas.drawCircle(
      Offset(chartLeft + xStep * 0.3, currentY),
      4,
      Paint()..color = Colors.blue,
    );

    // Draw projected spending line (green dashed)
    if (avgMonthlySpending > 0 || spent > 0) {
      final projectedPaint = Paint()
        ..color = Colors.green
        ..strokeWidth = 2
        ..style = PaintingStyle.stroke;

      // Calculate projected values for each month
      final month1 = spent + avgMonthlySpending;
      final month2 = spent + avgMonthlySpending * 2;
      final month3 = spent + avgMonthlySpending * 3;

      final points = [
        Offset(chartLeft + xStep * 0.3, currentY),
        Offset(chartLeft + xStep * 1, valueToY(month1)),
        Offset(chartLeft + xStep * 2, valueToY(month2)),
        Offset(chartLeft + xStep * 3, valueToY(month3)),
      ];

      // Draw dashed line through projected points
      const dashWidth = 6.0;
      const dashSpace = 4.0;

      for (int i = 0; i < points.length - 1; i++) {
        final start = points[i];
        final end = points[i + 1];
        final dx = end.dx - start.dx;
        final dy = end.dy - start.dy;
        final distance = math.sqrt(dx * dx + dy * dy);
        final unitX = dx / distance;
        final unitY = dy / distance;

        double d = 0;
        while (d < distance) {
          final x1 = start.dx + unitX * d;
          final y1 = start.dy + unitY * d;
          final x2 = start.dx + unitX * math.min(d + dashWidth, distance);
          final y2 = start.dy + unitY * math.min(d + dashWidth, distance);
          canvas.drawLine(Offset(x1, y1), Offset(x2, y2), projectedPaint);
          d += dashWidth + dashSpace;
        }
      }

      // Draw small circles at projection points
      for (int i = 1; i < points.length; i++) {
        canvas.drawCircle(
          points[i],
          3,
          Paint()..color = Colors.green.withValues(alpha: 0.7),
        );
      }
    }
  }

  @override
  bool shouldRepaint(_SpendingTrendChartPainter oldDelegate) {
    return budget != oldDelegate.budget ||
        spent != oldDelegate.spent ||
        avgMonthlySpending != oldDelegate.avgMonthlySpending ||
        isDark != oldDelegate.isDark;
  }
}

// Dashed Line Painter
class _DashedLinePainter extends CustomPainter {
  final Color color;

  _DashedLinePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2;

    const dashWidth = 4.0;
    const dashSpace = 2.0;
    double startX = 0;
    while (startX < size.width) {
      canvas.drawLine(
        Offset(startX, size.height / 2),
        Offset(math.min(startX + dashWidth, size.width), size.height / 2),
        paint,
      );
      startX += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(_DashedLinePainter oldDelegate) {
    return color != oldDelegate.color;
  }
}
