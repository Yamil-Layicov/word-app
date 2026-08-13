import { Injectable } from '@nestjs/common';
import {
  AudienceScope,
  DeckPurpose,
  ScheduledReviewState,
  UserWordStatus,
  WordType,
  type CefrLevel,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateVocabularyItemResult,
  ListVocabularyItemsResult,
  VocabularyUserContext,
} from './vocabulary.types';

type CreateVocabularyExampleInput = {
  sourceSentence: string;
  targetSentence: string;
};

type CreateVocabularyItemInput = {
  userId: string;
  languagePairId: string;
  sourceText: string;
  targetText: string;
  sourceNormalized: string;
  targetNormalized: string;
  wordType?: WordType;
  cefrLevel?: CefrLevel;
  definition?: string;
  note?: string;
  examples: CreateVocabularyExampleInput[];
};

type ListVocabularyItemsInput = {
  userId: string;
  languagePairId: string;
  status?: UserWordStatus;
  isFavorite?: boolean;
  searchNormalized?: string;
  limit: number;
  cursor?: string;
};

type FindUserVocabularyItemInput = {
  userId: string;
  vocabularyItemId: string;
  languagePairId: string;
};

type UpdateUserVocabularyItemInput = {
  userId: string;
  vocabularyItemId: string;
  languagePairId: string;
  isFavorite?: boolean;
  status?: UserWordStatus;
  masteryStep?: number;
  intervalDays?: number;
  nextReviewAt?: Date | null;
  cancelActiveSchedulesAt?: Date;
  removeFromMasteredCollections?: boolean;
};

type ReplaceVocabularyItemContentInput = {
  userId: string;
  vocabularyItemId: string;
  languagePairId: string;
  sourceText: string;
  targetText: string;
  sourceNormalized: string;
  targetNormalized: string;
  examples: CreateVocabularyExampleInput[];
};

export type ReplaceVocabularyItemContentResult =
  | { status: 'NOT_FOUND' }
  | { status: 'NOT_EDITABLE' }
  | { status: 'UPDATED'; item: CreateVocabularyItemResult };

type ArchiveUserVocabularyItemInput = {
  userId: string;
  vocabularyItemId: string;
  languagePairId: string;
};

type DeleteUserVocabularyItemInput = ArchiveUserVocabularyItemInput;

const vocabularyExampleSelect = {
  id: true,
  sourceSentence: true,
  targetSentence: true,
  createdAt: true,
} as const;

const vocabularyItemSelect = {
  id: true,
  languagePairId: true,
  sourceText: true,
  targetText: true,
  wordType: true,
  cefrLevel: true,
  definition: true,
  note: true,
  visibility: true,
  isActive: true,
  createdAt: true,
  examples: {
    orderBy: {
      createdAt: 'asc',
    },
    select: vocabularyExampleSelect,
  },
} as const;

const userWordSelect = {
  id: true,
  vocabularyItemId: true,
  status: true,
  isFavorite: true,
  masteryStep: true,
  reviewCount: true,
  correctCount: true,
  wrongCount: true,
  lastReviewedAt: true,
  nextReviewAt: true,
  createdAt: true,
} as const;

const userWordWithVocabularyItemSelect = {
  ...userWordSelect,
  vocabularyItem: {
    select: vocabularyItemSelect,
  },
} as const;

const activeScheduleStates = [
  ScheduledReviewState.QUEUED,
  ScheduledReviewState.STARTED,
  ScheduledReviewState.DUE,
];

@Injectable()
export class VocabularyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserContext(userId: string): Promise<VocabularyUserContext | null> {
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

  async createVocabularyItemForUser(
    input: CreateVocabularyItemInput,
  ): Promise<CreateVocabularyItemResult> {
    return this.prisma.$transaction(async (tx) => {
      const vocabularyItem = await tx.vocabularyItem.upsert({
        where: {
          languagePairId_sourceNormalized_targetNormalized: {
            languagePairId: input.languagePairId,
            sourceNormalized: input.sourceNormalized,
            targetNormalized: input.targetNormalized,
          },
        },
        update: {},
        create: {
          languagePairId: input.languagePairId,
          sourceText: input.sourceText,
          targetText: input.targetText,
          sourceNormalized: input.sourceNormalized,
          targetNormalized: input.targetNormalized,
          wordType: input.wordType ?? WordType.OTHER,
          cefrLevel: input.cefrLevel ?? null,
          definition: input.definition ?? null,
          note: input.note ?? null,
          visibility: AudienceScope.PRIVATE,
          createdByUserId: input.userId,
          examples:
            input.examples.length > 0
              ? {
                  create: input.examples.map((example) => ({
                    sourceSentence: example.sourceSentence,
                    targetSentence: example.targetSentence,
                  })),
                }
              : undefined,
        },
        select: vocabularyItemSelect,
      });

      const userWord = await tx.userWord.upsert({
        where: {
          userId_vocabularyItemId: {
            userId: input.userId,
            vocabularyItemId: vocabularyItem.id,
          },
        },
        update: {},
        create: {
          userId: input.userId,
          vocabularyItemId: vocabularyItem.id,
        },
        select: userWordSelect,
      });

      return {
        vocabularyItem,
        userWord,
      };
    });
  }

  async findUserVocabularyItems(
    input: ListVocabularyItemsInput,
  ): Promise<ListVocabularyItemsResult> {
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
      select: userWordWithVocabularyItemSelect,
    });

    const hasNextPage = userWords.length > input.limit;
    const pageItems = hasNextPage ? userWords.slice(0, input.limit) : userWords;
    const lastItem = pageItems[pageItems.length - 1];

    return {
      items: pageItems.map(({ vocabularyItem, ...userWord }) => ({
        vocabularyItem,
        userWord,
      })),
      nextCursor: hasNextPage && lastItem ? lastItem.id : null,
    };
  }

  async findUserVocabularyItemById(
    input: FindUserVocabularyItemInput,
  ): Promise<CreateVocabularyItemResult | null> {
    const userWord = await this.prisma.userWord.findFirst({
      where: {
        userId: input.userId,
        vocabularyItemId: input.vocabularyItemId,
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
      vocabularyItem,
      userWord: userWordModel,
    };
  }

  async updateUserVocabularyItem(
    input: UpdateUserVocabularyItemInput,
  ): Promise<CreateVocabularyItemResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const userWord = await tx.userWord.findFirst({
        where: {
          userId: input.userId,
          vocabularyItemId: input.vocabularyItemId,
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

      const updatedUserWord = await tx.userWord.update({
        where: {
          id: userWord.id,
        },
        data: {
          ...(input.isFavorite !== undefined
            ? { isFavorite: input.isFavorite }
            : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.masteryStep !== undefined
            ? { masteryStep: input.masteryStep }
            : {}),
          ...(input.intervalDays !== undefined
            ? { intervalDays: input.intervalDays }
            : {}),
          ...(input.nextReviewAt !== undefined
            ? { nextReviewAt: input.nextReviewAt }
            : {}),
        },
        select: userWordWithVocabularyItemSelect,
      });

      if (input.cancelActiveSchedulesAt) {
        await tx.userWordSchedule.updateMany({
          where: {
            userId: input.userId,
            userWordId: userWord.id,
            state: {
              in: activeScheduleStates,
            },
          },
          data: {
            state: ScheduledReviewState.CANCELLED,
            cancelledAt: input.cancelActiveSchedulesAt,
          },
        });
      }

      if (input.removeFromMasteredCollections) {
        await tx.deckCard.deleteMany({
          where: {
            userWordId: userWord.id,
            deck: {
              userId: input.userId,
              purpose: DeckPurpose.MASTERED_COLLECTION,
            },
          },
        });
      }

      const { vocabularyItem, ...userWordModel } = updatedUserWord;

      return {
        vocabularyItem,
        userWord: userWordModel,
      };
    });
  }

  async replaceVocabularyItemContent(
    input: ReplaceVocabularyItemContentInput,
  ): Promise<ReplaceVocabularyItemContentResult> {
    return this.prisma.$transaction(async (tx) => {
      const lockedItems = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "VocabularyItem"
        WHERE "id" = ${input.vocabularyItemId}
        FOR UPDATE
      `;

      if (lockedItems.length === 0) {
        return { status: 'NOT_FOUND' };
      }

      const userWord = await tx.userWord.findFirst({
        where: {
          userId: input.userId,
          vocabularyItemId: input.vocabularyItemId,
          vocabularyItem: {
            languagePairId: input.languagePairId,
            isActive: true,
          },
        },
        select: {
          id: true,
          vocabularyItem: {
            select: {
              createdByUserId: true,
              visibility: true,
              _count: {
                select: {
                  userWords: true,
                },
              },
            },
          },
        },
      });

      if (!userWord) {
        return { status: 'NOT_FOUND' };
      }

      if (
        userWord.vocabularyItem.createdByUserId !== input.userId ||
        userWord.vocabularyItem.visibility !== AudienceScope.PRIVATE ||
        userWord.vocabularyItem._count.userWords !== 1
      ) {
        return { status: 'NOT_EDITABLE' };
      }

      const vocabularyItem = await tx.vocabularyItem.update({
        where: {
          id: input.vocabularyItemId,
        },
        data: {
          sourceText: input.sourceText,
          targetText: input.targetText,
          sourceNormalized: input.sourceNormalized,
          targetNormalized: input.targetNormalized,
          examples: {
            deleteMany: {},
            ...(input.examples.length > 0
              ? {
                  create: input.examples.map((example) => ({
                    sourceSentence: example.sourceSentence,
                    targetSentence: example.targetSentence,
                  })),
                }
              : {}),
          },
        },
        select: vocabularyItemSelect,
      });

      const updatedUserWord = await tx.userWord.findUniqueOrThrow({
        where: {
          id: userWord.id,
        },
        select: userWordSelect,
      });

      return {
        status: 'UPDATED',
        item: {
          vocabularyItem,
          userWord: updatedUserWord,
        },
      };
    });
  }

  async archiveUserVocabularyItem(
    input: ArchiveUserVocabularyItemInput,
  ): Promise<boolean> {
    const result = await this.prisma.userWord.updateMany({
      where: {
        userId: input.userId,
        vocabularyItemId: input.vocabularyItemId,
        vocabularyItem: {
          languagePairId: input.languagePairId,
          isActive: true,
        },
      },
      data: {
        status: UserWordStatus.ARCHIVED,
      },
    });

    return result.count > 0;
  }

  async deleteUserVocabularyItemPermanently(
    input: DeleteUserVocabularyItemInput,
  ): Promise<boolean> {
    const result = await this.prisma.userWord.deleteMany({
      where: {
        userId: input.userId,
        vocabularyItemId: input.vocabularyItemId,
        vocabularyItem: {
          languagePairId: input.languagePairId,
          isActive: true,
        },
      },
    });

    return result.count > 0;
  }
}
