import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailVerificationLinkService {
  private readonly verificationUrl: URL;

  constructor(private readonly configService: ConfigService) {
    this.verificationUrl = this.getVerificationUrl();
  }

  create(rawToken: string): string {
    if (!rawToken) {
      throw new Error('Email verification token cannot be empty');
    }

    const url = new URL(this.verificationUrl);
    url.searchParams.set('token', rawToken);

    return url.toString();
  }

  private getVerificationUrl(): URL {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const mobileScheme = this.configService.get<string>(
      'MOBILE_APP_SCHEME',
      'mobile',
    );
    const configuredUrl = this.configService
      .get<string>('EMAIL_VERIFICATION_URL')
      ?.trim();
    const value =
      configuredUrl ||
      (nodeEnv === 'production' ? undefined : `${mobileScheme}://verify-email`);

    if (!value) {
      throw new Error('EMAIL_VERIFICATION_URL is not defined');
    }

    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new Error('EMAIL_VERIFICATION_URL must be a valid absolute URL');
    }

    const allowedProtocols = new Set(['https:', `${mobileScheme}:`]);

    if (!allowedProtocols.has(url.protocol)) {
      throw new Error(
        'EMAIL_VERIFICATION_URL must use HTTPS or the configured mobile app scheme',
      );
    }

    return url;
  }
}
