import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTimeEntryDto {
  @ApiProperty({ description: 'Task ID' })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiPropertyOptional({ description: 'Time entry description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Start time (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiPropertyOptional({ description: 'End time (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({ description: 'Is billable', default: true })
  @IsBoolean()
  @IsOptional()
  billable?: boolean;
}

export class StartTimerDto {
  @ApiProperty({ description: 'Task ID' })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({ description: 'Assignee user ID (who is being tracked)' })
  @IsString()
  @IsNotEmpty()
  assigneeId: string;

  @ApiProperty({ description: 'Hourly billing rate for this time entry' })
  @IsNumber()
  @IsNotEmpty()
  hourlyRate: number;

  @ApiPropertyOptional({ description: 'Time entry description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Is billable', default: true })
  @IsBoolean()
  @IsOptional()
  billable?: boolean;
}

export class StopTimerDto {
  @ApiProperty({ description: 'Time entry ID' })
  @IsUUID()
  @IsNotEmpty()
  timeEntryId: string;
}
