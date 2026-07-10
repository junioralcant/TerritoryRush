import { StreetSummary } from '../../services/api/types';
import { toStreetFeatureCollection } from './streetFeatures';

const street = (id: string, ownership: StreetSummary['ownership']): StreetSummary => ({
  id,
  name: `Rua ${id}`,
  cityId: 'city-a',
  ownership,
  ownerUserId: ownership === 'unclaimed' ? null : 'someone',
  geometry: { type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]]] },
});

describe('toStreetFeatureCollection', () => {
  it('builds a feature per street with the ownership colour for all three states', () => {
    const collection = toStreetFeatureCollection([
      street('a', 'unclaimed'),
      street('b', 'mine'),
      street('c', 'other'),
    ]);

    expect(collection.type).toBe('FeatureCollection');
    expect(collection.features.map((f) => f.properties.color)).toEqual(['#7A8492', '#2E8BFF', '#E23B3B']);
    expect(collection.features.map((f) => f.properties.ownership)).toEqual(['unclaimed', 'mine', 'other']);
    expect(collection.features[0].geometry.type).toBe('MultiLineString');
  });
});
