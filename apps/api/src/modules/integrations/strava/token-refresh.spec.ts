import { needsTokenRefresh, REFRESH_THRESHOLD_SECONDS } from './token-refresh';

describe('needsTokenRefresh', () => {
  const now = 1_700_000_000;

  it('refreshes an already expired token', () => {
    expect(needsTokenRefresh(now - 60, now)).toBe(true);
  });

  it('refreshes a token that expires within the threshold', () => {
    expect(needsTokenRefresh(now + REFRESH_THRESHOLD_SECONDS - 1, now)).toBe(true);
  });

  it('does not refresh a token well before expiry', () => {
    expect(needsTokenRefresh(now + REFRESH_THRESHOLD_SECONDS + 3600, now)).toBe(false);
  });

  it('refreshes exactly at the threshold boundary', () => {
    expect(needsTokenRefresh(now + REFRESH_THRESHOLD_SECONDS, now)).toBe(true);
  });
});
