import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSize } from '../theme';
import { PrimaryButton } from './PrimaryButton';

type CenteredProps = { children: ReactNode; testID?: string; accessibilityLabel?: string };

const Centered = ({ children, testID, accessibilityLabel }: CenteredProps) => (
  <View style={styles.center} testID={testID} accessibilityLabel={accessibilityLabel}>
    {children}
  </View>
);

export type LoadingViewProps = { label?: string; testID?: string };

export const LoadingView = ({ label = 'Carregando território…', testID }: LoadingViewProps) => (
  <Centered testID={testID}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={styles.loadingLabel}>{label}</Text>
  </Centered>
);

export type ErrorViewProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  testID?: string;
};

export const ErrorView = ({
  title = 'Algo deu errado',
  message = 'Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.',
  onRetry,
  testID,
}: ErrorViewProps) => (
  <Centered testID={testID} accessibilityLabel={title}>
    <View style={[styles.iconCircle, styles.errorCircle]}>
      <Feather name="alert-triangle" size={42} color={colors.danger} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {onRetry ? (
      <PrimaryButton
        testID="error-retry"
        label="Tentar de novo"
        onPress={onRetry}
        icon={<Feather name="refresh-cw" size={18} color={colors.white} />}
        style={styles.cta}
      />
    ) : null}
  </Centered>
);

export type EmptyViewProps = {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
  testID?: string;
};

export const EmptyView = ({ icon, title, message, action, testID }: EmptyViewProps) => (
  <Centered testID={testID} accessibilityLabel={title}>
    <View style={[styles.iconCircle, styles.emptyCircle]}>{icon}</View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {action ? <View style={styles.cta}>{action}</View> : null}
  </Centered>
);

export type LocationPermissionViewProps = {
  onAllow?: () => void;
  onDismiss?: () => void;
  testID?: string;
};

export const LocationPermissionView = ({ onAllow, onDismiss, testID }: LocationPermissionViewProps) => (
  <Centered testID={testID} accessibilityLabel="Ative sua localização">
    <View style={[styles.iconSquare]}>
      <Feather name="map-pin" size={46} color={colors.primary} />
    </View>
    <Text style={styles.title}>Ative sua localização</Text>
    <Text style={styles.message}>
      Precisamos do GPS para mostrar as ruas ao seu redor e registrar as que você conquista enquanto corre.
    </Text>
    <View style={styles.permissionActions}>
      <PrimaryButton testID="permission-allow" label="Permitir localização" onPress={onAllow} />
      {onDismiss ? (
        <Text testID="permission-dismiss" onPress={onDismiss} style={styles.dismiss}>
          Agora não
        </Text>
      ) : null}
    </View>
  </Centered>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 10,
    backgroundColor: colors.bgApp,
  },
  loadingLabel: { fontFamily: fonts.manropeSemiBold, color: colors.textSoft, fontSize: fontSize.body, marginTop: 16 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 6,
  },
  errorCircle: { backgroundColor: 'rgba(226,59,59,0.12)', borderColor: 'rgba(226,59,59,0.35)' },
  emptyCircle: { backgroundColor: colors.surfaceMuted, borderColor: colors.stroke },
  iconSquare: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46,139,255,0.35)',
    backgroundColor: '#132038',
    marginBottom: 8,
  },
  title: { fontFamily: fonts.sairaExtraBold, fontSize: fontSize.headingLg, color: colors.textHi, textAlign: 'center' },
  message: {
    fontFamily: fonts.manrope,
    fontSize: fontSize.body,
    lineHeight: 20,
    color: colors.textMid,
    textAlign: 'center',
    maxWidth: 280,
  },
  cta: { marginTop: 16 },
  permissionActions: { width: '100%', marginTop: 22, gap: 11 },
  dismiss: {
    fontFamily: fonts.manropeSemiBold,
    color: colors.textMid,
    fontSize: fontSize.bodyLg,
    textAlign: 'center',
    padding: 8,
  },
});
