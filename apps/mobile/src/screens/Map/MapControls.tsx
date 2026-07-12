import { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radii } from '../../theme';

export type MapControlsProps = {
  top?: number;
};

const ControlButton = ({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  onPress?: () => void;
  testID?: string;
}) => (
  <Pressable
    style={styles.button}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    testID={testID}
  >
    <Feather name={icon} size={20} color={colors.textHi} />
  </Pressable>
);

/**
 * Left-hand column of glass map controls: locate, layers, filter. Floats over
 * the map below the top bar; `top` is driven by the safe-area inset.
 */
export const MapControls = ({ top = 14 }: MapControlsProps) => (
  <View style={[styles.column, { top }]}>
    <ControlButton icon="crosshair" label="Localizar" testID="map-locate" />
    <ControlButton icon="layers" label="Camadas do mapa" />
    <ControlButton icon="filter" label="Filtrar ruas" />
  </View>
);

const styles = StyleSheet.create({
  column: { position: 'absolute', left: 14, gap: 10 },
  button: {
    width: 44,
    height: 44,
    borderRadius: radii.boxSm,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.strokeStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
