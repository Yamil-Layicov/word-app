/// <reference types="jest" />

import {
  ScheduledReviewAnswerResult,
  ScheduledReviewInterval,
  ScheduledReviewState,
  UserRole,
  UserStatus,
  UserWordStatus,
  WordType,
} from '@prisma/client';
import { ClockService } from '../../common/time/clock.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ScheduledReviewsRepository } from './scheduled-reviews.repository';
import { ScheduledReviewsService } from './scheduled-reviews.service';
import type {
  AnswerScheduledReviewResult,
  ScheduledReviewItemResult,
} from './scheduled-reviews.types';

const NOW = new Date('2026-07-16T08:00:00.000Z');

class TestClockService extends ClockService {
  override now(): Date {
    return NOW;
  }
}

const currentUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'user@example.com',
  role: UserRole.USER,
};

function createDueItem(masteryStep = 2): ScheduledReviewItemResult {
  return {
    schedule: {
      id: 'schedule-1',
      userId: currentUser.id,
      userWordId: 'user-word-1',
      state: ScheduledReviewState.STARTED,
      interval: ScheduledReviewInterval.ONE_HOUR,
      answerResult: null,
      startedAt: new Date('2026-07-16T06:00:00.000Z'),
      dueAt: new Date('2026-07-16T07:00:00.000Z'),
      completedAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-07-16T06:00:00.000Z'),
      updatedAt: new Date('2026-07-16T06:00:00.000Z'),
    },
    userWord: {
      id: 'user-word-1',
      vocabularyItemId: 'word-1',
      status: UserWordStatus.REVIEWING,
      masteryStep,
      reviewCount: 2,
      correctCount: 2,
      wrongCount: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
    },
    vocabularyItem: {
      id: 'word-1',
      languagePairId: 'pair-1',
      sourceText: 'hello',
      targetText: 'salam',
      wordType: WordType.OTHER,
      cefrLevel: null,
      definition: null,
      note: null,
      examples: [],
    },
  };
}

function createAnswerResult(
  input: Parameters<ScheduledReviewsRepository['answerDueSchedule']>[0],
): AnswerScheduledReviewResult {
  const target = createDueItem(input.nextMasteryStep);

  return {
    completedScheduleId: input.scheduleId,
    result: input.answerResult,
    nextSchedule: input.nextSchedule
      ? {
          ...target,
          schedule: {
            ...target.schedule,
            id: 'next-schedule-1',
            state: ScheduledReviewState.QUEUED,
            interval: input.nextSchedule.interval,
            startedAt: null,
            dueAt: null,
          },
        }
      : null,
    userWord: {
      ...target.userWord,
      status: input.nextStatus,
      masteryStep: input.nextMasteryStep,
      reviewCount: target.userWord.reviewCount + 1,
      correctCount: target.userWord.correctCount + (input.isCorrect ? 1 : 0),
      wrongCount: target.userWord.wrongCount + (input.isCorrect ? 0 : 1),
      lastReviewedAt: input.answeredAt,
    },
  };
}

describe('ScheduledReviewsService', () => {
  let repository: jest.Mocked<ScheduledReviewsRepository>;
  let answerDueScheduleMock: jest.Mock;
  let service: ScheduledReviewsService;

  beforeEach(() => {
    answerDueScheduleMock = jest.fn(
      (input: Parameters<ScheduledReviewsRepository['answerDueSchedule']>[0]) =>
        Promise.resolve(createAnswerResult(input)),
    );

    repository = {
      findUserContext: jest.fn().mockResolvedValue({
        status: UserStatus.ACTIVE,
        profile: {
          activeLanguagePairId: 'pair-1',
        },
        languagePairs: [
          {
            languagePairId: 'pair-1',
            isLearning: true,
            languagePair: {
              id: 'pair-1',
              isActive: true,
            },
          },
        ],
      }),
      findDueSchedule: jest.fn().mockResolvedValue(createDueItem()),
      answerDueSchedule: answerDueScheduleMock,
    } as unknown as jest.Mocked<ScheduledReviewsRepository>;

    service = new ScheduledReviewsService(repository, new TestClockService());
  });

  it('stores a correct result and queues the explicitly selected next box', async () => {
    const response = await service.answerSchedule(currentUser, 'schedule-1', {
      result: ScheduledReviewAnswerResult.CORRECT,
      nextInterval: ScheduledReviewInterval.ONE_WEEK,
    });

    expect(answerDueScheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        answerResult: ScheduledReviewAnswerResult.CORRECT,
        isCorrect: true,
        nextMasteryStep: 3,
        nextStatus: UserWordStatus.REVIEWING,
        nextSchedule: {
          interval: ScheduledReviewInterval.ONE_WEEK,
        },
      }),
    );
    expect(response.nextSchedule).toMatchObject({
      interval: ScheduledReviewInterval.ONE_WEEK,
      state: ScheduledReviewState.QUEUED,
      startedAt: null,
      dueAt: null,
    });
  });

  it('decreases mastery for an incorrect result and uses the selected box', async () => {
    await service.answerSchedule(currentUser, 'schedule-1', {
      result: ScheduledReviewAnswerResult.INCORRECT,
      nextInterval: ScheduledReviewInterval.SIX_HOURS,
    });

    expect(answerDueScheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        answerResult: ScheduledReviewAnswerResult.INCORRECT,
        isCorrect: false,
        nextMasteryStep: 1,
        nextStatus: UserWordStatus.LEARNING,
        nextSchedule: {
          interval: ScheduledReviewInterval.SIX_HOURS,
        },
      }),
    );
  });

  it('marks a known word as mastered without creating another schedule', async () => {
    await service.answerSchedule(currentUser, 'schedule-1', {
      result: ScheduledReviewAnswerResult.KNOWN,
    });

    expect(answerDueScheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        answerResult: ScheduledReviewAnswerResult.KNOWN,
        isCorrect: true,
        nextMasteryStep: 5,
        nextStatus: UserWordStatus.MASTERED,
        nextSchedule: null,
      }),
    );
  });

  it('requires a next interval when the word is not marked as known', async () => {
    await expect(
      service.answerSchedule(currentUser, 'schedule-1', {
        result: ScheduledReviewAnswerResult.CORRECT,
      }),
    ).rejects.toThrow('Next review interval is required');

    expect(answerDueScheduleMock).not.toHaveBeenCalled();
  });

  it('rejects a next interval when the word is marked as known', async () => {
    await expect(
      service.answerSchedule(currentUser, 'schedule-1', {
        result: ScheduledReviewAnswerResult.KNOWN,
        nextInterval: ScheduledReviewInterval.ONE_DAY,
      }),
    ).rejects.toThrow('Known words cannot have a next review interval');

    expect(answerDueScheduleMock).not.toHaveBeenCalled();
  });
});
