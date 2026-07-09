import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module';
import { TerritoryService } from './territory.service';

@Module({
  imports: [ScoringModule],
  providers: [TerritoryService],
  exports: [TerritoryService],
})
export class TerritoryModule {}
