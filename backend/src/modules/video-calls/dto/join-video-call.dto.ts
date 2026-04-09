import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class JoinVideoCallDto {
  @ApiProperty({ description: 'Display name for the participant', example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  display_name?: string;

  @ApiProperty({ description: 'Client metadata (device, browser, etc.)', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}
