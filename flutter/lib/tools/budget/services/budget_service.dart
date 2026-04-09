import 'package:flutter/foundation.dart';
import '../../../services/auth_service.dart';
import '../../../config/app_config.dart';
import '../models/budget_models.dart';

/// Service for budget management API operations
class BudgetService {
  static BudgetService? _instance;
  static BudgetService get instance => _instance ??= BudgetService._();

  BudgetService._();

  /// Get the base URL for budget endpoints
  Future<String> _getBaseUrl() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    return '/workspaces/$workspaceId/budgets';
  }

  // ============================================
  // Budget CRUD Operations
  // ============================================

  /// Get all budgets for the current workspace
  Future<List<Budget>> getBudgets({String? projectId}) async {
    try {
      final baseUrl = await _getBaseUrl();
      final queryParams = projectId != null ? {'projectId': projectId} : null;

      final response = await AuthService.instance.dio.get(
        baseUrl,
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final data = response.data;
        final budgetsData = data is Map ? (data['data'] ?? data) : data;

        if (budgetsData is List) {
          return budgetsData
              .map((json) => Budget.fromJson(json as Map<String, dynamic>))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching budgets: $e');
      rethrow;
    }
  }

  /// Get a single budget by ID
  Future<Budget> getBudget(String budgetId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/$budgetId');

      if (response.statusCode == 200) {
        final data = response.data;
        final budgetData = data is Map && data.containsKey('data') ? data['data'] : data;
        return Budget.fromJson(budgetData as Map<String, dynamic>);
      }
      throw Exception('Failed to fetch budget');
    } catch (e) {
      debugPrint('Error fetching budget: $e');
      rethrow;
    }
  }

  /// Create a new budget
  Future<Budget> createBudget(CreateBudgetRequest request) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.post(
        baseUrl,
        data: request.toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        final budgetData = data is Map && data.containsKey('data') ? data['data'] : data;
        return Budget.fromJson(budgetData as Map<String, dynamic>);
      }
      throw Exception('Failed to create budget');
    } catch (e) {
      debugPrint('Error creating budget: $e');
      rethrow;
    }
  }

  /// Update an existing budget
  Future<Budget> updateBudget(String budgetId, UpdateBudgetRequest request) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.patch(
        '$baseUrl/$budgetId',
        data: request.toJson(),
      );

      if (response.statusCode == 200) {
        final data = response.data;
        final budgetData = data is Map && data.containsKey('data') ? data['data'] : data;
        return Budget.fromJson(budgetData as Map<String, dynamic>);
      }
      throw Exception('Failed to update budget');
    } catch (e) {
      debugPrint('Error updating budget: $e');
      rethrow;
    }
  }

  /// Delete a budget
  Future<void> deleteBudget(String budgetId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.delete('$baseUrl/$budgetId');

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception('Failed to delete budget');
      }
    } catch (e) {
      debugPrint('Error deleting budget: $e');
      rethrow;
    }
  }

  /// Get budget summary with computed totals
  Future<BudgetSummary> getBudgetSummary(String budgetId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/$budgetId/summary');

      if (response.statusCode == 200) {
        final data = response.data;
        final summaryData = data is Map && data.containsKey('data') ? data['data'] : data;
        return BudgetSummary.fromJson(summaryData as Map<String, dynamic>);
      }
      throw Exception('Failed to fetch budget summary');
    } catch (e) {
      debugPrint('Error fetching budget summary: $e');
      rethrow;
    }
  }

  // ============================================
  // Category Operations
  // ============================================

  /// Get all categories for a budget
  Future<List<BudgetCategory>> getCategories(String budgetId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/$budgetId/categories');

      if (response.statusCode == 200) {
        final data = response.data;
        final categoriesData = data is Map ? (data['data'] ?? data) : data;

        if (categoriesData is List) {
          return categoriesData
              .map((json) => BudgetCategory.fromJson(json as Map<String, dynamic>))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching categories: $e');
      rethrow;
    }
  }

  /// Create a new category for a budget
  Future<BudgetCategory> createCategory(String budgetId, CreateCategoryRequest request) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.post(
        '$baseUrl/$budgetId/categories',
        data: request.toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        final categoryData = data is Map && data.containsKey('data') ? data['data'] : data;
        return BudgetCategory.fromJson(categoryData as Map<String, dynamic>);
      }
      throw Exception('Failed to create category');
    } catch (e) {
      debugPrint('Error creating category: $e');
      rethrow;
    }
  }

  // ============================================
  // Expense Operations
  // ============================================

  /// Get all expenses for a budget
  Future<List<BudgetExpense>> getExpenses(String budgetId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/$budgetId/expenses');

      if (response.statusCode == 200) {
        final data = response.data;
        final expensesData = data is Map ? (data['data'] ?? data) : data;

        if (expensesData is List) {
          return expensesData
              .map((json) => BudgetExpense.fromJson(json as Map<String, dynamic>))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching expenses: $e');
      rethrow;
    }
  }

  /// Create a new expense
  Future<BudgetExpense> createExpense(CreateExpenseRequest request) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.post(
        '$baseUrl/expenses',
        data: request.toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        final expenseData = data is Map && data.containsKey('data') ? data['data'] : data;
        return BudgetExpense.fromJson(expenseData as Map<String, dynamic>);
      }
      throw Exception('Failed to create expense');
    } catch (e) {
      debugPrint('Error creating expense: $e');
      rethrow;
    }
  }

  /// Approve an expense
  Future<void> approveExpense(String expenseId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.post(
        '$baseUrl/expenses/$expenseId/approve',
        data: {},
      );

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception('Failed to approve expense');
      }
    } catch (e) {
      debugPrint('Error approving expense: $e');
      rethrow;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /// Calculate spending for a category from expenses
  double calculateCategorySpending(String categoryId, List<BudgetExpense> expenses) {
    return expenses
        .where((e) => e.categoryId == categoryId && !e.rejected)
        .fold(0.0, (sum, e) => sum + e.amount);
  }

  /// Check if expense will exceed category budget
  bool willExceedCategoryBudget({
    required double expenseAmount,
    required BudgetCategory category,
    required List<BudgetExpense> existingExpenses,
  }) {
    final currentSpent = calculateCategorySpending(category.id, existingExpenses);
    return (currentSpent + expenseAmount) > category.allocatedAmount;
  }

  /// Get status color based on percentage used
  static String getStatusColor(double percentageUsed) {
    if (percentageUsed >= 100) return '#EF4444'; // Red
    if (percentageUsed >= 80) return '#F59E0B'; // Orange
    return '#10B981'; // Green
  }

  /// Format currency amount
  static String formatCurrency(double amount, String currency) {
    final symbol = Currencies.symbols[currency] ?? currency;
    return '$symbol${amount.toStringAsFixed(2)}';
  }

  // ============================================
  // Time Tracking Operations
  // ============================================

  /// Start a new timer
  Future<TimeEntry> startTimer(StartTimerRequest request) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.post(
        '$baseUrl/time-entries/start',
        data: request.toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        final entryData = data is Map && data.containsKey('data') ? data['data'] : data;
        return TimeEntry.fromJson(entryData as Map<String, dynamic>);
      }
      throw Exception('Failed to start timer');
    } catch (e) {
      debugPrint('Error starting timer: $e');
      rethrow;
    }
  }

  /// Stop a running timer
  Future<TimeEntry> stopTimer(String timeEntryId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.post(
        '$baseUrl/time-entries/stop',
        data: {'timeEntryId': timeEntryId},
      );

      if (response.statusCode == 200) {
        final data = response.data;
        final entryData = data is Map && data.containsKey('data') ? data['data'] : data;
        return TimeEntry.fromJson(entryData as Map<String, dynamic>);
      }
      throw Exception('Failed to stop timer');
    } catch (e) {
      debugPrint('Error stopping timer: $e');
      rethrow;
    }
  }

  /// Get the currently running timer for the user
  Future<TimeEntry?> getRunningTimer() async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/time-entries/running');

      if (response.statusCode == 200) {
        final data = response.data;
        final entryData = data is Map && data.containsKey('data') ? data['data'] : data;
        if (entryData == null) return null;
        return TimeEntry.fromJson(entryData as Map<String, dynamic>);
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching running timer: $e');
      return null;
    }
  }

  /// Get running timer for a specific task
  Future<TimeEntry?> getRunningTimerForTask(String taskId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/time-entries/task/$taskId/running');

      if (response.statusCode == 200) {
        final data = response.data;
        final entryData = data is Map && data.containsKey('data') ? data['data'] : data;
        if (entryData == null) return null;
        return TimeEntry.fromJson(entryData as Map<String, dynamic>);
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching running timer for task: $e');
      return null;
    }
  }

  /// Get all running timers for a task (from all users)
  Future<List<TimeEntry>> getAllRunningTimersForTask(String taskId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/time-entries/task/$taskId/running/all');

      if (response.statusCode == 200) {
        final data = response.data;
        final entriesData = data is Map ? (data['data'] ?? data) : data;

        if (entriesData is List) {
          return entriesData
              .map((json) => TimeEntry.fromJson(json as Map<String, dynamic>))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching all running timers for task: $e');
      return [];
    }
  }

  /// Get all time entries for the workspace
  Future<List<TimeEntry>> getTimeEntries({String? budgetId, String? taskId}) async {
    try {
      final baseUrl = await _getBaseUrl();
      final queryParams = <String, dynamic>{};
      if (budgetId != null) queryParams['budgetId'] = budgetId;
      if (taskId != null) queryParams['taskId'] = taskId;

      final response = await AuthService.instance.dio.get(
        '$baseUrl/time-entries',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      if (response.statusCode == 200) {
        final data = response.data;
        final entriesData = data is Map ? (data['data'] ?? data) : data;

        if (entriesData is List) {
          return entriesData
              .map((json) => TimeEntry.fromJson(json as Map<String, dynamic>))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching time entries: $e');
      rethrow;
    }
  }

  /// Get all time entries for a specific budget
  Future<List<TimeEntry>> getAllTimeEntriesForBudget(String budgetId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/$budgetId/time-entries/all');

      if (response.statusCode == 200) {
        final data = response.data;
        final entriesData = data is Map ? (data['data'] ?? data) : data;

        if (entriesData is List) {
          return entriesData
              .map((json) => TimeEntry.fromJson(json as Map<String, dynamic>))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching all time entries for budget: $e');
      rethrow;
    }
  }

  /// Create a manual time entry
  Future<TimeEntry> createTimeEntry(CreateTimeEntryRequest request) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.post(
        '$baseUrl/time-entries',
        data: request.toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        final entryData = data is Map && data.containsKey('data') ? data['data'] : data;
        return TimeEntry.fromJson(entryData as Map<String, dynamic>);
      }
      throw Exception('Failed to create time entry');
    } catch (e) {
      debugPrint('Error creating time entry: $e');
      rethrow;
    }
  }

  /// Delete a time entry
  Future<void> deleteTimeEntry(String timeEntryId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.delete('$baseUrl/time-entries/$timeEntryId');

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception('Failed to delete time entry');
      }
    } catch (e) {
      debugPrint('Error deleting time entry: $e');
      rethrow;
    }
  }

  // ============================================
  // Billing Rate Operations
  // ============================================

  /// Get all billing rates for the workspace
  Future<List<BillingRate>> getBillingRates() async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/billing-rates');

      if (response.statusCode == 200) {
        final data = response.data;
        final ratesData = data is Map ? (data['data'] ?? data) : data;

        if (ratesData is List) {
          return ratesData
              .map((json) => BillingRate.fromJson(json as Map<String, dynamic>))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching billing rates: $e');
      rethrow;
    }
  }

  /// Get billing rate for a specific user
  Future<BillingRate?> getUserBillingRate(String userId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/billing-rates/user/$userId');

      if (response.statusCode == 200) {
        final data = response.data;
        final rateData = data is Map && data.containsKey('data') ? data['data'] : data;
        if (rateData == null) return null;
        return BillingRate.fromJson(rateData as Map<String, dynamic>);
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching user billing rate: $e');
      return null;
    }
  }

  /// Create a new billing rate
  Future<BillingRate> createBillingRate(CreateBillingRateRequest request) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.post(
        '$baseUrl/billing-rates',
        data: request.toJson(),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        final rateData = data is Map && data.containsKey('data') ? data['data'] : data;
        return BillingRate.fromJson(rateData as Map<String, dynamic>);
      }
      throw Exception('Failed to create billing rate');
    } catch (e) {
      debugPrint('Error creating billing rate: $e');
      rethrow;
    }
  }

  /// Delete a billing rate
  Future<void> deleteBillingRate(String billingRateId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.delete('$baseUrl/billing-rates/$billingRateId');

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception('Failed to delete billing rate');
      }
    } catch (e) {
      debugPrint('Error deleting billing rate: $e');
      rethrow;
    }
  }

  // ============================================
  // Task Budget Allocation Operations
  // ============================================

  /// Get all task allocations for a budget
  Future<List<TaskBudgetAllocation>> getTaskAllocations(String budgetId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/$budgetId/allocations');

      if (response.statusCode == 200) {
        final data = response.data;
        final allocationsData = data is Map ? (data['data'] ?? data) : data;

        if (allocationsData is List) {
          return allocationsData
              .map((json) => TaskBudgetAllocation.fromJson(json as Map<String, dynamic>))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching task allocations: $e');
      rethrow;
    }
  }

  /// Create task allocations for a budget
  Future<List<TaskBudgetAllocation>> createTaskAllocations(
    String budgetId,
    List<CreateTaskAllocationRequest> requests,
  ) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.post(
        '$baseUrl/task-allocations',
        data: {
          'budgetId': budgetId,
          'allocations': requests.map((r) => r.toJson()).toList(),
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        final allocationsData = data is Map ? (data['data'] ?? data) : data;

        if (allocationsData is List) {
          return allocationsData
              .map((json) => TaskBudgetAllocation.fromJson(json as Map<String, dynamic>))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error creating task allocations: $e');
      rethrow;
    }
  }

  /// Update a task allocation
  Future<TaskBudgetAllocation> updateTaskAllocation(
    String allocationId,
    UpdateTaskAllocationRequest request,
  ) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.patch(
        '$baseUrl/task-allocations/$allocationId',
        data: request.toJson(),
      );

      if (response.statusCode == 200) {
        final data = response.data;
        final allocationData = data is Map && data.containsKey('data') ? data['data'] : data;
        return TaskBudgetAllocation.fromJson(allocationData as Map<String, dynamic>);
      }
      throw Exception('Failed to update task allocation');
    } catch (e) {
      debugPrint('Error updating task allocation: $e');
      rethrow;
    }
  }

  /// Delete a task allocation
  Future<void> deleteTaskAllocation(String allocationId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.delete('$baseUrl/task-allocations/$allocationId');

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception('Failed to delete task allocation');
      }
    } catch (e) {
      debugPrint('Error deleting task allocation: $e');
      rethrow;
    }
  }

  // ============================================
  // Task Assignee Rate Operations
  // ============================================

  /// Get assignee rates for a task
  Future<List<TaskAssigneeRate>> getTaskAssigneeRates(String taskId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/task-assignee-rates/$taskId');

      if (response.statusCode == 200) {
        final data = response.data;
        final ratesData = data is Map ? (data['data'] ?? data) : data;

        if (ratesData is List) {
          return ratesData
              .map((json) => TaskAssigneeRate.fromJson(json as Map<String, dynamic>))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching task assignee rates: $e');
      rethrow;
    }
  }

  /// Get assignee rate for a specific user on a task
  Future<TaskAssigneeRate?> getTaskAssigneeRate(String taskId, String userId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/task-assignee-rates/$taskId/user/$userId');

      if (response.statusCode == 200) {
        final data = response.data;
        final rateData = data is Map && data.containsKey('data') ? data['data'] : data;
        if (rateData == null) return null;
        return TaskAssigneeRate.fromJson(rateData as Map<String, dynamic>);
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching task assignee rate: $e');
      return null;
    }
  }

  /// Set assignee rates for a task
  Future<List<TaskAssigneeRate>> setTaskAssigneeRates(
    String taskId,
    List<SetTaskAssigneeRateRequest> requests,
  ) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.post(
        '$baseUrl/task-assignee-rates/$taskId',
        data: {
          'rates': requests.map((r) => r.toJson()).toList(),
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        final ratesData = data is Map ? (data['data'] ?? data) : data;

        if (ratesData is List) {
          return ratesData
              .map((json) => TaskAssigneeRate.fromJson(json as Map<String, dynamic>))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error setting task assignee rates: $e');
      rethrow;
    }
  }

  /// Delete a task assignee rate
  Future<void> deleteTaskAssigneeRate(String taskId, String userId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.delete('$baseUrl/task-assignee-rates/$taskId/user/$userId');

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception('Failed to delete task assignee rate');
      }
    } catch (e) {
      debugPrint('Error deleting task assignee rate: $e');
      rethrow;
    }
  }

  // ============================================
  // Category Update/Delete Operations
  // ============================================

  /// Update a category
  Future<BudgetCategory> updateCategory(
    String budgetId,
    String categoryId,
    UpdateCategoryRequest request,
  ) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.patch(
        '$baseUrl/$budgetId/categories/$categoryId',
        data: request.toJson(),
      );

      if (response.statusCode == 200) {
        final data = response.data;
        final categoryData = data is Map && data.containsKey('data') ? data['data'] : data;
        return BudgetCategory.fromJson(categoryData as Map<String, dynamic>);
      }
      throw Exception('Failed to update category');
    } catch (e) {
      debugPrint('Error updating category: $e');
      rethrow;
    }
  }

  /// Delete a category
  Future<void> deleteCategory(String budgetId, String categoryId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.delete('$baseUrl/$budgetId/categories/$categoryId');

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception('Failed to delete category');
      }
    } catch (e) {
      debugPrint('Error deleting category: $e');
      rethrow;
    }
  }

  // ============================================
  // Expense Reject Operation
  // ============================================

  /// Reject an expense
  Future<void> rejectExpense(String expenseId, RejectExpenseRequest request) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.post(
        '$baseUrl/expenses/$expenseId/reject',
        data: request.toJson(),
      );

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception('Failed to reject expense');
      }
    } catch (e) {
      debugPrint('Error rejecting expense: $e');
      rethrow;
    }
  }

  // ============================================
  // Analytics Operations
  // ============================================

  /// Get cost analytics for a budget
  Future<Map<String, dynamic>> getCostAnalytics(String budgetId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/$budgetId/analytics');

      if (response.statusCode == 200) {
        final data = response.data;
        return data is Map && data.containsKey('data')
            ? data['data'] as Map<String, dynamic>
            : data as Map<String, dynamic>;
      }
      return {};
    } catch (e) {
      debugPrint('Error fetching cost analytics: $e');
      return {};
    }
  }

  /// Get variable cost projections for a budget
  Future<Map<String, dynamic>> getVariableCostProjections(String budgetId) async {
    try {
      final baseUrl = await _getBaseUrl();
      final response = await AuthService.instance.dio.get('$baseUrl/$budgetId/projections');

      if (response.statusCode == 200) {
        final data = response.data;
        return data is Map && data.containsKey('data')
            ? data['data'] as Map<String, dynamic>
            : data as Map<String, dynamic>;
      }
      return {};
    } catch (e) {
      debugPrint('Error fetching variable cost projections: $e');
      return {};
    }
  }

  // ============================================
  // Additional Helper Methods
  // ============================================

  /// Format duration from minutes to human readable string
  static String formatDuration(int minutes) {
    if (minutes == 0) return '0m';
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    if (hours == 0) return '${mins}m';
    if (mins == 0) return '${hours}h';
    return '${hours}h ${mins}m';
  }

  /// Calculate time tracking stats from entries
  static TimeTrackingStats calculateTimeTrackingStats(List<TimeEntry> entries) {
    return TimeTrackingStats.fromTimeEntries(entries);
  }
}
