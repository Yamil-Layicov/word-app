import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EMAIL_VERIFICATION_EMAIL_GATEWAY,
  type EmailVerificationEmailGateway,
} from './email-verification-email.gateway';
import { EmailVerificationLinkService } from './email-verification-link.service';

export type EmailVerificationEmailDispatchInput = {
  to: string;
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
};

@Injectable()
export class EmailVerificationEmailDispatcher {
  private readonly logger = new Logger(EmailVerificationEmailDispatcher.name);

  constructor(
    private readonly emailVerificationLinkService: EmailVerificationLinkService,
    @Inject(EMAIL_VERIFICATION_EMAIL_GATEWAY)
    private readonly emailVerificationEmailGateway: EmailVerificationEmailGateway,
  ) {}

  async dispatch(input: EmailVerificationEmailDispatchInput): Promise<void> {
    try {
      await this.emailVerificationEmailGateway.send({
        to: input.to,
        verificationUrl: this.emailVerificationLinkService.create(
          input.rawToken,
        ),
        expiresAt: input.expiresAt,
        idempotencyKey: `email-verification-${input.tokenHash}`,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown email provider error';

      this.logger.error(`Email verification delivery failed: ${errorMessage}`);
    }
  }
}
