import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme';

export type MapBackdropProps = { testID?: string };

type MapPalette = {
  mapBg: string;
  block: string;
  park: string;
  road: string;
  major: string;
  blue: string;
  red: string;
};

const DARK_MAP: MapPalette = {
  mapBg: '#0C1119',
  block: '#111926',
  park: '#0F1C17',
  road: '#2B3543',
  major: '#3D4959',
  blue: '#2E8BFF',
  red: '#E23B3B',
};

const LIGHT_MAP: MapPalette = {
  mapBg: '#E9EDF2',
  block: '#DDE3EA',
  park: '#D6E6D3',
  road: '#FFFFFF',
  major: '#FFE0AC',
  blue: '#1E6FE0',
  red: '#D62F2F',
};

/**
 * Decorative "território" street network, ported from the handoff's `MapCanvas`
 * (TerritoryRush.dc.html). Static and font-free so it can back the splash before
 * the live MapLibre map is ready. Fills its parent — wrap it to control opacity.
 */
export const MapBackdrop = ({ testID }: MapBackdropProps) => {
  const { isDark } = useTheme();
  const c = isDark ? DARK_MAP : LIGHT_MAP;
  return (
    <Svg
      testID={testID}
      width="100%"
      height="100%"
      viewBox="0 0 392 760"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <Defs>
        <RadialGradient id="mapLocGlow" cx="192" cy="357" rx="60" ry="60" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={c.blue} stopOpacity={0.45} />
          <Stop offset="1" stopColor={c.blue} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Rect x="0" y="0" width="392" height="760" fill={c.mapBg} />
      <Rect x="30" y="470" width="150" height="120" rx="6" fill={c.block} />
      <Rect x="250" y="60" width="140" height="110" rx="6" fill={c.block} />
      <Rect x="20" y="60" width="120" height="90" rx="6" fill={c.block} />
      <Rect x="255" y="560" width="130" height="150" rx="6" fill={c.park} />

      <G strokeLinecap="round" strokeLinejoin="round" fill="none">
        <G stroke={c.road} strokeWidth={9} opacity={0.9}>
          <Path d="M-10 150 L200 130 L410 150" />
          <Path d="M-10 590 L180 560 L410 600" />
          <Path d="M60 -10 L80 300 L120 780" />
          <Path d="M320 -10 L330 380 L360 780" />
          <Path d="M-10 300 L200 280 L410 320" />
        </G>
        <G stroke={c.road} strokeWidth={5} opacity={0.75}>
          <Path d="M150 -10 L160 200 L150 760" />
          <Path d="M240 -10 L250 260 L245 760" />
          <Path d="M-10 210 L410 240" />
          <Path d="M-10 440 L410 470" />
          <Path d="M-10 680 L410 700" />
          <Path d="M40 60 L360 640" />
          <Path d="M360 120 L60 620" />
        </G>
        <G stroke={c.major} strokeWidth={11}>
          <Path d="M-10 120 L120 150 L300 250 L410 380" />
          <Path d="M360 40 L340 400 L360 760" />
        </G>
        <G stroke={c.red} strokeWidth={15} opacity={0.35}>
          <Path d="M300 250 L340 360 L330 470 L360 600" />
          <Path d="M255 300 L300 250 L360 210" />
        </G>
        <G stroke={c.red} strokeWidth={6.5}>
          <Path d="M300 250 L340 360 L330 470 L360 600" />
          <Path d="M255 300 L300 250 L360 210" />
          <Path d="M150 520 L210 560 L255 610" />
        </G>
        <G stroke={c.blue} strokeWidth={18} opacity={0.4}>
          <Path d="M-10 300 L120 280 L200 300 L245 360 L250 520 L245 760" />
          <Path d="M40 210 L200 300 L360 250" />
          <Path d="M200 300 L196 360" />
        </G>
        <G stroke={c.blue} strokeWidth={7}>
          <Path d="M-10 300 L120 280 L200 300 L245 360 L250 520 L245 760" />
          <Path d="M40 210 L200 300 L360 250" />
          <Path d="M120 280 L110 150" />
          <Path d="M245 360 L320 340" />
        </G>
      </G>

      <Circle cx="192" cy="357" r="60" fill="url(#mapLocGlow)" />
      <Circle cx="192" cy="357" r="19" fill={c.blue} stroke="#FFFFFF" strokeWidth={3} />
      <Path d="M192 347 L200 367 L192 361 L184 367 Z" fill="#FFFFFF" />
    </Svg>
  );
};
