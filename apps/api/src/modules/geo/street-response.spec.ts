import { StreetRow } from './geo.types';
import { toStreetSummary } from './street-response';

const geojson = JSON.stringify({ type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]]] });

const row = (overrides: Partial<StreetRow> = {}): StreetRow => ({
  id: 'street-1',
  osm_name: 'Rua Maranhão',
  city_id: 'city-a',
  owner_user_id: null,
  geojson,
  ...overrides,
});

describe('toStreetSummary', () => {
  it('marks an owner-less street as unclaimed', () => {
    const summary = toStreetSummary(row(), 'user-1');

    expect(summary).toMatchObject({
      id: 'street-1',
      name: 'Rua Maranhão',
      cityId: 'city-a',
      ownership: 'unclaimed',
      ownerUserId: null,
    });
    expect(summary.geometry).toEqual({ type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]]] });
  });

  it('marks a street owned by the requester as mine', () => {
    expect(toStreetSummary(row({ owner_user_id: 'user-1' }), 'user-1').ownership).toBe('mine');
  });

  it('marks a street owned by someone else as other', () => {
    expect(toStreetSummary(row({ owner_user_id: 'user-2' }), 'user-1').ownership).toBe('other');
  });
});
