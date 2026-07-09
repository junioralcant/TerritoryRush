import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  private readonly ingestionDuration = new Histogram({
    name: 'territory_rush_ingestion_job_duration_seconds',
    help: 'Duration of the activity ingestion job',
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [this.registry],
  });

  private readonly osrmLatency = new Histogram({
    name: 'territory_rush_osrm_match_latency_seconds',
    help: 'Latency of OSRM /match calls',
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 4],
    registers: [this.registry],
  });

  private readonly antiCheatRejections = new Counter({
    name: 'territory_rush_anti_cheat_rejections_total',
    help: 'Activities rejected by anti-cheat',
    registers: [this.registry],
  });

  private readonly stravaRateLimitHits = new Counter({
    name: 'territory_rush_strava_rate_limit_hits_total',
    help: 'Strava rate-limit responses encountered',
    registers: [this.registry],
  });

  private readonly domainChanges = new Counter({
    name: 'territory_rush_domain_changes_total',
    help: 'Street ownership changes applied',
    registers: [this.registry],
  });

  private readonly queueDepth = new Gauge({
    name: 'territory_rush_ingest_queue_depth',
    help: 'Number of jobs waiting in the ingestion queue',
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'territory_rush_' });
  }

  observeIngestionDuration(seconds: number): void {
    this.ingestionDuration.observe(seconds);
  }

  observeOsrmLatency(seconds: number): void {
    this.osrmLatency.observe(seconds);
  }

  incAntiCheatRejection(): void {
    this.antiCheatRejections.inc();
  }

  incStravaRateLimitHit(): void {
    this.stravaRateLimitHits.inc();
  }

  incDomainChanges(count: number): void {
    if (count > 0) {
      this.domainChanges.inc(count);
    }
  }

  setQueueDepth(depth: number): void {
    this.queueDepth.set(depth);
  }

  metrics(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
