import { OsrmMatchResponse } from './matching.types';
import { toMatchedEdges } from './osrm-response';

describe('toMatchedEdges', () => {
  it('flattens matchings/legs/steps into matched edges', () => {
    const response: OsrmMatchResponse = {
      code: 'Ok',
      matchings: [
        {
          legs: [
            {
              steps: [
                { name: 'Rua Maranhão', distance: 120, geometry: { coordinates: [[-46.63, -23.55]] } },
                { name: 'Avenida Brasil', distance: 80, geometry: { coordinates: [[-46.64, -23.56]] } },
              ],
            },
          ],
        },
      ],
    };

    expect(toMatchedEdges(response)).toEqual([
      { streetName: 'Rua Maranhão', lengthM: 120, coordinate: [-46.63, -23.55] },
      { streetName: 'Avenida Brasil', lengthM: 80, coordinate: [-46.64, -23.56] },
    ]);
  });

  it('skips steps without a geometry coordinate and defaults name/length', () => {
    const response: OsrmMatchResponse = {
      code: 'Ok',
      matchings: [
        {
          legs: [
            {
              steps: [
                { name: 'A', distance: 10 },
                { geometry: { coordinates: [[1, 2]] } },
              ],
            },
          ],
        },
      ],
    };

    expect(toMatchedEdges(response)).toEqual([{ streetName: '', lengthM: 0, coordinate: [1, 2] }]);
  });

  it('returns an empty list when there are no matchings', () => {
    expect(toMatchedEdges({ code: 'NoMatch' })).toEqual([]);
  });
});
