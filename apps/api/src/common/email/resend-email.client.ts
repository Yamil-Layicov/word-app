import { ConfigService } from '@nestjs/config';

const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const MIN_REQUEST_TIMEOUT_MS = 1_000;
const MAX_REQUEST_TIMEOUT_MS = 30_000;

export type SendEmailInput = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

export type SendEmailReceipt = {
  providerMessageId: string;
};

export class ResendEmailClient {
  private readonly apiKey: string;
  private readonly requestTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.getRequiredConfig('RESEND_API_KEY');
    this.requestTimeoutMs = this.getRequestTimeoutMs();
  }

  async send(input: SendEmailInput): Promise<SendEmailReceipt> {
    const response = await fetch(RESEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
      signal: AbortSignal.timeout(this.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Email request failed with status ${response.status}`);
    }

    const responseBody: unknown = await response.json();

    if (
      !this.isRecord(responseBody) ||
      typeof responseBody.id !== 'string' ||
      !responseBody.id
    ) {
      throw new Error('Email response has an invalid format');
    }

    return {
      providerMessageId: responseBody.id,
    };
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

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
