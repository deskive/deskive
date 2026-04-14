import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateFolderDto {
  @ApiProperty({
    description: 'Folder name',
    example: 'Documents',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Parent folder ID',
    example: 'uuid-here',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiProperty({
    description: 'Folder description',
    example: 'Important project documents folder',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
