import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/app-config.type';
import { CircuitBreaker } from '../circuit-breaker';
import { GpsPoint, MatchedEdge, OsrmMatchResponse } from '../matching.types';
import { OsrmClient } from '../ports/osrm-client.port';
import { toMatchedEdges } from '../osrm-response';

const OSRM_TIMEOUT_MS = 4000;
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 30_000;

@Injectable()
export class HttpOsrmClient implements OsrmClient {
  private readonly baseUrl: string;
  private readonly breaker = new CircuitBreaker(CIRCUIT_THRESHOLD, CIRCUIT_COOLDOWN_MS);

  constructor(config: ConfigService<AppConfig, true>) {
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
      this.breaker.recordFailure();
      throw error;
    }
  }

  private async requestMatch(trace: GpsPoint[]): Promise<MatchedEdge[]> {
    const coordinates = trace.map((point) => `${point.lng},${point.lat}`).join(';');
    const url = `${this.baseUrl}/match/v1/foot/${coordinates}?steps=true&geometries=geojson&overview=false`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`OSRM match failed with status ${response.status}`);
      }
      const data = (await response.json()) as OsrmMatchResponse;
      if (data.code !== 'Ok') {
        throw new Error(`OSRM match returned code ${data.code}`);
      }
      return toMatchedEdges(data);
    } finally {
      clearTimeout(timeout);
    }
  }
}
