import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  IsUUID,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Supported custom field types (like Notion properties)
 */
export enum CustomFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  CHECKBOX = 'checkbox',
  URL = 'url',
  EMAIL = 'email',
  PHONE = 'phone',
  PERSON = 'person',
  RELATION = 'relation',
}

/**
 * Option for select/multi-select fields (when creating - id is optional)
 */
export class CreateSelectOptionDto {
  @ApiPropertyOptional({
    description: 'Unique identifier for the option (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Display label for the option' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ description: 'Color for the option (hex code)' })
  @IsOptional()
  @IsString()
  color?: string;
}

/**
 * Option for select/multi-select fields (full object with id)
 */
export class SelectOptionDto {
  @ApiProperty({ description: 'Unique identifier for the option' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Display label for the option' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ description: 'Color for the option (hex code)' })
  @IsOptional()
  @IsString()
  color?: string;
}

/**
 * Settings for different field types
 */
export class FieldSettingsDto {
  @ApiPropertyOptional({ description: 'Number format (e.g., currency, percentage)' })
  @IsOptional()
  @IsString()
  numberFormat?: string;

  @ApiPropertyOptional({ description: 'Currency code for currency format' })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional({ description: 'Date format (e.g., YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ description: 'Include time in date field' })
  @IsOptional()
  @IsBoolean()
  includeTime?: boolean;

  @ApiPropertyOptional({ description: 'Minimum value for number fields' })
  @IsOptional()
  @IsNumber()
  minValue?: number;

  @ApiPropertyOptional({ description: 'Maximum value for number fields' })
  @IsOptional()
  @IsNumber()
  maxValue?: number;

  @ApiPropertyOptional({ description: 'Allow negative numbers' })
  @IsOptional()
  @IsBoolean()
  allowNegative?: boolean;

  @ApiPropertyOptional({ description: 'Decimal places for number fields' })
  @IsOptional()
  @IsNumber()
  decimalPlaces?: number;
}

/**
 * DTO for creating a custom field definition
 */
export class CreateCustomFieldDto {
  @ApiProperty({ description: 'Name of the custom field' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Type of the custom field',
    enum: CustomFieldType,
  })
  @IsEnum(CustomFieldType)
  fieldType: CustomFieldType;

  @ApiPropertyOptional({ description: 'Description of the field' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Options for select/multi-select fields',
    type: [CreateSelectOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSelectOptionDto)
  options?: CreateSelectOptionDto[];

  @ApiPropertyOptional({ description: 'Default value for the field' })
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional({ description: 'Whether the field is required' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Whether the field is visible' })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Additional field settings',
    type: FieldSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FieldSettingsDto)
  settings?: FieldSettingsDto;
}

/**
 * DTO for updating a custom field definition
 */
export class UpdateCustomFieldDto {
  @ApiPropertyOptional({ description: 'Name of the custom field' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the field' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Options for select/multi-select fields',
    type: [SelectOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectOptionDto)
  options?: SelectOptionDto[];

  @ApiPropertyOptional({ description: 'Default value for the field' })
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional({ description: 'Whether the field is required' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Whether the field is visible' })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Additional field settings',
    type: FieldSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FieldSettingsDto)
  settings?: FieldSettingsDto;
}

/**
 * DTO for custom field value in a task
 */
export class CustomFieldValueDto {
  @ApiProperty({ description: 'ID of the custom field definition' })
  @IsUUID()
  fieldId: string;

  @ApiProperty({ description: 'Value of the field (type depends on field type)' })
  value: any;
}

/**
 * DTO for updating custom field values on a task
 */
export class UpdateTaskCustomFieldsDto {
  @ApiProperty({
    description: 'Object containing field ID to value mappings',
    example: { 'field-uuid-1': 'text value', 'field-uuid-2': 100 },
  })
  @IsObject()
  customFields: Record<string, any>;
}

/**
 * Response DTO for custom field definition
 */
export class CustomFieldDefinitionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: CustomFieldType })
  fieldType: CustomFieldType;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ type: [SelectOptionDto] })
  options?: SelectOptionDto[];

  @ApiPropertyOptional()
  defaultValue?: any;

  @ApiProperty()
  isRequired: boolean;

  @ApiProperty()
  isVisible: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiPropertyOptional({ type: FieldSettingsDto })
  settings?: FieldSettingsDto;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

/**
 * DTO for reordering custom fields
 */
export class ReorderCustomFieldsDto {
  @ApiProperty({
    description: 'Array of field IDs in the new order',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  fieldIds: string[];
}

/**
 * DTO for adding an option to a select field
 */
export class AddSelectOptionDto {
  @ApiProperty({ description: 'Label for the new option' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ description: 'Color for the option (hex code)' })
  @IsOptional()
  @IsString()
  color?: string;
}
