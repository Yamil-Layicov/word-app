import { Injectable, Logger } from '@nestjs/common';
import type {
  EmailVerificationEmailGateway,
  EmailVerificationEmailMessage,
  EmailVerificationEmailReceipt,
} from './email-verification-email.gateway';

@Injectable()
export class ConsoleEmailVerificationEmailGateway implements EmailVerificationEmailGateway {
  private readonly logger = new Logger(
    ConsoleEmailVerificationEmailGateway.name,
  );

  send(
    message: EmailVerificationEmailMessage,
  ): Promise<EmailVerificationEmailReceipt> {
    this.logger.log(
      `Development email verification link for ${message.to}: ${message.verificationUrl}`,
    );

    return Promise.resolve({
      providerMessageId: `console-${message.idempotencyKey}`,
    });
  }
}
