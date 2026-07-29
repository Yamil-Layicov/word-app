/// <reference types="jest" />

import { ConfigService } from '@nestjs/config';
import { ClockService } from '../../common/time/clock.service';
import { PasswordResetTokenService } from './password-reset-token.service';

class TestClockService extends ClockService {
  override now(): Date {
    return new Date('2026-07-29T08:00:00.000Z');
  }
}

function createService(
  config: Record<string, string> = {},
): PasswordResetTokenService {
  return new PasswordResetTokenService(
    new ConfigService(config),
    new TestClockService(),
  );
}

describe('PasswordResetTokenService', () => {
  it('issues a random token and stores only its deterministic hash', () => {
    const service = createService();

    const firstToken = service.issue();
    const secondToken = service.issue();

    expect(firstToken.rawToken).toMatch(/^[A-Za-z0-9_-]{40,60}$/);
    expect(firstToken.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(firstToken.tokenHash).toBe(service.hash(firstToken.rawToken));
    expect(secondToken.rawToken).not.toBe(firstToken.rawToken);
    expect(secondToken.tokenHash).not.toBe(firstToken.tokenHash);
  });

  it('uses a 30-minute expiration by default', () => {
    const service = createService();

    expect(service.issue().expiresAt).toEqual(
      new Date('2026-07-29T08:30:00.000Z'),
    );
  });

  it('supports a configured expiration within the allowed range', () => {
    const service = createService({
      PASSWORD_RESET_TOKEN_TTL_MINUTES: '15',
    });

    expect(service.issue().expiresAt).toEqual(
      new Date('2026-07-29T08:15:00.000Z'),
    );
  });

  it.each(['0', '4', '61', '15.5', 'invalid'])(
    'rejects an unsafe token expiration value: %s',
    (value) => {
      expect(() =>
        createService({
          PASSWORD_RESET_TOKEN_TTL_MINUTES: value,
        }),
      ).toThrow(
        'PASSWORD_RESET_TOKEN_TTL_MINUTES must be an integer between 5 and 60',
      );
    },
  );
});
