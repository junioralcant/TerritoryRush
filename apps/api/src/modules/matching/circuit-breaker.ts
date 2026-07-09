/**
 * Minimal circuit breaker for the OSRM client: after `threshold` consecutive
 * failures it opens and short-circuits requests for `cooldownMs`, then half-opens
 * to let a probe through. A success resets it. `now` is injectable for tests.
 */
export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly threshold: number,
    private readonly cooldownMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  canRequest(): boolean {
    if (this.openedAt === null) {
      return true;
    }
    if (this.now() - this.openedAt >= this.cooldownMs) {
      this.openedAt = null;
      this.failures = 0;
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = null;
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.openedAt = this.now();
    }
  }
}
