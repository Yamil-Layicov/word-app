import type {
  DeckDetailResponse,
  DeckResult,
  DecksResponse,
  DeckSummaryResponse,
  DeckWordResponse,
} from './decks.types';

const MAX_MASTERY_STEP = 5;

export function toDecksResponse(results: DeckResult[]): DecksResponse {
  return {
    items: results.map(toDeckSummaryResponse),
  };
}

export function toDeckDetailResponse(result: DeckResult): DeckDetailResponse {
  return {
    ...toDeckSummaryResponse(result),
    items: result.cards.map(toDeckWordResponse),
  };
}

export function toDeckSummaryResponse(result: DeckResult): DeckSummaryResponse {
  const wordCount = result.cards.length;
  const maxMasteryScore = wordCount * MAX_MASTERY_STEP;
  const masteryScore = result.cards.reduce(
    (total, card) => total + clampMasteryStep(card.userWord.masteryStep),
    0,
  );

  return {
    id: result.deck.id,
    title: result.deck.title,
    description: result.deck.description,
    isDefault: result.deck.isDefault,
    wordCount,
    masteryScore,
    maxMasteryScore,
    progressPercent:
      maxMasteryScore === 0
        ? 0
        : Math.round((masteryScore / maxMasteryScore) * 100),
    createdAt: result.deck.createdAt,
    updatedAt: result.deck.updatedAt,
  };
}

export function toDeckWordResponse(
  card: DeckResult['cards'][number],
): DeckWordResponse {
  return {
    deckCardId: card.deckCardId,
    id: card.vocabularyItem.id,
    languagePairId: card.vocabularyItem.languagePairId,
    sourceText: card.vocabularyItem.sourceText,
    targetText: card.vocabularyItem.targetText,
    wordType: card.vocabularyItem.wordType,
    cefrLevel: card.vocabularyItem.cefrLevel,
    definition: card.vocabularyItem.definition,
    note: card.vocabularyItem.note,
    visibility: card.vocabularyItem.visibility,
    isActive: card.vocabularyItem.isActive,
    examples: card.vocabularyItem.examples.map((example) => ({
      id: example.id,
      sourceSentence: example.sourceSentence,
      targetSentence: example.targetSentence,
      createdAt: example.createdAt,
    })),
    userWord: card.userWord,
    createdAt: card.vocabularyItem.createdAt,
  };
}

function clampMasteryStep(value: number): number {
  return Math.min(MAX_MASTERY_STEP, Math.max(0, value));
}
