import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { ClockService } from '../../common/time/clock.service';

const DEFAULT_TOKEN_TTL_HOURS = 24;
const MIN_TOKEN_TTL_HOURS = 1;
const MAX_TOKEN_TTL_HOURS = 168;
const TOKEN_BYTES = 32;

export type IssuedEmailVerificationToken = {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
};

@Injectable()
export class EmailVerificationTokenService {
  private readonly tokenTtlHours: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly clockService: ClockService,
  ) {
    this.tokenTtlHours = this.getTokenTtlHours();
  }

  issue(): IssuedEmailVerificationToken {
    const rawToken = randomBytes(TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(
      this.clockService.now().getTime() + this.tokenTtlHours * 60 * 60 * 1_000,
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

  private getTokenTtlHours(): number {
    const rawValue = this.configService.get<string>(
      'EMAIL_VERIFICATION_TOKEN_TTL_HOURS',
      String(DEFAULT_TOKEN_TTL_HOURS),
    );
    const tokenTtlHours = Number(rawValue);

    if (
      !Number.isInteger(tokenTtlHours) ||
      tokenTtlHours < MIN_TOKEN_TTL_HOURS ||
      tokenTtlHours > MAX_TOKEN_TTL_HOURS
    ) {
      throw new Error(
        `EMAIL_VERIFICATION_TOKEN_TTL_HOURS must be an integer between ${MIN_TOKEN_TTL_HOURS} and ${MAX_TOKEN_TTL_HOURS}`,
      );
    }

    return tokenTtlHours;
  }
}
