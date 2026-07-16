import type {
  CefrLevel,
  UserWordStatus,
  WordType,
} from "@/entities/vocabulary-item";
import type { PracticeMode } from "@/entities/practice";

export type ScheduledReviewInterval =
  | "ONE_HOUR"
  | "SIX_HOURS"
  | "ONE_DAY"
  | "THREE_DAYS"
  | "ONE_WEEK";

export type ScheduledReviewState =
  | "QUEUED"
  | "STARTED"
  | "DUE"
  | "COMPLETED"
  | "CANCELLED";

export type ScheduledReviewAnswerResult = "INCORRECT" | "CORRECT" | "KNOWN";
export type ReviewSessionMode = Exclude<PracticeMode, "OTHER">;

export type ReviewIntervalLabel =
  | "1 hour"
  | "6 hours"
  | "1 day"
  | "3 days"
  | "1 week";

export type ReviewInterval = {
  apiInterval: ScheduledReviewInterval;
  durationMs: number;
  helperText: string;
  label: ReviewIntervalLabel;
};

export type ScheduledReviewExample = {
  id: string;
  sourceSentence: string;
  targetSentence: string;
};

export type ScheduledReviewItem = {
  scheduleId: string;
  interval: ScheduledReviewInterval;
  state: ScheduledReviewState;
  startedAt: string | null;
  dueAt: string | null;
  userWordId: string;
  vocabularyItemId: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  examples: ScheduledReviewExample[];
  status: UserWordStatus;
  masteryStep: number;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
};

export type ScheduledReviewItemsResponse = {
  items: ScheduledReviewItem[];
};

export type ScheduledReviewBox = {
  interval: ScheduledReviewInterval;
  label: ReviewIntervalLabel;
  totalWords: number;
  queuedWords: number;
  startedWords: number;
  dueWords: number;
  nextDueAt: string | null;
};

export type ScheduledReviewBoxesResponse = {
  boxes: ScheduledReviewBox[];
};

export type ScheduledReviewBoxDetailResponse = ScheduledReviewBox & {
  items: ScheduledReviewItem[];
};

export type ScheduleUserWordRequest = {
  userWordId: string;
  interval: ScheduledReviewInterval;
};

export type AnswerScheduledReviewRequest =
  | {
      practiceMode: PracticeMode;
      scheduleId: string;
      result: "KNOWN";
      nextInterval?: never;
    }
  | {
      practiceMode: PracticeMode;
      scheduleId: string;
      result: Exclude<ScheduledReviewAnswerResult, "KNOWN">;
      nextInterval: ScheduledReviewInterval;
    };

export type AnswerScheduledReviewResponse = {
  completedScheduleId: string;
  result: ScheduledReviewAnswerResult;
  nextSchedule: ScheduledReviewItem | null;
  userWord: {
    id: string;
    status: UserWordStatus;
    masteryStep: number;
    reviewCount: number;
    correctCount: number;
    wrongCount: number;
    lastReviewedAt: string | null;
    nextReviewAt: string | null;
  };
};

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export const REVIEW_INTERVALS: ReviewInterval[] = [
  {
    apiInterval: "ONE_HOUR",
    label: "1 hour",
    durationMs: MS_PER_HOUR,
    helperText: "Quick repeat",
  },
  {
    apiInterval: "SIX_HOURS",
    label: "6 hours",
    durationMs: 6 * MS_PER_HOUR,
    helperText: "Later today",
  },
  {
    apiInterval: "ONE_DAY",
    label: "1 day",
    durationMs: MS_PER_DAY,
    helperText: "Tomorrow",
  },
  {
    apiInterval: "THREE_DAYS",
    label: "3 days",
    durationMs: 3 * MS_PER_DAY,
    helperText: "Short review",
  },
  {
    apiInterval: "ONE_WEEK",
    label: "1 week",
    durationMs: 7 * MS_PER_DAY,
    helperText: "Long review",
  },
];

export function getReviewIntervalByApiInterval(
  interval: ScheduledReviewInterval,
) {
  return REVIEW_INTERVALS.find((item) => item.apiInterval === interval);
}

export function getReviewIntervalByLabel(label: ReviewIntervalLabel) {
  return REVIEW_INTERVALS.find((item) => item.label === label);
}

export function isScheduledReviewItemDue(
  item: ScheduledReviewItem,
  nowMs: number,
) {
  return (
    item.state === "DUE" ||
    (item.state === "STARTED" &&
      item.dueAt !== null &&
      Date.parse(item.dueAt) <= nowMs)
  );
}
