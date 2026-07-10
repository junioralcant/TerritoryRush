import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '../theme';

export type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Pulsing placeholder block (opacity .35 ↔ .9, ~1.4s) used for loading skeletons.
 */
export const Skeleton = ({ width = '100%', height = 16, radius = radii.boxSm, style, testID }: SkeletonProps) => {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      testID={testID}
      style={[styles.block, { width, height, borderRadius: radius, opacity: pulse }, style]}
    />
  );
};

const styles = StyleSheet.create({
  block: { backgroundColor: colors.surfaceCard },
});
