import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ScoringModule } from '../scoring/scoring.module';
import { StreetDetailService } from './street-detail.service';
import { TerritoryController } from './territory.controller';
import { TerritoryService } from './territory.service';

@Module({
  imports: [ScoringModule, AuthModule],
  controllers: [TerritoryController],
  providers: [TerritoryService, StreetDetailService],
  exports: [TerritoryService],
})
export class TerritoryModule {}
