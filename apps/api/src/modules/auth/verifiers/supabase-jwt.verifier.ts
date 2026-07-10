import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, decodeProtectedHeader, errors, JWTVerifyGetKey, jwtVerify } from 'jose';
import { AppConfig } from '../../../config/app-config.type';
import { AuthUser, SupabaseJwtClaims } from '../auth.types';
import { TokenVerifier } from '../ports/token-verifier.port';

const SYMMETRIC_ALGORITHMS = ['HS256'];
const ASYMMETRIC_ALGORITHMS = ['ES256', 'RS256'];

@Injectable()
export class SupabaseJwtVerifier implements TokenVerifier {
  private readonly secret: string;
  private readonly audience: string;
  private readonly supabaseUrl: string;
  private jwks?: JWTVerifyGetKey;

  constructor(config: ConfigService<AppConfig, true>) {
    this.secret = config.get('supabaseJwtSecret', { infer: true });
    this.audience = config.get('supabaseJwtAud', { infer: true });
    this.supabaseUrl = config.get('supabaseUrl', { infer: true });
  }

  async verify(token: string): Promise<AuthUser> {
    if (!token || token.trim() === '') {
      throw new UnauthorizedException('Missing authentication token');
    }

    let algorithm: string;
    try {
      algorithm = decodeProtectedHeader(token).alg ?? '';
    } catch {
      throw new UnauthorizedException('Invalid authentication token');
    }

    let claims: SupabaseJwtClaims;
    try {
      if (SYMMETRIC_ALGORITHMS.includes(algorithm)) {
        claims = await this.verifyWithSecret(token);
      } else if (ASYMMETRIC_ALGORITHMS.includes(algorithm)) {
        claims = await this.verifyWithJwks(token);
      } else {
        throw new UnauthorizedException(`Unsupported token algorithm: ${algorithm || 'none'}`);
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof errors.JWTExpired) {
        throw new UnauthorizedException('Authentication token expired');
      }
      throw new UnauthorizedException('Invalid authentication token');
    }

    if (!claims.sub) {
      throw new UnauthorizedException('Authentication token has no subject');
    }
    return { id: claims.sub, email: claims.email ?? null };
  }

  private async verifyWithSecret(token: string): Promise<SupabaseJwtClaims> {
    if (!this.secret) {
      throw new UnauthorizedException('HS256 verification is not configured');
    }
    const { payload } = await jwtVerify(token, new TextEncoder().encode(this.secret), {
      algorithms: SYMMETRIC_ALGORITHMS,
      audience: this.audience,
    });
    return payload as SupabaseJwtClaims;
  }

  private async verifyWithJwks(token: string): Promise<SupabaseJwtClaims> {
    const { payload } = await jwtVerify(token, this.resolveJwks(), {
      algorithms: ASYMMETRIC_ALGORITHMS,
      audience: this.audience,
    });
    return payload as SupabaseJwtClaims;
  }

  private resolveJwks(): JWTVerifyGetKey {
    if (!this.jwks) {
      if (!this.supabaseUrl) {
        throw new UnauthorizedException('JWKS verification is not configured (missing SUPABASE_URL)');
      }
      this.jwks = createRemoteJWKSet(new URL(`${this.supabaseUrl}/auth/v1/.well-known/jwks.json`));
    }
    return this.jwks;
  }
}
