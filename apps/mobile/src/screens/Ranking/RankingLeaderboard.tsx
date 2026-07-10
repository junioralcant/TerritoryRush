import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { formatNumber, initials } from '../../ui';

export type RankRow = {
  userId: string;
  name: string | null;
  rank: number;
  value: number;
};

export type RankingLeaderboardProps = {
  rows: RankRow[];
  prefix: string;
  unit: string;
  accent: string;
  currentUserId?: string | null;
};

const PODIUM_HEIGHT: Record<number, number> = { 1: 78, 2: 56, 3: 44 };
const PODIUM_COLOR: Record<number, string> = { 1: colors.gold, 2: colors.silver, 3: colors.bronze };
const PODIUM_ORDER = [2, 1, 3];

const PodiumPlace = ({ row, prefix }: { row: RankRow; prefix: string }) => {
  const color = PODIUM_COLOR[row.rank];
  const first = row.rank === 1;
  return (
    <View style={styles.podiumPlace} testID={`${prefix}-rank-${row.rank}`}>
      {first ? <MaterialCommunityIcons name="crown" size={20} color={colors.gold} /> : null}
      <View
        style={[
          styles.podiumAvatar,
          { width: first ? 60 : 52, height: first ? 60 : 52, borderRadius: first ? 30 : 26, borderColor: color },
        ]}
      >
        <Text style={styles.podiumInitials}>{initials(row.name)}</Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>
        {row.name ?? row.userId}
      </Text>
      <View style={[styles.pedestal, { height: PODIUM_HEIGHT[row.rank], borderColor: `${color}4D` }]}>
        <Text style={[styles.pedestalRank, { color }]}>{row.rank}</Text>
        <Text style={styles.pedestalValue}>{formatNumber(row.value)}</Text>
      </View>
    </View>
  );
};

const ListRow = ({
  row,
  prefix,
  unit,
  accent,
  mine,
}: {
  row: RankRow;
  prefix: string;
  unit: string;
  accent: string;
  mine: boolean;
}) => (
  <View
    testID={`${prefix}-rank-${row.rank}`}
    style={[styles.row, mine && { backgroundColor: `${accent}1F`, borderWidth: 1.5, borderColor: `${accent}80` }]}
  >
    <Text style={[styles.rowRank, mine && { color: accent }]}>{row.rank}</Text>
    <View style={styles.rowAvatar}>
      <Text style={styles.rowAvatarText}>{initials(row.name)}</Text>
    </View>
    <Text style={styles.rowName} numberOfLines={1}>
      {row.name ?? row.userId}
      {mine ? <Text style={[styles.youTag, { color: accent }]}> · você</Text> : null}
    </Text>
    <Text style={[styles.rowValue, mine && { color: accent }]}>
      {formatNumber(row.value)} <Text style={styles.rowUnit}>{unit}</Text>
    </Text>
  </View>
);

export const RankingLeaderboard = ({ rows, prefix, unit, accent, currentUserId }: RankingLeaderboardProps) => {
  const podium = PODIUM_ORDER.map((rank) => rows.find((row) => row.rank === rank)).filter((row): row is RankRow => Boolean(row));
  const list = rows.filter((row) => row.rank > 3);
  const mine = currentUserId ? rows.find((row) => row.userId === currentUserId) : undefined;
  const mineInList = mine ? list.some((row) => row.userId === mine.userId) : false;

  if (rows.length === 0) {
    return <Text style={styles.empty}>Ranking ainda sem participantes.</Text>;
  }

  return (
    <View>
      {podium.length > 0 ? (
        <View style={styles.podium}>
          {podium.map((row) => (
            <PodiumPlace key={row.userId} row={row} prefix={prefix} />
          ))}
        </View>
      ) : null}
      <View style={styles.list}>
        {list.map((row) => (
          <ListRow
            key={row.userId}
            row={row}
            prefix={prefix}
            unit={unit}
            accent={accent}
            mine={row.userId === currentUserId}
          />
        ))}
        {mine && mine.rank > 3 && !mineInList ? (
          <>
            <Text style={styles.separator}>···</Text>
            <ListRow row={mine} prefix={prefix} unit={unit} accent={accent} mine />
          </>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginVertical: 16 },
  podiumPlace: { flex: 1, alignItems: 'center', gap: 6 },
  podiumAvatar: { backgroundColor: colors.surfaceInner, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
  podiumInitials: { fontFamily: fonts.sairaExtraBold, fontSize: 16, color: colors.textHi },
  podiumName: { fontFamily: fonts.manropeBold, fontSize: 11, color: colors.textHi, textAlign: 'center' },
  pedestal: {
    width: '100%',
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedestalRank: { fontFamily: fonts.sairaExtraBold, fontSize: 22 },
  pedestalValue: { fontFamily: fonts.manrope, fontSize: 10.5, color: colors.textMid },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 13, backgroundColor: colors.surfaceCard },
  rowRank: { fontFamily: fonts.sairaExtraBold, fontSize: 15, color: colors.textMid, width: 26 },
  rowAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceInner, alignItems: 'center', justifyContent: 'center' },
  rowAvatarText: { fontFamily: fonts.sairaExtraBold, fontSize: 13, color: colors.textSoft },
  rowName: { flex: 1, fontFamily: fonts.manropeBold, fontSize: 14, color: colors.textHi },
  youTag: { fontFamily: fonts.manropeSemiBold, fontSize: 11 },
  rowValue: { fontFamily: fonts.sairaExtraBold, fontSize: 14, color: colors.textHi },
  rowUnit: { fontFamily: fonts.manrope, fontSize: 11, color: colors.textMid },
  separator: { textAlign: 'center', color: '#4C5563', fontSize: 16, letterSpacing: 3, paddingVertical: 2 },
  empty: { fontFamily: fonts.manrope, color: colors.textMid, textAlign: 'center', marginTop: 40 },
});
