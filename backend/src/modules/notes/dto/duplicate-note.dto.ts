import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsBoolean, IsString } from 'class-validator';

export class DuplicateNoteDto {
  @ApiPropertyOptional({
    description:
      'Custom title for the duplicated note. If not provided, will append " (Copy)" to original title',
    example: 'My Note Copy',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Whether to duplicate sub-notes as well',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeSubNotes?: boolean;

  @ApiPropertyOptional({
    description:
      'Parent ID for the duplicated note. If not provided, will use same parent as original',
    example: 'uuid-parent-id',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
