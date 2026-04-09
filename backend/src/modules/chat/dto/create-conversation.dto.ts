import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, ArrayMaxSize, ArrayMinSize, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ description: 'Conversation name', example: 'Project Discussion', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Conversation type', example: 'direct', required: false })
  @IsOptional()
  @IsString()
  type?: string = 'direct';

  @ApiProperty({
    description: 'Participant user ID (only one other user allowed for direct conversations)',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000']
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one participant is required' })
  @ArrayMaxSize(1, { message: 'Only one other participant is allowed for direct conversations' })
  @IsUUID('4', { each: true, message: 'Each participant must be a valid UUID' })
  participants: string[];
}