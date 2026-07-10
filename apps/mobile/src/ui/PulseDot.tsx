import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { colors } from '../theme';

export type PulseDotProps = {
  size?: number;
  color?: string;
  testID?: string;
};

/**
 * The "AO VIVO" pulsing dot (opacity 0.35 ↔ 0.9, ~1.6s ease-in-out).
 */
export const PulseDot = ({ size = 7, color = colors.green, testID }: PulseDotProps) => {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      testID={testID}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: pulse }}
    />
  );
};
