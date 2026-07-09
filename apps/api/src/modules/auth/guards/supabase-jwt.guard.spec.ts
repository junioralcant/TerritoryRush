import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthUser } from '../auth.types';
import { TokenVerifier } from '../ports/token-verifier.port';
import { AuthenticatedRequest, SupabaseJwtGuard } from './supabase-jwt.guard';

const USER: AuthUser = { id: 'user-1', email: 'junior@example.com' };

const makeContext = (
  authorization: string | undefined,
): { context: ExecutionContext; request: AuthenticatedRequest } => {
  const request = {
    header: (name: string) =>
      name.toLowerCase() === 'authorization' ? authorization : undefined,
  } as unknown as AuthenticatedRequest;

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, request };
};

const makeGuard = (verify: TokenVerifier['verify']): SupabaseJwtGuard =>
  new SupabaseJwtGuard({ verify });

describe('SupabaseJwtGuard', () => {
  it('verifies the bearer token and attaches the user to the request', () => {
    const verify = jest.fn().mockReturnValue(USER);
    const { context, request } = makeContext('Bearer valid-token');

    expect(makeGuard(verify).canActivate(context)).toBe(true);
    expect(verify).toHaveBeenCalledWith('valid-token');
    expect(request.user).toEqual(USER);
  });

  it('rejects a request without an Authorization header', () => {
    const verify = jest.fn();
    const { context } = makeContext(undefined);

    expect(() => makeGuard(verify).canActivate(context)).toThrow(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects a non-bearer Authorization scheme', () => {
    const verify = jest.fn();
    const { context } = makeContext('Basic abc123');

    expect(() => makeGuard(verify).canActivate(context)).toThrow('Bearer token');
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects a bearer scheme with no token', () => {
    const verify = jest.fn();
    const { context } = makeContext('Bearer');

    expect(() => makeGuard(verify).canActivate(context)).toThrow(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });

  it('propagates the verifier rejection for an invalid token', () => {
    const verify = jest.fn().mockImplementation(() => {
      throw new UnauthorizedException('Invalid authentication token');
    });
    const { context } = makeContext('Bearer bad-token');

    expect(() => makeGuard(verify).canActivate(context)).toThrow('Invalid authentication token');
  });
});
