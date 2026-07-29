import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { escapeEmailHtml } from '../../common/email/email-content.util';
import { ResendEmailClient } from '../../common/email/resend-email.client';
import type {
  EmailVerificationEmailGateway,
  EmailVerificationEmailMessage,
  EmailVerificationEmailReceipt,
} from './email-verification-email.gateway';

@Injectable()
export class ResendEmailVerificationEmailGateway implements EmailVerificationEmailGateway {
  private readonly from: string;
  private readonly resendEmailClient: ResendEmailClient;

  constructor(private readonly configService: ConfigService) {
    this.from = this.getRequiredFrom();
    this.resendEmailClient = new ResendEmailClient(configService);
  }

  send(
    message: EmailVerificationEmailMessage,
  ): Promise<EmailVerificationEmailReceipt> {
    return this.resendEmailClient.send({
      from: this.from,
      to: message.to,
      subject: 'Verify your Word App email',
      text: this.createTextContent(message),
      html: this.createHtmlContent(message),
      idempotencyKey: message.idempotencyKey,
    });
  }

  private createTextContent(message: EmailVerificationEmailMessage): string {
    return [
      'Verify your email address to finish setting up your Word App account.',
      '',
      `Verify your email: ${message.verificationUrl}`,
      '',
      `This link expires at ${message.expiresAt.toISOString()}.`,
      'If you did not create this account, you can ignore this email.',
    ].join('\n');
  }

  private createHtmlContent(message: EmailVerificationEmailMessage): string {
    const verificationUrl = escapeEmailHtml(message.verificationUrl);
    const expiresAt = escapeEmailHtml(message.expiresAt.toISOString());

    return [
      '<p>Verify your email address to finish setting up your Word App account.</p>',
      `<p><a href="${verificationUrl}">Verify email</a></p>`,
      `<p>This link expires at ${expiresAt}.</p>`,
      '<p>If you did not create this account, you can ignore this email.</p>',
    ].join('');
  }

  private getRequiredFrom(): string {
    const value =
      this.configService.get<string>('EMAIL_VERIFICATION_EMAIL_FROM')?.trim() ||
      this.configService.get<string>('PASSWORD_RESET_EMAIL_FROM')?.trim();

    if (!value) {
      throw new Error('EMAIL_VERIFICATION_EMAIL_FROM is not defined');
    }

    return value;
  }
}
