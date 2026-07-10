import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApiClient } from '../../services/api/api-client.port';
import { CityRankingEntry, ExplorerRankingEntry } from '../../services/api/types';
import { useApiResource } from '../../services/useApiResource';
import { colors, fonts, radii } from '../../theme';
import { LoadingView, Screen } from '../../ui';
import { RankRow, RankingLeaderboard } from './RankingLeaderboard';

export type RankingScreenProps = {
  api: ApiClient;
  cityId: string | null;
  cityName?: string | null;
  currentUserId?: string | null;
};

type Tab = 'city' | 'explorers';

export const RankingScreen = ({ api, cityId, cityName, currentUserId }: RankingScreenProps) => {
  const [tab, setTab] = useState<Tab>(cityId ? 'city' : 'explorers');

  const cityLoader = useCallback(
    (): Promise<CityRankingEntry[]> => (cityId ? api.getCityRanking(cityId) : Promise.resolve([])),
    [api, cityId],
  );
  const explorerLoader = useCallback((): Promise<ExplorerRankingEntry[]> => api.getExplorerRanking(), [api]);
  const city = useApiResource(cityLoader);
  const explorers = useApiResource(explorerLoader);

  if (city.loading || explorers.loading) {
    return (
      <Screen>
        <LoadingView testID="ranking-loading" label="Carregando ranking…" />
      </Screen>
    );
  }

  const cityRows: RankRow[] = (city.data ?? []).map((entry) => ({
    userId: entry.userId,
    name: entry.name,
    rank: entry.rank,
    value: entry.streetsOwned,
  }));
  const explorerRows: RankRow[] = (explorers.data ?? []).map((entry) => ({
    userId: entry.userId,
    name: entry.name,
    rank: entry.rank,
    value: entry.streetsVisited,
  }));

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Ranking</Text>
        <View style={styles.segmented}>
          <Pressable
            testID="ranking-tab-city"
            onPress={() => setTab('city')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'city' }}
            style={[styles.segment, tab === 'city' && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.segmentLabel, tab === 'city' && styles.segmentActive]}>Cidade</Text>
          </Pressable>
          <Pressable
            testID="ranking-tab-explorers"
            onPress={() => setTab('explorers')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'explorers' }}
            style={[styles.segment, tab === 'explorers' && { backgroundColor: colors.green }]}
          >
            <Text style={[styles.segmentLabel, tab === 'explorers' && styles.segmentActive]}>Exploradores</Text>
          </Pressable>
        </View>
        <View style={styles.context}>
          <Feather name={tab === 'city' ? 'map-pin' : 'globe'} size={13} color={colors.textMid} />
          <Text style={styles.contextText}>
            {tab === 'city'
              ? `${cityName ?? 'Sua cidade'} · por ruas dominadas`
              : 'Brasil · por ruas únicas exploradas'}
          </Text>
        </View>
      </View>

      <ScrollView accessibilityLabel="Rankings" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {tab === 'city' ? (
          <RankingLeaderboard rows={cityRows} prefix="city" unit="ruas" accent={colors.primary} currentUserId={currentUserId} />
        ) : (
          <RankingLeaderboard rows={explorerRows} prefix="explorer" unit="ruas" accent={colors.green} currentUserId={currentUserId} />
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingTop: 6 },
  title: { fontFamily: fonts.sairaExtraBold, fontSize: 22, color: colors.textHi },
  segmented: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.boxSm,
    padding: 4,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  segmentLabel: { fontFamily: fonts.manropeSemiBold, fontSize: 13, color: colors.textMid },
  segmentActive: { color: colors.white, fontFamily: fonts.manropeBold },
  context: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  contextText: { fontFamily: fonts.manrope, fontSize: 12, color: colors.textMid },
  scroll: { paddingHorizontal: 18, paddingBottom: 24 },
});
