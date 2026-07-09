import { OsmRoadRecord } from './geo.types';
import { aggregateOsmRoads, resolveStreetName } from './street-aggregation';

const record = (overrides: Partial<OsmRoadRecord> = {}): OsmRoadRecord => ({
  osmId: 1,
  name: 'Rua Maranhão',
  highway: 'residential',
  cityId: 'city-a',
  geometry: 'LINESTRING(0 0, 1 1)',
  ...overrides,
});

describe('resolveStreetName', () => {
  it('keeps a trimmed name for named roads', () => {
    expect(resolveStreetName('  Rua Maranhão  ', 42)).toBe('Rua Maranhão');
  });

  it('falls back to a per-way label for null/blank names', () => {
    expect(resolveStreetName(null, 42)).toBe('Via sem nome (42)');
    expect(resolveStreetName('   ', 7)).toBe('Via sem nome (7)');
  });
});

describe('aggregateOsmRoads', () => {
  it('collapses segments sharing a name within a city into one street', () => {
    const result = aggregateOsmRoads([
      record({ osmId: 1 }),
      record({ osmId: 2, geometry: 'LINESTRING(1 1, 2 2)' }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Rua Maranhão');
    expect(result[0].osmIds).toEqual([1, 2]);
    expect(result[0].geometries).toHaveLength(2);
  });

  it('keeps the same name in different cities as separate streets', () => {
    const result = aggregateOsmRoads([
      record({ osmId: 1, cityId: 'city-a' }),
      record({ osmId: 2, cityId: 'city-b' }),
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((s) => s.cityId).sort()).toEqual(['city-a', 'city-b']);
  });

  it('keeps distinct unnamed ways as separate streets via the fallback label', () => {
    const result = aggregateOsmRoads([
      record({ osmId: 10, name: null }),
      record({ osmId: 11, name: '' }),
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((s) => s.name).sort()).toEqual([
      'Via sem nome (10)',
      'Via sem nome (11)',
    ]);
  });

  it('merges repeated segments of the same unnamed way (same osm_id)', () => {
    const result = aggregateOsmRoads([
      record({ osmId: 10, name: null }),
      record({ osmId: 10, name: null, geometry: 'LINESTRING(2 2, 3 3)' }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Via sem nome (10)');
    expect(result[0].osmIds).toEqual([10, 10]);
  });

  it('drops records without a city or without a highway tag', () => {
    const result = aggregateOsmRoads([
      record({ osmId: 1, cityId: null }),
      record({ osmId: 2, highway: null }),
      record({ osmId: 3 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].osmIds).toEqual([3]);
  });
});
