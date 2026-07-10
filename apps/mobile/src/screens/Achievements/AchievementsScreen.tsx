import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApiClient } from '../../services/api/api-client.port';
import { useApiResource } from '../../services/useApiResource';
import { colors, fonts } from '../../theme';
import { EmptyView, ErrorView, LoadingView, PrimaryButton, Screen, ScreenHeader } from '../../ui';
import { AchievementBadge } from './AchievementBadge';

export type AchievementsScreenProps = {
  api: ApiClient;
  onBack?: () => void;
  onStartRun?: () => void;
};

export const AchievementsScreen = ({ api, onBack, onStartRun }: AchievementsScreenProps) => {
  const loader = useCallback(() => api.getAchievements(), [api]);
  const { data: achievements, loading, error, reload } = useApiResource(loader);

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Conquistas" onBack={onBack} />
        <LoadingView testID="achievements-loading" label="Carregando conquistas…" />
      </Screen>
    );
  }
  if (error || !achievements) {
    return (
      <Screen>
        <ScreenHeader title="Conquistas" onBack={onBack} />
        <ErrorView testID="achievements-error" onRetry={reload} />
      </Screen>
    );
  }

  if (achievements.length === 0) {
    return (
      <Screen>
        <ScreenHeader title="Conquistas" onBack={onBack} />
        <EmptyView
          testID="achievements-empty"
          icon={<Feather name="lock" size={42} color={colors.textLo} />}
          title="Nenhuma conquista ainda"
          message="Comece a correr para desbloquear suas primeiras conquistas e conquistar ruas da sua cidade."
          action={
            <PrimaryButton
              testID="achievements-start-run"
              label="Iniciar corrida"
              color={colors.accent}
              onPress={onStartRun}
              icon={<Feather name="play" size={18} color={colors.white} />}
            />
          }
        />
      </Screen>
    );
  }

  const unlocked = achievements.filter((a) => a.unlocked).length;
  const pct = Math.round((unlocked / achievements.length) * 100);

  return (
    <Screen>
      <ScreenHeader title="Conquistas" onBack={onBack} />
      <View style={styles.progressBlock}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            <Text style={styles.progressStrong}>{unlocked}</Text> de {achievements.length} desbloqueadas
          </Text>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      </View>

      <ScrollView accessibilityLabel="Conquistas" showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {achievements.map((achievement) => (
          <View key={achievement.code} style={styles.cell}>
            <AchievementBadge achievement={achievement} size={64} width={96} testID={`achievement-${achievement.code}`} />
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  progressBlock: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressText: { fontFamily: fonts.manrope, fontSize: 12.5, color: colors.textMid },
  progressStrong: { fontFamily: fonts.manropeBold, color: colors.textHi },
  progressPct: { fontFamily: fonts.manropeBold, fontSize: 12.5, color: colors.purple },
  track: { marginTop: 7, height: 7, borderRadius: 4, backgroundColor: '#222A37', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.purple },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 24 },
  cell: { width: '33.33%', alignItems: 'center', marginBottom: 16 },
});
