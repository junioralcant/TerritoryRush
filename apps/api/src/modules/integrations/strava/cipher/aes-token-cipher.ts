import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AppConfig } from '../../../../config/app-config.type';
import { TokenCipher } from '../ports/token-cipher.port';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

@Injectable()
export class AesTokenCipher implements TokenCipher {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private key(): Buffer {
    const hex = this.config.get('tokenEncryptionKey', { infer: true });
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters');
    }
    return Buffer.from(hex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    const raw = Buffer.from(ciphertext, 'base64');
    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
