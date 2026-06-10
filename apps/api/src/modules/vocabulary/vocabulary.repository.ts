import { Injectable } from '@nestjs/common';
import { AudienceScope, WordType, type CefrLevel } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateVocabularyItemResult,
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
}
