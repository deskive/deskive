import { IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum BudgetStatus {
  ACTIVE = 'active',
  EXCEEDED = 'exceeded',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export class UpdateBudgetDto {
  @ApiPropertyOptional({ description: 'Budget name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Budget description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Total budget amount' })
  @IsNumber()
  @IsOptional()
  totalBudget?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
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

  @ApiPropertyOptional({ description: 'Alert threshold percentage' })
  @IsNumber()
  @IsOptional()
  alertThreshold?: number;

  @ApiPropertyOptional({ description: 'Budget status', enum: BudgetStatus })
  @IsEnum(BudgetStatus)
  @IsOptional()
  status?: BudgetStatus;
}
