import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HttpExpoPushClient } from './clients/http-expo-push.client';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EXPO_PUSH_CLIENT } from './ports/expo-push-client.port';
import { NOTIFICATION_REPOSITORY } from './ports/notification-repository.port';
import { PgNotificationRepository } from './repositories/notification.repository';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: NOTIFICATION_REPOSITORY, useClass: PgNotificationRepository },
    { provide: EXPO_PUSH_CLIENT, useClass: HttpExpoPushClient },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
