import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { ClockService } from '../../common/time/clock.service';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

type JwtExpiresIn = JwtSignOptions['expiresIn'];

@Injectable()
export class AuthTokenService {
  private readonly jwtAccessSecret: string;
  private readonly jwtAccessExpiresIn: JwtExpiresIn;
  private readonly refreshTokenHashSecret: string;
  private readonly refreshTokenExpiresInDays: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly clockService: ClockService,
  ) {
    this.jwtAccessSecret = this.getRequiredConfig('JWT_ACCESS_SECRET');
    this.jwtAccessExpiresIn = this.getJwtAccessExpiresIn();
    this.refreshTokenHashSecret = this.getRequiredConfig(
      'REFRESH_TOKEN_HASH_SECRET',
    );
    this.refreshTokenExpiresInDays = this.getRefreshTokenExpiresInDays();
  }

  async generateAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.jwtAccessSecret,
      expiresIn: this.jwtAccessExpiresIn,
    });
  }

  async verifyAccessToken(accessToken: string): Promise<AccessTokenPayload> {
    const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(
      accessToken,
      {
        secret: this.jwtAccessSecret,
      },
    );

    if (!this.isAccessTokenPayload(payload)) {
      throw new Error('Invalid access token payload');
    }

    return payload;
  }

  generateSessionId(): string {
    return randomUUID();
  }

  generateRefreshToken(sessionId: string): string {
    const randomSecret = randomBytes(64).toString('base64url');

    return `${sessionId}.${randomSecret}`;
  }

  getSessionIdFromRefreshToken(refreshToken: string): string | null {
    /**
     * Refresh token format: sessionId.randomSecret
     * randomSecret uses base64url, which does not contain dots.
     * Therefore splitting by "." is safe for this token format.
     */
    const parts = refreshToken.split('.');

    if (parts.length !== 2) {
      return null;
    }

    const [sessionId, secret] = parts;

    if (!sessionId || !secret) {
      return null;
    }

    if (!this.isUuid(sessionId)) {
      return null;
    }

    if (!this.isBase64UrlSecret(secret)) {
      return null;
    }

    return sessionId;
  }

  hashRefreshToken(refreshToken: string): string {
    return createHmac('sha256', this.refreshTokenHashSecret)
      .update(refreshToken)
      .digest('hex');
  }

  verifyRefreshTokenHash(refreshToken: string, storedHash: string): boolean {
    const incomingHash = this.hashRefreshToken(refreshToken);

    const incomingBuffer = Buffer.from(incomingHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');

    if (incomingBuffer.length !== storedBuffer.length) {
      return false;
    }

    return timingSafeEqual(incomingBuffer, storedBuffer);
  }

  getRefreshTokenExpiresAt(): Date {
    return this.clockService.addDays(
      this.clockService.now(),
      this.refreshTokenExpiresInDays,
    );
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`${key} is not defined`);
    }

    return value;
  }

  private getJwtAccessExpiresIn(): JwtExpiresIn {
    const value = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );

    if (!this.isValidJwtExpiresIn(value)) {
      throw new Error(
        'JWT_ACCESS_EXPIRES_IN must be a duration like "15m", "1h", "7d" or a number of seconds',
      );
    }

    return value as JwtExpiresIn;
  }

  private getRefreshTokenExpiresInDays(): number {
    const rawValue = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const match = rawValue.match(/^(\d+)d$/);

    if (!match) {
      throw new Error('JWT_REFRESH_EXPIRES_IN must be a duration like "7d"');
    }

    const days = Number(match[1]);

    if (!Number.isInteger(days) || days < 1) {
      throw new Error('JWT_REFRESH_EXPIRES_IN must be at least 1 day');
    }

    return days;
  }

  private isValidJwtExpiresIn(value: string): boolean {
    return /^\d+\s?(ms|s|m|h|d|w|y)$/.test(value) || /^\d+$/.test(value);
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private isBase64UrlSecret(value: string): boolean {
    return /^[A-Za-z0-9_-]{80,120}$/.test(value);
  }

  private isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const payload = value as Partial<AccessTokenPayload>;

    /**
     * Role sadəcə string olmamalıdır.
     * JWT payload içində "HACKER" kimi unknown role gəlsə, onu valid saymamalıyıq.
     * Ona görə role runtime-da real Prisma UserRole enum dəyərlərindən biri olmalıdır.
     */
    const isValidRole =
      typeof payload.role === 'string' &&
      Object.values(UserRole).some((role) => role === payload.role);

    return (
      typeof payload.sub === 'string' &&
      typeof payload.email === 'string' &&
      isValidRole
    );
  }
}
