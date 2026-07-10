import { StreetOwnership, StreetSummary } from '../../services/api/types';
import { nearestStreetId } from './nearestStreet';

const makeStreet = (
  id: string,
  ownership: StreetOwnership,
  line: number[][],
): StreetSummary => ({
  id,
  name: id,
  cityId: 'city-1',
  ownership,
  ownerUserId: ownership === 'mine' ? 'me' : ownership === 'other' ? 'other' : null,
  geometry: { type: 'MultiLineString', coordinates: [line] },
});

// Duas vias paralelas em São Mateus/MA, ~33 m de distância uma da outra.
const MINE = makeStreet('mine', 'mine', [
  [-44.464, -4.0284],
  [-44.463, -4.0284],
]);
const FREE = makeStreet('free', 'unclaimed', [
  [-44.464, -4.0281],
  [-44.463, -4.0281],
]);

describe('nearestStreetId', () => {
  it('gruda na rua mais próxima quando o toque cai claramente sobre uma delas', () => {
    expect(nearestStreetId([MINE, FREE], [-44.4635, -4.0284])).toBe('mine');
    expect(nearestStreetId([MINE, FREE], [-44.4635, -4.0281])).toBe('free');
  });

  it('prioriza a rua do corredor quando o toque fica equidistante entre a sua e uma livre', () => {
    expect(nearestStreetId([FREE, MINE], [-44.4635, -4.02825])).toBe('mine');
  });

  it('retorna null quando não há rua dentro do raio de toque', () => {
    expect(nearestStreetId([MINE, FREE], [-44.4635, -4.03])).toBeNull();
  });

  it('retorna null para uma lista vazia de ruas', () => {
    expect(nearestStreetId([], [-44.4635, -4.0284])).toBeNull();
  });
});
