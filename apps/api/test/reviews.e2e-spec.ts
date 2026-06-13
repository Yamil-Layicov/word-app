/// <reference types="jest" />

/**
 * Bu fayl Reviews flow üçün e2e test-lər saxlayır.
 *
 * Niyə e2e test?
 * - ReviewsController, DTO validation, AccessTokenGuard, ReviewsService,
 *   SpacedRepetitionService, ReviewsRepository və Prisma birlikdə yoxlanır.
 * - Burada əsas məqsəd official SRS review flow-un real API üzərindən düzgün işlədiyini qorumaqdır.
 *
 * Bu test real database istifadə edir.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CefrLevel,
  ReviewRating,
  UserWordStatus,
  WordType,
} from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

type AuthResponseBody = {
  accessToken: string;
  refreshToken: string;
};

type VocabularyItemResponseBody = {
  id: string;
  userWord: {
    id: string;
    vocabularyItemId: string;
    status: UserWordStatus;
    reviewCount: number;
    correctCount: number;
    wrongCount: number;
    nextReviewAt: string | null;
  };
};

type DueReviewItemResponseBody = {
  userWordId: string;
  vocabularyItemId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  status: UserWordStatus;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
};

type DueReviewsResponseBody = {
  items: DueReviewItemResponseBody[];
};

type AnswerReviewResponseBody = {
  userWordId: string;
  vocabularyItemId: string;
  status: UserWordStatus;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  reviewLog: {
    id: string;
    rating: ReviewRating;
    isCorrect: boolean;
    answeredAt: string;
  };
};

type ReviewTimelineGroupResponseBody = {
  date: string;
  totalWords: number;
  dueWords: number;
};

type ReviewTimelineResponseBody = {
  groups: ReviewTimelineGroupResponseBody[];
};

type ReviewTimelineItemsResponseBody = {
  date: string;
  totalWords: number;
  dueWords: number;
  items: DueReviewItemResponseBody[];
};

/**
 * Supertest response body-ni object kimi yoxlayırıq.
 *
 * Niyə helper?
 * - `any` istifadə etməyək.
 * - Response shape səhv olsa test daha aydın fail versin.
 */
function expectObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected response body to be an object');
  }

  return value as Record<string, unknown>;
}

/**
 * Response object içindən string field oxuyur.
 *
 * Niyə helper?
 * - `accessToken`, `userWordId`, `date` kimi field-lərin həqiqətən string olduğunu yoxlayırıq.
 */
function expectStringField(
  object: Record<string, unknown>,
  fieldName: string,
): string {
  const value = object[fieldName];

  if (typeof value !== 'string') {
    throw new Error(`Expected "${fieldName}" to be a string`);
  }

  expect(value.length).toBeGreaterThan(0);

  return value;
}

/**
 * Response object içindən nullable string field oxuyur.
 *
 * Niyə helper?
 * - `lastReviewedAt`, `nextReviewAt` kimi field-lər string və ya null ola bilər.
 */
function expectNullableStringField(
  object: Record<string, unknown>,
  fieldName: string,
): string | null {
  const value = object[fieldName];

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`Expected "${fieldName}" to be a string or null`);
  }

  return value;
}

/**
 * Response object içindən number field oxuyur.
 *
 * Niyə helper?
 * - Review count və timeline count-larının number olduğunu yoxlayırıq.
 */
function expectNumberField(
  object: Record<string, unknown>,
  fieldName: string,
): number {
  const value = object[fieldName];

  if (typeof value !== 'number') {
    throw new Error(`Expected "${fieldName}" to be a number`);
  }

  return value;
}

/**
 * Response object içindən boolean field oxuyur.
 *
 * Niyə helper?
 * - `isCorrect` kimi field-lərin boolean olduğunu yoxlayırıq.
 */
function expectBooleanField(
  object: Record<string, unknown>,
  fieldName: string,
): boolean {
  const value = object[fieldName];

  if (typeof value !== 'boolean') {
    throw new Error(`Expected "${fieldName}" to be a boolean`);
  }

  return value;
}

/**
 * Auth response body-ni access/refresh token formatına çevirir.
 *
 * Niyə helper?
 * - Login response-da token-lərin mövcudluğunu təkrar-təkrar yoxlamayaq.
 */
function expectAuthResponseBody(value: unknown): AuthResponseBody {
  const body = expectObject(value);

  return {
    accessToken: expectStringField(body, 'accessToken'),
    refreshToken: expectStringField(body, 'refreshToken'),
  };
}

/**
 * Vocabulary create response-dan bu test üçün lazım olan field-ləri oxuyur.
 *
 * Niyə helper?
 * - Reviews flow userWordId ilə işləyir.
 * - VocabularyItem response-da userWord nested object kimi gəlir.
 */
function expectVocabularyItemBody(value: unknown): VocabularyItemResponseBody {
  const body = expectObject(value);
  const userWord = expectObject(body.userWord);

  return {
    id: expectStringField(body, 'id'),
    userWord: {
      id: expectStringField(userWord, 'id'),
      vocabularyItemId: expectStringField(userWord, 'vocabularyItemId'),
      status: expectStringField(userWord, 'status') as UserWordStatus,
      reviewCount: expectNumberField(userWord, 'reviewCount'),
      correctCount: expectNumberField(userWord, 'correctCount'),
      wrongCount: expectNumberField(userWord, 'wrongCount'),
      nextReviewAt: expectNullableStringField(userWord, 'nextReviewAt'),
    },
  };
}

/**
 * Due review item response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - GET /reviews/due və GET /reviews/timeline/:date/items eyni item shape-dən istifadə edir.
 */
function expectDueReviewItemBody(value: unknown): DueReviewItemResponseBody {
  const body = expectObject(value);

  return {
    userWordId: expectStringField(body, 'userWordId'),
    vocabularyItemId: expectStringField(body, 'vocabularyItemId'),
    sourceText: expectStringField(body, 'sourceText'),
    targetText: expectStringField(body, 'targetText'),
    wordType: expectStringField(body, 'wordType') as WordType,
    cefrLevel:
      typeof body.cefrLevel === 'string' ? (body.cefrLevel as CefrLevel) : null,
    status: expectStringField(body, 'status') as UserWordStatus,
    reviewCount: expectNumberField(body, 'reviewCount'),
    correctCount: expectNumberField(body, 'correctCount'),
    wrongCount: expectNumberField(body, 'wrongCount'),
    lastReviewedAt: expectNullableStringField(body, 'lastReviewedAt'),
    nextReviewAt: expectNullableStringField(body, 'nextReviewAt'),
  };
}

/**
 * Due reviews response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - GET /reviews/due həmişə `items` array qaytarmalıdır.
 */
function expectDueReviewsBody(value: unknown): DueReviewsResponseBody {
  const body = expectObject(value);
  const items = body.items;

  if (!Array.isArray(items)) {
    throw new Error('Expected "items" to be an array');
  }

  return {
    items: items.map((item) => expectDueReviewItemBody(item)),
  };
}

/**
 * Answer review response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - POST /reviews/answer həm UserWord state, həm də ReviewLog qaytarır.
 */
function expectAnswerReviewBody(value: unknown): AnswerReviewResponseBody {
  const body = expectObject(value);
  const reviewLog = expectObject(body.reviewLog);

  return {
    userWordId: expectStringField(body, 'userWordId'),
    vocabularyItemId: expectStringField(body, 'vocabularyItemId'),
    status: expectStringField(body, 'status') as UserWordStatus,
    reviewCount: expectNumberField(body, 'reviewCount'),
    correctCount: expectNumberField(body, 'correctCount'),
    wrongCount: expectNumberField(body, 'wrongCount'),
    lastReviewedAt: expectNullableStringField(body, 'lastReviewedAt'),
    nextReviewAt: expectNullableStringField(body, 'nextReviewAt'),
    reviewLog: {
      id: expectStringField(reviewLog, 'id'),
      rating: expectStringField(reviewLog, 'rating') as ReviewRating,
      isCorrect: expectBooleanField(reviewLog, 'isCorrect'),
      answeredAt: expectStringField(reviewLog, 'answeredAt'),
    },
  };
}

/**
 * Timeline response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - Backend label qaytarmır, sadəcə date və count-lar qaytarır.
 */
function expectReviewTimelineBody(value: unknown): ReviewTimelineResponseBody {
  const body = expectObject(value);
  const groups = body.groups;

  if (!Array.isArray(groups)) {
    throw new Error('Expected "groups" to be an array');
  }

  return {
    groups: groups.map((group) => {
      const groupBody = expectObject(group);

      return {
        date: expectStringField(groupBody, 'date'),
        totalWords: expectNumberField(groupBody, 'totalWords'),
        dueWords: expectNumberField(groupBody, 'dueWords'),
      };
    }),
  };
}

/**
 * Timeline items response shape-ni yoxlayır.
 *
 * Niyə helper?
 * - Timeline date kliklənəndə həmin günə düşən review item-lar gəlməlidir.
 */
function expectReviewTimelineItemsBody(
  value: unknown,
): ReviewTimelineItemsResponseBody {
  const body = expectObject(value);
  const items = body.items;

  if (!Array.isArray(items)) {
    throw new Error('Expected "items" to be an array');
  }

  return {
    date: expectStringField(body, 'date'),
    totalWords: expectNumberField(body, 'totalWords'),
    dueWords: expectNumberField(body, 'dueWords'),
    items: items.map((item) => expectDueReviewItemBody(item)),
  };
}

/**
 * Bugünkü tarixi UTC date key formatında qaytarır.
 *
 * Niyə helper?
 * - Timeline endpoint date key ilə işləyir: YYYY-MM-DD.
 * - Testdə timezone default UTC istifadə edirik.
 */
function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

describe('ReviewsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let languagePairId: string;
  let sourceLanguageId: string;
  let targetLanguageId: string;
  let accessToken: string;

  const runId = `${Date.now()}`;
  const email = `reviews-e2e-${runId}@example.com`;
  const password = 'password123';

  /**
   * Vocabulary item yaratmaq üçün helper.
   *
   * Niyə helper?
   * - Review flow UserWord üzərindən işləyir.
   * - UserWord yaratmağın real yolu POST /vocabulary/items endpoint-idir.
   */
  async function createVocabularyItem(
    label: string,
  ): Promise<VocabularyItemResponseBody> {
    const response = await request(app.getHttpServer())
      .post('/vocabulary/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sourceText: `review-source-${runId}-${label}`,
        targetText: `review-target-${runId}-${label}`,
        wordType: WordType.NOUN,
        cefrLevel: CefrLevel.A1,
        definition: `Review definition for ${label}`,
      })
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
        code: `reviews-e2e-src-${runId}`,
        name: 'Reviews E2E Source',
        nativeName: 'Reviews E2E Source',
      },
    });

    const targetLanguage = await prisma.language.create({
      data: {
        code: `reviews-e2e-tgt-${runId}`,
        name: 'Reviews E2E Target',
        nativeName: 'Reviews E2E Target',
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
     * Reviews endpoint-ləri protected-dir.
     * Ona görə əvvəl user register edilir, sonra login ilə accessToken alınır.
     */
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password,
        displayName: 'Reviews E2E User',
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
     * User silinəndə UserWord, ReviewLog, PracticeLog cascade ilə silinir.
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
   * Due reviews token olmadan protected olmalıdır.
   */
  it('should reject due reviews without access token', async () => {
    await request(app.getHttpServer()).get('/reviews/due').expect(401);
  });

  /**
   * Yeni yaradılmış UserWord nextReviewAt=null olduğu üçün due sayılmalıdır.
   */
  it('should list due review items', async () => {
    const vocabularyItem = await createVocabularyItem('due');

    const response = await request(app.getHttpServer())
      .get('/reviews/due?limit=50')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = expectDueReviewsBody(response.body as unknown);

    expect(
      body.items.some((item) => item.userWordId === vocabularyItem.userWord.id),
    ).toBe(true);
  });

  /**
   * GOOD + correct answer official SRS state-i update etməlidir.
   *
   * Gözlənilən nəticə:
   * - status REVIEWING
   * - reviewCount 1
   * - correctCount 1
   * - wrongCount 0
   * - nextReviewAt null olmamalıdır
   * - ReviewLog yaranmalıdır
   */
  it('should answer a due review item', async () => {
    const vocabularyItem = await createVocabularyItem('answer-good');

    const response = await request(app.getHttpServer())
      .post('/reviews/answer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userWordId: vocabularyItem.userWord.id,
        rating: ReviewRating.GOOD,
        isCorrect: true,
      })
      .expect(201);

    const body = expectAnswerReviewBody(response.body as unknown);

    expect(body.userWordId).toBe(vocabularyItem.userWord.id);
    expect(body.vocabularyItemId).toBe(vocabularyItem.id);
    expect(body.status).toBe(UserWordStatus.REVIEWING);
    expect(body.reviewCount).toBe(1);
    expect(body.correctCount).toBe(1);
    expect(body.wrongCount).toBe(0);
    expect(body.nextReviewAt).not.toBeNull();
    expect(body.reviewLog.rating).toBe(ReviewRating.GOOD);
    expect(body.reviewLog.isCorrect).toBe(true);
  });

  /**
   * isCorrect=false olduqda rating AGAIN olmalıdır.
   * EASY + false kombinasiyası DTO/service validation ilə reject olunmalıdır.
   */
  it('should reject invalid incorrect answer rating combination', async () => {
    const vocabularyItem = await createVocabularyItem('invalid-combo-false');

    await request(app.getHttpServer())
      .post('/reviews/answer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userWordId: vocabularyItem.userWord.id,
        rating: ReviewRating.EASY,
        isCorrect: false,
      })
      .expect(400);
  });

  /**
   * isCorrect=true olduqda rating AGAIN olmamalıdır.
   * AGAIN + true kombinasiyası reject olunmalıdır.
   */
  it('should reject invalid correct answer rating combination', async () => {
    const vocabularyItem = await createVocabularyItem('invalid-combo-true');

    await request(app.getHttpServer())
      .post('/reviews/answer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userWordId: vocabularyItem.userWord.id,
        rating: ReviewRating.AGAIN,
        isCorrect: true,
      })
      .expect(400);
  });

  /**
   * Mövcud olmayan UserWord üçün answer 404 qaytarmalıdır.
   */
  it('should return 404 when answering an unknown user word', async () => {
    await request(app.getHttpServer())
      .post('/reviews/answer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userWordId: 'unknown-user-word-id',
        rating: ReviewRating.GOOD,
        isCorrect: true,
      })
      .expect(404);
  });

  /**
   * Bir dəfə cavablanmış və nextReviewAt gələcəkdə olan söz ikinci dəfə due sayılmamalıdır.
   */
  it('should reject answering the same item again before it is due', async () => {
    const vocabularyItem = await createVocabularyItem('answer-twice');

    await request(app.getHttpServer())
      .post('/reviews/answer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userWordId: vocabularyItem.userWord.id,
        rating: ReviewRating.GOOD,
        isCorrect: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/reviews/answer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userWordId: vocabularyItem.userWord.id,
        rating: ReviewRating.GOOD,
        isCorrect: true,
      })
      .expect(404);
  });

  /**
   * Timeline scheduled review group-ları qaytarmalıdır.
   * Yeni UserWord nextReviewAt=null olduğu üçün bugün timeline-a düşməlidir.
   */
  it('should return review timeline groups', async () => {
    await createVocabularyItem('timeline');

    const response = await request(app.getHttpServer())
      .get('/reviews/timeline?days=30')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = expectReviewTimelineBody(response.body as unknown);
    const todayDateKey = getTodayDateKey();

    expect(body.groups.some((group) => group.date === todayDateKey)).toBe(true);
  });

  /**
   * Invalid timezone timeline endpoint-də reject olunmalıdır.
   */
  it('should reject review timeline with invalid timezone', async () => {
    await request(app.getHttpServer())
      .get('/reviews/timeline?timeZone=Invalid/Timezone')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  /**
   * Timeline date item-ları həmin günə düşən review sözlərini qaytarmalıdır.
   */
  it('should return review timeline items for a date', async () => {
    const vocabularyItem = await createVocabularyItem('timeline-items');
    const todayDateKey = getTodayDateKey();

    const response = await request(app.getHttpServer())
      .get(`/reviews/timeline/${todayDateKey}/items`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = expectReviewTimelineItemsBody(response.body as unknown);

    expect(body.date).toBe(todayDateKey);
    expect(
      body.items.some((item) => item.userWordId === vocabularyItem.userWord.id),
    ).toBe(true);
  });

  /**
   * Invalid date timeline items endpoint-də reject olunmalıdır.
   */
  it('should reject review timeline items with invalid date', async () => {
    await request(app.getHttpServer())
      .get('/reviews/timeline/2026-99-99/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });
});
