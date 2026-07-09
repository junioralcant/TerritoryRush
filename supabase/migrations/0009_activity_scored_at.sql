-- 0009_activity_scored_at.sql
-- Idempotency marker for scoring. Set inside the same transaction that accumulates
-- points, so a retried job (BullMQ) that re-runs scoring after a mid-pipeline crash
-- cannot double-count: the scoring step short-circuits when scored_at is already set.
alter table public.activity add column if not exists scored_at timestamptz;
