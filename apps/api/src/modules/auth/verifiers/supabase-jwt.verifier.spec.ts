import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';
import * as jose from 'jose';
import { AppConfig } from '../../../config/app-config.type';
import { SupabaseJwtVerifier } from './supabase-jwt.verifier';

jest.mock('jose', () => {
  const actual = jest.requireActual('jose');
  return { ...actual, createRemoteJWKSet: jest.fn() };
});

const SECRET = 'test-secret-value-at-least-32-characters-long';
const AUD = 'authenticated';

const config = (overrides: Partial<Record<keyof AppConfig, string>> = {}): ConfigService<AppConfig, true> =>
  ({
    get: (key: keyof AppConfig) =>
      ({ supabaseJwtSecret: SECRET, supabaseJwtAud: AUD, supabaseUrl: '', ...overrides })[key] ?? '',
  }) as unknown as ConfigService<AppConfig, true>;

const makeVerifier = (overrides?: Partial<Record<keyof AppConfig, string>>): SupabaseJwtVerifier =>
  new SupabaseJwtVerifier(config(overrides));

const signHs256 = (
  payload: Record<string, unknown>,
  overrides: { secret?: string; audience?: string; expiresInSeconds?: number } = {},
): string =>
  sign(payload, overrides.secret ?? SECRET, {
    algorithm: 'HS256',
    audience: overrides.audience ?? AUD,
    expiresIn: overrides.expiresInSeconds ?? 3600,
  });

describe('SupabaseJwtVerifier', () => {
  afterEach(() => jest.clearAllMocks());

  describe('HS256 (shared secret)', () => {
    it('resolves the authenticated user from a valid token', async () => {
      await expect(makeVerifier().verify(signHs256({ sub: 'user-1', email: 'junior@example.com' }))).resolves.toEqual({
        id: 'user-1',
        email: 'junior@example.com',
      });
    });

    it('returns a null email when the token carries no email claim', async () => {
      await expect(makeVerifier().verify(signHs256({ sub: 'user-2' }))).resolves.toEqual({ id: 'user-2', email: null });
    });

    it('rejects an empty token', async () => {
      await expect(makeVerifier().verify('')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired token', async () => {
      await expect(makeVerifier().verify(signHs256({ sub: 'user-3' }, { expiresInSeconds: -3600 }))).rejects.toThrow(
        'Authentication token expired',
      );
    });

    it('rejects a token signed with a different secret', async () => {
      const token = signHs256({ sub: 'user-4' }, { secret: 'another-secret-value-32-characters-x' });
      await expect(makeVerifier().verify(token)).rejects.toThrow('Invalid authentication token');
    });

    it('rejects a token with the wrong audience', async () => {
      await expect(makeVerifier().verify(signHs256({ sub: 'user-5' }, { audience: 'anon' }))).rejects.toThrow(
        'Invalid authentication token',
      );
    });

    it('rejects a token without a subject', async () => {
      await expect(makeVerifier().verify(signHs256({ email: 'no-sub@example.com' }))).rejects.toThrow(
        'Authentication token has no subject',
      );
    });
  });

  describe('ES256 (asymmetric / JWKS)', () => {
    it('verifies a token signed with the project ECC key via JWKS', async () => {
      const { publicKey, privateKey } = await jose.generateKeyPair('ES256');
      const jwk = { ...(await jose.exportJWK(publicKey)), alg: 'ES256', kid: 'current-key' };
      (jose.createRemoteJWKSet as jest.Mock).mockReturnValue(jose.createLocalJWKSet({ keys: [jwk] }));

      const token = await new jose.SignJWT({ email: 'ana@example.com' })
        .setProtectedHeader({ alg: 'ES256', kid: 'current-key' })
        .setSubject('user-es')
        .setAudience(AUD)
        .setExpirationTime('1h')
        .sign(privateKey);

      const verifier = makeVerifier({ supabaseUrl: 'https://project.supabase.co', supabaseJwtSecret: '' });
      await expect(verifier.verify(token)).resolves.toEqual({ id: 'user-es', email: 'ana@example.com' });
    });
  });
});
