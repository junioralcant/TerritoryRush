import { render, screen } from '@testing-library/react-native';
import { StreetStateLegend } from './StreetStateLegend';

describe('StreetStateLegend', () => {
  it('renders a textual label for each of the three street states', () => {
    render(<StreetStateLegend />);

    expect(screen.getByTestId('legend-mine')).toHaveTextContent('Suas ruas');
    expect(screen.getByTestId('legend-other')).toHaveTextContent('Ruas de outros corredores');
    expect(screen.getByTestId('legend-unclaimed')).toHaveTextContent('Ruas livres');
  });

  it('exposes the full descriptive ownership label to assistive tech', () => {
    render(<StreetStateLegend />);

    expect(screen.getByLabelText('Rua dominada por você')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rua dominada por outro corredor')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rua sem dono')).toBeOnTheScreen();
  });
});
