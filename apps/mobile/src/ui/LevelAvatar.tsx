import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, fonts, useTheme } from '../theme';
import { Hexagon } from './Hexagon';
import { initials } from './initials';

export type LevelAvatarProps = {
  size: number;
  photoUrl?: string | null;
  name?: string | null;
  level?: number | null;
  borderColor?: string;
  testID?: string;
};

/**
 * Runner avatar with a blue gradient ring and, when a level is provided, a hex
 * level badge overlapping the bottom edge. Uses the real photo when available,
 * falling back to initials (per the handoff fidelity note).
 */
export const LevelAvatar = ({ size, photoUrl, name, level, borderColor, testID }: LevelAvatarProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const ring = Math.max(3, size * 0.04);
  const inner = size - ring * 2;
  const badgeSize = size * 0.31;
  const badgeBorderColor = borderColor ?? colors.bgApp;

  return (
    <View testID={testID} style={{ width: size, height: size }}>
      <LinearGradient
        colors={[colors.primary, colors.primaryTint, colors.primary]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2, padding: ring }]}
      >
        {photoUrl ? (
          <Image
            testID={testID ? `${testID}-photo` : undefined}
            source={{ uri: photoUrl }}
            style={{ width: inner, height: inner, borderRadius: inner / 2 }}
            accessibilityLabel="Foto do corredor"
          />
        ) : (
          <View style={[styles.initials, { width: inner, height: inner, borderRadius: inner / 2 }]}>
            <Text style={[styles.initialsText, { fontSize: inner * 0.36 }]}>{initials(name)}</Text>
          </View>
        )}
      </LinearGradient>
      {level != null ? (
        <View style={[styles.badge, { left: size / 2 - badgeSize / 2, bottom: -badgeSize * 0.18 }]}>
          <Hexagon size={badgeSize} color={badgeBorderColor} innerColor={colors.primary} innerScale={0.82}>
            <Text style={[styles.badgeText, { fontSize: badgeSize * 0.42 }]}>{level}</Text>
          </Hexagon>
        </View>
      ) : null}
    </View>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    ring: { alignItems: 'center', justifyContent: 'center' },
    initials: { backgroundColor: c.avatarFrom, alignItems: 'center', justifyContent: 'center' },
    initialsText: { fontFamily: fonts.sairaExtraBold, color: c.textHi },
    badge: { position: 'absolute' },
    badgeText: { fontFamily: fonts.sairaExtraBold, color: c.white },
  });
