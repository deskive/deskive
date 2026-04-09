import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FieldType } from '../entities/form.types';

export class FieldValidationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  min?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  max?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class FieldScaleDto {
  @ApiProperty()
  @IsNumber()
  min: number;

  @ApiProperty()
  @IsNumber()
  max: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maxLabel?: string;
}

export class FormFieldDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ enum: FieldType })
  @IsEnum(FieldType)
  type: FieldType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty()
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  page: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  order: number;

  @ApiPropertyOptional({ type: FieldValidationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FieldValidationDto)
  validation?: FieldValidationDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowOther?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxFiles?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFileTypes?: string[];

  @ApiPropertyOptional({ type: FieldScaleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FieldScaleDto)
  scale?: FieldScaleDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rows?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];
}

export class FormPageDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  order: number;
}
