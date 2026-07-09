import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../config/app-config.type';
import { AesTokenCipher } from './aes-token-cipher';

const VALID_KEY = 'a'.repeat(64);

const makeCipher = (key: string): AesTokenCipher =>
  new AesTokenCipher({ get: () => key } as unknown as ConfigService<AppConfig, true>);

describe('AesTokenCipher', () => {
  it('round-trips a token', () => {
    const cipher = makeCipher(VALID_KEY);
    const ciphertext = cipher.encrypt('strava-access-token');

    expect(ciphertext).not.toBe('strava-access-token');
    expect(cipher.decrypt(ciphertext)).toBe('strava-access-token');
  });

  it('produces distinct ciphertexts for the same plaintext (random IV)', () => {
    const cipher = makeCipher(VALID_KEY);

    expect(cipher.encrypt('same')).not.toBe(cipher.encrypt('same'));
  });

  it('rejects a tampered ciphertext', () => {
    const cipher = makeCipher(VALID_KEY);
    const raw = Buffer.from(cipher.encrypt('secret'), 'base64');
    raw[raw.length - 1] ^= 0x01;

    expect(() => cipher.decrypt(raw.toString('base64'))).toThrow();
  });

  it('rejects an invalid key', () => {
    expect(() => makeCipher('too-short').encrypt('x')).toThrow('TOKEN_ENCRYPTION_KEY');
  });
});
