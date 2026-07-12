import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { useApiResource } from '../../services/useApiResource';
import { ErrorView, Screen } from '../../ui';
import { MapControls } from './MapControls';
import { MapSkeleton } from './MapSkeleton';
import { MapTopBar } from './MapTopBar';
import { StreetDetailDrawer } from './StreetDetailDrawer';
import { StreetStateLegend } from './StreetStateLegend';
import { TerritoryMap } from './TerritoryMap';
import { bboxAround } from './bboxAround';
import { Coordinate } from './useCurrentLocation';
import { useStreets } from './useStreets';

export type MapScreenProps = {
  api: ApiClient;
  onOpenNotifications?: () => void;
};

const SAO_MATEUS_CENTER: Coordinate = [-44.4689, -4.0361];

export const MapScreen = ({ api, onOpenNotifications }: MapScreenProps) => {
  const { streets, selected, loading, error, selectStreet, clearSelection } = useStreets(
    api,
    bboxAround(SAO_MATEUS_CENTER),
  );

  const profileLoader = useCallback(() => api.getProfile(), [api]);
  const notificationsLoader = useCallback(() => api.getNotifications(), [api]);
  const profile = useApiResource(profileLoader);
  const notifications = useApiResource(notificationsLoader);

  if (profile.loading || loading) {
    return (
      <Screen>
        <MapSkeleton />
      </Screen>
    );
  }

  if (error || profile.error || !profile.data) {
    return (
      <Screen>
        <ErrorView testID="map-error" onRetry={() => profile.reload()} />
      </Screen>
    );
  }

  const runner = profile.data;
  const unread = (notifications.data ?? []).filter((item) => item.readAt === null).length;
  const selectedOwnership = selected ? streets.find((street) => street.id === selected.id)?.ownership : undefined;

  return (
    <Screen>
      <MapTopBar
        streakDays={runner.streakDays}
        totalPoints={runner.totalPoints}
        unreadCount={unread}
        onOpenNotifications={onOpenNotifications}
      />
      <View style={styles.mapSection}>
        <TerritoryMap streets={streets} initialCenter={SAO_MATEUS_CENTER} onSelectStreet={(id) => void selectStreet(id)} />
        <MapControls />
        <View style={styles.legend}>
          <StreetStateLegend />
        </View>
      </View>

      {selected ? (
        <StreetDetailDrawer
          detail={selected}
          isMine={selectedOwnership === 'mine'}
          currentUserId={runner.userId}
          onClose={clearSelection}
        />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  mapSection: { flex: 1, position: 'relative', backgroundColor: '#0C1119', overflow: 'hidden' },
  legend: { position: 'absolute', right: 14, bottom: 14 },
});
