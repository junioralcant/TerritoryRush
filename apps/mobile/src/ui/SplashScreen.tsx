import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { Palette, fonts, fontSize, useTheme } from '../theme';
import { BrandIcon } from './BrandIcon';
import { Wordmark } from './Wordmark';
import { MapBackdrop } from './MapBackdrop';
import { Spinner } from './Spinner';

export type SplashScreenProps = { testID?: string };

/**
 * Branded loading screen (handoff I2 dark / I3 light): a faint território map
 * under a radial vignette, the app icon on a glowing tile, the wordmark, tagline
 * and a spinner. Theme-aware; shown while fonts and the session resolve.
 */
export const SplashScreen = ({ testID = 'splash-screen' }: SplashScreenProps) => {
  const { colors, isDark, statusBarStyle } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.root} testID={testID}>
      <StatusBar style={statusBarStyle} />

      <View style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.32 : 0.5 }]} pointerEvents="none">
        <MapBackdrop />
      </View>

      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="splashVignette" cx="50%" cy="40%" rx="115%" ry="75%">
            <Stop offset="0" stopColor={colors.bgApp} stopOpacity={isDark ? 0.5 : 0.35} />
            <Stop offset="1" stopColor={colors.bgApp} stopOpacity={isDark ? 0.97 : 0.96} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#splashVignette)" />
      </Svg>

      <View style={styles.center}>
        <View style={styles.tileGlow}>
          <View style={styles.tileClip}>
            <BrandIcon size={118} radius={30} />
          </View>
        </View>
        <Wordmark size={36} align="center" />
        <Text style={styles.tagline}>Domine as ruas da sua cidade</Text>
      </View>

      <View style={styles.footer}>
        <Spinner size={28} testID="splash-spinner" />
        <Text style={styles.loading}>Carregando território…</Text>
      </View>
    </View>
  );
};

const TILE = 118;

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bgApp },
    center: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 26,
      paddingHorizontal: 40,
    },
    tileGlow: {
      width: TILE,
      height: TILE,
      borderRadius: 30,
      backgroundColor: '#0A0F1A',
      shadowColor: c.primary,
      shadowOpacity: 0.35,
      shadowRadius: 25,
      shadowOffset: { width: 0, height: 18 },
      elevation: 16,
    },
    tileClip: { width: TILE, height: TILE, borderRadius: 30, overflow: 'hidden' },
    tagline: {
      fontFamily: fonts.manropeMedium,
      fontSize: fontSize.body,
      color: c.textMid,
      textAlign: 'center',
      marginTop: -12,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 52,
      alignItems: 'center',
      gap: 16,
    },
    loading: {
      fontFamily: fonts.manropeMedium,
      fontSize: fontSize.label,
      color: c.textLo,
      letterSpacing: 0.3,
    },
  });
