import { GpsPoint } from './matching.types';

/**
 * Reduces a dense GPS trace to at most `maxPoints` by uniform stride, always
 * keeping the first and last fix. OSRM map-matching (HMM) is superlinear in the
 * number of points: a run's raw trace (thousands of fixes) can exhaust or crash
 * osrm-routed and blow the request timeout. Decimating preserves the path shape
 * while keeping the match fast and stable — road-level matching does not need
 * sub-metre point density. The full trace is still used for coverage confirmation.
 */
export const downsampleTrace = (trace: GpsPoint[], maxPoints: number): GpsPoint[] => {
  if (maxPoints < 2 || trace.length <= maxPoints) {
    return trace;
  }
  const stride = Math.ceil((trace.length - 1) / (maxPoints - 1));
  const sampled: GpsPoint[] = [];
  for (let index = 0; index < trace.length; index += stride) {
    sampled.push(trace[index]);
  }
  const last = trace[trace.length - 1];
  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }
  return sampled;
};
