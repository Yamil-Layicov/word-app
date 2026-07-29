import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PASSWORD_RESET_EMAIL_GATEWAY,
  type PasswordResetEmailGateway,
} from './password-reset-email.gateway';
import { PasswordResetLinkService } from './password-reset-link.service';

export type PasswordResetEmailDispatchInput = {
  to: string;
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
};

@Injectable()
export class PasswordResetEmailDispatcher {
  private readonly logger = new Logger(PasswordResetEmailDispatcher.name);

  constructor(
    private readonly passwordResetLinkService: PasswordResetLinkService,
    @Inject(PASSWORD_RESET_EMAIL_GATEWAY)
    private readonly passwordResetEmailGateway: PasswordResetEmailGateway,
  ) {}

  async dispatch(input: PasswordResetEmailDispatchInput): Promise<void> {
    try {
      await this.passwordResetEmailGateway.send({
        to: input.to,
        resetUrl: this.passwordResetLinkService.create(input.rawToken),
        expiresAt: input.expiresAt,
        idempotencyKey: `password-reset-${input.tokenHash}`,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown email provider error';

      this.logger.error(
        `Password reset email delivery failed: ${errorMessage}`,
      );
    }
  }
}
