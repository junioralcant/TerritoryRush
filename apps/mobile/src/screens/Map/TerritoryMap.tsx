import { ComponentRef, useEffect, useRef } from 'react';
import { Camera, LineLayer, MapView, ShapeSource } from '@maplibre/maplibre-react-native';
import { StreetSummary } from '../../services/api/types';
import { useTheme } from '../../theme';
import { nearestStreetId } from './nearestStreet';
import { toStreetFeatureCollection } from './streetFeatures';
import { Coordinate } from './useCurrentLocation';

export type TerritoryMapProps = {
  streets: StreetSummary[];
  onSelectStreet: (streetId: string) => void;
  initialCenter: Coordinate;
  recenterToken?: number;
};

const INITIAL_ZOOM = 14;

export const TerritoryMap = ({ streets, onSelectStreet, initialCenter, recenterToken = 0 }: TerritoryMapProps) => {
  const { mapStyleUrl, ownership } = useTheme();
  const camera = useRef<ComponentRef<typeof Camera>>(null);
  const features = toStreetFeatureCollection(streets, ownership);

  useEffect(() => {
    if (recenterToken > 0) {
      camera.current?.setCamera({
        centerCoordinate: initialCenter,
        zoomLevel: INITIAL_ZOOM,
        animationMode: 'flyTo',
        animationDuration: 600,
      });
    }
  }, [recenterToken, initialCenter]);

  return (
    <MapView
      testID="territory-map"
      style={{ flex: 1 }}
      mapStyle={mapStyleUrl}
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
      <Camera ref={camera} defaultSettings={{ centerCoordinate: initialCenter, zoomLevel: INITIAL_ZOOM }} />
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
