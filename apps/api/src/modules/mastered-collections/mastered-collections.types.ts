import type {
  AudienceScope,
  CefrLevel,
  UserStatus,
  UserWordStatus,
  WordType,
} from '@prisma/client';

export type MasteredCollectionModel = {
  id: string;
  userId: string;
  languagePairId: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MasteredCollectionVocabularyExampleModel = {
  id: string;
  sourceSentence: string;
  targetSentence: string;
  createdAt: Date;
};

export type MasteredCollectionVocabularyItemModel = {
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
  examples: MasteredCollectionVocabularyExampleModel[];
};

export type MasteredCollectionUserWordModel = {
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

export type MasteredCollectionWordResult = {
  collectionWordId: string;
  createdAt: Date;
  userWord: MasteredCollectionUserWordModel;
  vocabularyItem: MasteredCollectionVocabularyItemModel;
};

export type MasteredCollectionResult = {
  collection: MasteredCollectionModel;
  words: MasteredCollectionWordResult[];
};

export type MasteredCollectionSummaryResult = {
  collection: MasteredCollectionModel;
  wordCount: number;
  masteredWordCount: number;
};

export type MasteredCollectionSummaryResponse = {
  id: string;
  title: string;
  description: string | null;
  wordCount: number;
  masteredWordCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MasteredCollectionWordResponse = {
  collectionWordId: string;
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
  examples: MasteredCollectionVocabularyExampleModel[];
  userWord: MasteredCollectionUserWordModel;
  createdAt: Date;
};

export type MasteredCollectionDetailResponse =
  MasteredCollectionSummaryResponse & {
    items: MasteredCollectionWordResponse[];
  };

export type MasteredCollectionsResponse = {
  items: MasteredCollectionSummaryResponse[];
};

export type MasteredCollectionUserContext = {
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

export type AddMasteredCollectionWordsResult =
  | {
      status: 'COLLECTION_NOT_FOUND';
    }
  | {
      status: 'WORDS_NOT_ELIGIBLE';
    }
  | {
      status: 'SUCCESS';
      collection: MasteredCollectionResult;
    };
