import { Injectable } from '@nestjs/common';
import {
  DeckPurpose,
  UserWordStatus,
  type UserWordStatus as UserWordStatusValue,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  AddMasteredCollectionWordsResult,
  MasteredCollectionResult,
  MasteredCollectionSummaryResult,
  MasteredCollectionUserContext,
  MasteredCollectionWordResult,
} from './mastered-collections.types';

type CollectionScope = {
  userId: string;
  languagePairId: string;
};

type CreateCollectionInput = CollectionScope & {
  title: string;
  description?: string;
};

type FindCollectionInput = CollectionScope & {
  collectionId: string;
};

type AddCollectionWordsInput = FindCollectionInput & {
  userWordIds: string[];
};

type RemoveCollectionWordInput = FindCollectionInput & {
  collectionWordId: string;
};

const collectionVocabularyExampleSelect = {
  id: true,
  sourceSentence: true,
  targetSentence: true,
  createdAt: true,
} as const;

const collectionVocabularyItemSelect = {
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
    select: collectionVocabularyExampleSelect,
  },
} as const;

const collectionUserWordSelect = {
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

const collectionWordSelect = {
  id: true,
  createdAt: true,
  userWord: {
    select: {
      ...collectionUserWordSelect,
      vocabularyItem: {
        select: collectionVocabularyItemSelect,
      },
    },
  },
} as const;

const activeCollectionWordsWhere = {
  userWord: {
    status: {
      not: UserWordStatus.ARCHIVED,
    },
    vocabularyItem: {
      isActive: true,
    },
  },
} as const;

const collectionDetailSelect = {
  id: true,
  userId: true,
  languagePairId: true,
  title: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  cards: {
    where: activeCollectionWordsWhere,
    orderBy: {
      createdAt: 'desc',
    },
    select: collectionWordSelect,
  },
} as const;

const collectionSummarySelect = {
  id: true,
  userId: true,
  languagePairId: true,
  title: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  cards: {
    where: activeCollectionWordsWhere,
    select: {
      userWord: {
        select: {
          status: true,
        },
      },
    },
  },
} as const;

type CollectionDetailRecord = {
  id: string;
  userId: string;
  languagePairId: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  cards: {
    id: string;
    createdAt: Date;
    userWord: MasteredCollectionWordResult['userWord'] & {
      vocabularyItem: MasteredCollectionWordResult['vocabularyItem'];
    };
  }[];
};

type CollectionSummaryRecord = {
  id: string;
  userId: string;
  languagePairId: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  cards: {
    userWord: {
      status: UserWordStatusValue;
    };
  }[];
};

@Injectable()
export class MasteredCollectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserContext(
    userId: string,
  ): Promise<MasteredCollectionUserContext | null> {
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

  async createCollection(
    input: CreateCollectionInput,
  ): Promise<MasteredCollectionResult> {
    const collection = await this.prisma.deck.create({
      data: {
        userId: input.userId,
        languagePairId: input.languagePairId,
        title: input.title,
        description: input.description ?? null,
        purpose: DeckPurpose.MASTERED_COLLECTION,
      },
      select: collectionDetailSelect,
    });

    return this.toCollectionResult(collection);
  }

  async findCollections(
    input: CollectionScope,
  ): Promise<MasteredCollectionSummaryResult[]> {
    const collections = await this.prisma.deck.findMany({
      where: {
        userId: input.userId,
        languagePairId: input.languagePairId,
        purpose: DeckPurpose.MASTERED_COLLECTION,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: collectionSummarySelect,
    });

    return collections.map((collection) =>
      this.toCollectionSummaryResult(collection),
    );
  }

  async findCollectionById(
    input: FindCollectionInput,
  ): Promise<MasteredCollectionResult | null> {
    const collection = await this.prisma.deck.findFirst({
      where: {
        id: input.collectionId,
        userId: input.userId,
        languagePairId: input.languagePairId,
        purpose: DeckPurpose.MASTERED_COLLECTION,
      },
      select: collectionDetailSelect,
    });

    return collection ? this.toCollectionResult(collection) : null;
  }

  async addWordsToCollection(
    input: AddCollectionWordsInput,
  ): Promise<AddMasteredCollectionWordsResult> {
    return this.prisma.$transaction(async (tx) => {
      const collection = await tx.deck.findFirst({
        where: {
          id: input.collectionId,
          userId: input.userId,
          languagePairId: input.languagePairId,
          purpose: DeckPurpose.MASTERED_COLLECTION,
        },
        select: {
          id: true,
        },
      });

      if (!collection) {
        return {
          status: 'COLLECTION_NOT_FOUND',
        };
      }

      const eligibleWords = await tx.userWord.findMany({
        where: {
          id: {
            in: input.userWordIds,
          },
          userId: input.userId,
          status: UserWordStatus.MASTERED,
          vocabularyItem: {
            languagePairId: input.languagePairId,
            isActive: true,
          },
        },
        select: {
          id: true,
        },
      });

      if (eligibleWords.length !== input.userWordIds.length) {
        return {
          status: 'WORDS_NOT_ELIGIBLE',
        };
      }

      await tx.deckCard.createMany({
        data: eligibleWords.map((word) => ({
          deckId: input.collectionId,
          userWordId: word.id,
        })),
        skipDuplicates: true,
      });

      const updatedCollection = await tx.deck.findUnique({
        where: {
          id: input.collectionId,
        },
        select: collectionDetailSelect,
      });

      if (!updatedCollection) {
        return {
          status: 'COLLECTION_NOT_FOUND',
        };
      }

      return {
        status: 'SUCCESS',
        collection: this.toCollectionResult(updatedCollection),
      };
    });
  }

  async removeWordFromCollection(
    input: RemoveCollectionWordInput,
  ): Promise<boolean> {
    const result = await this.prisma.deckCard.deleteMany({
      where: {
        id: input.collectionWordId,
        deckId: input.collectionId,
        deck: {
          userId: input.userId,
          languagePairId: input.languagePairId,
          purpose: DeckPurpose.MASTERED_COLLECTION,
        },
      },
    });

    return result.count > 0;
  }

  async deleteCollection(input: FindCollectionInput): Promise<boolean> {
    const result = await this.prisma.deck.deleteMany({
      where: {
        id: input.collectionId,
        userId: input.userId,
        languagePairId: input.languagePairId,
        purpose: DeckPurpose.MASTERED_COLLECTION,
      },
    });

    return result.count > 0;
  }

  private toCollectionResult(
    collection: CollectionDetailRecord,
  ): MasteredCollectionResult {
    const { cards, ...collectionModel } = collection;

    return {
      collection: collectionModel,
      words: cards.map((card) => {
        const { vocabularyItem, ...userWord } = card.userWord;

        return {
          collectionWordId: card.id,
          createdAt: card.createdAt,
          userWord,
          vocabularyItem,
        };
      }),
    };
  }

  private toCollectionSummaryResult(
    collection: CollectionSummaryRecord,
  ): MasteredCollectionSummaryResult {
    const { cards, ...collectionModel } = collection;

    return {
      collection: collectionModel,
      wordCount: cards.length,
      masteredWordCount: cards.filter(
        (card) => card.userWord.status === UserWordStatus.MASTERED,
      ).length,
    };
  }
}
