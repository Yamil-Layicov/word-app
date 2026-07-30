import { Injectable } from '@nestjs/common';
import { toAuthLoginResponse } from './auth.mapper';
import { AuthRepository } from './auth.repository';
import { AuthTokenService } from './auth-token.service';
import type {
  AuthLoginResponse,
  AuthRequestContext,
  AuthUserResponseModel,
} from './auth.types';

@Injectable()
export class AuthSessionIssuer {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async issue(
    user: AuthUserResponseModel,
    context: AuthRequestContext,
  ): Promise<AuthLoginResponse> {
    const sessionId = this.authTokenService.generateSessionId();
    const refreshToken = this.authTokenService.generateRefreshToken(sessionId);
    const refreshTokenHash =
      this.authTokenService.hashRefreshToken(refreshToken);

    await this.authRepository.createAuthSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt: this.authTokenService.getRefreshTokenExpiresAt(),
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
}
