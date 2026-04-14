import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsOptional, IsNumber, IsString } from 'class-validator';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty({ description: 'Actual hours spent', required: false })
  @IsOptional()
  @IsNumber()
  actual_hours?: number;

  @ApiProperty({ description: 'Completed by user ID (when marking as done)', required: false })
  @IsOptional()
  @IsString()
  completed_by?: string;
}
