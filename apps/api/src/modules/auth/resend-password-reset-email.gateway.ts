import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { escapeEmailHtml } from '../../common/email/email-content.util';
import { ResendEmailClient } from '../../common/email/resend-email.client';
import type {
  PasswordResetEmailGateway,
  PasswordResetEmailMessage,
  PasswordResetEmailReceipt,
} from './password-reset-email.gateway';

@Injectable()
export class ResendPasswordResetEmailGateway implements PasswordResetEmailGateway {
  private readonly from: string;
  private readonly resendEmailClient: ResendEmailClient;

  constructor(private readonly configService: ConfigService) {
    this.from = this.getRequiredConfig('PASSWORD_RESET_EMAIL_FROM');
    this.resendEmailClient = new ResendEmailClient(configService);
  }

  async send(
    message: PasswordResetEmailMessage,
  ): Promise<PasswordResetEmailReceipt> {
    return this.resendEmailClient.send({
      from: this.from,
      to: message.to,
      subject: 'Reset your Word App password',
      text: this.createTextContent(message),
      html: this.createHtmlContent(message),
      idempotencyKey: message.idempotencyKey,
    });
  }

  private createTextContent(message: PasswordResetEmailMessage): string {
    return [
      'We received a request to reset your Word App password.',
      '',
      `Reset your password: ${message.resetUrl}`,
      '',
      `This link expires at ${message.expiresAt.toISOString()}.`,
      'If you did not request this, you can ignore this email.',
    ].join('\n');
  }

  private createHtmlContent(message: PasswordResetEmailMessage): string {
    const resetUrl = escapeEmailHtml(message.resetUrl);
    const expiresAt = escapeEmailHtml(message.expiresAt.toISOString());

    return [
      '<p>We received a request to reset your Word App password.</p>',
      `<p><a href="${resetUrl}">Reset password</a></p>`,
      `<p>This link expires at ${expiresAt}.</p>`,
      '<p>If you did not request this, you can ignore this email.</p>',
    ].join('');
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key)?.trim();

    if (!value) {
      throw new Error(`${key} is not defined`);
    }

    return value;
  }
}
