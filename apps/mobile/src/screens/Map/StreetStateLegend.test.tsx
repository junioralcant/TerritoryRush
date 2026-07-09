import { render, screen } from '@testing-library/react-native';
import { StreetStateLegend } from './StreetStateLegend';

describe('StreetStateLegend', () => {
  it('renders a textual label for each of the three street states', () => {
    render(<StreetStateLegend />);

    expect(screen.getByTestId('legend-unclaimed')).toHaveTextContent('Rua sem dono');
    expect(screen.getByTestId('legend-mine')).toHaveTextContent('Rua dominada por você');
    expect(screen.getByTestId('legend-other')).toHaveTextContent('Rua dominada por outro corredor');
  });
});
