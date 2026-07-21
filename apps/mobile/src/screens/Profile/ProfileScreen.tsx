import { ReactNode, useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ApiClient } from '../../services/api/api-client.port';
import { RunnerProfileDetail } from '../../services/api/types';
import { useApiResource } from '../../services/useApiResource';
import { Palette, fonts, radii, useTheme } from '../../theme';
import { ErrorView, LevelAvatar, LoadingView, PulseDot, Screen, formatNumber } from '../../ui';
import { levelFromPoints } from './level';

export type ProfileScreenProps = {
  api: ApiClient;
  onOpenSettings?: () => void;
  onEditProfile?: () => void;
};

const MILESTONES = [7, 30, 90];

const RankCard = ({
  label,
  place,
  sub,
  color,
  testID,
}: {
  label: string;
  place: string;
  sub: string;
  color?: string;
  testID: string;
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.rankCard, color ? { borderColor: `${color}4D` } : null]}>
      <View style={styles.rankHead}>
        <PulseDot size={7} color={colors.green} />
        <Text style={styles.rankLabel}>{label}</Text>
      </View>
      <Text testID={testID} style={[styles.rankPlace, color ? { color } : null]}>
        {place}
      </Text>
      <Text style={styles.rankSub}>{sub}</Text>
    </View>
  );
};

const StatTile = ({ label, value, color, testID }: { label: string; value: ReactNode; color?: string; testID: string }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text testID={testID} style={[styles.statValue, color ? { color } : null]}>
        {value}
      </Text>
    </View>
  );
};

export const ProfileScreen = ({ api, onOpenSettings, onEditProfile }: ProfileScreenProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const loader = useCallback(() => api.getProfile(), [api]);
  const { data: profile, loading, error, reload } = useApiResource(loader);

  if (loading) {
    return (
      <Screen>
        <LoadingView testID="profile-loading" label="Carregando perfil…" />
      </Screen>
    );
  }
  if (error || !profile) {
    return (
      <Screen>
        <ErrorView testID="profile-error" onRetry={reload} />
      </Screen>
    );
  }

  const runner: RunnerProfileDetail = profile;
  const { level, xpInLevel, xpForLevel, progress } = levelFromPoints(runner.totalPoints);
  const nextMilestone = MILESTONES.find((m) => m > runner.streakDays) ?? null;
  const km = Math.round(runner.totalDistanceM / 1000);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Perfil</Text>
        <Pressable
          testID="profile-settings"
          onPress={onOpenSettings}
          accessibilityRole="button"
          accessibilityLabel="Configurações"
          style={styles.gear}
        >
          <Feather name="settings" size={18} color={colors.textSoft} />
        </Pressable>
      </View>

      <ScrollView
        accessibilityLabel="Perfil do corredor"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.identity}>
          <LevelAvatar testID="profile-avatar" size={96} photoUrl={runner.photoUrl} name={runner.name} level={level} />
          <Pressable
            testID="profile-edit"
            onPress={onEditProfile}
            accessibilityRole="button"
            accessibilityLabel="Editar perfil"
            hitSlop={8}
            style={styles.nameRow}
          >
            <Text testID="profile-name" style={styles.name}>
              {runner.name ?? 'Corredor'}
            </Text>
            <Feather name="edit-2" size={15} color={colors.textMid} />
          </Pressable>
          <View style={styles.cityRow}>
            <Feather name="map-pin" size={13} color={colors.textMid} />
            <Text testID="profile-city" style={styles.city}>
              {runner.city ?? 'Cidade não informada'}
            </Text>
          </View>
          <View style={styles.xpBlock}>
            <View style={styles.xpTop}>
              <Text style={styles.levelLabel}>Corredor Nível {level}</Text>
              <Text style={styles.xpText}>
                <Text style={styles.xpValue}>{formatNumber(xpInLevel)}</Text> / {formatNumber(xpForLevel)} XP
              </Text>
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.rankRow}>
          <RankCard
            label="RANKING CIDADE · AO VIVO"
            place={runner.cityRank != null ? `#${runner.cityRank}` : '—'}
            sub={runner.city ?? 'Sua cidade'}
            color={colors.primary}
            testID="profile-city-rank"
          />
          <RankCard
            label="RANKING NACIONAL"
            place={`#${runner.nationalRank}`}
            sub="Brasil"
            testID="profile-national-rank"
          />
        </View>

        <View style={styles.streakCard}>
          <MaterialCommunityIcons name="fire" size={30} color={colors.accent} />
          <View style={styles.flex}>
            <Text testID="profile-streak" style={styles.streakTitle}>
              {runner.streakDays} dias seguidos
            </Text>
            <Text style={styles.streakSub}>
              {nextMilestone
                ? `Próximo marco: ${nextMilestone} dias · bônus de sequência`
                : 'Sequência máxima — continue correndo!'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Estatísticas</Text>
        <View style={styles.statGrid}>
          <StatTile label="Pontos totais" value={formatNumber(runner.totalPoints)} color={colors.gold} testID="profile-points" />
          <StatTile label="Ruas dominadas" value={formatNumber(runner.streetsOwned)} color={colors.primary} testID="profile-streets-owned" />
          <StatTile label="Ruas exploradas" value={formatNumber(runner.streetsExplored)} testID="profile-streets-explored" />
          <StatTile label="Km totais" value={`${formatNumber(km)} km`} testID="profile-distance" />
        </View>
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 6 },
    headerSpacer: { width: 36 },
    headerTitle: { fontFamily: fonts.sairaExtraBold, fontSize: 18, color: c.textHi },
    gear: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceCard, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 18, paddingBottom: 24 },
    flex: { flex: 1 },
    identity: { alignItems: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
    name: { fontFamily: fonts.sairaExtraBold, fontSize: 24, color: c.textHi },
    cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    city: { fontFamily: fonts.manrope, fontSize: 13, color: c.textMid },
    xpBlock: { width: '100%', marginTop: 16 },
    xpTop: { flexDirection: 'row', justifyContent: 'space-between' },
    levelLabel: { fontFamily: fonts.manropeSemiBold, fontSize: 11.5, color: c.textSoft },
    xpText: { fontFamily: fonts.manrope, fontSize: 11.5, color: c.textMid },
    xpValue: { fontFamily: fonts.manropeBold, color: c.primary },
    xpTrack: { marginTop: 6, height: 8, borderRadius: 4, backgroundColor: c.divider, overflow: 'hidden' },
    xpFill: { height: '100%', borderRadius: 4, backgroundColor: c.primary },
    rankRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
    rankCard: { flex: 1, backgroundColor: c.surfaceCard, borderWidth: 1, borderColor: c.stroke, borderRadius: radii.boxLg, padding: 13 },
    rankHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    rankLabel: { fontFamily: fonts.manropeSemiBold, fontSize: 10, color: c.textMid },
    rankPlace: { fontFamily: fonts.sairaExtraBold, fontSize: 28, color: c.textHi, marginTop: 4 },
    rankSub: { fontFamily: fonts.manrope, fontSize: 11, color: c.textMid },
    streakCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      marginTop: 14,
      padding: 14,
      borderRadius: radii.boxLg,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.accentSurfaceSoft,
    },
    streakTitle: { fontFamily: fonts.sairaExtraBold, fontSize: 20, color: c.textHi },
    streakSub: { fontFamily: fonts.manrope, fontSize: 11.5, color: c.goldText, marginTop: 2 },
    sectionTitle: { fontFamily: fonts.sairaExtraBold, fontSize: 15, color: c.textHi, marginTop: 20, marginBottom: 10 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statTile: {
      width: '47.8%',
      flexGrow: 1,
      backgroundColor: c.surfaceCard,
      borderWidth: 1,
      borderColor: c.stroke,
      borderRadius: radii.box,
      padding: 12,
    },
    statLabel: { fontFamily: fonts.manrope, fontSize: 11, color: c.textMid },
    statValue: { fontFamily: fonts.sairaExtraBold, fontSize: 21, color: c.textHi, marginTop: 2 },
  });
