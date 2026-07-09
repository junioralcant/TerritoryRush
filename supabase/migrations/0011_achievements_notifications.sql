-- 0011_achievements_notifications.sql
-- Achievement catalog + per-runner unlocks, device push tokens, and notifications.
create table if not exists public.achievement (
  code        text    primary key,
  title       text    not null,
  category    text    not null,
  threshold   integer not null default 1
);

insert into public.achievement (code, title, category, threshold) values
  ('first_run',    'Primeira corrida',        'milestone', 1),
  ('first_street', 'Primeira rua dominada',   'streets',   1),
  ('streets_10',   '10 ruas dominadas',       'streets',   10),
  ('streets_50',   '50 ruas dominadas',       'streets',   50),
  ('streets_100',  '100 ruas dominadas',      'streets',   100),
  ('streets_500',  '500 ruas dominadas',      'streets',   500),
  ('streets_1000', '1.000 ruas dominadas',    'streets',   1000),
  ('km_100',       '100 km corridos',         'distance',  100),
  ('km_500',       '500 km corridos',         'distance',  500),
  ('km_1000',      '1.000 km corridos',       'distance',  1000),
  ('first_city',   'Primeira cidade explorada','cities',   1)
on conflict (code) do nothing;

create table if not exists public.runner_achievement (
  user_id          uuid        not null,
  achievement_code text        not null references public.achievement (code),
  unlocked_at      timestamptz not null default now(),
  primary key (user_id, achievement_code)
);

create table if not exists public.device_token (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null,
  token      text        not null unique,
  platform   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_device_token_user on public.device_token (user_id);

create table if not exists public.notification (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null,
  type       text        not null,
  payload    jsonb       not null default '{}'::jsonb,
  sent_at    timestamptz,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_user on public.notification (user_id, created_at desc);
