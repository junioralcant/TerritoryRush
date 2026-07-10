import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/app-config.type';
import { MetricsService } from '../../../observability/metrics.service';
import { CircuitBreaker } from '../circuit-breaker';
import { GpsPoint, MatchedEdge, OsrmMatchResponse } from '../matching.types';
import { OsrmClient } from '../ports/osrm-client.port';
import { OsrmUnmatchableTraceError } from '../osrm-unmatchable-trace.error';
import { toMatchedEdges } from '../osrm-response';

const OSRM_TIMEOUT_MS = 4000;
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 30_000;

const isTransientStatus = (status: number): boolean => status >= 500 || status === 429;

const readOsrmCode = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { code?: string };
    return body.code ?? `HTTP_${response.status}`;
  } catch {
    return `HTTP_${response.status}`;
  }
};

@Injectable()
export class HttpOsrmClient implements OsrmClient {
  private readonly baseUrl: string;
  private readonly breaker = new CircuitBreaker(CIRCUIT_THRESHOLD, CIRCUIT_COOLDOWN_MS);

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly metrics: MetricsService,
  ) {
    this.baseUrl = config.get('osrmUrl', { infer: true });
  }

  async match(trace: GpsPoint[]): Promise<MatchedEdge[]> {
    if (trace.length < 2) {
      return [];
    }
    if (!this.breaker.canRequest()) {
      throw new Error('OSRM circuit is open');
    }
    try {
      const edges = await this.requestMatch(trace);
      this.breaker.recordSuccess();
      return edges;
    } catch (error) {
      if (error instanceof OsrmUnmatchableTraceError) {
        this.breaker.recordSuccess();
        throw error;
      }
      this.breaker.recordFailure();
      throw error;
    }
  }

  private async requestMatch(trace: GpsPoint[]): Promise<MatchedEdge[]> {
    const coordinates = trace.map((point) => `${point.lng},${point.lat}`).join(';');
    const url = `${this.baseUrl}/match/v1/foot/${coordinates}?steps=true&geometries=geojson&overview=false`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);
    const startedAt = Date.now();
    try {
      const response = await fetch(url, { signal: controller.signal });
      this.metrics.observeOsrmLatency((Date.now() - startedAt) / 1000);
      if (!response.ok) {
        if (isTransientStatus(response.status)) {
          throw new Error(`OSRM match failed with status ${response.status}`);
        }
        throw new OsrmUnmatchableTraceError(await readOsrmCode(response));
      }
      const data = (await response.json()) as OsrmMatchResponse;
      if (data.code !== 'Ok') {
        throw new OsrmUnmatchableTraceError(data.code);
      }
      return toMatchedEdges(data);
    } finally {
      clearTimeout(timeout);
    }
  }
}
