/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import type { PasswordResetEmailMessage } from './password-reset-email.gateway';
import { ResendPasswordResetEmailGateway } from './resend-password-reset-email.gateway';

const message: PasswordResetEmailMessage = {
  to: 'user@example.com',
  resetUrl: 'https://app.example.com/reset-password?token=secret&next="home"',
  expiresAt: new Date('2026-07-29T08:30:00.000Z'),
  idempotencyKey: 'password-reset-token-hash',
};

function createGateway(
  configOverrides: Record<string, string> = {},
): ResendPasswordResetEmailGateway {
  return new ResendPasswordResetEmailGateway(
    new ConfigService({
      RESEND_API_KEY: 're_test_key',
      PASSWORD_RESET_EMAIL_FROM: 'Word App <security@example.com>',
      ...configOverrides,
    }),
  );
}

describe('ResendPasswordResetEmailGateway', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('sends a text and HTML password reset email with idempotency', async () => {
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
          subject: 'Reset your Word App password',
          text: [
            'We received a request to reset your Word App password.',
            '',
            `Reset your password: ${message.resetUrl}`,
            '',
            'This link expires at 2026-07-29T08:30:00.000Z.',
            'If you did not request this, you can ignore this email.',
          ].join('\n'),
          html: [
            '<p>We received a request to reset your Word App password.</p>',
            '<p><a href="https://app.example.com/reset-password?token=secret&amp;next=&quot;home&quot;">Reset password</a></p>',
            '<p>This link expires at 2026-07-29T08:30:00.000Z.</p>',
            '<p>If you did not request this, you can ignore this email.</p>',
          ].join(''),
        }),
      }),
    );
  });

  it('rejects an unsuccessful provider response without exposing its body', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
    } as Response);

    await expect(createGateway().send(message)).rejects.toThrow(
      'Email request failed with status 429',
    );
  });

  it('rejects a successful response with an invalid shape', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);

    await expect(createGateway().send(message)).rejects.toThrow(
      'Email response has an invalid format',
    );
  });

  it.each([
    ['RESEND_API_KEY', { RESEND_API_KEY: ' ' }],
    ['PASSWORD_RESET_EMAIL_FROM', { PASSWORD_RESET_EMAIL_FROM: ' ' }],
  ])('requires the %s configuration', (key, configOverrides) => {
    expect(() => createGateway(configOverrides)).toThrow(
      `${key} is not defined`,
    );
  });

  it.each(['0', '999', '30001', '10.5', 'invalid'])(
    'rejects an unsafe request timeout: %s',
    (value) => {
      expect(() =>
        createGateway({
          RESEND_REQUEST_TIMEOUT_MS: value,
        }),
      ).toThrow(
        'RESEND_REQUEST_TIMEOUT_MS must be an integer between 1000 and 30000',
      );
    },
  );
});
