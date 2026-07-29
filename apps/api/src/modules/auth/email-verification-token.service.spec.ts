/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import { ClockService } from '../../common/time/clock.service';
import { EmailVerificationTokenService } from './email-verification-token.service';

class TestClockService extends ClockService {
  override now(): Date {
    return new Date('2026-07-29T08:00:00.000Z');
  }
}

function createService(
  config: Record<string, string> = {},
): EmailVerificationTokenService {
  return new EmailVerificationTokenService(
    new ConfigService(config),
    new TestClockService(),
  );
}

describe('EmailVerificationTokenService', () => {
  it('issues a random token and stores only its deterministic hash', () => {
    const service = createService();

    const firstToken = service.issue();
    const secondToken = service.issue();

    expect(firstToken.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(firstToken.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(firstToken.tokenHash).toBe(service.hash(firstToken.rawToken));
    expect(secondToken.rawToken).not.toBe(firstToken.rawToken);
    expect(secondToken.tokenHash).not.toBe(firstToken.tokenHash);
  });

  it('uses a 24-hour expiration by default', () => {
    expect(createService().issue().expiresAt).toEqual(
      new Date('2026-07-30T08:00:00.000Z'),
    );
  });

  it('supports a configured expiration within the allowed range', () => {
    const service = createService({
      EMAIL_VERIFICATION_TOKEN_TTL_HOURS: '48',
    });

    expect(service.issue().expiresAt).toEqual(
      new Date('2026-07-31T08:00:00.000Z'),
    );
  });

  it.each(['0', '169', '24.5', 'invalid'])(
    'rejects an unsafe token expiration value: %s',
    (value) => {
      expect(() =>
        createService({
          EMAIL_VERIFICATION_TOKEN_TTL_HOURS: value,
        }),
      ).toThrow(
        'EMAIL_VERIFICATION_TOKEN_TTL_HOURS must be an integer between 1 and 168',
      );
    },
  );
});
