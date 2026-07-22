import type { PracticeMode } from "@/entities/practice";

export type PracticeSessionMode = Exclude<PracticeMode, "OTHER">;

const PRACTICE_SESSION_MODES: PracticeSessionMode[] = [
  "FLASHCARD",
  "TYPING",
  "MULTIPLE_CHOICE",
  "MATCHING",
];

export function parsePracticeSessionMode(
  value: string | undefined,
): PracticeSessionMode | undefined {
  return PRACTICE_SESSION_MODES.find((mode) => mode === value);
}

export function getPracticeSessionModeLabel(mode: PracticeSessionMode) {
  switch (mode) {
    case "FLASHCARD":
      return "Flashcards";
    case "TYPING":
      return "Writing";
    case "MULTIPLE_CHOICE":
      return "Test";
    case "MATCHING":
      return "Matching";
  }
}

export function canStartMatchingSession<
  TItem extends { sourceText: string; targetText: string },
>(items: TItem[]) {
  if (items.length < 2) {
    return false;
  }

  const sourceTexts = new Set(
    items.map((item) => normalizeMatchingText(item.sourceText)),
  );
  const targetTexts = new Set(
    items.map((item) => normalizeMatchingText(item.targetText)),
  );

  return sourceTexts.size === items.length && targetTexts.size === items.length;
}

export function buildPracticeChoiceOptions<
  TItem extends { targetText: string },
>(items: TItem[], currentIndex: number) {
  const currentItem = items[currentIndex];

  if (!currentItem) {
    return [];
  }

  const distractors = Array.from(
    new Set(
      items
        .filter((_, index) => index !== currentIndex)
        .map((item) => item.targetText)
        .filter((targetText) => targetText !== currentItem.targetText),
    ),
  ).slice(0, 3);
  const options = [currentItem.targetText, ...distractors];
  const shift = currentIndex % options.length;

  return [...options.slice(shift), ...options.slice(0, shift)];
}

function normalizeMatchingText(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}
