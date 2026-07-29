import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  PasswordResetEmailGateway,
  PasswordResetEmailMessage,
  PasswordResetEmailReceipt,
} from './password-reset-email.gateway';

const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const MIN_REQUEST_TIMEOUT_MS = 1_000;
const MAX_REQUEST_TIMEOUT_MS = 30_000;

@Injectable()
export class ResendPasswordResetEmailGateway implements PasswordResetEmailGateway {
  private readonly apiKey: string;
  private readonly from: string;
  private readonly requestTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.getRequiredConfig('RESEND_API_KEY');
    this.from = this.getRequiredConfig('PASSWORD_RESET_EMAIL_FROM');
    this.requestTimeoutMs = this.getRequestTimeoutMs();
  }

  async send(
    message: PasswordResetEmailMessage,
  ): Promise<PasswordResetEmailReceipt> {
    const response = await fetch(RESEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': message.idempotencyKey,
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: 'Reset your Word App password',
        text: this.createTextContent(message),
        html: this.createHtmlContent(message),
      }),
      signal: AbortSignal.timeout(this.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(
        `Password reset email request failed with status ${response.status}`,
      );
    }

    const responseBody: unknown = await response.json();

    if (
      !this.isRecord(responseBody) ||
      typeof responseBody.id !== 'string' ||
      !responseBody.id
    ) {
      throw new Error('Password reset email response has an invalid format');
    }

    return {
      providerMessageId: responseBody.id,
    };
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
    const resetUrl = this.escapeHtml(message.resetUrl);
    const expiresAt = this.escapeHtml(message.expiresAt.toISOString());

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

  private getRequestTimeoutMs(): number {
    const rawValue = this.configService.get<string>(
      'RESEND_REQUEST_TIMEOUT_MS',
      String(DEFAULT_REQUEST_TIMEOUT_MS),
    );
    const requestTimeoutMs = Number(rawValue);

    if (
      !Number.isInteger(requestTimeoutMs) ||
      requestTimeoutMs < MIN_REQUEST_TIMEOUT_MS ||
      requestTimeoutMs > MAX_REQUEST_TIMEOUT_MS
    ) {
      throw new Error(
        `RESEND_REQUEST_TIMEOUT_MS must be an integer between ${MIN_REQUEST_TIMEOUT_MS} and ${MAX_REQUEST_TIMEOUT_MS}`,
      );
    }

    return requestTimeoutMs;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
