import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { Wordmark, formatNumber } from '../../ui';

export type MapTopBarProps = {
  streakDays: number;
  totalPoints: number;
  unreadCount: number;
  onOpenNotifications?: () => void;
  onSync?: () => void;
  syncing?: boolean;
};

/**
 * Floating glass top bar over the map: wordmark, streak + points pills and the
 * notifications bell (red dot when there are unread items).
 */
export const MapTopBar = ({
  streakDays,
  totalPoints,
  unreadCount,
  onOpenNotifications,
  onSync,
  syncing,
}: MapTopBarProps) => (
  <View style={styles.bar}>
    <Wordmark size={16} align="left" />
    <View style={styles.right}>
      <View style={styles.streakPill}>
        <MaterialCommunityIcons name="fire" size={13} color={colors.accent} />
        <Text style={styles.streakValue}>{formatNumber(streakDays)}</Text>
      </View>
      <View style={styles.pointsPill}>
        <MaterialCommunityIcons name="crown" size={13} color={colors.gold} />
        <Text style={styles.pointsValue}>{formatNumber(totalPoints)}</Text>
      </View>
      <Pressable
        onPress={onSync}
        disabled={syncing}
        accessibilityRole="button"
        accessibilityLabel="Atualizar atividades"
        testID="map-sync"
        hitSlop={8}
        style={styles.bell}
      >
        {syncing ? (
          <ActivityIndicator size="small" color={colors.textSofter} />
        ) : (
          <Feather name="refresh-cw" size={18} color={colors.textSofter} />
        )}
      </Pressable>
      <Pressable
        onPress={onOpenNotifications}
        accessibilityRole="button"
        accessibilityLabel={`Avisos${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
        testID="map-notifications"
        hitSlop={8}
        style={styles.bell}
      >
        <Feather name="bell" size={19} color={colors.textSofter} />
        {unreadCount > 0 ? <View style={styles.badge} /> : null}
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 9,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 16,
    backgroundColor: colors.surfaceGlassSoft,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(252,76,2,0.15)',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  streakValue: { fontFamily: fonts.sairaExtraBold, fontSize: 13, color: '#FC7B47' },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,180,0,0.14)',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  pointsValue: { fontFamily: fonts.sairaExtraBold, fontSize: 13, color: colors.gold },
  bell: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: 'rgba(12,17,24,0.9)',
  },
});
