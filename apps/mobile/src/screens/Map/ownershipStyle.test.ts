import { ownershipStyle } from './ownershipStyle';

describe('ownershipStyle', () => {
  it('maps each ownership state to a colour and a textual accessibility label', () => {
    expect(ownershipStyle('unclaimed')).toEqual({ color: '#9E9E9E', accessibilityLabel: 'Rua sem dono' });
    expect(ownershipStyle('mine')).toEqual({ color: '#1E88E5', accessibilityLabel: 'Rua dominada por você' });
    expect(ownershipStyle('other')).toEqual({
      color: '#E53935',
      accessibilityLabel: 'Rua dominada por outro corredor',
    });
  });
});
