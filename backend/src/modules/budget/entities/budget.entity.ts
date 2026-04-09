export interface Budget {
  id: string;
  workspaceId: string;
  projectId?: string;
  name: string;
  description?: string;
  budgetType: string;
  totalBudget: number;
  currency: string;
  startDate?: string;
  endDate?: string;
  alertThreshold: number;
  status: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetCategory {
  id: string;
  budgetId: string;
  name: string;
  description?: string;
  allocatedAmount: number;
  categoryType: string;
  costNature: string; // 'fixed' | 'variable'
  color?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetExpense {
  id: string;
  budgetId: string;
  categoryId?: string;
  taskId?: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  quantity?: number;
  unitPrice?: number;
  unitOfMeasure?: string;
  expenseType: string;
  expenseDate: string;
  billable: boolean;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  receiptUrl?: string;
  receiptFileName?: string;
  vendor?: string;
  invoiceNumber?: string;
  notes?: string;
  metadata: Record<string, any>;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingRate {
  id: string;
  workspaceId: string;
  userId?: string;
  role?: string;
  rateName?: string;
  hourlyRate: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeEntry {
  id: string;
  workspaceId: string;
  taskId: string;
  userId: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  durationSeconds: number;
  billable: boolean;
  billingRate?: number;
  billingRateId?: string;
  billedAmount?: number;
  currency: string;
  isRunning: boolean;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  metadata: Record<string, any>;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskBudgetAllocation {
  id: string;
  taskId: string;
  budgetId: string;
  categoryId: string;
  allocatedAmount: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskAssigneeRate {
  id: string;
  taskId: string;
  userId: string;
  hourlyRate: number;
  currency: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetSummary {
  budget: Budget;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  costAnalysis: {
    fixed: {
      allocated: number;
      spent: number;
      remaining: number;
    };
    variable: {
      allocated: number;
      spent: number;
      remaining: number;
    };
    breakdown: {
      fixed: Array<{
        categoryId: string;
        categoryName: string;
        categoryType: string;
        allocated: number;
        spent: number;
        remaining: number;
      }>;
      variable: Array<{
        categoryId: string;
        categoryName: string;
        categoryType: string;
        allocated: number;
        spent: number;
        remaining: number;
      }>;
    };
  };
  categoryBreakdown: Array<{
    category: BudgetCategory;
    spent: number;
    percentage: number;
  }>;
  expenseCount: number;
  timeEntryCount: number;
  recentExpenses: BudgetExpense[];
}
