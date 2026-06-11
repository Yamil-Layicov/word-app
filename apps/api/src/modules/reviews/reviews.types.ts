import type {
  CefrLevel,
  ReviewRating,
  UserStatus,
  UserWordStatus,
  WordType,
} from '@prisma/client';

export type ReviewExampleModel = {
  id: string;
  sourceSentence: string;
  targetSentence: string;
};

export type ReviewVocabularyItemModel = {
  id: string;
  languagePairId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  examples: ReviewExampleModel[];
};

export type ReviewUserWordModel = {
  id: string;
  vocabularyItemId: string;
  status: UserWordStatus;
  easeFactor: number;
  intervalDays: number;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
};

export type DueReviewItemResult = {
  userWord: ReviewUserWordModel;
  vocabularyItem: ReviewVocabularyItemModel;
};

export type DueReviewItemResponse = {
  userWordId: string;
  vocabularyItemId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  examples: ReviewExampleModel[];
  status: UserWordStatus;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
};

export type DueReviewsResponse = {
  items: DueReviewItemResponse[];
};

export type ReviewLogModel = {
  id: string;
  rating: ReviewRating;
  isCorrect: boolean;
  answeredAt: Date;
};

export type AnswerReviewResult = {
  userWord: ReviewUserWordModel;
  vocabularyItem: ReviewVocabularyItemModel;
  reviewLog: ReviewLogModel;
};

export type AnswerReviewResponse = {
  userWordId: string;
  vocabularyItemId: string;
  status: UserWordStatus;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  reviewLog: ReviewLogModel;
};

export type ReviewTimelineUserWordResult = {
  id: string;
  nextReviewAt: Date | null;
};

export type ReviewTimelineGroupResponse = {
  date: string;
  totalWords: number;
  dueWords: number;
};

export type ReviewTimelineResponse = {
  groups: ReviewTimelineGroupResponse[];
};

export type ReviewUserContext = {
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
