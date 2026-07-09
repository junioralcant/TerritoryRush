export type NotificationType =
  | 'street_captured'
  | 'street_lost'
  | 'top10_city'
  | 'achievement_unlocked'
  | 'new_neighborhood';

export type NotificationPayload = Record<string, unknown>;

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  payload: NotificationPayload;
};

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  payload: NotificationPayload;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
};

export type ExpoPushMessage = {
  title: string;
  body: string;
};

export type RegisterDeviceTokenInput = {
  userId: string;
  token: string;
  platform: string | null;
};
