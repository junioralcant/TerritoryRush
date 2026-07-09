import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../config/app-config.type';
import { StravaSubscriptionClient } from '../ports/strava-subscription-client.port';

const SUBSCRIPTIONS_URL = 'https://www.strava.com/api/v3/push_subscriptions';

@Injectable()
export class HttpStravaSubscriptionClient implements StravaSubscriptionClient {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private credentials(): Record<string, string> {
    return {
      client_id: this.config.get('stravaClientId', { infer: true }),
      client_secret: this.config.get('stravaClientSecret', { infer: true }),
    };
  }

  async listSubscriptions(): Promise<number[]> {
    const params = new URLSearchParams(this.credentials());
    const response = await fetch(`${SUBSCRIPTIONS_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Strava list subscriptions failed with status ${response.status}`);
    }
    const data = (await response.json()) as Array<{ id: number }>;
    return data.map((subscription) => subscription.id);
  }

  async createSubscription(callbackUrl: string, verifyToken: string): Promise<number> {
    const body = new URLSearchParams({
      ...this.credentials(),
      callback_url: callbackUrl,
      verify_token: verifyToken,
    });
    const response = await fetch(SUBSCRIPTIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      throw new Error(`Strava create subscription failed with status ${response.status}`);
    }
    const data = (await response.json()) as { id: number };
    return data.id;
  }

  async deleteSubscription(subscriptionId: number): Promise<void> {
    const params = new URLSearchParams(this.credentials());
    const response = await fetch(`${SUBSCRIPTIONS_URL}/${subscriptionId}?${params.toString()}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Strava delete subscription failed with status ${response.status}`);
    }
  }
}
