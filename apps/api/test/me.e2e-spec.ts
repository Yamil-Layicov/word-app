/// <reference types="jest" />

/**
 * Bu fayl MeModule üçün e2e test-lər saxlayır.
 *
 * Niyə e2e test?
 * - MeController, DTO validation, AccessTokenGuard, MeService, MeRepository və Prisma birlikdə yoxlanır.
 * - Bu module user profile, active language pair və user language pair flow üçün əsas yerdir.
 *
 * Test olunan endpoint-lər:
 * - GET   /me/profile
 * - PATCH /me/profile
 * - GET   /me/language-pairs
 * - POST  /me/language-pairs
 * - PATCH /me/active-language-pair
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CefrLevel, UserRole, UserStatus } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  expectAuthResponseBody,
  expectBooleanField,
  expectNullableStringField,
  expectObject,
  expectStringField,
} from './helpers/response.helpers';

type MeLanguageResponseBody = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
};

type MeLanguagePairResponseBody = {
  id: string;
  sourceLanguage: MeLanguageResponseBody;
  targetLanguage: MeLanguageResponseBody;
};

type MeProfileResponseBody = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profile: {
    id: string;
    displayName: string | null;
    countryCode: string | null;
    interfaceLanguage: string;
    activeLanguagePairId: string | null;
  } | null;
  activeLanguagePair: MeLanguagePairResponseBody | null;
  createdAt: string;
};

type MeLanguagePairListItemResponseBody = {
  id: string;
  languagePairId: string;
  languagePair: MeLanguagePairResponseBody;
  isLearning: boolean;
  targetCefrLevel: CefrLevel | null;
  isActive: boolean;
  createdAt: string;
};

/**
 * Test üçün iki simvollu code yaradır.
 *
 * Niyə lazımdır?
 * - `countryCode` və `interfaceLanguage` DTO-ları qısa code gözləyə bilər.
 * - Ona görə `me-e2e-src-${runId}` kimi uzun code göndərmirik.
 */
function makeTwoLetterCode(prefix: string, seed: string): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const suffixIndex = Number(seed.slice(-4)) % alphabet.length;

  return `${prefix}${alphabet[suffixIndex]}`;
}

/**
 * MeModule-da language object shape-ni yoxlayır.
 *
 * Niyə helper?
 * - profile və language-pairs response-larında nested language object-lər eyni shape ilə gəlir.
 */
function expectMeLanguageBody(value: unknown): MeLanguageResponseBody {
  const body = expectObject(value);

  return {
    id: expectStringField(body, 'id'),
    code: expectStringField(body, 'code'),
    name: expectStringField(body, 'name'),
    nativeName: expectStringField(body, 'nativeName'),
  };
}

/**
 * MeModule-da language pair object shape-ni yoxlayır.
 *
 * Niyə helper?
 * - activeLanguagePair və user language pair list item-larında eyni nested shape istifadə olunur.
 */
function expectMeLanguagePairBody(value: unknown): MeLanguagePairResponseBody {
  const body = expectObject(value);

  return {
    id: expectStringField(body, 'id'),
    sourceLanguage: expectMeLanguageBody(body.sourceLanguage),
    targetLanguage: expectMeLanguageBody(body.targetLanguage),
  };
}

/**
 * GET /me/profile response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - Profile response user məlumatı, profile məlumatı və active language pair-i birlikdə qaytarır.
 */
function expectMeProfileBody(value: unknown): MeProfileResponseBody {
  const body = expectObject(value);
  const profile = body.profile === null ? null : expectObject(body.profile);

  return {
    id: expectStringField(body, 'id'),
    email: expectStringField(body, 'email'),
    role: expectStringField(body, 'role') as UserRole,
    status: expectStringField(body, 'status') as UserStatus,
    profile: profile
      ? {
          id: expectStringField(profile, 'id'),
          displayName: expectNullableStringField(profile, 'displayName'),
          countryCode: expectNullableStringField(profile, 'countryCode'),
          interfaceLanguage: expectStringField(profile, 'interfaceLanguage'),
          activeLanguagePairId: expectNullableStringField(
            profile,
            'activeLanguagePairId',
          ),
        }
      : null,
    activeLanguagePair:
      body.activeLanguagePair === null
        ? null
        : expectMeLanguagePairBody(body.activeLanguagePair),
    createdAt: expectStringField(body, 'createdAt'),
  };
}

/**
 * GET /me/language-pairs və POST /me/language-pairs response item shape-ni yoxlayır.
 *
 * Niyə helper?
 * - UserLanguagePair id ilə LanguagePair id fərqlidir.
 * - `id` UserLanguagePair id-dir, `languagePairId` isə LanguagePair id-dir.
 */
function expectMeLanguagePairListItemBody(
  value: unknown,
): MeLanguagePairListItemResponseBody {
  const body = expectObject(value);

  return {
    id: expectStringField(body, 'id'),
    languagePairId: expectStringField(body, 'languagePairId'),
    languagePair: expectMeLanguagePairBody(body.languagePair),
    isLearning: expectBooleanField(body, 'isLearning'),
    targetCefrLevel:
      typeof body.targetCefrLevel === 'string'
        ? (body.targetCefrLevel as CefrLevel)
        : null,
    isActive: expectBooleanField(body, 'isActive'),
    createdAt: expectStringField(body, 'createdAt'),
  };
}

/**
 * Language pair list response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - /me/language-pairs endpoint birbaşa array qaytarır.
 * - POST /me/language-pairs də yenilənmiş list qaytarır.
 */
function expectMeLanguagePairsBody(
  value: unknown,
): MeLanguagePairListItemResponseBody[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected response body to be an array');
  }

  return value.map((item) => expectMeLanguagePairListItemBody(item));
}

describe('MeController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let countryCode: string;
  let inactiveCountryCode: string;
  let interfaceLanguageCode: string;

  let interfaceLanguageId: string;
  let sourceLanguageId: string;
  let firstTargetLanguageId: string;
  let secondTargetLanguageId: string;
  let thirdTargetLanguageId: string;

  let firstLanguagePairId: string;
  let secondLanguagePairId: string;
  let thirdLanguagePairId: string;

  let accessToken: string;

  const runId = `${Date.now()}`;
  const email = `me-e2e-${runId}@example.com`;
  const password = 'password123';

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
     * Profile update üçün active və inactive country yaradırıq.
     *
     * Qeyd:
     * - Country code 2 simvollu saxlanılır.
     * - Çünki UpdateMeProfileDto qısa country code gözləyə bilər.
     */
    countryCode = makeTwoLetterCode('x', runId).toUpperCase();
    inactiveCountryCode = makeTwoLetterCode('y', runId).toUpperCase();

    await prisma.country.create({
      data: {
        code: countryCode,
        name: 'Me E2E Country',
        emoji: '✅',
        isActive: true,
      },
    });

    await prisma.country.create({
      data: {
        code: inactiveCountryCode,
        name: 'Me E2E Inactive Country',
        emoji: '❌',
        isActive: false,
      },
    });

    /**
     * Profile update üçün ayrıca qısa active interface language yaradırıq.
     *
     * Niyə ayrıca?
     * - Language pair üçün yaratdığımız source language code uzun ola bilər.
     * - `interfaceLanguage` isə çox vaxt `az`, `en`, `tr` kimi qısa language code gözləyir.
     */
    interfaceLanguageCode = makeTwoLetterCode('z', runId);

    const interfaceLanguage = await prisma.language.create({
      data: {
        code: interfaceLanguageCode,
        name: 'Me E2E Interface Language',
        nativeName: 'Me E2E Interface Language Native',
        isActive: true,
      },
    });

    interfaceLanguageId = interfaceLanguage.id;

    /**
     * User üçün 3 language pair yaradırıq:
     * - birinci: register zamanı user-in initial language pair-i
     * - ikinci: POST /me/language-pairs ilə əlavə ediləcək
     * - üçüncü: PATCH /me/active-language-pair ilə active ediləcək
     */
    const sourceLanguage = await prisma.language.create({
      data: {
        code: `me-e2e-src-${runId}`,
        name: 'Me E2E Source',
        nativeName: 'Me E2E Source Native',
      },
    });

    const firstTargetLanguage = await prisma.language.create({
      data: {
        code: `me-e2e-target-one-${runId}`,
        name: 'Me E2E Target One',
        nativeName: 'Me E2E Target One Native',
      },
    });

    const secondTargetLanguage = await prisma.language.create({
      data: {
        code: `me-e2e-target-two-${runId}`,
        name: 'Me E2E Target Two',
        nativeName: 'Me E2E Target Two Native',
      },
    });

    const thirdTargetLanguage = await prisma.language.create({
      data: {
        code: `me-e2e-target-three-${runId}`,
        name: 'Me E2E Target Three',
        nativeName: 'Me E2E Target Three Native',
      },
    });

    sourceLanguageId = sourceLanguage.id;
    firstTargetLanguageId = firstTargetLanguage.id;
    secondTargetLanguageId = secondTargetLanguage.id;
    thirdTargetLanguageId = thirdTargetLanguage.id;

    const firstLanguagePair = await prisma.languagePair.create({
      data: {
        sourceLanguageId: sourceLanguage.id,
        targetLanguageId: firstTargetLanguage.id,
      },
    });

    const secondLanguagePair = await prisma.languagePair.create({
      data: {
        sourceLanguageId: sourceLanguage.id,
        targetLanguageId: secondTargetLanguage.id,
      },
    });

    const thirdLanguagePair = await prisma.languagePair.create({
      data: {
        sourceLanguageId: sourceLanguage.id,
        targetLanguageId: thirdTargetLanguage.id,
      },
    });

    firstLanguagePairId = firstLanguagePair.id;
    secondLanguagePairId = secondLanguagePair.id;
    thirdLanguagePairId = thirdLanguagePair.id;

    /**
     * Me endpoint-ləri protected-dir.
     * Ona görə əvvəl user register edilir, sonra login ilə accessToken alınır.
     */
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password,
        displayName: 'Me E2E User',
        countryCode,
        languagePairId: firstLanguagePairId,
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    accessToken = expectAuthResponseBody(
      loginResponse.body as unknown,
    ).accessToken;
  });

  afterAll(async () => {
    /**
     * Test data təmizlənir.
     *
     * Əvvəl user silinir, çünki UserProfile və UserLanguagePair languagePair/country-lərə bağlıdır.
     * Sonra languagePair-lər, language-lər və country-lər silinir.
     */
    await prisma.user.deleteMany({
      where: {
        email,
      },
    });

    await prisma.languagePair.deleteMany({
      where: {
        id: {
          in: [firstLanguagePairId, secondLanguagePairId, thirdLanguagePairId],
        },
      },
    });

    await prisma.language.deleteMany({
      where: {
        id: {
          in: [
            interfaceLanguageId,
            sourceLanguageId,
            firstTargetLanguageId,
            secondTargetLanguageId,
            thirdTargetLanguageId,
          ],
        },
      },
    });

    await prisma.country.deleteMany({
      where: {
        code: {
          in: [countryCode, inactiveCountryCode],
        },
      },
    });

    await app.close();
  });

  /**
   * GET /me/profile token olmadan 401 qaytarmalıdır.
   */
  it('should reject profile request without access token', async () => {
    await request(app.getHttpServer()).get('/me/profile').expect(401);
  });

  /**
   * GET /me/profile current user profile-ni qaytarmalıdır.
   */
  it('should return current user profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/me/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = expectMeProfileBody(response.body as unknown);

    expect(body.email).toBe(email);
    expect(body.role).toBe(UserRole.USER);
    expect(body.status).toBe(UserStatus.ACTIVE);
    expect(body.profile?.displayName).toBe('Me E2E User');
    expect(body.profile?.countryCode).toBe(countryCode);
    expect(body.profile?.activeLanguagePairId).toBe(firstLanguagePairId);
    expect(body.activeLanguagePair?.id).toBe(firstLanguagePairId);
  });

  /**
   * PATCH /me/profile profile field-lərini update etməlidir.
   *
   * Qeyd:
   * - interfaceLanguage üçün ayrıca yaradılmış qısa active language code istifadə edirik.
   */
  it('should update current user profile', async () => {
    const response = await request(app.getHttpServer())
      .patch('/me/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        displayName: 'Updated Me E2E User',
        countryCode,
        interfaceLanguage: interfaceLanguageCode,
      })
      .expect(200);

    const body = expectMeProfileBody(response.body as unknown);

    expect(body.profile?.displayName).toBe('Updated Me E2E User');
    expect(body.profile?.countryCode).toBe(countryCode);
    expect(body.profile?.interfaceLanguage).toBe(interfaceLanguageCode);
  });

  /**
   * PATCH /me/profile inactive countryCode ilə 400 qaytarmalıdır.
   */
  it('should reject profile update with inactive country', async () => {
    await request(app.getHttpServer())
      .patch('/me/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        countryCode: inactiveCountryCode,
      })
      .expect(400);
  });

  /**
   * GET /me/language-pairs user-in language pair-lərini qaytarmalıdır.
   */
  it('should return user language pairs', async () => {
    const response = await request(app.getHttpServer())
      .get('/me/language-pairs')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = expectMeLanguagePairsBody(response.body as unknown);
    const firstPair = body.find(
      (item) => item.languagePairId === firstLanguagePairId,
    );

    expect(firstPair).toBeDefined();
    expect(firstPair?.isLearning).toBe(true);
    expect(firstPair?.isActive).toBe(true);
    expect(firstPair?.languagePair.id).toBe(firstLanguagePairId);
  });

  /**
   * POST /me/language-pairs user-ə yeni language pair əlavə etməlidir.
   *
   * Qeyd:
   * - Bu endpoint yenilənmiş language-pairs array qaytarır.
   * - Ona görə response body array kimi parse edilir və əlavə edilən pair list içindən tapılır.
   */
  it('should add a language pair to current user', async () => {
    const response = await request(app.getHttpServer())
      .post('/me/language-pairs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        languagePairId: secondLanguagePairId,
        targetCefrLevel: CefrLevel.B1,
      })
      .expect(201);

    const body = expectMeLanguagePairsBody(response.body as unknown);
    const addedPair = body.find(
      (item) => item.languagePairId === secondLanguagePairId,
    );

    expect(addedPair).toBeDefined();
    expect(addedPair?.languagePair.id).toBe(secondLanguagePairId);
    expect(addedPair?.targetCefrLevel).toBe(CefrLevel.B1);
    expect(addedPair?.isLearning).toBe(true);
    expect(addedPair?.isActive).toBe(false);
  });

  /**
   * POST /me/language-pairs duplicate language pair üçün 409 qaytarmalıdır.
   */
  it('should reject duplicate user language pair', async () => {
    await request(app.getHttpServer())
      .post('/me/language-pairs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        languagePairId: secondLanguagePairId,
      })
      .expect(409);
  });

  /**
   * PATCH /me/active-language-pair user-in active language pair-ini dəyişməlidir.
   *
   * Qeyd:
   * - Əvvəl üçüncü language pair user-ə əlavə olunur.
   * - Sonra həmin pair active edilir.
   */
  it('should update active language pair', async () => {
    await request(app.getHttpServer())
      .post('/me/language-pairs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        languagePairId: thirdLanguagePairId,
        targetCefrLevel: CefrLevel.A2,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch('/me/active-language-pair')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        languagePairId: thirdLanguagePairId,
      })
      .expect(200);

    const body = expectMeProfileBody(response.body as unknown);

    expect(body.profile?.activeLanguagePairId).toBe(thirdLanguagePairId);
    expect(body.activeLanguagePair?.id).toBe(thirdLanguagePairId);
  });
});
