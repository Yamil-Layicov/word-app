import { ConfigService } from '@nestjs/config';
import { ConsolePasswordResetEmailGateway } from './console-password-reset-email.gateway';
import type { PasswordResetEmailGateway } from './password-reset-email.gateway';
import { ResendPasswordResetEmailGateway } from './resend-password-reset-email.gateway';

type PasswordResetEmailProvider = 'console' | 'resend';

export function createPasswordResetEmailGateway(
  configService: ConfigService,
): PasswordResetEmailGateway {
  const nodeEnv = configService
    .get<string>('NODE_ENV', 'development')
    .trim()
    .toLowerCase();
  const configuredProvider = configService
    .get<string>('PASSWORD_RESET_EMAIL_PROVIDER')
    ?.trim()
    .toLowerCase();
  const provider = (configuredProvider ||
    (nodeEnv === 'production'
      ? 'resend'
      : 'console')) as PasswordResetEmailProvider;

  switch (provider) {
    case 'console':
      if (nodeEnv === 'production') {
        throw new Error(
          'Console password reset email provider cannot be used in production',
        );
      }

      return new ConsolePasswordResetEmailGateway();
    case 'resend':
      return new ResendPasswordResetEmailGateway(configService);
    default:
      throw new Error(
        'PASSWORD_RESET_EMAIL_PROVIDER must be "console" or "resend"',
      );
  }
}
