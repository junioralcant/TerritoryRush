import { ReactNode, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { StreetDetail } from '../../services/api/types';
import { Palette, fonts, radii, useTheme } from '../../theme';
import { Chip, formatNumber, initials } from '../../ui';

export type StreetDetailDrawerProps = {
  detail: StreetDetail;
  isMine?: boolean;
  currentUserId?: string | null;
  onClose?: () => void;
};

const formatDate = (iso: string): string => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('pt-BR');
};

const ownerPoints = (detail: StreetDetail): number | null => {
  if (!detail.owner) return null;
  const match = detail.ranking.find((entry) => entry.userId === detail.owner?.userId);
  return match?.points ?? detail.ranking[0]?.points ?? null;
};

const Stat = ({ label, children, testID }: { label: string; children: ReactNode; testID?: string }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <View testID={testID} style={styles.statValueRow}>
        {children}
      </View>
    </View>
  );
};

export const StreetDetailDrawer = ({ detail, isMine = false, currentUserId, onClose }: StreetDetailDrawerProps) => {
  const { colors, ownership } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const points = ownerPoints(detail);
  const meId = currentUserId ?? (isMine ? detail.owner?.userId : undefined);

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Fechar detalhes da rua" />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <ScrollView
          testID="street-detail-drawer"
          accessibilityLabel={`Detalhes da rua ${detail.name}`}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.flex}>
              <Text testID="drawer-name" style={styles.name}>
                {detail.name}
              </Text>
            </View>
            {onClose ? (
              <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar">
                <Feather name="x" size={16} color={colors.textMid} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.chipRow}>
            {detail.owner ? (
              <Chip
                testID="drawer-owner"
                label={
                  isMine || detail.owner.userId === meId
                    ? 'Você é o proprietário'
                    : `Dominada por ${detail.owner.name ?? detail.owner.userId}`
                }
                color={isMine || detail.owner.userId === meId ? colors.primary : colors.danger}
                labelColor={isMine || detail.owner.userId === meId ? colors.primaryText : colors.dangerSoft}
              />
            ) : (
              <Chip testID="drawer-owner" label="Sem dono — rua livre" color={ownership.unclaimed} labelColor={colors.textSoft} dot />
            )}
          </View>

          <View style={styles.statsRow}>
            <Stat label="Pontuação">
              <MaterialCommunityIcons name="crown" size={15} color={colors.gold} />
              <Text style={[styles.statValue, { color: colors.goldText }]}>{points != null ? formatNumber(points) : '—'}</Text>
            </Stat>
            <Stat label="Posse" testID="drawer-tenure">
              <Text style={styles.statValue}>{detail.tenureDays != null ? `${detail.tenureDays} dias` : 'Sem posse'}</Text>
            </Stat>
            <Stat label="Disputas" testID="drawer-disputes">
              <Text style={styles.statValue}>{detail.disputesCount}</Text>
            </Stat>
          </View>

          <Text style={styles.sectionTitle}>Ranking da rua</Text>
          <View style={styles.rankList}>
            {detail.ranking.map((entry) => {
              const isYou = entry.userId === meId;
              return (
                <View
                  key={entry.userId}
                  testID={`rank-${entry.rank}`}
                  style={[styles.rankRow, isYou && styles.rankRowMine]}
                >
                  <Text style={[styles.rankNum, isYou && styles.rankNumMine]}>{entry.rank}</Text>
                  <View style={styles.rankAvatar}>
                    <Text style={styles.rankAvatarText}>{initials(entry.name)}</Text>
                  </View>
                  <Text style={styles.rankName} numberOfLines={1}>
                    {entry.name ?? entry.userId}
                    {isYou ? <Text style={styles.youTag}> · você</Text> : null}
                  </Text>
                  <Text style={[styles.rankPoints, isYou && styles.rankPointsMine]}>{formatNumber(entry.points)}</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Histórico de domínio</Text>
          <View>
            {detail.ownershipHistory.map((entry, index) => {
              const last = index === detail.ownershipHistory.length - 1;
              return (
                <View key={`${entry.userId}-${entry.acquiredAt}`} testID={`history-${index}`} style={styles.timelineRow}>
                  <View style={styles.timelineMarker}>
                    <View style={[styles.timelineDot, { backgroundColor: entry.lostAt ? colors.textLo : colors.primary }]} />
                    {last ? null : <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineBody}>
                    <Text style={styles.timelineName}>
                      {entry.name ?? entry.userId}
                      {entry.lostAt ? null : <Text style={styles.currentTag}> · atual</Text>}
                    </Text>
                    <Text style={styles.timelineDate}>
                      {entry.lostAt
                        ? `${formatDate(entry.acquiredAt)} → ${formatDate(entry.lostAt)}`
                        : `desde ${formatDate(entry.acquiredAt)}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: c.scrimBackdrop },
    sheet: {
      backgroundColor: c.surfaceSheet,
      borderTopLeftRadius: radii.sheet,
      borderTopRightRadius: radii.sheet,
      borderTopWidth: 1,
      borderColor: c.primaryBorder,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 20,
      maxHeight: '80%',
    },
    grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: c.sheetHandle, alignSelf: 'center', marginBottom: 14 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    flex: { flex: 1 },
    name: { fontFamily: fonts.sairaExtraBold, fontSize: 24, color: c.textHi },
    close: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.surfaceInner, alignItems: 'center', justifyContent: 'center' },
    chipRow: { marginTop: 12 },
    statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    stat: {
      flex: 1,
      backgroundColor: c.surfaceCard,
      borderWidth: 1,
      borderColor: c.stroke,
      borderRadius: radii.box,
      padding: 12,
    },
    statLabel: { fontFamily: fonts.manrope, fontSize: 10.5, color: c.textMid },
    statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    statValue: { fontFamily: fonts.sairaExtraBold, fontSize: 17, color: c.textHi },
    sectionTitle: { fontFamily: fonts.sairaExtraBold, fontSize: 15, color: c.textHi, marginTop: 20, marginBottom: 10 },
    rankList: { gap: 8 },
    rankRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 13 },
    rankRowMine: { backgroundColor: c.primarySurface, borderWidth: 1, borderColor: c.primaryBorder },
    rankNum: { fontFamily: fonts.sairaExtraBold, fontSize: 14, color: c.textMid, width: 16 },
    rankNumMine: { color: c.primary },
    rankAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.avatarMuted, alignItems: 'center', justifyContent: 'center' },
    rankAvatarText: { fontFamily: fonts.sairaExtraBold, fontSize: 12, color: c.textSoft },
    rankName: { flex: 1, fontFamily: fonts.manropeBold, fontSize: 13.5, color: c.textHi },
    youTag: { fontFamily: fonts.manropeSemiBold, fontSize: 11, color: c.primary },
    rankPoints: { fontFamily: fonts.sairaExtraBold, fontSize: 14, color: c.textSoft },
    rankPointsMine: { color: c.primary },
    timelineRow: { flexDirection: 'row', gap: 12 },
    timelineMarker: { alignItems: 'center', width: 11 },
    timelineDot: { width: 11, height: 11, borderRadius: 6, marginTop: 3 },
    timelineLine: { flex: 1, width: 2, backgroundColor: c.divider, marginTop: 2 },
    timelineBody: { flex: 1, paddingBottom: 16 },
    timelineName: { fontFamily: fonts.manropeBold, fontSize: 13, color: c.textHi },
    currentTag: { fontFamily: fonts.manropeSemiBold, fontSize: 11, color: c.green },
    timelineDate: { fontFamily: fonts.manrope, fontSize: 11.5, color: c.textMid, marginTop: 2 },
  });
