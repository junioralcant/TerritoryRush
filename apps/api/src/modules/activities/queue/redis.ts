export const INGEST_QUEUE_NAME = 'ingest-activity';

export type RedisConnectionOptions = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  family: number;
  maxRetriesPerRequest: null;
};

/**
 * Parses a redis:// URL into connection options. Returning a plain options object
 * (rather than an ioredis instance) lets BullMQ create and own the connection, so
 * `queue.close()` / `worker.close()` fully tear it down.
 *
 * `family: 0` lets ioredis resolve both IPv4 and IPv6: Railway's private network
 * (redis.railway.internal) is IPv6-only, and the default (IPv4) would never connect.
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
    family: 0,
    maxRetriesPerRequest: null,
  };
};
