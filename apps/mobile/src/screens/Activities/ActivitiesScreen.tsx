import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ApiClient } from '../../services/api/api-client.port';
import { useApiResource } from '../../services/useApiResource';
import { useStravaSync } from '../../services/useStravaSync';
import { Palette, fonts, useTheme } from '../../theme';
import { EmptyView, ErrorView, LoadingView, PrimaryButton, Screen } from '../../ui';
import { ActivityCard } from './ActivityCard';

export type ActivitiesScreenProps = {
  api: ApiClient;
  onOpenConnections?: () => void;
};

const SyncButton = ({ syncing, onPress }: { syncing: boolean; onPress: () => void }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      disabled={syncing}
      accessibilityRole="button"
      accessibilityLabel="Atualizar atividades"
      testID="activities-sync"
      hitSlop={8}
      style={styles.syncButton}
    >
      {syncing ? (
        <ActivityIndicator size="small" color={colors.textLo} />
      ) : (
        <Feather name="refresh-cw" size={20} color={colors.textLo} />
      )}
    </Pressable>
  );
};

/**
 * Activities feed: runs imported from Strava/Garmin, each showing distance,
 * time, pace and processing status. The refresh button (and pull-to-refresh)
 * triggers an on-demand Strava sync so new runs appear without waiting on the
 * webhook. Falls back to a connect prompt while there are no activities yet.
 */
export const ActivitiesScreen = ({ api, onOpenConnections }: ActivitiesScreenProps) => {
  const loader = useCallback(() => api.getActivities(), [api]);
  const activities = useApiResource(loader);
  const { syncing, sync } = useStravaSync(api);
  const onRefresh = useCallback(() => void sync(activities.reload), [sync, activities.reload]);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (activities.loading) {
    return (
      <Screen>
        <LoadingView testID="activities-loading" label="Carregando atividades…" />
      </Screen>
    );
  }

  if (activities.error) {
    return (
      <Screen>
        <ErrorView testID="activities-error" onRetry={activities.reload} />
      </Screen>
    );
  }

  const data = activities.data ?? [];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Atividades</Text>
        <SyncButton syncing={syncing} onPress={onRefresh} />
      </View>
      {data.length === 0 ? (
        <EmptyView
          testID="activities-empty"
          icon={<MaterialCommunityIcons name="run" size={42} color={colors.textLo} />}
          title="Nenhuma corrida ainda"
          message="Conecte o Strava para importar suas corridas automaticamente e conquistar ruas enquanto corre."
          action={
            <PrimaryButton testID="activities-connect" label="Conectar conta" color={colors.accent} onPress={onOpenConnections} />
          }
        />
      ) : (
        <ScrollView
          accessibilityLabel="Suas atividades"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={syncing} onRefresh={onRefresh} tintColor={colors.textLo} />}
        >
          {data.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 18,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: { fontFamily: fonts.sairaExtraBold, fontSize: 22, color: c.textHi },
    syncButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: c.stroke,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 24, gap: 12 },
  });
