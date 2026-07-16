import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette, fonts, useTheme } from '../../theme';
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

type PodiumStyle = {
  height: number;
  color: string;
  gradient: readonly [string, string];
  border: string;
  avatarBg: string;
  avatarBorder: number;
  rankSize: number;
  valueColor: string;
};

const makePodium = (c: Palette): Record<number, PodiumStyle> => ({
  1: {
    height: 78,
    color: c.gold,
    gradient: [c.podiumGoldFrom, c.podiumGoldTo],
    border: c.goldBorder,
    avatarBg: c.podiumGoldAvatarBg,
    avatarBorder: 3,
    rankSize: 24,
    valueColor: c.goldText,
  },
  2: {
    height: 56,
    color: c.silver,
    gradient: [c.podiumFrom, c.podiumTo],
    border: c.stroke,
    avatarBg: c.avatarMuted,
    avatarBorder: 2.5,
    rankSize: 20,
    valueColor: c.textMid,
  },
  3: {
    height: 44,
    color: c.bronze,
    gradient: [c.podiumFrom, c.podiumTo],
    border: c.stroke,
    avatarBg: c.avatarMuted,
    avatarBorder: 2.5,
    rankSize: 18,
    valueColor: c.textMid,
  },
});
const PODIUM_ORDER = [2, 1, 3];

const PodiumPlace = ({ row, prefix }: { row: RankRow; prefix: string }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const place = makePodium(colors)[row.rank];
  const first = row.rank === 1;
  return (
    <View style={styles.podiumPlace} testID={`${prefix}-rank-${row.rank}`}>
      {first ? <MaterialCommunityIcons name="crown" size={20} color={colors.gold} /> : null}
      <View
        style={[
          styles.podiumAvatar,
          {
            width: first ? 60 : 52,
            height: first ? 60 : 52,
            borderRadius: first ? 30 : 26,
            borderColor: place.color,
            borderWidth: place.avatarBorder,
            backgroundColor: place.avatarBg,
          },
        ]}
      >
        <Text style={styles.podiumInitials}>{initials(row.name)}</Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>
        {row.name ?? row.userId}
      </Text>
      <LinearGradient colors={place.gradient} style={[styles.pedestal, { height: place.height, borderColor: place.border }]}>
        <Text style={[styles.pedestalRank, { color: place.color, fontSize: place.rankSize }]}>{row.rank}</Text>
        <Text style={[styles.pedestalValue, { color: place.valueColor }]}>{formatNumber(row.value)}</Text>
      </LinearGradient>
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
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const content = (
    <>
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
    </>
  );

  if (mine) {
    return (
      <LinearGradient
        testID={`${prefix}-rank-${row.rank}`}
        colors={[`${accent}29`, `${accent}0F`] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.4 }}
        style={[styles.row, styles.rowMine, { borderColor: `${accent}80` }]}
      >
        {content}
      </LinearGradient>
    );
  }

  return (
    <View testID={`${prefix}-rank-${row.rank}`} style={styles.row}>
      {content}
    </View>
  );
};

export const RankingLeaderboard = ({ rows, prefix, unit, accent, currentUserId }: RankingLeaderboardProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginVertical: 16 },
    podiumPlace: { flex: 1, alignItems: 'center', gap: 6 },
    podiumAvatar: { alignItems: 'center', justifyContent: 'center' },
    podiumInitials: { fontFamily: fonts.sairaExtraBold, fontSize: 16, color: c.textHi },
    podiumName: { fontFamily: fonts.manropeBold, fontSize: 11, color: c.textHi, textAlign: 'center' },
    pedestal: {
      width: '100%',
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      borderWidth: 1,
      borderBottomWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pedestalRank: { fontFamily: fonts.sairaExtraBold },
    pedestalValue: { fontFamily: fonts.manrope, fontSize: 10.5 },
    list: { gap: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 13,
      backgroundColor: c.surfaceCard,
    },
    rowMine: { backgroundColor: 'transparent', borderWidth: 1.5 },
    rowRank: { fontFamily: fonts.sairaExtraBold, fontSize: 15, color: c.textMid, width: 26 },
    rowAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.avatarMuted, alignItems: 'center', justifyContent: 'center' },
    rowAvatarText: { fontFamily: fonts.sairaExtraBold, fontSize: 13, color: c.textSoft },
    rowName: { flex: 1, fontFamily: fonts.manropeBold, fontSize: 14, color: c.textHi },
    youTag: { fontFamily: fonts.manropeSemiBold, fontSize: 11 },
    rowValue: { fontFamily: fonts.sairaExtraBold, fontSize: 14, color: c.textHi },
    rowUnit: { fontFamily: fonts.manrope, fontSize: 11, color: c.textMid },
    separator: { textAlign: 'center', color: c.textLo, fontSize: 16, letterSpacing: 3, paddingVertical: 2 },
    empty: { fontFamily: fonts.manrope, color: c.textMid, textAlign: 'center', marginTop: 40 },
  });
