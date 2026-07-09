import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../auth.types';
import { TOKEN_VERIFIER, TokenVerifier } from '../ports/token-verifier.port';

export type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.header('authorization'));
    request.user = this.tokenVerifier.verify(token);
    return true;
  }

  private extractBearerToken(header: string | undefined): string {
    if (!header) {
      throw new UnauthorizedException('Missing Authorization header');
    }
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Authorization header must be a Bearer token');
    }
    return token;
  }
}
