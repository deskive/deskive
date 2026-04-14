import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString } from 'class-validator';

export class MoveFolderDto {
  @ApiProperty({
    description:
      'Target parent folder ID to move the folder to. Set to null or omit to move to root.',
    example: 'uuid-here',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  target_parent_id?: string | null;

  @ApiProperty({
    description: 'New name for the folder (optional)',
    example: 'Renamed Folder',
    required: false,
  })
  @IsOptional()
  @IsString()
  new_name?: string;
}
