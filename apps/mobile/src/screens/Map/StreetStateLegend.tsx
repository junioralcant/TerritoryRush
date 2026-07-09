import { Text, View } from 'react-native';
import { OWNERSHIP_STATES, ownershipStyle } from './ownershipStyle';

/**
 * Accessible legend for the map's ownership colours — the textual labels ensure
 * street state is not conveyed by colour alone (RF-5.1 accessibility).
 */
export const StreetStateLegend = () => (
  <View accessibilityLabel="Legenda dos estados das ruas">
    {OWNERSHIP_STATES.map((state) => {
      const style = ownershipStyle(state);
      return (
        <View key={state} accessibilityLabel={style.accessibilityLabel} testID={`legend-${state}`}>
          <View style={{ width: 12, height: 12, backgroundColor: style.color }} />
          <Text>{style.accessibilityLabel}</Text>
        </View>
      );
    })}
  </View>
);
