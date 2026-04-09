import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BudgetType {
  PROJECT = 'project',
  TASK = 'task',
  PHASE = 'phase',
  RESOURCE = 'resource',
}

export class CreateBudgetDto {
  @ApiProperty({ description: 'Budget name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Budget description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Project ID this budget belongs to' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ description: 'Budget type', enum: BudgetType, default: BudgetType.PROJECT })
  @IsEnum(BudgetType)
  @IsOptional()
  budgetType?: BudgetType;

  @ApiProperty({ description: 'Total budget amount' })
  @IsNumber()
  @IsNotEmpty()
  totalBudget: number;

  @ApiProperty({ description: 'Currency code (USD, EUR, etc.)', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Alert threshold percentage (0-100)', default: 80 })
  @IsNumber()
  @IsOptional()
  alertThreshold?: number;
}
