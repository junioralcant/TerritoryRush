import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useTheme } from '../theme';

export type SpinnerProps = {
  size?: number;
  color?: string;
  trackColor?: string;
  testID?: string;
};

/**
 * Continuously rotating ring — the handoff's loader (a faint track with a single
 * bright arc on top). Defaults to the theme's brand blue.
 */
export const Spinner = ({ size = 28, color, trackColor, testID }: SpinnerProps) => {
  const { colors } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="progressbar"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: trackColor ?? colors.primaryBorderSoft,
        borderTopColor: color ?? colors.primary,
        transform: [{ rotate }],
      }}
    />
  );
};
