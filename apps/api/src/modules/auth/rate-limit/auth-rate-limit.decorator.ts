import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  AUTH_RATE_LIMITER,
  AUTH_RATE_LIMIT_POLICY,
  type AuthRateLimitPolicyName,
} from './auth-rate-limit.constants';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

export function AuthRateLimit(policyName: AuthRateLimitPolicyName) {
  const policy = AUTH_RATE_LIMIT_POLICY[policyName];

  return applyDecorators(
    Throttle({
      [AUTH_RATE_LIMITER.ip]: policy.ip,
      [AUTH_RATE_LIMITER.identity]: policy.identity,
    }),
    UseGuards(AuthRateLimitGuard),
  );
}
