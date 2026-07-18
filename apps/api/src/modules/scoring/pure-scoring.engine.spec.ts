import { PureScoringEngine } from './pure-scoring.engine';
import { ScoringInput } from './scoring.types';

const baseInput = (overrides: Partial<ScoringInput> = {}): ScoringInput => ({
  streets: [],
  newNeighborhoods: 0,
  streakDays: 0,
  streakBonusAwardedTier: 0,
  ...overrides,
});

const engine = new PureScoringEngine();

describe('PureScoringEngine', () => {
  describe('exploration', () => {
    it('awards 100 for a first visit and 10 for a known street', () => {
      const result = engine.compute(
        baseInput({
          streets: [
            { streetId: 's1', isFirstVisit: true, ownershipDays: null, defenseTierAwarded: 0 },
            { streetId: 's2', isFirstVisit: false, ownershipDays: null, defenseTierAwarded: 0 },
          ],
        }),
      );

      expect(result.streetAwards[0].explorationPoints).toBe(100);
      expect(result.streetAwards[1].explorationPoints).toBe(10);
      expect(result.totalPoints).toBe(110);
    });
  });

  describe('region', () => {
    it('awards 500 per new neighborhood', () => {
      const result = engine.compute(baseInput({ newNeighborhoods: 2 }));

      expect(result.regionPoints).toBe(2 * 500);
      expect(result.totalPoints).toBe(1000);
    });
  });

  describe('consistency (streak)', () => {
    it('awards each streak milestone once as the tier advances', () => {
      expect(engine.compute(baseInput({ streakDays: 7, streakBonusAwardedTier: 0 })).consistencyPoints).toBe(500);
      expect(engine.compute(baseInput({ streakDays: 30, streakBonusAwardedTier: 1 })).consistencyPoints).toBe(2000);
      expect(engine.compute(baseInput({ streakDays: 90, streakBonusAwardedTier: 2 })).consistencyPoints).toBe(10_000);
    });

    it('does not re-award a streak milestone already granted', () => {
      const result = engine.compute(baseInput({ streakDays: 40, streakBonusAwardedTier: 2 }));

      expect(result.consistencyPoints).toBe(0);
      expect(result.newStreakTier).toBe(2);
    });
  });

  describe('defense', () => {
    it('awards defense milestones for a held street as tiers advance', () => {
      const result = engine.compute(
        baseInput({
          streets: [{ streetId: 's1', isFirstVisit: false, ownershipDays: 30, defenseTierAwarded: 0 }],
        }),
      );

      expect(result.streetAwards[0].defensePoints).toBe(100 + 500);
      expect(result.streetAwards[0].newDefenseTier).toBe(2);
    });

    it('does not re-award defense tiers already granted', () => {
      const result = engine.compute(
        baseInput({
          streets: [{ streetId: 's1', isFirstVisit: false, ownershipDays: 100, defenseTierAwarded: 3 }],
        }),
      );

      expect(result.streetAwards[0].defensePoints).toBe(0);
    });

    it('awards no defense points for a street the runner does not own', () => {
      const result = engine.compute(
        baseInput({
          streets: [{ streetId: 's1', isFirstVisit: true, ownershipDays: null, defenseTierAwarded: 0 }],
        }),
      );

      expect(result.streetAwards[0].defensePoints).toBe(0);
      expect(result.streetAwards[0].newDefenseTier).toBe(0);
    });
  });

  it('combines every category into the total', () => {
    const result = engine.compute(
      baseInput({
        streets: [{ streetId: 's1', isFirstVisit: true, ownershipDays: 7, defenseTierAwarded: 0 }],
        newNeighborhoods: 1,
        streakDays: 7,
        streakBonusAwardedTier: 0,
      }),
    );

    expect(result.totalPoints).toBe(100 + 100 + 500 + 500);
  });
});
