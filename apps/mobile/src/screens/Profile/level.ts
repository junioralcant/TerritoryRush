export type RunnerLevel = {
  level: number;
  xpInLevel: number;
  xpForLevel: number;
  progress: number;
};

const XP_PER_LEVEL = 3000;

/**
 * Derives a runner level + XP-into-level from accumulated points. The data model
 * has no explicit level field yet, so the UI computes it consistently here
 * (3.000 pts per level, matching the "/ 3.000 XP" scale in the handoff).
 */
export const levelFromPoints = (points: number): RunnerLevel => {
  const total = Math.max(0, Math.floor(points));
  const xpInLevel = total % XP_PER_LEVEL;
  return {
    level: Math.floor(total / XP_PER_LEVEL) + 1,
    xpInLevel,
    xpForLevel: XP_PER_LEVEL,
    progress: xpInLevel / XP_PER_LEVEL,
  };
};
