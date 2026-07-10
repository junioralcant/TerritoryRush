import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ApiClient } from '../../services/api/api-client.port';
import { colors, fonts, radii } from '../../theme';
import { LoadingView, Screen, ScreenHeader } from '../../ui';
import { StravaLogo } from './StravaLogo';
import { useConnections } from './useConnections';

export type ConnectionsScreenProps = {
  api: ApiClient;
  startStravaAuth: () => Promise<string | null>;
  onBack?: () => void;
};

export const ConnectionsScreen = ({ api, startStravaAuth, onBack }: ConnectionsScreenProps) => {
  const { connection, loading, error, connect, disconnect } = useConnections(api, { startStravaAuth });

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Conexões" onBack={onBack} />
        <LoadingView testID="connections-loading" label="Carregando conexões…" />
      </Screen>
    );
  }

  const connected = connection?.connected ?? false;

  return (
    <Screen>
      <ScreenHeader title="Conexões" onBack={onBack} />
      <ScrollView
        accessibilityLabel="Conexões de contas"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.intro}>
          Suas corridas vêm dessas plataformas e alimentam o jogo. Conecte uma conta para importar atividades
          automaticamente.
        </Text>

        <View style={[styles.card, styles.stravaCard]}>
          <View style={styles.cardHead}>
            <View style={styles.stravaTile}>
              <StravaLogo size={26} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.provider}>Strava</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: connected ? colors.green : colors.textLo }]} />
                <Text
                  testID="strava-status"
                  style={[styles.statusText, { color: connected ? colors.green : colors.textMid }]}
                >
                  {connected ? 'Conectado' : 'Não conectado'}
                </Text>
              </View>
            </View>
          </View>

          {connected ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Atleta</Text>
                <Text style={styles.detailValue}>#{connection?.athleteId ?? '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sincronização</Text>
                <Text style={styles.detailValue}>Automática</Text>
              </View>
              <Pressable
                testID="disconnect-strava"
                onPress={() => void disconnect()}
                accessibilityRole="button"
                accessibilityLabel="Desconectar Strava"
                style={styles.disconnect}
              >
                <Text style={styles.disconnectLabel}>Desconectar Strava</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                testID="connect-strava"
                onPress={() => void connect()}
                accessibilityRole="button"
                accessibilityLabel="Conectar Strava"
                style={styles.connect}
              >
                <Feather name="link" size={18} color={colors.white} />
                <Text style={styles.connectLabel}>Conectar Strava</Text>
              </Pressable>
              <Text style={styles.oauthNote}>Abre o navegador para autorizar (OAuth)</Text>
            </>
          )}
        </View>

        <View style={[styles.card, styles.garminCard]}>
          <View style={styles.cardHead}>
            <View style={styles.garminTile}>
              <MaterialCommunityIcons name="watch" size={24} color={colors.primaryTint} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.provider}>Garmin</Text>
              <Text style={styles.garminSub}>Sincronização de dispositivos</Text>
            </View>
            <View style={styles.soonChip}>
              <Text style={styles.soonText}>Em breve</Text>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.privacy}>
          Só usamos suas atividades para calcular pontos e posse de ruas. Você pode desconectar quando quiser.
        </Text>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 18, paddingBottom: 24 },
  flex: { flex: 1 },
  intro: { fontFamily: fonts.manrope, fontSize: 13, lineHeight: 20, color: colors.textMid, marginBottom: 18 },
  card: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.stroke, borderRadius: radii.card, padding: 16 },
  stravaCard: { borderColor: 'rgba(252,76,2,0.35)' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  stravaTile: { width: 48, height: 48, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  provider: { fontFamily: fonts.sairaExtraBold, fontSize: 17, color: colors.textHi },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: fonts.manropeSemiBold, fontSize: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.stroke },
  detailLabel: { fontFamily: fonts.manrope, fontSize: 12, color: colors.textMid },
  detailValue: { fontFamily: fonts.manropeSemiBold, fontSize: 12, color: colors.textHi },
  disconnect: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radii.boxSm,
    borderWidth: 1,
    borderColor: 'rgba(226,59,59,0.35)',
  },
  disconnectLabel: { fontFamily: fonts.manropeBold, fontSize: 13.5, color: colors.dangerSoft },
  connect: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.boxSm,
    backgroundColor: colors.accent,
  },
  connectLabel: { fontFamily: fonts.manropeBold, fontSize: 14.5, color: colors.white },
  oauthNote: { textAlign: 'center', fontFamily: fonts.manrope, fontSize: 10.5, color: colors.textLo, marginTop: 8 },
  garminCard: { marginTop: 14, opacity: 0.7 },
  garminTile: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#1A2230',
    borderWidth: 1,
    borderColor: colors.strokeStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  garminSub: { fontFamily: fonts.manrope, fontSize: 12, color: colors.textMid, marginTop: 3 },
  soonChip: { backgroundColor: colors.surfaceInner, borderRadius: radii.pill, paddingVertical: 5, paddingHorizontal: 10 },
  soonText: { fontFamily: fonts.manropeBold, fontSize: 11, color: colors.textMid },
  error: { fontFamily: fonts.manrope, fontSize: 12, color: colors.dangerSoft, marginTop: 14 },
  privacy: { fontFamily: fonts.manrope, fontSize: 11, lineHeight: 16, color: colors.textLo, marginTop: 18 },
});
