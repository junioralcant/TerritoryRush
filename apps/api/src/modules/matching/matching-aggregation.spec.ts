import { GpsStreams } from '../activities/activities.types';
import { aggregateByCityAndName, toGpsTrace } from './matching-aggregation';
import { AnnotatedEdge } from './matching.types';

const edge = (overrides: Partial<AnnotatedEdge> = {}): AnnotatedEdge => ({
  cityId: 'city-a',
  streetName: 'Rua Maranhão',
  lengthM: 100,
  ...overrides,
});

describe('toGpsTrace', () => {
  it('zips latlng and time into GPS points', () => {
    const streams: GpsStreams = { latlng: [[-23.55, -46.63], [-23.56, -46.64]], time: [0, 30] };

    expect(toGpsTrace(streams)).toEqual([
      { lat: -23.55, lng: -46.63, t: 0 },
      { lat: -23.56, lng: -46.64, t: 30 },
    ]);
  });

  it('falls back to the index when a timestamp is missing', () => {
    const streams: GpsStreams = { latlng: [[-23.55, -46.63]], time: [] };

    expect(toGpsTrace(streams)[0].t).toBe(0);
  });
});

describe('aggregateByCityAndName', () => {
  it('collapses repeated segments of the same street in a city, summing length', () => {
    const result = aggregateByCityAndName([edge({ lengthM: 100 }), edge({ lengthM: 50 })]);

    expect(result).toHaveLength(1);
    expect(result[0].totalLengthM).toBe(150);
  });

  it('keeps distinct streets separate', () => {
    const result = aggregateByCityAndName([edge(), edge({ streetName: 'Avenida Brasil' })]);

    expect(result.map((match) => match.streetName).sort()).toEqual(['Avenida Brasil', 'Rua Maranhão']);
  });

  it('keeps a homonymous street in another city separate', () => {
    const result = aggregateByCityAndName([edge({ cityId: 'city-a' }), edge({ cityId: 'city-b' })]);

    expect(result).toHaveLength(2);
    expect(result.map((match) => match.cityId).sort()).toEqual(['city-a', 'city-b']);
  });

  it('drops unnamed edges (empty or whitespace names)', () => {
    const result = aggregateByCityAndName([edge({ streetName: '' }), edge({ streetName: '   ' }), edge()]);

    expect(result).toHaveLength(1);
    expect(result[0].streetName).toBe('Rua Maranhão');
  });
});
