import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';
import { AppConfig } from '../../../config/app-config.type';
import { SupabaseJwtVerifier } from './supabase-jwt.verifier';

const SECRET = 'test-secret-value-at-least-32-characters-long';
const AUD = 'authenticated';

const makeConfig = (): ConfigService<AppConfig, true> =>
  ({
    get: (key: keyof AppConfig) => (key === 'supabaseJwtSecret' ? SECRET : AUD),
  }) as unknown as ConfigService<AppConfig, true>;

const makeVerifier = (): SupabaseJwtVerifier => new SupabaseJwtVerifier(makeConfig());

const signToken = (
  payload: Record<string, unknown>,
  overrides: { secret?: string; audience?: string; expiresInSeconds?: number } = {},
): string =>
  sign(payload, overrides.secret ?? SECRET, {
    algorithm: 'HS256',
    audience: overrides.audience ?? AUD,
    expiresIn: overrides.expiresInSeconds ?? 3600,
  });

describe('SupabaseJwtVerifier', () => {
  it('resolves the authenticated user from a valid token', () => {
    const token = signToken({ sub: 'user-1', email: 'junior@example.com' });

    expect(makeVerifier().verify(token)).toEqual({
      id: 'user-1',
      email: 'junior@example.com',
    });
  });

  it('returns a null email when the token carries no email claim', () => {
    const token = signToken({ sub: 'user-2' });

    expect(makeVerifier().verify(token)).toEqual({ id: 'user-2', email: null });
  });

  it('rejects an empty token', () => {
    expect(() => makeVerifier().verify('')).toThrow(UnauthorizedException);
  });

  it('rejects an expired token', () => {
    const token = signToken({ sub: 'user-3' }, { expiresInSeconds: -3600 });

    expect(() => makeVerifier().verify(token)).toThrow('Authentication token expired');
  });

  it('rejects a token signed with a different secret', () => {
    const token = signToken({ sub: 'user-4' }, { secret: 'another-secret-value-32-characters-x' });

    expect(() => makeVerifier().verify(token)).toThrow('Invalid authentication token');
  });

  it('rejects a token with the wrong audience', () => {
    const token = signToken({ sub: 'user-5' }, { audience: 'anon' });

    expect(() => makeVerifier().verify(token)).toThrow('Invalid authentication token');
  });

  it('rejects a token without a subject', () => {
    const token = signToken({ email: 'no-sub@example.com' });

    expect(() => makeVerifier().verify(token)).toThrow('Authentication token has no subject');
  });
});
