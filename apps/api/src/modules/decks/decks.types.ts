import type {
  AudienceScope,
  CefrLevel,
  UserStatus,
  UserWordStatus,
  WordType,
} from '@prisma/client';

export type DeckModel = {
  id: string;
  userId: string;
  languagePairId: string;
  title: string;
  description: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DeckVocabularyExampleModel = {
  id: string;
  sourceSentence: string;
  targetSentence: string;
  createdAt: Date;
};

export type DeckVocabularyItemModel = {
  id: string;
  languagePairId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  visibility: AudienceScope;
  isActive: boolean;
  createdAt: Date;
  examples: DeckVocabularyExampleModel[];
};

export type DeckUserWordModel = {
  id: string;
  vocabularyItemId: string;
  status: UserWordStatus;
  isFavorite: boolean;
  masteryStep: number;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  createdAt: Date;
};

export type DeckCardItemResult = {
  deckCardId: string;
  createdAt: Date;
  userWord: DeckUserWordModel;
  vocabularyItem: DeckVocabularyItemModel;
};

export type DeckResult = {
  deck: DeckModel;
  cards: DeckCardItemResult[];
};

export type DeckSummaryResponse = {
  id: string;
  title: string;
  description: string | null;
  isDefault: boolean;
  wordCount: number;
  masteryScore: number;
  maxMasteryScore: number;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DeckWordResponse = {
  deckCardId: string;
  id: string;
  languagePairId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  visibility: AudienceScope;
  isActive: boolean;
  examples: DeckVocabularyExampleModel[];
  userWord: DeckUserWordModel;
  createdAt: Date;
};

export type DeckDetailResponse = DeckSummaryResponse & {
  items: DeckWordResponse[];
};

export type DecksResponse = {
  items: DeckSummaryResponse[];
};

export type DeckUserContext = {
  status: UserStatus;
  profile: {
    activeLanguagePairId: string | null;
  } | null;
  languagePairs: {
    languagePairId: string;
    isLearning: boolean;
    languagePair: {
      id: string;
      isActive: boolean;
    };
  }[];
};
