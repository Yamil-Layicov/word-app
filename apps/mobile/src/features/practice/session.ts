import type { PracticeMode } from "@/entities/practice";

export type PracticeSessionMode = Exclude<PracticeMode, "OTHER">;

const PRACTICE_SESSION_MODES: PracticeSessionMode[] = [
  "FLASHCARD",
  "TYPING",
  "MULTIPLE_CHOICE",
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
  }
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
