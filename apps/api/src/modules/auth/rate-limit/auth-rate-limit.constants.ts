import { hours, minutes } from '@nestjs/throttler';

export const AUTH_RATE_LIMITER = {
  ip: 'auth-ip',
  identity: 'auth-identity',
} as const;

export const AUTH_RATE_LIMIT_POLICY = {
  login: {
    ip: {
      limit: 30,
      ttl: minutes(15),
    },
    identity: {
      limit: 5,
      ttl: minutes(15),
    },
  },
  registration: {
    ip: {
      limit: 20,
      ttl: hours(1),
    },
    identity: {
      limit: 3,
      ttl: hours(1),
    },
  },
  emailDelivery: {
    ip: {
      limit: 20,
      ttl: minutes(15),
    },
    identity: {
      limit: 3,
      ttl: minutes(15),
    },
  },
} as const;

export type AuthRateLimitPolicyName = keyof typeof AUTH_RATE_LIMIT_POLICY;

export const AUTH_RATE_LIMIT_ERROR_CODE = 'RATE_LIMIT_EXCEEDED';
export const AUTH_RATE_LIMIT_ERROR_MESSAGE =
  'Too many attempts. Try again later.';
