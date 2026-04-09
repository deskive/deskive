import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CopyFileDto {
  @ApiProperty({
    description: 'Target folder ID where the file should be copied to. Leave empty for root folder.',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  target_folder_id?: string;

  @ApiProperty({
    description: 'New name for the copied file. If not provided, will use original name with " (Copy)" suffix',
    required: false,
    example: 'my-file-copy.pdf'
  })
  @IsOptional()
  @IsString()
  new_name?: string;
}

export class CopyFolderDto {
  @ApiProperty({
    description: 'Target parent folder ID where the folder should be copied to. Leave empty for root folder.',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  target_parent_id?: string;

  @ApiProperty({
    description: 'New name for the copied folder. If not provided, will use original name with " (Copy)" suffix',
    required: false,
    example: 'My Folder (Copy)'
  })
  @IsOptional()
  @IsString()
  new_name?: string;
}
