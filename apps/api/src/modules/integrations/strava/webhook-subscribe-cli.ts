import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { StravaWebhookService } from './strava-webhook.service';

/**
 * One-off operational entrypoint that registers (or reuses) the single Strava
 * push-subscription for this deployment. Requires STRAVA_CLIENT_ID/SECRET,
 * STRAVA_WEBHOOK_CALLBACK_URL (public HTTPS) and STRAVA_WEBHOOK_VERIFY_TOKEN.
 * Run: npm run strava:subscribe
 */
const run = async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const subscriptionId = await app.get(StravaWebhookService).ensureSubscription();
    process.stdout.write(`Strava webhook subscription active: ${subscriptionId}\n`);
  } finally {
    await app.close();
  }
};

if (require.main === module) {
  run().catch((error: Error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
