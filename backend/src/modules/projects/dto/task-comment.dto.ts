import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateTaskCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'HTML formatted content', required: false })
  @IsOptional()
  @IsString()
  content_html?: string;

  @ApiProperty({ description: 'File attachments', type: [String], required: false })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class UpdateTaskCommentDto {
  @ApiProperty({ description: 'Updated comment content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Updated HTML formatted content', required: false })
  @IsOptional()
  @IsString()
  content_html?: string;
}