import { Global, Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

// Global so any module (worker, matching, integrations) can inject MetricsService
// to instrument events without an explicit import.
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class ObservabilityModule {}
