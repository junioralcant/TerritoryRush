import { Pool } from 'pg';
import { PgStreetRepository } from './repositories/street.repository';

/**
 * CLI entrypoint for the OSM import pipeline: resolves each staged road to a city
 * and derives the named-street aggregation. Reuses the repository so the SQL has a
 * single source of truth. Run after `staging.sql` has populated `geo.osm_road`.
 */
const run = async (): Promise<void> => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to derive streets');
  }
  const pool = new Pool({ connectionString });
  try {
    const repository = new PgStreetRepository(pool);
    const resolved = await repository.resolveCitiesForOsmRoads();
    const derived = await repository.deriveStreetsFromOsmRoads();
    process.stdout.write(
      `Resolved cities for ${resolved} roads; derived/updated ${derived} streets\n`,
    );
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  run().catch((error: Error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
