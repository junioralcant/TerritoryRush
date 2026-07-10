/**
 * Raised when OSRM responds that a trace cannot be matched (e.g. NoSegment,
 * NoMatch, InvalidValue, TooBig) — a permanent, data-level outcome as opposed to
 * a transient OSRM outage. The ingestion pipeline rejects the activity instead of
 * retrying it, and the circuit breaker does not count it as an OSRM failure.
 */
export class OsrmUnmatchableTraceError extends Error {
  constructor(readonly code: string) {
    super(`OSRM cannot match trace (${code})`);
    this.name = 'OsrmUnmatchableTraceError';
  }
}
