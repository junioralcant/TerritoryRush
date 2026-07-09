import { StreetRepository } from '../geo/ports/street-repository.port';
import { StreetRow } from '../geo/geo.types';
import { MapMatchingService } from './matching.service';
import { MatchedEdge } from './matching.types';
import { ActivityStreetRepository } from './ports/activity-street-repository.port';
import { OsrmClient } from './ports/osrm-client.port';

const streetRow = (overrides: Partial<StreetRow> = {}): StreetRow => ({
  id: 'street-1',
  osm_name: 'Rua Maranhão',
  city_id: 'city-a',
  owner_user_id: null,
  geojson: '{}',
  ...overrides,
});

const makeStreets = (): jest.Mocked<StreetRepository> => ({
  findInBbox: jest.fn(),
  findByNameAndCity: jest.fn(),
  findCityIdContaining: jest.fn(),
  resolveCitiesForOsmRoads: jest.fn(),
  deriveStreetsFromOsmRoads: jest.fn(),
});

const makeActivityStreets = (): jest.Mocked<ActivityStreetRepository> => ({
  hasUserVisitedStreet: jest.fn().mockResolvedValue(false),
  upsert: jest.fn(),
  findByActivity: jest.fn(),
});

const makeOsrm = (edges: MatchedEdge[]): jest.Mocked<OsrmClient> => ({
  match: jest.fn().mockResolvedValue(edges),
});

const INPUT = { activityId: 'activity-1', userId: 'user-1', trace: [{ lat: 0, lng: 0, t: 0 }] };

describe('MapMatchingService', () => {
  it('resolves matched edges to streets and persists activity_street rows', async () => {
    const streets = makeStreets();
    const activityStreets = makeActivityStreets();
    streets.findCityIdContaining.mockResolvedValue('city-a');
    streets.findByNameAndCity.mockResolvedValue(streetRow());
    const osrm = makeOsrm([
      { streetName: 'Rua Maranhão', lengthM: 100, coordinate: [0, 0] },
      { streetName: 'Rua Maranhão', lengthM: 50, coordinate: [0, 0] },
    ]);

    const resolved = await new MapMatchingService(osrm, streets, activityStreets).matchActivityStreets(INPUT);

    expect(resolved).toEqual([
      { streetId: 'street-1', streetName: 'Rua Maranhão', cityId: 'city-a', matchedLengthM: 150, isFirstVisit: true },
    ]);
    expect(activityStreets.upsert).toHaveBeenCalledWith({
      activityId: 'activity-1',
      streetId: 'street-1',
      isFirstVisit: true,
      matchedLengthM: 150,
    });
  });

  it('keeps a homonymous street in another city as a distinct match', async () => {
    const streets = makeStreets();
    const activityStreets = makeActivityStreets();
    streets.findCityIdContaining.mockImplementation(async (lng: number) => (lng === 0 ? 'city-a' : 'city-b'));
    streets.findByNameAndCity.mockImplementation(async (cityId: string) =>
      streetRow({ id: `street-${cityId}`, city_id: cityId }),
    );
    const osrm = makeOsrm([
      { streetName: 'Rua Maranhão', lengthM: 100, coordinate: [0, 0] },
      { streetName: 'Rua Maranhão', lengthM: 40, coordinate: [10, 10] },
    ]);

    const resolved = await new MapMatchingService(osrm, streets, activityStreets).matchActivityStreets(INPUT);

    expect(resolved).toHaveLength(2);
    expect(resolved.map((street) => street.cityId).sort()).toEqual(['city-a', 'city-b']);
    expect(activityStreets.upsert).toHaveBeenCalledTimes(2);
  });

  it('marks isFirstVisit false when the user already visited the street', async () => {
    const streets = makeStreets();
    const activityStreets = makeActivityStreets();
    streets.findCityIdContaining.mockResolvedValue('city-a');
    streets.findByNameAndCity.mockResolvedValue(streetRow());
    activityStreets.hasUserVisitedStreet.mockResolvedValue(true);

    const resolved = await new MapMatchingService(
      makeOsrm([{ streetName: 'Rua Maranhão', lengthM: 100, coordinate: [0, 0] }]),
      streets,
      activityStreets,
    ).matchActivityStreets(INPUT);

    expect(resolved[0].isFirstVisit).toBe(false);
  });

  it('skips edges whose coordinate is in no known city', async () => {
    const streets = makeStreets();
    const activityStreets = makeActivityStreets();
    streets.findCityIdContaining.mockResolvedValue(null);

    const resolved = await new MapMatchingService(
      makeOsrm([{ streetName: 'Rua Maranhão', lengthM: 100, coordinate: [0, 0] }]),
      streets,
      activityStreets,
    ).matchActivityStreets(INPUT);

    expect(resolved).toEqual([]);
    expect(activityStreets.upsert).not.toHaveBeenCalled();
  });

  it('skips edges whose street name is unknown in the city', async () => {
    const streets = makeStreets();
    const activityStreets = makeActivityStreets();
    streets.findCityIdContaining.mockResolvedValue('city-a');
    streets.findByNameAndCity.mockResolvedValue(null);

    const resolved = await new MapMatchingService(
      makeOsrm([{ streetName: 'Rua Fantasma', lengthM: 100, coordinate: [0, 0] }]),
      streets,
      activityStreets,
    ).matchActivityStreets(INPUT);

    expect(resolved).toEqual([]);
    expect(activityStreets.upsert).not.toHaveBeenCalled();
  });
});
