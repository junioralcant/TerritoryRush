import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RankingsService } from './rankings.service';

@Injectable()
export class RankingsRefreshScheduler {
  private readonly logger = new Logger(RankingsRefreshScheduler.name);

  constructor(private readonly rankingsService: RankingsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'refresh-rankings' })
  async refreshRankings(): Promise<void> {
    try {
      await this.rankingsService.refresh();
    } catch (error) {
      this.logger.error(`Failed to refresh ranking views: ${(error as Error).message}`);
    }
  }
}
