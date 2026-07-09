-- 0002_runner_profile.sql
-- Runner profile, created on the runner's first authenticated request.
-- In production `user_id` maps to `auth.users.id` (Supabase-managed). The FK is
-- intentionally omitted from the base migration so the schema also applies to a
-- plain Postgres/PostGIS instance used in local integration tests, where the
-- Supabase `auth` schema is not replicated.
create table if not exists public.runner_profile (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null unique,
  name              text,
  city              text,
  photo_url         text,
  total_distance_m  bigint      not null default 0,
  streak_days       integer     not null default 0,
  last_active_on    date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_runner_profile_user_id on public.runner_profile (user_id);
