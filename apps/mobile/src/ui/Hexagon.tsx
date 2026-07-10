import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

export type HexagonProps = {
  size: number;
  color: string;
  innerColor?: string;
  innerScale?: number;
  glowColor?: string;
  children?: ReactNode;
  testID?: string;
};

const RATIO = 1.1;
const POINTS = [
  [50, 0],
  [100, 27.5],
  [100, 82.5],
  [50, 110],
  [0, 82.5],
  [0, 27.5],
];

const scalePoints = (scale: number): string => {
  const cx = 50;
  const cy = 55;
  return POINTS.map(([x, y]) => `${cx + (x - cx) * scale},${cy + (y - cy) * scale}`).join(' ');
};

const OUTER = scalePoints(1);

/**
 * Vertical (pointy-top) hexagon used for achievement badges, level chips and the
 * central tab-bar FAB. Pass `innerColor` for the ringed "badge" look, `glowColor`
 * to add the design's coloured drop-shadow.
 */
export const Hexagon = ({
  size,
  color,
  innerColor,
  innerScale = 0.9,
  glowColor,
  children,
  testID,
}: HexagonProps) => {
  const height = size * RATIO;
  const glow = glowColor
    ? { shadowColor: glowColor, shadowOpacity: 0.55, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 }
    : null;

  return (
    <View testID={testID} style={[{ width: size, height }, glow]}>
      <Svg width={size} height={height} viewBox="0 0 100 110">
        <Polygon points={OUTER} fill={color} />
        {innerColor ? <Polygon points={scalePoints(innerScale)} fill={innerColor} /> : null}
      </Svg>
      {children ? (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          {children}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
