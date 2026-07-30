import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { ClockService } from '../../../common/time/clock.service';
import { AuthSessionIssuer } from '../auth-session.issuer';
import { AuthRepository } from '../auth.repository';
import type { AuthRequestContext, AuthUserResponseModel } from '../auth.types';
import type { GoogleAuthDto } from '../dto/google-auth.dto';
import {
  GOOGLE_ID_TOKEN_VERIFIER,
  type GoogleIdTokenVerifier,
  type GoogleIdentityClaims,
} from './google-id-token-verifier';
import { GoogleAuthRepository } from './google-auth.repository';
import {
  GOOGLE_AUTH_STATUS,
  type GoogleAuthAuthenticatedResponse,
  type GoogleAuthResponse,
} from './google-auth.types';

export const GOOGLE_ACCOUNT_LINK_REQUIRED_CODE = 'GOOGLE_ACCOUNT_LINK_REQUIRED';
export const GOOGLE_ACCOUNT_LINK_REQUIRED_MESSAGE =
  'An account with this email already exists. Sign in with your password to link Google.';

@Injectable()
export class GoogleAuthService {
  constructor(
    @Inject(GOOGLE_ID_TOKEN_VERIFIER)
    private readonly googleIdTokenVerifier: GoogleIdTokenVerifier,
    private readonly googleAuthRepository: GoogleAuthRepository,
    private readonly authRepository: AuthRepository,
    private readonly authSessionIssuer: AuthSessionIssuer,
    private readonly clockService: ClockService,
  ) {}

  async authenticate(
    googleAuthDto: GoogleAuthDto,
    context: AuthRequestContext,
  ): Promise<GoogleAuthResponse> {
    const claims = await this.googleIdTokenVerifier.verify(
      googleAuthDto.idToken,
    );
    const linkedUser =
      await this.googleAuthRepository.findUserByProviderSubject(claims.subject);

    if (linkedUser) {
      return this.authenticateUser(linkedUser, context);
    }

    const emailUser = await this.authRepository.findUserByEmail(claims.email);

    if (emailUser) {
      throw this.accountLinkRequired();
    }

    if (!googleAuthDto.languagePairId) {
      return {
        status: GOOGLE_AUTH_STATUS.onboardingRequired,
        profile: {
          email: claims.email,
          displayName: claims.displayName,
          pictureUrl: claims.pictureUrl,
        },
      };
    }

    await this.assertActiveLanguagePair(googleAuthDto.languagePairId);

    return this.createUserAndAuthenticate(
      claims,
      googleAuthDto.languagePairId,
      context,
    );
  }

  private async createUserAndAuthenticate(
    claims: GoogleIdentityClaims,
    languagePairId: string,
    context: AuthRequestContext,
  ): Promise<GoogleAuthAuthenticatedResponse> {
    const result = await this.googleAuthRepository.createGoogleUser({
      email: claims.email,
      displayName: claims.displayName,
      languagePairId,
      providerSubject: claims.subject,
      verifiedAt: this.clockService.now(),
    });

    if (result.kind === 'EMAIL_EXISTS') {
      const linkedUser =
        await this.googleAuthRepository.findUserByProviderSubject(
          claims.subject,
        );

      if (linkedUser) {
        return this.authenticateUser(linkedUser, context);
      }

      throw this.accountLinkRequired();
    }

    return this.authenticateUser(result.user, context);
  }

  private async authenticateUser(
    user: AuthUserResponseModel,
    context: AuthRequestContext,
  ): Promise<GoogleAuthAuthenticatedResponse> {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active');
    }

    const authResponse = await this.authSessionIssuer.issue(user, context);

    return {
      status: GOOGLE_AUTH_STATUS.authenticated,
      ...authResponse,
    };
  }

  private async assertActiveLanguagePair(
    languagePairId: string,
  ): Promise<void> {
    const languagePair =
      await this.authRepository.findActiveLanguagePairById(languagePairId);

    if (!languagePair) {
      throw new BadRequestException('Invalid language pair');
    }
  }

  private accountLinkRequired(): ConflictException {
    return new ConflictException({
      statusCode: 409,
      message: GOOGLE_ACCOUNT_LINK_REQUIRED_MESSAGE,
      error: 'Conflict',
      code: GOOGLE_ACCOUNT_LINK_REQUIRED_CODE,
    });
  }
}
