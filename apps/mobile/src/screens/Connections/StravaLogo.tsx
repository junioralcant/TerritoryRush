import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../theme';

export const StravaLogo = ({ size = 26 }: { size?: number }) => {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={colors.white}>
      <Path d="M10 2 4 14h3.6L10 9.2 12.4 14H16zM14 14l-2 4-2-4H7.5L12 22l4.5-8z" opacity={0.55} />
      <Path d="M10 2 4 14h3.6L10 9.2 12.4 14H16z" />
    </Svg>
  );
};
