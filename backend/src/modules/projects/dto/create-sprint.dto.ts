import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum SprintStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export class CreateSprintDto {
  @ApiProperty({ description: 'Sprint name', example: 'Sprint 1' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Sprint goal', required: false })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiProperty({ description: 'Sprint start date' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'Sprint end date' })
  @IsDateString()
  end_date: string;

  @ApiProperty({
    description: 'Sprint status',
    enum: SprintStatus,
    example: SprintStatus.PLANNING,
    required: false,
  })
  @IsOptional()
  @IsEnum(SprintStatus)
  status?: SprintStatus = SprintStatus.PLANNING;
}
