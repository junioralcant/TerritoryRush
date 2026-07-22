export type HealthStatus = {
  status: 'ok';
  uptime: number;
};

export type DependencyState = 'up' | 'down';

export type ReadinessStatus = {
  status: 'ready' | 'degraded';
  checks: {
    database: DependencyState;
  };
};
