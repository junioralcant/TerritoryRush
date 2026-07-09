import { Injectable } from '@nestjs/common';
import { ExpoPushClient } from '../ports/expo-push-client.port';
import { ExpoPushMessage } from '../notifications.types';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class HttpExpoPushClient implements ExpoPushClient {
  async send(deviceTokens: string[], message: ExpoPushMessage): Promise<void> {
    if (deviceTokens.length === 0) {
      return;
    }
    const body = deviceTokens.map((to) => ({ to, title: message.title, body: message.body }));
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Expo push failed with status ${response.status}`);
    }
  }
}
