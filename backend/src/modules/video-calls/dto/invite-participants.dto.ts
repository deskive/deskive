import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class InviteParticipantsDto {
  @ApiProperty({ description: 'User IDs to invite', type: [String], example: ['user-1', 'user-2'] })
  @IsArray()
  @IsString({ each: true })
  user_ids: string[];
}
