import { IsOptional, IsEnum, IsDateString, IsString, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum MonitoringMetric {
  CPU_USAGE = 'cpu_usage',
  MEMORY_USAGE = 'memory_usage',
  DISK_USAGE = 'disk_usage',
  NETWORK_IO = 'network_io',
  DATABASE_CONNECTIONS = 'db_connections',
  API_RESPONSE_TIME = 'api_response_time',
  ERROR_RATE = 'error_rate',
  THROUGHPUT = 'throughput',
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export class MonitoringQueryDto {
  @ApiPropertyOptional({
    description: 'Start time for monitoring data (ISO string)',
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time for monitoring data (ISO string)',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    enum: MonitoringMetric,
    description: 'Specific metrics to include',
    isArray: true,
  })
  @IsOptional()
  @IsEnum(MonitoringMetric, { each: true })
  metrics?: MonitoringMetric[];

  @ApiPropertyOptional({
    description: 'Time interval for aggregation in minutes',
    default: 5,
    minimum: 1,
    maximum: 1440,
  })
  @IsOptional()
  @IsNumber()
  interval?: number = 5;
}

export class LogQueryDto {
  @ApiPropertyOptional({
    enum: LogLevel,
    description: 'Log level filter',
  })
  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel;

  @ApiPropertyOptional({
    description: 'Search query for log messages',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Service name filter',
  })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({
    description: 'Number of log entries to return',
    default: 100,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  limit?: number = 100;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Start time for log entries (ISO string)',
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time for log entries (ISO string)',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;
}
