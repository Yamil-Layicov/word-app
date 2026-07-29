import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PasswordResetLinkService {
  private readonly resetUrl: URL;

  constructor(private readonly configService: ConfigService) {
    this.resetUrl = this.getResetUrl();
  }

  create(rawToken: string): string {
    if (!rawToken) {
      throw new Error('Password reset token cannot be empty');
    }

    const url = new URL(this.resetUrl);
    url.searchParams.set('token', rawToken);

    return url.toString();
  }

  private getResetUrl(): URL {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const mobileScheme = this.configService.get<string>(
      'MOBILE_APP_SCHEME',
      'mobile',
    );
    const configuredUrl = this.configService
      .get<string>('PASSWORD_RESET_URL')
      ?.trim();
    const value =
      configuredUrl ||
      (nodeEnv === 'production'
        ? undefined
        : `${mobileScheme}://reset-password`);

    if (!value) {
      throw new Error('PASSWORD_RESET_URL is not defined');
    }

    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new Error('PASSWORD_RESET_URL must be a valid absolute URL');
    }

    const allowedProtocols = new Set(['https:', `${mobileScheme}:`]);

    if (!allowedProtocols.has(url.protocol)) {
      throw new Error(
        'PASSWORD_RESET_URL must use HTTPS or the configured mobile app scheme',
      );
    }

    return url;
  }
}
