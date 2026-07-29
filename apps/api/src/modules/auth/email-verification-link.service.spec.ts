/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import { EmailVerificationLinkService } from './email-verification-link.service';

function createService(config: Record<string, string> = {}) {
  return new EmailVerificationLinkService(new ConfigService(config));
}

describe('EmailVerificationLinkService', () => {
  it('uses the mobile deep link by default outside production', () => {
    expect(createService().create('raw-token')).toBe(
      'mobile://verify-email?token=raw-token',
    );
  });

  it('adds the token to the configured mobile deep link', () => {
    const service = createService({
      EMAIL_VERIFICATION_URL: 'wordapp://verify-email',
      MOBILE_APP_SCHEME: 'wordapp',
    });

    expect(service.create('raw token/value')).toBe(
      'wordapp://verify-email?token=raw+token%2Fvalue',
    );
  });

  it('supports an HTTPS universal link and replaces an existing token', () => {
    const service = createService({
      EMAIL_VERIFICATION_URL:
        'https://app.example.com/verify-email?source=email&token=old',
    });

    expect(service.create('new-token')).toBe(
      'https://app.example.com/verify-email?source=email&token=new-token',
    );
  });

  it('rejects an empty token', () => {
    expect(() => createService().create('')).toThrow(
      'Email verification token cannot be empty',
    );
  });

  it.each([
    [{ NODE_ENV: 'production' }, 'EMAIL_VERIFICATION_URL is not defined'],
    [
      { EMAIL_VERIFICATION_URL: 'not-a-url' },
      'EMAIL_VERIFICATION_URL must be a valid absolute URL',
    ],
    [
      { EMAIL_VERIFICATION_URL: 'http://app.example.com/verify-email' },
      'EMAIL_VERIFICATION_URL must use HTTPS or the configured mobile app scheme',
    ],
    [
      { EMAIL_VERIFICATION_URL: 'javascript:alert(1)' },
      'EMAIL_VERIFICATION_URL must use HTTPS or the configured mobile app scheme',
    ],
  ])('rejects an unsafe verification URL: %o', (config, expectedMessage) => {
    expect(() => createService(config)).toThrow(expectedMessage);
  });
});
