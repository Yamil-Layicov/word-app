import type {
  CefrLevel,
  ScheduledReviewInterval,
  ScheduledReviewState,
  UserStatus,
  UserWordStatus,
  WordType,
} from '@prisma/client';

export type ScheduledReviewComputedState = ScheduledReviewState | 'DUE';

export type ScheduledReviewExampleModel = {
  id: string;
  sourceSentence: string;
  targetSentence: string;
};

export type ScheduledReviewVocabularyItemModel = {
  id: string;
  languagePairId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  examples: ScheduledReviewExampleModel[];
};

export type ScheduledReviewUserWordModel = {
  id: string;
  vocabularyItemId: string;
  status: UserWordStatus;
  masteryStep: number;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
};

export type ScheduledReviewModel = {
  id: string;
  userId: string;
  userWordId: string;
  state: ScheduledReviewState;
  interval: ScheduledReviewInterval;
  startedAt: Date | null;
  dueAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduledReviewItemResult = {
  schedule: ScheduledReviewModel;
  userWord: ScheduledReviewUserWordModel;
  vocabularyItem: ScheduledReviewVocabularyItemModel;
};

export type ScheduledReviewItemResponse = {
  scheduleId: string;
  interval: ScheduledReviewInterval;
  state: ScheduledReviewComputedState;
  startedAt: Date | null;
  dueAt: Date | null;
  userWordId: string;
  vocabularyItemId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  examples: ScheduledReviewExampleModel[];
  status: UserWordStatus;
  masteryStep: number;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
};

export type ScheduledReviewBoxResponse = {
  interval: ScheduledReviewInterval;
  label: string;
  totalWords: number;
  queuedWords: number;
  startedWords: number;
  dueWords: number;
  nextDueAt: Date | null;
};

export type ScheduledReviewBoxesResponse = {
  boxes: ScheduledReviewBoxResponse[];
};

export type ScheduledReviewBoxDetailResponse = ScheduledReviewBoxResponse & {
  items: ScheduledReviewItemResponse[];
};

export type ScheduledReviewItemsResponse = {
  items: ScheduledReviewItemResponse[];
};

export type ScheduledReviewAnswerResponse = {
  completedScheduleId: string;
  nextSchedule: ScheduledReviewItemResponse | null;
  userWord: {
    id: string;
    status: UserWordStatus;
    masteryStep: number;
    reviewCount: number;
    correctCount: number;
    wrongCount: number;
    lastReviewedAt: Date | null;
    nextReviewAt: Date | null;
  };
};

export type AnswerScheduledReviewResult = {
  completedScheduleId: string;
  nextSchedule: ScheduledReviewItemResult | null;
  userWord: ScheduledReviewUserWordModel;
};

export type ScheduledReviewUserContext = {
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
