-- 0003_provider_connection.sql
-- Connection between a runner and an external sports provider (Strava/Garmin).
-- Tokens are persisted here but must be written encrypted (Supabase Vault) by the
-- integration modules (Task 3 owns the OAuth/token lifecycle); the base migration
-- only establishes the shape and the dedup constraint.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'provider_type') then
    create type public.provider_type as enum ('strava', 'garmin');
  end if;
end
$$;

create table if not exists public.provider_connection (
  id                   uuid               primary key default gen_random_uuid(),
  user_id              uuid               not null,
  provider             public.provider_type not null,
  access_token         text,
  refresh_token        text,
  expires_at           timestamptz,
  provider_athlete_id  text,
  scopes               text[]             not null default '{}',
  created_at           timestamptz        not null default now(),
  updated_at           timestamptz        not null default now(),
  unique (user_id, provider)
);

create index if not exists idx_provider_connection_user_id on public.provider_connection (user_id);
