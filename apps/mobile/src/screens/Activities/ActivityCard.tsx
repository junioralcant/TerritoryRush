import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Activity, ActivityStatus } from '../../services/api/types';
import { colors, fonts, radii } from '../../theme';
import { Chip } from '../../ui';
import {
  formatActivityDate,
  formatActivityDistance,
  formatActivityDuration,
  formatActivityPace,
} from './formatActivity';

export type ActivityCardProps = {
  activity: Activity;
};

type StatusStyle = { label: string; color: string; labelColor: string };

const STATUS: Record<ActivityStatus, StatusStyle> = {
  imported: { label: 'Importada', color: colors.textLo, labelColor: colors.textSoft },
  processing: { label: 'Processando', color: colors.gold, labelColor: colors.gold },
  processed: { label: 'Processada', color: colors.green, labelColor: colors.greenBright },
  rejected: { label: 'Rejeitada', color: colors.danger, labelColor: colors.dangerSoft },
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const ActivityCard = ({ activity }: ActivityCardProps) => {
  const status = STATUS[activity.status];
  return (
    <View style={styles.card} testID={`activity-${activity.id}`}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="run" size={20} color={colors.accent} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.title}>Corrida</Text>
          <Text style={styles.date}>{formatActivityDate(activity.startedAt)}</Text>
        </View>
        <Chip
          testID={`activity-status-${activity.id}`}
          label={status.label}
          color={status.color}
          labelColor={status.labelColor}
        />
      </View>

      <View style={styles.stats}>
        <Stat label="Distância" value={formatActivityDistance(activity.distanceM)} />
        <Stat label="Tempo" value={formatActivityDuration(activity.movingTimeS)} />
        <Stat label="Ritmo" value={formatActivityPace(activity.avgPaceSKm)} />
      </View>

      {activity.status === 'rejected' && activity.rejectionReason ? (
        <Text style={styles.reason}>{activity.rejectionReason}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.card,
    padding: 14,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(252,76,2,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: { flex: 1 },
  title: { fontFamily: fonts.sairaExtraBold, fontSize: 16, color: colors.textHi },
  date: { fontFamily: fonts.manrope, fontSize: 12, color: colors.textMid, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceInnerDeep,
    borderRadius: radii.boxSm,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statValue: { fontFamily: fonts.sairaExtraBold, fontSize: 17, color: colors.textHi },
  statLabel: { fontFamily: fonts.manrope, fontSize: 10.5, color: colors.textMid, marginTop: 3 },
  reason: {
    fontFamily: fonts.manrope,
    fontSize: 12,
    color: colors.dangerSoft,
    backgroundColor: 'rgba(226,59,59,0.1)',
    borderRadius: radii.boxSm,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
