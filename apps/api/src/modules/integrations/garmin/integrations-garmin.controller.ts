import { Body, Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SupabaseJwtGuard } from '../../auth/guards/supabase-jwt.guard';
import { ConnectGarminDto } from './dto/connect-garmin.dto';
import { GarminConnectionService } from './garmin-connection.service';
import { GarminFlagGuard } from './garmin-flag.guard';
import { GarminConnectionState } from './garmin.types';

@Controller('integrations/garmin')
@UseGuards(GarminFlagGuard, SupabaseJwtGuard)
export class IntegrationsGarminController {
  constructor(private readonly connectionService: GarminConnectionService) {}

  @Get()
  getConnection(@CurrentUser() user: AuthUser): Promise<GarminConnectionState> {
    return this.connectionService.getConnectionState(user.id);
  }

  @Post('connect')
  connect(@CurrentUser() user: AuthUser, @Body() body: ConnectGarminDto): Promise<GarminConnectionState> {
    return this.connectionService.connect(user.id, body.code, body.codeVerifier);
  }

  @Delete('disconnect')
  @HttpCode(204)
  disconnect(@CurrentUser() user: AuthUser): Promise<void> {
    return this.connectionService.disconnect(user.id);
  }
}
