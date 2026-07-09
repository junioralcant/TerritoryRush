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

## Typing convention

`interface` is reserved for contracts/ports (files named `*.port.ts`); every other
type (models, DTOs, unions, job payloads) uses `type`. Enforced by ESLint
(`@typescript-eslint/consistent-type-definitions`).
