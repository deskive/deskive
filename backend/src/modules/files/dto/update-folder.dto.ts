import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateFolderDto {
  @ApiProperty({
    description: 'New folder name',
    example: 'Updated Folder Name',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;
}
