/// <reference types="jest" />

import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import { UserStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  GOOGLE_LINK_EMAIL_MISMATCH_CODE,
  GOOGLE_LINK_EMAIL_MISMATCH_MESSAGE,
  GOOGLE_PROVIDER_ALREADY_LINKED_CODE,
  GOOGLE_PROVIDER_ALREADY_LINKED_MESSAGE,
} from '../src/modules/auth/google/google-auth.service';
import { GOOGLE_AUTH_STATUS } from '../src/modules/auth/google/google-auth.types';
import {
  GOOGLE_ID_TOKEN_VERIFIER,
  type GoogleIdentityClaims,
  type GoogleIdTokenVerifier,
} from '../src/modules/auth/google/google-id-token-verifier';
import {
  EMAIL_VERIFICATION_REQUIRED_CODE,
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
} from '../src/modules/auth/email-verification.service';
import { PasswordService } from '../src/modules/auth/password.service';
import { expectObject, expectStringField } from './helpers/response.helpers';

describe('GoogleAuthController (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let passwordService: PasswordService;
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

  function addGoogleIdentity(
    label: string,
    options?: {
      email?: string;
    },
  ): {
    claims: GoogleIdentityClaims;
    idToken: string;
  } {
    const idToken = `google-token-${runId}-${label}`;
    const claims = {
      subject: `google-subject-${runId}-${label}`,
      email: options?.email ?? `${emailPrefix}-${label}@example.com`,
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

  function postGoogleLink(idToken: string, accessToken?: string) {
    ipSequence += 1;
    const pendingRequest = request(app.getHttpServer())
      .post('/auth/google/link')
      .set('X-Forwarded-For', `198.51.100.${ipSequence}`);

    if (accessToken) {
      pendingRequest.set('Authorization', `Bearer ${accessToken}`);
    }

    return pendingRequest.send({ idToken });
  }

  function getIdentities(accessToken: string) {
    return request(app.getHttpServer())
      .get('/auth/identities')
      .set('Authorization', `Bearer ${accessToken}`);
  }

  async function createPasswordAccount(email: string) {
    const password = 'Password123!';
    const passwordHash = await passwordService.hash(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    ipSequence += 1;
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', `198.51.100.${ipSequence}`)
      .send({
        email,
        password,
      })
      .expect(201);
    const loginBody = expectObject(loginResponse.body as unknown);

    return {
      accessToken: expectStringField(loginBody, 'accessToken'),
      user,
    };
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
    passwordService = app.get(PasswordService);

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

  it('automatically links a verified password account with the same email', async () => {
    const { claims, idToken } = addGoogleIdentity('automatic-link');
    const { user } = await createPasswordAccount(claims.email);

    const response = await postGoogle(idToken).expect(200);
    const body = expectObject(response.body as unknown);
    const authenticatedUser = expectObject(body.user);

    expect(body.status).toBe(GOOGLE_AUTH_STATUS.authenticated);
    expect(authenticatedUser.id).toBe(user.id);
    expectStringField(body, 'accessToken');
    expectStringField(body, 'refreshToken');

    const storedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        passwordHash: true,
        identities: {
          select: {
            provider: true,
            providerSubject: true,
            emailAtLinkTime: true,
          },
        },
      },
    });

    expect(storedUser?.passwordHash).not.toBeNull();
    expect(storedUser?.identities).toEqual([
      {
        provider: 'GOOGLE',
        providerSubject: claims.subject,
        emailAtLinkTime: claims.email,
      },
    ]);
  });

  it('does not automatically link an unverified password account', async () => {
    const { claims, idToken } = addGoogleIdentity('unverified-auto-link');

    await prisma.user.create({
      data: {
        email: claims.email,
        passwordHash: 'existing-password-hash',
        emailVerifiedAt: null,
      },
    });

    const response = await postGoogle(idToken).expect(403);

    expect(response.body).toMatchObject({
      statusCode: 403,
      message: EMAIL_VERIFICATION_REQUIRED_MESSAGE,
      code: EMAIL_VERIFICATION_REQUIRED_CODE,
    });
    await expect(
      prisma.userIdentity.findFirst({
        where: {
          providerSubject: claims.subject,
        },
      }),
    ).resolves.toBeNull();
  });

  it('does not automatically link an inactive password account', async () => {
    const { claims, idToken } = addGoogleIdentity('blocked-auto-link');

    await prisma.user.create({
      data: {
        email: claims.email,
        passwordHash: 'existing-password-hash',
        emailVerifiedAt: new Date(),
        status: UserStatus.BLOCKED,
      },
    });

    await postGoogle(idToken).expect(403);
    await expect(
      prisma.userIdentity.findFirst({
        where: {
          providerSubject: claims.subject,
        },
      }),
    ).resolves.toBeNull();
  });

  it('requires authentication before linking a Google account', async () => {
    const { idToken } = addGoogleIdentity('unauthenticated-link');

    await postGoogleLink(idToken).expect(401);
  });

  it('links a matching Google identity and allows Google login afterward', async () => {
    const { claims, idToken } = addGoogleIdentity('password-link');
    const { accessToken, user } = await createPasswordAccount(claims.email);

    const identitiesBeforeLink = await getIdentities(accessToken).expect(200);
    expect(identitiesBeforeLink.body).toEqual([]);

    const firstLinkResponse = await postGoogleLink(idToken, accessToken).expect(
      200,
    );

    expect(firstLinkResponse.body).toMatchObject({
      provider: 'GOOGLE',
      email: claims.email,
    });
    expectStringField(
      expectObject(firstLinkResponse.body as unknown),
      'linkedAt',
    );

    await postGoogleLink(idToken, accessToken).expect(200);
    await expect(
      prisma.userIdentity.count({
        where: {
          userId: user.id,
          provider: 'GOOGLE',
        },
      }),
    ).resolves.toBe(1);

    const identitiesAfterLink = await getIdentities(accessToken).expect(200);
    expect(identitiesAfterLink.body).toEqual([
      expect.objectContaining({
        provider: 'GOOGLE',
        email: claims.email,
      }),
    ]);

    const googleLoginResponse = await postGoogle(idToken).expect(200);
    const googleLoginBody = expectObject(googleLoginResponse.body as unknown);
    const googleLoginUser = expectObject(googleLoginBody.user);

    expect(googleLoginUser.id).toBe(user.id);
  });

  it('rejects linking a Google account with a different email', async () => {
    const passwordIdentity = addGoogleIdentity('password-owner');
    const googleIdentity = addGoogleIdentity('different-google-email');
    const { accessToken } = await createPasswordAccount(
      passwordIdentity.claims.email,
    );

    const response = await postGoogleLink(
      googleIdentity.idToken,
      accessToken,
    ).expect(409);

    expect(response.body).toMatchObject({
      code: GOOGLE_LINK_EMAIL_MISMATCH_CODE,
      message: GOOGLE_LINK_EMAIL_MISMATCH_MESSAGE,
    });
  });

  it('rejects replacing an already linked Google account', async () => {
    const firstIdentity = addGoogleIdentity('first-linked-account');
    const secondIdentity = addGoogleIdentity('second-linked-account', {
      email: firstIdentity.claims.email,
    });
    const { accessToken } = await createPasswordAccount(
      firstIdentity.claims.email,
    );

    await postGoogleLink(firstIdentity.idToken, accessToken).expect(200);
    const response = await postGoogleLink(
      secondIdentity.idToken,
      accessToken,
    ).expect(409);

    expect(response.body).toMatchObject({
      code: GOOGLE_PROVIDER_ALREADY_LINKED_CODE,
      message: GOOGLE_PROVIDER_ALREADY_LINKED_MESSAGE,
    });
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
