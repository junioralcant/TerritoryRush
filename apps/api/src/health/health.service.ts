import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.constants';
import { DependencyState, HealthStatus, ReadinessStatus } from './health.types';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  liveness(): HealthStatus {
    return { status: 'ok', uptime: process.uptime() };
  }

  async readiness(): Promise<ReadinessStatus> {
    const database = await this.pingDatabase();
    return {
      status: database === 'up' ? 'ready' : 'degraded',
      checks: { database },
    };
  }

  private async pingDatabase(): Promise<DependencyState> {
    try {
      await this.pool.query('select 1');
      return 'up';
    } catch (error) {
      this.logger.error(`Database health check failed: ${(error as Error).message}`);
      return 'down';
    }
  }
}
