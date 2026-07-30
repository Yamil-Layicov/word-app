import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LoginTicket, VerifyIdTokenOptions } from 'google-auth-library';
import type {
  GoogleIdentityClaims,
  GoogleIdTokenVerifier,
} from './google-id-token-verifier';

export const GOOGLE_OAUTH_CLIENT = Symbol('GOOGLE_OAUTH_CLIENT');

export interface GoogleOAuthClient {
  verifyIdToken(options: VerifyIdTokenOptions): Promise<LoginTicket>;
}

@Injectable()
export class GoogleIdTokenVerifierService implements GoogleIdTokenVerifier {
  constructor(
    private readonly configService: ConfigService,
    @Inject(GOOGLE_OAUTH_CLIENT)
    private readonly googleOAuthClient: GoogleOAuthClient,
  ) {}

  async verify(idToken: string): Promise<GoogleIdentityClaims> {
    const audience = this.getAudience();

    if (!idToken.trim()) {
      throw this.invalidToken();
    }

    try {
      const ticket = await this.googleOAuthClient.verifyIdToken({
        idToken,
        audience,
      });
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw this.invalidToken();
      }

      return {
        subject: payload.sub,
        email: payload.email.toLowerCase().trim(),
        displayName: this.toOptionalText(payload.name),
        pictureUrl: this.toOptionalText(payload.picture),
      };
    } catch {
      throw this.invalidToken();
    }
  }

  private getAudience(): string[] {
    const audience = this.configService
      .get<string>('GOOGLE_OAUTH_CLIENT_IDS')
      ?.split(',')
      .map((clientId) => clientId.trim())
      .filter(Boolean);

    if (!audience?.length) {
      throw new ServiceUnavailableException('Google Sign-In is not configured');
    }

    return audience;
  }

  private toOptionalText(value: string | undefined): string | undefined {
    const normalized = value?.trim();

    return normalized || undefined;
  }

  private invalidToken(): UnauthorizedException {
    return new UnauthorizedException('Invalid Google ID token');
  }
}
