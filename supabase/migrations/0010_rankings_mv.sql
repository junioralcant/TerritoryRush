-- 0010_rankings_mv.sql
-- Leaderboard materialized views for fast reads. Unique indexes enable
-- REFRESH MATERIALIZED VIEW CONCURRENTLY (see RankingsService.refresh).
create materialized view if not exists public.mv_city_ranking as
select
  s.city_id,
  s.owner_user_id as user_id,
  count(*)::bigint as streets_owned,
  rank() over (partition by s.city_id order by count(*) desc) as rank
from public.street s
where s.owner_user_id is not null
group by s.city_id, s.owner_user_id
with data;

create unique index if not exists ux_mv_city_ranking on public.mv_city_ranking (city_id, user_id);

create materialized view if not exists public.mv_explorer_ranking as
select
  ss.user_id,
  count(distinct ss.street_id)::bigint as streets_visited,
  rank() over (order by count(distinct ss.street_id) desc) as rank
from public.street_score ss
group by ss.user_id
with data;

create unique index if not exists ux_mv_explorer_ranking on public.mv_explorer_ranking (user_id);

create materialized view if not exists public.mv_national_ranking as
select
  rp.user_id,
  rp.total_points,
  rank() over (order by rp.total_points desc) as rank
from public.runner_profile rp
with data;

create unique index if not exists ux_mv_national_ranking on public.mv_national_ranking (user_id);
