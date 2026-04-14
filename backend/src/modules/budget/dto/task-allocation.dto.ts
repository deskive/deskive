import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CategoryAllocationDto {
  @ApiProperty({ description: 'Budget category ID' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ description: 'Allocated amount for this category' })
  @IsNumber()
  @IsNotEmpty()
  allocatedAmount: number;

  @ApiPropertyOptional({ description: 'Optional notes for this allocation' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateTaskAllocationDto {
  @ApiProperty({ description: 'Task ID' })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({ description: 'Budget ID' })
  @IsUUID()
  @IsNotEmpty()
  budgetId: string;

  @ApiProperty({ description: 'Array of category allocations', type: [CategoryAllocationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryAllocationDto)
  allocations: CategoryAllocationDto[];
}

export class UpdateTaskAllocationDto {
  @ApiProperty({ description: 'Allocated amount' })
  @IsNumber()
  @IsNotEmpty()
  allocatedAmount: number;

  @ApiPropertyOptional({ description: 'Optional notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
