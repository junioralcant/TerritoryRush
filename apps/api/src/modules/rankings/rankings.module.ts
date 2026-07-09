import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RankingsController } from './rankings.controller';
import { RankingsService } from './rankings.service';

// Leaderboards read from materialized views. RankingsService.refresh() must be
// wired to a scheduled job (cron/worker) to keep the views current; it is not
// refreshed per-activity to avoid the refresh cost on the hot ingestion path.
@Module({
  imports: [AuthModule],
  controllers: [RankingsController],
  providers: [RankingsService],
  exports: [RankingsService],
})
export class RankingsModule {}
