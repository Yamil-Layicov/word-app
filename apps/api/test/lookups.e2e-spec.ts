/// <reference types="jest" />

/**
 * Bu fayl public lookup endpoint-ləri üçün e2e test-lər saxlayır.
 *
 * Niyə e2e test?
 * - Countries, Languages və LanguagePairs endpoint-ləri auth-suz public API-dir.
 * - Mobile app onboarding/register ekranlarında bu data-lardan istifadə edəcək.
 * - Ona görə active data-nın gəldiyini, inactive data-nın gəlmədiyini qoruyuruq.
 *
 * Test olunan endpoint-lər:
 * - GET /countries
 * - GET /languages
 * - GET /language-pairs
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  expectNullableStringField,
  expectObject,
  expectStringField,
} from './helpers/response.helpers';

type CountryResponseBody = {
  id: string;
  code: string;
  name: string;
  emoji: string | null;
};

type LanguageResponseBody = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
};

type LanguagePairResponseBody = {
  id: string;
  sourceLanguage: LanguageResponseBody;
  targetLanguage: LanguageResponseBody;
};

/**
 * Response-un array olduğunu yoxlayır.
 *
 * Niyə helper?
 * - Lookup endpoint-lər `{ items: [...] }` yox, birbaşa array qaytarır.
 * - Shape səhv dəyişsə test aydın error versin.
 */
function expectArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected response body to be an array');
  }

  return value;
}

/**
 * Country response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - Public API-də country üçün yalnız mobile-a lazım olan field-lər gəlməlidir.
 */
function expectCountryBody(value: unknown): CountryResponseBody {
  const body = expectObject(value);

  return {
    id: expectStringField(body, 'id'),
    code: expectStringField(body, 'code'),
    name: expectStringField(body, 'name'),
    emoji: expectNullableStringField(body, 'emoji'),
  };
}

/**
 * Language response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - Language lookup-lar register/onboarding flow üçün istifadə olunacaq.
 */
function expectLanguageBody(value: unknown): LanguageResponseBody {
  const body = expectObject(value);

  return {
    id: expectStringField(body, 'id'),
    code: expectStringField(body, 'code'),
    name: expectStringField(body, 'name'),
    nativeName: expectStringField(body, 'nativeName'),
  };
}

/**
 * LanguagePair response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - LanguagePair response sourceLanguage və targetLanguage nested object-ləri ilə gəlir.
 */
function expectLanguagePairBody(value: unknown): LanguagePairResponseBody {
  const body = expectObject(value);

  return {
    id: expectStringField(body, 'id'),
    sourceLanguage: expectLanguageBody(body.sourceLanguage),
    targetLanguage: expectLanguageBody(body.targetLanguage),
  };
}

describe('Public lookup endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let activeCountryId: string;
  let inactiveCountryId: string;

  let sourceLanguageId: string;
  let targetLanguageId: string;
  let inactiveLanguageId: string;
  let inactivePairTargetLanguageId: string;

  let activeLanguagePairId: string;
  let inactiveLanguagePairId: string;

  const runId = `${Date.now()}`;

  beforeAll(async () => {
    /**
     * Real AppModule ilə app yaradılır.
     *
     * ValidationPipe burada consistency üçün əlavə olunur.
     * Bu endpoint-lər body qəbul etməsə də, e2e app setup-u digər testlərlə eyni qalır.
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
     * Active və inactive country yaradırıq.
     *
     * Məqsəd:
     * - GET /countries active country-ni qaytarmalıdır.
     * - inactive country-ni qaytarmamalıdır.
     */
    const activeCountry = await prisma.country.create({
      data: {
        code: `LC${runId.slice(-6)}`,
        name: 'Lookup E2E Active Country',
        emoji: '✅',
        isActive: true,
      },
    });

    const inactiveCountry = await prisma.country.create({
      data: {
        code: `LI${runId.slice(-6)}`,
        name: 'Lookup E2E Inactive Country',
        emoji: '❌',
        isActive: false,
      },
    });

    activeCountryId = activeCountry.id;
    inactiveCountryId = inactiveCountry.id;

    /**
     * Active və inactive language yaradırıq.
     *
     * Məqsəd:
     * - GET /languages active language-ləri qaytarmalıdır.
     * - inactive language-i qaytarmamalıdır.
     */
    const sourceLanguage = await prisma.language.create({
      data: {
        code: `lookup-src-${runId}`,
        name: 'Lookup E2E Source',
        nativeName: 'Lookup E2E Source Native',
        isActive: true,
      },
    });

    const targetLanguage = await prisma.language.create({
      data: {
        code: `lookup-tgt-${runId}`,
        name: 'Lookup E2E Target',
        nativeName: 'Lookup E2E Target Native',
        isActive: true,
      },
    });

    const inactiveLanguage = await prisma.language.create({
      data: {
        code: `lookup-inactive-${runId}`,
        name: 'Lookup E2E Inactive',
        nativeName: 'Lookup E2E Inactive Native',
        isActive: false,
      },
    });

    const inactivePairTargetLanguage = await prisma.language.create({
      data: {
        code: `lookup-pair-inactive-target-${runId}`,
        name: 'Lookup E2E Inactive Pair Target',
        nativeName: 'Lookup E2E Inactive Pair Target Native',
        isActive: true,
      },
    });

    sourceLanguageId = sourceLanguage.id;
    targetLanguageId = targetLanguage.id;
    inactiveLanguageId = inactiveLanguage.id;
    inactivePairTargetLanguageId = inactivePairTargetLanguage.id;

    /**
     * Active və inactive language pair yaradırıq.
     *
     * Məqsəd:
     * - GET /language-pairs active pair-i qaytarmalıdır.
     * - inactive pair-i qaytarmamalıdır.
     */
    const activeLanguagePair = await prisma.languagePair.create({
      data: {
        sourceLanguageId: sourceLanguage.id,
        targetLanguageId: targetLanguage.id,
        isActive: true,
      },
    });

    const inactiveLanguagePair = await prisma.languagePair.create({
      data: {
        sourceLanguageId: sourceLanguage.id,
        targetLanguageId: inactivePairTargetLanguage.id,
        isActive: false,
      },
    });

    activeLanguagePairId = activeLanguagePair.id;
    inactiveLanguagePairId = inactiveLanguagePair.id;
  });

  afterAll(async () => {
    /**
     * Test data təmizlənir.
     *
     * Əvvəl languagePair silinir, sonra language-lər.
     * Çünki LanguagePair language-lərə foreign key ilə bağlıdır.
     */
    await prisma.languagePair.deleteMany({
      where: {
        id: {
          in: [activeLanguagePairId, inactiveLanguagePairId],
        },
      },
    });

    await prisma.language.deleteMany({
      where: {
        id: {
          in: [
            sourceLanguageId,
            targetLanguageId,
            inactiveLanguageId,
            inactivePairTargetLanguageId,
          ],
        },
      },
    });

    await prisma.country.deleteMany({
      where: {
        id: {
          in: [activeCountryId, inactiveCountryId],
        },
      },
    });

    await app.close();
  });

  /**
   * GET /countries auth tələb etmədən active country-ləri qaytarmalıdır.
   */
  it('should list active countries', async () => {
    const response = await request(app.getHttpServer())
      .get('/countries')
      .expect(200);

    const countries = expectArray(response.body as unknown).map((country) =>
      expectCountryBody(country),
    );

    expect(countries.some((country) => country.id === activeCountryId)).toBe(
      true,
    );
    expect(countries.some((country) => country.id === inactiveCountryId)).toBe(
      false,
    );

    const createdCountry = countries.find(
      (country) => country.id === activeCountryId,
    );

    expect(createdCountry?.name).toBe('Lookup E2E Active Country');
    expect(createdCountry?.emoji).toBe('✅');
  });

  /**
   * GET /languages auth tələb etmədən active language-ləri qaytarmalıdır.
   */
  it('should list active languages', async () => {
    const response = await request(app.getHttpServer())
      .get('/languages')
      .expect(200);

    const languages = expectArray(response.body as unknown).map((language) =>
      expectLanguageBody(language),
    );

    expect(languages.some((language) => language.id === sourceLanguageId)).toBe(
      true,
    );
    expect(languages.some((language) => language.id === targetLanguageId)).toBe(
      true,
    );
    expect(
      languages.some((language) => language.id === inactiveLanguageId),
    ).toBe(false);

    const sourceLanguage = languages.find(
      (language) => language.id === sourceLanguageId,
    );

    expect(sourceLanguage?.name).toBe('Lookup E2E Source');
    expect(sourceLanguage?.nativeName).toBe('Lookup E2E Source Native');
  });

  /**
   * GET /language-pairs auth tələb etmədən active language pair-ləri qaytarmalıdır.
   */
  it('should list active language pairs', async () => {
    const response = await request(app.getHttpServer())
      .get('/language-pairs')
      .expect(200);

    const languagePairs = expectArray(response.body as unknown).map((pair) =>
      expectLanguagePairBody(pair),
    );

    expect(languagePairs.some((pair) => pair.id === activeLanguagePairId)).toBe(
      true,
    );
    expect(
      languagePairs.some((pair) => pair.id === inactiveLanguagePairId),
    ).toBe(false);

    const createdPair = languagePairs.find(
      (pair) => pair.id === activeLanguagePairId,
    );

    expect(createdPair?.sourceLanguage.id).toBe(sourceLanguageId);
    expect(createdPair?.targetLanguage.id).toBe(targetLanguageId);
    expect(createdPair?.sourceLanguage.name).toBe('Lookup E2E Source');
    expect(createdPair?.targetLanguage.name).toBe('Lookup E2E Target');
  });
});
