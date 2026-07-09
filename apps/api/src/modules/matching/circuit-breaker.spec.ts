import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker', () => {
  it('allows requests until the failure threshold is reached', () => {
    const now = 0;
    const breaker = new CircuitBreaker(3, 1000, () => now);

    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.canRequest()).toBe(true);

    breaker.recordFailure();
    expect(breaker.canRequest()).toBe(false);
  });

  it('half-opens after the cooldown elapses', () => {
    let now = 0;
    const breaker = new CircuitBreaker(1, 1000, () => now);

    breaker.recordFailure();
    expect(breaker.canRequest()).toBe(false);

    now = 999;
    expect(breaker.canRequest()).toBe(false);

    now = 1000;
    expect(breaker.canRequest()).toBe(true);
  });

  it('resets on success', () => {
    const now = 0;
    const breaker = new CircuitBreaker(2, 1000, () => now);

    breaker.recordFailure();
    breaker.recordSuccess();
    breaker.recordFailure();
    expect(breaker.canRequest()).toBe(true);
  });
});
