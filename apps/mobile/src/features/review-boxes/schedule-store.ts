import { useSyncExternalStore } from "react";

export type ReviewIntervalLabel = "1 hour" | "6 hours" | "1 day" | "3 days" | "1 week";

export type ReviewInterval = {
  label: ReviewIntervalLabel;
  durationMs: number;
  helperText: string;
};

export type ScheduledWordState = "queued" | "started";
export type ScheduledWordComputedStatus = ScheduledWordState | "due";

export type ScheduledWord = {
  intervalLabel: ReviewIntervalLabel;
  dueAt: number | null;
  startedAt: number | null;
  state: ScheduledWordState;
};

export type ReviewBoxesState = {
  scheduledWords: Record<string, ScheduledWord>;
};

export type ReviewAnswerQuality = "again" | "hard" | "good" | "easy" | "known";

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
  scheduledWords: {},
};

const listeners = new Set<() => void>();

export function useReviewBoxesState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function scheduleVocabularyItem(vocabularyItemId: string, intervalLabel: ReviewIntervalLabel) {
  scheduleWord(vocabularyItemId, intervalLabel, false);
}

export function scheduleVocabularyItemWithTimer(vocabularyItemId: string, intervalLabel: ReviewIntervalLabel) {
  scheduleWord(vocabularyItemId, intervalLabel, true);
}

export function answerScheduledWord(vocabularyItemId: string, quality: ReviewAnswerQuality) {
  switch (quality) {
    case "again":
      scheduleVocabularyItemWithTimer(vocabularyItemId, "1 hour");
      break;
    case "hard":
      scheduleVocabularyItemWithTimer(vocabularyItemId, "6 hours");
      break;
    case "good":
      scheduleVocabularyItemWithTimer(vocabularyItemId, "1 day");
      break;
    case "easy":
      scheduleVocabularyItemWithTimer(vocabularyItemId, "3 days");
      break;
    case "known":
      removeScheduledVocabularyItem(vocabularyItemId);
      break;
  }
}

export function getReviewInterval(label: ReviewIntervalLabel) {
  return REVIEW_INTERVALS.find((interval) => interval.label === label);
}

export function getScheduledWordStatus(
  scheduledWord: ScheduledWord,
  nowMs: number,
): ScheduledWordComputedStatus {
  if (scheduledWord.state === "queued" || !scheduledWord.dueAt) {
    return "queued";
  }

  return scheduledWord.dueAt <= nowMs ? "due" : "started";
}

function scheduleWord(vocabularyItemId: string, intervalLabel: ReviewIntervalLabel, autoStart: boolean) {
  const nowMs = Date.now();
  const interval = getReviewInterval(intervalLabel);

  updateState({
    ...state,
    scheduledWords: {
      ...state.scheduledWords,
      [vocabularyItemId]: {
        intervalLabel,
        state: autoStart ? "started" : "queued",
        startedAt: autoStart ? nowMs : null,
        dueAt: autoStart && interval ? nowMs + interval.durationMs : null,
      },
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
  const nextScheduledWords = Object.fromEntries(
    Object.entries(state.scheduledWords).map(([vocabularyItemId, scheduledWord]) => {
      if (scheduledWord.intervalLabel !== interval.label || scheduledWord.state !== "queued") {
        return [vocabularyItemId, scheduledWord];
      }

      return [
        vocabularyItemId,
        {
          ...scheduledWord,
          state: "started" as const,
          startedAt,
          dueAt: startedAt + interval.durationMs,
        },
      ];
    }),
  );

  updateState({
    ...state,
    scheduledWords: nextScheduledWords,
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
