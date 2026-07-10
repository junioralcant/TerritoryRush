import { StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { AchievementView } from '../../services/api/types';
import { colors, fonts } from '../../theme';
import { HexBadge } from '../../ui';
import { achievementVisual } from './achievementVisual';

export type AchievementBadgeProps = {
  achievement: AchievementView;
  size?: number;
  width?: number;
  testID?: string;
};

const unitFor = (key: string): string => {
  if (/(explor|visit|unique|única)/.test(key)) return 'ruas únicas';
  if (/(bairro|neighbor|region)/.test(key)) return 'bairros';
  if (/(streak|consist|dias|day|sequ)/.test(key)) return 'dias seguidos';
  if (/(distance|km)/.test(key)) return 'km';
  return 'ruas';
};

const subtitleFor = (achievement: AchievementView): string => {
  const key = `${achievement.category} ${achievement.code}`.toLowerCase();
  return achievement.threshold > 1 ? `${achievement.threshold} ${unitFor(key)}` : 'Conquiste a 1ª';
};

export const AchievementBadge = ({ achievement, size = 62, width = 62, testID }: AchievementBadgeProps) => {
  const visual = achievementVisual(achievement);
  const iconColor = achievement.unlocked ? visual.color : colors.textMid;
  const icon =
    visual.family === 'feather' ? (
      <Feather name={visual.icon as never} size={size * 0.4} color={iconColor} />
    ) : (
      <MaterialCommunityIcons name={visual.icon as never} size={size * 0.42} color={iconColor} />
    );

  return (
    <View
      style={[styles.item, { width }]}
      testID={testID}
      accessibilityLabel={`${achievement.title}, ${achievement.unlocked ? 'desbloqueada' : 'bloqueada'}`}
    >
      <HexBadge size={size} color={visual.color} icon={icon} locked={!achievement.unlocked} />
      <Text style={[styles.title, !achievement.unlocked && styles.lockedTitle]} numberOfLines={2}>
        {achievement.title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitleFor(achievement)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  item: { alignItems: 'center', gap: 7 },
  title: {
    fontFamily: fonts.manropeBold,
    fontSize: 11.5,
    color: colors.textHi,
    textAlign: 'center',
    lineHeight: 14,
  },
  lockedTitle: { color: colors.textMid },
  subtitle: { fontFamily: fonts.manrope, fontSize: 9.5, color: colors.textLo, textAlign: 'center' },
});
