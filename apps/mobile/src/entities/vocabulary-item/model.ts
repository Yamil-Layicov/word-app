export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type WordType =
  | "NOUN"
  | "VERB"
  | "ADJECTIVE"
  | "ADVERB"
  | "PHRASE"
  | "IDIOM"
  | "PHRASAL_VERB"
  | "SENTENCE"
  | "OTHER";

export type UserWordStatus = "NEW" | "LEARNING" | "REVIEWING" | "MASTERED" | "ARCHIVED";

export type VocabularyVisibility = "GLOBAL" | "COUNTRY" | "SELECTED_COUNTRIES" | "PRIVATE";

export type VocabularyExample = {
  id: string;
  sourceSentence: string;
  targetSentence: string;
  createdAt: string;
};

export type VocabularyUserWord = {
  id: string;
  vocabularyItemId: string;
  status: UserWordStatus;
  isFavorite: boolean;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  createdAt: string;
};

export type VocabularyItem = {
  id: string;
  languagePairId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  visibility: VocabularyVisibility;
  isActive: boolean;
  examples: VocabularyExample[];
  userWord: VocabularyUserWord;
  createdAt: string;
};

export type VocabularyItemsResponse = {
  items: VocabularyItem[];
  nextCursor: string | null;
};

export type VocabularyItemsFilters = {
  status?: UserWordStatus;
  isFavorite?: boolean;
  search?: string;
  limit?: number;
  cursor?: string;
};

export type CreateVocabularyExampleRequest = {
  sourceSentence: string;
  targetSentence: string;
};

export type CreateVocabularyItemRequest = {
  sourceText: string;
  targetText: string;
  wordType?: WordType;
  cefrLevel?: CefrLevel;
  definition?: string;
  note?: string;
  examples?: CreateVocabularyExampleRequest[];
};

export type UpdateVocabularyItemRequest = {
  isFavorite?: boolean;
  status?: UserWordStatus;
};
