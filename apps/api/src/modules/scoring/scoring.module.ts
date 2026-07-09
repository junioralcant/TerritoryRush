import { Module } from '@nestjs/common';
import { PureScoringEngine } from './pure-scoring.engine';
import { SCORING_ENGINE } from './scoring-engine.port';

@Module({
  providers: [{ provide: SCORING_ENGINE, useClass: PureScoringEngine }],
  exports: [SCORING_ENGINE],
})
export class ScoringModule {}
