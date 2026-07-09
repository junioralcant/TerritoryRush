-- 0007_activity_street.sql
-- Traceability of which named streets an activity matched. points_awarded is
-- filled by the scoring step (Task 6); is_first_visit records whether this was
-- the runner's first time on the street. Unique (activity_id, street_id) keeps
-- re-runs of the same activity idempotent.
create table if not exists public.activity_street (
  id               uuid              primary key default gen_random_uuid(),
  activity_id      uuid              not null references public.activity (id) on delete cascade,
  street_id        uuid              not null references public.street (id) on delete cascade,
  points_awarded   bigint            not null default 0,
  is_first_visit   boolean           not null default false,
  matched_length_m double precision,
  created_at       timestamptz       not null default now(),
  unique (activity_id, street_id)
);

create index if not exists idx_activity_street_activity on public.activity_street (activity_id);
create index if not exists idx_activity_street_street on public.activity_street (street_id);
