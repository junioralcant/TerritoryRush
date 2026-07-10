import { ownershipStyle } from './ownershipStyle';

describe('ownershipStyle', () => {
  it('maps each ownership state to a colour and a textual accessibility label', () => {
    expect(ownershipStyle('unclaimed')).toEqual({ color: '#7A8492', accessibilityLabel: 'Rua sem dono' });
    expect(ownershipStyle('mine')).toEqual({ color: '#2E8BFF', accessibilityLabel: 'Rua dominada por você' });
    expect(ownershipStyle('other')).toEqual({
      color: '#E23B3B',
      accessibilityLabel: 'Rua dominada por outro corredor',
    });
  });
});
