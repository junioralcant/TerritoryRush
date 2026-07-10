import { StreetOwnership, StreetSummary } from '../../services/api/types';
import { Coordinate } from './useCurrentLocation';

// Toque tolerante: em vez de exigir o toque exato sobre a linha, pega a rua mais
// próxima dentro do raio, com um "desconto" para as ruas do próprio corredor —
// assim, em cruzamentos onde um trecho seu encosta num trecho livre, o toque cai
// na sua rua. Ver docs/plano-uniao-segmentos-ruas.md para a correção de dados.
const MAX_SNAP_METERS = 35;
const OWNERSHIP_BONUS_METERS: Record<StreetOwnership, number> = { mine: 15, other: 8, unclaimed: 0 };

const M_PER_DEG_LAT = 111320;

const pointToSegmentMeters = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
};

const distanceToStreetMeters = (street: StreetSummary, lng: number, lat: number): number => {
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const toX = (value: number): number => value * mPerDegLng;
  const toY = (value: number): number => value * M_PER_DEG_LAT;
  const px = toX(lng);
  const py = toY(lat);

  let min = Infinity;
  for (const line of street.geometry.coordinates) {
    for (let i = 1; i < line.length; i += 1) {
      const distance = pointToSegmentMeters(
        px,
        py,
        toX(line[i - 1][0]),
        toY(line[i - 1][1]),
        toX(line[i][0]),
        toY(line[i][1]),
      );
      if (distance < min) {
        min = distance;
      }
    }
  }
  return min;
};

export const nearestStreetId = (streets: StreetSummary[], [lng, lat]: Coordinate): string | null => {
  let bestId: string | null = null;
  let bestScore = Infinity;
  for (const street of streets) {
    const distance = distanceToStreetMeters(street, lng, lat);
    if (distance > MAX_SNAP_METERS) {
      continue;
    }
    const score = distance - OWNERSHIP_BONUS_METERS[street.ownership];
    if (score < bestScore) {
      bestScore = score;
      bestId = street.id;
    }
  }
  return bestId;
};
