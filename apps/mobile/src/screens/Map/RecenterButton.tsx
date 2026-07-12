import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme';

export type RecenterButtonProps = {
  onPress?: () => void;
  bottom?: number;
};

/**
 * Floating glass FAB (bottom-right) that recentres the map camera on the
 * current territory.
 */
export const RecenterButton = ({ onPress, bottom = 24 }: RecenterButtonProps) => (
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

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(12,17,24,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
