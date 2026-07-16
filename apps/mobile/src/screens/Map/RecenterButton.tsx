import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, useTheme } from '../../theme';

export type RecenterButtonProps = {
  onPress?: () => void;
  bottom?: number;
};

/**
 * Floating glass FAB (bottom-right) that recentres the map camera on the
 * current territory.
 */
export const RecenterButton = ({ onPress, bottom = 24 }: RecenterButtonProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Recentralizar mapa"
      testID="map-recenter"
      style={[styles.fab, { bottom }]}
    >
      <Feather name="crosshair" size={21} color={colors.primary} />
    </Pressable>
  );
};

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    fab: {
      position: 'absolute',
      right: 16,
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: c.surfaceGlass,
      borderWidth: 1,
      borderColor: c.strokeStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
