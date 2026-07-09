import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, Text } from 'react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { CityRankingEntry, ExplorerRankingEntry } from '../../services/api/types';
import { useApiResource } from '../../services/useApiResource';

export type RankingScreenProps = {
  api: ApiClient;
  cityId: string | null;
};

export const RankingScreen = ({ api, cityId }: RankingScreenProps) => {
  const cityLoader = useCallback(
    (): Promise<CityRankingEntry[]> => (cityId ? api.getCityRanking(cityId) : Promise.resolve([])),
    [api, cityId],
  );
  const explorerLoader = useCallback((): Promise<ExplorerRankingEntry[]> => api.getExplorerRanking(), [api]);
  const city = useApiResource(cityLoader);
  const explorers = useApiResource(explorerLoader);

  if (city.loading || explorers.loading) {
    return <ActivityIndicator testID="ranking-loading" />;
  }

  return (
    <ScrollView accessibilityLabel="Rankings">
      <Text testID="ranking-city-title">Ranking municipal — ruas dominadas</Text>
      {(city.data ?? []).map((entry) => (
        <Text key={entry.userId} testID={`city-rank-${entry.rank}`}>
          {`${entry.rank}. ${entry.name ?? entry.userId} — ${entry.streetsOwned} ruas`}
        </Text>
      ))}
      <Text testID="ranking-explorers-title">Ranking de exploradores — ruas únicas</Text>
      {(explorers.data ?? []).map((entry) => (
        <Text key={entry.userId} testID={`explorer-rank-${entry.rank}`}>
          {`${entry.rank}. ${entry.name ?? entry.userId} — ${entry.streetsVisited} ruas`}
        </Text>
      ))}
    </ScrollView>
  );
};
