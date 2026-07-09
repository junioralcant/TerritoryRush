# End-to-end tests

## Runnable API journey (Playwright, no browser)

`apps/api/e2e/journey.e2e-pw.spec.ts` exercises the full key journey through the
real HTTP API: connect Strava → webhook → BullMQ worker → activity processed →
`GET /streets` (owned) → `GET /streets/:id` → `GET /me/profile` → `GET /rankings/city`
→ `street_captured` notification. It boots the NestJS app on a random port with
PostGIS + Redis via Testcontainers, and drives it with Playwright's `request`
context. External providers (Strava OAuth/gateway, OSRM) are mocked at their ports.

```bash
cd apps/api && npm run test:e2e   # Docker required
```

## Full UI E2E (Expo web + backend) — harness

The techspec's UI-level E2E drives the Expo web build against the live backend.
It is not run in CI here because it needs the served app plus a processed OSRM
extract. Harness to run it locally:

1. `docker compose -f infra/docker-compose.yml up -d` (Postgres+PostGIS, Redis)
2. Build/serve OSRM with a regional extract — see `infra/osrm/README.md`.
3. Apply migrations and start the API (`npm run api:dev`), seed reference cities
   and a pilot activity.
4. `EXPO_PUBLIC_API_URL=... npm run web --workspace apps/mobile` to serve the app.
5. Point Playwright (with browsers installed: `npx playwright install`) at the
   served web app and run the UI flows.

The screen-level behaviour is covered by the component tests in `apps/mobile`
(`npm run test --workspace apps/mobile`), which render each screen against a
faked API; this UI harness validates the wired stack end to end.
