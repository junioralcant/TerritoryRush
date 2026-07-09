-- staging.sql
-- Copies OpenStreetMap road segments produced by osm2pgsql (planet_osm_line)
-- into the normalized staging table geo.osm_road. City attribution is left to
-- the derive step (resolveCitiesForOsmRoads), which runs a spatial join against
-- public.city_ref. Run this AFTER osm2pgsql has loaded the extract and AFTER the
-- reference cities have been loaded into public.city_ref.
truncate table geo.osm_road;

insert into geo.osm_road (osm_id, name, highway, geom)
select
  l.osm_id,
  l.name,
  l.highway,
  (ST_Dump(ST_Transform(l.way, 4326))).geom
from planet_osm_line l
where l.highway is not null;
