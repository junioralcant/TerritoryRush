-- 0006_activity.sql
-- Imported activity and its ingestion state machine. The unique
-- (provider, provider_activity_id) is the durable dedup guard: a duplicate
-- webhook cannot create a second activity. GPS streams are stored as JSONB so
-- the matching (Task 5) and anti-cheat (Task 7) steps can read them.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'activity_status') then
    create type public.activity_status as enum ('imported', 'processing', 'processed', 'rejected');
  end if;
end
$$;

create table if not exists public.activity (
  id                   uuid                    primary key default gen_random_uuid(),
  user_id              uuid                    not null,
  provider             public.provider_type    not null,
  provider_activity_id text                    not null,
  status               public.activity_status  not null default 'imported',
  distance_m           double precision,
  moving_time_s        integer,
  avg_pace_s_km        double precision,
  started_at           timestamptz,
  gps_streams          jsonb,
  rejection_reason     text,
  created_at           timestamptz             not null default now(),
  updated_at           timestamptz             not null default now(),
  unique (provider, provider_activity_id)
);

create index if not exists idx_activity_user_status on public.activity (user_id, status);
