import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetch';

// Note: Backend returns data directly without wrapper
// No ApiResponse wrapper needed

// ==================== TYPES ====================

export interface Budget {
  id: string;
  workspaceId: string;
  projectId?: string;
  name: string;
  description?: string;
  budgetType: 'project' | 'task' | 'phase' | 'resource';
  totalBudget: number;
  currency: string;
  startDate?: string;
  endDate?: string;
  alertThreshold: number;
  status: 'active' | 'exceeded' | 'completed' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  id: string;
  budgetId: string;
  name: string;
  description?: string;
  allocatedAmount: number;
  categoryType: 'labor' | 'materials' | 'software' | 'travel' | 'overhead' | 'other';
  costNature: 'fixed' | 'variable';
  color?: string;
  createdAt: string;
  updatedAt: string;
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
  expenseType: 'time_tracked' | 'manual' | 'invoice' | 'purchase';
  expenseDate: string;
  billable: boolean;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejected?: boolean;
  rejectionReason?: string;
  rejectedAt?: string;
  approvalRequestId?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  vendor?: string;
  invoiceNumber?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  workspaceId: string;
  taskId: string;
  userId: string;
  description?: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  billable: boolean;
  billingRate?: number;
  billedAmount?: number;
  currency: string;
  isRunning: boolean;
  isApproved: boolean;
  createdAt: string;
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
  createdAt: string;
}

export interface TaskBudgetAllocation {
  id: string;
  taskId: string;
  budgetId: string;
  categoryId: string;
  allocatedAmount: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  categoryName?: string;
  costNature?: 'fixed' | 'variable';
  categoryType?: string;
  color?: string;
}

export interface TaskAssigneeRate {
  id: string;
  taskId: string;
  userId: string;
  hourlyRate: number;
  currency: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskAllocationDto {
  taskId: string;
  budgetId: string;
  allocations: Array<{
    categoryId: string;
    allocatedAmount: number;
    notes?: string;
  }>;
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

// ==================== BUDGETS ====================

export const useCreateBudget = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Budget, 'id' | 'workspaceId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'status'>) => {
      const response = await api.post<Budget>(`/workspaces/${workspaceId}/budgets`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', workspaceId] });
    },
  });
};

export const useBudgets = (workspaceId: string, projectId?: string) => {
  return useQuery({
    queryKey: ['budgets', workspaceId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      const query = params.toString();
      const response = await api.get<Budget[]>(`/workspaces/${workspaceId}/budgets${query ? `?${query}` : ''}`);
      return response;
    },
    enabled: !!workspaceId,
  });
};

export const useBudget = (workspaceId: string, budgetId: string) => {
  return useQuery({
    queryKey: ['budget', workspaceId, budgetId],
    queryFn: async () => {
      const response = await api.get<Budget>(`/workspaces/${workspaceId}/budgets/${budgetId}`);
      return response;
    },
    enabled: !!workspaceId && !!budgetId,
  });
};

export const useUpdateBudget = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ budgetId, data }: { budgetId: string; data: Partial<Budget> }) => {
      const response = await api.patch<Budget>(`/workspaces/${workspaceId}/budgets/${budgetId}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['budget', workspaceId, variables.budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', workspaceId, variables.budgetId] });
    },
  });
};

export const useDeleteBudget = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (budgetId: string) => {
      await api.delete(`/workspaces/${workspaceId}/budgets/${budgetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', workspaceId] });
    },
  });
};

export const useBudgetSummary = (workspaceId: string, budgetId: string) => {
  return useQuery({
    queryKey: ['budget-summary', workspaceId, budgetId],
    queryFn: async () => {
      const response = await api.get<BudgetSummary>(`/workspaces/${workspaceId}/budgets/${budgetId}/summary`);
      return response;
    },
    enabled: !!workspaceId && !!budgetId,
  });
};

// ==================== CATEGORIES ====================

export const useCreateCategory = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ budgetId, data }: { budgetId: string; data: Omit<BudgetCategory, 'id' | 'budgetId' | 'createdAt' | 'updatedAt'> }) => {
      const response = await api.post<BudgetCategory>(`/workspaces/${workspaceId}/budgets/${budgetId}/categories`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories', workspaceId, variables.budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', workspaceId, variables.budgetId] });
    },
  });
};

export const useCategories = (workspaceId: string, budgetId: string) => {
  return useQuery({
    queryKey: ['categories', workspaceId, budgetId],
    queryFn: async () => {
      const response = await api.get<BudgetCategory[]>(`/workspaces/${workspaceId}/budgets/${budgetId}/categories`);
      return response;
    },
    enabled: !!workspaceId && !!budgetId,
  });
};

export const useUpdateCategory = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ budgetId, categoryId, data }: { budgetId: string; categoryId: string; data: Partial<BudgetCategory> }) => {
      const response = await api.patch<BudgetCategory>(
        `/workspaces/${workspaceId}/budgets/${budgetId}/categories/${categoryId}`,
        data
      );
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories', workspaceId, variables.budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', workspaceId, variables.budgetId] });
    },
  });
};

export const useDeleteCategory = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ budgetId, categoryId }: { budgetId: string; categoryId: string }) => {
      await api.delete(`/workspaces/${workspaceId}/budgets/${budgetId}/categories/${categoryId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories', workspaceId, variables.budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', workspaceId, variables.budgetId] });
    },
  });
};

export const useCostAnalytics = (workspaceId: string, budgetId: string) => {
  return useQuery({
    queryKey: ['budget-analytics', workspaceId, budgetId],
    queryFn: async () => {
      const response = await api.get<BudgetSummary>(`/workspaces/${workspaceId}/budgets/${budgetId}/analytics`);
      return response;
    },
    enabled: !!workspaceId && !!budgetId,
  });
};

export const useVariableCostProjections = (workspaceId: string, budgetId: string, months: number = 3) => {
  return useQuery({
    queryKey: ['budget-projections', workspaceId, budgetId, months],
    queryFn: async () => {
      const response = await api.get<{
        budgetId: string;
        projectionMonths: number;
        projections: Array<{
          categoryId: string;
          categoryName: string;
          categoryType: string;
          currentSpent: number;
          monthlyAverage: number;
          projectedTotal: number;
          allocatedAmount: number;
          projectedOverage: number;
        }>;
        totalProjectedSpend: number;
        totalAllocated: number;
      }>(`/workspaces/${workspaceId}/budgets/${budgetId}/projections?months=${months}`);
      return response;
    },
    enabled: !!workspaceId && !!budgetId,
  });
};

// ==================== EXPENSES ====================

export const useCreateExpense = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<BudgetExpense, 'id' | 'approved' | 'approvedBy' | 'approvedAt' | 'createdBy' | 'createdAt'>) => {
      const response = await api.post<BudgetExpense>(`/workspaces/${workspaceId}/budgets/expenses`, data);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', workspaceId, data.budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', workspaceId, data.budgetId] });
    },
  });
};

export const useExpenses = (workspaceId: string, budgetId: string) => {
  return useQuery({
    queryKey: ['expenses', workspaceId, budgetId],
    queryFn: async () => {
      const response = await api.get<BudgetExpense[]>(`/workspaces/${workspaceId}/budgets/${budgetId}/expenses`);
      return response;
    },
    enabled: !!workspaceId && !!budgetId,
  });
};

export const useApproveExpense = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, budgetId }: { expenseId: string; budgetId: string }) => {
      const response = await api.post<BudgetExpense>(`/workspaces/${workspaceId}/budgets/expenses/${expenseId}/approve`, {});
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', workspaceId, variables.budgetId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', workspaceId, variables.budgetId] });
    },
  });
};

// ==================== TIME ENTRIES ====================

export const useCreateTimeEntry = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { taskId: string; description?: string; startTime: string; endTime?: string; billable?: boolean }) => {
      const response = await api.post<TimeEntry>(`/workspaces/${workspaceId}/budgets/time-entries`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
};

export const useStartTimer = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      taskId: string;
      assigneeId: string;
      hourlyRate: number;
      description?: string;
      billable?: boolean
    }) => {
      const response = await api.post<TimeEntry>(`/workspaces/${workspaceId}/budgets/time-entries/start`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['all-time-entries-budget'] });
      queryClient.invalidateQueries({ queryKey: ['running-timer', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['running-timer-task', workspaceId, variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['all-running-timers-task', workspaceId, variables.taskId] });
    },
  });
};

export const useStopTimer = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { timeEntryId: string; taskId: string; budgetId?: string }) => {
      const response = await api.post<TimeEntry>(`/workspaces/${workspaceId}/budgets/time-entries/stop`, { timeEntryId: data.timeEntryId });
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['all-time-entries-budget'] });
      queryClient.invalidateQueries({ queryKey: ['running-timer', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['running-timer-task', workspaceId, variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['all-running-timers-task', workspaceId, variables.taskId] });
      // Invalidate budget data since expense is auto-created
      if (variables.budgetId) {
        queryClient.invalidateQueries({ queryKey: ['expenses', workspaceId, variables.budgetId] });
        queryClient.invalidateQueries({ queryKey: ['budget-summary', workspaceId, variables.budgetId] });
      }
    },
  });
};

export const useRunningTimer = (workspaceId: string) => {
  return useQuery({
    queryKey: ['running-timer', workspaceId],
    queryFn: async () => {
      try {
        const response = await api.get<TimeEntry | null>(`/workspaces/${workspaceId}/budgets/time-entries/running`);
        return response;
      } catch (error) {
        console.error('Error fetching running timer:', error);
        return null;
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: false,
  });
};

export const useRunningTimerForTask = (workspaceId: string, taskId: string) => {
  return useQuery({
    queryKey: ['running-timer-task', workspaceId, taskId],
    queryFn: async () => {
      const response = await api.get<TimeEntry | null>(`/workspaces/${workspaceId}/budgets/time-entries/task/${taskId}/running`);
      return response;
    },
    enabled: !!workspaceId && !!taskId,
    refetchInterval: 3000, // Refresh every 3 seconds
  });
};

export const useAllRunningTimersForTask = (workspaceId: string, taskId: string) => {
  return useQuery({
    queryKey: ['all-running-timers-task', workspaceId, taskId],
    queryFn: async () => {
      const response = await api.get<TimeEntry[]>(`/workspaces/${workspaceId}/budgets/time-entries/task/${taskId}/running/all`);
      return response;
    },
    enabled: !!workspaceId && !!taskId,
    refetchInterval: 3000, // Refresh every 3 seconds
  });
};

export const useTimeEntries = (workspaceId: string, taskId?: string) => {
  return useQuery({
    queryKey: ['time-entries', workspaceId, taskId],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (taskId) params.append('taskId', taskId);
        const query = params.toString();
        const response = await api.get<TimeEntry[]>(`/workspaces/${workspaceId}/budgets/time-entries${query ? `?${query}` : ''}`);
        return response;
      } catch (error) {
        console.error('Error fetching time entries:', error);
        return [];
      }
    },
    retry: false,
  });
};

export const useAllTimeEntriesForBudget = (workspaceId: string, budgetId: string, taskId?: string) => {
  return useQuery({
    queryKey: ['all-time-entries-budget', workspaceId, budgetId, taskId],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (taskId) params.append('taskId', taskId);
        const query = params.toString();
        const response = await api.get<TimeEntry[]>(
          `/workspaces/${workspaceId}/budgets/${budgetId}/time-entries/all${query ? `?${query}` : ''}`
        );
        return response;
      } catch (error) {
        console.error('Error fetching all time entries for budget:', error);
        return [];
      }
    },
    retry: false,
  });
};

// ==================== BILLING RATES ====================

export const useCreateBillingRate = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<BillingRate, 'id' | 'workspaceId' | 'isActive' | 'createdAt'>) => {
      const response = await api.post<BillingRate>(`/workspaces/${workspaceId}/budgets/billing-rates`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-rates', workspaceId] });
    },
  });
};

export const useBillingRates = (workspaceId: string) => {
  return useQuery({
    queryKey: ['billing-rates', workspaceId],
    queryFn: async () => {
      const response = await api.get<BillingRate[]>(`/workspaces/${workspaceId}/budgets/billing-rates`);
      return response;
    },
  });
};

export const useUserBillingRate = (workspaceId: string, userId: string | null) => {
  return useQuery({
    queryKey: ['user-billing-rate', workspaceId, userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const response = await api.get<BillingRate | null>(`/workspaces/${workspaceId}/budgets/billing-rates/user/${userId}`);
        return response;
      } catch (error) {
        console.error('Error fetching user billing rate:', error);
        return null;
      }
    },
    enabled: !!workspaceId && !!userId,
    retry: false,
  });
};

// ==================== TASK BUDGET ALLOCATIONS ====================

export const useCreateTaskAllocations = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskAllocationDto) => {
      const response = await api.post<TaskBudgetAllocation[]>(
        `/workspaces/${workspaceId}/budgets/task-allocations`,
        data
      );
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-allocations', workspaceId, variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', workspaceId] });
    },
  });
};

export const useTaskAllocations = (workspaceId: string, taskId: string) => {
  return useQuery({
    queryKey: ['task-allocations', workspaceId, taskId],
    queryFn: async () => {
      const response = await api.get<TaskBudgetAllocation[]>(
        `/workspaces/${workspaceId}/budgets/task-allocations/${taskId}`
      );
      return response;
    },
    enabled: !!taskId,
  });
};

export const useUpdateTaskAllocation = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ allocationId, data }: { allocationId: string; data: { allocatedAmount: number; notes?: string } }) => {
      const response = await api.patch<TaskBudgetAllocation>(
        `/workspaces/${workspaceId}/budgets/task-allocations/${allocationId}`,
        data
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-allocations', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', workspaceId] });
    },
  });
};

export const useDeleteTaskAllocation = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allocationId: string) => {
      await api.delete(`/workspaces/${workspaceId}/budgets/task-allocations/${allocationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-allocations', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', workspaceId] });
    },
  });
};

// ==================== TASK ASSIGNEE RATES ====================

export const useSetTaskAssigneeRates = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, rates }: { taskId: string; rates: Array<{ userId: string; hourlyRate: number; currency?: string; notes?: string }> }) => {
      const response = await api.post<TaskAssigneeRate[]>(
        `/workspaces/${workspaceId}/budgets/task-assignee-rates/${taskId}`,
        { rates }
      );
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignee-rates', workspaceId, variables.taskId] });
    },
  });
};

export const useTaskAssigneeRates = (workspaceId: string, taskId: string) => {
  return useQuery({
    queryKey: ['task-assignee-rates', workspaceId, taskId],
    queryFn: async () => {
      const response = await api.get<TaskAssigneeRate[]>(
        `/workspaces/${workspaceId}/budgets/task-assignee-rates/${taskId}`
      );
      return response;
    },
    enabled: !!workspaceId && !!taskId,
  });
};

export const useTaskAssigneeRate = (workspaceId: string, taskId: string, userId: string | null) => {
  return useQuery({
    queryKey: ['task-assignee-rate', workspaceId, taskId, userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const response = await api.get<TaskAssigneeRate | null>(
          `/workspaces/${workspaceId}/budgets/task-assignee-rates/${taskId}/user/${userId}`
        );
        return response;
      } catch (error) {
        console.error('Error fetching task assignee rate:', error);
        return null;
      }
    },
    enabled: !!workspaceId && !!taskId && !!userId,
    retry: false,
  });
};

export const useDeleteTaskAssigneeRate = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      await api.delete(`/workspaces/${workspaceId}/budgets/task-assignee-rates/${taskId}/user/${userId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignee-rates', workspaceId, variables.taskId] });
    },
  });
};
