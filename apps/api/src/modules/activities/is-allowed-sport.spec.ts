import { isAllowedSport } from './is-allowed-sport';

describe('isAllowedSport', () => {
  it('keeps on-foot sports (run, walk, trail, hike)', () => {
    expect(isAllowedSport('Run')).toBe(true);
    expect(isAllowedSport('TrailRun')).toBe(true);
    expect(isAllowedSport('Walk')).toBe(true);
    expect(isAllowedSport('Hike')).toBe(true);
  });

  it('normalizes casing, spaces and separators', () => {
    expect(isAllowedSport('trail run')).toBe(true);
    expect(isAllowedSport('TRAIL_RUN')).toBe(true);
    expect(isAllowedSport('walk')).toBe(true);
  });

  it('discards non-foot sports (bike, swim, etc.)', () => {
    expect(isAllowedSport('Ride')).toBe(false);
    expect(isAllowedSport('VirtualRide')).toBe(false);
    expect(isAllowedSport('Swim')).toBe(false);
    expect(isAllowedSport('Workout')).toBe(false);
  });

  it('allows an unknown or absent sport type so providers without one are not dropped', () => {
    expect(isAllowedSport(null)).toBe(true);
    expect(isAllowedSport(undefined)).toBe(true);
    expect(isAllowedSport('')).toBe(true);
  });
});
