import { useSyncExternalStore } from "react";

export type ReviewIntervalLabel = "1 hour" | "6 hours" | "1 day" | "3 days" | "1 week";

export type ReviewInterval = {
  label: ReviewIntervalLabel;
  durationMs: number;
  helperText: string;
};

export type ScheduledWord = {
  intervalLabel: ReviewIntervalLabel;
};

export type ScheduledBoxState = {
  startedAt: number;
  dueAt: number;
};

export type ReviewBoxesState = {
  scheduledBoxes: Partial<Record<ReviewIntervalLabel, ScheduledBoxState>>;
  scheduledWords: Record<string, ScheduledWord>;
};

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export const REVIEW_INTERVALS: ReviewInterval[] = [
  { label: "1 hour", durationMs: MS_PER_HOUR, helperText: "Quick repeat" },
  { label: "6 hours", durationMs: 6 * MS_PER_HOUR, helperText: "Later today" },
  { label: "1 day", durationMs: MS_PER_DAY, helperText: "Tomorrow" },
  { label: "3 days", durationMs: 3 * MS_PER_DAY, helperText: "Short review" },
  { label: "1 week", durationMs: 7 * MS_PER_DAY, helperText: "Long review" },
];

let state: ReviewBoxesState = {
  scheduledBoxes: {},
  scheduledWords: {},
};

const listeners = new Set<() => void>();

export function useReviewBoxesState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function scheduleVocabularyItem(vocabularyItemId: string, intervalLabel: ReviewIntervalLabel) {
  updateState({
    ...state,
    scheduledWords: {
      ...state.scheduledWords,
      [vocabularyItemId]: { intervalLabel },
    },
  });
}

export function removeScheduledVocabularyItem(vocabularyItemId: string) {
  const nextScheduledWords = { ...state.scheduledWords };
  delete nextScheduledWords[vocabularyItemId];

  updateState({
    ...state,
    scheduledWords: nextScheduledWords,
  });
}

export function startScheduledBox(interval: ReviewInterval) {
  const startedAt = Date.now();

  updateState({
    ...state,
    scheduledBoxes: {
      ...state.scheduledBoxes,
      [interval.label]: {
        startedAt,
        dueAt: startedAt + interval.durationMs,
      },
    },
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function updateState(nextState: ReviewBoxesState) {
  state = nextState;
  listeners.forEach((listener) => listener());
}
