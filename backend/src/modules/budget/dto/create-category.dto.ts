import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CategoryType {
  LABOR = 'labor',
  MATERIALS = 'materials',
  SOFTWARE = 'software',
  TRAVEL = 'travel',
  OVERHEAD = 'overhead',
  OTHER = 'other',
}

export enum CostNature {
  FIXED = 'fixed',
  VARIABLE = 'variable',
}

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Allocated amount' })
  @IsNumber()
  @IsNotEmpty()
  allocatedAmount: number;

  @ApiProperty({ description: 'Category type', enum: CategoryType, default: CategoryType.OTHER })
  @IsEnum(CategoryType)
  @IsOptional()
  categoryType?: CategoryType;

  @ApiProperty({ description: 'Cost nature (fixed or variable)', enum: CostNature, default: CostNature.VARIABLE })
  @IsEnum(CostNature)
  @IsOptional()
  costNature?: CostNature;

  @ApiPropertyOptional({ description: 'Color for UI visualization (hex)' })
  @IsString()
  @IsOptional()
  color?: string;
}
