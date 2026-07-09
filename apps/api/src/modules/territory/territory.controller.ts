import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { StreetDetailService } from './street-detail.service';
import { StreetDetail } from './territory.types';

@Controller('streets')
@UseGuards(SupabaseJwtGuard)
export class TerritoryController {
  constructor(private readonly streetDetailService: StreetDetailService) {}

  @Get(':id')
  getStreet(@Param('id', ParseUUIDPipe) id: string): Promise<StreetDetail> {
    return this.streetDetailService.getStreetDetail(id);
  }
}
