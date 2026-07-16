import { StyleSheet, Text, View } from 'react-native';
import { fonts, radii, useTheme } from '../theme';

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
export const Chip = ({ label, color, labelColor, dot = true, testID }: ChipProps) => {
  const { colors } = useTheme();
  const chipColor = color ?? colors.primary;
  return (
    <View
      testID={testID}
      style={[styles.chip, { backgroundColor: `${chipColor}24`, borderColor: `${chipColor}66` }]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: chipColor }]} /> : null}
      <Text style={[styles.label, { color: labelColor ?? chipColor }]}>{label}</Text>
    </View>
  );
};

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
