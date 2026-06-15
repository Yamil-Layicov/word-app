import { Injectable } from '@nestjs/common';
import {
  UserWordStatus,
  type PracticeMode as PracticeModeType,
  type UserWordStatus as UserWordStatusType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  AnswerPracticeResult,
  ListPracticeItemsResult,
  PracticeUserContext,
} from './practice.types';

type ListPracticeItemsInput = {
  userId: string;
  languagePairId: string;
  status?: UserWordStatusType;
  isFavorite?: boolean;
  searchNormalized?: string;
  limit: number;
  cursor?: string;
};

type AnswerPracticeInput = {
  userId: string;
  languagePairId: string;
  userWordId: string;
  practiceMode: PracticeModeType;
  isCorrect: boolean;
  answeredAt: Date;
};

const practiceExampleSelect = {
  id: true,
  sourceSentence: true,
  targetSentence: true,
} as const;

const practiceVocabularyItemSelect = {
  id: true,
  languagePairId: true,
  sourceText: true,
  targetText: true,
  wordType: true,
  cefrLevel: true,
  definition: true,
  note: true,
  visibility: true,
  examples: {
    orderBy: {
      createdAt: 'asc',
    },
    select: practiceExampleSelect,
  },
} as const;

const practiceUserWordSelect = {
  id: true,
  vocabularyItemId: true,
  status: true,
  isFavorite: true,
  reviewCount: true,
  correctCount: true,
  wrongCount: true,
  lastReviewedAt: true,
  nextReviewAt: true,
} as const;

const practiceUserWordWithVocabularyItemSelect = {
  ...practiceUserWordSelect,
  vocabularyItem: {
    select: practiceVocabularyItemSelect,
  },
} as const;

const practiceLogSelect = {
  id: true,
  practiceMode: true,
  isCorrect: true,
  answeredAt: true,
} as const;

@Injectable()
export class PracticeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserContext(userId: string): Promise<PracticeUserContext | null> {
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

  async findPracticeItems(
    input: ListPracticeItemsInput,
  ): Promise<ListPracticeItemsResult> {
    const userWords = await this.prisma.userWord.findMany({
      where: {
        userId: input.userId,
        status: input.status ?? {
          not: UserWordStatus.ARCHIVED,
        },
        ...(input.isFavorite !== undefined
          ? { isFavorite: input.isFavorite }
          : {}),
        vocabularyItem: {
          languagePairId: input.languagePairId,
          isActive: true,
          ...(input.searchNormalized
            ? {
                OR: [
                  {
                    sourceNormalized: {
                      contains: input.searchNormalized,
                    },
                  },
                  {
                    targetNormalized: {
                      contains: input.searchNormalized,
                    },
                  },
                ],
              }
            : {}),
        },
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: input.limit + 1,
      ...(input.cursor
        ? {
            cursor: {
              id: input.cursor,
            },
            skip: 1,
          }
        : {}),
      select: practiceUserWordWithVocabularyItemSelect,
    });

    const hasNextPage = userWords.length > input.limit;
    const pageItems = hasNextPage ? userWords.slice(0, input.limit) : userWords;
    const lastItem = pageItems[pageItems.length - 1];

    return {
      items: pageItems.map(({ vocabularyItem, ...userWord }) => ({
        userWord,
        vocabularyItem,
      })),
      nextCursor: hasNextPage && lastItem ? lastItem.id : null,
    };
  }

  answerPractice(
    input: AnswerPracticeInput,
  ): Promise<AnswerPracticeResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const practiceTarget = await tx.userWord.findFirst({
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
        select: practiceUserWordWithVocabularyItemSelect,
      });

      if (!practiceTarget) {
        return null;
      }

      const { vocabularyItem, ...userWord } = practiceTarget;

      const practiceLog = await tx.practiceLog.create({
        data: {
          userId: input.userId,
          userWordId: userWord.id,
          vocabularyItemId: vocabularyItem.id,
          practiceMode: input.practiceMode,
          isCorrect: input.isCorrect,
          answeredAt: input.answeredAt,
        },
        select: practiceLogSelect,
      });

      return {
        practiceLog,
        userWord,
        vocabularyItem,
      };
    });
  }
}
