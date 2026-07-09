import { ScoringInput, ScoringResult } from './scoring.types';

export const SCORING_ENGINE = Symbol('SCORING_ENGINE');

/**
 * Pure, deterministic scoring engine (no I/O). Given the streets matched in an
 * activity plus the runner's history, it returns the points earned per rule.
 */
export interface ScoringEngine {
  compute(input: ScoringInput): ScoringResult;
}
