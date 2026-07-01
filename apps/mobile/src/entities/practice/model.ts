import type {
  CefrLevel,
  UserWordStatus,
  VocabularyVisibility,
  WordType,
} from "@/entities/vocabulary-item";

export type PracticeMode = "FLASHCARD" | "TYPING" | "MULTIPLE_CHOICE" | "OTHER";

export type PracticeExample = {
  id: string;
  sourceSentence: string;
  targetSentence: string;
};

export type PracticeItem = {
  userWordId: string;
  vocabularyItemId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  visibility: VocabularyVisibility;
  examples: PracticeExample[];
  status: UserWordStatus;
  isFavorite: boolean;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
};

export type PracticeItemsResponse = {
  items: PracticeItem[];
  nextCursor: string | null;
};

export type PracticeItemsFilters = {
  status?: UserWordStatus;
  isFavorite?: boolean;
  search?: string;
  limit?: number;
  cursor?: string;
};

export type PracticeLog = {
  id: string;
  practiceMode: PracticeMode;
  isCorrect: boolean;
  answeredAt: string;
};

export type AnswerPracticeRequest = {
  userWordId: string;
  isCorrect: boolean;
  practiceMode: PracticeMode;
};

export type AnswerPracticeResponse = {
  practiceLog: PracticeLog;
  userWordId: string;
  vocabularyItemId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  status: UserWordStatus;
  isFavorite: boolean;
  nextReviewAt: string | null;
};
