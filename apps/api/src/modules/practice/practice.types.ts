import type {
  AudienceScope,
  CefrLevel,
  PracticeMode,
  UserStatus,
  UserWordStatus,
  WordType,
} from '@prisma/client';

export type PracticeExampleModel = {
  id: string;
  sourceSentence: string;
  targetSentence: string;
};

export type PracticeVocabularyItemModel = {
  id: string;
  languagePairId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  visibility: AudienceScope;
  examples: PracticeExampleModel[];
};

export type PracticeUserWordModel = {
  id: string;
  vocabularyItemId: string;
  status: UserWordStatus;
  isFavorite: boolean;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
};

export type PracticeItemResult = {
  userWord: PracticeUserWordModel;
  vocabularyItem: PracticeVocabularyItemModel;
};

export type PracticeItemResponse = {
  userWordId: string;
  vocabularyItemId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  visibility: AudienceScope;
  examples: PracticeExampleModel[];
  status: UserWordStatus;
  isFavorite: boolean;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
};

export type ListPracticeItemsResult = {
  items: PracticeItemResult[];
  nextCursor: string | null;
};

export type ListPracticeItemsResponse = {
  items: PracticeItemResponse[];
  nextCursor: string | null;
};

export type PracticeLogModel = {
  id: string;
  practiceMode: PracticeMode;
  isCorrect: boolean;
  answeredAt: Date;
};

export type AnswerPracticeResult = {
  practiceLog: PracticeLogModel;
  userWord: PracticeUserWordModel;
  vocabularyItem: PracticeVocabularyItemModel;
};

export type PracticeLogResponse = PracticeLogModel;

export type AnswerPracticeResponse = {
  practiceLog: PracticeLogResponse;
  userWordId: string;
  vocabularyItemId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  status: UserWordStatus;
  isFavorite: boolean;
  nextReviewAt: Date | null;
};

export type PracticeUserContext = {
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
