export const TOKEN_CIPHER = Symbol('TOKEN_CIPHER');

/**
 * Symmetric encryption of provider tokens at rest — the local stand-in for
 * Supabase Vault. Implementations must authenticate the ciphertext (detect
 * tampering) and round-trip: decrypt(encrypt(x)) === x.
 */
export interface TokenCipher {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
}
