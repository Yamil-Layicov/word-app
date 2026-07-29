import { Injectable } from '@nestjs/common';
import { PasswordResetEmailDispatcher } from './password-reset-email.dispatcher';
import { PasswordResetRepository } from './password-reset.repository';
import { PasswordResetTokenService } from './password-reset-token.service';

export const PASSWORD_RESET_REQUEST_MESSAGE =
  'If an account exists for this email, password reset instructions will be sent.';

export type PasswordResetRequestResponse = {
  message: string;
};

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly passwordResetTokenService: PasswordResetTokenService,
    private readonly passwordResetEmailDispatcher: PasswordResetEmailDispatcher,
  ) {}

  async request(emailInput: string): Promise<PasswordResetRequestResponse> {
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
}
