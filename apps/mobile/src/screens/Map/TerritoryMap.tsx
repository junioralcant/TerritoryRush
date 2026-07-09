import MapLibreGL, { Camera, LineLayer, MapView, ShapeSource } from '@maplibre/maplibre-react-native';
import { StreetSummary } from '../../services/api/types';
import { toStreetFeatureCollection } from './streetFeatures';

export type TerritoryMapProps = {
  streets: StreetSummary[];
  onSelectStreet: (streetId: string) => void;
};

const OSM_STYLE_URL = 'https://demotiles.maplibre.org/style.json';

export const TerritoryMap = ({ streets, onSelectStreet }: TerritoryMapProps) => {
  void MapLibreGL;
  const features = toStreetFeatureCollection(streets);

  return (
    <MapView testID="territory-map" style={{ flex: 1 }} mapStyle={OSM_STYLE_URL}>
      <Camera />
      <ShapeSource
        id="streets"
        testID="streets-source"
        shape={features}
        onPress={(event) => {
          const properties = event.features?.[0]?.properties as { id?: string } | null | undefined;
          if (properties?.id) {
            onSelectStreet(properties.id);
          }
        }}
      >
        <LineLayer
          id="streets-line"
          style={{ lineColor: ['get', 'color'], lineWidth: 4 }}
        />
      </ShapeSource>
    </MapView>
  );
};
