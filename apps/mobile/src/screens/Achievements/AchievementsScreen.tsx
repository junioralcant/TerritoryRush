import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { useApiResource } from '../../services/useApiResource';

export type AchievementsScreenProps = {
  api: ApiClient;
};

export const AchievementsScreen = ({ api }: AchievementsScreenProps) => {
  const loader = useCallback(() => api.getAchievements(), [api]);
  const { data: achievements, loading, error } = useApiResource(loader);

  if (loading) {
    return <ActivityIndicator testID="achievements-loading" />;
  }
  if (error || !achievements) {
    return <Text testID="achievements-error">Não foi possível carregar as conquistas</Text>;
  }

  return (
    <ScrollView accessibilityLabel="Conquistas">
      {achievements.map((achievement) => (
        <View
          key={achievement.code}
          testID={`achievement-${achievement.code}`}
          accessibilityLabel={`${achievement.title}, ${achievement.unlocked ? 'desbloqueada' : 'pendente'}`}
        >
          <Text>{achievement.title}</Text>
          <Text testID={`achievement-status-${achievement.code}`}>
            {achievement.unlocked ? 'Desbloqueada' : 'Pendente'}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};
