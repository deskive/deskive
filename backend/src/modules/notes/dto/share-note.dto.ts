import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsArray } from 'class-validator';

export enum SharePermission {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin'
}

export class ShareNoteDto {
  @ApiProperty({
    description: 'Array of user IDs to share with',
    example: ['user-uuid-1', 'user-uuid-2'],
    required: true,
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  user_ids: string[];

  @ApiProperty({
    description: 'Permission level for shared users',
    enum: SharePermission,
    example: SharePermission.READ,
    required: false
  })
  @IsOptional()
  @IsEnum(SharePermission)
  permission?: SharePermission;

  @ApiProperty({
    description: 'Whether to make note publicly accessible',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}