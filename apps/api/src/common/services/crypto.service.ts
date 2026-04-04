import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly encryptionKey: string;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private configService: ConfigService) {
    this.encryptionKey = this.configService.get<string>(
      'ENCRYPTION_KEY',
      crypto.randomBytes(32).toString('hex'),
    );
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateNumericCode(length = 6): string {
    const max = Math.pow(10, length);
    const code = crypto.randomInt(0, max);
    return code.toString().padStart(length, '0');
  }

  encrypt(text: string): string {
    const key = Buffer.from(this.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const key = Buffer.from(this.encryptionKey, 'hex');
    const iv = Buffer.from(ivHex!, 'hex');
    const authTag = Buffer.from(authTagHex!, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  generateHmac(data: string, secret?: string): string {
    const key = secret || this.encryptionKey;
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  verifyHmac(data: string, signature: string, secret?: string): boolean {
    const expected = this.generateHmac(data, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}
