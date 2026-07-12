import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ApiClient } from '../../services/api/api-client.port';
import { useApiResource } from '../../services/useApiResource';
import { colors, fonts } from '../../theme';
import { EmptyView, ErrorView, LoadingView, PrimaryButton, Screen } from '../../ui';
import { ActivityCard } from './ActivityCard';

export type ActivitiesScreenProps = {
  api: ApiClient;
  onOpenConnections?: () => void;
};

/**
 * Activities feed: runs imported from Strava/Garmin, each showing distance,
 * time, pace and processing status. Falls back to a connect prompt while the
 * runner has no imported activities yet.
 */
export const ActivitiesScreen = ({ api, onOpenConnections }: ActivitiesScreenProps) => {
  const loader = useCallback(() => api.getActivities(), [api]);
  const activities = useApiResource(loader);

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

  if (data.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={styles.title}>Atividades</Text>
        </View>
        <EmptyView
          testID="activities-empty"
          icon={<MaterialCommunityIcons name="run" size={42} color={colors.textLo} />}
          title="Nenhuma corrida ainda"
          message="Conecte o Strava para importar suas corridas automaticamente e conquistar ruas enquanto corre."
          action={
            <PrimaryButton testID="activities-connect" label="Conectar conta" color={colors.accent} onPress={onOpenConnections} />
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Atividades</Text>
      </View>
      <ScrollView
        accessibilityLabel="Suas atividades"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {data.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingVertical: 6 },
  title: { fontFamily: fonts.sairaExtraBold, fontSize: 22, color: colors.textHi },
  scroll: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 24, gap: 12 },
});
