import { BadRequestException } from '@nestjs/common';
import { Bbox } from './geo.types';

export const parseBbox = (raw: string | undefined): Bbox => {
  if (!raw || raw.trim() === '') {
    throw new BadRequestException('Missing required query parameter: bbox');
  }

  const parts = raw.split(',').map((part) => part.trim());
  if (parts.length !== 4) {
    throw new BadRequestException('bbox must be "minLng,minLat,maxLng,maxLat"');
  }

  const [minLng, minLat, maxLng, maxLat] = parts.map(Number);
  if ([minLng, minLat, maxLng, maxLat].some((value) => !Number.isFinite(value))) {
    throw new BadRequestException('bbox coordinates must be finite numbers');
  }
  if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) {
    throw new BadRequestException('bbox coordinates are out of range');
  }
  if (minLng >= maxLng || minLat >= maxLat) {
    throw new BadRequestException('bbox min must be strictly less than max');
  }

  return { minLng, minLat, maxLng, maxLat };
};
