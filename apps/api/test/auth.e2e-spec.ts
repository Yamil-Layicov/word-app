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
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
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
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let languagePairId: string;
  let sourceLanguageId: string;
  let targetLanguageId: string;

  const runId = `${Date.now()}`;
  const password = 'password123';
  const createdEmails: string[] = [];

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
    }).compile();

    app = moduleFixture.createNestApplication();

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
    expect(createdUser?.profile?.displayName).toBe('Auth E2E User');
    expect(createdUser?.profile?.activeLanguagePairId).toBe(languagePairId);
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
