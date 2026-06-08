import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ClockService } from '../../common/time/clock.service';
import { AuthTokenService } from './auth-token.service';
import { toAuthLoginResponse, toAuthUserResponse } from './auth.mapper';
import { AuthRepository } from './auth.repository';
import type {
  AuthLoginResponse,
  AuthRequestContext,
  AuthUserResponse,
} from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly configService: ConfigService,
    private readonly authTokenService: AuthTokenService,
    private readonly clockService: ClockService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthUserResponse> {
    const email = this.normalizeEmail(registerDto.email);
    const countryCode = registerDto.countryCode
      ? this.normalizeCountryCode(registerDto.countryCode)
      : undefined;

    const existingUser = await this.authRepository.findUserByEmail(email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const languagePair = await this.authRepository.findActiveLanguagePairById(
      registerDto.languagePairId,
    );

    if (!languagePair) {
      throw new BadRequestException('Invalid language pair');
    }

    if (countryCode) {
      const country =
        await this.authRepository.findActiveCountryByCode(countryCode);

      if (!country) {
        throw new BadRequestException('Invalid country code');
      }
    }

    const passwordHash = await this.hashPassword(registerDto.password);

    const user = await this.authRepository.createUserWithProfile({
      email,
      passwordHash,
      displayName: registerDto.displayName?.trim(),
      countryCode,
      languagePairId: registerDto.languagePairId,
    });

    return toAuthUserResponse(user);
  }

  async login(
    loginDto: LoginDto,
    context: AuthRequestContext,
  ): Promise<AuthLoginResponse> {
    const email = this.normalizeEmail(loginDto.email);
    const user = await this.authRepository.findUserForAuth(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    const sessionId = this.authTokenService.generateSessionId();
    const refreshToken = this.authTokenService.generateRefreshToken(sessionId);
    const refreshTokenHash =
      this.authTokenService.hashRefreshToken(refreshToken);
    const refreshTokenExpiresAt =
      this.authTokenService.getRefreshTokenExpiresAt();

    await this.authRepository.createAuthSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt: refreshTokenExpiresAt,
    });

    const accessToken = await this.authTokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return toAuthLoginResponse({
      accessToken,
      refreshToken,
      user,
    });
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<AuthLoginResponse> {
    const sessionId = this.authTokenService.getSessionIdFromRefreshToken(
      refreshTokenDto.refreshToken,
    );

    if (!sessionId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session =
      await this.authRepository.findAuthSessionForRefresh(sessionId);

    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const now = this.clockService.now();

    if (session.expiresAt <= now) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = this.authTokenService.verifyRefreshTokenHash(
      refreshTokenDto.refreshToken,
      session.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    const nextRefreshToken = this.authTokenService.generateRefreshToken(
      session.id,
    );
    const nextRefreshTokenHash =
      this.authTokenService.hashRefreshToken(nextRefreshToken);
    const nextRefreshTokenExpiresAt =
      this.authTokenService.getRefreshTokenExpiresAt();

    const rotated = await this.authRepository.rotateAuthSession({
      id: session.id,
      currentRefreshTokenHash: session.refreshTokenHash,
      nextRefreshTokenHash,
      expiresAt: nextRefreshTokenExpiresAt,
      now,
    });

    if (!rotated) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = await this.authTokenService.generateAccessToken({
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
    });

    return toAuthLoginResponse({
      accessToken,
      refreshToken: nextRefreshToken,
      user: session.user,
    });
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private normalizeCountryCode(countryCode: string): string {
    return countryCode.toUpperCase().trim();
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = this.getBcryptSaltRounds();

    return bcrypt.hash(password, saltRounds);
  }

  private getBcryptSaltRounds(): number {
    const rawSaltRounds = this.configService.get<string>(
      'BCRYPT_SALT_ROUNDS',
      '10',
    );

    const saltRounds = Number(rawSaltRounds);

    if (!Number.isInteger(saltRounds) || saltRounds < 8) {
      throw new Error('BCRYPT_SALT_ROUNDS must be an integer greater than 7');
    }

    return saltRounds;
  }
}
