import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormFieldDto, FormPageDto } from './form-field.dto';
import { FormSettingsDto, FormBrandingDto } from './form-settings.dto';
import { FormStatus } from '../entities/form.types';

export class CreateFormDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ type: [FormFieldDto], default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];

  @ApiPropertyOptional({ type: [FormPageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormPageDto)
  pages?: FormPageDto[];

  @ApiPropertyOptional({ type: FormSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormSettingsDto)
  settings?: FormSettingsDto;

  @ApiPropertyOptional({ type: FormBrandingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormBrandingDto)
  branding?: FormBrandingDto;

  @ApiPropertyOptional({ enum: FormStatus, default: FormStatus.DRAFT })
  @IsOptional()
  @IsEnum(FormStatus)
  status?: FormStatus;
}
