import { Injectable } from '@nestjs/common';
import {
  AudienceScope,
  DeckPurpose,
  UserWordStatus,
  WordType,
  type CefrLevel,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  DeckCardItemResult,
  DeckResult,
  DeckUserContext,
} from './decks.types';

type CreateDeckInput = {
  userId: string;
  languagePairId: string;
  title: string;
  description?: string;
  isDefault: boolean;
};

type FindDeckInput = {
  userId: string;
  languagePairId: string;
  deckId: string;
};

type AddDeckWordInput = {
  sourceText: string;
  targetText: string;
  sourceNormalized: string;
  targetNormalized: string;
  wordType?: WordType;
  cefrLevel?: CefrLevel;
  definition?: string;
  note?: string;
};

type AddDeckWordsInput = FindDeckInput & {
  words: AddDeckWordInput[];
};

type RemoveDeckCardInput = FindDeckInput & {
  deckCardId: string;
};

const deckVocabularyExampleSelect = {
  id: true,
  sourceSentence: true,
  targetSentence: true,
  createdAt: true,
} as const;

const deckVocabularyItemSelect = {
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
    select: deckVocabularyExampleSelect,
  },
} as const;

const deckUserWordSelect = {
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

const deckCardSelect = {
  id: true,
  createdAt: true,
  userWord: {
    select: {
      ...deckUserWordSelect,
      vocabularyItem: {
        select: deckVocabularyItemSelect,
      },
    },
  },
} as const;

const deckSelect = {
  id: true,
  userId: true,
  languagePairId: true,
  title: true,
  description: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  cards: {
    where: {
      userWord: {
        status: {
          not: UserWordStatus.ARCHIVED,
        },
        vocabularyItem: {
          isActive: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: deckCardSelect,
  },
} as const;

type DeckRecord = {
  id: string;
  userId: string;
  languagePairId: string;
  title: string;
  description: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  cards: {
    id: string;
    createdAt: Date;
    userWord: DeckCardItemResult['userWord'] & {
      vocabularyItem: DeckCardItemResult['vocabularyItem'];
    };
  }[];
};

@Injectable()
export class DecksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserContext(userId: string): Promise<DeckUserContext | null> {
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

  async createDeck(input: CreateDeckInput): Promise<DeckResult> {
    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.deck.updateMany({
          where: {
            userId: input.userId,
            languagePairId: input.languagePairId,
            purpose: DeckPurpose.LEARNING,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const deck = await tx.deck.create({
        data: {
          userId: input.userId,
          languagePairId: input.languagePairId,
          title: input.title,
          description: input.description ?? null,
          purpose: DeckPurpose.LEARNING,
          isDefault: input.isDefault,
        },
        select: deckSelect,
      });

      return this.toDeckResult(deck);
    });
  }

  async findDecks(input: Omit<FindDeckInput, 'deckId'>): Promise<DeckResult[]> {
    const decks = await this.prisma.deck.findMany({
      where: {
        userId: input.userId,
        languagePairId: input.languagePairId,
        purpose: DeckPurpose.LEARNING,
      },
      orderBy: [
        {
          isDefault: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      select: deckSelect,
    });

    return decks.map((deck) => this.toDeckResult(deck));
  }

  async findDeckById(input: FindDeckInput): Promise<DeckResult | null> {
    const deck = await this.prisma.deck.findFirst({
      where: {
        id: input.deckId,
        userId: input.userId,
        languagePairId: input.languagePairId,
        purpose: DeckPurpose.LEARNING,
      },
      select: deckSelect,
    });

    return deck ? this.toDeckResult(deck) : null;
  }

  async addWordsToDeck(input: AddDeckWordsInput): Promise<DeckResult | null> {
    return this.prisma.$transaction(async (tx) => {
      const deck = await tx.deck.findFirst({
        where: {
          id: input.deckId,
          userId: input.userId,
          languagePairId: input.languagePairId,
          purpose: DeckPurpose.LEARNING,
        },
        select: {
          id: true,
        },
      });

      if (!deck) {
        return null;
      }

      for (const word of input.words) {
        const vocabularyItem = await tx.vocabularyItem.upsert({
          where: {
            languagePairId_sourceNormalized_targetNormalized: {
              languagePairId: input.languagePairId,
              sourceNormalized: word.sourceNormalized,
              targetNormalized: word.targetNormalized,
            },
          },
          update: {},
          create: {
            languagePairId: input.languagePairId,
            sourceText: word.sourceText,
            targetText: word.targetText,
            sourceNormalized: word.sourceNormalized,
            targetNormalized: word.targetNormalized,
            wordType: word.wordType ?? WordType.OTHER,
            cefrLevel: word.cefrLevel ?? null,
            definition: word.definition ?? null,
            note: word.note ?? null,
            visibility: AudienceScope.PRIVATE,
            createdByUserId: input.userId,
          },
          select: {
            id: true,
          },
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
          select: {
            id: true,
          },
        });

        await tx.deckCard.upsert({
          where: {
            deckId_userWordId: {
              deckId: input.deckId,
              userWordId: userWord.id,
            },
          },
          update: {},
          create: {
            deckId: input.deckId,
            userWordId: userWord.id,
          },
        });
      }

      const updatedDeck = await tx.deck.findUnique({
        where: {
          id: input.deckId,
        },
        select: deckSelect,
      });

      return updatedDeck ? this.toDeckResult(updatedDeck) : null;
    });
  }

  async removeDeckCard(input: RemoveDeckCardInput): Promise<boolean> {
    const result = await this.prisma.deckCard.deleteMany({
      where: {
        id: input.deckCardId,
        deckId: input.deckId,
        deck: {
          userId: input.userId,
          languagePairId: input.languagePairId,
          purpose: DeckPurpose.LEARNING,
        },
      },
    });

    return result.count > 0;
  }

  private toDeckResult(deck: DeckRecord): DeckResult {
    const { cards, ...deckModel } = deck;

    return {
      deck: deckModel,
      cards: cards.map((card) => {
        const { vocabularyItem, ...userWord } = card.userWord;

        return {
          deckCardId: card.id,
          createdAt: card.createdAt,
          userWord,
          vocabularyItem,
        };
      }),
    };
  }
}
