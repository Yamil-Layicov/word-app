import { Injectable } from '@nestjs/common';
import { UserWordStatus, type ReviewRating } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  AnswerReviewResult,
  DueReviewItemResult,
  ReviewTimelineUserWordResult,
  ReviewUserContext,
} from './reviews.types';

type FindDueReviewItemsInput = {
  userId: string;
  languagePairId: string;
  now: Date;
  limit: number;
};

type FindReviewTimelineItemsInput = {
  userId: string;
  languagePairId: string;
  timelineEndAt: Date;
};

type FindReviewTimelineItemsForDateInput = {
  userId: string;
  languagePairId: string;
  dateStartAt: Date;
  dateEndAt: Date;
  includeUnscheduledDue: boolean;
};

type FindReviewTargetInput = {
  userId: string;
  languagePairId: string;
  userWordId: string;
  now: Date;
};

type AnswerReviewInput = {
  userId: string;
  languagePairId: string;
  userWordId: string;
  rating: ReviewRating;
  isCorrect: boolean;
  answeredAt: Date;
  expectedReviewCount: number;
  expectedNextReviewAt: Date | null;
  nextStatus: UserWordStatus;
  nextEaseFactor: number;
  nextIntervalDays: number;
  nextReviewAt: Date;
};

const reviewExampleSelect = {
  id: true,
  sourceSentence: true,
  targetSentence: true,
} as const;

const reviewVocabularyItemSelect = {
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
    select: reviewExampleSelect,
  },
} as const;

const reviewUserWordSelect = {
  id: true,
  vocabularyItemId: true,
  status: true,
  easeFactor: true,
  intervalDays: true,
  reviewCount: true,
  correctCount: true,
  wrongCount: true,
  lastReviewedAt: true,
  nextReviewAt: true,
} as const;

const userWordWithVocabularyItemSelect = {
  ...reviewUserWordSelect,
  vocabularyItem: {
    select: reviewVocabularyItemSelect,
  },
} as const;

const reviewLogSelect = {
  id: true,
  rating: true,
  isCorrect: true,
  answeredAt: true,
} as const;

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserContext(userId: string): Promise<ReviewUserContext | null> {
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

  async findDueReviewItems(
    input: FindDueReviewItemsInput,
  ): Promise<DueReviewItemResult[]> {
    const userWords = await this.prisma.userWord.findMany({
      where: {
        userId: input.userId,
        status: {
          not: UserWordStatus.ARCHIVED,
        },
        OR: [
          {
            nextReviewAt: null,
          },
          {
            nextReviewAt: {
              lte: input.now,
            },
          },
        ],
        vocabularyItem: {
          languagePairId: input.languagePairId,
          isActive: true,
        },
      },
      orderBy: [
        {
          nextReviewAt: 'asc',
        },
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      take: input.limit,
      select: userWordWithVocabularyItemSelect,
    });

    return userWords.map(({ vocabularyItem, ...userWord }) => ({
      userWord,
      vocabularyItem,
    }));
  }

  findReviewTimelineItems(
    input: FindReviewTimelineItemsInput,
  ): Promise<ReviewTimelineUserWordResult[]> {
    return this.prisma.userWord.findMany({
      where: {
        userId: input.userId,
        status: {
          not: UserWordStatus.ARCHIVED,
        },
        OR: [
          {
            nextReviewAt: null,
          },
          {
            nextReviewAt: {
              lte: input.timelineEndAt,
            },
          },
        ],
        vocabularyItem: {
          languagePairId: input.languagePairId,
          isActive: true,
        },
      },
      orderBy: [
        {
          nextReviewAt: 'asc',
        },
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      select: {
        id: true,
        nextReviewAt: true,
      },
    });
  }

  async findReviewTimelineItemsForDate(
    input: FindReviewTimelineItemsForDateInput,
  ): Promise<DueReviewItemResult[]> {
    const reviewDateWhere = input.includeUnscheduledDue
      ? {
          OR: [
            {
              nextReviewAt: null,
            },
            {
              nextReviewAt: {
                gte: input.dateStartAt,
                lt: input.dateEndAt,
              },
            },
          ],
        }
      : {
          nextReviewAt: {
            gte: input.dateStartAt,
            lt: input.dateEndAt,
          },
        };

    const userWords = await this.prisma.userWord.findMany({
      where: {
        userId: input.userId,
        status: {
          not: UserWordStatus.ARCHIVED,
        },
        ...reviewDateWhere,
        vocabularyItem: {
          languagePairId: input.languagePairId,
          isActive: true,
        },
      },
      orderBy: [
        {
          nextReviewAt: 'asc',
        },
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      select: userWordWithVocabularyItemSelect,
    });

    return userWords.map(({ vocabularyItem, ...userWord }) => ({
      userWord,
      vocabularyItem,
    }));
  }

  async findReviewTarget(
    input: FindReviewTargetInput,
  ): Promise<DueReviewItemResult | null> {
    const userWord = await this.prisma.userWord.findFirst({
      where: {
        id: input.userWordId,
        userId: input.userId,
        status: {
          not: UserWordStatus.ARCHIVED,
        },
        OR: [
          {
            nextReviewAt: null,
          },
          {
            nextReviewAt: {
              lte: input.now,
            },
          },
        ],
        vocabularyItem: {
          languagePairId: input.languagePairId,
          isActive: true,
        },
      },
      select: userWordWithVocabularyItemSelect,
    });

    if (!userWord) {
      return null;
    }

    const { vocabularyItem, ...userWordModel } = userWord;

    return {
      userWord: userWordModel,
      vocabularyItem,
    };
  }

  async answerReview(
    input: AnswerReviewInput,
  ): Promise<AnswerReviewResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const reviewTarget = await tx.userWord.findFirst({
        where: {
          id: input.userWordId,
          userId: input.userId,
          status: {
            not: UserWordStatus.ARCHIVED,
          },
          OR: [
            {
              nextReviewAt: null,
            },
            {
              nextReviewAt: {
                lte: input.answeredAt,
              },
            },
          ],
          vocabularyItem: {
            languagePairId: input.languagePairId,
            isActive: true,
          },
        },
        select: userWordWithVocabularyItemSelect,
      });

      if (!reviewTarget) {
        return null;
      }

      const updateResult = await tx.userWord.updateMany({
        where: {
          id: reviewTarget.id,
          userId: input.userId,
          reviewCount: input.expectedReviewCount,
          ...(input.expectedNextReviewAt === null
            ? {
                nextReviewAt: null,
              }
            : {
                nextReviewAt: input.expectedNextReviewAt,
              }),
          status: {
            not: UserWordStatus.ARCHIVED,
          },
          OR: [
            {
              nextReviewAt: null,
            },
            {
              nextReviewAt: {
                lte: input.answeredAt,
              },
            },
          ],
          vocabularyItem: {
            languagePairId: input.languagePairId,
            isActive: true,
          },
        },
        data: {
          status: input.nextStatus,
          easeFactor: input.nextEaseFactor,
          intervalDays: input.nextIntervalDays,
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
          nextReviewAt: input.nextReviewAt,
        },
      });

      if (updateResult.count === 0) {
        return null;
      }

      const updatedUserWord = await tx.userWord.findUnique({
        where: {
          id: reviewTarget.id,
        },
        select: reviewUserWordSelect,
      });

      if (!updatedUserWord) {
        return null;
      }

      const reviewLog = await tx.reviewLog.create({
        data: {
          userId: input.userId,
          userWordId: reviewTarget.id,
          vocabularyItemId: reviewTarget.vocabularyItem.id,
          rating: input.rating,
          isCorrect: input.isCorrect,
          answeredAt: input.answeredAt,
        },
        select: reviewLogSelect,
      });

      return {
        userWord: updatedUserWord,
        vocabularyItem: reviewTarget.vocabularyItem,
        reviewLog,
      };
    });
  }
}
