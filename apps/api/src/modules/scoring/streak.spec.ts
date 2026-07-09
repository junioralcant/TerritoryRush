import { computeStreak } from './streak';

describe('computeStreak', () => {
  it('starts a streak of 1 for the first activity', () => {
    expect(computeStreak(null, '2026-07-09T10:00:00Z', 0)).toEqual({
      streakDays: 1,
      lastActiveOn: '2026-07-09',
    });
  });

  it('keeps the streak on the same day', () => {
    expect(computeStreak('2026-07-09', '2026-07-09T18:00:00Z', 5)).toEqual({
      streakDays: 5,
      lastActiveOn: '2026-07-09',
    });
  });

  it('increments the streak on the next day', () => {
    expect(computeStreak('2026-07-09', '2026-07-10T06:00:00Z', 5)).toEqual({
      streakDays: 6,
      lastActiveOn: '2026-07-10',
    });
  });

  it('resets the streak after a gap', () => {
    expect(computeStreak('2026-07-09', '2026-07-12T06:00:00Z', 5)).toEqual({
      streakDays: 1,
      lastActiveOn: '2026-07-12',
    });
  });

  it('ignores an out-of-order (older) activity', () => {
    expect(computeStreak('2026-07-09', '2026-07-08T06:00:00Z', 5)).toEqual({
      streakDays: 5,
      lastActiveOn: '2026-07-09',
    });
  });
});
