import { BadRequestException, Injectable } from '@nestjs/common';
import { ClockService } from '../../common/time/clock.service';
import { EmailVerificationEmailDispatcher } from './email-verification-email.dispatcher';
import { EmailVerificationRepository } from './email-verification.repository';
import {
  EmailVerificationTokenService,
  type IssuedEmailVerificationToken,
} from './email-verification-token.service';

export const EMAIL_VERIFICATION_REQUEST_MESSAGE =
  'If this email belongs to an unverified account, verification instructions will be sent.';
export const EMAIL_VERIFICATION_SUCCESS_MESSAGE =
  'Your email has been verified. You can now log in.';
export const INVALID_EMAIL_VERIFICATION_TOKEN_MESSAGE =
  'Email verification link is invalid or expired';
export const EMAIL_VERIFICATION_REQUIRED_CODE = 'EMAIL_VERIFICATION_REQUIRED';
export const EMAIL_VERIFICATION_REQUIRED_MESSAGE =
  'Verify your email before logging in.';

export type EmailVerificationResponse = {
  message: string;
};

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly emailVerificationTokenService: EmailVerificationTokenService,
    private readonly emailVerificationEmailDispatcher: EmailVerificationEmailDispatcher,
    private readonly clockService: ClockService,
  ) {}

  issue(): IssuedEmailVerificationToken {
    return this.emailVerificationTokenService.issue();
  }

  dispatch(email: string, issuedToken: IssuedEmailVerificationToken): void {
    void this.emailVerificationEmailDispatcher.dispatch({
      to: email,
      rawToken: issuedToken.rawToken,
      tokenHash: issuedToken.tokenHash,
      expiresAt: issuedToken.expiresAt,
    });
  }

  async request(emailInput: string): Promise<EmailVerificationResponse> {
    const email = emailInput.toLowerCase().trim();
    const issuedToken = this.emailVerificationTokenService.issue();
    const user =
      await this.emailVerificationRepository.findUnverifiedUserByEmail(email);

    if (user) {
      await this.emailVerificationRepository.replaceToken({
        userId: user.id,
        tokenHash: issuedToken.tokenHash,
        expiresAt: issuedToken.expiresAt,
      });
      this.dispatch(email, issuedToken);
    }

    return {
      message: EMAIL_VERIFICATION_REQUEST_MESSAGE,
    };
  }

  async confirm(rawToken: string): Promise<EmailVerificationResponse> {
    const tokenHash = this.emailVerificationTokenService.hash(rawToken);
    const wasVerified =
      await this.emailVerificationRepository.consumeTokenAndVerifyEmail({
        tokenHash,
        now: this.clockService.now(),
      });

    if (!wasVerified) {
      throw new BadRequestException(INVALID_EMAIL_VERIFICATION_TOKEN_MESSAGE);
    }

    return {
      message: EMAIL_VERIFICATION_SUCCESS_MESSAGE,
    };
  }
}
