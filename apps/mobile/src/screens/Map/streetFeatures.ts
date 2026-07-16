import { StreetSummary } from '../../services/api/types';
import { OwnershipColors, lightOwnership } from '../../theme';
import { ownershipStyle } from './ownershipStyle';

export type StreetFeature = {
  type: 'Feature';
  id: string;
  properties: { id: string; ownership: string; color: string };
  geometry: StreetSummary['geometry'];
};

export type StreetFeatureCollection = {
  type: 'FeatureCollection';
  features: StreetFeature[];
};

/**
 * Builds a GeoJSON FeatureCollection for the map, tagging each street with its
 * ownership colour so a single data-driven line layer can render all states.
 * The ownership palette comes from the active theme (defaults to light).
 */
export const toStreetFeatureCollection = (
  streets: StreetSummary[],
  palette: OwnershipColors = lightOwnership,
): StreetFeatureCollection => ({
  type: 'FeatureCollection',
  features: streets.map((street) => ({
    type: 'Feature',
    id: street.id,
    properties: { id: street.id, ownership: street.ownership, color: ownershipStyle(street.ownership, palette).color },
    geometry: street.geometry,
  })),
});
