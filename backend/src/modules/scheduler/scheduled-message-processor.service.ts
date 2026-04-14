import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class ScheduledMessageProcessorService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledMessageProcessorService.name);
  private isProcessing = false;
  private lastRunAt: Date | null = null;
  private processedCount = 0;
  private sentCount = 0;
  private failedCount = 0;

  constructor(private readonly chatService: ChatService) {}

  async onModuleInit() {
    this.logger.log('Scheduled Message Processor Service initialized');
    // Process any overdue messages on startup
    await this.processScheduledMessages();
  }

  /**
   * Main cron job - runs every minute to check for scheduled messages
   */
  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'process-scheduled-messages',
    timeZone: 'UTC',
  })
  async handleScheduledMessages() {
    if (this.isProcessing) {
      this.logger.debug('Previous job still running, skipping...');
      return;
    }

    await this.processScheduledMessages();
  }

  /**
   * Process all due scheduled messages
   */
  private async processScheduledMessages() {
    try {
      this.isProcessing = true;
      this.lastRunAt = new Date();

      this.logger.log(
        `[ScheduledMessages] Checking for scheduled messages at ${this.lastRunAt.toISOString()}`,
      );

      const results = await this.chatService.processScheduledMessages();

      this.logger.log(
        `[ScheduledMessages] Result: ${results.processed} sent, ${results.failed} failed`,
      );

      if (results.processed > 0 || results.failed > 0) {
        this.processedCount += results.processed;
        this.sentCount += results.processed; // processed = sent successfully
        this.failedCount += results.failed;

        this.logger.log(
          `[ScheduledMessages] Processed ${results.processed + results.failed} message(s): ` +
            `${results.processed} sent, ${results.failed} failed`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[ScheduledMessages] Error processing scheduled messages: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get processor statistics
   */
  getStats() {
    return {
      isRunning: this.isProcessing,
      lastRunAt: this.lastRunAt?.toISOString() || null,
      totalProcessed: this.processedCount,
      totalSent: this.sentCount,
      totalFailed: this.failedCount,
    };
  }

  /**
   * Manually trigger processing (for admin/debugging)
   */
  async triggerProcessing() {
    this.logger.log('[ScheduledMessages] Manual processing triggered');
    await this.processScheduledMessages();
    return this.getStats();
  }
}
