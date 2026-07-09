import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsRetryScheduler {
  private readonly logger = new Logger(NotificationsRetryScheduler.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'retry-unsent-notifications' })
  async retryUnsent(): Promise<void> {
    try {
      await this.notificationsService.retryUnsent();
    } catch (error) {
      this.logger.error(`Failed to retry unsent notifications: ${(error as Error).message}`);
    }
  }
}
