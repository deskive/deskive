import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateTimeEntryDto, StartTimerDto, StopTimerDto } from './dto/create-time-entry.dto';
import { CreateBillingRateDto } from './dto/create-billing-rate.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';

@ApiTags('Budget Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RoleGuard)
@Controller('workspaces/:workspaceId/budgets')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  // ==================== BUDGETS ====================

  @Post()
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Create a new budget' })
  @ApiResponse({ status: 201, description: 'Budget created successfully' })
  async createBudget(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Body() createBudgetDto: CreateBudgetDto,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.budgetService.createBudget(workspaceId, userId, createBudgetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all budgets' })
  @ApiResponse({ status: 200, description: 'Return all budgets' })
  async getBudgets(
    @Param('workspaceId') workspaceId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.budgetService.getBudgets(workspaceId, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get budget by ID' })
  @ApiResponse({ status: 200, description: 'Return budget details' })
  async getBudgetById(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.budgetService.getBudgetById(workspaceId, id);
  }

  @Patch(':id')
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Update budget' })
  @ApiResponse({ status: 200, description: 'Budget updated successfully' })
  async updateBudget(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ) {
    return this.budgetService.updateBudget(workspaceId, id, updateBudgetDto);
  }

  @Delete(':id')
  @RequireRole('owner')
  @ApiOperation({ summary: 'Delete budget' })
  @ApiResponse({ status: 200, description: 'Budget deleted successfully' })
  async deleteBudget(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.budgetService.deleteBudget(workspaceId, id, userId);
    return { message: 'Budget deleted successfully' };
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get budget summary with statistics' })
  @ApiResponse({ status: 200, description: 'Return budget summary' })
  async getBudgetSummary(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.budgetService.getBudgetSummary(workspaceId, id);
  }

  // ==================== CATEGORIES ====================

  @Post(':budgetId/categories')
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Create budget category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async createCategory(
    @Param('budgetId') budgetId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.budgetService.createCategory(budgetId, createCategoryDto);
  }

  @Get(':budgetId/categories')
  @ApiOperation({ summary: 'Get all categories for a budget' })
  @ApiResponse({ status: 200, description: 'Return all categories' })
  async getCategories(@Param('budgetId') budgetId: string) {
    return this.budgetService.getCategories(budgetId);
  }

  @Patch(':budgetId/categories/:categoryId')
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Update budget category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  async updateCategory(
    @Req() req,
    @Param('budgetId') budgetId: string,
    @Param('categoryId') categoryId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.budgetService.updateCategory(budgetId, categoryId, userId, updateCategoryDto);
  }

  @Delete(':budgetId/categories/:categoryId')
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Delete budget category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  async deleteCategory(
    @Req() req,
    @Param('budgetId') budgetId: string,
    @Param('categoryId') categoryId: string,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.budgetService.deleteCategory(budgetId, categoryId, userId);
    return { message: 'Category deleted successfully' };
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get budget cost analytics' })
  @ApiResponse({
    status: 200,
    description: 'Return budget analytics with fixed vs variable breakdown',
  })
  async getBudgetAnalytics(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.budgetService.getBudgetSummary(workspaceId, id);
  }

  @Get(':id/projections')
  @ApiOperation({ summary: 'Get variable cost projections' })
  @ApiResponse({ status: 200, description: 'Return projected variable costs' })
  async getVariableCostProjections(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Query('months') months?: number,
  ) {
    const projectionMonths = months ? parseInt(months.toString(), 10) : 3;
    return this.budgetService.getVariableCostProjection(workspaceId, id, projectionMonths);
  }

  // ==================== EXPENSES ====================

  @Post('expenses')
  @RequireRole('member', 'admin', 'owner')
  @ApiOperation({ summary: 'Create a new expense' })
  @ApiResponse({ status: 201, description: 'Expense created successfully' })
  async createExpense(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.budgetService.createExpense(workspaceId, userId, createExpenseDto);
  }

  @Get(':budgetId/expenses')
  @ApiOperation({ summary: 'Get all expenses for a budget' })
  @ApiResponse({ status: 200, description: 'Return all expenses' })
  async getExpenses(
    @Param('workspaceId') workspaceId: string,
    @Param('budgetId') budgetId: string,
  ) {
    return this.budgetService.getExpenses(workspaceId, budgetId);
  }

  @Post('expenses/:expenseId/approve')
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Approve an expense' })
  @ApiResponse({ status: 200, description: 'Expense approved successfully' })
  async approveExpense(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Param('expenseId') expenseId: string,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.budgetService.approveExpense(workspaceId, expenseId, userId);
  }

  // ==================== TIME ENTRIES ====================

  @Post('time-entries')
  @RequireRole('member', 'admin', 'owner')
  @ApiOperation({ summary: 'Create a time entry' })
  @ApiResponse({ status: 201, description: 'Time entry created successfully' })
  async createTimeEntry(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Body() createTimeEntryDto: CreateTimeEntryDto,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.budgetService.createTimeEntry(workspaceId, userId, createTimeEntryDto);
  }

  @Post('time-entries/start')
  @RequireRole('member', 'admin', 'owner')
  @ApiOperation({ summary: 'Start a timer' })
  @ApiResponse({ status: 201, description: 'Timer started successfully' })
  async startTimer(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Body() startTimerDto: StartTimerDto,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.budgetService.startTimer(workspaceId, userId, startTimerDto);
  }

  @Post('time-entries/stop')
  @RequireRole('member', 'admin', 'owner')
  @ApiOperation({ summary: 'Stop a timer' })
  @ApiResponse({ status: 200, description: 'Timer stopped successfully' })
  async stopTimer(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Body() stopTimerDto: StopTimerDto,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.budgetService.stopTimer(workspaceId, userId, stopTimerDto.timeEntryId);
  }

  @Get('time-entries/running')
  @ApiOperation({ summary: 'Get running timer' })
  @ApiResponse({ status: 200, description: 'Return running timer if exists' })
  async getRunningTimer(@Req() req, @Param('workspaceId') workspaceId: string) {
    const userId = req.user.sub || req.user.userId;
    return this.budgetService.getRunningTimer(workspaceId, userId);
  }

  @Get('time-entries')
  @ApiOperation({ summary: 'Get time entries' })
  @ApiResponse({ status: 200, description: 'Return time entries' })
  async getTimeEntries(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Query('taskId') taskId?: string,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.budgetService.getTimeEntries(workspaceId, userId, taskId);
  }

  @Get(':budgetId/time-entries/all')
  @ApiOperation({ summary: 'Get all time entries for a budget (all users, for admins/owners)' })
  @ApiResponse({ status: 200, description: 'Return all time entries for budget' })
  async getAllTimeEntriesForBudget(
    @Param('workspaceId') workspaceId: string,
    @Param('budgetId') budgetId: string,
    @Query('taskId') taskId?: string,
  ) {
    return this.budgetService.getAllTimeEntriesForBudget(workspaceId, budgetId, taskId);
  }

  @Get('time-entries/task/:taskId/running')
  @ApiOperation({ summary: 'Get running timer for a specific task' })
  @ApiResponse({ status: 200, description: 'Return running timer for task if exists' })
  async getRunningTimerForTask(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.budgetService.getRunningTimerForTask(workspaceId, taskId);
  }

  @Get('time-entries/task/:taskId/running/all')
  @ApiOperation({ summary: 'Get all running timers for a specific task' })
  @ApiResponse({ status: 200, description: 'Return all running timers for task' })
  async getAllRunningTimersForTask(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.budgetService.getAllRunningTimersForTask(workspaceId, taskId);
  }

  // ==================== BILLING RATES ====================

  @Post('billing-rates')
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Create billing rate' })
  @ApiResponse({ status: 201, description: 'Billing rate created successfully' })
  async createBillingRate(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Body() createBillingRateDto: CreateBillingRateDto,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.budgetService.createBillingRate(workspaceId, userId, createBillingRateDto);
  }

  @Get('billing-rates')
  @ApiOperation({ summary: 'Get all billing rates' })
  @ApiResponse({ status: 200, description: 'Return all billing rates' })
  async getBillingRates(@Param('workspaceId') workspaceId: string) {
    return this.budgetService.getBillingRates(workspaceId);
  }

  @Get('billing-rates/user/:userId')
  @ApiOperation({ summary: 'Get active billing rate for a specific user' })
  @ApiResponse({ status: 200, description: 'Return user billing rate' })
  async getUserBillingRate(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.budgetService.getActiveBillingRateForUser(workspaceId, userId);
  }

  // ==================== TASK BUDGET ALLOCATIONS ====================

  @Post('task-allocations')
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Create task budget allocations' })
  @ApiResponse({ status: 201, description: 'Task allocations created successfully' })
  async createTaskAllocations(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Body() createDto: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.budgetService.createTaskAllocations(workspaceId, userId, createDto);
  }

  @Get('task-allocations/:taskId')
  @ApiOperation({ summary: 'Get task budget allocations' })
  @ApiResponse({ status: 200, description: 'Return task allocations' })
  async getTaskAllocations(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.budgetService.getTaskAllocations(workspaceId, taskId);
  }

  @Get(':budgetId/allocations')
  @ApiOperation({ summary: 'Get all allocations for a budget' })
  @ApiResponse({ status: 200, description: 'Return all allocations for budget' })
  async getAllocationsForBudget(
    @Param('workspaceId') workspaceId: string,
    @Param('budgetId') budgetId: string,
  ) {
    return this.budgetService.getAllocationsForBudget(workspaceId, budgetId);
  }

  @Patch('task-allocations/:allocationId')
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Update task allocation' })
  @ApiResponse({ status: 200, description: 'Task allocation updated successfully' })
  async updateTaskAllocation(
    @Param('workspaceId') workspaceId: string,
    @Param('allocationId') allocationId: string,
    @Body() updateDto: any,
  ) {
    return this.budgetService.updateTaskAllocation(workspaceId, allocationId, updateDto);
  }

  @Delete('task-allocations/:allocationId')
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Delete task allocation' })
  @ApiResponse({ status: 200, description: 'Task allocation deleted successfully' })
  async deleteTaskAllocation(
    @Param('workspaceId') workspaceId: string,
    @Param('allocationId') allocationId: string,
  ) {
    await this.budgetService.deleteTaskAllocation(workspaceId, allocationId);
    return { message: 'Task allocation deleted successfully' };
  }

  // ==================== TASK ASSIGNEE RATES ====================

  @Post('task-assignee-rates/:taskId')
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Set hourly rates for task assignees' })
  @ApiResponse({ status: 201, description: 'Task assignee rates set successfully' })
  async setTaskAssigneeRates(
    @Req() req,
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Body()
    body: {
      rates: Array<{ userId: string; hourlyRate: number; currency?: string; notes?: string }>;
    },
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.budgetService.setTaskAssigneeRates(workspaceId, userId, taskId, body.rates);
  }

  @Get('task-assignee-rates/:taskId')
  @ApiOperation({ summary: 'Get hourly rates for all assignees on a task' })
  @ApiResponse({ status: 200, description: 'Return task assignee rates' })
  async getTaskAssigneeRates(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.budgetService.getTaskAssigneeRates(workspaceId, taskId);
  }

  @Get('task-assignee-rates/:taskId/user/:userId')
  @ApiOperation({ summary: 'Get hourly rate for a specific assignee on a task' })
  @ApiResponse({ status: 200, description: 'Return task assignee rate' })
  async getTaskAssigneeRate(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
  ) {
    return this.budgetService.getTaskAssigneeRate(workspaceId, taskId, userId);
  }

  @Delete('task-assignee-rates/:taskId/user/:userId')
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Delete task assignee rate' })
  @ApiResponse({ status: 200, description: 'Task assignee rate deleted successfully' })
  async deleteTaskAssigneeRate(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
  ) {
    await this.budgetService.deleteTaskAssigneeRate(workspaceId, taskId, userId);
    return { message: 'Task assignee rate deleted successfully' };
  }
}
