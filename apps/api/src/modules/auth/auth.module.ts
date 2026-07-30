import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { AuthTokenService } from './auth-token.service';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthSessionIssuer } from './auth-session.issuer';
import { AuthService } from './auth.service';
import { EMAIL_VERIFICATION_EMAIL_GATEWAY } from './email-verification-email.gateway';
import { EmailVerificationEmailDispatcher } from './email-verification-email.dispatcher';
import { createEmailVerificationEmailGateway } from './email-verification-email.provider';
import { EmailVerificationLinkService } from './email-verification-link.service';
import { EmailVerificationRepository } from './email-verification.repository';
import { EmailVerificationService } from './email-verification.service';
import { EmailVerificationTokenService } from './email-verification-token.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { GoogleAuthRepository } from './google/google-auth.repository';
import { GoogleAuthService } from './google/google-auth.service';
import { GOOGLE_ID_TOKEN_VERIFIER } from './google/google-id-token-verifier';
import {
  GOOGLE_OAUTH_CLIENT,
  GoogleIdTokenVerifierService,
} from './google/google-id-token-verifier.service';
import { PASSWORD_RESET_EMAIL_GATEWAY } from './password-reset-email.gateway';
import { PasswordResetEmailDispatcher } from './password-reset-email.dispatcher';
import { createPasswordResetEmailGateway } from './password-reset-email.provider';
import { PasswordResetLinkService } from './password-reset-link.service';
import { PasswordResetRepository } from './password-reset.repository';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetTokenService } from './password-reset-token.service';
import { PasswordService } from './password.service';
import { AuthRateLimitModule } from './rate-limit/auth-rate-limit.module';

@Module({
  imports: [JwtModule.register({}), AuthRateLimitModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    AuthSessionIssuer,
    AuthTokenService,
    EmailVerificationEmailDispatcher,
    EmailVerificationLinkService,
    EmailVerificationRepository,
    EmailVerificationService,
    EmailVerificationTokenService,
    PasswordResetEmailDispatcher,
    PasswordResetLinkService,
    PasswordResetRepository,
    PasswordResetService,
    PasswordResetTokenService,
    PasswordService,
    GoogleAuthRepository,
    GoogleAuthService,
    GoogleIdTokenVerifierService,
    AccessTokenGuard,
    {
      provide: GOOGLE_OAUTH_CLIENT,
      useFactory: () => new OAuth2Client(),
    },
    {
      provide: GOOGLE_ID_TOKEN_VERIFIER,
      useExisting: GoogleIdTokenVerifierService,
    },
    {
      provide: EMAIL_VERIFICATION_EMAIL_GATEWAY,
      inject: [ConfigService],
      useFactory: createEmailVerificationEmailGateway,
    },
    {
      provide: PASSWORD_RESET_EMAIL_GATEWAY,
      inject: [ConfigService],
      useFactory: createPasswordResetEmailGateway,
    },
  ],
  exports: [AuthTokenService, AccessTokenGuard],
})
export class AuthModule {}
