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

export class NoteAttachmentsDto {
  @ApiProperty({
    description: 'Array of note attachment UUIDs',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  note_attachment?: string[];

  @ApiProperty({
    description: 'Array of file attachment UUIDs',
    example: ['660e8400-e29b-41d4-a716-446655440001'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  file_attachment?: string[];

  @ApiProperty({
    description: 'Array of event attachment UUIDs',
    example: ['770e8400-e29b-41d4-a716-446655440002'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  event_attachment?: string[];
}

export class CreateNoteDto {
  @ApiProperty({ description: 'Note title', example: 'Meeting Notes' })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Note content as raw HTML',
    example: '<p>Meeting notes...</p>',
  })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Parent note ID for hierarchical notes', required: false })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiProperty({ description: 'Template ID to use', required: false })
  @IsOptional()
  @IsUUID()
  template_id?: string;

  @ApiProperty({ description: 'Note tags', example: ['meeting', 'important'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Cover image URL', required: false })
  @IsOptional()
  @IsString()
  cover_image?: string;

  @ApiProperty({ description: 'Note icon', example: '📝', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Whether note is public', required: false })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

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
