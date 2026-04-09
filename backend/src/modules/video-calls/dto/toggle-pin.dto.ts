import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class TogglePinDto {
  @ApiProperty({
    description: 'Whether to pin or unpin the video call',
    example: true,
  })
  @IsBoolean()
  pinned: boolean;
}
