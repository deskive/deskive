import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBillingRateDto {
  @ApiPropertyOptional({ description: 'User ID (if user-specific rate)' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Role (if role-based rate)' })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ description: 'Rate name' })
  @IsString()
  @IsOptional()
  rateName?: string;

  @ApiProperty({ description: 'Hourly rate' })
  @IsNumber()
  @IsNotEmpty()
  hourlyRate: number;

  @ApiProperty({ description: 'Currency code', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Effective from date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  effectiveFrom: string;

  @ApiPropertyOptional({ description: 'Effective to date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}
