import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Palette, fonts, useTheme } from '../theme';

export type WordmarkProps = {
  size?: number;
  align?: 'left' | 'center';
  testID?: string;
};

/**
 * "TERRITORY / RUSH" wordmark — Saira italic 900. "RUSH" uses the brand accent
 * (yellow on dark, orange on light) from the active theme.
 */
export const Wordmark = ({ size = 38, align = 'center', testID }: WordmarkProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View testID={testID} style={{ alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <Text style={[styles.word, { fontSize: size, lineHeight: size * 1.08 }]}>TERRITORY</Text>
      <Text style={[styles.word, styles.rush, { fontSize: size, lineHeight: size * 1.08, marginTop: -size * 0.16 }]}>
        RUSH
      </Text>
    </View>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    word: {
      fontFamily: fonts.sairaBlackItalic,
      fontStyle: 'italic',
      color: c.textHi,
      letterSpacing: 0.5,
    },
    rush: { color: c.wordmarkRush },
  });
