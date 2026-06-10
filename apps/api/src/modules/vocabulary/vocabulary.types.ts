import type {
  AudienceScope,
  CefrLevel,
  UserStatus,
  UserWordStatus,
  WordType,
} from '@prisma/client';

export type VocabularyExampleModel = {
  id: string;
  sourceSentence: string;
  targetSentence: string;
  createdAt: Date;
};

export type VocabularyItemModel = {
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
  examples: VocabularyExampleModel[];
};

export type UserWordModel = {
  id: string;
  vocabularyItemId: string;
  status: UserWordStatus;
  isFavorite: boolean;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  createdAt: Date;
};

export type VocabularyItemResponse = {
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
  examples: VocabularyExampleModel[];
  userWord: UserWordModel;
  createdAt: Date;
};

export type ListVocabularyItemsResponse = {
  items: VocabularyItemResponse[];
  nextCursor: string | null;
};

export type CreateVocabularyItemResult = {
  vocabularyItem: VocabularyItemModel;
  userWord: UserWordModel;
};

export type VocabularyListItemResult = CreateVocabularyItemResult;

export type ListVocabularyItemsResult = {
  items: VocabularyListItemResult[];
  nextCursor: string | null;
};

export type VocabularyUserContext = {
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
