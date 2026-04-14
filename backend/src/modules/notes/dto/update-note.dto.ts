import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NoteAttachmentsDto } from './create-note.dto';

export class UpdateNoteDto {
  @ApiProperty({ description: 'Note title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Note content as raw HTML', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: 'Note tags', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Cover image URL', required: false })
  @IsOptional()
  @IsString()
  cover_image?: string;

  @ApiProperty({ description: 'Note icon', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Whether note is public', required: false })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiProperty({ description: 'Whether note is favorite', required: false })
  @IsOptional()
  @IsBoolean()
  is_favorite?: boolean;

  @ApiProperty({
    description: 'Note attachments (notes, files, events)',
    type: NoteAttachmentsDto,
    required: false,
    example: {
      note_attachment: ['550e8400-e29b-41d4-a716-446655440000'],
      file_attachment: ['660e8400-e29b-41d4-a716-446655440001'],
      event_attachment: ['770e8400-e29b-41d4-a716-446655440002'],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NoteAttachmentsDto)
  attachments?: NoteAttachmentsDto;
}
