-- 0008_scoring_territory.sql
-- Per-runner score on each street (drives the street ranking and ownership) and
-- the ownership history. Runner-level aggregates (total points, streak milestone
-- tier) are added to runner_profile.
create table if not exists public.street_score (
  id               uuid        primary key default gen_random_uuid(),
  street_id        uuid        not null references public.street (id) on delete cascade,
  user_id          uuid        not null,
  points           bigint      not null default 0,
  first_visited_at timestamptz,
  last_visited_at  timestamptz,
  defended_since   timestamptz,
  defense_tier     integer     not null default 0,
  unique (street_id, user_id)
);

create index if not exists idx_street_score_ranking on public.street_score (street_id, points desc);
create index if not exists idx_street_score_user on public.street_score (user_id);

create table if not exists public.street_ownership_history (
  id          uuid        primary key default gen_random_uuid(),
  street_id   uuid        not null references public.street (id) on delete cascade,
  user_id     uuid        not null,
  acquired_at timestamptz not null default now(),
  lost_at     timestamptz
);

create index if not exists idx_ownership_history_street on public.street_ownership_history (street_id);

alter table public.runner_profile add column if not exists total_points bigint not null default 0;
alter table public.runner_profile add column if not exists streak_bonus_tier integer not null default 0;
