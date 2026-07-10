import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BrandIcon, GoogleLogo, Screen, Wordmark } from '../ui';
import { colors, fonts } from '../theme';

export type AuthScreenProps = {
  onSignInWithGoogle: () => void;
  onSignInWithApple: () => void;
  authenticating: boolean;
};

export const AuthScreen = ({ onSignInWithGoogle, onSignInWithApple, authenticating }: AuthScreenProps) => (
  <Screen edges={['top', 'bottom']} accessibilityLabel="Entrar no Territory Rush">
    <LinearGradient
      colors={['#0E1524', colors.bgApp, '#05080E']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <BrandIcon size={92} />
        </View>
        <Wordmark testID="auth-title" size={38} />
        <Text style={styles.subtitle}>Corra, conquiste ruas e domine a sua cidade.</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          testID="sign-in-google"
          onPress={onSignInWithGoogle}
          disabled={authenticating}
          accessibilityRole="button"
          accessibilityLabel="Entrar com Google"
          style={({ pressed }) => [
            styles.button,
            styles.googleButton,
            { opacity: authenticating ? 0.55 : pressed ? 0.9 : 1 },
          ]}
        >
          <GoogleLogo size={20} />
          <Text style={[styles.buttonLabel, styles.googleLabel]}>Entrar com Google</Text>
        </Pressable>

        {authenticating ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator testID="auth-loading" size={22} color={colors.primary} />
            <Text style={styles.loadingLabel}>Entrando…</Text>
          </View>
        ) : (
          <Pressable
            testID="sign-in-apple"
            onPress={onSignInWithApple}
            accessibilityRole="button"
            accessibilityLabel="Entrar com Apple"
            style={({ pressed }) => [styles.button, styles.appleButton, { opacity: pressed ? 0.9 : 1 }]}
          >
            <MaterialCommunityIcons name="apple" size={20} color={colors.white} />
            <Text style={[styles.buttonLabel, styles.appleLabel]}>Entrar com Apple</Text>
          </Pressable>
        )}

        <Text style={styles.note}>Sem cadastro por e-mail. Apenas login social.</Text>
      </View>
    </View>
  </Screen>
);

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 52 },
  header: { alignItems: 'center', gap: 22 },
  icon: { borderRadius: 26, overflow: 'hidden' },
  subtitle: {
    fontFamily: fonts.manrope,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSoft,
    textAlign: 'center',
    maxWidth: 250,
  },
  actions: { gap: 12 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    paddingVertical: 15,
    borderRadius: 15,
  },
  googleButton: { backgroundColor: colors.white },
  appleButton: { backgroundColor: '#171B22', borderWidth: 1, borderColor: colors.strokeStrong },
  buttonLabel: { fontFamily: fonts.manropeBold, fontSize: 15 },
  googleLabel: { color: '#1A1A1A' },
  appleLabel: { color: colors.white },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, paddingVertical: 15 },
  loadingLabel: { fontFamily: fonts.manropeSemiBold, fontSize: 14, color: colors.textSoft },
  note: { textAlign: 'center', color: colors.textLo, fontSize: 11.5, marginTop: 8, fontFamily: fonts.manrope },
});
