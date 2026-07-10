import { StyleSheet, Text, View } from 'react-native';
import { StreetOwnership } from '../../services/api/types';
import { colors, fonts, radii } from '../../theme';
import { OWNERSHIP_LEGEND_LABEL, ownershipStyle } from './ownershipStyle';

const ORDER: StreetOwnership[] = ['mine', 'other', 'unclaimed'];

/**
 * Glass legend overlay for the map's ownership colours. Each row pairs the fixed
 * ownership colour with a text label (state is never conveyed by colour alone —
 * the full descriptive label is exposed to assistive tech).
 */
export const StreetStateLegend = () => (
  <View style={styles.card} accessibilityLabel="Legenda dos estados das ruas">
    {ORDER.map((state) => (
      <View
        key={state}
        testID={`legend-${state}`}
        accessibilityLabel={ownershipStyle(state).accessibilityLabel}
        style={styles.row}
      >
        <View style={[styles.dot, { backgroundColor: ownershipStyle(state).color }]} />
        <Text style={styles.label}>{OWNERSHIP_LEGEND_LABEL[state]}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.strokeStrong,
    borderRadius: radii.box,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 7,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  label: { fontFamily: fonts.manropeMedium, fontSize: 11.5, color: colors.textHi },
});
