import { BadRequestException } from '@nestjs/common';
import { DEFAULT_RANKING_LIMIT, MAX_RANKING_LIMIT, parseRankingLimit } from './parse-ranking-limit';

describe('parseRankingLimit', () => {
  it('defaults when no limit is given', () => {
    expect(parseRankingLimit(undefined)).toBe(DEFAULT_RANKING_LIMIT);
    expect(parseRankingLimit('')).toBe(DEFAULT_RANKING_LIMIT);
  });

  it('accepts a positive integer', () => {
    expect(parseRankingLimit('10')).toBe(10);
  });

  it('caps at the maximum', () => {
    expect(parseRankingLimit('9999')).toBe(MAX_RANKING_LIMIT);
  });

  it('rejects non-positive or non-integer values', () => {
    expect(() => parseRankingLimit('0')).toThrow(BadRequestException);
    expect(() => parseRankingLimit('-5')).toThrow(BadRequestException);
    expect(() => parseRankingLimit('abc')).toThrow(BadRequestException);
  });
});
