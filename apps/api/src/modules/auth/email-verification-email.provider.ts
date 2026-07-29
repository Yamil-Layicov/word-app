import { ConfigService } from '@nestjs/config';
import { ConsoleEmailVerificationEmailGateway } from './console-email-verification-email.gateway';
import type { EmailVerificationEmailGateway } from './email-verification-email.gateway';
import { ResendEmailVerificationEmailGateway } from './resend-email-verification-email.gateway';

type EmailVerificationEmailProvider = 'console' | 'resend';

export function createEmailVerificationEmailGateway(
  configService: ConfigService,
): EmailVerificationEmailGateway {
  const nodeEnv = configService
    .get<string>('NODE_ENV', 'development')
    .trim()
    .toLowerCase();
  const configuredProvider = (
    configService.get<string>('EMAIL_VERIFICATION_EMAIL_PROVIDER') ||
    configService.get<string>('PASSWORD_RESET_EMAIL_PROVIDER')
  )
    ?.trim()
    .toLowerCase();
  const provider = (configuredProvider ||
    (nodeEnv === 'production'
      ? 'resend'
      : 'console')) as EmailVerificationEmailProvider;

  switch (provider) {
    case 'console':
      if (nodeEnv === 'production') {
        throw new Error(
          'Console email verification provider cannot be used in production',
        );
      }

      return new ConsoleEmailVerificationEmailGateway();
    case 'resend':
      return new ResendEmailVerificationEmailGateway(configService);
    default:
      throw new Error(
        'EMAIL_VERIFICATION_EMAIL_PROVIDER must be "console" or "resend"',
      );
  }
}
