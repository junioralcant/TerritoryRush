/* eslint-disable */
require('@testing-library/react-native/extend-expect');

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

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'cancel' }),
}));

jest.mock('expo-linking', () => ({
  createURL: (path) => `territoryrush://${path}`,
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExpoTok[test]' }),
}));
