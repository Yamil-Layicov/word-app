import { getAuthIdentityTracker } from './auth-rate-limit.tracker';

describe('getAuthIdentityTracker', () => {
  it('normalizes the email before using it as an identity', async () => {
    const tracker = await getAuthIdentityTracker(
      {
        body: {
          email: '  User@Example.COM  ',
        },
        ip: '203.0.113.10',
      },
      {} as never,
    );

    expect(tracker).toBe('email:user@example.com');
  });

  it('falls back to the request IP when email is missing', async () => {
    const tracker = await getAuthIdentityTracker(
      {
        body: {},
        ip: '203.0.113.11',
      },
      {} as never,
    );

    expect(tracker).toBe('ip:203.0.113.11');
  });

  it('uses a stable fallback when both email and IP are unavailable', async () => {
    const tracker = await getAuthIdentityTracker(
      {
        body: null,
      },
      {} as never,
    );

    expect(tracker).toBe('ip:unknown-ip');
  });
});
