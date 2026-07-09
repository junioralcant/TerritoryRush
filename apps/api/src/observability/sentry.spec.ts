import { captureException, initSentry } from './sentry';

describe('sentry', () => {
  it('is a no-op when no DSN is configured', () => {
    expect(initSentry(undefined)).toBe(false);
    expect(initSentry('')).toBe(false);
  });

  it('does not throw when capturing without initialization', () => {
    expect(() => captureException(new Error('boom'))).not.toThrow();
  });
});
