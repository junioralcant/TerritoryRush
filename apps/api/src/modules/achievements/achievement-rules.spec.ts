import { evaluateAchievements } from './achievement-rules';
import { RunnerStats } from './achievements.types';

const stats = (overrides: Partial<RunnerStats> = {}): RunnerStats => ({
  activityCount: 0,
  streetsOwned: 0,
  totalDistanceKm: 0,
  citiesExplored: 0,
  ...overrides,
});

describe('evaluateAchievements', () => {
  it('unlocks first_run on the first activity', () => {
    expect(evaluateAchievements(stats({ activityCount: 1 }), [])).toContain('first_run');
  });

  it('unlocks street milestones once thresholds are met', () => {
    const unlocked = evaluateAchievements(stats({ streetsOwned: 50, activityCount: 5 }), []);
    expect(unlocked).toEqual(expect.arrayContaining(['first_street', 'streets_10', 'streets_50']));
    expect(unlocked).not.toContain('streets_100');
  });

  it('unlocks distance and city milestones', () => {
    const unlocked = evaluateAchievements(stats({ totalDistanceKm: 120, citiesExplored: 2 }), []);
    expect(unlocked).toEqual(expect.arrayContaining(['km_100', 'first_city']));
    expect(unlocked).not.toContain('km_500');
  });

  it('does not re-unlock already unlocked achievements', () => {
    const unlocked = evaluateAchievements(stats({ activityCount: 1, streetsOwned: 1 }), ['first_run', 'first_street']);
    expect(unlocked).toEqual([]);
  });
});
