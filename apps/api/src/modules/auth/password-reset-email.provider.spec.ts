/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import { ConsolePasswordResetEmailGateway } from './console-password-reset-email.gateway';
import { createPasswordResetEmailGateway } from './password-reset-email.provider';
import { ResendPasswordResetEmailGateway } from './resend-password-reset-email.gateway';

function createGateway(config: Record<string, string> = {}) {
  return createPasswordResetEmailGateway(new ConfigService(config));
}

describe('createPasswordResetEmailGateway', () => {
  it('uses the console adapter by default outside production', () => {
    expect(createGateway()).toBeInstanceOf(ConsolePasswordResetEmailGateway);
  });

  it('creates the Resend adapter when configured', () => {
    expect(
      createGateway({
        PASSWORD_RESET_EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test_key',
        PASSWORD_RESET_EMAIL_FROM: 'Word App <security@example.com>',
      }),
    ).toBeInstanceOf(ResendPasswordResetEmailGateway);
  });

  it('defaults to Resend in production', () => {
    expect(
      createGateway({
        NODE_ENV: 'production',
        RESEND_API_KEY: 're_test_key',
        PASSWORD_RESET_EMAIL_FROM: 'Word App <security@example.com>',
      }),
    ).toBeInstanceOf(ResendPasswordResetEmailGateway);
  });

  it('rejects the console adapter in production', () => {
    expect(() =>
      createGateway({
        NODE_ENV: 'production',
        PASSWORD_RESET_EMAIL_PROVIDER: 'console',
      }),
    ).toThrow(
      'Console password reset email provider cannot be used in production',
    );
  });

  it('rejects an unsupported provider', () => {
    expect(() =>
      createGateway({
        PASSWORD_RESET_EMAIL_PROVIDER: 'smtp',
      }),
    ).toThrow('PASSWORD_RESET_EMAIL_PROVIDER must be "console" or "resend"');
  });
});
