import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider, useTheme } from '../theme';
import { ThemeToggle } from './ThemeToggle';

const ThemeName = () => {
  const { name } = useTheme();
  return <Text testID="active-theme">{name}</Text>;
};

describe('ThemeToggle', () => {
  beforeEach(() => AsyncStorage.clear());

  it('switches the app to dark when Escuro is pressed', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
        <ThemeName />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('active-theme')).toHaveTextContent('light');

    fireEvent.press(screen.getByTestId('theme-option-dark'));

    await waitFor(() => expect(screen.getByTestId('active-theme')).toHaveTextContent('dark'));
  });

  it('switches back to light when Claro is pressed', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
        <ThemeName />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByTestId('theme-option-dark'));
    await waitFor(() => expect(screen.getByTestId('active-theme')).toHaveTextContent('dark'));

    fireEvent.press(screen.getByTestId('theme-option-light'));
    await waitFor(() => expect(screen.getByTestId('active-theme')).toHaveTextContent('light'));
  });
});
