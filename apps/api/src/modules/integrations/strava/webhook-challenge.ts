import { ForbiddenException } from '@nestjs/common';
import { StravaWebhookValidationResponse } from './strava.types';

/**
 * Validates Strava's GET webhook handshake and echoes the challenge. Strava sends
 * `hub.mode=subscribe`, `hub.verify_token` and `hub.challenge`; we only echo when
 * the verify token matches the one we configured for our subscription.
 */
export const resolveWebhookChallenge = (
  query: Record<string, string | undefined>,
  expectedVerifyToken: string,
): StravaWebhookValidationResponse => {
  const mode = query['hub.mode'];
  const verifyToken = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode !== 'subscribe' || !challenge) {
    throw new ForbiddenException('Invalid webhook verification request');
  }
  if (!expectedVerifyToken || verifyToken !== expectedVerifyToken) {
    throw new ForbiddenException('Webhook verify token mismatch');
  }

  return { 'hub.challenge': challenge };
};
