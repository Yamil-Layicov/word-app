import { Injectable } from '@nestjs/common';
import {
  AudienceScope,
  WordType,
  type CefrLevel,
  type UserWordStatus,
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

type UpdateUserVocabularyItemInput = {
  userId: string;
  vocabularyItemId: string;
  languagePairId: string;
  isFavorite?: boolean;
  status?: UserWordStatus;
};

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
        ...(input.status ? { status: input.status } : {}),
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

  async updateUserVocabularyItem(
    input: UpdateUserVocabularyItemInput,
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
      select: {
        id: true,
      },
    });

    if (!userWord) {
      return null;
    }

    const updatedUserWord = await this.prisma.userWord.update({
      where: {
        id: userWord.id,
      },
      data: {
        ...(input.isFavorite !== undefined
          ? { isFavorite: input.isFavorite }
          : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      select: userWordWithVocabularyItemSelect,
    });

    const { vocabularyItem, ...userWordModel } = updatedUserWord;

    return {
      vocabularyItem,
      userWord: userWordModel,
    };
  }
}
