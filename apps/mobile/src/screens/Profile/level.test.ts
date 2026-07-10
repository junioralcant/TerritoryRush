import { levelFromPoints } from './level';

describe('levelFromPoints', () => {
  it('starts at level 1 with no points', () => {
    expect(levelFromPoints(0)).toEqual({ level: 1, xpInLevel: 0, xpForLevel: 3000, progress: 0 });
  });

  it('advances a level every 3.000 points', () => {
    expect(levelFromPoints(3000).level).toBe(2);
    expect(levelFromPoints(9000).level).toBe(4);
  });

  it('reports the XP progress within the current level', () => {
    const result = levelFromPoints(4500);
    expect(result.level).toBe(2);
    expect(result.xpInLevel).toBe(1500);
    expect(result.progress).toBeCloseTo(0.5);
  });

  it('never goes below level 1 for negative input', () => {
    expect(levelFromPoints(-100).level).toBe(1);
  });
});
