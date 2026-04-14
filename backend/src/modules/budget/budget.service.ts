import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateTimeEntryDto, StartTimerDto } from './dto/create-time-entry.dto';
import { CreateBillingRateDto } from './dto/create-billing-rate.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  Budget,
  BudgetExpense,
  TimeEntry,
  BillingRate,
  BudgetCategory,
  BudgetSummary,
  TaskAssigneeRate,
} from './entities/budget.entity';
import { camelCase } from 'change-case';

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvalsService: ApprovalsService,
  ) {}

  // ==================== BUDGETS ====================

  async createBudget(
    workspaceId: string,
    userId: string,
    createBudgetDto: CreateBudgetDto,
  ): Promise<Budget> {
    try {
      const budgetData = {
        workspace_id: workspaceId,
        project_id: createBudgetDto.projectId || null,
        name: createBudgetDto.name,
        description: createBudgetDto.description || null,
        budget_type: createBudgetDto.budgetType || 'project',
        total_budget: createBudgetDto.totalBudget,
        currency: createBudgetDto.currency || 'USD',
        start_date: createBudgetDto.startDate || null,
        end_date: createBudgetDto.endDate || null,
        alert_threshold: createBudgetDto.alertThreshold || 80,
        status: 'active',
        created_by: userId,
      };

      const result = await this.db.insert('budgets', budgetData);
      return this.transformToCamelCase(result);
    } catch (error) {
      this.logger.error('Failed to create budget:', error);
      throw new BadRequestException('Failed to create budget');
    }
  }

  async getBudgets(workspaceId: string, projectId?: string): Promise<Budget[]> {
    try {
      const query = this.db
        .table('budgets')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('is_deleted', '=', false);

      if (projectId) {
        query.where('project_id', '=', projectId);
      }

      const results = await query.execute();
      const data = (results as any).data || results;
      return data.map((r) => this.transformToCamelCase(r));
    } catch (error) {
      this.logger.error('Failed to get budgets:', error);
      throw new BadRequestException('Failed to get budgets');
    }
  }

  async getBudgetById(workspaceId: string, budgetId: string): Promise<Budget> {
    try {
      const result = await this.db
        .table('budgets')
        .select('*')
        .where('id', '=', budgetId)
        .where('workspace_id', '=', workspaceId)
        .where('is_deleted', '=', false)
        .execute();

      const data = (result as any).data || result;
      if (!data || data.length === 0) {
        throw new NotFoundException('Budget not found');
      }

      return this.transformToCamelCase(data[0]);
    } catch (error) {
      this.logger.error('Failed to get budget:', error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to get budget');
    }
  }

  async updateBudget(
    workspaceId: string,
    budgetId: string,
    updateBudgetDto: UpdateBudgetDto,
  ): Promise<Budget> {
    try {
      // Check if budget exists
      await this.getBudgetById(workspaceId, budgetId);

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateBudgetDto.name) updateData.name = updateBudgetDto.name;
      if (updateBudgetDto.description !== undefined)
        updateData.description = updateBudgetDto.description;
      if (updateBudgetDto.totalBudget) updateData.total_budget = updateBudgetDto.totalBudget;
      if (updateBudgetDto.currency) updateData.currency = updateBudgetDto.currency;
      if (updateBudgetDto.startDate !== undefined)
        updateData.start_date = updateBudgetDto.startDate;
      if (updateBudgetDto.endDate !== undefined) updateData.end_date = updateBudgetDto.endDate;
      if (updateBudgetDto.alertThreshold !== undefined)
        updateData.alert_threshold = updateBudgetDto.alertThreshold;
      if (updateBudgetDto.status) updateData.status = updateBudgetDto.status;

      await this.db.update('budgets', { id: budgetId }, updateData);

      return this.getBudgetById(workspaceId, budgetId);
    } catch (error) {
      this.logger.error('Failed to update budget:', error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to update budget');
    }
  }

  async deleteBudget(workspaceId: string, budgetId: string, userId: string): Promise<void> {
    try {
      // Check if budget exists
      await this.getBudgetById(workspaceId, budgetId);

      await this.db.update(
        'budgets',
        { id: budgetId },
        {
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
        },
      );
    } catch (error) {
      this.logger.error('Failed to delete budget:', error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to delete budget');
    }
  }

  /**
   * Auto-update budget status based on spending
   * Sets status to 'exceeded' if total expenses > total budget
   */
  async updateBudgetStatus(budgetId: string): Promise<void> {
    try {
      // Get budget details
      const budgetResult = await this.db
        .table('budgets')
        .select('*')
        .where('id', '=', budgetId)
        .execute();
      const budgets = (budgetResult as any).data || budgetResult;
      if (!budgets || budgets.length === 0) return;

      const budget = budgets[0];
      const totalBudget = budget.total_budget || 0;

      // Get all expenses for this budget
      const expensesResult = await this.db
        .table('budget_expenses')
        .select('*')
        .where('budget_id', '=', budgetId)
        .where('is_deleted', '=', false)
        .execute();
      const expenses = (expensesResult as any).data || expensesResult;

      // Calculate total spent (only approved expenses) - ensure amounts are numbers
      const totalSpent = expenses
        .filter((exp) => exp.approved === true)
        .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

      // Determine new status
      let newStatus = budget.status;
      if (totalSpent > totalBudget) {
        newStatus = 'exceeded';
      } else if (totalSpent >= totalBudget * 0.9) {
        // Keep current status but log warning (90% threshold)
        this.logger.warn(
          `Budget ${budgetId} is at ${Math.round((totalSpent / totalBudget) * 100)}% capacity`,
        );
      }

      // Update status if changed
      if (newStatus !== budget.status) {
        await this.db.update(
          'budgets',
          { id: budgetId },
          {
            status: newStatus,
            updated_at: new Date().toISOString(),
          },
        );
        this.logger.log(
          `Budget ${budgetId} status updated from '${budget.status}' to '${newStatus}'`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to update budget status:', error);
      // Don't throw - this is a background operation
    }
  }

  // ==================== BUDGET SUMMARY ====================

  async getBudgetSummary(workspaceId: string, budgetId: string): Promise<BudgetSummary> {
    try {
      const budget = await this.getBudgetById(workspaceId, budgetId);

      // Get all expenses
      const expenses = await this.getExpenses(workspaceId, budgetId);

      // Calculate total spent - ensure amounts are numbers
      const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const remaining = budget.totalBudget - totalSpent;
      const percentageUsed = budget.totalBudget > 0 ? (totalSpent / budget.totalBudget) * 100 : 0;

      // Get categories
      const categories = await this.getCategories(budgetId);

      // Calculate cost analysis (fixed vs variable)
      const costAnalysis = this.calculateCostAnalysis(categories, expenses);

      // Calculate category breakdown
      const categoryBreakdown = categories.map((category) => {
        const categoryExpenses = expenses.filter((exp) => exp.categoryId === category.id);
        const spent = categoryExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
        const percentage =
          category.allocatedAmount > 0 ? (spent / category.allocatedAmount) * 100 : 0;

        return {
          category,
          spent,
          percentage,
        };
      });

      // Get time entries count
      const timeEntriesResult = await this.db.findMany('time_entries', {
        workspace_id: workspaceId,
        is_deleted: false,
      });

      const timeEntries = (timeEntriesResult as any).data || timeEntriesResult;
      const taskIds = expenses.filter((exp) => exp.taskId).map((exp) => exp.taskId);
      const timeEntryCount = timeEntries.filter((entry) => taskIds.includes(entry.task_id)).length;

      // Get recent expenses (last 10)
      const recentExpenses = expenses
        .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
        .slice(0, 10);

      return {
        budget,
        totalSpent,
        remaining,
        percentageUsed: Math.round(percentageUsed * 100) / 100,
        costAnalysis,
        categoryBreakdown,
        expenseCount: expenses.length,
        timeEntryCount,
        recentExpenses,
      };
    } catch (error) {
      this.logger.error('Failed to get budget summary:', error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to get budget summary');
    }
  }

  private calculateCostAnalysis(categories: BudgetCategory[], expenses: BudgetExpense[]): any {
    const analysis = {
      fixed: { allocated: 0, spent: 0, remaining: 0 },
      variable: { allocated: 0, spent: 0, remaining: 0 },
      breakdown: { fixed: [], variable: [] },
    };

    // Map expenses to categories
    const expensesByCategory = {};
    expenses.forEach((exp) => {
      if (!expensesByCategory[exp.categoryId]) {
        expensesByCategory[exp.categoryId] = [];
      }
      expensesByCategory[exp.categoryId].push(exp);
    });

    // Analyze each category
    categories.forEach((category) => {
      const categoryExpenses = expensesByCategory[category.id] || [];
      const spent = categoryExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const allocated = Number(category.allocatedAmount || 0);
      const costNature = (category as any).costNature || 'variable';

      // Aggregate by nature
      analysis[costNature].allocated += allocated;
      analysis[costNature].spent += spent;
      analysis[costNature].remaining += allocated - spent;

      // Track breakdown
      analysis.breakdown[costNature].push({
        categoryId: category.id,
        categoryName: category.name,
        categoryType: category.categoryType,
        allocated,
        spent,
        remaining: allocated - spent,
      });
    });

    return analysis;
  }

  async getVariableCostProjection(
    workspaceId: string,
    budgetId: string,
    projectionMonths: number = 3,
  ): Promise<any> {
    try {
      const budget = await this.getBudgetById(workspaceId, budgetId);

      // Get variable categories
      const categoriesResult = await this.db
        .table('budget_categories')
        .select('*')
        .where('budget_id', '=', budgetId)
        .where('cost_nature', '=', 'variable')
        .where('is_deleted', '=', false)
        .execute();

      const categories = ((categoriesResult as any).data || categoriesResult).map((c) =>
        this.transformToCamelCase(c),
      );

      // Calculate projections for each category
      const projections = await Promise.all(
        categories.map(async (category) => {
          // Get expenses for this category
          const expensesResult = await this.db
            .table('budget_expenses')
            .select('*')
            .where('category_id', '=', category.id)
            .where('is_deleted', '=', false)
            .execute();

          const categoryExpenses = ((expensesResult as any).data || expensesResult).map((e) =>
            this.transformToCamelCase(e),
          );

          // Calculate monthly average
          const totalSpent = categoryExpenses.reduce(
            (sum, exp) => sum + Number(exp.amount || 0),
            0,
          );
          const monthlyAverage = totalSpent / (projectionMonths || 1);

          return {
            categoryId: category.id,
            categoryName: category.name,
            categoryType: category.categoryType,
            currentSpent: totalSpent,
            monthlyAverage,
            projectedTotal: monthlyAverage * projectionMonths,
            allocatedAmount: Number(category.allocatedAmount || 0),
            projectedOverage:
              monthlyAverage * projectionMonths - Number(category.allocatedAmount || 0),
          };
        }),
      );

      return {
        budgetId,
        projectionMonths,
        projections,
        totalProjectedSpend: projections.reduce((sum, p) => sum + p.projectedTotal, 0),
        totalAllocated: categories.reduce((sum, cat) => sum + Number(cat.allocatedAmount || 0), 0),
      };
    } catch (error) {
      this.logger.error('Failed to get variable cost projection:', error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to get variable cost projection');
    }
  }

  // ==================== CATEGORIES ====================

  async createCategory(
    budgetId: string,
    createCategoryDto: CreateCategoryDto,
  ): Promise<BudgetCategory> {
    try {
      const categoryData = {
        budget_id: budgetId,
        name: createCategoryDto.name,
        description: createCategoryDto.description || null,
        allocated_amount: createCategoryDto.allocatedAmount,
        category_type: createCategoryDto.categoryType || 'other',
        cost_nature: createCategoryDto.costNature || 'variable',
        color: createCategoryDto.color || null,
      };

      const result = await this.db.insert('budget_categories', categoryData);
      const category = this.transformToCamelCase(result);

      // For FIXED cost categories, automatically create an expense
      if (categoryData.cost_nature === 'fixed' && createCategoryDto.allocatedAmount > 0) {
        this.logger.log(`💰 Creating fixed cost expense for category: ${createCategoryDto.name}`);

        // Get budget to determine currency and workspace
        const budgetResult = await this.db.findOne('budgets', { id: budgetId });
        const budgetCurrency = budgetResult?.currency || 'USD';

        const fixedExpenseData = {
          budget_id: budgetId,
          category_id: result.id,
          task_id: null, // Fixed costs are not task-specific
          title: `${createCategoryDto.name} - Fixed Cost`,
          description:
            createCategoryDto.description || `Fixed cost allocation for ${createCategoryDto.name}`,
          amount: createCategoryDto.allocatedAmount,
          currency: budgetCurrency,
          quantity: 1,
          unit_price: createCategoryDto.allocatedAmount,
          unit_of_measure: 'fixed',
          expense_type: 'manual',
          expense_date: new Date().toISOString(),
          billable: true,
          approved: true, // Auto-approve fixed cost expenses
          approved_by: null,
          approved_at: new Date().toISOString(),
          created_by: result.created_by || 'system',
        };

        await this.db.insert('budget_expenses', fixedExpenseData);
        this.logger.log(
          `✅ Created fixed cost expense for ${createCategoryDto.name}: ${createCategoryDto.allocatedAmount} ${budgetCurrency}`,
        );
      }

      return category;
    } catch (error) {
      this.logger.error('Failed to create category:', error);
      throw new BadRequestException('Failed to create category');
    }
  }

  async updateCategory(
    budgetId: string,
    categoryId: string,
    userId: string,
    updateDto: UpdateCategoryDto,
  ): Promise<BudgetCategory> {
    try {
      // Verify category exists and belongs to this budget
      const categoryResult = await this.db
        .table('budget_categories')
        .select('*')
        .where('id', '=', categoryId)
        .where('budget_id', '=', budgetId)
        .where('is_deleted', '=', false)
        .execute();

      const categories = (categoryResult as any).data || categoryResult;
      if (!categories || categories.length === 0) {
        throw new NotFoundException('Category not found');
      }

      // Build update data
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateDto.name) updateData.name = updateDto.name;
      if (updateDto.description !== undefined) updateData.description = updateDto.description;
      if (updateDto.allocatedAmount !== undefined)
        updateData.allocated_amount = updateDto.allocatedAmount;
      if (updateDto.categoryType) updateData.category_type = updateDto.categoryType;
      if (updateDto.costNature) updateData.cost_nature = updateDto.costNature;
      if (updateDto.color !== undefined) updateData.color = updateDto.color;

      // Update category
      await this.db.update('budget_categories', { id: categoryId }, updateData);

      // Fetch and return updated category
      const updatedResult = await this.db
        .table('budget_categories')
        .select('*')
        .where('id', '=', categoryId)
        .execute();

      const updatedData = (updatedResult as any).data || updatedResult;
      return this.transformToCamelCase(updatedData[0]);
    } catch (error) {
      this.logger.error('Failed to update category:', error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to update category');
    }
  }

  async deleteCategory(budgetId: string, categoryId: string, userId: string): Promise<void> {
    try {
      // Verify category exists and belongs to this budget
      const categoryResult = await this.db
        .table('budget_categories')
        .select('*')
        .where('id', '=', categoryId)
        .where('budget_id', '=', budgetId)
        .where('is_deleted', '=', false)
        .execute();

      const categories = (categoryResult as any).data || categoryResult;
      if (!categories || categories.length === 0) {
        throw new NotFoundException('Category not found');
      }

      // Check for existing expenses
      const expensesResult = await this.db
        .table('budget_expenses')
        .select('id')
        .where('category_id', '=', categoryId)
        .where('is_deleted', '=', false)
        .execute();

      const expenses = (expensesResult as any).data || expensesResult;
      if (expenses && expenses.length > 0) {
        throw new BadRequestException(
          'Cannot delete category with existing expenses. Please delete or reassign expenses first.',
        );
      }

      // Soft delete
      await this.db.update(
        'budget_categories',
        { id: categoryId },
        {
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        },
      );

      this.logger.log(`Category ${categoryId} deleted by user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to delete category:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to delete category');
    }
  }

  async getCategories(budgetId: string): Promise<BudgetCategory[]> {
    try {
      const results = await this.db
        .table('budget_categories')
        .select('*')
        .where('budget_id', '=', budgetId)
        .where('is_deleted', '=', false)
        .execute();

      const data = (results as any).data || results;
      return data.map((r) => this.transformToCamelCase(r));
    } catch (error) {
      this.logger.error('Failed to get categories:', error);
      throw new BadRequestException('Failed to get categories');
    }
  }

  // ==================== EXPENSES ====================

  async createExpense(
    workspaceId: string,
    userId: string,
    createExpenseDto: CreateExpenseDto,
  ): Promise<BudgetExpense> {
    try {
      // Get budget to determine currency
      const budget = await this.getBudgetById(workspaceId, createExpenseDto.budgetId);
      const budgetCurrency = budget.currency || 'USD';

      // Check if user is admin or owner
      const isAdminOrOwner = await this.isOwnerOrAdmin(workspaceId, userId);

      // Get category details if provided (for validation)
      let categoryName = null;
      let categoryAllocated = 0;
      let categorySpent = 0;
      if (createExpenseDto.categoryId) {
        try {
          const categoryResult = await this.db
            .table('budget_categories')
            .select('*')
            .where('id', '=', createExpenseDto.categoryId)
            .execute();
          const categories = (categoryResult as any).data || categoryResult;
          if (categories && categories.length > 0) {
            categoryName = categories[0].name;
            categoryAllocated = categories[0].allocated_amount || 0;

            // Get current spending in this category
            const expensesResult = await this.db
              .table('budget_expenses')
              .select('*')
              .where('category_id', '=', createExpenseDto.categoryId)
              .where('is_deleted', '=', false)
              .execute();
            const expenses = (expensesResult as any).data || expensesResult;
            categorySpent = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
          }
        } catch (error) {
          this.logger.warn('Failed to get category details:', error);
        }
      }

      // Create expense data
      const expenseData: any = {
        budget_id: createExpenseDto.budgetId,
        category_id: createExpenseDto.categoryId || null,
        task_id: createExpenseDto.taskId || null,
        title: createExpenseDto.title,
        description: createExpenseDto.description || null,
        amount: createExpenseDto.amount,
        currency: createExpenseDto.currency || budgetCurrency,
        quantity: createExpenseDto.quantity || 1,
        unit_price: createExpenseDto.unitPrice || null,
        unit_of_measure: createExpenseDto.unitOfMeasure || null,
        expense_type: createExpenseDto.expenseType || 'manual',
        expense_date: createExpenseDto.expenseDate,
        billable: createExpenseDto.billable !== undefined ? createExpenseDto.billable : true,
        receipt_url: createExpenseDto.receiptUrl || null,
        receipt_file_name: createExpenseDto.receiptFileName || null,
        vendor: createExpenseDto.vendor || null,
        invoice_number: createExpenseDto.invoiceNumber || null,
        notes: createExpenseDto.notes || null,
        created_by: userId,
      };

      // Admin/Owner: Auto-approve
      if (isAdminOrOwner) {
        expenseData.approved = true;
        expenseData.approved_by = userId;
        expenseData.approved_at = new Date().toISOString();
        this.logger.log(`Admin/Owner ${userId} created expense - auto-approved`);
      } else {
        // Member: Requires approval
        expenseData.approved = false;
        this.logger.log(`Member ${userId} created expense - pending approval`);
      }

      // Insert expense
      const result = await this.db.insert('budget_expenses', expenseData);
      const expense = this.transformToCamelCase(result);

      // Auto-update budget status to 'exceeded' if necessary
      await this.updateBudgetStatus(createExpenseDto.budgetId);

      // Log category overspending warning if applicable
      if (createExpenseDto.categoryId && categoryAllocated > 0) {
        const newCategorySpent = categorySpent + createExpenseDto.amount;
        if (newCategorySpent > categoryAllocated) {
          const overage = newCategorySpent - categoryAllocated;
          this.logger.warn(
            `Category "${categoryName}" is over budget by ${overage}. ` +
              `Allocated: ${categoryAllocated}, Spent: ${newCategorySpent}`,
          );
        }
      }

      // If member (not admin/owner), create approval request
      if (!isAdminOrOwner) {
        try {
          const requestTypeId = await this.getOrCreateExpenseApprovalType(workspaceId, userId);

          // Get workspace owners and admins as default approvers
          const approvers = await this.getWorkspaceApprovers(workspaceId);

          const approvalRequest = await this.approvalsService.createApprovalRequest(
            workspaceId,
            {
              requestTypeId,
              title: `Expense: ${createExpenseDto.title}`,
              description:
                createExpenseDto.description || `Expense approval for ${createExpenseDto.title}`,
              data: {
                expenseId: expense.id,
                amount: createExpenseDto.amount,
                currency: createExpenseDto.currency || budgetCurrency,
                category: categoryName,
                vendor: createExpenseDto.vendor,
                expenseDate: createExpenseDto.expenseDate,
              },
              attachments: createExpenseDto.receiptUrl ? [createExpenseDto.receiptUrl] : [],
              priority: createExpenseDto.amount > 1000 ? ('high' as any) : ('normal' as any),
              approverIds: approvers.length > 0 ? approvers : undefined,
            },
            userId,
          );

          // Store approval request ID in expense
          await this.db.update('budget_expenses', expense.id, {
            approval_request_id: approvalRequest.id,
          });

          this.logger.log(
            `Created approval request ${approvalRequest.id} for expense ${expense.id}`,
          );
        } catch (approvalError) {
          this.logger.error('Failed to create approval request:', approvalError);
          // Don't fail the entire expense creation if approval request fails
        }
      }

      return expense;
    } catch (error) {
      this.logger.error('Failed to create expense:', error);
      throw new BadRequestException('Failed to create expense');
    }
  }

  async getExpenses(workspaceId: string, budgetId: string): Promise<BudgetExpense[]> {
    try {
      const results = await this.db
        .table('budget_expenses')
        .select('*')
        .where('budget_id', '=', budgetId)
        .where('is_deleted', '=', false)
        .execute();

      const data = (results as any).data || results;
      return data.map((r) => this.transformToCamelCase(r));
    } catch (error) {
      this.logger.error('Failed to get expenses:', error);
      throw new BadRequestException('Failed to get expenses');
    }
  }

  async approveExpense(
    workspaceId: string,
    expenseId: string,
    userId: string,
  ): Promise<BudgetExpense> {
    try {
      await this.db.update(
        'budget_expenses',
        { id: expenseId },
        {
          approved: true,
          approved_by: userId,
          approved_at: new Date().toISOString(),
        },
      );

      const result = await this.db.findOne('budget_expenses', { id: expenseId });
      return this.transformToCamelCase(result);
    } catch (error) {
      this.logger.error('Failed to approve expense:', error);
      throw new BadRequestException('Failed to approve expense');
    }
  }

  // ==================== TIME ENTRIES ====================

  async createTimeEntry(
    workspaceId: string,
    userId: string,
    createTimeEntryDto: CreateTimeEntryDto,
  ): Promise<TimeEntry> {
    try {
      const startTime = new Date(createTimeEntryDto.startTime);
      const endTime = createTimeEntryDto.endTime ? new Date(createTimeEntryDto.endTime) : null;
      const durationSeconds = endTime
        ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
        : 0;

      // Get billing rate for user
      const billingRate = await this.getActiveBillingRate(workspaceId, userId);
      const billedAmount =
        billingRate && endTime ? (durationSeconds / 3600) * billingRate.hourlyRate : null;

      // Get budget currency from task
      let budgetCurrency = 'USD';
      try {
        const task = await this.db.findOne('tasks', { id: createTimeEntryDto.taskId });
        if (task?.project_id) {
          const budgetResult = await this.db
            .table('budgets')
            .select('currency')
            .where('project_id', '=', task.project_id)
            .where('is_deleted', '=', false)
            .execute();
          const budgets = (budgetResult as any).data || budgetResult;
          if (budgets && budgets.length > 0) {
            budgetCurrency = budgets[0].currency || 'USD';
          }
        }
      } catch (error) {
        this.logger.warn('Failed to get budget currency, using USD:', error);
      }

      const timeEntryData = {
        workspace_id: workspaceId,
        task_id: createTimeEntryDto.taskId,
        user_id: userId,
        description: createTimeEntryDto.description || null,
        start_time: startTime.toISOString(),
        end_time: endTime ? endTime.toISOString() : null,
        duration_seconds: durationSeconds,
        billable: createTimeEntryDto.billable !== undefined ? createTimeEntryDto.billable : true,
        billing_rate: billingRate ? billingRate.hourlyRate : null,
        billing_rate_id: billingRate ? billingRate.id : null,
        billed_amount: billedAmount,
        currency: billingRate?.currency || budgetCurrency,
        is_running: !endTime,
      };

      const result = await this.db.insert('time_entries', timeEntryData);
      return this.transformToCamelCase(result);
    } catch (error) {
      this.logger.error('Failed to create time entry:', error);
      throw new BadRequestException('Failed to create time entry');
    }
  }

  async startTimer(
    workspaceId: string,
    userId: string,
    startTimerDto: StartTimerDto,
  ): Promise<TimeEntry> {
    try {
      // Stop any running timers for THIS USER on THIS TASK (allow multiple users to have timers on same task)
      await this.stopRunningTimerForUserOnTask(
        workspaceId,
        startTimerDto.taskId,
        startTimerDto.assigneeId,
      );

      // Get task-specific rate for this assignee (if exists)
      let hourlyRate = startTimerDto.hourlyRate;
      const taskRate = await this.getTaskAssigneeRate(
        workspaceId,
        startTimerDto.taskId,
        startTimerDto.assigneeId,
      );
      if (taskRate) {
        hourlyRate = taskRate.hourlyRate;
        this.logger.log(
          `Using task-specific rate for assignee ${startTimerDto.assigneeId}: ${hourlyRate}`,
        );
      }

      // Get budget currency from task
      let budgetCurrency = 'USD';
      try {
        const task = await this.db.findOne('tasks', { id: startTimerDto.taskId });
        if (task?.project_id) {
          const budgetResult = await this.db
            .table('budgets')
            .select('currency')
            .where('project_id', '=', task.project_id)
            .where('is_deleted', '=', false)
            .execute();
          const budgets = (budgetResult as any).data || budgetResult;
          if (budgets && budgets.length > 0) {
            budgetCurrency = budgets[0].currency || 'USD';
          }
        }
      } catch (error) {
        this.logger.warn('Failed to get budget currency, using USD:', error);
      }

      const startTime = new Date();
      const timeEntryData = {
        workspace_id: workspaceId,
        task_id: startTimerDto.taskId,
        user_id: startTimerDto.assigneeId, // Track time for the assignee, not the starter
        description: startTimerDto.description || null,
        start_time: startTime.toISOString(),
        end_time: null,
        duration_seconds: 0,
        billable: startTimerDto.billable !== undefined ? startTimerDto.billable : true,
        billing_rate: hourlyRate,
        billing_rate_id: null, // Manual rate, not from billing_rates table
        billed_amount: null,
        currency: taskRate?.currency || budgetCurrency,
        is_running: true,
        metadata: JSON.stringify({
          started_by: userId, // Admin/owner who started the timer
          task_rate_id: taskRate?.id || null, // Track which rate was used
        }),
      };

      const result = await this.db.insert('time_entries', timeEntryData);
      return this.transformToCamelCase(result);
    } catch (error) {
      this.logger.error('Failed to start timer:', error);
      throw new BadRequestException('Failed to start timer');
    }
  }

  async stopTimer(workspaceId: string, userId: string, timeEntryId: string): Promise<TimeEntry> {
    try {
      const timeEntry = await this.db.findOne('time_entries', {
        id: timeEntryId,
        workspace_id: workspaceId,
      });

      if (!timeEntry) {
        throw new NotFoundException('Time entry not found');
      }

      if (!timeEntry.is_running) {
        throw new BadRequestException('Timer is not running');
      }

      const endTime = new Date();
      const startTime = new Date(timeEntry.start_time);
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      const durationHours = durationSeconds / 3600;

      const billedAmount = timeEntry.billing_rate ? durationHours * timeEntry.billing_rate : null;

      // Update time entry
      await this.db.update(
        'time_entries',
        { id: timeEntryId },
        {
          end_time: endTime.toISOString(),
          duration_seconds: durationSeconds,
          billed_amount: billedAmount,
          is_running: false,
        },
      );

      // Auto-create expenses for all allocated categories
      if (timeEntry.billable) {
        await this.createExpensesFromTaskAllocations(workspaceId, timeEntry, durationHours);
      }

      const result = await this.db.findOne('time_entries', { id: timeEntryId });
      return this.transformToCamelCase(result);
    } catch (error) {
      this.logger.error('Failed to stop timer:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to stop timer');
    }
  }

  async getRunningTimer(workspaceId: string, userId: string): Promise<TimeEntry | null> {
    try {
      const result = await this.db.findOne('time_entries', {
        workspace_id: workspaceId,
        user_id: userId,
        is_running: true,
        is_deleted: false,
      });

      return result ? this.transformToCamelCase(result) : null;
    } catch (error) {
      this.logger.error('Failed to get running timer:', error);
      return null;
    }
  }

  async getRunningTimerForTask(workspaceId: string, taskId: string): Promise<TimeEntry | null> {
    try {
      const result = await this.db.findOne('time_entries', {
        workspace_id: workspaceId,
        task_id: taskId,
        is_running: true,
        is_deleted: false,
      });

      return result ? this.transformToCamelCase(result) : null;
    } catch (error) {
      this.logger.error('Failed to get running timer for task:', error);
      return null;
    }
  }

  async getAllRunningTimersForTask(workspaceId: string, taskId: string): Promise<TimeEntry[]> {
    try {
      const results = await this.db
        .table('time_entries')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('task_id', '=', taskId)
        .where('is_running', '=', true)
        .where('is_deleted', '=', false)
        .execute();

      const data = (results as any).data || results;
      return data.map((r) => this.transformToCamelCase(r));
    } catch (error) {
      this.logger.error('Failed to get all running timers for task:', error);
      return [];
    }
  }

  async getTimeEntries(workspaceId: string, userId: string, taskId?: string): Promise<TimeEntry[]> {
    try {
      const query = this.db
        .table('time_entries')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('is_deleted', '=', false);

      if (taskId) {
        query.where('task_id', '=', taskId);
      }

      const results = await query.execute();
      const data = (results as any).data || results;
      return data.map((r) => this.transformToCamelCase(r));
    } catch (error) {
      this.logger.error('Failed to get time entries:', error);
      throw new BadRequestException('Failed to get time entries');
    }
  }

  async getAllTimeEntriesForBudget(
    workspaceId: string,
    budgetId: string,
    taskId?: string,
  ): Promise<TimeEntry[]> {
    try {
      this.logger.log(
        `🔍 Getting time entries for budget: ${budgetId}, taskFilter: ${taskId || 'all'}`,
      );

      // Get budget to find project
      const budget = await this.getBudgetById(workspaceId, budgetId);
      if (!budget.projectId) {
        this.logger.log(`⚠️  Budget has no project linked`);
        return [];
      }

      // Get ALL tasks for this project (not just those with allocations)
      // This ensures time tracking works for all tasks in the project
      const tasksResult = await this.db
        .table('tasks')
        .select('id')
        .where('project_id', '=', budget.projectId)
        .where('is_deleted', '=', false)
        .execute();

      const tasks = (tasksResult as any).data || tasksResult;
      const taskIds = tasks.map((t: any) => t.id);

      this.logger.log(`✓ Found ${taskIds.length} tasks in project ${budget.projectId}`);

      if (taskIds.length === 0) {
        this.logger.log(`ℹ️  No tasks in this project yet.`);
        return [];
      }

      // Get all time entries for tasks in this project
      const results = await this.db
        .table('time_entries')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('is_deleted', '=', false)
        .execute();

      const allEntries = (results as any).data || results;

      // Filter by task IDs that belong to this project
      let filteredEntries = allEntries.filter((entry: any) => taskIds.includes(entry.task_id));

      // Optionally filter by specific task
      if (taskId) {
        filteredEntries = filteredEntries.filter((entry: any) => entry.task_id === taskId);
      }

      this.logger.log(`✓ Returning ${filteredEntries.length} time entries for budget ${budgetId}`);
      return filteredEntries.map((r) => this.transformToCamelCase(r));
    } catch (error) {
      this.logger.error('Failed to get all time entries for budget:', error);
      return [];
    }
  }

  private async stopAllRunningTimers(workspaceId: string, userId: string): Promise<void> {
    try {
      const runningTimersResult = await this.db.findMany('time_entries', {
        workspace_id: workspaceId,
        user_id: userId,
        is_running: true,
      });

      const runningTimers = (runningTimersResult as any).data || runningTimersResult;
      for (const timer of runningTimers) {
        await this.stopTimer(workspaceId, userId, timer.id);
      }
    } catch (error) {
      this.logger.error('Failed to stop running timers:', error);
    }
  }

  private async stopRunningTimerForUserOnTask(
    workspaceId: string,
    taskId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Stop running timer for THIS specific user on THIS task (allow other users to keep their timers running)
      const runningTimersResult = await this.db.findMany('time_entries', {
        workspace_id: workspaceId,
        task_id: taskId,
        user_id: userId,
        is_running: true,
      });

      const runningTimers = (runningTimersResult as any).data || runningTimersResult;
      for (const timer of runningTimers) {
        // Stop this user's timer
        const endTime = new Date();
        const startTime = new Date(timer.start_time);
        const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        const durationHours = durationSeconds / 3600;
        const billedAmount = timer.billing_rate ? durationHours * timer.billing_rate : null;

        await this.db.update(
          'time_entries',
          { id: timer.id },
          {
            end_time: endTime.toISOString(),
            duration_seconds: durationSeconds,
            billed_amount: billedAmount,
            is_running: false,
          },
        );

        // Auto-create expenses for all allocated categories
        if (timer.billable) {
          await this.createExpensesFromTaskAllocations(workspaceId, timer, durationHours);
        }
      }
    } catch (error) {
      this.logger.error('Failed to stop running timer for user on task:', error);
    }
  }

  private async stopAllRunningTimersForTask(workspaceId: string, taskId: string): Promise<void> {
    try {
      const runningTimersResult = await this.db.findMany('time_entries', {
        workspace_id: workspaceId,
        task_id: taskId,
        is_running: true,
      });

      const runningTimers = (runningTimersResult as any).data || runningTimersResult;
      for (const timer of runningTimers) {
        // Force stop without permission check since we're starting a new timer
        const endTime = new Date();
        const startTime = new Date(timer.start_time);
        const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        const durationHours = durationSeconds / 3600;
        const billedAmount = timer.billing_rate ? durationHours * timer.billing_rate : null;

        await this.db.update(
          'time_entries',
          { id: timer.id },
          {
            end_time: endTime.toISOString(),
            duration_seconds: durationSeconds,
            billed_amount: billedAmount,
            is_running: false,
          },
        );

        // Auto-create expenses for all allocated categories
        if (timer.billable) {
          await this.createExpensesFromTaskAllocations(workspaceId, timer, durationHours);
        }
      }
    } catch (error) {
      this.logger.error('Failed to stop running timers for task:', error);
    }
  }

  private async createExpensesFromTaskAllocations(
    workspaceId: string,
    timeEntry: any,
    durationHours: number,
  ): Promise<void> {
    try {
      this.logger.log(
        `🔄 Creating expenses for time entry ${timeEntry.id}, duration: ${durationHours.toFixed(2)} hours`,
      );

      // Get task to find budget
      const task = await this.db.findOne('tasks', {
        id: timeEntry.task_id,
      });

      if (!task) {
        this.logger.error(`❌ Task not found for time entry: ${timeEntry.id}`);
        return;
      }
      this.logger.log(`✓ Found task: ${task.title || task.id}`);

      // Get project to find budget
      const project = await this.db.findOne('projects', {
        id: task.project_id,
      });

      if (!project) {
        this.logger.error(`❌ Project not found for task: ${task.id}`);
        return;
      }
      this.logger.log(`✓ Found project: ${project.name || project.id}`);

      // Find budget linked to this project
      const budgetResult = await this.db
        .table('budgets')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('project_id', '=', project.id)
        .where('is_deleted', '=', false)
        .execute();

      const budgets = (budgetResult as any).data || budgetResult;
      if (!budgets || budgets.length === 0) {
        this.logger.error(`❌ No budget found for project: ${project.id}`);
        return;
      }

      const budget = budgets[0];
      this.logger.log(`✓ Found budget: ${budget.name}, currency: ${budget.currency}`);

      // Get task allocations with category details
      this.logger.log(
        `🔍 Searching for task allocations - TaskID: ${task.id}, BudgetID: ${budget.id}`,
      );

      const allocationsResult = await this.db
        .table('task_budget_allocations')
        .select(
          'task_budget_allocations.*',
          'budget_categories.name as category_name',
          'budget_categories.cost_nature',
          'budget_categories.category_type',
        )
        .leftJoin(
          'budget_categories',
          'task_budget_allocations.category_id',
          '=',
          'budget_categories.id',
        )
        .where('task_budget_allocations.task_id', '=', task.id)
        .where('task_budget_allocations.budget_id', '=', budget.id)
        .execute();

      const allocations = (allocationsResult as any).data || allocationsResult;
      this.logger.log(`📊 Query returned: ${JSON.stringify(allocations)}`);

      if (!allocations || allocations.length === 0) {
        this.logger.error(
          `❌ No task allocations found for task: ${task.id}, budget: ${budget.id}`,
        );
        this.logger.error(`   Task title: ${task.title}`);
        this.logger.error(`   Budget name: ${budget.name}`);
        this.logger.error(`   Please allocate budget categories to this task first.`);

        // Double check by querying without budget filter
        const allAllocationsForTask = await this.db
          .table('task_budget_allocations')
          .select('*')
          .where('task_id', '=', task.id)
          .execute();
        const allAllocs = (allAllocationsForTask as any).data || allAllocationsForTask;
        this.logger.log(`   🔍 Total allocations for this task (any budget): ${allAllocs.length}`);
        if (allAllocs.length > 0) {
          this.logger.log(
            `   Found allocations with budget_ids: ${allAllocs.map((a) => a.budget_id).join(', ')}`,
          );
        }

        return;
      }

      this.logger.log(`✓ Found ${allocations.length} category allocations for task`);

      // Filter only VARIABLE cost categories - fixed costs are added separately, not from time tracking
      const variableAllocations = allocations.filter((a) => a.cost_nature === 'variable');
      this.logger.log(
        `✓ Filtered to ${variableAllocations.length} VARIABLE cost categories (skipping fixed costs)`,
      );

      if (variableAllocations.length === 0) {
        this.logger.log(
          `ℹ️  No variable cost categories to create expenses for. Fixed costs are added when categories are created.`,
        );
        return;
      }

      // Get task name for expense titles
      const taskName = task.title || task.name || 'Task';

      // Create expenses ONLY for VARIABLE cost categories
      for (const allocation of variableAllocations) {
        // Variable costs: Calculate based on hours worked
        // If hourly rate is set in timer, use it; otherwise calculate from allocated amount

        // Convert database values to numbers and handle null/undefined
        const billingRate = timeEntry.billing_rate ? Number(timeEntry.billing_rate) : null;
        const allocatedAmount = allocation.allocated_amount
          ? Number(allocation.allocated_amount)
          : 0;

        // Calculate hourly rate with proper fallbacks and avoid division by zero
        const hourlyRate =
          billingRate !== null
            ? billingRate
            : durationHours > 0
              ? allocatedAmount / durationHours
              : 0;

        const expenseAmount = durationHours * hourlyRate;
        const quantity = durationHours;
        const unitPrice = hourlyRate;
        const unitOfMeasure = 'hours';
        const description = `${allocation.category_name} - ${durationHours.toFixed(2)} hours @ ${hourlyRate.toFixed(2)}/hr`;

        // Create expense
        const expenseData = {
          budget_id: budget.id,
          category_id: allocation.category_id,
          task_id: task.id,
          title: `${taskName} - ${allocation.category_name}`,
          description: timeEntry.description
            ? `${description} - ${timeEntry.description}`
            : description,
          amount: expenseAmount,
          currency: timeEntry.currency || budget.currency || 'USD',
          quantity,
          unit_price: unitPrice,
          unit_of_measure: unitOfMeasure,
          expense_type: 'time_tracked',
          expense_date: new Date().toISOString(),
          billable: timeEntry.billable,
          approved: true, // Auto-approve time-tracked expenses
          approved_by: null,
          approved_at: new Date().toISOString(),
          created_by: timeEntry.user_id,
        };

        this.logger.log(
          `📝 Creating expense: ${expenseData.title}, Amount: ${expenseData.amount}, Currency: ${expenseData.currency}`,
        );
        const createdExpense = await this.db.insert('budget_expenses', expenseData);
        this.logger.log(
          `✅ Created ${allocation.cost_nature} expense for category: ${allocation.category_name}, ID: ${createdExpense.id}`,
        );
      }

      this.logger.log(
        `✅ Successfully created ${variableAllocations.length} VARIABLE cost expenses for time entry: ${timeEntry.id}`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to create expenses from task allocations:', error);
      this.logger.error('Error details:', error.stack);
      // Don't throw - expense creation failure shouldn't stop timer
    }
  }

  // ==================== BILLING RATES ====================

  async createBillingRate(
    workspaceId: string,
    userId: string,
    createBillingRateDto: CreateBillingRateDto,
  ): Promise<BillingRate> {
    try {
      const rateData = {
        workspace_id: workspaceId,
        user_id: createBillingRateDto.userId || null,
        role: createBillingRateDto.role || null,
        rate_name: createBillingRateDto.rateName || null,
        hourly_rate: createBillingRateDto.hourlyRate,
        currency: createBillingRateDto.currency || 'USD',
        effective_from: createBillingRateDto.effectiveFrom,
        effective_to: createBillingRateDto.effectiveTo || null,
        created_by: userId,
      };

      const result = await this.db.insert('billing_rates', rateData);
      return this.transformToCamelCase(result);
    } catch (error) {
      this.logger.error('Failed to create billing rate:', error);
      throw new BadRequestException('Failed to create billing rate');
    }
  }

  async getBillingRates(workspaceId: string): Promise<BillingRate[]> {
    try {
      const results = await this.db
        .table('billing_rates')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('is_deleted', '=', false)
        .execute();

      const data = (results as any).data || results;
      return data.map((r) => this.transformToCamelCase(r));
    } catch (error) {
      this.logger.error('Failed to get billing rates:', error);
      throw new BadRequestException('Failed to get billing rates');
    }
  }

  // ==================== TASK BUDGET ALLOCATIONS ====================

  async createTaskAllocations(workspaceId: string, userId: string, createDto: any): Promise<any[]> {
    try {
      this.logger.log(
        `📋 Creating/updating task allocations - TaskID: ${createDto.taskId}, BudgetID: ${createDto.budgetId}, Allocations: ${createDto.allocations.length}`,
      );

      const results = [];

      for (const allocation of createDto.allocations) {
        // Check if allocation already exists for this task-category pair
        const existingResult = await this.db
          .table('task_budget_allocations')
          .select('*')
          .where('task_id', '=', createDto.taskId)
          .where('category_id', '=', allocation.categoryId)
          .execute();

        const existing = (existingResult as any).data || existingResult;

        if (existing && existing.length > 0) {
          // Update existing allocation
          this.logger.log(
            `  ➜ Updating allocation: CategoryID: ${allocation.categoryId}, Amount: ${allocation.allocatedAmount}`,
          );
          await this.db.update(
            'task_budget_allocations',
            { id: existing[0].id },
            {
              allocated_amount: allocation.allocatedAmount,
              notes: allocation.notes || null,
              updated_at: new Date().toISOString(),
            },
          );

          const updated = await this.db.findOne('task_budget_allocations', { id: existing[0].id });
          this.logger.log(`  ✅ Updated allocation ID: ${existing[0].id}`);
          results.push(this.transformToCamelCase(updated));
        } else {
          // Create new allocation
          const allocationData = {
            task_id: createDto.taskId,
            budget_id: createDto.budgetId,
            category_id: allocation.categoryId,
            allocated_amount: allocation.allocatedAmount,
            notes: allocation.notes || null,
            created_by: userId,
          };

          this.logger.log(
            `  ➜ Creating new allocation: CategoryID: ${allocation.categoryId}, Amount: ${allocation.allocatedAmount}`,
          );
          const result = await this.db.insert('task_budget_allocations', allocationData);
          this.logger.log(`  ✅ Created allocation ID: ${result.id}`);
          results.push(this.transformToCamelCase(result));
        }
      }

      this.logger.log(`✅ Successfully saved ${results.length} task allocations`);
      return results;
    } catch (error) {
      this.logger.error('❌ Failed to create task allocations:', error);
      this.logger.error('Error details:', error.stack);
      throw new BadRequestException('Failed to create task allocations');
    }
  }

  async getTaskAllocations(workspaceId: string, taskId: string): Promise<any[]> {
    try {
      const results = await this.db
        .table('task_budget_allocations')
        .select(
          'task_budget_allocations.*',
          'budget_categories.name as category_name',
          'budget_categories.cost_nature',
          'budget_categories.category_type',
          'budget_categories.color',
        )
        .leftJoin(
          'budget_categories',
          'task_budget_allocations.category_id',
          '=',
          'budget_categories.id',
        )
        .where('task_budget_allocations.task_id', '=', taskId)
        .execute();

      const data = (results as any).data || results;
      return data.map((r) => this.transformToCamelCase(r));
    } catch (error) {
      this.logger.error('Failed to get task allocations:', error);
      throw new BadRequestException('Failed to get task allocations');
    }
  }

  async getAllocationsForBudget(workspaceId: string, budgetId: string): Promise<any[]> {
    try {
      const results = await this.db
        .table('task_budget_allocations')
        .select(
          'task_budget_allocations.*',
          'budget_categories.name as category_name',
          'budget_categories.cost_nature',
          'budget_categories.category_type',
          'budget_categories.color',
        )
        .leftJoin(
          'budget_categories',
          'task_budget_allocations.category_id',
          '=',
          'budget_categories.id',
        )
        .where('task_budget_allocations.budget_id', '=', budgetId)
        .execute();

      const data = (results as any).data || results;
      return data.map((r) => this.transformToCamelCase(r));
    } catch (error) {
      this.logger.error('Failed to get allocations for budget:', error);
      throw new BadRequestException('Failed to get allocations for budget');
    }
  }

  async updateTaskAllocation(
    workspaceId: string,
    allocationId: string,
    updateDto: any,
  ): Promise<any> {
    try {
      await this.db.update(
        'task_budget_allocations',
        { id: allocationId },
        {
          allocated_amount: updateDto.allocatedAmount,
          notes: updateDto.notes || null,
          updated_at: new Date().toISOString(),
        },
      );

      const result = await this.db.findOne('task_budget_allocations', { id: allocationId });
      return this.transformToCamelCase(result);
    } catch (error) {
      this.logger.error('Failed to update task allocation:', error);
      throw new BadRequestException('Failed to update task allocation');
    }
  }

  async deleteTaskAllocation(workspaceId: string, allocationId: string): Promise<void> {
    try {
      await this.db
        .table('task_budget_allocations')
        .delete()
        .where('id', '=', allocationId)
        .execute();
    } catch (error) {
      this.logger.error('Failed to delete task allocation:', error);
      throw new BadRequestException('Failed to delete task allocation');
    }
  }

  // ==================== TASK ASSIGNEE RATES ====================

  async setTaskAssigneeRates(
    workspaceId: string,
    userId: string,
    taskId: string,
    rates: Array<{ userId: string; hourlyRate: number; currency?: string; notes?: string }>,
  ): Promise<TaskAssigneeRate[]> {
    try {
      const results = [];

      for (const rate of rates) {
        // Check if rate already exists for this task-assignee pair
        const existingResult = await this.db
          .table('task_assignee_rates')
          .select('*')
          .where('task_id', '=', taskId)
          .where('user_id', '=', rate.userId)
          .execute();

        const existing = (existingResult as any).data || existingResult;

        if (existing && existing.length > 0) {
          // Update existing rate - keep existing currency if not provided
          const updateData: any = {
            hourly_rate: rate.hourlyRate,
            notes: rate.notes || null,
            updated_at: new Date().toISOString(),
          };

          // Only update currency if explicitly provided
          if (rate.currency) {
            updateData.currency = rate.currency;
          }

          await this.db.update('task_assignee_rates', { id: existing[0].id }, updateData);

          const updated = await this.db.findOne('task_assignee_rates', { id: existing[0].id });
          results.push(this.transformToCamelCase(updated));
        } else {
          // Create new rate
          // Get budget currency from task
          let budgetCurrency = 'USD';
          try {
            const task = await this.db.findOne('tasks', { id: taskId });
            if (task?.project_id) {
              const budgetResult = await this.db
                .table('budgets')
                .select('currency')
                .where('project_id', '=', task.project_id)
                .where('is_deleted', '=', false)
                .execute();
              const budgets = (budgetResult as any).data || budgetResult;
              if (budgets && budgets.length > 0) {
                budgetCurrency = budgets[0].currency || 'USD';
              }
            }
          } catch (error) {
            this.logger.warn('Failed to get budget currency:', error);
          }

          const rateData = {
            task_id: taskId,
            user_id: rate.userId,
            hourly_rate: rate.hourlyRate,
            currency: rate.currency || budgetCurrency,
            notes: rate.notes || null,
            created_by: userId,
          };

          const result = await this.db.insert('task_assignee_rates', rateData);
          results.push(this.transformToCamelCase(result));
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to set task assignee rates:', error);
      throw new BadRequestException('Failed to set task assignee rates');
    }
  }

  async getTaskAssigneeRates(workspaceId: string, taskId: string): Promise<TaskAssigneeRate[]> {
    try {
      const results = await this.db
        .table('task_assignee_rates')
        .select('*')
        .where('task_id', '=', taskId)
        .execute();

      const data = (results as any).data || results;
      return data.map((r) => this.transformToCamelCase(r));
    } catch (error) {
      this.logger.error('Failed to get task assignee rates:', error);
      throw new BadRequestException('Failed to get task assignee rates');
    }
  }

  async getTaskAssigneeRate(
    workspaceId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskAssigneeRate | null> {
    try {
      const result = await this.db
        .table('task_assignee_rates')
        .select('*')
        .where('task_id', '=', taskId)
        .where('user_id', '=', userId)
        .execute();

      const data = (result as any).data || result;
      if (!data || data.length === 0) {
        return null;
      }

      return this.transformToCamelCase(data[0]);
    } catch (error) {
      this.logger.error('Failed to get task assignee rate:', error);
      return null;
    }
  }

  async deleteTaskAssigneeRate(workspaceId: string, taskId: string, userId: string): Promise<void> {
    try {
      await this.db
        .table('task_assignee_rates')
        .delete()
        .where('task_id', '=', taskId)
        .where('user_id', '=', userId)
        .execute();
    } catch (error) {
      this.logger.error('Failed to delete task assignee rate:', error);
      throw new BadRequestException('Failed to delete task assignee rate');
    }
  }

  async getActiveBillingRateForUser(
    workspaceId: string,
    userId: string,
  ): Promise<BillingRate | null> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Try user-specific rate first
      const userRateResult = await this.db
        .table('billing_rates')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .where('is_deleted', '=', false)
        .where('effective_from', '<=', today)
        .execute();

      const userRate = (userRateResult as any).data || userRateResult;
      if (userRate && userRate.length > 0) {
        const validRate = userRate.find((rate) => !rate.effective_to || rate.effective_to >= today);
        if (validRate) return this.transformToCamelCase(validRate);
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get active billing rate:', error);
      return null;
    }
  }

  private async getActiveBillingRate(
    workspaceId: string,
    userId: string,
  ): Promise<BillingRate | null> {
    return this.getActiveBillingRateForUser(workspaceId, userId);
  }

  // ==================== APPROVAL INTEGRATION ====================

  private async isOwnerOrAdmin(workspaceId: string, userId: string): Promise<boolean> {
    try {
      const memberResult = await this.db
        .table('workspace_members')
        .select('role')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      const members = (memberResult as any).data || memberResult;
      if (!members || members.length === 0) return false;

      const role = members[0].role?.toLowerCase();
      return role === 'owner' || role === 'admin';
    } catch (error) {
      this.logger.error('Failed to check user role:', error);
      return false;
    }
  }

  /**
   * Get list of workspace owners and admins who can approve expenses
   */
  async getWorkspaceApprovers(workspaceId: string): Promise<string[]> {
    try {
      const membersResult = await this.db
        .table('workspace_members')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('is_active', '=', true)
        .execute();

      const allMembers = (membersResult as any).data || membersResult;
      const approverIds = allMembers
        .filter((m: any) => m.role === 'admin' || m.role === 'owner')
        .map((m: any) => m.user_id);

      return approverIds;
    } catch (error) {
      this.logger.error('Failed to get workspace approvers:', error);
      return [];
    }
  }

  async getOrCreateExpenseApprovalType(workspaceId: string, userId: string): Promise<string> {
    try {
      // Check if expense approval type already exists
      const existingResult = await this.db
        .table('request_types')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('name', '=', 'Budget Expense Approval')
        .where('is_active', '=', true)
        .execute();

      const existing = (existingResult as any).data || existingResult;
      if (existing && existing.length > 0) {
        return existing[0].id;
      }

      // Get all admin and owner users in workspace
      const adminOwnerIds = await this.getWorkspaceApprovers(workspaceId);

      // Create default expense approval request type
      const requestType = await this.approvalsService.createRequestType(
        workspaceId,
        {
          name: 'Budget Expense Approval',
          description: 'Approval workflow for budget expenses',
          icon: 'dollar-sign',
          color: '#10b981',
          fieldsConfig: [
            { id: 'amount', label: 'Amount', type: 'currency' as any, required: true },
            { id: 'category', label: 'Category', type: 'text' as any, required: false },
            { id: 'vendor', label: 'Vendor', type: 'text' as any, required: false },
            { id: 'expenseDate', label: 'Expense Date', type: 'date' as any, required: true },
          ],
          defaultApprovers: adminOwnerIds,
          requireAllApprovers: false,
          allowAttachments: true,
        },
        userId,
      );

      return requestType.id;
    } catch (error) {
      this.logger.error('Failed to get or create expense approval type:', error);
      throw new BadRequestException('Failed to setup expense approval');
    }
  }

  async handleExpenseApproval(
    workspaceId: string,
    expenseId: string,
    approverId: string,
  ): Promise<void> {
    try {
      // Get expense to retrieve budget_id
      const expenseResult = await this.db
        .table('budget_expenses')
        .select('*')
        .where('id', '=', expenseId)
        .execute();
      const expenses = (expenseResult as any).data || expenseResult;
      if (!expenses || expenses.length === 0) {
        throw new NotFoundException('Expense not found');
      }
      const budgetId = expenses[0].budget_id;

      await this.db.update('budget_expenses', expenseId, {
        approved: true,
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      });

      this.logger.log(`Expense ${expenseId} approved by ${approverId}`);

      // Update budget status after approval
      await this.updateBudgetStatus(budgetId);
    } catch (error) {
      this.logger.error('Failed to approve expense:', error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to approve expense');
    }
  }

  async handleExpenseRejection(
    workspaceId: string,
    expenseId: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.db.update('budget_expenses', expenseId, {
        approved: false,
        rejected: true,
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
      });

      this.logger.log(`Expense ${expenseId} rejected: ${reason}`);
    } catch (error) {
      this.logger.error('Failed to reject expense:', error);
      throw new BadRequestException('Failed to reject expense');
    }
  }

  // ==================== UTILITY ====================

  private transformToCamelCase(obj: any): any {
    if (!obj) return obj;

    const transformed: any = {};
    for (const key in obj) {
      const camelKey = camelCase(key);
      let value = obj[key];

      // Convert numeric fields from strings to numbers
      if (
        key === 'amount' ||
        key === 'total_budget' ||
        key === 'allocated_amount' ||
        key === 'alert_threshold' ||
        key === 'hourly_rate' ||
        key === 'hours'
      ) {
        value = value !== null && value !== undefined ? Number(value) : value;
      }

      transformed[camelKey] = value;
    }
    return transformed;
  }
}
