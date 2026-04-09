import {
  IsBoolean,
  IsString,
  IsOptional,
  IsArray,
  IsEmail,
  IsNumber,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FormSettingsDto {
  @ApiProperty({ default: false })
  @IsBoolean()
  allowMultipleSubmissions: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  requireLogin: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  showProgressBar: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  shuffleQuestions: boolean;

  @ApiProperty({ default: 'Thank you for your submission!' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  confirmationMessage: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  redirectUrl?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  collectEmail: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  closeDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxResponses?: number;

  @ApiProperty({ default: false })
  @IsBoolean()
  notifyOnSubmission: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  notifyEmails?: string[];

  @ApiPropertyOptional({ default: 'en' })
  @IsOptional()
  @IsString()
  formLanguage?: string;
}

export class FormBrandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headerImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ default: 'Inter' })
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiPropertyOptional({ default: '16' })
  @IsOptional()
  @IsString()
  fontSize?: string;

  @ApiPropertyOptional({ default: 'normal' })
  @IsOptional()
  @IsString()
  fontWeight?: string;

  @ApiPropertyOptional({ default: 'left' })
  @IsOptional()
  @IsString()
  textAlign?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buttonColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buttonTextColor?: string;
}
