import { AuthUser } from '../auth.types';

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

/**
 * Contract for verifying an inbound bearer token and resolving the authenticated
 * user. Implementations must throw `UnauthorizedException` for absent, malformed,
 * expired or otherwise invalid tokens.
 */
export interface TokenVerifier {
  verify(token: string): AuthUser;
}
