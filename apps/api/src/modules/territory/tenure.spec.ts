import { computeTenureDays } from './tenure';

describe('computeTenureDays', () => {
  it('returns null when there is no owner', () => {
    expect(computeTenureDays(null, '2026-07-09T00:00:00Z')).toBeNull();
  });

  it('computes whole days of possession', () => {
    expect(computeTenureDays('2026-07-01T00:00:00Z', '2026-07-09T00:00:00Z')).toBe(8);
  });

  it('clamps a negative interval to zero', () => {
    expect(computeTenureDays('2026-07-09T00:00:00Z', '2026-07-08T00:00:00Z')).toBe(0);
  });
});
