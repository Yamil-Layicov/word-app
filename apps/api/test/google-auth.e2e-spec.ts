/// <reference types="jest" />

import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import { UserStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  GOOGLE_ACCOUNT_LINK_REQUIRED_CODE,
  GOOGLE_ACCOUNT_LINK_REQUIRED_MESSAGE,
} from '../src/modules/auth/google/google-auth.service';
import { GOOGLE_AUTH_STATUS } from '../src/modules/auth/google/google-auth.types';
import {
  GOOGLE_ID_TOKEN_VERIFIER,
  type GoogleIdentityClaims,
  type GoogleIdTokenVerifier,
} from '../src/modules/auth/google/google-id-token-verifier';
import { expectObject, expectStringField } from './helpers/response.helpers';

describe('GoogleAuthController (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let languagePairId: string;
  let sourceLanguageId: string;
  let targetLanguageId: string;

  const runId = `${Date.now()}`;
  const emailPrefix = `google-auth-e2e-${runId}`;
  const claimsByToken = new Map<string, GoogleIdentityClaims>();
  let ipSequence = 10;

  const verifyGoogleIdToken: jest.MockedFunction<
    GoogleIdTokenVerifier['verify']
  > = jest.fn((idToken: string) => {
    const claims = claimsByToken.get(idToken);

    if (!claims) {
      return Promise.reject(
        new UnauthorizedException('Invalid Google ID token'),
      );
    }

    return Promise.resolve(claims);
  });

  function addGoogleIdentity(label: string): {
    claims: GoogleIdentityClaims;
    idToken: string;
  } {
    const idToken = `google-token-${runId}-${label}`;
    const claims = {
      subject: `google-subject-${runId}-${label}`,
      email: `${emailPrefix}-${label}@example.com`,
      displayName: `Google ${label}`,
      pictureUrl: `https://example.com/${label}.png`,
    };

    claimsByToken.set(idToken, claims);

    return {
      claims,
      idToken,
    };
  }

  function postGoogle(
    idToken: string,
    options?: {
      languagePairId?: string;
    },
  ) {
    ipSequence += 1;

    return request(app.getHttpServer())
      .post('/auth/google')
      .set('X-Forwarded-For', `198.51.100.${ipSequence}`)
      .send({
        idToken,
        languagePairId: options?.languagePairId,
      });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GOOGLE_ID_TOKEN_VERIFIER)
      .useValue({
        verify: verifyGoogleIdToken,
      })
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', 'loopback');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);

    const sourceLanguage = await prisma.language.create({
      data: {
        code: `google-e2e-src-${runId}`,
        name: 'Google E2E Source',
        nativeName: 'Google E2E Source',
      },
    });
    const targetLanguage = await prisma.language.create({
      data: {
        code: `google-e2e-tgt-${runId}`,
        name: 'Google E2E Target',
        nativeName: 'Google E2E Target',
      },
    });
    const languagePair = await prisma.languagePair.create({
      data: {
        sourceLanguageId: sourceLanguage.id,
        targetLanguageId: targetLanguage.id,
      },
    });

    sourceLanguageId = sourceLanguage.id;
    targetLanguageId = targetLanguage.id;
    languagePairId = languagePair.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: emailPrefix,
        },
      },
    });
    await prisma.languagePair.delete({
      where: {
        id: languagePairId,
      },
    });
    await prisma.language.deleteMany({
      where: {
        id: {
          in: [sourceLanguageId, targetLanguageId],
        },
      },
    });

    await app.close();
  });

  it('validates the Google auth payload before token verification', async () => {
    const callsBeforeRequest = verifyGoogleIdToken.mock.calls.length;

    await postGoogle('').expect(400);

    expect(verifyGoogleIdToken.mock.calls).toHaveLength(callsBeforeRequest);
  });

  it('rejects an invalid Google ID token', async () => {
    await postGoogle('unknown-google-token').expect(401);
  });

  it('requests onboarding without creating a partial user', async () => {
    const { claims, idToken } = addGoogleIdentity('onboarding');

    const response = await postGoogle(idToken).expect(200);
    const body = expectObject(response.body as unknown);
    const profile = expectObject(body.profile);

    expect(body.status).toBe(GOOGLE_AUTH_STATUS.onboardingRequired);
    expect(profile).toMatchObject({
      email: claims.email,
      displayName: claims.displayName,
      pictureUrl: claims.pictureUrl,
    });
    await expect(
      prisma.user.findUnique({
        where: {
          email: claims.email,
        },
      }),
    ).resolves.toBeNull();
  });

  it('rejects an inactive language pair for a new Google account', async () => {
    const { claims, idToken } = addGoogleIdentity('invalid-pair');

    await postGoogle(idToken, {
      languagePairId: 'missing-language-pair',
    }).expect(400);

    await expect(
      prisma.user.findUnique({
        where: {
          email: claims.email,
        },
      }),
    ).resolves.toBeNull();
  });

  it('creates a verified Google account and reuses its identity on login', async () => {
    const { claims, idToken } = addGoogleIdentity('complete');

    const firstResponse = await postGoogle(idToken, {
      languagePairId,
    }).expect(200);
    const firstBody = expectObject(firstResponse.body as unknown);
    const firstUser = expectObject(firstBody.user);
    const userId = expectStringField(firstUser, 'id');

    expect(firstBody.status).toBe(GOOGLE_AUTH_STATUS.authenticated);
    expectStringField(firstBody, 'accessToken');
    expectStringField(firstBody, 'refreshToken');

    const storedUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        email: true,
        passwordHash: true,
        emailVerifiedAt: true,
        profile: {
          select: {
            displayName: true,
            activeLanguagePairId: true,
          },
        },
        languagePairs: {
          select: {
            languagePairId: true,
          },
        },
        identities: {
          select: {
            provider: true,
            providerSubject: true,
            emailAtLinkTime: true,
          },
        },
      },
    });

    expect(storedUser).toMatchObject({
      email: claims.email,
      passwordHash: null,
      profile: {
        displayName: claims.displayName,
        activeLanguagePairId: languagePairId,
      },
      languagePairs: [
        {
          languagePairId,
        },
      ],
      identities: [
        {
          provider: 'GOOGLE',
          providerSubject: claims.subject,
          emailAtLinkTime: claims.email,
        },
      ],
    });
    expect(storedUser?.emailVerifiedAt).toBeInstanceOf(Date);

    const secondResponse = await postGoogle(idToken).expect(200);
    const secondBody = expectObject(secondResponse.body as unknown);
    const secondUser = expectObject(secondBody.user);

    expect(secondBody.status).toBe(GOOGLE_AUTH_STATUS.authenticated);
    expect(secondUser.id).toBe(userId);
    await expect(
      prisma.userIdentity.count({
        where: {
          userId,
        },
      }),
    ).resolves.toBe(1);
  });

  it('requires explicit linking when a password account owns the email', async () => {
    const { claims, idToken } = addGoogleIdentity('link-required');

    await prisma.user.create({
      data: {
        email: claims.email,
        passwordHash: 'existing-password-hash',
        emailVerifiedAt: new Date(),
      },
    });

    const response = await postGoogle(idToken, {
      languagePairId,
    }).expect(409);

    expect(response.body).toMatchObject({
      statusCode: 409,
      message: GOOGLE_ACCOUNT_LINK_REQUIRED_MESSAGE,
      code: GOOGLE_ACCOUNT_LINK_REQUIRED_CODE,
    });
    await expect(
      prisma.userIdentity.findFirst({
        where: {
          providerSubject: claims.subject,
        },
      }),
    ).resolves.toBeNull();
  });

  it('blocks Google login when the linked account is not active', async () => {
    const { claims, idToken } = addGoogleIdentity('blocked');

    const createdResponse = await postGoogle(idToken, {
      languagePairId,
    }).expect(200);
    const createdBody = expectObject(createdResponse.body as unknown);
    const createdUser = expectObject(createdBody.user);
    const userId = expectStringField(createdUser, 'id');

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        status: UserStatus.BLOCKED,
      },
    });

    await postGoogle(idToken).expect(403);

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        status: UserStatus.ACTIVE,
      },
    });

    expect(claims.email).toContain(emailPrefix);
  });

  it('creates only one account during concurrent onboarding completion', async () => {
    const { claims, idToken } = addGoogleIdentity('concurrent');

    const [firstResponse, secondResponse] = await Promise.all([
      postGoogle(idToken, {
        languagePairId,
      }),
      postGoogle(idToken, {
        languagePairId,
      }),
    ]);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    const firstBody = expectObject(firstResponse.body as unknown);
    const secondBody = expectObject(secondResponse.body as unknown);
    const firstUser = expectObject(firstBody.user);
    const secondUser = expectObject(secondBody.user);

    expect(firstUser.id).toBe(secondUser.id);
    await expect(
      prisma.user.count({
        where: {
          email: claims.email,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.userIdentity.count({
        where: {
          providerSubject: claims.subject,
        },
      }),
    ).resolves.toBe(1);
  });
});
