import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';

export type ChipProps = {
  label: string;
  color?: string;
  labelColor?: string;
  dot?: boolean;
  testID?: string;
};

/**
 * Pill with a coloured status dot + label (e.g. "Você é o proprietário").
 */
export const Chip = ({ label, color = colors.primary, labelColor, dot = true, testID }: ChipProps) => (
  <View
    testID={testID}
    style={[styles.chip, { backgroundColor: `${color}24`, borderColor: `${color}66` }]}
  >
    {dot ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
    <Text style={[styles.label, { color: labelColor ?? color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.boxSm,
    borderWidth: 1,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  label: { fontFamily: fonts.manropeBold, fontSize: 13 },
});
