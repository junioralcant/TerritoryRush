import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../theme';
import { SplashScreen } from './SplashScreen';

const renderSplash = () =>
  render(
    <ThemeProvider>
      <SplashScreen />
    </ThemeProvider>,
  );

describe('SplashScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders the wordmark, tagline and loading state', () => {
    renderSplash();

    expect(screen.getByTestId('splash-screen')).toBeTruthy();
    expect(screen.getByText('TERRITORY')).toBeTruthy();
    expect(screen.getByText('RUSH')).toBeTruthy();
    expect(screen.getByText('Domine as ruas da sua cidade')).toBeTruthy();
    expect(screen.getByText('Carregando território…')).toBeTruthy();
  });

  it('shows the branded spinner', () => {
    renderSplash();

    expect(screen.getByTestId('splash-spinner')).toBeTruthy();
  });
});
