import { useCallback } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { useApiResource } from '../../services/useApiResource';

export type ProfileScreenProps = {
  api: ApiClient;
};

export const ProfileScreen = ({ api }: ProfileScreenProps) => {
  const loader = useCallback(() => api.getProfile(), [api]);
  const { data: profile, loading, error } = useApiResource(loader);

  if (loading) {
    return <ActivityIndicator testID="profile-loading" />;
  }
  if (error || !profile) {
    return <Text testID="profile-error">Não foi possível carregar o perfil</Text>;
  }

  return (
    <View accessibilityLabel="Perfil do corredor">
      <Text testID="profile-name">{profile.name ?? 'Corredor'}</Text>
      <Text testID="profile-city">{profile.city ?? 'Cidade não informada'}</Text>
      <Text testID="profile-streets-owned">{`Ruas dominadas: ${profile.streetsOwned}`}</Text>
      <Text testID="profile-streets-explored">{`Ruas exploradas: ${profile.streetsExplored}`}</Text>
      <Text testID="profile-distance">{`Distância total: ${Math.round(profile.totalDistanceM / 1000)} km`}</Text>
      <Text testID="profile-streak">{`Sequência: ${profile.streakDays} dias`}</Text>
      <Text testID="profile-city-rank">
        {`Ranking na cidade: ${profile.cityRank ?? '—'}`}
      </Text>
      <Text testID="profile-national-rank">{`Ranking nacional: ${profile.nationalRank}`}</Text>
    </View>
  );
};
