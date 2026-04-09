import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SharedConditionEvaluatorService } from './services/shared-condition-evaluator.service';
import { SharedExecutionLoggerService } from './services/shared-execution-logger.service';
import { SharedScheduledJobService } from './services/shared-scheduled-job.service';

/**
 * Automation Core Module
 *
 * Provides shared services for automation features (Bots, Workflows).
 * This module is marked as @Global so services are available across the app.
 *
 * Shared Services:
 * - SharedConditionEvaluatorService: Condition evaluation with operators
 * - SharedExecutionLoggerService: Execution logging for audit trails
 * - SharedScheduledJobService: Cron-based job scheduling
 *
 * Usage:
 * Import this module in your feature modules (Bots, Workflows) to use shared services.
 */
@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  providers: [
    SharedConditionEvaluatorService,
    SharedExecutionLoggerService,
    SharedScheduledJobService,
  ],
  exports: [
    SharedConditionEvaluatorService,
    SharedExecutionLoggerService,
    SharedScheduledJobService,
  ],
})
export class AutomationCoreModule {}
