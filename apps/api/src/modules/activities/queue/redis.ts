export const INGEST_QUEUE_NAME = 'ingest-activity';

export type RedisConnectionOptions = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  maxRetriesPerRequest: null;
};

/**
 * Parses a redis:// URL into connection options. Returning a plain options object
 * (rather than an ioredis instance) lets BullMQ create and own the connection, so
 * `queue.close()` / `worker.close()` fully tear it down.
 */
export const buildRedisConnection = (redisUrl: string): RedisConnectionOptions => {
  const url = new URL(redisUrl);
  const db = url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : undefined;
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.isFinite(db) ? db : undefined,
    maxRetriesPerRequest: null,
  };
};
