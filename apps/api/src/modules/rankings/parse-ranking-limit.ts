import { BadRequestException } from '@nestjs/common';

export const DEFAULT_RANKING_LIMIT = 50;
export const MAX_RANKING_LIMIT = 200;

export const parseRankingLimit = (raw: string | undefined): number => {
  if (raw === undefined || raw === '') {
    return DEFAULT_RANKING_LIMIT;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new BadRequestException('limit must be a positive integer');
  }
  return Math.min(value, MAX_RANKING_LIMIT);
};
