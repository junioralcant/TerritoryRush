import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

export const MIGRATIONS_DIR = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'supabase',
  'migrations',
);

const listMigrationFiles = (dir: string): string[] =>
  readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

/**
 * Applies every SQL migration in `supabase/migrations`, tracking applied files in
 * `public.schema_migrations` so it is safe to run repeatedly. Used by the local
 * dev CLI and by the integration-test harness against a fresh PostGIS container.
 */
export const runMigrations = async (
  pool: Pool,
  dir: string = MIGRATIONS_DIR,
): Promise<string[]> => {
  await pool.query(
    `create table if not exists public.schema_migrations (
       filename   text        primary key,
       applied_at timestamptz not null default now()
     )`,
  );

  const applied = new Set(
    (await pool.query<{ filename: string }>('select filename from public.schema_migrations')).rows.map(
      (row) => row.filename,
    ),
  );

  const executed: string[] = [];
  for (const filename of listMigrationFiles(dir)) {
    if (applied.has(filename)) {
      continue;
    }
    const sql = readFileSync(join(dir, filename), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into public.schema_migrations (filename) values ($1)', [filename]);
      await client.query('commit');
      executed.push(filename);
    } catch (error) {
      await client.query('rollback');
      throw new Error(`Migration failed: ${filename} — ${(error as Error).message}`);
    } finally {
      client.release();
    }
  }
  return executed;
};

if (require.main === module) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run migrations');
  }
  const pool = new Pool({ connectionString });
  runMigrations(pool)
    .then((executed) => {
      const summary = executed.length ? executed.join(', ') : 'nothing to apply';
      process.stdout.write(`Migrations applied: ${summary}\n`);
      return pool.end();
    })
    .catch((error: Error) => {
      process.stderr.write(`${error.message}\n`);
      return pool.end().finally(() => process.exit(1));
    });
}
