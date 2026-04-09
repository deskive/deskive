import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export enum SignatureType {
  DRAWN = 'drawn',
  TYPED = 'typed',
  UPLOADED = 'uploaded',
}

export class CreateSignatureDto {
  @ApiProperty({ description: 'Name for the signature', example: 'My Signature' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: SignatureType, description: 'Type of signature' })
  @IsEnum(SignatureType)
  signatureType: SignatureType;

  @ApiProperty({ description: 'Signature data (base64 image or text)' })
  @IsString()
  @IsNotEmpty()
  signatureData: string;

  @ApiPropertyOptional({ description: 'Typed name for typed signatures' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  typedName?: string;

  @ApiPropertyOptional({ description: 'Font family for typed signatures' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fontFamily?: string;

  @ApiPropertyOptional({ description: 'Set as default signature', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateSignatureDto {
  @ApiPropertyOptional({ description: 'Name for the signature' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Set as default signature' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class SignatureQueryDto {
  @ApiPropertyOptional({ description: 'Include deleted signatures', default: false })
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;
}
