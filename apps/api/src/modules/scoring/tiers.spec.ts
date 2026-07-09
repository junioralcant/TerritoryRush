import { milestonePointsBetween, tierForDays } from './tiers';

describe('tierForDays', () => {
  it('maps durations to milestone tiers', () => {
    expect(tierForDays(0)).toBe(0);
    expect(tierForDays(6)).toBe(0);
    expect(tierForDays(7)).toBe(1);
    expect(tierForDays(29)).toBe(1);
    expect(tierForDays(30)).toBe(2);
    expect(tierForDays(89)).toBe(2);
    expect(tierForDays(90)).toBe(3);
    expect(tierForDays(365)).toBe(3);
  });
});

describe('milestonePointsBetween', () => {
  const points = { 1: 500, 2: 2000, 3: 10_000 };

  it('sums the milestones newly crossed', () => {
    expect(milestonePointsBetween(0, 1, points)).toBe(500);
    expect(milestonePointsBetween(0, 2, points)).toBe(2500);
    expect(milestonePointsBetween(0, 3, points)).toBe(12_500);
    expect(milestonePointsBetween(1, 3, points)).toBe(12_000);
  });

  it('awards nothing when the tier did not advance', () => {
    expect(milestonePointsBetween(2, 2, points)).toBe(0);
    expect(milestonePointsBetween(3, 2, points)).toBe(0);
  });
});
