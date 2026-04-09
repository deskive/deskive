import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsDateString,
  MinLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShareAccessLevel } from '../entities/form.types';

export class FormCreateShareLinkDto {
  @ApiProperty({ enum: ShareAccessLevel, default: ShareAccessLevel.RESPOND })
  @IsEnum(ShareAccessLevel)
  accessLevel: ShareAccessLevel;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requirePassword?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxResponses?: number;
}

export class FormVerifySharePasswordDto {
  @ApiProperty()
  @IsString()
  password: string;
}
