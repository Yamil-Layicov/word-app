import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { ClockService } from '../../common/time/clock.service';

const DEFAULT_TOKEN_TTL_MINUTES = 30;
const MIN_TOKEN_TTL_MINUTES = 5;
const MAX_TOKEN_TTL_MINUTES = 60;
const TOKEN_BYTES = 32;

export type IssuedPasswordResetToken = {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
};

@Injectable()
export class PasswordResetTokenService {
  private readonly tokenTtlMinutes: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly clockService: ClockService,
  ) {
    this.tokenTtlMinutes = this.getTokenTtlMinutes();
  }

  issue(): IssuedPasswordResetToken {
    const rawToken = randomBytes(TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(
      this.clockService.now().getTime() + this.tokenTtlMinutes * 60 * 1000,
    );

    return {
      rawToken,
      tokenHash: this.hash(rawToken),
      expiresAt,
    };
  }

  hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private getTokenTtlMinutes(): number {
    const rawValue = this.configService.get<string>(
      'PASSWORD_RESET_TOKEN_TTL_MINUTES',
      String(DEFAULT_TOKEN_TTL_MINUTES),
    );
    const tokenTtlMinutes = Number(rawValue);

    if (
      !Number.isInteger(tokenTtlMinutes) ||
      tokenTtlMinutes < MIN_TOKEN_TTL_MINUTES ||
      tokenTtlMinutes > MAX_TOKEN_TTL_MINUTES
    ) {
      throw new Error(
        `PASSWORD_RESET_TOKEN_TTL_MINUTES must be an integer between ${MIN_TOKEN_TTL_MINUTES} and ${MAX_TOKEN_TTL_MINUTES}`,
      );
    }

    return tokenTtlMinutes;
  }
}
