import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('exposes the registered metrics in Prometheus exposition format', async () => {
    const service = new MetricsService();
    service.incDomainChanges(2);
    service.incAntiCheatRejection();
    service.incStravaRateLimitHit();
    service.observeIngestionDuration(1.5);
    service.observeOsrmLatency(0.2);
    service.setQueueDepth(3);

    const output = await service.metrics();

    expect(output).toContain('territory_rush_domain_changes_total 2');
    expect(output).toContain('territory_rush_anti_cheat_rejections_total 1');
    expect(output).toContain('territory_rush_strava_rate_limit_hits_total 1');
    expect(output).toContain('territory_rush_ingestion_job_duration_seconds');
    expect(output).toContain('territory_rush_osrm_match_latency_seconds');
    expect(output).toContain('territory_rush_ingest_queue_depth 3');
  });

  it('does not increment domain changes for a zero count', async () => {
    const service = new MetricsService();
    service.incDomainChanges(0);
    expect(await service.metrics()).toContain('territory_rush_domain_changes_total 0');
  });
});
