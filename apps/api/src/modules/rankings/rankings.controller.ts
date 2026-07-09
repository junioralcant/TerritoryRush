import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { parseRankingLimit } from './parse-ranking-limit';
import { RankingsService } from './rankings.service';
import { CityRankingEntry, ExplorerRankingEntry } from './rankings.types';

@Controller('rankings')
@UseGuards(SupabaseJwtGuard)
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get('city/:cityId')
  getCityRanking(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Query('limit') limit: string | undefined,
  ): Promise<CityRankingEntry[]> {
    return this.rankingsService.getCityRanking(cityId, parseRankingLimit(limit));
  }

  @Get('explorers')
  getExplorerRanking(@Query('limit') limit: string | undefined): Promise<ExplorerRankingEntry[]> {
    return this.rankingsService.getExplorerRanking(parseRankingLimit(limit));
  }
}
