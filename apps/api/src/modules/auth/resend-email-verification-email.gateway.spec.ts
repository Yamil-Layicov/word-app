/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import type { EmailVerificationEmailMessage } from './email-verification-email.gateway';
import { ResendEmailVerificationEmailGateway } from './resend-email-verification-email.gateway';

const message: EmailVerificationEmailMessage = {
  to: 'user@example.com',
  verificationUrl:
    'https://app.example.com/verify-email?token=secret&next="home"',
  expiresAt: new Date('2026-07-30T08:00:00.000Z'),
  idempotencyKey: 'email-verification-token-hash',
};

function createGateway(
  configOverrides: Record<string, string> = {},
): ResendEmailVerificationEmailGateway {
  return new ResendEmailVerificationEmailGateway(
    new ConfigService({
      RESEND_API_KEY: 're_test_key',
      EMAIL_VERIFICATION_EMAIL_FROM: 'Word App <security@example.com>',
      ...configOverrides,
    }),
  );
}

describe('ResendEmailVerificationEmailGateway', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('sends text and HTML verification content with idempotency', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        id: 'email-1',
      }),
    } as unknown as Response);

    await expect(createGateway().send(message)).resolves.toEqual({
      providerMessageId: 'email-1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer re_test_key',
          'Content-Type': 'application/json',
          'Idempotency-Key': message.idempotencyKey,
        },
        body: JSON.stringify({
          from: 'Word App <security@example.com>',
          to: ['user@example.com'],
          subject: 'Verify your Word App email',
          text: [
            'Verify your email address to finish setting up your Word App account.',
            '',
            `Verify your email: ${message.verificationUrl}`,
            '',
            'This link expires at 2026-07-30T08:00:00.000Z.',
            'If you did not create this account, you can ignore this email.',
          ].join('\n'),
          html: [
            '<p>Verify your email address to finish setting up your Word App account.</p>',
            '<p><a href="https://app.example.com/verify-email?token=secret&amp;next=&quot;home&quot;">Verify email</a></p>',
            '<p>This link expires at 2026-07-30T08:00:00.000Z.</p>',
            '<p>If you did not create this account, you can ignore this email.</p>',
          ].join(''),
        }),
      }),
    );
  });

  it('uses the password reset sender as an explicit fallback', () => {
    expect(
      () =>
        new ResendEmailVerificationEmailGateway(
          new ConfigService({
            RESEND_API_KEY: 're_test_key',
            PASSWORD_RESET_EMAIL_FROM: 'Word App <security@example.com>',
          }),
        ),
    ).not.toThrow();
  });
});
