import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonWebTokenError, TokenExpiredError, verify } from 'jsonwebtoken';
import { AppConfig } from '../../../config/app-config.type';
import { AuthUser, SupabaseJwtClaims } from '../auth.types';
import { TokenVerifier } from '../ports/token-verifier.port';

@Injectable()
export class SupabaseJwtVerifier implements TokenVerifier {
  private readonly secret: string;
  private readonly audience: string;

  constructor(config: ConfigService<AppConfig, true>) {
    this.secret = config.get('supabaseJwtSecret', { infer: true });
    this.audience = config.get('supabaseJwtAud', { infer: true });
  }

  verify(token: string): AuthUser {
    if (!token || token.trim() === '') {
      throw new UnauthorizedException('Missing authentication token');
    }

    let claims: SupabaseJwtClaims;
    try {
      claims = verify(token, this.secret, {
        audience: this.audience,
        algorithms: ['HS256'],
      }) as SupabaseJwtClaims;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Authentication token expired');
      }
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid authentication token');
      }
      throw new UnauthorizedException('Could not verify authentication token');
    }

    if (!claims.sub) {
      throw new UnauthorizedException('Authentication token has no subject');
    }

    return { id: claims.sub, email: claims.email ?? null };
  }
}
