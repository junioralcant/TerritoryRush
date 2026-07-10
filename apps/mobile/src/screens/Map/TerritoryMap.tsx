import { Camera, LineLayer, MapView, ShapeSource } from '@maplibre/maplibre-react-native';
import { StreetSummary } from '../../services/api/types';
import { nearestStreetId } from './nearestStreet';
import { toStreetFeatureCollection } from './streetFeatures';
import { Coordinate } from './useCurrentLocation';

export type TerritoryMapProps = {
  streets: StreetSummary[];
  onSelectStreet: (streetId: string) => void;
  initialCenter: Coordinate;
};

const OSM_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const INITIAL_ZOOM = 14;

export const TerritoryMap = ({ streets, onSelectStreet, initialCenter }: TerritoryMapProps) => {
  const features = toStreetFeatureCollection(streets);

  return (
    <MapView
      testID="territory-map"
      style={{ flex: 1 }}
      mapStyle={OSM_STYLE_URL}
      onPress={(feature) => {
        const geometry = feature.geometry;
        if (!geometry || geometry.type !== 'Point') {
          return;
        }
        const [lng, lat] = geometry.coordinates;
        const streetId = nearestStreetId(streets, [lng, lat]);
        if (streetId) {
          onSelectStreet(streetId);
        }
      }}
    >
      <Camera defaultSettings={{ centerCoordinate: initialCenter, zoomLevel: INITIAL_ZOOM }} />
      <ShapeSource id="streets" testID="streets-source" shape={features}>
        <LineLayer
          id="streets-line"
          style={{
            lineColor: ['get', 'color'],
            lineWidth: ['case', ['==', ['get', 'ownership'], 'unclaimed'], 3, 8],
          }}
        />
      </ShapeSource>
    </MapView>
  );
};
