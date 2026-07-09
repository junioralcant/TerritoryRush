import {
  CreateNotificationInput,
  NotificationRecord,
  NotificationType,
  RegisterDeviceTokenInput,
  UnsentNotification,
} from '../notifications.types';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<string>;
  markSent(id: string): Promise<void>;
  markRead(userId: string, id: string): Promise<boolean>;
  findUnsent(limit: number): Promise<UnsentNotification[]>;
  listForUser(userId: string): Promise<NotificationRecord[]>;
  findDeviceTokens(userId: string): Promise<string[]>;
  upsertDeviceToken(input: RegisterDeviceTokenInput): Promise<void>;
  hasNotificationForCity(userId: string, type: NotificationType, cityId: string): Promise<boolean>;
}
