export type ScoreEntry = {
  userId: string;
  points: number;
};

export type OwnershipDecision = {
  ownerUserId: string;
  changed: boolean;
};

/**
 * Decides the owner of a street from the runners' scores. First claim goes to the
 * top scorer. A challenger takes over only with a *strictly greater* score than the
 * current owner — a tie keeps the current owner (explicit edge rule). Deterministic
 * tie-break by userId. Returns null when there are no scores.
 */
export const decideOwnership = (
  currentOwnerId: string | null,
  scores: ScoreEntry[],
): OwnershipDecision | null => {
  if (scores.length === 0) {
    return null;
  }
  const sorted = [...scores].sort((a, b) => b.points - a.points || a.userId.localeCompare(b.userId));

  if (!currentOwnerId) {
    return { ownerUserId: sorted[0].userId, changed: true };
  }

  const ownerPoints = scores.find((score) => score.userId === currentOwnerId)?.points ?? 0;
  const topChallenger = sorted.find((score) => score.userId !== currentOwnerId);
  if (topChallenger && topChallenger.points > ownerPoints) {
    return { ownerUserId: topChallenger.userId, changed: true };
  }
  return { ownerUserId: currentOwnerId, changed: false };
};
