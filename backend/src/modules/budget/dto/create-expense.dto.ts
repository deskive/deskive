import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsEnum, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExpenseType {
  TIME_TRACKED = 'time_tracked',
  MANUAL = 'manual',
  INVOICE = 'invoice',
  PURCHASE = 'purchase',
}

export class CreateExpenseDto {
  @ApiProperty({ description: 'Budget ID' })
  @IsUUID()
  @IsNotEmpty()
  budgetId: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Task ID' })
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @ApiProperty({ description: 'Expense title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Expense description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Expense amount' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Currency code', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Quantity of units', default: 1 })
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Price per unit' })
  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Unit of measure (e.g., hours, items, kg)' })
  @IsString()
  @IsOptional()
  unitOfMeasure?: string;

  @ApiProperty({ description: 'Expense type', enum: ExpenseType, default: ExpenseType.MANUAL })
  @IsEnum(ExpenseType)
  @IsOptional()
  expenseType?: ExpenseType;

  @ApiProperty({ description: 'Expense date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  expenseDate: string;

  @ApiProperty({ description: 'Is billable', default: true })
  @IsBoolean()
  @IsOptional()
  billable?: boolean;

  @ApiPropertyOptional({ description: 'Receipt URL' })
  @IsString()
  @IsOptional()
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Receipt file name' })
  @IsString()
  @IsOptional()
  receiptFileName?: string;

  @ApiPropertyOptional({ description: 'Vendor name' })
  @IsString()
  @IsOptional()
  vendor?: string;

  @ApiPropertyOptional({ description: 'Invoice number' })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
