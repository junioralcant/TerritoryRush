/* eslint-disable */
require('@testing-library/react-native/extend-expect');

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// MapLibre GL Native is a native module; render its components as passthrough
// hosts so screens can be tested without the native runtime.
jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const passthrough = (name) => {
    const Component = ({ children, ...props }) => React.createElement(View, props, children);
    Component.displayName = name;
    return Component;
  };
  return {
    __esModule: true,
    default: {},
    MapView: passthrough('MapView'),
    Camera: passthrough('Camera'),
    ShapeSource: passthrough('ShapeSource'),
    LineLayer: passthrough('LineLayer'),
  };
});

// react-native-svg ships ESM that jest-expo doesn't transform; render its
// primitives as passthrough hosts so components using them are testable.
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const passthrough = (name) => {
    const Component = ({ children, ...props }) => React.createElement(View, props, children);
    Component.displayName = name;
    return Component;
  };
  const Svg = passthrough('Svg');
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Path: passthrough('Path'),
    Circle: passthrough('Circle'),
    Rect: passthrough('Rect'),
    Line: passthrough('Line'),
    Polygon: passthrough('Polygon'),
    Polyline: passthrough('Polyline'),
    G: passthrough('G'),
    Defs: passthrough('Defs'),
    LinearGradient: passthrough('LinearGradient'),
    RadialGradient: passthrough('RadialGradient'),
    Stop: passthrough('Stop'),
    ClipPath: passthrough('ClipPath'),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  const LinearGradient = ({ children, ...props }) => React.createElement(View, props, children);
  LinearGradient.displayName = 'LinearGradient';
  return { __esModule: true, LinearGradient };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const makeIconSet = (family) => {
    const Icon = ({ name, ...props }) =>
      React.createElement(Text, { ...props, accessibilityLabel: props.accessibilityLabel ?? name }, null);
    Icon.displayName = family;
    return Icon;
  };
  return {
    __esModule: true,
    Feather: makeIconSet('Feather'),
    MaterialCommunityIcons: makeIconSet('MaterialCommunityIcons'),
    Ionicons: makeIconSet('Ionicons'),
  };
});

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'cancel' }),
}));

jest.mock('expo-linking', () => ({
  createURL: (path) => `territoryrush://${path}`,
  parse: (url) => ({ queryParams: {} }),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExpoTok[test]' }),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest
    .fn()
    .mockResolvedValue({ coords: { longitude: -46.63, latitude: -23.55 } }),
}));
