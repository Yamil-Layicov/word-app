import type {
  CreateVocabularyItemResult,
  VocabularyItemResponse,
} from './vocabulary.types';

export function toVocabularyItemResponse(
  result: CreateVocabularyItemResult,
): VocabularyItemResponse {
  return {
    id: result.vocabularyItem.id,
    languagePairId: result.vocabularyItem.languagePairId,
    sourceText: result.vocabularyItem.sourceText,
    targetText: result.vocabularyItem.targetText,
    wordType: result.vocabularyItem.wordType,
    cefrLevel: result.vocabularyItem.cefrLevel,
    definition: result.vocabularyItem.definition,
    note: result.vocabularyItem.note,
    visibility: result.vocabularyItem.visibility,
    isActive: result.vocabularyItem.isActive,
    examples: result.vocabularyItem.examples.map((example) => ({
      id: example.id,
      sourceSentence: example.sourceSentence,
      targetSentence: example.targetSentence,
      createdAt: example.createdAt,
    })),
    userWord: {
      id: result.userWord.id,
      vocabularyItemId: result.userWord.vocabularyItemId,
      status: result.userWord.status,
      isFavorite: result.userWord.isFavorite,
      reviewCount: result.userWord.reviewCount,
      correctCount: result.userWord.correctCount,
      wrongCount: result.userWord.wrongCount,
      lastReviewedAt: result.userWord.lastReviewedAt,
      nextReviewAt: result.userWord.nextReviewAt,
      createdAt: result.userWord.createdAt,
    },
    createdAt: result.vocabularyItem.createdAt,
  };
}
