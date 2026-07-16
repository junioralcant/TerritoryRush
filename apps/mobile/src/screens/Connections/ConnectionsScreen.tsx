import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ApiClient } from '../../services/api/api-client.port';
import { Palette, fonts, radii, useTheme } from '../../theme';
import { LoadingView, Screen, ScreenHeader, ThemeToggle } from '../../ui';
import { StravaLogo } from './StravaLogo';
import { useConnections } from './useConnections';

export type ConnectionsScreenProps = {
  api: ApiClient;
  startStravaAuth: () => Promise<string | null>;
  onBack?: () => void;
};

export const ConnectionsScreen = ({ api, startStravaAuth, onBack }: ConnectionsScreenProps) => {
  const { connection, loading, error, connect, disconnect } = useConnections(api, { startStravaAuth });
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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

        <View style={styles.appearance}>
          <ThemeToggle testID="theme-toggle" />
        </View>

        <Text style={styles.privacy}>
          Só usamos suas atividades para calcular pontos e posse de ruas. Você pode desconectar quando quiser.
        </Text>
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: 18, paddingBottom: 24 },
    flex: { flex: 1 },
    intro: { fontFamily: fonts.manrope, fontSize: 13, lineHeight: 20, color: c.textMid, marginBottom: 18 },
    card: { backgroundColor: c.surfaceCard, borderWidth: 1, borderColor: c.stroke, borderRadius: radii.card, padding: 16 },
    stravaCard: { borderColor: c.accentBorder },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    stravaTile: { width: 48, height: 48, borderRadius: 13, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    provider: { fontFamily: fonts.sairaExtraBold, fontSize: 17, color: c.textHi },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontFamily: fonts.manropeSemiBold, fontSize: 12 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.stroke },
    detailLabel: { fontFamily: fonts.manrope, fontSize: 12, color: c.textMid },
    detailValue: { fontFamily: fonts.manropeSemiBold, fontSize: 12, color: c.textHi },
    disconnect: {
      marginTop: 14,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: radii.boxSm,
      borderWidth: 1,
      borderColor: c.dangerBorder,
    },
    disconnectLabel: { fontFamily: fonts.manropeBold, fontSize: 13.5, color: c.dangerSoft },
    connect: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: radii.boxSm,
      backgroundColor: c.accent,
    },
    connectLabel: { fontFamily: fonts.manropeBold, fontSize: 14.5, color: c.white },
    oauthNote: { textAlign: 'center', fontFamily: fonts.manrope, fontSize: 10.5, color: c.textLo, marginTop: 8 },
    garminCard: { marginTop: 14, opacity: 0.7 },
    garminTile: {
      width: 48,
      height: 48,
      borderRadius: 13,
      backgroundColor: c.surfaceInner,
      borderWidth: 1,
      borderColor: c.strokeStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    garminSub: { fontFamily: fonts.manrope, fontSize: 12, color: c.textMid, marginTop: 3 },
    soonChip: { backgroundColor: c.surfaceInner, borderRadius: radii.pill, paddingVertical: 5, paddingHorizontal: 10 },
    soonText: { fontFamily: fonts.manropeBold, fontSize: 11, color: c.textMid },
    error: { fontFamily: fonts.manrope, fontSize: 12, color: c.dangerSoft, marginTop: 14 },
    appearance: { marginTop: 18 },
    privacy: { fontFamily: fonts.manrope, fontSize: 11, lineHeight: 16, color: c.textLo, marginTop: 18 },
  });
