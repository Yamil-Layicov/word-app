import { Injectable, Logger } from '@nestjs/common';
import type {
  PasswordResetEmailGateway,
  PasswordResetEmailMessage,
  PasswordResetEmailReceipt,
} from './password-reset-email.gateway';

@Injectable()
export class ConsolePasswordResetEmailGateway implements PasswordResetEmailGateway {
  private readonly logger = new Logger(ConsolePasswordResetEmailGateway.name);

  send(message: PasswordResetEmailMessage): Promise<PasswordResetEmailReceipt> {
    this.logger.log(
      `Development password reset link for ${message.to}: ${message.resetUrl}`,
    );

    return Promise.resolve({
      providerMessageId: `console-${message.idempotencyKey}`,
    });
  }
}
