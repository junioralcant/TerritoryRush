import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

export type BrandIconProps = {
  size: number;
  radius?: number;
  testID?: string;
};

/**
 * Territory Rush app mark: territory hexagon + navigation arrow over street
 * lines. Ported from `design/assets/icons/territory-rush-icon.svg`.
 */
export const BrandIcon = ({ size, radius = 26, testID }: BrandIconProps) => {
  const rx = (radius / 92) * size;
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" testID={testID}>
      <Defs>
        <LinearGradient id="trbg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#141D30" />
          <Stop offset="1" stopColor="#0A0F1A" />
        </LinearGradient>
      </Defs>
      <Rect width="1024" height="1024" rx={(rx / size) * 1024} fill="url(#trbg)" />
      <Path
        d="M512 150 L836 337 V711 L512 898 L188 711 V337 Z"
        fill="none"
        stroke="#2B3D55"
        strokeWidth={26}
      />
      <Path d="M250 470 L470 560 L560 470 L790 560" fill="none" stroke="#E23B3B" strokeWidth={34} strokeLinecap="round" />
      <Path d="M300 640 L520 560 L520 320" fill="none" stroke="#2E8BFF" strokeWidth={46} strokeLinecap="round" />
      <Path d="M520 560 L720 660" fill="none" stroke="#2E8BFF" strokeWidth={46} strokeLinecap="round" />
      <Circle cx="520" cy="560" r="112" fill="#0A0F1A" />
      <Circle cx="520" cy="560" r="82" fill="#2E8BFF" />
      <Path d="M520 512 L560 612 L520 590 L480 612 Z" fill="#FFFFFF" />
    </Svg>
  );
};
