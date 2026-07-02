import type { CefrLevel, UserWordStatus, WordType } from "@/entities/vocabulary-item";

export type ReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export type ReviewExample = {
  id: string;
  sourceSentence: string;
  targetSentence: string;
};

export type DueReviewItem = {
  userWordId: string;
  vocabularyItemId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  examples: ReviewExample[];
  status: UserWordStatus;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
};

export type DueReviewsResponse = {
  items: DueReviewItem[];
};

export type DueReviewsFilters = {
  limit?: number;
};

export type ReviewLog = {
  id: string;
  rating: ReviewRating;
  isCorrect: boolean;
  answeredAt: string;
};

export type AnswerReviewRequest = {
  userWordId: string;
  rating: ReviewRating;
  isCorrect: boolean;
};

export type AnswerReviewResponse = {
  userWordId: string;
  vocabularyItemId: string;
  status: UserWordStatus;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  reviewLog: ReviewLog;
};

export type ReviewTimelineFilters = {
  timeZone?: string;
  days?: number;
};

export type ReviewTimelineGroup = {
  date: string;
  totalWords: number;
  dueWords: number;
};

export type ReviewTimelineResponse = {
  groups: ReviewTimelineGroup[];
};

export type ReviewTimelineItemsFilters = {
  timeZone?: string;
};

export type ReviewTimelineItemsResponse = {
  date: string;
  totalWords: number;
  dueWords: number;
  items: DueReviewItem[];
};
