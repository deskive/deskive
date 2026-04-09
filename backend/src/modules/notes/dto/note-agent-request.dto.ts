import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class NoteAgentRequestDto {
  @ApiProperty({
    description: 'Natural language command for the Notes AI Agent',
    example: 'Create a note called Meeting Notes with tag important',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}
