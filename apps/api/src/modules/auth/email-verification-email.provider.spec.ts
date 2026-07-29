/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import { ConsoleEmailVerificationEmailGateway } from './console-email-verification-email.gateway';
import { createEmailVerificationEmailGateway } from './email-verification-email.provider';
import { ResendEmailVerificationEmailGateway } from './resend-email-verification-email.gateway';

function createGateway(config: Record<string, string> = {}) {
  return createEmailVerificationEmailGateway(new ConfigService(config));
}

describe('createEmailVerificationEmailGateway', () => {
  it('uses the console adapter by default outside production', () => {
    expect(createGateway()).toBeInstanceOf(
      ConsoleEmailVerificationEmailGateway,
    );
  });

  it('creates the Resend adapter when configured', () => {
    expect(
      createGateway({
        EMAIL_VERIFICATION_EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test_key',
        EMAIL_VERIFICATION_EMAIL_FROM: 'Word App <security@example.com>',
      }),
    ).toBeInstanceOf(ResendEmailVerificationEmailGateway);
  });

  it('defaults to Resend in production', () => {
    expect(
      createGateway({
        NODE_ENV: 'production',
        RESEND_API_KEY: 're_test_key',
        EMAIL_VERIFICATION_EMAIL_FROM: 'Word App <security@example.com>',
      }),
    ).toBeInstanceOf(ResendEmailVerificationEmailGateway);
  });

  it('rejects the console adapter in production', () => {
    expect(() =>
      createGateway({
        NODE_ENV: 'production',
        EMAIL_VERIFICATION_EMAIL_PROVIDER: 'console',
      }),
    ).toThrow(
      'Console email verification provider cannot be used in production',
    );
  });

  it('rejects an unsupported provider', () => {
    expect(() =>
      createGateway({
        EMAIL_VERIFICATION_EMAIL_PROVIDER: 'smtp',
      }),
    ).toThrow(
      'EMAIL_VERIFICATION_EMAIL_PROVIDER must be "console" or "resend"',
    );
  });
});
