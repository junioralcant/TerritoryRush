-- cities.sql
-- Populates public.city_ref from the administrative boundaries that osm2pgsql
-- loads into planet_osm_polygon. In Brazil, municipalities are admin_level 8.
-- Run AFTER osm2pgsql has loaded the extract and BEFORE deriving streets
-- (city attribution needs these boundaries). Idempotent per (name, region).
insert into public.city_ref (name, region, country, boundary)
select
  p.name,
  p.admin_level,
  'BR',
  ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Transform(p.way, 4326)), 3))
from planet_osm_polygon p
where p.boundary = 'administrative'
  and p.admin_level = '8'
  and p.name is not null
  and not exists (
    select 1 from public.city_ref c where c.name = p.name and c.region is not distinct from p.admin_level
  );
