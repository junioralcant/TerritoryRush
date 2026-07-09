import { GeoJsonMultiLineString, StreetOwnership, StreetRow, StreetSummary } from './geo.types';

const resolveOwnership = (
  ownerUserId: string | null,
  requestingUserId: string,
): StreetOwnership => {
  if (!ownerUserId) {
    return 'unclaimed';
  }
  return ownerUserId === requestingUserId ? 'mine' : 'other';
};

export const toStreetSummary = (row: StreetRow, requestingUserId: string): StreetSummary => ({
  id: row.id,
  name: row.osm_name,
  cityId: row.city_id,
  ownership: resolveOwnership(row.owner_user_id, requestingUserId),
  ownerUserId: row.owner_user_id,
  geometry: JSON.parse(row.geojson) as GeoJsonMultiLineString,
});
