import Svg, { Path } from 'react-native-svg';

export const GoogleLogo = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.6a4.8 4.8 0 0 1-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.6z" />
    <Path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.4-2.6c-.9.6-2.1 1-3.2 1-2.5 0-4.6-1.7-5.4-4H3.1v2.6A10 10 0 0 0 12 22z" />
    <Path fill="#FBBC05" d="M6.6 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1A10 10 0 0 0 2 12c0 1.6.4 3.2 1.1 4.6L6.6 14z" />
    <Path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.6 10c.8-2.3 2.9-4 5.4-4z" />
  </Svg>
);
