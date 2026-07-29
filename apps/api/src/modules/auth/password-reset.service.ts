import { BadRequestException, Injectable } from '@nestjs/common';
import { ClockService } from '../../common/time/clock.service';
import { PasswordResetEmailDispatcher } from './password-reset-email.dispatcher';
import { PasswordResetRepository } from './password-reset.repository';
import { PasswordResetTokenService } from './password-reset-token.service';
import { PasswordService } from './password.service';

export const PASSWORD_RESET_REQUEST_MESSAGE =
  'If an account exists for this email, password reset instructions will be sent.';
export const PASSWORD_RESET_SUCCESS_MESSAGE =
  'Your password has been reset. Log in with your new password.';
export const INVALID_PASSWORD_RESET_TOKEN_MESSAGE =
  'Password reset link is invalid or expired';

export type PasswordResetResponse = {
  message: string;
};

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly passwordResetTokenService: PasswordResetTokenService,
    private readonly passwordResetEmailDispatcher: PasswordResetEmailDispatcher,
    private readonly passwordService: PasswordService,
    private readonly clockService: ClockService,
  ) {}

  async request(emailInput: string): Promise<PasswordResetResponse> {
    const email = emailInput.toLowerCase().trim();
    const issuedToken = this.passwordResetTokenService.issue();
    const user =
      await this.passwordResetRepository.findResettableUserByEmail(email);

    if (user) {
      await this.passwordResetRepository.replaceToken({
        userId: user.id,
        tokenHash: issuedToken.tokenHash,
        expiresAt: issuedToken.expiresAt,
      });
      void this.passwordResetEmailDispatcher.dispatch({
        to: email,
        rawToken: issuedToken.rawToken,
        tokenHash: issuedToken.tokenHash,
        expiresAt: issuedToken.expiresAt,
      });
    }

    return {
      message: PASSWORD_RESET_REQUEST_MESSAGE,
    };
  }

  async reset(
    rawToken: string,
    newPassword: string,
  ): Promise<PasswordResetResponse> {
    const tokenHash = this.passwordResetTokenService.hash(rawToken);
    const passwordHash = await this.passwordService.hash(newPassword);
    const wasReset =
      await this.passwordResetRepository.consumeTokenAndResetPassword({
        tokenHash,
        passwordHash,
        now: this.clockService.now(),
      });

    if (!wasReset) {
      throw new BadRequestException(INVALID_PASSWORD_RESET_TOKEN_MESSAGE);
    }

    return {
      message: PASSWORD_RESET_SUCCESS_MESSAGE,
    };
  }
}
