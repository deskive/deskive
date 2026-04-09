import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateParticipantDto {
  @ApiProperty({ description: 'Is audio muted', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_audio_muted?: boolean;

  @ApiProperty({ description: 'Is video muted', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_video_muted?: boolean;

  @ApiProperty({ description: 'Is screen sharing', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_screen_sharing?: boolean;

  @ApiProperty({ description: 'Is hand raised', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_hand_raised?: boolean;

  @ApiProperty({ description: 'Connection quality', example: 'good', required: false })
  @IsOptional()
  @IsString()
  connection_quality?: 'excellent' | 'good' | 'poor';
}
