import { ForbiddenException } from '@nestjs/common';
import { resolveWebhookChallenge } from './webhook-challenge';

const VERIFY_TOKEN = 'territory-rush-verify';

describe('resolveWebhookChallenge', () => {
  it('echoes the challenge when mode and verify token are valid', () => {
    const result = resolveWebhookChallenge(
      { 'hub.mode': 'subscribe', 'hub.verify_token': VERIFY_TOKEN, 'hub.challenge': 'abc123' },
      VERIFY_TOKEN,
    );

    expect(result).toEqual({ 'hub.challenge': 'abc123' });
  });

  it('rejects a non-subscribe mode', () => {
    expect(() =>
      resolveWebhookChallenge(
        { 'hub.mode': 'unsubscribe', 'hub.verify_token': VERIFY_TOKEN, 'hub.challenge': 'abc' },
        VERIFY_TOKEN,
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects a missing challenge', () => {
    expect(() =>
      resolveWebhookChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': VERIFY_TOKEN }, VERIFY_TOKEN),
    ).toThrow(ForbiddenException);
  });

  it('rejects a verify token mismatch', () => {
    expect(() =>
      resolveWebhookChallenge(
        { 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': 'abc' },
        VERIFY_TOKEN,
      ),
    ).toThrow('verify token mismatch');
  });

  it('rejects when the expected verify token is not configured', () => {
    expect(() =>
      resolveWebhookChallenge(
        { 'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': 'abc' },
        '',
      ),
    ).toThrow(ForbiddenException);
  });
});
