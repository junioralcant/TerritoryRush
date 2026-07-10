import { StyleSheet, Text, View } from 'react-native';
import { AchievementView } from '../../services/api/types';
import { colors, fonts } from '../../theme';
import { AchievementBadge } from '../Achievements/AchievementBadge';

export type RecentAchievementsProps = {
  achievements: AchievementView[];
  onSeeAll?: () => void;
};

const pickRecent = (achievements: AchievementView[]): AchievementView[] => {
  const unlocked = achievements
    .filter((a) => a.unlocked)
    .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''));
  const rest = achievements.filter((a) => !a.unlocked);
  return [...unlocked, ...rest].slice(0, 5);
};

export const RecentAchievements = ({ achievements, onSeeAll }: RecentAchievementsProps) => {
  const recent = pickRecent(achievements);
  if (recent.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Conquistas recentes</Text>
        <Text testID="see-all-achievements" onPress={onSeeAll} style={styles.seeAll}>
          Ver todas
        </Text>
      </View>
      <View style={styles.row}>
        {recent.map((achievement) => (
          <AchievementBadge
            key={achievement.code}
            achievement={achievement}
            size={52}
            width={62}
            testID={`recent-achievement-${achievement.code}`}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  title: { fontFamily: fonts.sairaExtraBold, fontSize: 16, color: colors.textHi },
  seeAll: { fontFamily: fonts.manropeSemiBold, fontSize: 12, color: colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
