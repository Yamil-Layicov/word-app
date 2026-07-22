/// <reference types="jest" />

/**
 * Bu fayl Practice flow üçün e2e test-lər saxlayır.
 *
 * Niyə e2e test?
 * - PracticeController, DTO validation, AccessTokenGuard, PracticeService,
 *   PracticeRepository və Prisma birlikdə yoxlanır.
 * - Practice flow Reviews flow-dan ayrı olmalıdır.
 *
 * Əsas qayda:
 * - PracticeLog yaranmalıdır.
 * - UserWord.nextReviewAt dəyişməməlidir.
 * - UserWord.reviewCount / correctCount / wrongCount dəyişməməlidir.
 * - ReviewLog yaranmamalıdır.
 *
 * Bu versiyada ümumi response helper-lər `test/helpers/response.helpers.ts` faylından import olunur.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CefrLevel,
  PracticeMode,
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

type VocabularyCreateResponseBody = {
  id: string;
  userWord: {
    id: string;
    vocabularyItemId: string;
  };
};

type PracticeExampleResponseBody = {
  id: string;
  sourceSentence: string;
  targetSentence: string;
};

type PracticeItemResponseBody = {
  userWordId: string;
  vocabularyItemId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  examples: PracticeExampleResponseBody[];
  status: UserWordStatus;
  isFavorite: boolean;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
};

type PracticeListResponseBody = {
  items: PracticeItemResponseBody[];
  nextCursor: string | null;
};

type PracticeAnswerResponseBody = {
  practiceLog: {
    id: string;
    practiceMode: PracticeMode;
    isCorrect: boolean;
    answeredAt: string;
  };
  userWordId: string;
  vocabularyItemId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  status: UserWordStatus;
  isFavorite: boolean;
  nextReviewAt: string | null;
};

/**
 * Vocabulary create response-dan bu test üçün lazım olan field-ləri oxuyur.
 *
 * Niyə helper?
 * - Practice flow UserWord üzərindən işləyir.
 * - UserWord yaratmağın real yolu POST /vocabulary/items endpoint-idir.
 */
function expectVocabularyCreateBody(
  value: unknown,
): VocabularyCreateResponseBody {
  const body = expectObject(value);
  const userWord = expectObject(body.userWord);

  return {
    id: expectStringField(body, 'id'),
    userWord: {
      id: expectStringField(userWord, 'id'),
      vocabularyItemId: expectStringField(userWord, 'vocabularyItemId'),
    },
  };
}

/**
 * Practice example response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - Practice item-lar example-ları da qaytarır.
 */
function expectPracticeExampleBody(
  value: unknown,
): PracticeExampleResponseBody {
  const body = expectObject(value);

  return {
    id: expectStringField(body, 'id'),
    sourceSentence: expectStringField(body, 'sourceSentence'),
    targetSentence: expectStringField(body, 'targetSentence'),
  };
}

/**
 * Practice item response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - GET /practice/items response item-ları bu shape ilə gəlməlidir.
 */
function expectPracticeItemBody(value: unknown): PracticeItemResponseBody {
  const body = expectObject(value);
  const examples = body.examples;

  if (!Array.isArray(examples)) {
    throw new Error('Expected "examples" to be an array');
  }

  return {
    userWordId: expectStringField(body, 'userWordId'),
    vocabularyItemId: expectStringField(body, 'vocabularyItemId'),
    sourceText: expectStringField(body, 'sourceText'),
    targetText: expectStringField(body, 'targetText'),
    wordType: expectStringField(body, 'wordType') as WordType,
    cefrLevel:
      typeof body.cefrLevel === 'string' ? (body.cefrLevel as CefrLevel) : null,
    definition: expectNullableStringField(body, 'definition'),
    note: expectNullableStringField(body, 'note'),
    examples: examples.map((example) => expectPracticeExampleBody(example)),
    status: expectStringField(body, 'status') as UserWordStatus,
    isFavorite: expectBooleanField(body, 'isFavorite'),
    reviewCount: expectNumberField(body, 'reviewCount'),
    correctCount: expectNumberField(body, 'correctCount'),
    wrongCount: expectNumberField(body, 'wrongCount'),
    lastReviewedAt: expectNullableStringField(body, 'lastReviewedAt'),
    nextReviewAt: expectNullableStringField(body, 'nextReviewAt'),
  };
}

/**
 * Practice list response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - GET /practice/items həmişə `items` və `nextCursor` qaytarmalıdır.
 */
function expectPracticeListBody(value: unknown): PracticeListResponseBody {
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
    items: items.map((item) => expectPracticeItemBody(item)),
    nextCursor,
  };
}

/**
 * Practice answer response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - POST /practice/answer yalnız təmiz public response qaytarmalıdır.
 * - practiceLog içində userId/userWordId/vocabularyItemId/createdAt qaytarılmamalıdır.
 */
function expectPracticeAnswerBody(value: unknown): PracticeAnswerResponseBody {
  const body = expectObject(value);
  const practiceLog = expectObject(body.practiceLog);

  expect(practiceLog.userId).toBeUndefined();
  expect(practiceLog.userWordId).toBeUndefined();
  expect(practiceLog.vocabularyItemId).toBeUndefined();
  expect(practiceLog.createdAt).toBeUndefined();

  return {
    practiceLog: {
      id: expectStringField(practiceLog, 'id'),
      practiceMode: expectStringField(
        practiceLog,
        'practiceMode',
      ) as PracticeMode,
      isCorrect: expectBooleanField(practiceLog, 'isCorrect'),
      answeredAt: expectStringField(practiceLog, 'answeredAt'),
    },
    userWordId: expectStringField(body, 'userWordId'),
    vocabularyItemId: expectStringField(body, 'vocabularyItemId'),
    sourceText: expectStringField(body, 'sourceText'),
    targetText: expectStringField(body, 'targetText'),
    wordType: expectStringField(body, 'wordType') as WordType,
    cefrLevel:
      typeof body.cefrLevel === 'string' ? (body.cefrLevel as CefrLevel) : null,
    status: expectStringField(body, 'status') as UserWordStatus,
    isFavorite: expectBooleanField(body, 'isFavorite'),
    nextReviewAt: expectNullableStringField(body, 'nextReviewAt'),
  };
}

describe('PracticeController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let languagePairId: string;
  let sourceLanguageId: string;
  let targetLanguageId: string;
  let accessToken: string;

  const runId = `${Date.now()}`;
  const email = `practice-e2e-${runId}@example.com`;
  const password = 'password123';

  /**
   * Vocabulary item yaratmaq üçün helper.
   *
   * Niyə helper?
   * - Practice item-lar UserWord + VocabularyItem əsasında list olunur.
   * - UserWord yaratmağın real yolu POST /vocabulary/items endpoint-idir.
   */
  async function createVocabularyItem(
    label: string,
  ): Promise<VocabularyCreateResponseBody> {
    const response = await request(app.getHttpServer())
      .post('/vocabulary/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sourceText: `practice-source-${runId}-${label}`,
        targetText: `practice-target-${runId}-${label}`,
        wordType: WordType.NOUN,
        cefrLevel: CefrLevel.A1,
        definition: `Practice definition for ${label}`,
        note: `Practice note for ${label}`,
        examples: [
          {
            sourceSentence: `Practice source sentence for ${label}`,
            targetSentence: `Practice target sentence for ${label}`,
          },
        ],
      })
      .expect(201);

    return expectVocabularyCreateBody(response.body as unknown);
  }

  /**
   * UserWord state-ni database-dən oxuyur.
   *
   * Niyə helper?
   * - Practice answer-dan əvvəl və sonra SRS field-lərin dəyişmədiyini yoxlayırıq.
   */
  async function getUserWordState(userWordId: string) {
    const userWord = await prisma.userWord.findUnique({
      where: {
        id: userWordId,
      },
      select: {
        id: true,
        status: true,
        reviewCount: true,
        correctCount: true,
        wrongCount: true,
        lastReviewedAt: true,
        nextReviewAt: true,
        easeFactor: true,
        intervalDays: true,
      },
    });

    if (!userWord) {
      throw new Error('Expected UserWord to exist');
    }

    return userWord;
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
        code: `practice-e2e-src-${runId}`,
        name: 'Practice E2E Source',
        nativeName: 'Practice E2E Source',
      },
    });

    const targetLanguage = await prisma.language.create({
      data: {
        code: `practice-e2e-tgt-${runId}`,
        name: 'Practice E2E Target',
        nativeName: 'Practice E2E Target',
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
     * Practice endpoint-ləri protected-dir.
     * Ona görə əvvəl user register edilir, sonra login ilə accessToken alınır.
     */
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password,
        displayName: 'Practice E2E User',
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
     * User silinəndə UserWord, PracticeLog, ReviewLog cascade ilə silinir.
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
   * Practice items token olmadan protected olmalıdır.
   */
  it('should reject listing practice items without access token', async () => {
    await request(app.getHttpServer()).get('/practice/items').expect(401);
  });

  /**
   * Practice items user-in practice edilə bilən sözlərini qaytarmalıdır.
   */
  it('should list practice items', async () => {
    const vocabularyItem = await createVocabularyItem('list');

    const response = await request(app.getHttpServer())
      .get('/practice/items?limit=20')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = expectPracticeListBody(response.body as unknown);

    expect(
      body.items.some((item) => item.userWordId === vocabularyItem.userWord.id),
    ).toBe(true);
  });

  /**
   * Practice search sourceNormalized/targetNormalized üzərindən işləməlidir.
   */
  it('should search practice items', async () => {
    const vocabularyItem = await createVocabularyItem('search-special');

    const response = await request(app.getHttpServer())
      .get('/practice/items?search=search-special')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = expectPracticeListBody(response.body as unknown);

    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.userWordId).toBe(vocabularyItem.userWord.id);
  });

  /**
   * Favorite filter yalnız favorite item-ları qaytarmalıdır.
   */
  it('should filter practice items by favorite flag', async () => {
    const vocabularyItem = await createVocabularyItem('favorite');

    await request(app.getHttpServer())
      .patch(`/vocabulary/items/${vocabularyItem.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        isFavorite: true,
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/practice/items?isFavorite=true')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = expectPracticeListBody(response.body as unknown);

    expect(
      body.items.some((item) => item.userWordId === vocabularyItem.userWord.id),
    ).toBe(true);
    expect(body.items.every((item) => item.isFavorite)).toBe(true);
  });

  /**
   * Practice answer PracticeLog yaratmalıdır.
   * Amma official SRS field-lərini dəyişməməlidir.
   */
  it('should answer a practice item without changing official SRS state', async () => {
    const vocabularyItem = await createVocabularyItem('answer');
    const beforeState = await getUserWordState(vocabularyItem.userWord.id);

    const response = await request(app.getHttpServer())
      .post('/practice/answer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userWordId: vocabularyItem.userWord.id,
        isCorrect: true,
        practiceMode: PracticeMode.MATCHING,
      })
      .expect(201);

    const body = expectPracticeAnswerBody(response.body as unknown);
    const afterState = await getUserWordState(vocabularyItem.userWord.id);

    expect(body.userWordId).toBe(vocabularyItem.userWord.id);
    expect(body.vocabularyItemId).toBe(vocabularyItem.id);
    expect(body.practiceLog.practiceMode).toBe(PracticeMode.MATCHING);
    expect(body.practiceLog.isCorrect).toBe(true);

    expect(afterState.status).toBe(beforeState.status);
    expect(afterState.reviewCount).toBe(beforeState.reviewCount);
    expect(afterState.correctCount).toBe(beforeState.correctCount);
    expect(afterState.wrongCount).toBe(beforeState.wrongCount);
    expect(afterState.lastReviewedAt).toEqual(beforeState.lastReviewedAt);
    expect(afterState.nextReviewAt).toEqual(beforeState.nextReviewAt);
    expect(afterState.easeFactor).toBe(beforeState.easeFactor);
    expect(afterState.intervalDays).toBe(beforeState.intervalDays);

    const practiceLog = await prisma.practiceLog.findUnique({
      where: {
        id: body.practiceLog.id,
      },
      select: {
        id: true,
        userWordId: true,
        vocabularyItemId: true,
        practiceMode: true,
        isCorrect: true,
      },
    });

    expect(practiceLog).toEqual({
      id: body.practiceLog.id,
      userWordId: vocabularyItem.userWord.id,
      vocabularyItemId: vocabularyItem.id,
      practiceMode: PracticeMode.MATCHING,
      isCorrect: true,
    });
  });

  /**
   * Invalid practice answer body 400 qaytarmalıdır.
   *
   * Niyə vacibdir?
   * - DTO validation işləməlidir.
   * - isCorrect boolean olmalıdır.
   * - practiceMode enum olmalıdır.
   */
  it('should reject invalid practice answer payload', async () => {
    await request(app.getHttpServer())
      .post('/practice/answer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userWordId: '',
        isCorrect: 'yes',
        practiceMode: 'UNKNOWN_MODE',
      })
      .expect(400);
  });

  /**
   * Archived item practice answer qəbul etməməlidir.
   *
   * Niyə vacibdir?
   * - User archive etdiyi sözü default practice flow-da cavablaya bilməməlidir.
   */
  it('should reject practice answer for archived item', async () => {
    const vocabularyItem = await createVocabularyItem('archived-answer');

    await request(app.getHttpServer())
      .delete(`/vocabulary/items/${vocabularyItem.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .post('/practice/answer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userWordId: vocabularyItem.userWord.id,
        isCorrect: true,
        practiceMode: PracticeMode.FLASHCARD,
      })
      .expect(404);
  });

  /**
   * Archived item default practice list-də görünməməlidir.
   * Amma status=ARCHIVED ilə ayrıca soruşulanda görünə bilər.
   */
  it('should exclude archived items from default practice list', async () => {
    const vocabularyItem = await createVocabularyItem('archived-list');

    await request(app.getHttpServer())
      .delete(`/vocabulary/items/${vocabularyItem.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const defaultListResponse = await request(app.getHttpServer())
      .get('/practice/items?limit=50')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const defaultList = expectPracticeListBody(
      defaultListResponse.body as unknown,
    );

    expect(
      defaultList.items.some(
        (item) => item.userWordId === vocabularyItem.userWord.id,
      ),
    ).toBe(false);

    const archivedListResponse = await request(app.getHttpServer())
      .get(`/practice/items?status=${UserWordStatus.ARCHIVED}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const archivedList = expectPracticeListBody(
      archivedListResponse.body as unknown,
    );

    expect(
      archivedList.items.some(
        (item) => item.userWordId === vocabularyItem.userWord.id,
      ),
    ).toBe(true);
  });
});
