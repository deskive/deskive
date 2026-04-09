import {
  IsString,
  IsOptional,
  IsObject,
  IsEmail,
  IsNumber,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitResponseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  respondentEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  respondentName?: string;

  @ApiProperty({
    description: 'Response data as key-value pairs where key is fieldId',
    example: {
      'field_1': { value: 'John Doe', label: 'Full Name' },
      'field_2': { value: 'john@example.com', label: 'Email' },
    },
  })
  @IsObject()
  responses: Record<string, { value: any; label: string }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  submissionTimeSeconds?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isComplete?: boolean;
}
