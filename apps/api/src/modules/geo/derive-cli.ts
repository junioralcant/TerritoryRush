import { Pool } from 'pg';
import { PgStreetRepository } from './repositories/street.repository';

/**
 * CLI entrypoint for the OSM import pipeline: wipes the derived street network,
 * resolves each staged road to a city and rebuilds the named-street aggregation
 * from scratch. Reuses the repository so the SQL has a single source of truth.
 * Run after `staging.sql` has populated `geo.osm_road`.
 *
 * The wipe cascades through every gameplay table (activity_street, street_score,
 * street_ownership_history), so this is a full territory reset — intended for a
 * clean reload, not an incremental geometry refresh. The ranking materialized
 * views are refreshed at the end so leaderboards do not reference deleted streets.
 */
const run = async (): Promise<void> => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to derive streets');
  }
  const pool = new Pool({ connectionString });
  pool.on('error', (error) => {
    process.stderr.write(`Idle Postgres client error: ${error.message}\n`);
  });
  try {
    const repository = new PgStreetRepository(pool);
    await repository.clearDerivedStreets();
    const resolved = await repository.resolveCitiesForOsmRoads();
    const derived = await repository.deriveStreetsFromOsmRoads();
    await pool.query('refresh materialized view public.mv_city_ranking');
    await pool.query('refresh materialized view public.mv_explorer_ranking');
    process.stdout.write(
      `Cleared derived streets; resolved cities for ${resolved} roads; derived ${derived} streets from scratch\n`,
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
