import type {
  CefrLevel,
  CreateVocabularyItemRequest,
  VocabularyItem,
  WordType,
} from "@/entities/vocabulary-item";

export type DeckSummary = {
  id: string;
  title: string;
  description: string | null;
  isDefault: boolean;
  wordCount: number;
  masteryScore: number;
  maxMasteryScore: number;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
};

export type DeckWord = VocabularyItem & {
  deckCardId: string;
};

export type DeckDetail = DeckSummary & {
  items: DeckWord[];
};

export type DecksResponse = {
  items: DeckSummary[];
};

export type CreateDeckRequest = {
  title: string;
  description?: string;
  isDefault?: boolean;
};

export type AddDeckWordRequest = Pick<
  CreateVocabularyItemRequest,
  "cefrLevel" | "definition" | "note" | "sourceText" | "targetText" | "wordType"
>;

export type AddDeckWordsRequest = {
  words: AddDeckWordRequest[];
};

export type DeckWordDraft = {
  id: string;
  sourceText: string;
  targetText: string;
  wordType?: WordType;
  cefrLevel?: CefrLevel;
  definition?: string;
  note?: string;
};
