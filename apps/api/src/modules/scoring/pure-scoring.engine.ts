import { Injectable } from '@nestjs/common';
import { ScoringEngine } from './scoring-engine.port';
import { ScoringInput, ScoringResult, StreetAward } from './scoring.types';
import { milestonePointsBetween, tierForDays } from './tiers';

const FIRST_VISIT_POINTS = 100;
const KNOWN_VISIT_POINTS = 10;
const NEW_NEIGHBORHOOD_POINTS = 500;
const NEW_CITY_POINTS = 2000;
const CONSISTENCY_POINTS_BY_TIER: Readonly<Record<number, number>> = { 1: 500, 2: 2000, 3: 10_000 };
const DEFENSE_POINTS_BY_TIER: Readonly<Record<number, number>> = { 1: 100, 2: 500, 3: 2000 };

@Injectable()
export class PureScoringEngine implements ScoringEngine {
  compute(input: ScoringInput): ScoringResult {
    const streetAwards: StreetAward[] = input.streets.map((street) => {
      const explorationPoints = street.isFirstVisit ? FIRST_VISIT_POINTS : KNOWN_VISIT_POINTS;
      const defenseTier = street.ownershipDays === null ? 0 : tierForDays(street.ownershipDays);
      const newDefenseTier = Math.max(street.defenseTierAwarded, defenseTier);
      const defensePoints = milestonePointsBetween(
        street.defenseTierAwarded,
        defenseTier,
        DEFENSE_POINTS_BY_TIER,
      );
      return {
        streetId: street.streetId,
        isFirstVisit: street.isFirstVisit,
        explorationPoints,
        defensePoints,
        newDefenseTier,
      };
    });

    const regionPoints =
      input.newNeighborhoods * NEW_NEIGHBORHOOD_POINTS + input.newCities * NEW_CITY_POINTS;

    const streakTier = tierForDays(input.streakDays);
    const newStreakTier = Math.max(input.streakBonusAwardedTier, streakTier);
    const consistencyPoints = milestonePointsBetween(
      input.streakBonusAwardedTier,
      streakTier,
      CONSISTENCY_POINTS_BY_TIER,
    );

    const streetPoints = streetAwards.reduce(
      (sum, award) => sum + award.explorationPoints + award.defensePoints,
      0,
    );

    return {
      streetAwards,
      regionPoints,
      consistencyPoints,
      newStreakTier,
      totalPoints: streetPoints + regionPoints + consistencyPoints,
    };
  }
}
