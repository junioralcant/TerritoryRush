import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { StreetDetail } from '../../services/api/types';
import { colors, fonts, ownershipColors } from '../../theme';
import { formatNumber } from '../../ui';

export type SelectedStreetCardProps = {
  detail: StreetDetail;
  isMine?: boolean;
  currentUserId?: string | null;
  onPress?: () => void;
};

type ChipStyle = { label: string; accent: string; tint: string; bg: string };

const ownerPoints = (detail: StreetDetail): number | null => {
  if (!detail.owner) return null;
  const match = detail.ranking.find((entry) => entry.userId === detail.owner?.userId);
  return match?.points ?? detail.ranking[0]?.points ?? null;
};

const chipFor = (detail: StreetDetail, mine: boolean): ChipStyle => {
  if (!detail.owner) {
    return { label: 'livre', accent: ownershipColors.unclaimed, tint: colors.textSoft, bg: 'rgba(122,132,146,0.16)' };
  }
  if (mine) {
    return { label: 'sua', accent: colors.primary, tint: '#7BB5FF', bg: 'rgba(46,139,255,0.16)' };
  }
  return { label: 'de outro', accent: colors.danger, tint: colors.dangerSoft, bg: 'rgba(226,59,59,0.16)' };
};

/**
 * Compact glass card shown at the bottom of the map when a street is selected.
 * Tapping it opens the full street detail. The border and glow adopt the
 * ownership colour so the selection reads at a glance.
 */
export const SelectedStreetCard = ({ detail, isMine = false, currentUserId, onPress }: SelectedStreetCardProps) => {
  const mine = isMine || (detail.owner?.userId != null && detail.owner.userId === currentUserId);
  const chip = chipFor(detail, mine);
  const points = ownerPoints(detail);
  const meta = detail.owner
    ? detail.tenureDays != null
      ? `dono há ${detail.tenureDays} ${detail.tenureDays === 1 ? 'dia' : 'dias'}`
      : 'com dono'
    : 'rua livre';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Detalhes da rua ${detail.name}`}
      testID="selected-street-card"
      style={[styles.card, { borderColor: chip.accent, shadowColor: chip.accent }]}
    >
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {detail.name}
          </Text>
          <View style={[styles.chip, { backgroundColor: chip.bg }]}>
            <View style={[styles.chipDot, { backgroundColor: chip.accent }]} />
            <Text style={[styles.chipText, { color: chip.tint }]}>{chip.label}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          {points != null ? (
            <View style={styles.points}>
              <MaterialCommunityIcons name="crown" size={14} color={colors.gold} />
              <Text style={styles.pointsValue}>{formatNumber(points)}</Text>
            </View>
          ) : null}
          <Text style={styles.meta}>{meta}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={22} color={colors.textMid} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(12,17,24,0.86)',
    borderWidth: 1.5,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 15,
    shadowOpacity: 0.25,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: fonts.sairaExtraBold, fontSize: 18, color: colors.textHi, flexShrink: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontFamily: fonts.manropeBold, fontSize: 10.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  points: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pointsValue: { fontFamily: fonts.sairaExtraBold, fontSize: 15, color: colors.gold },
  meta: { fontFamily: fonts.manrope, fontSize: 11.5, color: colors.textLo },
});
