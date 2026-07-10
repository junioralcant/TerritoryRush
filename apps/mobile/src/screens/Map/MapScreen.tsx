import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { useApiResource } from '../../services/useApiResource';
import { ErrorView, LocationPermissionView, Screen } from '../../ui';
import { MapControls } from './MapControls';
import { MapSkeleton } from './MapSkeleton';
import { MapTopBar } from './MapTopBar';
import { ProfileHeroCards } from './ProfileHeroCards';
import { RecentActivityCard } from './RecentActivityCard';
import { RecentAchievements } from './RecentAchievements';
import { StreetDetailDrawer } from './StreetDetailDrawer';
import { StreetStateLegend } from './StreetStateLegend';
import { TerritoryMap } from './TerritoryMap';
import { bboxAround } from './bboxAround';
import { Coordinate, useCurrentLocation } from './useCurrentLocation';
import { useStreets } from './useStreets';

export type MapScreenProps = {
  api: ApiClient;
  onOpenNotifications?: () => void;
  onOpenAchievements?: () => void;
  onOpenConnections?: () => void;
};

const FALLBACK_CENTER: Coordinate = [-38.5014, -12.9777];

export const MapScreen = ({ api, onOpenNotifications, onOpenAchievements, onOpenConnections }: MapScreenProps) => {
  const { center, resolving, permissionDenied, retry } = useCurrentLocation(FALLBACK_CENTER);
  const { streets, selected, loading, error, selectStreet, clearSelection } = useStreets(api, bboxAround(center));

  const profileLoader = useCallback(() => api.getProfile(), [api]);
  const achievementsLoader = useCallback(() => api.getAchievements(), [api]);
  const notificationsLoader = useCallback(() => api.getNotifications(), [api]);
  const profile = useApiResource(profileLoader);
  const achievements = useApiResource(achievementsLoader);
  const notifications = useApiResource(notificationsLoader);

  if (permissionDenied) {
    return (
      <Screen>
        <LocationPermissionView onAllow={retry} onDismiss={retry} testID="map-permission" />
      </Screen>
    );
  }

  if (resolving || profile.loading || loading) {
    return (
      <Screen>
        <MapSkeleton />
      </Screen>
    );
  }

  if (error || profile.error || !profile.data) {
    return (
      <Screen>
        <ErrorView
          testID="map-error"
          onRetry={() => {
            profile.reload();
            retry();
          }}
        />
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <ProfileHeroCards profile={runner} />

        <View style={styles.mapSection}>
          <TerritoryMap streets={streets} initialCenter={center} onSelectStreet={(id) => void selectStreet(id)} />
          <MapControls onRecenter={retry} />
          <View style={styles.legend}>
            <StreetStateLegend />
          </View>
        </View>

        <RecentActivityCard onPress={onOpenConnections} />
        <RecentAchievements achievements={achievements.data ?? []} onSeeAll={onOpenAchievements} />
      </ScrollView>

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
  scroll: { paddingBottom: 16 },
  mapSection: { height: 300, position: 'relative', backgroundColor: '#0C1119', overflow: 'hidden' },
  legend: { position: 'absolute', right: 14, bottom: 14 },
});
