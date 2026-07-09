-- 0005_provider_connection_athlete_idx.sql
-- The Strava webhook resolves an inbound event's athlete id to the local user.
-- Index the lookup key so that path stays fast under load.
create index if not exists idx_provider_connection_athlete
  on public.provider_connection (provider, provider_athlete_id);
