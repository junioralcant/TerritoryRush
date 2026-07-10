import { formatNumber } from './formatNumber';

describe('formatNumber', () => {
  it('groups thousands with a dot (pt-BR) regardless of ICU data', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1250)).toBe('1.250');
    expect(formatNumber(1264)).toBe('1.264');
    expect(formatNumber(1000000)).toBe('1.000.000');
  });

  it('rounds and keeps the sign', () => {
    expect(formatNumber(1249.6)).toBe('1.250');
    expect(formatNumber(-1500)).toBe('-1.500');
  });
});
