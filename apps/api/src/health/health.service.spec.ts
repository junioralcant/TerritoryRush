import { Pool } from 'pg';
import { HealthService } from './health.service';

const makePoolStub = (query: jest.Mock): Pool => ({ query }) as unknown as Pool;

describe('HealthService', () => {
  it('reports ok on liveness with a non-negative uptime', () => {
    const service = new HealthService(makePoolStub(jest.fn()));

    const result = service.liveness();

    expect(result.status).toBe('ok');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });

  it('reports ready when the database responds', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const service = new HealthService(makePoolStub(query));

    const result = await service.readiness();

    expect(query).toHaveBeenCalledWith('select 1');
    expect(result).toEqual({ status: 'ready', checks: { database: 'up' } });
  });

  it('reports degraded when the database query fails', async () => {
    const query = jest.fn().mockRejectedValue(new Error('connection refused'));
    const service = new HealthService(makePoolStub(query));

    const result = await service.readiness();

    expect(result).toEqual({ status: 'degraded', checks: { database: 'down' } });
  });
});
