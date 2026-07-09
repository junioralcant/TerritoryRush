import { GpsStreams } from '../activities/activities.types';
import { aggregateMatchedEdges, toGpsTrace } from './matching-aggregation';
import { MatchedEdge } from './matching.types';

const edge = (overrides: Partial<MatchedEdge> = {}): MatchedEdge => ({
  streetName: 'Rua Maranhão',
  lengthM: 100,
  coordinate: [-46.63, -23.55],
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

describe('aggregateMatchedEdges', () => {
  it('collapses repeated segments of the same street, summing length', () => {
    const result = aggregateMatchedEdges([edge({ lengthM: 100 }), edge({ lengthM: 50 })]);

    expect(result).toHaveLength(1);
    expect(result[0].totalLengthM).toBe(150);
  });

  it('keeps distinct streets separate', () => {
    const result = aggregateMatchedEdges([edge(), edge({ streetName: 'Avenida Brasil' })]);

    expect(result.map((match) => match.streetName).sort()).toEqual(['Avenida Brasil', 'Rua Maranhão']);
  });

  it('drops unnamed edges (empty or whitespace names)', () => {
    const result = aggregateMatchedEdges([edge({ streetName: '' }), edge({ streetName: '   ' }), edge()]);

    expect(result).toHaveLength(1);
    expect(result[0].streetName).toBe('Rua Maranhão');
  });
});
