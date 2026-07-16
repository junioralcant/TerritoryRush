import { ComponentProps, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, radii, useTheme } from '../../theme';

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
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
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
};

/**
 * Left-hand column of glass map controls: locate, layers, filter. Floats over
 * the map below the top bar; `top` is driven by the safe-area inset.
 */
export const MapControls = ({ top = 14 }: MapControlsProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.column, { top }]}>
      <ControlButton icon="crosshair" label="Localizar" testID="map-locate" />
      <ControlButton icon="layers" label="Camadas do mapa" />
      <ControlButton icon="filter" label="Filtrar ruas" />
    </View>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    column: { position: 'absolute', left: 14, gap: 10 },
    button: {
      width: 44,
      height: 44,
      borderRadius: radii.boxSm,
      backgroundColor: c.surfaceGlass,
      borderWidth: 1,
      borderColor: c.strokeStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
