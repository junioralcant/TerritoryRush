import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radii } from '../../theme';

export type RecentActivityCardProps = {
  onPress?: () => void;
};

/**
 * "Atividade recente" slot. There is no activities feed yet, so this prompts the
 * runner to connect Strava (the source of activities) rather than showing fake
 * data — it opens Connections on press.
 */
export const RecentActivityCard = ({ onPress }: RecentActivityCardProps) => (
  <View style={styles.wrapper}>
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Atividade recente"
      testID="recent-activity"
    >
      <View style={styles.icon}>
        <MaterialCommunityIcons name="run" size={21} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Atividade recente</Text>
        <Text style={styles.subtitle}>Conecte o Strava para importar suas corridas</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.textLo} />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, paddingTop: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.boxLg,
    padding: 12,
  },
  icon: { width: 40, height: 40, borderRadius: radii.boxSm, backgroundColor: colors.surfaceInner, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontFamily: fonts.manropeBold, fontSize: 14, color: colors.textHi },
  subtitle: { fontFamily: fonts.manrope, fontSize: 11.5, color: colors.textMid, marginTop: 2 },
});
