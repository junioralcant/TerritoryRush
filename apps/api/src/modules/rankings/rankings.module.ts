import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RankingsController } from './rankings.controller';
import { RankingsRefreshScheduler } from './rankings-refresh.scheduler';
import { RankingsService } from './rankings.service';

// Leaderboards read from materialized views. RankingsRefreshScheduler runs
// RankingsService.refresh() on a cron (not per-activity) to keep the views
// current without the refresh cost on the hot ingestion path.
@Module({
  imports: [AuthModule],
  controllers: [RankingsController],
  providers: [RankingsService, RankingsRefreshScheduler],
  exports: [RankingsService],
})
export class RankingsModule {}
