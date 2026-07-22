# Territory Rush

Gamified running app that turns real activities into a competition for real-world
territory. Monorepo: NestJS modular monolith (`apps/api`), Supabase (Postgres +
PostGIS), and an Expo/React Native app (`apps/mobile`, added later).

Requirements: `tasks/prd-territory-rush-mvp/` (PRD + Tech Spec + tasks). Stack:
`tech.md`.

## Layout

```
apps/api/                 NestJS backend (DDD / Clean Architecture)
  src/modules/            domain modules (auth, profile, geo, integrations, ...)
  src/database/           pg Pool + SQL migration runner
supabase/migrations/      SQL schema (PostGIS + base tables)
infra/docker-compose.yml  local dev stack (Postgres+PostGIS, Redis)
```

## Local development

```bash
npm install                 # installs all workspaces
npm run infra:up            # starts Postgres+PostGIS (:5433) and Redis (:6380)

cp apps/api/.env.example apps/api/.env    # then fill SUPABASE_JWT_SECRET
# apply schema against the local DB:
DATABASE_URL=postgres://territory:territory@localhost:5433/territory_rush \
  npx ts-node apps/api/src/database/migration-runner.ts

npm run api:dev             # NestJS in watch mode
```

## Tests

```bash
npm run api:test            # unit tests (no infra needed)
npm run api:test:int        # integration tests (spins up PostGIS via testcontainers — Docker required)
npm run api:lint            # ESLint (enforces the interface/type convention)
```

## Deploy (Railway)

The API is a single container that serves HTTP and runs the BullMQ ingestion worker
in the same process. It builds from `apps/api/Dockerfile` (build context = repo root);
deploy config-as-code lives in `railway.json`.

Services in the Railway project:

1. **api** — this repo, built via the Dockerfile. `railway.json` sets a
   `preDeployCommand` that applies SQL migrations against `DATABASE_URL` before each
   release, a `/health` healthcheck, and `numReplicas: 1` (the in-process worker must
   not be duplicated).
2. **Redis** — Railway Redis plugin; wire its private `REDIS_URL` into `api`.
3. **osrm** — separate container serving `/match/v1/foot` from a processed extract
   (see `infra/osrm/README.md`); point `OSRM_URL` at it.

Postgres + Auth + Storage stay on **Supabase** (not Railway): `DATABASE_URL` is the
pooler connection string; `SUPABASE_JWT_SECRET` comes from Settings → API → JWT Secret.

Environment variables on the `api` service (`PORT` is injected by Railway):

```
DATABASE_URL, REDIS_URL, OSRM_URL,
SUPABASE_JWT_SECRET, SUPABASE_JWT_AUD=authenticated,
TOKEN_ENCRYPTION_KEY=<openssl rand -hex 32>,
STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET,
STRAVA_WEBHOOK_VERIFY_TOKEN,
STRAVA_WEBHOOK_CALLBACK_URL=https://<api-domain>/webhooks/strava,
SENTRY_DSN   # optional
```

After the first deploy, register the Strava webhook once (with production env):

```bash
npm run strava:subscribe --workspace apps/api
```

Operational endpoints: `GET /health` (liveness), `GET /health/ready` (readiness +
database ping), `GET /metrics` (Prometheus).

## Typing convention

`interface` is reserved for contracts/ports (files named `*.port.ts`); every other
type (models, DTOs, unions, job payloads) uses `type`. Enforced by ESLint
(`@typescript-eslint/consistent-type-definitions`).
