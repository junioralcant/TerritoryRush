import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { NotificationsService } from './notifications.service';
import { NotificationRecord } from './notifications.types';

@Controller('me')
@UseGuards(SupabaseJwtGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  listNotifications(@CurrentUser() user: AuthUser): Promise<NotificationRecord[]> {
    return this.notificationsService.listNotifications(user.id);
  }

  @Post('notifications/:id/read')
  @HttpCode(204)
  async markRead(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    const marked = await this.notificationsService.markRead(user.id, id);
    if (!marked) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
  }

  @Post('device-tokens')
  @HttpCode(204)
  registerDeviceToken(@CurrentUser() user: AuthUser, @Body() body: RegisterDeviceTokenDto): Promise<void> {
    return this.notificationsService.registerDeviceToken({
      userId: user.id,
      token: body.token,
      platform: body.platform ?? null,
    });
  }
}
