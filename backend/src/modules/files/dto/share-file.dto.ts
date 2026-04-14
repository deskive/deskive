import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsInt,
  IsObject,
  Min,
  IsArray,
  IsUUID,
} from 'class-validator';

export class ShareFileDto {
  @ApiProperty({
    description: 'Array of user IDs to share with',
    example: ['user-uuid-1', 'user-uuid-2'],
    required: true,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  user_ids: string[];

  @ApiProperty({
    description: 'Permissions for the share (default: read and download)',
    example: { read: true, download: true, edit: false },
    required: false,
  })
  @IsOptional()
  @IsObject()
  permissions?: {
    read?: boolean;
    download?: boolean;
    edit?: boolean;
  };

  @ApiProperty({
    description: 'Share expiration date',
    example: '2024-12-31T23:59:59.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
