import { Injectable } from '@nestjs/common';
import {
  ScheduledReviewAnswerResult,
  ScheduledReviewInterval,
  ScheduledReviewState,
  UserWordStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  AnswerScheduledReviewResult,
  ScheduledReviewItemResult,
  ScheduledReviewModel,
  ScheduledReviewUserContext,
  ScheduledReviewUserWordModel,
  ScheduledReviewVocabularyItemModel,
} from './scheduled-reviews.types';

type ScheduleUserWordInput = {
  userId: string;
  languagePairId: string;
  userWordId: string;
  interval: ScheduledReviewInterval;
};

type FindActiveSchedulesInput = {
  userId: string;
  languagePairId: string;
  interval?: ScheduledReviewInterval;
};

type StartQueuedBoxInput = {
  userId: string;
  languagePairId: string;
  interval: ScheduledReviewInterval;
  startedAt: Date;
  dueAt: Date;
};

type FindDueScheduleInput = {
  userId: string;
  languagePairId: string;
  scheduleId: string;
  now: Date;
};

type AnswerDueScheduleInput = {
  userId: string;
  languagePairId: string;
  scheduleId: string;
  answeredAt: Date;
  answerResult: ScheduledReviewAnswerResult;
  isCorrect: boolean;
  nextStatus: UserWordStatus;
  nextMasteryStep: number;
  nextSchedule: {
    interval: ScheduledReviewInterval;
  } | null;
};

type CancelScheduleInput = {
  userId: string;
  languagePairId: string;
  scheduleId: string;
  cancelledAt: Date;
};

const activeScheduleStates = [
  ScheduledReviewState.QUEUED,
  ScheduledReviewState.STARTED,
  ScheduledReviewState.DUE,
];

const scheduledReviewExampleSelect = {
  id: true,
  sourceSentence: true,
  targetSentence: true,
} as const;

const scheduledReviewVocabularyItemSelect = {
  id: true,
  languagePairId: true,
  sourceText: true,
  targetText: true,
  wordType: true,
  cefrLevel: true,
  definition: true,
  note: true,
  examples: {
    orderBy: {
      createdAt: 'asc',
    },
    select: scheduledReviewExampleSelect,
  },
} as const;

const scheduledReviewUserWordSelect = {
  id: true,
  vocabularyItemId: true,
  status: true,
  masteryStep: true,
  reviewCount: true,
  correctCount: true,
  wrongCount: true,
  lastReviewedAt: true,
  nextReviewAt: true,
} as const;

const scheduledReviewWithUserWordSelect = {
  id: true,
  userId: true,
  userWordId: true,
  state: true,
  interval: true,
  answerResult: true,
  startedAt: true,
  dueAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  userWord: {
    select: {
      ...scheduledReviewUserWordSelect,
      vocabularyItem: {
        select: scheduledReviewVocabularyItemSelect,
      },
    },
  },
} as const;

type ScheduledReviewRecord = ScheduledReviewModel & {
  userWord: ScheduledReviewUserWordModel & {
    vocabularyItem: ScheduledReviewVocabularyItemModel;
  };
};

@Injectable()
export class ScheduledReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserContext(userId: string): Promise<ScheduledReviewUserContext | null> {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        status: true,
        profile: {
          select: {
            activeLanguagePairId: true,
          },
        },
        languagePairs: {
          select: {
            languagePairId: true,
            isLearning: true,
            languagePair: {
              select: {
                id: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  async findActiveSchedules(
    input: FindActiveSchedulesInput,
  ): Promise<ScheduledReviewItemResult[]> {
    const schedules = await this.prisma.userWordSchedule.findMany({
      where: {
        userId: input.userId,
        state: {
          in: activeScheduleStates,
        },
        ...(input.interval ? { interval: input.interval } : {}),
        userWord: {
          status: {
            not: UserWordStatus.ARCHIVED,
          },
          vocabularyItem: {
            languagePairId: input.languagePairId,
            isActive: true,
          },
        },
      },
      orderBy: [
        {
          dueAt: 'asc',
        },
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      select: scheduledReviewWithUserWordSelect,
    });

    return schedules.map((schedule) =>
      this.toScheduledReviewItemResult(schedule),
    );
  }

  async scheduleUserWord(
    input: ScheduleUserWordInput,
  ): Promise<ScheduledReviewItemResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const userWord = await tx.userWord.findFirst({
        where: {
          id: input.userWordId,
          userId: input.userId,
          status: {
            not: UserWordStatus.ARCHIVED,
          },
          vocabularyItem: {
            languagePairId: input.languagePairId,
            isActive: true,
          },
        },
        select: {
          id: true,
        },
      });

      if (!userWord) {
        return null;
      }

      const existingSchedule = await tx.userWordSchedule.findFirst({
        where: {
          userId: input.userId,
          userWordId: input.userWordId,
          state: {
            in: activeScheduleStates,
          },
        },
        select: {
          id: true,
        },
      });

      const schedule = existingSchedule
        ? await tx.userWordSchedule.update({
            where: {
              id: existingSchedule.id,
            },
            data: {
              interval: input.interval,
              state: ScheduledReviewState.QUEUED,
              startedAt: null,
              dueAt: null,
              answerResult: null,
              completedAt: null,
              cancelledAt: null,
            },
            select: scheduledReviewWithUserWordSelect,
          })
        : await tx.userWordSchedule.create({
            data: {
              userId: input.userId,
              userWordId: input.userWordId,
              interval: input.interval,
            },
            select: scheduledReviewWithUserWordSelect,
          });

      return this.toScheduledReviewItemResult(schedule);
    });
  }

  async startQueuedBox(
    input: StartQueuedBoxInput,
  ): Promise<ScheduledReviewItemResult[]> {
    await this.prisma.userWordSchedule.updateMany({
      where: {
        userId: input.userId,
        interval: input.interval,
        state: ScheduledReviewState.QUEUED,
        userWord: {
          status: {
            not: UserWordStatus.ARCHIVED,
          },
          vocabularyItem: {
            languagePairId: input.languagePairId,
            isActive: true,
          },
        },
      },
      data: {
        state: ScheduledReviewState.STARTED,
        startedAt: input.startedAt,
        dueAt: input.dueAt,
      },
    });

    return this.findActiveSchedules({
      userId: input.userId,
      languagePairId: input.languagePairId,
      interval: input.interval,
    });
  }

  async findDueSchedule(
    input: FindDueScheduleInput,
  ): Promise<ScheduledReviewItemResult | null> {
    const schedule = await this.prisma.userWordSchedule.findFirst({
      where: {
        id: input.scheduleId,
        userId: input.userId,
        OR: [
          {
            state: ScheduledReviewState.DUE,
          },
          {
            state: ScheduledReviewState.STARTED,
            dueAt: {
              lte: input.now,
            },
          },
        ],
        userWord: {
          status: {
            not: UserWordStatus.ARCHIVED,
          },
          vocabularyItem: {
            languagePairId: input.languagePairId,
            isActive: true,
          },
        },
      },
      select: scheduledReviewWithUserWordSelect,
    });

    return schedule ? this.toScheduledReviewItemResult(schedule) : null;
  }

  async answerDueSchedule(
    input: AnswerDueScheduleInput,
  ): Promise<AnswerScheduledReviewResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.userWordSchedule.findFirst({
        where: {
          id: input.scheduleId,
          userId: input.userId,
          OR: [
            {
              state: ScheduledReviewState.DUE,
            },
            {
              state: ScheduledReviewState.STARTED,
              dueAt: {
                lte: input.answeredAt,
              },
            },
          ],
          userWord: {
            status: {
              not: UserWordStatus.ARCHIVED,
            },
            vocabularyItem: {
              languagePairId: input.languagePairId,
              isActive: true,
            },
          },
        },
        select: scheduledReviewWithUserWordSelect,
      });

      if (!schedule) {
        return null;
      }

      const completedSchedule = await tx.userWordSchedule.updateMany({
        where: {
          id: schedule.id,
          userId: input.userId,
          OR: [
            {
              state: ScheduledReviewState.DUE,
            },
            {
              state: ScheduledReviewState.STARTED,
              dueAt: {
                lte: input.answeredAt,
              },
            },
          ],
        },
        data: {
          state: ScheduledReviewState.COMPLETED,
          answerResult: input.answerResult,
          completedAt: input.answeredAt,
        },
      });

      if (completedSchedule.count === 0) {
        return null;
      }

      const updatedUserWord = await tx.userWord.update({
        where: {
          id: schedule.userWordId,
        },
        data: {
          status: input.nextStatus,
          masteryStep: input.nextMasteryStep,
          reviewCount: {
            increment: 1,
          },
          correctCount: input.isCorrect
            ? {
                increment: 1,
              }
            : undefined,
          wrongCount: input.isCorrect
            ? undefined
            : {
                increment: 1,
              },
          lastReviewedAt: input.answeredAt,
        },
        select: scheduledReviewUserWordSelect,
      });

      const nextSchedule = input.nextSchedule
        ? await tx.userWordSchedule.create({
            data: {
              userId: input.userId,
              userWordId: schedule.userWordId,
              interval: input.nextSchedule.interval,
              state: ScheduledReviewState.QUEUED,
            },
            select: scheduledReviewWithUserWordSelect,
          })
        : null;

      return {
        completedScheduleId: schedule.id,
        result: input.answerResult,
        nextSchedule: nextSchedule
          ? this.toScheduledReviewItemResult(nextSchedule)
          : null,
        userWord: updatedUserWord,
      };
    });
  }

  async cancelSchedule(input: CancelScheduleInput): Promise<boolean> {
    const result = await this.prisma.userWordSchedule.updateMany({
      where: {
        id: input.scheduleId,
        userId: input.userId,
        state: {
          in: activeScheduleStates,
        },
        userWord: {
          status: {
            not: UserWordStatus.ARCHIVED,
          },
          vocabularyItem: {
            languagePairId: input.languagePairId,
            isActive: true,
          },
        },
      },
      data: {
        state: ScheduledReviewState.CANCELLED,
        cancelledAt: input.cancelledAt,
      },
    });

    return result.count > 0;
  }

  private toScheduledReviewItemResult(
    schedule: ScheduledReviewRecord,
  ): ScheduledReviewItemResult {
    const { userWord, ...scheduleModel } = schedule;
    const { vocabularyItem, ...userWordModel } = userWord;

    return {
      schedule: scheduleModel,
      userWord: userWordModel,
      vocabularyItem,
    };
  }
}
