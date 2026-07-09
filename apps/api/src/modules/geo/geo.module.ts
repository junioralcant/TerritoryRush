import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { STREET_REPOSITORY } from './ports/street-repository.port';
import { PgStreetRepository } from './repositories/street.repository';

@Module({
  imports: [AuthModule],
  controllers: [GeoController],
  providers: [
    GeoService,
    { provide: STREET_REPOSITORY, useClass: PgStreetRepository },
  ],
  exports: [GeoService, STREET_REPOSITORY],
})
export class GeoModule {}
