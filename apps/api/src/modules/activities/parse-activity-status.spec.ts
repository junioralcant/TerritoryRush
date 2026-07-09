import { BadRequestException } from '@nestjs/common';
import { parseActivityStatus } from './parse-activity-status';

describe('parseActivityStatus', () => {
  it('returns undefined for an absent or empty filter', () => {
    expect(parseActivityStatus(undefined)).toBeUndefined();
    expect(parseActivityStatus('')).toBeUndefined();
  });

  it('accepts every valid status', () => {
    expect(parseActivityStatus('imported')).toBe('imported');
    expect(parseActivityStatus('processing')).toBe('processing');
    expect(parseActivityStatus('processed')).toBe('processed');
    expect(parseActivityStatus('rejected')).toBe('rejected');
  });

  it('rejects an unknown status', () => {
    expect(() => parseActivityStatus('done')).toThrow(BadRequestException);
  });
});
