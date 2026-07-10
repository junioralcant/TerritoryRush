import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { Wordmark, formatNumber } from '../../ui';

export type MapTopBarProps = {
  streakDays: number;
  totalPoints: number;
  unreadCount: number;
  onOpenNotifications?: () => void;
};

const Metric = ({ icon, value, label }: { icon: ReactNode; value: string; label: string }) => (
  <View style={styles.metric}>
    {icon}
    <View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  </View>
);

export const MapTopBar = ({ streakDays, totalPoints, unreadCount, onOpenNotifications }: MapTopBarProps) => (
  <View style={styles.bar}>
    <Wordmark size={18} align="left" />
    <View style={styles.metrics}>
      <Metric
        icon={<MaterialCommunityIcons name="fire" size={18} color={colors.accent} />}
        value={formatNumber(streakDays)}
        label="dias seguidos"
      />
      <Metric
        icon={<MaterialCommunityIcons name="crown" size={18} color={colors.gold} />}
        value={formatNumber(totalPoints)}
        label="pontos"
      />
    </View>
    <Pressable
      onPress={onOpenNotifications}
      accessibilityRole="button"
      accessibilityLabel={`Avisos${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
      testID="map-notifications"
      hitSlop={8}
    >
      <Feather name="bell" size={23} color={colors.textSofter} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  metrics: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricValue: { fontFamily: fonts.sairaExtraBold, fontSize: 16, color: colors.textHi, lineHeight: 17 },
  metricLabel: { fontFamily: fonts.manrope, fontSize: 9.5, color: colors.textMid },
  badge: {
    position: 'absolute',
    top: -5,
    right: -6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgApp,
  },
  badgeText: { color: colors.white, fontSize: 9, fontFamily: fonts.manropeExtraBold },
});
