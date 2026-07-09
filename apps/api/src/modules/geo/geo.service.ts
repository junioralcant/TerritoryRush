import { Inject, Injectable } from '@nestjs/common';
import { StreetSummary } from './geo.types';
import { parseBbox } from './parse-bbox';
import { STREET_REPOSITORY, StreetRepository } from './ports/street-repository.port';
import { toStreetSummary } from './street-response';

export const STREETS_BBOX_LIMIT = 5000;

@Injectable()
export class GeoService {
  constructor(
    @Inject(STREET_REPOSITORY) private readonly streets: StreetRepository,
  ) {}

  async findStreetsInBbox(bboxParam: string | undefined, requestingUserId: string): Promise<StreetSummary[]> {
    const bbox = parseBbox(bboxParam);
    const rows = await this.streets.findInBbox(bbox, STREETS_BBOX_LIMIT);
    return rows.map((row) => toStreetSummary(row, requestingUserId));
  }
}
