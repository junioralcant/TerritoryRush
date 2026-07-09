import { ActivityIndicator, View } from 'react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { Bbox } from '../../services/api/types';
import { StreetDetailDrawer } from './StreetDetailDrawer';
import { StreetStateLegend } from './StreetStateLegend';
import { TerritoryMap } from './TerritoryMap';
import { useStreets } from './useStreets';

export type MapScreenProps = {
  api: ApiClient;
  bbox: Bbox;
};

export const MapScreen = ({ api, bbox }: MapScreenProps) => {
  const { streets, selected, loading, selectStreet } = useStreets(api, bbox);

  if (loading) {
    return <ActivityIndicator testID="map-loading" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <TerritoryMap streets={streets} onSelectStreet={(id) => void selectStreet(id)} />
      <StreetStateLegend />
      {selected ? <StreetDetailDrawer detail={selected} /> : null}
    </View>
  );
};
