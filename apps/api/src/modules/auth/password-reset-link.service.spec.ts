/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import { PasswordResetLinkService } from './password-reset-link.service';

function createService(config: Record<string, string>) {
  return new PasswordResetLinkService(new ConfigService(config));
}

describe('PasswordResetLinkService', () => {
  it('uses the mobile deep link by default outside production', () => {
    expect(createService({}).create('raw-token')).toBe(
      'mobile://reset-password?token=raw-token',
    );
  });

  it('adds the token to the configured mobile deep link', () => {
    const service = createService({
      PASSWORD_RESET_URL: 'mobile://reset-password',
      MOBILE_APP_SCHEME: 'mobile',
    });

    expect(service.create('raw token/value')).toBe(
      'mobile://reset-password?token=raw+token%2Fvalue',
    );
  });

  it('supports an HTTPS universal link and replaces an existing token', () => {
    const service = createService({
      PASSWORD_RESET_URL:
        'https://app.example.com/reset-password?source=email&token=old',
    });

    expect(service.create('new-token')).toBe(
      'https://app.example.com/reset-password?source=email&token=new-token',
    );
  });

  it('rejects an empty token', () => {
    const service = createService({
      PASSWORD_RESET_URL: 'mobile://reset-password',
    });

    expect(() => service.create('')).toThrow(
      'Password reset token cannot be empty',
    );
  });

  it.each([
    [{ NODE_ENV: 'production' }, 'PASSWORD_RESET_URL is not defined'],
    [
      { PASSWORD_RESET_URL: 'not-a-url' },
      'PASSWORD_RESET_URL must be a valid absolute URL',
    ],
    [
      { PASSWORD_RESET_URL: 'http://app.example.com/reset-password' },
      'PASSWORD_RESET_URL must use HTTPS or the configured mobile app scheme',
    ],
    [
      { PASSWORD_RESET_URL: 'javascript:alert(1)' },
      'PASSWORD_RESET_URL must use HTTPS or the configured mobile app scheme',
    ],
  ])('rejects an unsafe reset URL: %o', (config, expectedMessage) => {
    expect(() => createService(config)).toThrow(expectedMessage);
  });
});
