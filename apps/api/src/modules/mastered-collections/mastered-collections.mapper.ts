import { UserWordStatus } from '@prisma/client';
import type {
  MasteredCollectionDetailResponse,
  MasteredCollectionResult,
  MasteredCollectionsResponse,
  MasteredCollectionSummaryResponse,
  MasteredCollectionSummaryResult,
} from './mastered-collections.types';

const toSummaryResponse = (
  result: MasteredCollectionSummaryResult,
): MasteredCollectionSummaryResponse => ({
  id: result.collection.id,
  title: result.collection.title,
  description: result.collection.description,
  wordCount: result.wordCount,
  masteredWordCount: result.masteredWordCount,
  createdAt: result.collection.createdAt,
  updatedAt: result.collection.updatedAt,
});

export const toMasteredCollectionsResponse = (
  collections: MasteredCollectionSummaryResult[],
): MasteredCollectionsResponse => ({
  items: collections.map(toSummaryResponse),
});

export const toMasteredCollectionDetailResponse = (
  result: MasteredCollectionResult,
): MasteredCollectionDetailResponse => {
  const summary = toSummaryResponse({
    collection: result.collection,
    wordCount: result.words.length,
    masteredWordCount: result.words.filter(
      (word) => word.userWord.status === UserWordStatus.MASTERED,
    ).length,
  });

  return {
    ...summary,
    items: result.words.map((word) => ({
      collectionWordId: word.collectionWordId,
      id: word.vocabularyItem.id,
      languagePairId: word.vocabularyItem.languagePairId,
      sourceText: word.vocabularyItem.sourceText,
      targetText: word.vocabularyItem.targetText,
      wordType: word.vocabularyItem.wordType,
      cefrLevel: word.vocabularyItem.cefrLevel,
      definition: word.vocabularyItem.definition,
      note: word.vocabularyItem.note,
      visibility: word.vocabularyItem.visibility,
      isActive: word.vocabularyItem.isActive,
      examples: word.vocabularyItem.examples,
      userWord: word.userWord,
      createdAt: word.vocabularyItem.createdAt,
    })),
  };
};
