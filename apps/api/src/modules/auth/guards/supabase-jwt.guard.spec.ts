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
  it('verifies the bearer token and attaches the user to the request', async () => {
    const verify = jest.fn().mockResolvedValue(USER);
    const { context, request } = makeContext('Bearer valid-token');

    await expect(makeGuard(verify).canActivate(context)).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith('valid-token');
    expect(request.user).toEqual(USER);
  });

  it('rejects a request without an Authorization header', async () => {
    const verify = jest.fn();
    const { context } = makeContext(undefined);

    await expect(makeGuard(verify).canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects a non-bearer Authorization scheme', async () => {
    const verify = jest.fn();
    const { context } = makeContext('Basic abc123');

    await expect(makeGuard(verify).canActivate(context)).rejects.toThrow('Bearer token');
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects a bearer scheme with no token', async () => {
    const verify = jest.fn();
    const { context } = makeContext('Bearer');

    await expect(makeGuard(verify).canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });

  it('propagates the verifier rejection for an invalid token', async () => {
    const verify = jest.fn().mockRejectedValue(new UnauthorizedException('Invalid authentication token'));
    const { context } = makeContext('Bearer bad-token');

    await expect(makeGuard(verify).canActivate(context)).rejects.toThrow('Invalid authentication token');
  });
});
