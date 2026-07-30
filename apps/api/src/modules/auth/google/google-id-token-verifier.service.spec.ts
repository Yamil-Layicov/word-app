import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type GoogleOAuthClient,
  GoogleIdTokenVerifierService,
} from './google-id-token-verifier.service';

describe('GoogleIdTokenVerifierService', () => {
  const createService = (clientIds = 'web-client-id, android-client-id') => {
    const verifyIdToken = jest.fn<
      ReturnType<GoogleOAuthClient['verifyIdToken']>,
      Parameters<GoogleOAuthClient['verifyIdToken']>
    >();
    const googleOAuthClient = {
      verifyIdToken,
    };
    const configService = new ConfigService({
      GOOGLE_OAUTH_CLIENT_IDS: clientIds,
    });

    return {
      service: new GoogleIdTokenVerifierService(
        configService,
        googleOAuthClient,
      ),
      verifyIdToken,
    };
  };

  it('verifies all configured audiences and maps stable identity claims', async () => {
    const { service, verifyIdToken } = createService();

    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        iss: 'https://accounts.google.com',
        aud: 'android-client-id',
        sub: 'google-subject',
        email: ' USER@Example.com ',
        email_verified: true,
        name: ' Test User ',
        picture: ' https://example.com/avatar.png ',
        iat: 1,
        exp: 2,
      }),
    } as never);

    await expect(service.verify('google-id-token')).resolves.toEqual({
      subject: 'google-subject',
      email: 'user@example.com',
      displayName: 'Test User',
      pictureUrl: 'https://example.com/avatar.png',
    });
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'google-id-token',
      audience: ['web-client-id', 'android-client-id'],
    });
  });

  it('rejects a token without a verified email', async () => {
    const { service, verifyIdToken } = createService();

    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        iss: 'https://accounts.google.com',
        aud: 'web-client-id',
        sub: 'google-subject',
        email: 'user@example.com',
        email_verified: false,
        iat: 1,
        exp: 2,
      }),
    } as never);

    await expect(service.verify('google-id-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('does not expose verification errors from the Google client', async () => {
    const { service, verifyIdToken } = createService();

    verifyIdToken.mockRejectedValue(new Error('signature details'));

    await expect(service.verify('google-id-token')).rejects.toMatchObject({
      message: 'Invalid Google ID token',
    });
  });

  it('rejects blank tokens without calling Google', async () => {
    const { service, verifyIdToken } = createService();

    await expect(service.verify('   ')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('reports unavailable Google Sign-In when audiences are missing', async () => {
    const { service, verifyIdToken } = createService(' , ');

    await expect(service.verify('google-id-token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});
