import { downsampleTrace } from './downsample-trace';
import { GpsPoint } from './matching.types';

const point = (index: number): GpsPoint => ({ lat: index, lng: index, t: index });

describe('downsampleTrace', () => {
  it('returns the trace unchanged when within the cap', () => {
    const trace = [point(0), point(1), point(2)];
    expect(downsampleTrace(trace, 10)).toBe(trace);
  });

  it('caps a dense trace at roughly maxPoints while keeping first and last', () => {
    const trace = Array.from({ length: 5000 }, (_, index) => point(index));

    const result = downsampleTrace(trace, 1000);

    expect(result.length).toBeLessThanOrEqual(1000);
    expect(result.length).toBeGreaterThan(700);
    expect(result[0]).toEqual(point(0));
    expect(result[result.length - 1]).toEqual(point(4999));
  });

  it('preserves ascending order of the sampled points', () => {
    const trace = Array.from({ length: 3000 }, (_, index) => point(index));

    const result = downsampleTrace(trace, 500);

    for (let index = 1; index < result.length; index += 1) {
      expect(result[index].t).toBeGreaterThan(result[index - 1].t);
    }
  });
});
