/// <reference types="jest" />

/**
 * Bu fayl Auth flow üçün e2e test-lər saxlayır.
 *
 * Niyə e2e test?
 * - Controller, DTO validation, Guard, Service, Repository və Prisma zəncirini birlikdə yoxlayır.
 * - AuthTokenService unit test token logic-i qoruyur.
 * - Bu test isə real HTTP auth behavior-u qoruyur.
 *
 * Bu versiyada response helper-lər `test/helpers/response.helpers.ts` faylından import olunur.
 * Məqsəd eyni helper-ləri hər test faylında təkrar yazmamaqdır.
 */
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  EMAIL_VERIFICATION_EMAIL_GATEWAY,
  type EmailVerificationEmailGateway,
  type EmailVerificationEmailMessage,
} from '../src/modules/auth/email-verification-email.gateway';
import {
  EMAIL_VERIFICATION_REQUEST_MESSAGE,
  EMAIL_VERIFICATION_REQUIRED_CODE,
  EMAIL_VERIFICATION_SUCCESS_MESSAGE,
  INVALID_EMAIL_VERIFICATION_TOKEN_MESSAGE,
} from '../src/modules/auth/email-verification.service';
import {
  PASSWORD_RESET_EMAIL_GATEWAY,
  type PasswordResetEmailGateway,
  type PasswordResetEmailMessage,
} from '../src/modules/auth/password-reset-email.gateway';
import {
  INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
  PASSWORD_RESET_REQUEST_MESSAGE,
  PASSWORD_RESET_SUCCESS_MESSAGE,
} from '../src/modules/auth/password-reset.service';
import {
  AUTH_RATE_LIMIT_ERROR_CODE,
  AUTH_RATE_LIMIT_ERROR_MESSAGE,
} from '../src/modules/auth/rate-limit/auth-rate-limit.constants';
import {
  expectAuthResponseBody,
  expectObject,
  expectStringField,
  type AuthResponseBody,
} from './helpers/response.helpers';

type AuthResponseWithEmail = AuthResponseBody & {
  email: string;
};

type MeResponseBody = {
  id: string;
  email: string;
};

/**
 * /auth/me response body-ni yoxlayır.
 *
 * Niyə helper?
 * - Protected endpoint-in user identity qaytardığını yoxlayırıq.
 * - Common helper-lər sadə field oxuma işini görür, bu helper isə Auth-a aid response shape-i yığır.
 */
function expectMeResponseBody(value: unknown): MeResponseBody {
  const body = expectObject(value);

  return {
    id: expectStringField(body, 'id'),
    email: expectStringField(body, 'email'),
  };
}

describe('AuthController (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  let languagePairId: string;
  let sourceLanguageId: string;
  let targetLanguageId: string;

  const runId = `${Date.now()}`;
  const password = 'password123';
  const createdEmails: string[] = [];
  const verificationEmails: EmailVerificationEmailMessage[] = [];
  const resetEmails: PasswordResetEmailMessage[] = [];

  const emailVerificationEmailGateway: EmailVerificationEmailGateway = {
    send: jest.fn((message: EmailVerificationEmailMessage) => {
      verificationEmails.push(message);

      return Promise.resolve({
        providerMessageId: `test-verification-${verificationEmails.length}`,
      });
    }),
  };

  const passwordResetEmailGateway: PasswordResetEmailGateway = {
    send: jest.fn((message: PasswordResetEmailMessage) => {
      resetEmails.push(message);

      return Promise.resolve({
        providerMessageId: `test-message-${resetEmails.length}`,
      });
    }),
  };

  /**
   * Testlər üçün unique email yaradırıq.
   *
   * Niyə unique?
   * - Eyni test bir neçə dəfə run olunsa duplicate email problemi olmasın.
   */
  function makeEmail(label: string): string {
    return `auth-e2e-${runId}-${label}@example.com`;
  }

  /**
   * Auth register body üçün ortaq helper.
   *
   * Niyə helper?
   * - Register testlərində eyni body-ni təkrar yazmayaq.
   * - languagePairId həmişə test setup-da yaradılan real language pair olsun.
   */
  function makeRegisterBody(email: string) {
    return {
      email,
      password,
      displayName: 'Auth E2E User',
      languagePairId,
    };
  }

  function getPasswordResetToken(email: string): string {
    const message = [...resetEmails]
      .reverse()
      .find((candidate) => candidate.to === email);

    if (!message) {
      throw new Error(`Password reset email was not captured for ${email}`);
    }

    const token = new URL(message.resetUrl).searchParams.get('token');

    if (!token) {
      throw new Error('Password reset email does not contain a token');
    }

    return token;
  }

  function getEmailVerificationToken(email: string): string {
    const message = [...verificationEmails]
      .reverse()
      .find((candidate) => candidate.to === email);

    if (!message) {
      throw new Error(`Email verification email was not captured for ${email}`);
    }

    const token = new URL(message.verificationUrl).searchParams.get('token');

    if (!token) {
      throw new Error('Email verification email does not contain a token');
    }

    return token;
  }

  async function verifyTestUser(email: string): Promise<void> {
    await request(app.getHttpServer())
      .post('/auth/email-verification/confirm')
      .send({
        token: getEmailVerificationToken(email),
      })
      .expect(200);
  }

  /**
   * Test user register edir, sonra login edib token response qaytarır.
   *
   * Niyə helper?
   * - Register endpoint token qaytarmaya bilər.
   * - Refresh, logout və protected endpoint testləri üçün real login token-ləri lazımdır.
   */
  async function registerAndLoginTestUser(
    label: string,
  ): Promise<AuthResponseWithEmail> {
    const email = makeEmail(label);
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(201);

    await verifyTestUser(email);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    return {
      email,
      ...expectAuthResponseBody(loginResponse.body as unknown),
    };
  }

  beforeAll(async () => {
    /**
     * Real AppModule ilə app yaradılır.
     *
     * ValidationPipe burada ayrıca əlavə olunur, çünki main.ts e2e testdə avtomatik işləmir.
     */
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_VERIFICATION_EMAIL_GATEWAY)
      .useValue(emailVerificationEmailGateway)
      .overrideProvider(PASSWORD_RESET_EMAIL_GATEWAY)
      .useValue(passwordResetEmailGateway)
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

    /**
     * Register endpoint languagePairId tələb edir.
     * Ona görə test üçün real source language, target language və language pair yaradırıq.
     */
    const sourceLanguage = await prisma.language.create({
      data: {
        code: `auth-e2e-src-${runId}`,
        name: 'Auth E2E Source',
        nativeName: 'Auth E2E Source',
      },
    });

    const targetLanguage = await prisma.language.create({
      data: {
        code: `auth-e2e-tgt-${runId}`,
        name: 'Auth E2E Target',
        nativeName: 'Auth E2E Target',
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
    /**
     * Test data təmizlənir.
     *
     * User silinəndə profile, languagePairs və authSessions cascade ilə silinir.
     */
    await prisma.user.deleteMany({
      where: {
        email: {
          in: createdEmails,
        },
      },
    });

    await prisma.languagePair.deleteMany({
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

  /**
   * Register valid body ilə user yaratmalıdır.
   *
   * Niyə DB check?
   * - Register endpoint token qaytarmırsa belə, user-in həqiqətən yarandığını yoxlayırıq.
   */
  it('should register a new user', async () => {
    const email = makeEmail('register-success');
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(201);

    const createdUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        emailVerificationTokens: {
          select: {
            tokenHash: true,
            usedAt: true,
            revokedAt: true,
          },
        },
        profile: {
          select: {
            displayName: true,
            activeLanguagePairId: true,
          },
        },
      },
    });

    expect(createdUser).not.toBeNull();
    expect(createdUser?.email).toBe(email);
    expect(createdUser?.emailVerifiedAt).toBeNull();
    expect(createdUser?.emailVerificationTokens).toHaveLength(1);
    expect(createdUser?.emailVerificationTokens[0]).toMatchObject({
      usedAt: null,
      revokedAt: null,
    });
    expect(createdUser?.profile?.displayName).toBe('Auth E2E User');
    expect(createdUser?.profile?.activeLanguagePairId).toBe(languagePairId);

    const rawToken = getEmailVerificationToken(email);
    const storedTokenHash = createdUser?.emailVerificationTokens[0]?.tokenHash;

    expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(storedTokenHash).toBe(
      createHash('sha256').update(rawToken).digest('hex'),
    );
    expect(storedTokenHash).not.toBe(rawToken);
  });

  /**
   * Register invalid body ilə 400 qaytarmalıdır.
   * Bu test DTO validation pipe-ın e2e-də işlədiyini yoxlayır.
   */
  it('should reject invalid register payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'invalid-email',
        password: 'short',
        languagePairId: '',
      })
      .expect(400);
  });

  /**
   * Duplicate email ikinci dəfə register olunmamalıdır.
   */
  it('should reject duplicate email registration', async () => {
    const email = makeEmail('duplicate');
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(409);
  });

  it('should block login until the email is verified', async () => {
    const email = makeEmail('login-unverified');
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(403);

    expect(response.body).toMatchObject({
      code: EMAIL_VERIFICATION_REQUIRED_CODE,
    });
  });

  it('should verify an account once and then allow login', async () => {
    const email = makeEmail('email-verification-success');
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(201);

    const rawToken = getEmailVerificationToken(email);
    const confirmResponse = await request(app.getHttpServer())
      .post('/auth/email-verification/confirm')
      .send({
        token: rawToken,
      })
      .expect(200);

    expect(confirmResponse.body).toEqual({
      message: EMAIL_VERIFICATION_SUCCESS_MESSAGE,
    });

    const verifiedUser = await prisma.user.findUniqueOrThrow({
      where: {
        email,
      },
      select: {
        emailVerifiedAt: true,
      },
    });

    expect(verifiedUser.emailVerifiedAt).toBeInstanceOf(Date);

    const reusedTokenResponse = await request(app.getHttpServer())
      .post('/auth/email-verification/confirm')
      .send({
        token: rawToken,
      })
      .expect(400);

    expect(reusedTokenResponse.body).toMatchObject({
      message: INVALID_EMAIL_VERIFICATION_TOKEN_MESSAGE,
    });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);
  });

  it('should allow only one concurrent confirmation for the same token', async () => {
    const email = makeEmail('email-verification-concurrent');
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(201);

    const rawToken = getEmailVerificationToken(email);
    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        request(app.getHttpServer())
          .post('/auth/email-verification/confirm')
          .send({
            token: rawToken,
          }),
      ),
    );

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 400]);

    const user = await prisma.user.findUniqueOrThrow({
      where: {
        email,
      },
      select: {
        emailVerifiedAt: true,
        emailVerificationTokens: {
          select: {
            usedAt: true,
          },
        },
      },
    });

    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(user.emailVerificationTokens).toHaveLength(1);
    expect(user.emailVerificationTokens[0]?.usedAt).toBeInstanceOf(Date);
  });

  it('should replace an unverified account token without revealing account existence', async () => {
    const email = makeEmail('email-verification-request');
    const unknownEmail = makeEmail('email-verification-unknown');
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: {
        email,
      },
      select: {
        id: true,
        emailVerificationTokens: {
          select: {
            tokenHash: true,
          },
        },
      },
    });
    const firstTokenHash = user.emailVerificationTokens[0]?.tokenHash;
    const capturedUnknownEmailsBefore = verificationEmails.filter(
      (message) => message.to === unknownEmail,
    ).length;

    const existingResponse = await request(app.getHttpServer())
      .post('/auth/email-verification/request')
      .send({
        email: email.toUpperCase(),
      })
      .expect(202);
    const unknownResponse = await request(app.getHttpServer())
      .post('/auth/email-verification/request')
      .send({
        email: unknownEmail,
      })
      .expect(202);

    const currentTokens = await prisma.emailVerificationToken.findMany({
      where: {
        userId: user.id,
      },
      select: {
        tokenHash: true,
        usedAt: true,
        revokedAt: true,
      },
    });

    expect(existingResponse.body).toEqual({
      message: EMAIL_VERIFICATION_REQUEST_MESSAGE,
    });
    expect(unknownResponse.body).toEqual(existingResponse.body);
    expect(currentTokens).toHaveLength(1);
    expect(currentTokens[0]).toMatchObject({
      usedAt: null,
      revokedAt: null,
    });
    expect(currentTokens[0]?.tokenHash).not.toBe(firstTokenHash);
    expect(
      verificationEmails.filter((message) => message.to === unknownEmail),
    ).toHaveLength(capturedUnknownEmailsBefore);
  });

  it('should return the same safe error for expired and unknown verification tokens', async () => {
    const email = makeEmail('email-verification-expired');
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(201);

    const rawToken = getEmailVerificationToken(email);
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    await prisma.emailVerificationToken.update({
      where: {
        userId: user.id,
      },
      data: {
        expiresAt: new Date(Date.now() - 1_000),
      },
    });

    const expiredResponse = await request(app.getHttpServer())
      .post('/auth/email-verification/confirm')
      .send({
        token: rawToken,
      })
      .expect(400);
    const unknownResponse = await request(app.getHttpServer())
      .post('/auth/email-verification/confirm')
      .send({
        token: 'a'.repeat(43),
      })
      .expect(400);

    expect(expiredResponse.body).toMatchObject({
      message: INVALID_EMAIL_VERIFICATION_TOKEN_MESSAGE,
    });
    expect(unknownResponse.body).toMatchObject({
      message: INVALID_EMAIL_VERIFICATION_TOKEN_MESSAGE,
    });
  });

  it('should reject an invalid forgot-password email', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({
        email: 'invalid-email',
      })
      .expect(400);
  });

  it('should return the generic response for an unknown email', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({
        email: makeEmail('forgot-password-unknown'),
      })
      .expect(202);

    expect(response.body).toEqual({
      message: PASSWORD_RESET_REQUEST_MESSAGE,
    });
  });

  it('should replace the current reset token without revealing the account', async () => {
    const email = makeEmail('forgot-password-existing');
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(201);

    const firstResponse = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({
        email,
      })
      .expect(202);

    const user = await prisma.user.findUniqueOrThrow({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });
    const firstToken = await prisma.passwordResetToken.findUniqueOrThrow({
      where: {
        userId: user.id,
      },
      select: {
        tokenHash: true,
      },
    });

    const secondResponse = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({
        email: email.toUpperCase(),
      })
      .expect(202);

    const currentTokens = await prisma.passwordResetToken.findMany({
      where: {
        userId: user.id,
      },
      select: {
        tokenHash: true,
        usedAt: true,
        revokedAt: true,
      },
    });

    expect(firstResponse.body).toEqual({
      message: PASSWORD_RESET_REQUEST_MESSAGE,
    });
    expect(secondResponse.body).toEqual(firstResponse.body);
    expect(currentTokens).toHaveLength(1);
    expect(currentTokens[0]).toMatchObject({
      usedAt: null,
      revokedAt: null,
    });
    expect(currentTokens[0]?.tokenHash).not.toBe(firstToken.tokenHash);
  });

  it('should reject an invalid reset-password payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: 'invalid-token',
        newPassword: 'short',
      })
      .expect(400);
  });

  it('should reset the password once and revoke existing refresh sessions', async () => {
    const authBody = await registerAndLoginTestUser('reset-password-success');
    const newPassword = 'new-password-123';

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({
        email: authBody.email,
      })
      .expect(202);

    const rawToken = getPasswordResetToken(authBody.email);
    const resetResponse = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: rawToken,
        newPassword,
      })
      .expect(200);

    expect(resetResponse.body).toEqual({
      message: PASSWORD_RESET_SUCCESS_MESSAGE,
    });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: authBody.refreshToken,
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: authBody.email,
        password,
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: authBody.email,
        password: newPassword,
      })
      .expect(201);

    const reusedTokenResponse = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'another-password-123',
      })
      .expect(400);

    expect(reusedTokenResponse.body).toMatchObject({
      message: INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
    });
  });

  it('should allow only one concurrent reset for the same token', async () => {
    const email = makeEmail('reset-password-concurrent');
    const candidatePasswords = [
      'concurrent-password-a',
      'concurrent-password-b',
    ];
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(201);
    await verifyTestUser(email);

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({
        email,
      })
      .expect(202);

    const rawToken = getPasswordResetToken(email);
    const resetResponses = await Promise.all(
      candidatePasswords.map((newPassword) =>
        request(app.getHttpServer()).post('/auth/reset-password').send({
          token: rawToken,
          newPassword,
        }),
      ),
    );

    expect(resetResponses.map(({ status }) => status).sort()).toEqual([
      200, 400,
    ]);

    const loginResponses = await Promise.all(
      candidatePasswords.map((candidatePassword) =>
        request(app.getHttpServer()).post('/auth/login').send({
          email,
          password: candidatePassword,
        }),
      ),
    );

    expect(loginResponses.map(({ status }) => status).sort()).toEqual([
      201, 401,
    ]);
  });

  it('should return the same safe error for expired and unknown reset tokens', async () => {
    const email = makeEmail('reset-password-expired');
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({
        email,
      })
      .expect(202);

    const rawToken = getPasswordResetToken(email);
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    await prisma.passwordResetToken.update({
      where: {
        userId: user.id,
      },
      data: {
        expiresAt: new Date(Date.now() - 1_000),
      },
    });

    const expiredResponse = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'new-password-123',
      })
      .expect(400);
    const unknownResponse = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: 'a'.repeat(43),
        newPassword: 'new-password-123',
      })
      .expect(400);

    expect(expiredResponse.body).toMatchObject({
      message: INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
    });
    expect(unknownResponse.body).toMatchObject({
      message: INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
    });
  });

  /**
   * Login doğru email/password ilə token-lər qaytarmalıdır.
   */
  it('should login with valid credentials', async () => {
    const email = makeEmail('login-success');
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(201);
    await verifyTestUser(email);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const body = expectAuthResponseBody(response.body as unknown);

    expect(body.accessToken).toContain('.');
    expect(body.refreshToken).toContain('.');
  });

  /**
   * Login səhv password ilə 401 qaytarmalıdır.
   */
  it('should reject login with wrong password', async () => {
    const email = makeEmail('wrong-password');
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(makeRegisterBody(email))
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password: 'wrongpass',
      })
      .expect(401);
  });

  it('should rate limit repeated login attempts for the same email', async () => {
    const email = makeEmail('login-rate-limit');
    const forwardedIp = '203.0.113.10';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', forwardedIp)
        .send({
          email,
          password: 'wrongpass',
        })
        .expect(401);
    }

    const blockedResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', forwardedIp)
      .send({
        email,
        password: 'wrongpass',
      })
      .expect(429);

    expect(blockedResponse.body).toEqual({
      statusCode: 429,
      message: AUTH_RATE_LIMIT_ERROR_MESSAGE,
      error: 'Too Many Requests',
      code: AUTH_RATE_LIMIT_ERROR_CODE,
    });
    expect(blockedResponse.headers['retry-after-auth-identity']).toBeDefined();

    await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', forwardedIp)
      .send({
        email: makeEmail('login-rate-limit-other-account'),
        password: 'wrongpass',
      })
      .expect(401);
  });

  it('should rate limit repeated registration attempts for the same email', async () => {
    const email = makeEmail('register-rate-limit');
    const forwardedIp = '203.0.113.11';
    createdEmails.push(email);

    await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Forwarded-For', forwardedIp)
      .send(makeRegisterBody(email))
      .expect(201);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .set('X-Forwarded-For', forwardedIp)
        .send(makeRegisterBody(email))
        .expect(409);
    }

    await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Forwarded-For', forwardedIp)
      .send(makeRegisterBody(email))
      .expect(429);
  });

  it.each([
    {
      path: '/auth/forgot-password',
      label: 'forgot-password-rate-limit',
      forwardedIp: '203.0.113.12',
    },
    {
      path: '/auth/email-verification/request',
      label: 'verification-request-rate-limit',
      forwardedIp: '203.0.113.13',
    },
  ])(
    'should rate limit repeated email delivery requests to $path',
    async ({ path, label, forwardedIp }) => {
      const email = makeEmail(label);

      for (let attempt = 0; attempt < 3; attempt += 1) {
        await request(app.getHttpServer())
          .post(path)
          .set('X-Forwarded-For', forwardedIp)
          .send({
            email,
          })
          .expect(202);
      }

      await request(app.getHttpServer())
        .post(path)
        .set('X-Forwarded-For', forwardedIp)
        .send({
          email,
        })
        .expect(429);
    },
  );

  /**
   * /auth/me token olmadan protected olmalıdır.
   */
  it('should reject /auth/me without access token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  /**
   * /auth/me invalid access token ilə də reject olunmalıdır.
   *
   * Niyə lazımdır?
   * - Bu test AccessTokenGuard-ın token verify zamanı error aldıqda 401 qaytardığını qoruyur.
   * - Header var, amma token yanlışdırsa user authenticated sayılmamalıdır.
   */
  it('should reject /auth/me with invalid access token', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  /**
   * /auth/me valid access token ilə current user məlumatını qaytarmalıdır.
   */
  it('should return current user with valid access token', async () => {
    const authBody = await registerAndLoginTestUser('me-success');

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${authBody.accessToken}`)
      .expect(200);

    const meBody = expectMeResponseBody(meResponse.body as unknown);

    expect(meBody.email).toBe(authBody.email);
  });

  /**
   * Refresh valid refresh token ilə yeni token-lər qaytarmalıdır.
   */
  it('should refresh tokens with a valid refresh token', async () => {
    const authBody = await registerAndLoginTestUser('refresh-success');

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: authBody.refreshToken,
      })
      .expect(201);

    const refreshedBody = expectAuthResponseBody(response.body as unknown);

    expect(refreshedBody.accessToken).toContain('.');
    expect(refreshedBody.refreshToken).toContain('.');
    expect(refreshedBody.refreshToken).not.toBe(authBody.refreshToken);
  });

  /**
   * Refresh token rotation-dan sonra köhnə refresh token yenidən işləməməlidir.
   */
  it('should reject old refresh token after rotation', async () => {
    const authBody = await registerAndLoginTestUser('refresh-rotation');

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: authBody.refreshToken,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: authBody.refreshToken,
      })
      .expect(401);
  });

  /**
   * Logout valid refresh token-i revoke etməli və 204 qaytarmalıdır.
   */
  it('should logout with a valid refresh token', async () => {
    const authBody = await registerAndLoginTestUser('logout-success');

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({
        refreshToken: authBody.refreshToken,
      })
      .expect(204);
  });

  /**
   * Logout-dan sonra həmin refresh token artıq refresh üçün işləməməlidir.
   */
  it('should reject refresh token after logout', async () => {
    const authBody = await registerAndLoginTestUser('logout-revokes-refresh');

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({
        refreshToken: authBody.refreshToken,
      })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: authBody.refreshToken,
      })
      .expect(401);
  });
});
