import { ReactNode } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Hexagon } from './Hexagon';

export type HexBadgeProps = {
  size: number;
  color: string;
  icon: ReactNode;
  locked?: boolean;
  testID?: string;
};

/**
 * Achievement badge: a ringed hexagon glowing in its category colour with the
 * category glyph inside. Locked badges render grey with a padlock at .55 opacity.
 */
export const HexBadge = ({ size, color, icon, locked = false, testID }: HexBadgeProps) => {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={{ opacity: locked ? 0.55 : 1 }}>
      <Hexagon
        size={size}
        color={locked ? colors.divider : color}
        innerColor={locked ? colors.surfaceMuted : colors.surfaceCard}
        innerScale={0.92}
        glowColor={locked ? undefined : color}
      >
        {locked ? <Feather name="lock" size={size * 0.35} color={colors.textLo} /> : icon}
      </Hexagon>
    </View>
  );
};
