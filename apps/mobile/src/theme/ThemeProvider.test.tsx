import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { darkColors, lightColors, themes } from './tokens';
import { ThemeProvider, useTheme } from './ThemeProvider';

const Probe = () => {
  const { name, colors, statusBarStyle, mapStyleUrl, toggleTheme, setTheme } = useTheme();
  return (
    <>
      <Text testID="name">{name}</Text>
      <Text testID="bg">{colors.bgApp}</Text>
      <Text testID="statusbar">{statusBarStyle}</Text>
      <Text testID="map">{mapStyleUrl}</Text>
      <Pressable testID="toggle" onPress={toggleTheme}>
        <Text>toggle</Text>
      </Pressable>
      <Pressable testID="set-dark" onPress={() => setTheme('dark')}>
        <Text>dark</Text>
      </Pressable>
    </>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => AsyncStorage.clear());

  it('defaults to the light theme', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('name')).toHaveTextContent('light');
    expect(screen.getByTestId('bg')).toHaveTextContent(lightColors.bgApp);
    expect(screen.getByTestId('statusbar')).toHaveTextContent('dark');
    expect(screen.getByTestId('map')).toHaveTextContent(themes.light.mapStyleUrl);
  });

  it('toggles to dark at runtime and persists the choice', async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByTestId('toggle'));

    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('dark'));
    expect(screen.getByTestId('bg')).toHaveTextContent(darkColors.bgApp);
    expect(screen.getByTestId('statusbar')).toHaveTextContent('light');
    expect(screen.getByTestId('map')).toHaveTextContent(themes.dark.mapStyleUrl);
    await waitFor(() => expect(AsyncStorage.getItem('territoryrush.theme')).resolves.toBe('dark'));
  });

  it('restores the persisted theme on mount', async () => {
    await AsyncStorage.setItem('territoryrush.theme', 'dark');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('dark'));
  });

  it('falls back to the light theme without a provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('name')).toHaveTextContent('light');
    expect(screen.getByTestId('bg')).toHaveTextContent(lightColors.bgApp);
  });
});
