import { Body, Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SupabaseJwtGuard } from '../../auth/guards/supabase-jwt.guard';
import { ConnectStravaDto } from './dto/connect-strava.dto';
import { StravaConnectionService } from './strava-connection.service';
import { StravaSyncService } from './strava-sync.service';
import { StravaConnectionState, StravaSyncResult } from './strava.types';

@Controller('integrations/strava')
@UseGuards(SupabaseJwtGuard)
export class IntegrationsStravaController {
  constructor(
    private readonly connectionService: StravaConnectionService,
    private readonly syncService: StravaSyncService,
  ) {}

  @Get()
  getConnection(@CurrentUser() user: AuthUser): Promise<StravaConnectionState> {
    return this.connectionService.getConnectionState(user.id);
  }

  @Post('connect')
  connect(@CurrentUser() user: AuthUser, @Body() body: ConnectStravaDto): Promise<StravaConnectionState> {
    return this.connectionService.connect(user.id, body.code);
  }

  @Post('sync')
  @HttpCode(200)
  sync(@CurrentUser() user: AuthUser): Promise<StravaSyncResult> {
    return this.syncService.syncRecentActivities(user.id);
  }

  @Delete('disconnect')
  @HttpCode(204)
  disconnect(@CurrentUser() user: AuthUser): Promise<void> {
    return this.connectionService.disconnect(user.id);
  }
}
