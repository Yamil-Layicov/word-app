/// <reference types="jest" />

/**
 * Bu fayl Vocabulary flow üçün e2e test-lər saxlayır.
 *
 * Niyə e2e test?
 * - VocabularyController, DTO validation, AccessTokenGuard, Service, Repository və Prisma birlikdə yoxlanır.
 * - Burada əsas məqsəd user-in vocabulary library flow-unun real API üzərindən işlədiyini qorumaqdır.
 *
 * Bu versiyada ümumi response helper-lər `test/helpers/response.helpers.ts` faylından import olunur.
 *
 * Vacib response shape:
 * - `id` top-level VocabularyItem id-dir.
 * - `userWord.id` UserWord id-dir.
 * - `userWord.vocabularyItemId` VocabularyItem id-yə bərabər olmalıdır.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AudienceScope,
  CefrLevel,
  UserWordStatus,
  WordType,
} from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  expectAuthResponseBody,
  expectBooleanField,
  expectNullableStringField,
  expectNumberField,
  expectObject,
  expectStringField,
} from './helpers/response.helpers';

type VocabularyExampleResponseBody = {
  id: string;
  sourceSentence: string;
  targetSentence: string;
  createdAt: string;
};

type UserWordResponseBody = {
  id: string;
  vocabularyItemId: string;
  status: UserWordStatus;
  isFavorite: boolean;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  createdAt: string;
};

type VocabularyItemResponseBody = {
  id: string;
  languagePairId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  visibility: AudienceScope;
  isActive: boolean;
  examples: VocabularyExampleResponseBody[];
  userWord: UserWordResponseBody;
  createdAt: string;
};

type VocabularyListResponseBody = {
  items: VocabularyItemResponseBody[];
  nextCursor: string | null;
};

/**
 * Vocabulary example response body-ni yoxlayır.
 *
 * Niyə helper?
 * - Example shape mapper-də ayrıca map olunur, ona görə testdə də yoxlayırıq.
 */
function expectVocabularyExampleBody(
  value: unknown,
): VocabularyExampleResponseBody {
  const body = expectObject(value);

  return {
    id: expectStringField(body, 'id'),
    sourceSentence: expectStringField(body, 'sourceSentence'),
    targetSentence: expectStringField(body, 'targetSentence'),
    createdAt: expectStringField(body, 'createdAt'),
  };
}

/**
 * UserWord nested response body-ni yoxlayır.
 *
 * Niyə helper?
 * - Vocabulary response-da user-specific data top-level deyil, `userWord` içindədir.
 */
function expectUserWordBody(value: unknown): UserWordResponseBody {
  const body = expectObject(value);

  return {
    id: expectStringField(body, 'id'),
    vocabularyItemId: expectStringField(body, 'vocabularyItemId'),
    status: expectStringField(body, 'status') as UserWordStatus,
    isFavorite: expectBooleanField(body, 'isFavorite'),
    reviewCount: expectNumberField(body, 'reviewCount'),
    correctCount: expectNumberField(body, 'correctCount'),
    wrongCount: expectNumberField(body, 'wrongCount'),
    lastReviewedAt: expectNullableStringField(body, 'lastReviewedAt'),
    nextReviewAt: expectNullableStringField(body, 'nextReviewAt'),
    createdAt: expectStringField(body, 'createdAt'),
  };
}

/**
 * Vocabulary item response body-ni yoxlayır.
 *
 * Niyə helper?
 * - Create, detail, patch response-ları eyni əsas shape-i qaytarır.
 */
function expectVocabularyItemBody(value: unknown): VocabularyItemResponseBody {
  const body = expectObject(value);
  const examples = body.examples;

  if (!Array.isArray(examples)) {
    throw new Error('Expected "examples" to be an array');
  }

  return {
    id: expectStringField(body, 'id'),
    languagePairId: expectStringField(body, 'languagePairId'),
    sourceText: expectStringField(body, 'sourceText'),
    targetText: expectStringField(body, 'targetText'),
    wordType: expectStringField(body, 'wordType') as WordType,
    cefrLevel:
      typeof body.cefrLevel === 'string' ? (body.cefrLevel as CefrLevel) : null,
    definition: expectNullableStringField(body, 'definition'),
    note: expectNullableStringField(body, 'note'),
    visibility: expectStringField(body, 'visibility') as AudienceScope,
    isActive: expectBooleanField(body, 'isActive'),
    examples: examples.map((example) => expectVocabularyExampleBody(example)),
    userWord: expectUserWordBody(body.userWord),
    createdAt: expectStringField(body, 'createdAt'),
  };
}

/**
 * Vocabulary list response body-ni yoxlayır.
 *
 * Niyə helper?
 * - List endpoint həmişə `items` və `nextCursor` qaytarmalıdır.
 */
function expectVocabularyListBody(value: unknown): VocabularyListResponseBody {
  const body = expectObject(value);
  const items = body.items;

  if (!Array.isArray(items)) {
    throw new Error('Expected "items" to be an array');
  }

  const nextCursor = body.nextCursor;

  if (nextCursor !== null && typeof nextCursor !== 'string') {
    throw new Error('Expected "nextCursor" to be string or null');
  }

  return {
    items: items.map((item) => expectVocabularyItemBody(item)),
    nextCursor,
  };
}

describe('VocabularyController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let languagePairId: string;
  let sourceLanguageId: string;
  let targetLanguageId: string;
  let accessToken: string;

  const runId = `${Date.now()}`;
  const email = `vocabulary-e2e-${runId}@example.com`;
  const password = 'password123';

  /**
   * Test üçün vocabulary create body hazırlayırıq.
   *
   * Niyə helper?
   * - Hər testdə unique söz yaratmaq rahat olsun.
   * - Body shape eyni yerdən idarə olunsun.
   */
  function makeCreateVocabularyBody(label: string) {
    return {
      sourceText: `source-${runId}-${label}`,
      targetText: `target-${runId}-${label}`,
      wordType: WordType.NOUN,
      cefrLevel: CefrLevel.A1,
      definition: `Definition for ${label}`,
      note: `Note for ${label}`,
      examples: [
        {
          sourceSentence: `Example source sentence for ${label}`,
          targetSentence: `Example target sentence for ${label}`,
        },
      ],
    };
  }

  /**
   * Authenticated vocabulary item yaradır.
   *
   * Niyə helper?
   * - Detail, patch, archive testlərində əvvəl item yaratmaq lazımdır.
   */
  async function createVocabularyItem(
    label: string,
  ): Promise<VocabularyItemResponseBody> {
    const response = await request(app.getHttpServer())
      .post('/vocabulary/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(makeCreateVocabularyBody(label))
      .expect(201);

    return expectVocabularyItemBody(response.body as unknown);
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
     * Register üçün real language pair lazımdır.
     * Ona görə test başlamazdan əvvəl source language, target language və language pair yaradırıq.
     */
    const sourceLanguage = await prisma.language.create({
      data: {
        code: `vocab-e2e-src-${runId}`,
        name: 'Vocabulary E2E Source',
        nativeName: 'Vocabulary E2E Source',
      },
    });

    const targetLanguage = await prisma.language.create({
      data: {
        code: `vocab-e2e-tgt-${runId}`,
        name: 'Vocabulary E2E Target',
        nativeName: 'Vocabulary E2E Target',
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

    /**
     * Vocabulary endpoint-ləri protected-dir.
     * Ona görə əvvəl user register edilir, sonra login ilə accessToken alınır.
     */
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password,
        displayName: 'Vocabulary E2E User',
        languagePairId,
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
     * User silinəndə UserWord-lər cascade ilə silinir.
     * LanguagePair silinəndə VocabularyItem-lər cascade ilə silinir.
     */
    await prisma.user.deleteMany({
      where: {
        email,
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
   * Vocabulary list token olmadan protected olmalıdır.
   */
  it('should reject listing vocabulary items without access token', async () => {
    await request(app.getHttpServer()).get('/vocabulary/items').expect(401);
  });

  /**
   * Valid body ilə vocabulary item yaranmalıdır.
   */
  it('should create a vocabulary item', async () => {
    const body = await createVocabularyItem('create');

    expect(body.id).toBe(body.userWord.vocabularyItemId);
    expect(body.languagePairId).toBe(languagePairId);
    expect(body.sourceText).toBe(`source-${runId}-create`);
    expect(body.targetText).toBe(`target-${runId}-create`);
    expect(body.wordType).toBe(WordType.NOUN);
    expect(body.cefrLevel).toBe(CefrLevel.A1);
    expect(body.definition).toBe('Definition for create');
    expect(body.note).toBe('Note for create');
    expect(body.visibility).toBe(AudienceScope.PRIVATE);
    expect(body.isActive).toBe(true);
    expect(body.userWord.status).toBe(UserWordStatus.NEW);
    expect(body.userWord.isFavorite).toBe(false);
    expect(body.examples).toHaveLength(1);
  });

  /**
   * Eyni normalized source/target ilə ikinci create eyni VocabularyItem-ə bağlanmalıdır.
   *
   * Niyə vacibdir?
   * - Duplicate vocabulary item yaranmasının qarşısını qoruyur.
   */
  it('should reuse existing vocabulary item for duplicate normalized source and target', async () => {
    const firstResponse = await request(app.getHttpServer())
      .post('/vocabulary/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sourceText: `Duplicate ${runId}`,
        targetText: `Dublikat ${runId}`,
        wordType: WordType.NOUN,
      })
      .expect(201);

    const secondResponse = await request(app.getHttpServer())
      .post('/vocabulary/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sourceText: `  duplicate   ${runId}  `,
        targetText: `  dublikat   ${runId}  `,
        wordType: WordType.NOUN,
      })
      .expect(201);

    const firstBody = expectVocabularyItemBody(firstResponse.body as unknown);
    const secondBody = expectVocabularyItemBody(secondResponse.body as unknown);

    expect(secondBody.id).toBe(firstBody.id);
    expect(secondBody.userWord.id).toBe(firstBody.userWord.id);
    expect(secondBody.userWord.vocabularyItemId).toBe(firstBody.id);
  });

  /**
   * Vocabulary list default olaraq archived olmayan item-ləri qaytarmalıdır.
   */
  it('should list vocabulary items', async () => {
    const createdItem = await createVocabularyItem('list');

    const response = await request(app.getHttpServer())
      .get('/vocabulary/items?limit=20')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = expectVocabularyListBody(response.body as unknown);

    expect(body.items.some((item) => item.id === createdItem.id)).toBe(true);
  });

  /**
   * Search query sourceNormalized/targetNormalized üzərindən nəticə qaytarmalıdır.
   */
  it('should search vocabulary items', async () => {
    const createdItem = await createVocabularyItem('search-special');

    const response = await request(app.getHttpServer())
      .get('/vocabulary/items?search=search-special')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = expectVocabularyListBody(response.body as unknown);

    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.id).toBe(createdItem.id);
  });

  /**
   * Detail endpoint user-in vocabulary item məlumatını qaytarmalıdır.
   */
  it('should return vocabulary item detail', async () => {
    const createdItem = await createVocabularyItem('detail');

    const response = await request(app.getHttpServer())
      .get(`/vocabulary/items/${createdItem.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = expectVocabularyItemBody(response.body as unknown);

    expect(body.id).toBe(createdItem.id);
    expect(body.userWord.id).toBe(createdItem.userWord.id);
    expect(body.userWord.vocabularyItemId).toBe(createdItem.id);
  });

  /**
   * PATCH yalnız user-specific field-ləri update etməlidir.
   * Burada favorite və status update olunur.
   */
  it('should update user vocabulary item fields', async () => {
    const createdItem = await createVocabularyItem('patch');

    const response = await request(app.getHttpServer())
      .patch(`/vocabulary/items/${createdItem.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        isFavorite: true,
        status: UserWordStatus.MASTERED,
      })
      .expect(200);

    const body = expectVocabularyItemBody(response.body as unknown);

    expect(body.id).toBe(createdItem.id);
    expect(body.userWord.isFavorite).toBe(true);
    expect(body.userWord.status).toBe(UserWordStatus.MASTERED);
  });

  /**
   * Empty PATCH body reject olunmalıdır.
   *
   * Niyə vacibdir?
   * - Boş update request-lər database-ə mənasız əməliyyat göndərməməlidir.
   */
  it('should reject empty user vocabulary item update', async () => {
    const createdItem = await createVocabularyItem('empty-patch');

    await request(app.getHttpServer())
      .patch(`/vocabulary/items/${createdItem.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400);
  });

  /**
   * DELETE endpoint UserWord statusunu ARCHIVED etməlidir.
   * Archived item default list-də görünməməlidir, amma status=ARCHIVED ilə görünməlidir.
   */
  it('should archive a vocabulary item', async () => {
    const createdItem = await createVocabularyItem('archive');

    await request(app.getHttpServer())
      .delete(`/vocabulary/items/${createdItem.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const defaultListResponse = await request(app.getHttpServer())
      .get('/vocabulary/items?limit=50')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const defaultList = expectVocabularyListBody(
      defaultListResponse.body as unknown,
    );

    expect(defaultList.items.some((item) => item.id === createdItem.id)).toBe(
      false,
    );

    const archivedListResponse = await request(app.getHttpServer())
      .get(`/vocabulary/items?status=${UserWordStatus.ARCHIVED}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const archivedList = expectVocabularyListBody(
      archivedListResponse.body as unknown,
    );

    expect(archivedList.items.some((item) => item.id === createdItem.id)).toBe(
      true,
    );
  });

  /**
   * Mövcud olmayan item detail üçün 404 qaytarmalıdır.
   */
  it('should return 404 for unknown vocabulary item detail', async () => {
    await request(app.getHttpServer())
      .get('/vocabulary/items/unknown-id')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
