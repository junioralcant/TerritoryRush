import { darkOwnership } from '../../theme';
import { ownershipStyle } from './ownershipStyle';

describe('ownershipStyle', () => {
  it('maps each ownership state to the light (default) colour + a textual accessibility label', () => {
    expect(ownershipStyle('unclaimed')).toEqual({ color: '#9AA4B2', accessibilityLabel: 'Rua sem dono' });
    expect(ownershipStyle('mine')).toEqual({ color: '#1E6FE0', accessibilityLabel: 'Rua dominada por você' });
    expect(ownershipStyle('other')).toEqual({
      color: '#D62F2F',
      accessibilityLabel: 'Rua dominada por outro corredor',
    });
  });

  it('uses the supplied ownership palette (e.g. dark theme)', () => {
    expect(ownershipStyle('mine', darkOwnership).color).toBe('#2E8BFF');
    expect(ownershipStyle('other', darkOwnership).color).toBe('#E23B3B');
    expect(ownershipStyle('unclaimed', darkOwnership).color).toBe('#7A8492');
  });
});
