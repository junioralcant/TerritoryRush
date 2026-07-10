import { Bbox } from '../../services/api/types';
import { Coordinate } from './useCurrentLocation';

export const bboxAround = ([lng, lat]: Coordinate, radiusDeg = 0.09): Bbox => ({
  minLng: lng - radiusDeg,
  minLat: lat - radiusDeg,
  maxLng: lng + radiusDeg,
  maxLat: lat + radiusDeg,
});
