import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { GeoService } from './geo.service';
import { StreetSummary } from './geo.types';

@Controller('streets')
@UseGuards(SupabaseJwtGuard)
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get()
  getStreetsInBbox(
    @Query('bbox') bbox: string | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<StreetSummary[]> {
    return this.geoService.findStreetsInBbox(bbox, user.id);
  }
}
