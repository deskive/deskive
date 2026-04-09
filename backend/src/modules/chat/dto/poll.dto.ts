import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * DTO for voting on a poll
 */
export class VotePollDto {
  @ApiProperty({ description: 'ID of the option to vote for' })
  @IsString()
  optionId: string;
}
