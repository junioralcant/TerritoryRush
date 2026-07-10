import { AuthUser } from '../auth.types';

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

/**
 * Contract for verifying an inbound bearer token and resolving the authenticated
 * user. Implementations must reject with `UnauthorizedException` for absent,
 * malformed, expired or otherwise invalid tokens. Async because asymmetric
 * (JWKS) verification may fetch signing keys.
 */
export interface TokenVerifier {
  verify(token: string): Promise<AuthUser>;
}
