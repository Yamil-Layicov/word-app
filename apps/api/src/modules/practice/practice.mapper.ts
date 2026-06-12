import type {
  AnswerPracticeResponse,
  AnswerPracticeResult,
  ListPracticeItemsResponse,
  ListPracticeItemsResult,
  PracticeItemResponse,
  PracticeItemResult,
} from './practice.types';

export function toPracticeItemResponse(
  result: PracticeItemResult,
): PracticeItemResponse {
  return {
    userWordId: result.userWord.id,
    vocabularyItemId: result.vocabularyItem.id,
    sourceText: result.vocabularyItem.sourceText,
    targetText: result.vocabularyItem.targetText,
    wordType: result.vocabularyItem.wordType,
    cefrLevel: result.vocabularyItem.cefrLevel,
    definition: result.vocabularyItem.definition,
    note: result.vocabularyItem.note,
    visibility: result.vocabularyItem.visibility,
    examples: result.vocabularyItem.examples.map((example) => ({
      id: example.id,
      sourceSentence: example.sourceSentence,
      targetSentence: example.targetSentence,
    })),
    status: result.userWord.status,
    isFavorite: result.userWord.isFavorite,
    reviewCount: result.userWord.reviewCount,
    correctCount: result.userWord.correctCount,
    wrongCount: result.userWord.wrongCount,
    lastReviewedAt: result.userWord.lastReviewedAt,
    nextReviewAt: result.userWord.nextReviewAt,
  };
}

export function toListPracticeItemsResponse(
  result: ListPracticeItemsResult,
): ListPracticeItemsResponse {
  return {
    items: result.items.map(toPracticeItemResponse),
    nextCursor: result.nextCursor,
  };
}

export function toAnswerPracticeResponse(
  result: AnswerPracticeResult,
): AnswerPracticeResponse {
  return {
    practiceLog: {
      id: result.practiceLog.id,
      practiceMode: result.practiceLog.practiceMode,
      isCorrect: result.practiceLog.isCorrect,
      answeredAt: result.practiceLog.answeredAt,
    },
    userWordId: result.userWord.id,
    vocabularyItemId: result.vocabularyItem.id,
    sourceText: result.vocabularyItem.sourceText,
    targetText: result.vocabularyItem.targetText,
    wordType: result.vocabularyItem.wordType,
    cefrLevel: result.vocabularyItem.cefrLevel,
    status: result.userWord.status,
    isFavorite: result.userWord.isFavorite,
    nextReviewAt: result.userWord.nextReviewAt,
  };
}
