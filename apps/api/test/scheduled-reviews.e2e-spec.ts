/// <reference types="jest" />

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CefrLevel,
  PracticeMode,
  ScheduledReviewAnswerResult,
  ScheduledReviewInterval,
  ScheduledReviewState,
  UserWordStatus,
  WordType,
} from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  expectAuthResponseBody,
  expectNullableStringField,
  expectNumberField,
  expectObject,
  expectStringField,
} from './helpers/response.helpers';

type VocabularyItemBody = {
  id: string;
  userWordId: string;
};

type ScheduledReviewItemBody = {
  scheduleId: string;
  interval: ScheduledReviewInterval;
  state: ScheduledReviewState;
  startedAt: string | null;
  dueAt: string | null;
  userWordId: string;
  vocabularyItemId: string;
  sourceText: string;
  targetText: string;
  status: UserWordStatus;
  masteryStep: number;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
};

type ScheduledReviewBoxBody = {
  interval: ScheduledReviewInterval;
  totalWords: number;
  queuedWords: number;
  startedWords: number;
  dueWords: number;
  nextDueAt: string | null;
};

type ScheduledReviewBoxDetailBody = ScheduledReviewBoxBody & {
  items: ScheduledReviewItemBody[];
};

type ScheduledReviewAnswerBody = {
  completedScheduleId: string;
  result: ScheduledReviewAnswerResult;
  nextSchedule: ScheduledReviewItemBody | null;
  userWord: {
    id: string;
    status: UserWordStatus;
    masteryStep: number;
    reviewCount: number;
    correctCount: number;
    wrongCount: number;
  };
};

function expectVocabularyItemBody(value: unknown): VocabularyItemBody {
  const body = expectObject(value);
  const userWord = expectObject(body.userWord);

  return {
    id: expectStringField(body, 'id'),
    userWordId: expectStringField(userWord, 'id'),
  };
}

function expectScheduledReviewItemBody(
  value: unknown,
): ScheduledReviewItemBody {
  const body = expectObject(value);

  return {
    scheduleId: expectStringField(body, 'scheduleId'),
    interval: expectStringField(body, 'interval') as ScheduledReviewInterval,
    state: expectStringField(body, 'state') as ScheduledReviewState,
    startedAt: expectNullableStringField(body, 'startedAt'),
    dueAt: expectNullableStringField(body, 'dueAt'),
    userWordId: expectStringField(body, 'userWordId'),
    vocabularyItemId: expectStringField(body, 'vocabularyItemId'),
    sourceText: expectStringField(body, 'sourceText'),
    targetText: expectStringField(body, 'targetText'),
    status: expectStringField(body, 'status') as UserWordStatus,
    masteryStep: expectNumberField(body, 'masteryStep'),
    reviewCount: expectNumberField(body, 'reviewCount'),
    correctCount: expectNumberField(body, 'correctCount'),
    wrongCount: expectNumberField(body, 'wrongCount'),
  };
}

function expectScheduledReviewBoxBody(value: unknown): ScheduledReviewBoxBody {
  const body = expectObject(value);

  return {
    interval: expectStringField(body, 'interval') as ScheduledReviewInterval,
    totalWords: expectNumberField(body, 'totalWords'),
    queuedWords: expectNumberField(body, 'queuedWords'),
    startedWords: expectNumberField(body, 'startedWords'),
    dueWords: expectNumberField(body, 'dueWords'),
    nextDueAt: expectNullableStringField(body, 'nextDueAt'),
  };
}

function expectScheduledReviewBoxesBody(
  value: unknown,
): ScheduledReviewBoxBody[] {
  const body = expectObject(value);

  if (!Array.isArray(body.boxes)) {
    throw new Error('Expected "boxes" to be an array');
  }

  return body.boxes.map((box) => expectScheduledReviewBoxBody(box));
}

function expectScheduledReviewBoxDetailBody(
  value: unknown,
): ScheduledReviewBoxDetailBody {
  const body = expectObject(value);

  if (!Array.isArray(body.items)) {
    throw new Error('Expected "items" to be an array');
  }

  return {
    ...expectScheduledReviewBoxBody(body),
    items: body.items.map((item) => expectScheduledReviewItemBody(item)),
  };
}

function expectScheduledReviewItemsBody(
  value: unknown,
): ScheduledReviewItemBody[] {
  const body = expectObject(value);

  if (!Array.isArray(body.items)) {
    throw new Error('Expected "items" to be an array');
  }

  return body.items.map((item) => expectScheduledReviewItemBody(item));
}

function expectScheduledReviewAnswerBody(
  value: unknown,
): ScheduledReviewAnswerBody {
  const body = expectObject(value);
  const userWord = expectObject(body.userWord);

  return {
    completedScheduleId: expectStringField(body, 'completedScheduleId'),
    result: expectStringField(body, 'result') as ScheduledReviewAnswerResult,
    nextSchedule:
      body.nextSchedule === null
        ? null
        : expectScheduledReviewItemBody(body.nextSchedule),
    userWord: {
      id: expectStringField(userWord, 'id'),
      status: expectStringField(userWord, 'status') as UserWordStatus,
      masteryStep: expectNumberField(userWord, 'masteryStep'),
      reviewCount: expectNumberField(userWord, 'reviewCount'),
      correctCount: expectNumberField(userWord, 'correctCount'),
      wrongCount: expectNumberField(userWord, 'wrongCount'),
    },
  };
}

describe('ScheduledReviewsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let languagePairId: string;
  let sourceLanguageId: string;
  let targetLanguageId: string;

  const runId = `${Date.now()}`;
  const email = `scheduled-reviews-e2e-${runId}@example.com`;
  const password = 'password123';

  beforeAll(async () => {
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

    const sourceLanguage = await prisma.language.create({
      data: {
        code: `schedule-e2e-src-${runId}`,
        name: 'Scheduled Review E2E Source',
        nativeName: 'Scheduled Review E2E Source',
      },
    });
    const targetLanguage = await prisma.language.create({
      data: {
        code: `schedule-e2e-tgt-${runId}`,
        name: 'Scheduled Review E2E Target',
        nativeName: 'Scheduled Review E2E Target',
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

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password,
        displayName: 'Scheduled Review E2E User',
        languagePairId,
      })
      .expect(201);

    await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    accessToken = expectAuthResponseBody(
      loginResponse.body as unknown,
    ).accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.languagePair.deleteMany({ where: { id: languagePairId } });
    await prisma.language.deleteMany({
      where: {
        id: {
          in: [sourceLanguageId, targetLanguageId],
        },
      },
    });
    await app.close();
  });

  it('should reject scheduled review boxes without an access token', async () => {
    await request(app.getHttpServer())
      .get('/scheduled-reviews/boxes')
      .expect(401);
  });

  it('should complete a due review and queue it in the selected next box', async () => {
    const vocabularyResponse = await request(app.getHttpServer())
      .post('/vocabulary/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sourceText: `scheduled-source-${runId}`,
        targetText: `scheduled-target-${runId}`,
        wordType: WordType.NOUN,
        cefrLevel: CefrLevel.A1,
      })
      .expect(201);
    const vocabulary = expectVocabularyItemBody(
      vocabularyResponse.body as unknown,
    );

    const scheduleResponse = await request(app.getHttpServer())
      .post('/scheduled-reviews')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userWordId: vocabulary.userWordId,
        interval: ScheduledReviewInterval.ONE_HOUR,
      })
      .expect(201);
    const queuedSchedule = expectScheduledReviewItemBody(
      scheduleResponse.body as unknown,
    );

    expect(queuedSchedule.interval).toBe(ScheduledReviewInterval.ONE_HOUR);
    expect(queuedSchedule.state).toBe(ScheduledReviewState.QUEUED);
    expect(queuedSchedule.startedAt).toBeNull();
    expect(queuedSchedule.dueAt).toBeNull();
    expect(queuedSchedule.userWordId).toBe(vocabulary.userWordId);
    expect(queuedSchedule.vocabularyItemId).toBe(vocabulary.id);

    const queuedBoxesResponse = await request(app.getHttpServer())
      .get('/scheduled-reviews/boxes')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const queuedBoxes = expectScheduledReviewBoxesBody(
      queuedBoxesResponse.body as unknown,
    );
    const queuedOneHourBox = queuedBoxes.find(
      (box) => box.interval === ScheduledReviewInterval.ONE_HOUR,
    );

    expect(queuedBoxes).toHaveLength(5);
    expect(queuedOneHourBox).toMatchObject({
      totalWords: 1,
      queuedWords: 1,
      startedWords: 0,
      dueWords: 0,
      nextDueAt: null,
    });

    const startResponse = await request(app.getHttpServer())
      .patch(
        `/scheduled-reviews/boxes/${ScheduledReviewInterval.ONE_HOUR}/start`,
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const startedBox = expectScheduledReviewBoxDetailBody(
      startResponse.body as unknown,
    );

    expect(startedBox).toMatchObject({
      totalWords: 1,
      queuedWords: 0,
      startedWords: 1,
      dueWords: 0,
    });
    expect(startedBox.nextDueAt).not.toBeNull();
    expect(startedBox.items[0]).toMatchObject({
      scheduleId: queuedSchedule.scheduleId,
      state: ScheduledReviewState.STARTED,
    });

    await prisma.userWordSchedule.update({
      where: { id: queuedSchedule.scheduleId },
      data: { dueAt: new Date(Date.now() - 60_000) },
    });

    const dueBoxResponse = await request(app.getHttpServer())
      .get(`/scheduled-reviews/boxes/${ScheduledReviewInterval.ONE_HOUR}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const dueBox = expectScheduledReviewBoxDetailBody(
      dueBoxResponse.body as unknown,
    );

    expect(dueBox).toMatchObject({
      totalWords: 1,
      queuedWords: 0,
      startedWords: 0,
      dueWords: 1,
      nextDueAt: null,
    });
    expect(dueBox.items[0]?.state).toBe(ScheduledReviewState.DUE);

    const answerResponse = await request(app.getHttpServer())
      .patch(`/scheduled-reviews/${queuedSchedule.scheduleId}/answer`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        practiceMode: PracticeMode.FLASHCARD,
        result: ScheduledReviewAnswerResult.CORRECT,
        nextInterval: ScheduledReviewInterval.SIX_HOURS,
      })
      .expect(200);
    const answer = expectScheduledReviewAnswerBody(
      answerResponse.body as unknown,
    );

    expect(answer.completedScheduleId).toBe(queuedSchedule.scheduleId);
    expect(answer.result).toBe(ScheduledReviewAnswerResult.CORRECT);
    expect(answer.userWord).toEqual({
      id: vocabulary.userWordId,
      status: UserWordStatus.REVIEWING,
      masteryStep: 1,
      reviewCount: 1,
      correctCount: 1,
      wrongCount: 0,
    });
    expect(answer.nextSchedule).toMatchObject({
      interval: ScheduledReviewInterval.SIX_HOURS,
      state: ScheduledReviewState.QUEUED,
      userWordId: vocabulary.userWordId,
    });

    const activeSchedulesResponse = await request(app.getHttpServer())
      .get('/scheduled-reviews')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const activeSchedules = expectScheduledReviewItemsBody(
      activeSchedulesResponse.body as unknown,
    );

    expect(activeSchedules).toHaveLength(1);
    expect(activeSchedules[0]?.scheduleId).toBe(
      answer.nextSchedule?.scheduleId,
    );

    const finalBoxesResponse = await request(app.getHttpServer())
      .get('/scheduled-reviews/boxes')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const finalBoxes = expectScheduledReviewBoxesBody(
      finalBoxesResponse.body as unknown,
    );
    const finalOneHourBox = finalBoxes.find(
      (box) => box.interval === ScheduledReviewInterval.ONE_HOUR,
    );
    const finalSixHourBox = finalBoxes.find(
      (box) => box.interval === ScheduledReviewInterval.SIX_HOURS,
    );

    expect(finalOneHourBox?.totalWords).toBe(0);
    expect(finalSixHourBox).toMatchObject({
      totalWords: 1,
      queuedWords: 1,
      startedWords: 0,
      dueWords: 0,
    });

    const originalSchedule = await prisma.userWordSchedule.findUniqueOrThrow({
      where: { id: queuedSchedule.scheduleId },
    });
    const practiceLogs = await prisma.practiceLog.findMany({
      where: { userWordId: vocabulary.userWordId },
    });

    expect(originalSchedule.state).toBe(ScheduledReviewState.COMPLETED);
    expect(originalSchedule.answerResult).toBe(
      ScheduledReviewAnswerResult.CORRECT,
    );
    expect(practiceLogs).toHaveLength(1);
    expect(practiceLogs[0]).toMatchObject({
      practiceMode: PracticeMode.FLASHCARD,
      isCorrect: true,
    });
  });
});
