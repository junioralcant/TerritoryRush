-- 0012_runner_signed_up_at.sql
-- Records when a runner first registered in the app (the first authenticated
-- request that created the profile). This is the cutoff for the initial activity
-- set: only the 5 most recent on-foot runs *before* this date are imported as the
-- seed; older runs are ignored. Runs after this date count normally.
-- Existing profiles are backfilled to the migration time (treated as "now").
alter table public.runner_profile
  add column if not exists signed_up_at timestamptz not null default now();
