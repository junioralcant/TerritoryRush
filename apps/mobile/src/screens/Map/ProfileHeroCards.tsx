import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RunnerProfileDetail } from '../../services/api/types';
import { colors, fonts } from '../../theme';
import { Card, LevelAvatar, formatNumber } from '../../ui';
import { levelFromPoints } from '../Profile/level';

export type ProfileHeroCardsProps = {
  profile: RunnerProfileDetail;
};

export const ProfileHeroCards = ({ profile }: ProfileHeroCardsProps) => {
  const { level, xpInLevel, xpForLevel, progress } = levelFromPoints(profile.totalPoints);
  const km = Math.round(profile.totalDistanceM / 1000);

  return (
    <View style={styles.row}>
      <Card style={styles.profileCard}>
        <View style={styles.profileTop}>
          <LevelAvatar
            size={62}
            photoUrl={profile.photoUrl}
            name={profile.name}
            level={level}
            borderColor={colors.surfaceCard}
          />
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name ?? 'Corredor'}
            </Text>
            <View style={styles.cityRow}>
              <Feather name="map-pin" size={12} color={colors.textMid} />
              <Text style={styles.city} numberOfLines={1}>
                {profile.city ?? 'Cidade não informada'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.xpBlock}>
          <Text style={styles.levelLabel}>Corredor Nível {level}</Text>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={styles.xpText}>
            <Text style={styles.xpValue}>{formatNumber(xpInLevel)}</Text> / {formatNumber(xpForLevel)} XP
          </Text>
        </View>
      </Card>

      <Card style={styles.statsCard}>
        <View>
          <Text style={styles.statLabel}>Ruas dominadas</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{formatNumber(profile.streetsOwned)}</Text>
        </View>
        <View>
          <Text style={styles.statLabel}>Ruas exploradas</Text>
          <Text style={[styles.statValue, { color: colors.green }]}>{formatNumber(profile.streetsExplored)}</Text>
        </View>
        <View>
          <Text style={styles.statLabel}>Km totais</Text>
          <Text style={[styles.statValue, styles.kmValue]}>{formatNumber(km)} km</Text>
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  flex: { flex: 1, minWidth: 0 },
  profileCard: { flex: 1.55 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: fonts.sairaExtraBold, fontSize: 18, color: colors.textHi },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  city: { fontFamily: fonts.manrope, fontSize: 12, color: colors.textMid },
  xpBlock: { marginTop: 12 },
  levelLabel: { fontFamily: fonts.manropeSemiBold, fontSize: 11, color: colors.textSoft },
  xpTrack: { marginTop: 6, height: 7, borderRadius: 4, backgroundColor: '#222A37', overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  xpText: { textAlign: 'right', fontSize: 11, marginTop: 4, color: colors.textMid, fontFamily: fonts.manrope },
  xpValue: { color: colors.primary, fontFamily: fonts.manropeBold },
  statsCard: { flex: 1, justifyContent: 'space-between', gap: 8 },
  statLabel: { fontFamily: fonts.manrope, fontSize: 10.5, color: colors.textMid },
  statValue: { fontFamily: fonts.sairaExtraBold, fontSize: 22, lineHeight: 24 },
  kmValue: { color: colors.textHi, fontSize: 20 },
});
