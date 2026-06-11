import type {
  AnswerReviewResponse,
  AnswerReviewResult,
  DueReviewItemResponse,
  DueReviewItemResult,
  DueReviewsResponse,
} from './reviews.types';

export function toDueReviewItemResponse(
  result: DueReviewItemResult,
): DueReviewItemResponse {
  return {
    userWordId: result.userWord.id,
    vocabularyItemId: result.vocabularyItem.id,
    sourceText: result.vocabularyItem.sourceText,
    targetText: result.vocabularyItem.targetText,
    wordType: result.vocabularyItem.wordType,
    cefrLevel: result.vocabularyItem.cefrLevel,
    definition: result.vocabularyItem.definition,
    note: result.vocabularyItem.note,
    examples: result.vocabularyItem.examples.map((example) => ({
      id: example.id,
      sourceSentence: example.sourceSentence,
      targetSentence: example.targetSentence,
    })),
    status: result.userWord.status,
    reviewCount: result.userWord.reviewCount,
    correctCount: result.userWord.correctCount,
    wrongCount: result.userWord.wrongCount,
    lastReviewedAt: result.userWord.lastReviewedAt,
    nextReviewAt: result.userWord.nextReviewAt,
  };
}

export function toDueReviewsResponse(
  items: DueReviewItemResult[],
): DueReviewsResponse {
  return {
    items: items.map(toDueReviewItemResponse),
  };
}

export function toAnswerReviewResponse(
  result: AnswerReviewResult,
): AnswerReviewResponse {
  return {
    userWordId: result.userWord.id,
    vocabularyItemId: result.vocabularyItem.id,
    status: result.userWord.status,
    reviewCount: result.userWord.reviewCount,
    correctCount: result.userWord.correctCount,
    wrongCount: result.userWord.wrongCount,
    lastReviewedAt: result.userWord.lastReviewedAt,
    nextReviewAt: result.userWord.nextReviewAt,
    reviewLog: {
      id: result.reviewLog.id,
      rating: result.reviewLog.rating,
      isCorrect: result.reviewLog.isCorrect,
      answeredAt: result.reviewLog.answeredAt,
    },
  };
}
