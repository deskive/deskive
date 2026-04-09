import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class ImportGoogleDriveDto {
  @ApiProperty({
    description: 'Google Drive file ID to import',
    example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  })
  @IsString()
  fileId: string;

  @ApiProperty({
    description: 'Title for the imported note',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Parent folder/note ID',
  })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Tags for the note',
    type: [String],
    example: ['google-drive', 'imported'],
  })
  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class ImportGoogleDriveResponseDto {
  @ApiProperty({ description: 'Whether the import was successful' })
  success: boolean;

  @ApiProperty({ description: 'The created note ID' })
  noteId: string;

  @ApiProperty({ description: 'Title of the imported note' })
  title: string;

  @ApiPropertyOptional({ description: 'Message about the import' })
  message?: string;
}
