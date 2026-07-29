import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import {
  AUTH_RATE_LIMIT_ERROR_CODE,
  AUTH_RATE_LIMIT_ERROR_MESSAGE,
} from './auth-rate-limit.constants';

@Injectable()
export class AuthRateLimitGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected override throwThrottlingException(): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: AUTH_RATE_LIMIT_ERROR_MESSAGE,
        error: 'Too Many Requests',
        code: AUTH_RATE_LIMIT_ERROR_CODE,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
