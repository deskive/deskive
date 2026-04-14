import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class MoveFileDto {
  @ApiProperty({
    description: 'Target folder ID to move the file to',
    example: 'uuid-here',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  target_folder_id?: string;

  @ApiProperty({
    description: 'New name for the file (optional)',
    example: 'renamed-document.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  new_name?: string;
}
