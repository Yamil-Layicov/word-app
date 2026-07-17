import type { VocabularyItem } from "@/entities/vocabulary-item";

export type MasteredCollectionSummary = {
  id: string;
  title: string;
  description: string | null;
  wordCount: number;
  masteredWordCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MasteredCollectionWord = VocabularyItem & {
  collectionWordId: string;
};

export type MasteredCollectionDetail = MasteredCollectionSummary & {
  items: MasteredCollectionWord[];
};

export type MasteredCollectionsResponse = {
  items: MasteredCollectionSummary[];
};

export type CreateMasteredCollectionRequest = {
  title: string;
  description?: string;
};

export type AddMasteredCollectionWordsRequest = {
  userWordIds: string[];
};
