import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { ApiClient } from '../../services/api/api-client.port';
import { useApiResource } from '../../services/useApiResource';
import { useStravaSync } from '../../services/useStravaSync';
import { ErrorView, Screen } from '../../ui';
import { MapSkeleton } from './MapSkeleton';
import { MapSyncButton } from './MapSyncButton';
import { MapTopBar } from './MapTopBar';
import { SelectedStreetCard } from './SelectedStreetCard';
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
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { streets, selected, loading, error, selectStreet, clearSelection, reload: reloadStreets } = useStreets(
    api,
    bboxAround(SAO_MATEUS_CENTER),
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const profileLoader = useCallback(() => api.getProfile(), [api]);
  const notificationsLoader = useCallback(() => api.getNotifications(), [api]);
  const profile = useApiResource(profileLoader);
  const notifications = useApiResource(notificationsLoader);
  const { syncing, sync } = useStravaSync(api);
  const onSync = () =>
    void sync(() => {
      reloadStreets();
      profile.reload();
      notifications.reload();
    });

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
  const isMine = selectedOwnership === 'mine';
  const closeStreet = () => {
    setDetailOpen(false);
    clearSelection();
  };

  return (
    <Screen edges={[]}>
      <View style={[styles.map, { backgroundColor: colors.bgApp }]}>
        <TerritoryMap
          streets={streets}
          initialCenter={SAO_MATEUS_CENTER}
          onSelectStreet={(id) => void selectStreet(id)}
        />

        <View style={[styles.topBar, { top: insets.top + 2 }]}>
          <MapTopBar
            streakDays={runner.streakDays}
            totalPoints={runner.totalPoints}
            unreadCount={unread}
            onOpenNotifications={onOpenNotifications}
          />
        </View>

        <MapSyncButton top={insets.top + 64} onPress={onSync} syncing={syncing} />

        <View style={[styles.legend, { top: insets.top + 64 }]}>
          <StreetStateLegend />
        </View>

        {selected ? (
          <View style={styles.streetCard}>
            <SelectedStreetCard
              detail={selected}
              isMine={isMine}
              currentUserId={runner.userId}
              onPress={() => setDetailOpen(true)}
            />
          </View>
        ) : null}
      </View>

      {selected && detailOpen ? (
        <StreetDetailDrawer detail={selected} isMine={isMine} currentUserId={runner.userId} onClose={closeStreet} />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  map: { flex: 1 },
  topBar: { position: 'absolute', left: 14, right: 14 },
  legend: { position: 'absolute', right: 14 },
  streetCard: { position: 'absolute', left: 14, right: 14, bottom: 16 },
});
