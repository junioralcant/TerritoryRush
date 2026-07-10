import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

export type WordmarkProps = {
  size?: number;
  align?: 'left' | 'center';
  testID?: string;
};

/**
 * "TERRITORY / RUSH" wordmark — Saira italic 900, "RUSH" in brand yellow.
 */
export const Wordmark = ({ size = 38, align = 'center', testID }: WordmarkProps) => (
  <View testID={testID} style={{ alignItems: align === 'center' ? 'center' : 'flex-start' }}>
    <Text style={[styles.word, { fontSize: size, lineHeight: size * 0.9 }]}>TERRITORY</Text>
    <Text style={[styles.word, styles.rush, { fontSize: size, lineHeight: size * 0.9 }]}>RUSH</Text>
  </View>
);

const styles = StyleSheet.create({
  word: {
    fontFamily: fonts.sairaBlackItalic,
    fontStyle: 'italic',
    color: colors.textHi,
    letterSpacing: 0.5,
  },
  rush: { color: colors.yellow },
});
