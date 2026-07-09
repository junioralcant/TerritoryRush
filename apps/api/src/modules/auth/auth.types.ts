export type AuthUser = {
  id: string;
  email: string | null;
};

export type SupabaseJwtClaims = {
  sub: string;
  email?: string;
  aud?: string | string[];
  role?: string;
  exp?: number;
  iat?: number;
};
