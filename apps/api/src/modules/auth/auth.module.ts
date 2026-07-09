import { Module } from '@nestjs/common';
import { SupabaseJwtGuard } from './guards/supabase-jwt.guard';
import { TOKEN_VERIFIER } from './ports/token-verifier.port';
import { SupabaseJwtVerifier } from './verifiers/supabase-jwt.verifier';

@Module({
  providers: [
    { provide: TOKEN_VERIFIER, useClass: SupabaseJwtVerifier },
    SupabaseJwtGuard,
  ],
  exports: [TOKEN_VERIFIER, SupabaseJwtGuard],
})
export class AuthModule {}
