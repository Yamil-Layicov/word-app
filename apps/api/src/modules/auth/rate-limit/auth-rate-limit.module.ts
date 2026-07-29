import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  AUTH_RATE_LIMITER,
  AUTH_RATE_LIMIT_POLICY,
} from './auth-rate-limit.constants';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { getAuthIdentityTracker } from './auth-rate-limit.tracker';

const defaultPolicy = AUTH_RATE_LIMIT_POLICY.login;

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: AUTH_RATE_LIMITER.ip,
        ...defaultPolicy.ip,
      },
      {
        name: AUTH_RATE_LIMITER.identity,
        ...defaultPolicy.identity,
        getTracker: getAuthIdentityTracker,
      },
    ]),
  ],
  providers: [AuthRateLimitGuard],
  exports: [AuthRateLimitGuard],
})
export class AuthRateLimitModule {}
