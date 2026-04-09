// Budget data models for expense tracking and budget management

class Budget {
  final String id;
  final String workspaceId;
  final String? projectId;
  final String name;
  final String? description;
  final String budgetType; // 'project', 'task', 'phase', 'resource'
  final double totalBudget;
  final String currency;
  final DateTime? startDate;
  final DateTime? endDate;
  final int alertThreshold; // 0-100 percentage
  final String status; // 'active', 'exceeded', 'completed', 'archived'
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Budget({
    required this.id,
    required this.workspaceId,
    this.projectId,
    required this.name,
    this.description,
    this.budgetType = 'project',
    required this.totalBudget,
    this.currency = 'USD',
    this.startDate,
    this.endDate,
    this.alertThreshold = 80,
    this.status = 'active',
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Budget.fromJson(Map<String, dynamic> json) {
    return Budget(
      id: _parseStringField(json['id']) ?? '',
      workspaceId: _parseStringField(json['workspaceId'] ?? json['workspace_id']) ?? '',
      projectId: _parseStringField(json['projectId'] ?? json['project_id']),
      name: _parseStringField(json['name']) ?? 'Untitled Budget',
      description: _parseStringField(json['description']),
      budgetType: _parseStringField(json['budgetType'] ?? json['budget_type']) ?? 'project',
      totalBudget: _parseDoubleField(json['totalBudget'] ?? json['total_budget']) ?? 0.0,
      currency: _parseStringField(json['currency']) ?? 'USD',
      startDate: _parseDateTimeField(json['startDate'] ?? json['start_date']),
      endDate: _parseDateTimeField(json['endDate'] ?? json['end_date']),
      alertThreshold: _parseIntField(json['alertThreshold'] ?? json['alert_threshold']) ?? 80,
      status: _parseStringField(json['status']) ?? 'active',
      createdBy: _parseStringField(json['createdBy'] ?? json['created_by']) ?? '',
      createdAt: _parseDateTimeField(json['createdAt'] ?? json['created_at']) ?? DateTime.now(),
      updatedAt: _parseDateTimeField(json['updatedAt'] ?? json['updated_at']) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'projectId': projectId,
      'name': name,
      'description': description,
      'budgetType': budgetType,
      'totalBudget': totalBudget,
      'currency': currency,
      'startDate': startDate?.toIso8601String(),
      'endDate': endDate?.toIso8601String(),
      'alertThreshold': alertThreshold,
      'status': status,
      'createdBy': createdBy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  Budget copyWith({
    String? id,
    String? workspaceId,
    String? projectId,
    String? name,
    String? description,
    String? budgetType,
    double? totalBudget,
    String? currency,
    DateTime? startDate,
    DateTime? endDate,
    int? alertThreshold,
    String? status,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Budget(
      id: id ?? this.id,
      workspaceId: workspaceId ?? this.workspaceId,
      projectId: projectId ?? this.projectId,
      name: name ?? this.name,
      description: description ?? this.description,
      budgetType: budgetType ?? this.budgetType,
      totalBudget: totalBudget ?? this.totalBudget,
      currency: currency ?? this.currency,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      alertThreshold: alertThreshold ?? this.alertThreshold,
      status: status ?? this.status,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class BudgetExpense {
  final String id;
  final String budgetId;
  final String? categoryId;
  final String? taskId;
  final String title;
  final String? description;
  final double amount;
  final String currency;
  final String expenseType; // 'manual', 'invoice', 'purchase', 'time_tracked'
  final DateTime expenseDate;
  final bool billable;
  final bool approved;
  final String? approvedBy;
  final DateTime? approvedAt;
  final bool rejected;
  final String? rejectionReason;
  final DateTime? rejectedAt;
  final String? vendor;
  final String? invoiceNumber;
  final String? receiptUrl;
  final String? notes;
  final String createdBy;
  final DateTime createdAt;

  const BudgetExpense({
    required this.id,
    required this.budgetId,
    this.categoryId,
    this.taskId,
    required this.title,
    this.description,
    required this.amount,
    this.currency = 'USD',
    this.expenseType = 'manual',
    required this.expenseDate,
    this.billable = false,
    this.approved = false,
    this.approvedBy,
    this.approvedAt,
    this.rejected = false,
    this.rejectionReason,
    this.rejectedAt,
    this.vendor,
    this.invoiceNumber,
    this.receiptUrl,
    this.notes,
    required this.createdBy,
    required this.createdAt,
  });

  factory BudgetExpense.fromJson(Map<String, dynamic> json) {
    return BudgetExpense(
      id: _parseStringField(json['id']) ?? '',
      budgetId: _parseStringField(json['budgetId'] ?? json['budget_id']) ?? '',
      categoryId: _parseStringField(json['categoryId'] ?? json['category_id']),
      taskId: _parseStringField(json['taskId'] ?? json['task_id']),
      title: _parseStringField(json['title']) ?? 'Untitled Expense',
      description: _parseStringField(json['description']),
      amount: _parseDoubleField(json['amount']) ?? 0.0,
      currency: _parseStringField(json['currency']) ?? 'USD',
      expenseType: _parseStringField(json['expenseType'] ?? json['expense_type']) ?? 'manual',
      expenseDate: _parseDateTimeField(json['expenseDate'] ?? json['expense_date']) ?? DateTime.now(),
      billable: _parseBoolField(json['billable']) ?? false,
      approved: _parseBoolField(json['approved']) ?? false,
      approvedBy: _parseStringField(json['approvedBy'] ?? json['approved_by']),
      approvedAt: _parseDateTimeField(json['approvedAt'] ?? json['approved_at']),
      rejected: _parseBoolField(json['rejected']) ?? false,
      rejectionReason: _parseStringField(json['rejectionReason'] ?? json['rejection_reason']),
      rejectedAt: _parseDateTimeField(json['rejectedAt'] ?? json['rejected_at']),
      vendor: _parseStringField(json['vendor']),
      invoiceNumber: _parseStringField(json['invoiceNumber'] ?? json['invoice_number']),
      receiptUrl: _parseStringField(json['receiptUrl'] ?? json['receipt_url']),
      notes: _parseStringField(json['notes']),
      createdBy: _parseStringField(json['createdBy'] ?? json['created_by']) ?? '',
      createdAt: _parseDateTimeField(json['createdAt'] ?? json['created_at']) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'budgetId': budgetId,
      'categoryId': categoryId,
      'taskId': taskId,
      'title': title,
      'description': description,
      'amount': amount,
      'currency': currency,
      'expenseType': expenseType,
      'expenseDate': expenseDate.toIso8601String(),
      'billable': billable,
      'approved': approved,
      'approvedBy': approvedBy,
      'approvedAt': approvedAt?.toIso8601String(),
      'rejected': rejected,
      'rejectionReason': rejectionReason,
      'rejectedAt': rejectedAt?.toIso8601String(),
      'vendor': vendor,
      'invoiceNumber': invoiceNumber,
      'receiptUrl': receiptUrl,
      'notes': notes,
      'createdBy': createdBy,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class BudgetCategory {
  final String id;
  final String budgetId;
  final String name;
  final String? description;
  final double allocatedAmount;
  final String categoryType; // 'labor', 'materials', 'software', 'travel', 'overhead', 'other'
  final String? costNature; // 'fixed', 'variable'
  final String? color; // hex color
  final DateTime createdAt;
  final DateTime updatedAt;

  const BudgetCategory({
    required this.id,
    required this.budgetId,
    required this.name,
    this.description,
    required this.allocatedAmount,
    this.categoryType = 'other',
    this.costNature,
    this.color,
    required this.createdAt,
    required this.updatedAt,
  });

  factory BudgetCategory.fromJson(Map<String, dynamic> json) {
    return BudgetCategory(
      id: _parseStringField(json['id']) ?? '',
      budgetId: _parseStringField(json['budgetId'] ?? json['budget_id']) ?? '',
      name: _parseStringField(json['name']) ?? 'Unnamed Category',
      description: _parseStringField(json['description']),
      allocatedAmount: _parseDoubleField(json['allocatedAmount'] ?? json['allocated_amount']) ?? 0.0,
      categoryType: _parseStringField(json['categoryType'] ?? json['category_type']) ?? 'other',
      costNature: _parseStringField(json['costNature'] ?? json['cost_nature']),
      color: _parseStringField(json['color']),
      createdAt: _parseDateTimeField(json['createdAt'] ?? json['created_at']) ?? DateTime.now(),
      updatedAt: _parseDateTimeField(json['updatedAt'] ?? json['updated_at']) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'budgetId': budgetId,
      'name': name,
      'description': description,
      'allocatedAmount': allocatedAmount,
      'categoryType': categoryType,
      'costNature': costNature,
      'color': color,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class CategoryBreakdown {
  final BudgetCategory category;
  final double spent;
  final double percentage;

  const CategoryBreakdown({
    required this.category,
    required this.spent,
    required this.percentage,
  });

  factory CategoryBreakdown.fromJson(Map<String, dynamic> json) {
    return CategoryBreakdown(
      category: BudgetCategory.fromJson(json['category'] as Map<String, dynamic>),
      spent: _parseDoubleField(json['spent']) ?? 0.0,
      percentage: _parseDoubleField(json['percentage']) ?? 0.0,
    );
  }
}

class BudgetSummary {
  final Budget budget;
  final double totalSpent;
  final double remaining;
  final double percentageUsed;
  final List<CategoryBreakdown> categoryBreakdown;
  final int expenseCount;
  final int timeEntryCount;
  final List<BudgetExpense> recentExpenses;

  const BudgetSummary({
    required this.budget,
    required this.totalSpent,
    required this.remaining,
    required this.percentageUsed,
    this.categoryBreakdown = const [],
    this.expenseCount = 0,
    this.timeEntryCount = 0,
    this.recentExpenses = const [],
  });

  factory BudgetSummary.fromJson(Map<String, dynamic> json) {
    return BudgetSummary(
      budget: Budget.fromJson(json['budget'] as Map<String, dynamic>),
      totalSpent: _parseDoubleField(json['totalSpent'] ?? json['total_spent']) ?? 0.0,
      remaining: _parseDoubleField(json['remaining']) ?? 0.0,
      percentageUsed: _parseDoubleField(json['percentageUsed'] ?? json['percentage_used']) ?? 0.0,
      categoryBreakdown: _parseCategoryBreakdownList(json['categoryBreakdown'] ?? json['category_breakdown']),
      expenseCount: _parseIntField(json['expenseCount'] ?? json['expense_count']) ?? 0,
      timeEntryCount: _parseIntField(json['timeEntryCount'] ?? json['time_entry_count']) ?? 0,
      recentExpenses: _parseExpenseList(json['recentExpenses'] ?? json['recent_expenses']),
    );
  }

  static List<CategoryBreakdown> _parseCategoryBreakdownList(dynamic value) {
    if (value == null) return [];
    if (value is List) {
      try {
        return value.map((item) => CategoryBreakdown.fromJson(item as Map<String, dynamic>)).toList();
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  static List<BudgetExpense> _parseExpenseList(dynamic value) {
    if (value == null) return [];
    if (value is List) {
      try {
        return value.map((item) => BudgetExpense.fromJson(item as Map<String, dynamic>)).toList();
      } catch (e) {
        return [];
      }
    }
    return [];
  }
}

// Request models for API calls

class CreateBudgetRequest {
  final String name;
  final String? description;
  final String budgetType;
  final double totalBudget;
  final String currency;
  final DateTime? startDate;
  final DateTime? endDate;
  final int alertThreshold;
  final String? projectId;
  final bool createDefaultCategories;

  const CreateBudgetRequest({
    required this.name,
    this.description,
    this.budgetType = 'project',
    required this.totalBudget,
    this.currency = 'USD',
    this.startDate,
    this.endDate,
    this.alertThreshold = 80,
    this.projectId,
    this.createDefaultCategories = true,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'budgetType': budgetType,
      'totalBudget': totalBudget,
      'currency': currency,
      'startDate': startDate?.toIso8601String(),
      'endDate': endDate?.toIso8601String(),
      'alertThreshold': alertThreshold,
      'projectId': projectId,
    };
  }
}

class UpdateBudgetRequest {
  final String? name;
  final String? description;
  final double? totalBudget;
  final String? currency;
  final DateTime? startDate;
  final DateTime? endDate;
  final int? alertThreshold;
  final String? status;

  const UpdateBudgetRequest({
    this.name,
    this.description,
    this.totalBudget,
    this.currency,
    this.startDate,
    this.endDate,
    this.alertThreshold,
    this.status,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (name != null) map['name'] = name;
    if (description != null) map['description'] = description;
    if (totalBudget != null) map['totalBudget'] = totalBudget;
    if (currency != null) map['currency'] = currency;
    if (startDate != null) map['startDate'] = startDate!.toIso8601String();
    if (endDate != null) map['endDate'] = endDate!.toIso8601String();
    if (alertThreshold != null) map['alertThreshold'] = alertThreshold;
    if (status != null) map['status'] = status;
    return map;
  }
}

class CreateExpenseRequest {
  final String budgetId;
  final String? categoryId;
  final String? taskId;
  final String title;
  final String? description;
  final double amount;
  final String currency;
  final String expenseType;
  final DateTime expenseDate;
  final bool billable;
  final String? vendor;
  final String? invoiceNumber;

  const CreateExpenseRequest({
    required this.budgetId,
    this.categoryId,
    this.taskId,
    required this.title,
    this.description,
    required this.amount,
    this.currency = 'USD',
    this.expenseType = 'manual',
    required this.expenseDate,
    this.billable = false,
    this.vendor,
    this.invoiceNumber,
  });

  Map<String, dynamic> toJson() {
    return {
      'budgetId': budgetId,
      'categoryId': categoryId,
      'taskId': taskId,
      'title': title,
      'description': description,
      'amount': amount,
      'currency': currency,
      'expenseType': expenseType,
      'expenseDate': expenseDate.toIso8601String(),
      'billable': billable,
      'vendor': vendor,
      'invoiceNumber': invoiceNumber,
    };
  }
}

class CreateCategoryRequest {
  final String name;
  final String? description;
  final double allocatedAmount;
  final String categoryType;
  final String? costNature;
  final String? color;

  const CreateCategoryRequest({
    required this.name,
    this.description,
    required this.allocatedAmount,
    this.categoryType = 'other',
    this.costNature,
    this.color,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'allocatedAmount': allocatedAmount,
      'categoryType': categoryType,
      'costNature': costNature,
      'color': color,
    };
  }
}

// Helper parsing functions
String? _parseStringField(dynamic value) {
  if (value == null) return null;
  if (value is String) return value;
  return value.toString();
}

double? _parseDoubleField(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  if (value is String) {
    return double.tryParse(value);
  }
  return null;
}

int? _parseIntField(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) {
    return int.tryParse(value);
  }
  return null;
}

bool? _parseBoolField(dynamic value) {
  if (value == null) return null;
  if (value is bool) return value;
  if (value is String) {
    return value.toLowerCase() == 'true';
  }
  if (value is num) {
    return value != 0;
  }
  return null;
}

DateTime? _parseDateTimeField(dynamic value) {
  if (value == null) return null;
  if (value is String && value.isNotEmpty) {
    try {
      return DateTime.parse(value);
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Constants for budget types and categories
class BudgetTypes {
  static const String project = 'project';
  static const String task = 'task';
  static const String phase = 'phase';
  static const String resource = 'resource';

  static const List<String> all = [project, task, phase, resource];
}

class BudgetStatuses {
  static const String active = 'active';
  static const String exceeded = 'exceeded';
  static const String completed = 'completed';
  static const String archived = 'archived';

  static const List<String> all = [active, exceeded, completed, archived];
}

class ExpenseTypes {
  static const String manual = 'manual';
  static const String invoice = 'invoice';
  static const String purchase = 'purchase';
  static const String timeTracked = 'time_tracked';

  static const List<String> all = [manual, invoice, purchase, timeTracked];
}

class CategoryTypes {
  static const String labor = 'labor';
  static const String materials = 'materials';
  static const String software = 'software';
  static const String travel = 'travel';
  static const String overhead = 'overhead';
  static const String other = 'other';

  static const List<String> all = [labor, materials, software, travel, overhead, other];

  static const Map<String, String> defaultColors = {
    labor: '#3B82F6',
    materials: '#10B981',
    software: '#8B5CF6',
    travel: '#F59E0B',
    overhead: '#EF4444',
    other: '#6B7280',
  };
}

class Currencies {
  static const List<String> supported = [
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'BDT'
  ];

  static const Map<String, String> symbols = {
    'USD': '\$',
    'EUR': '\u20AC',
    'GBP': '\u00A3',
    'JPY': '\u00A5',
    'CAD': 'C\$',
    'AUD': 'A\$',
    'INR': '\u20B9',
    'BDT': '\u09F3',
  };
}

// ============================================
// Time Tracking Models
// ============================================

class TimeEntry {
  final String id;
  final String budgetId;
  final String? categoryId;
  final String? taskId;
  final String? userId;
  final String? description;
  final DateTime startTime;
  final DateTime? endTime;
  final int? durationMinutes;
  final double? hourlyRate;
  final double? totalAmount;
  final bool billable;
  final bool isRunning;
  final String? notes;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TimeEntry({
    required this.id,
    required this.budgetId,
    this.categoryId,
    this.taskId,
    this.userId,
    this.description,
    required this.startTime,
    this.endTime,
    this.durationMinutes,
    this.hourlyRate,
    this.totalAmount,
    this.billable = true,
    this.isRunning = false,
    this.notes,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TimeEntry.fromJson(Map<String, dynamic> json) {
    return TimeEntry(
      id: _parseStringField(json['id']) ?? '',
      budgetId: _parseStringField(json['budgetId'] ?? json['budget_id']) ?? '',
      categoryId: _parseStringField(json['categoryId'] ?? json['category_id']),
      taskId: _parseStringField(json['taskId'] ?? json['task_id']),
      userId: _parseStringField(json['userId'] ?? json['user_id']),
      description: _parseStringField(json['description']),
      startTime: _parseDateTimeField(json['startTime'] ?? json['start_time']) ?? DateTime.now(),
      endTime: _parseDateTimeField(json['endTime'] ?? json['end_time']),
      durationMinutes: _parseIntField(json['durationMinutes'] ?? json['duration_minutes']),
      hourlyRate: _parseDoubleField(json['hourlyRate'] ?? json['hourly_rate']),
      totalAmount: _parseDoubleField(json['totalAmount'] ?? json['total_amount']),
      billable: _parseBoolField(json['billable']) ?? true,
      isRunning: _parseBoolField(json['isRunning'] ?? json['is_running']) ?? false,
      notes: _parseStringField(json['notes']),
      createdBy: _parseStringField(json['createdBy'] ?? json['created_by']) ?? '',
      createdAt: _parseDateTimeField(json['createdAt'] ?? json['created_at']) ?? DateTime.now(),
      updatedAt: _parseDateTimeField(json['updatedAt'] ?? json['updated_at']) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'budgetId': budgetId,
      'categoryId': categoryId,
      'taskId': taskId,
      'userId': userId,
      'description': description,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'durationMinutes': durationMinutes,
      'hourlyRate': hourlyRate,
      'totalAmount': totalAmount,
      'billable': billable,
      'isRunning': isRunning,
      'notes': notes,
      'createdBy': createdBy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  /// Get formatted duration string (e.g., "2h 30m")
  String get formattedDuration {
    final mins = durationMinutes ?? 0;
    if (mins == 0) return '0m';
    final hours = mins ~/ 60;
    final minutes = mins % 60;
    if (hours == 0) return '${minutes}m';
    if (minutes == 0) return '${hours}h';
    return '${hours}h ${minutes}m';
  }

  /// Calculate current duration for running timers
  Duration get currentDuration {
    if (endTime != null) {
      return endTime!.difference(startTime);
    }
    return DateTime.now().difference(startTime);
  }
}

// ============================================
// Billing Rate Models
// ============================================

class BillingRate {
  final String id;
  final String workspaceId;
  final String? userId;
  final String? roleType; // 'user', 'role', 'default'
  final String? roleName;
  final double hourlyRate;
  final String currency;
  final DateTime? effectiveFrom;
  final DateTime? effectiveTo;
  final bool isDefault;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BillingRate({
    required this.id,
    required this.workspaceId,
    this.userId,
    this.roleType,
    this.roleName,
    required this.hourlyRate,
    this.currency = 'USD',
    this.effectiveFrom,
    this.effectiveTo,
    this.isDefault = false,
    required this.createdAt,
    required this.updatedAt,
  });

  factory BillingRate.fromJson(Map<String, dynamic> json) {
    return BillingRate(
      id: _parseStringField(json['id']) ?? '',
      workspaceId: _parseStringField(json['workspaceId'] ?? json['workspace_id']) ?? '',
      userId: _parseStringField(json['userId'] ?? json['user_id']),
      roleType: _parseStringField(json['roleType'] ?? json['role_type']),
      roleName: _parseStringField(json['roleName'] ?? json['role_name']),
      hourlyRate: _parseDoubleField(json['hourlyRate'] ?? json['hourly_rate']) ?? 0.0,
      currency: _parseStringField(json['currency']) ?? 'USD',
      effectiveFrom: _parseDateTimeField(json['effectiveFrom'] ?? json['effective_from']),
      effectiveTo: _parseDateTimeField(json['effectiveTo'] ?? json['effective_to']),
      isDefault: _parseBoolField(json['isDefault'] ?? json['is_default']) ?? false,
      createdAt: _parseDateTimeField(json['createdAt'] ?? json['created_at']) ?? DateTime.now(),
      updatedAt: _parseDateTimeField(json['updatedAt'] ?? json['updated_at']) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'userId': userId,
      'roleType': roleType,
      'roleName': roleName,
      'hourlyRate': hourlyRate,
      'currency': currency,
      'effectiveFrom': effectiveFrom?.toIso8601String(),
      'effectiveTo': effectiveTo?.toIso8601String(),
      'isDefault': isDefault,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

// ============================================
// Task Budget Allocation Models
// ============================================

class TaskBudgetAllocation {
  final String id;
  final String budgetId;
  final String taskId;
  final String? categoryId;
  final double allocatedAmount;
  final double spentAmount;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TaskBudgetAllocation({
    required this.id,
    required this.budgetId,
    required this.taskId,
    this.categoryId,
    required this.allocatedAmount,
    this.spentAmount = 0.0,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TaskBudgetAllocation.fromJson(Map<String, dynamic> json) {
    return TaskBudgetAllocation(
      id: _parseStringField(json['id']) ?? '',
      budgetId: _parseStringField(json['budgetId'] ?? json['budget_id']) ?? '',
      taskId: _parseStringField(json['taskId'] ?? json['task_id']) ?? '',
      categoryId: _parseStringField(json['categoryId'] ?? json['category_id']),
      allocatedAmount: _parseDoubleField(json['allocatedAmount'] ?? json['allocated_amount']) ?? 0.0,
      spentAmount: _parseDoubleField(json['spentAmount'] ?? json['spent_amount']) ?? 0.0,
      notes: _parseStringField(json['notes']),
      createdAt: _parseDateTimeField(json['createdAt'] ?? json['created_at']) ?? DateTime.now(),
      updatedAt: _parseDateTimeField(json['updatedAt'] ?? json['updated_at']) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'budgetId': budgetId,
      'taskId': taskId,
      'categoryId': categoryId,
      'allocatedAmount': allocatedAmount,
      'spentAmount': spentAmount,
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  double get remainingAmount => allocatedAmount - spentAmount;
  double get percentageUsed => allocatedAmount > 0 ? (spentAmount / allocatedAmount) * 100 : 0;
}

// ============================================
// Task Assignee Rate Models
// ============================================

class TaskAssigneeRate {
  final String id;
  final String taskId;
  final String userId;
  final String? userName;
  final double hourlyRate;
  final String currency;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TaskAssigneeRate({
    required this.id,
    required this.taskId,
    required this.userId,
    this.userName,
    required this.hourlyRate,
    this.currency = 'USD',
    required this.createdAt,
    required this.updatedAt,
  });

  factory TaskAssigneeRate.fromJson(Map<String, dynamic> json) {
    return TaskAssigneeRate(
      id: _parseStringField(json['id']) ?? '',
      taskId: _parseStringField(json['taskId'] ?? json['task_id']) ?? '',
      userId: _parseStringField(json['userId'] ?? json['user_id']) ?? '',
      userName: _parseStringField(json['userName'] ?? json['user_name']),
      hourlyRate: _parseDoubleField(json['hourlyRate'] ?? json['hourly_rate']) ?? 0.0,
      currency: _parseStringField(json['currency']) ?? 'USD',
      createdAt: _parseDateTimeField(json['createdAt'] ?? json['created_at']) ?? DateTime.now(),
      updatedAt: _parseDateTimeField(json['updatedAt'] ?? json['updated_at']) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'taskId': taskId,
      'userId': userId,
      'userName': userName,
      'hourlyRate': hourlyRate,
      'currency': currency,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

// ============================================
// Request Models for New Features
// ============================================

class StartTimerRequest {
  final String taskId;
  final String assigneeId;
  final double hourlyRate;
  final String? description;
  final bool billable;

  const StartTimerRequest({
    required this.taskId,
    required this.assigneeId,
    required this.hourlyRate,
    this.description,
    this.billable = true,
  });

  Map<String, dynamic> toJson() {
    return {
      'taskId': taskId,
      'assigneeId': assigneeId,
      'hourlyRate': hourlyRate,
      'description': description,
      'billable': billable,
    };
  }
}

class CreateTimeEntryRequest {
  final String budgetId;
  final String? categoryId;
  final String? taskId;
  final String? description;
  final DateTime startTime;
  final DateTime endTime;
  final double? hourlyRate;
  final bool billable;
  final String? notes;

  const CreateTimeEntryRequest({
    required this.budgetId,
    this.categoryId,
    this.taskId,
    this.description,
    required this.startTime,
    required this.endTime,
    this.hourlyRate,
    this.billable = true,
    this.notes,
  });

  Map<String, dynamic> toJson() {
    return {
      'budgetId': budgetId,
      'categoryId': categoryId,
      'taskId': taskId,
      'description': description,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      'hourlyRate': hourlyRate,
      'billable': billable,
      'notes': notes,
    };
  }
}

class CreateBillingRateRequest {
  final String? userId;
  final String? roleType;
  final String? roleName;
  final double hourlyRate;
  final String currency;
  final DateTime? effectiveFrom;
  final DateTime? effectiveTo;
  final bool isDefault;

  const CreateBillingRateRequest({
    this.userId,
    this.roleType,
    this.roleName,
    required this.hourlyRate,
    this.currency = 'USD',
    this.effectiveFrom,
    this.effectiveTo,
    this.isDefault = false,
  });

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'roleType': roleType,
      'roleName': roleName,
      'hourlyRate': hourlyRate,
      'currency': currency,
      'effectiveFrom': effectiveFrom?.toIso8601String(),
      'effectiveTo': effectiveTo?.toIso8601String(),
      'isDefault': isDefault,
    };
  }
}

class CreateTaskAllocationRequest {
  final String taskId;
  final String? categoryId;
  final double allocatedAmount;
  final String? notes;

  const CreateTaskAllocationRequest({
    required this.taskId,
    this.categoryId,
    required this.allocatedAmount,
    this.notes,
  });

  Map<String, dynamic> toJson() {
    return {
      'taskId': taskId,
      'categoryId': categoryId,
      'allocatedAmount': allocatedAmount,
      'notes': notes,
    };
  }
}

class UpdateTaskAllocationRequest {
  final double? allocatedAmount;
  final String? categoryId;
  final String? notes;

  const UpdateTaskAllocationRequest({
    this.allocatedAmount,
    this.categoryId,
    this.notes,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (allocatedAmount != null) map['allocatedAmount'] = allocatedAmount;
    if (categoryId != null) map['categoryId'] = categoryId;
    if (notes != null) map['notes'] = notes;
    return map;
  }
}

class SetTaskAssigneeRateRequest {
  final String userId;
  final double hourlyRate;
  final String currency;

  const SetTaskAssigneeRateRequest({
    required this.userId,
    required this.hourlyRate,
    this.currency = 'USD',
  });

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'hourlyRate': hourlyRate,
      'currency': currency,
    };
  }
}

class UpdateCategoryRequest {
  final String? name;
  final String? description;
  final double? allocatedAmount;
  final String? categoryType;
  final String? color;
  final String? costNature;

  const UpdateCategoryRequest({
    this.name,
    this.description,
    this.allocatedAmount,
    this.categoryType,
    this.color,
    this.costNature,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (name != null) map['name'] = name;
    if (description != null) map['description'] = description;
    if (allocatedAmount != null) map['allocatedAmount'] = allocatedAmount;
    if (categoryType != null) map['categoryType'] = categoryType;
    if (color != null) map['color'] = color;
    if (costNature != null) map['costNature'] = costNature;
    return map;
  }
}

class RejectExpenseRequest {
  final String reason;

  const RejectExpenseRequest({
    required this.reason,
  });

  Map<String, dynamic> toJson() {
    return {
      'reason': reason,
    };
  }
}

// ============================================
// Additional Constants
// ============================================

class CostNature {
  static const String fixed = 'fixed';
  static const String variable = 'variable';

  static const List<String> all = [fixed, variable];

  static const Map<String, String> descriptions = {
    fixed: 'Fixed cost - remains constant regardless of usage',
    variable: 'Variable cost - changes based on usage or quantity',
  };
}

class RoleTypes {
  static const String user = 'user';
  static const String role = 'role';
  static const String defaultRate = 'default';

  static const List<String> all = [user, role, defaultRate];
}

// ============================================
// Time Tracking Statistics Model
// ============================================

class TimeTrackingStats {
  final int totalEntries;
  final int totalMinutes;
  final double totalBilled;
  final int billableEntries;
  final int nonBillableEntries;
  final int teamMembers;
  final Map<String, int> byCategory;
  final Map<String, int> byTask;

  const TimeTrackingStats({
    this.totalEntries = 0,
    this.totalMinutes = 0,
    this.totalBilled = 0.0,
    this.billableEntries = 0,
    this.nonBillableEntries = 0,
    this.teamMembers = 0,
    this.byCategory = const {},
    this.byTask = const {},
  });

  factory TimeTrackingStats.fromTimeEntries(List<TimeEntry> entries) {
    int totalMinutes = 0;
    double totalBilled = 0.0;
    int billableCount = 0;
    final Map<String, int> byCategory = {};
    final Map<String, int> byTask = {};
    final Set<String> uniqueUsers = {};

    for (final entry in entries) {
      final mins = entry.durationMinutes ?? 0;
      totalMinutes += mins;

      if (entry.billable) {
        billableCount++;
        totalBilled += entry.totalAmount ?? 0;
      }

      if (entry.categoryId != null) {
        byCategory[entry.categoryId!] = (byCategory[entry.categoryId!] ?? 0) + mins;
      }

      if (entry.taskId != null) {
        byTask[entry.taskId!] = (byTask[entry.taskId!] ?? 0) + mins;
      }

      // Track unique team members by createdBy or userId
      if (entry.createdBy.isNotEmpty) {
        uniqueUsers.add(entry.createdBy);
      }
      if (entry.userId != null && entry.userId!.isNotEmpty) {
        uniqueUsers.add(entry.userId!);
      }
    }

    return TimeTrackingStats(
      totalEntries: entries.length,
      totalMinutes: totalMinutes,
      totalBilled: totalBilled,
      billableEntries: billableCount,
      nonBillableEntries: entries.length - billableCount,
      teamMembers: uniqueUsers.length,
      byCategory: byCategory,
      byTask: byTask,
    );
  }

  String get formattedTotalTime {
    final hours = totalMinutes ~/ 60;
    final minutes = totalMinutes % 60;
    if (hours == 0) return '${minutes}m';
    if (minutes == 0) return '${hours}h';
    return '${hours}h ${minutes}m';
  }
}
