import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class StartRecordingDto {
  @ApiProperty({ description: 'Enable transcription', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  transcription_enabled?: boolean = true;

  @ApiProperty({ description: 'Record audio only', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  audio_only?: boolean = false;
}
