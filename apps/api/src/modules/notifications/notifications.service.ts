import { Inject, Injectable, Logger } from '@nestjs/common';
import { EXPO_PUSH_CLIENT, ExpoPushClient } from './ports/expo-push-client.port';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from './ports/notification-repository.port';
import { buildPushMessage } from './push-message';
import {
  NotificationPayload,
  NotificationRecord,
  NotificationType,
  RegisterDeviceTokenInput,
} from './notifications.types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(EXPO_PUSH_CLIENT) private readonly push: ExpoPushClient,
  ) {}

  async notify(userId: string, type: NotificationType, payload: NotificationPayload): Promise<void> {
    const id = await this.notifications.create({ userId, type, payload });
    await this.dispatch(userId, id, type, payload);
  }

  async notifyCityOnce(
    userId: string,
    type: NotificationType,
    cityId: string,
    payload: NotificationPayload,
  ): Promise<void> {
    if (await this.notifications.hasNotificationForCity(userId, type, cityId)) {
      return;
    }
    await this.notify(userId, type, payload);
  }

  listNotifications(userId: string): Promise<NotificationRecord[]> {
    return this.notifications.listForUser(userId);
  }

  async retryUnsent(limit = 100): Promise<void> {
    const unsent = await this.notifications.findUnsent(limit);
    for (const notification of unsent) {
      await this.dispatch(notification.userId, notification.id, notification.type, notification.payload);
    }
  }

  registerDeviceToken(input: RegisterDeviceTokenInput): Promise<void> {
    return this.notifications.upsertDeviceToken(input);
  }

  private async dispatch(
    userId: string,
    notificationId: string,
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<void> {
    const tokens = await this.notifications.findDeviceTokens(userId);
    if (tokens.length === 0) {
      return;
    }
    try {
      await this.push.send(tokens, buildPushMessage(type, payload));
      await this.notifications.markSent(notificationId);
    } catch (error) {
      this.logger.warn(`Push dispatch failed for notification ${notificationId}: ${(error as Error).message}`);
    }
  }
}
