import { Module } from '@nestjs/common';
import { GeoModule } from '../geo/geo.module';
import { HttpOsrmClient } from './clients/http-osrm.client';
import { MapMatchingService } from './matching.service';
import { ACTIVITY_STREET_REPOSITORY } from './ports/activity-street-repository.port';
import { OSRM_CLIENT } from './ports/osrm-client.port';
import { PgActivityStreetRepository } from './repositories/activity-street.repository';

@Module({
  imports: [GeoModule],
  providers: [
    MapMatchingService,
    { provide: OSRM_CLIENT, useClass: HttpOsrmClient },
    { provide: ACTIVITY_STREET_REPOSITORY, useClass: PgActivityStreetRepository },
  ],
  exports: [MapMatchingService, ACTIVITY_STREET_REPOSITORY],
})
export class MatchingModule {}
