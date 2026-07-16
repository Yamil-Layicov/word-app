import { ScheduledReviewInterval, ScheduledReviewState } from '@prisma/client';
import type {
  AnswerScheduledReviewResult,
  ScheduledReviewBoxDetailResponse,
  ScheduledReviewBoxResponse,
  ScheduledReviewBoxesResponse,
  ScheduledReviewAnswerResponse,
  ScheduledReviewComputedState,
  ScheduledReviewItemResponse,
  ScheduledReviewItemResult,
  ScheduledReviewItemsResponse,
} from './scheduled-reviews.types';

const INTERVAL_LABELS: Record<ScheduledReviewInterval, string> = {
  [ScheduledReviewInterval.ONE_HOUR]: '1 hour',
  [ScheduledReviewInterval.SIX_HOURS]: '6 hours',
  [ScheduledReviewInterval.ONE_DAY]: '1 day',
  [ScheduledReviewInterval.THREE_DAYS]: '3 days',
  [ScheduledReviewInterval.ONE_WEEK]: '1 week',
};

const SCHEDULED_REVIEW_INTERVALS: ScheduledReviewInterval[] = [
  ScheduledReviewInterval.ONE_HOUR,
  ScheduledReviewInterval.SIX_HOURS,
  ScheduledReviewInterval.ONE_DAY,
  ScheduledReviewInterval.THREE_DAYS,
  ScheduledReviewInterval.ONE_WEEK,
];

export function getScheduledReviewIntervals(): ScheduledReviewInterval[] {
  return SCHEDULED_REVIEW_INTERVALS;
}

export function getScheduledReviewIntervalLabel(
  interval: ScheduledReviewInterval,
): string {
  return INTERVAL_LABELS[interval];
}

export function getScheduledReviewComputedState(input: {
  state: ScheduledReviewState;
  dueAt: Date | null;
  now: Date;
}): ScheduledReviewComputedState {
  if (
    input.state === ScheduledReviewState.STARTED &&
    input.dueAt !== null &&
    input.dueAt <= input.now
  ) {
    return ScheduledReviewState.DUE;
  }

  return input.state;
}

export function toScheduledReviewItemResponse(
  result: ScheduledReviewItemResult,
  now: Date,
): ScheduledReviewItemResponse {
  return {
    scheduleId: result.schedule.id,
    interval: result.schedule.interval,
    state: getScheduledReviewComputedState({
      state: result.schedule.state,
      dueAt: result.schedule.dueAt,
      now,
    }),
    startedAt: result.schedule.startedAt,
    dueAt: result.schedule.dueAt,
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
    masteryStep: result.userWord.masteryStep,
    reviewCount: result.userWord.reviewCount,
    correctCount: result.userWord.correctCount,
    wrongCount: result.userWord.wrongCount,
    lastReviewedAt: result.userWord.lastReviewedAt,
    nextReviewAt: result.userWord.nextReviewAt,
  };
}

export function toScheduledReviewBoxResponse(input: {
  interval: ScheduledReviewInterval;
  items: ScheduledReviewItemResult[];
  now: Date;
}): ScheduledReviewBoxResponse {
  let queuedWords = 0;
  let startedWords = 0;
  let dueWords = 0;
  let nextDueAt: Date | null = null;

  for (const item of input.items) {
    const state = getScheduledReviewComputedState({
      state: item.schedule.state,
      dueAt: item.schedule.dueAt,
      now: input.now,
    });

    if (state === ScheduledReviewState.QUEUED) {
      queuedWords += 1;
    }

    if (state === ScheduledReviewState.DUE) {
      dueWords += 1;
    }

    if (state === ScheduledReviewState.STARTED) {
      startedWords += 1;

      if (
        item.schedule.dueAt !== null &&
        (nextDueAt === null || item.schedule.dueAt < nextDueAt)
      ) {
        nextDueAt = item.schedule.dueAt;
      }
    }
  }

  return {
    interval: input.interval,
    label: getScheduledReviewIntervalLabel(input.interval),
    totalWords: input.items.length,
    queuedWords,
    startedWords,
    dueWords,
    nextDueAt,
  };
}

export function toScheduledReviewBoxesResponse(input: {
  items: ScheduledReviewItemResult[];
  now: Date;
}): ScheduledReviewBoxesResponse {
  return {
    boxes: SCHEDULED_REVIEW_INTERVALS.map((interval) =>
      toScheduledReviewBoxResponse({
        interval,
        items: input.items.filter(
          (item) => item.schedule.interval === interval,
        ),
        now: input.now,
      }),
    ),
  };
}

export function toScheduledReviewItemsResponse(input: {
  items: ScheduledReviewItemResult[];
  now: Date;
}): ScheduledReviewItemsResponse {
  return {
    items: input.items.map((item) =>
      toScheduledReviewItemResponse(item, input.now),
    ),
  };
}

export function toScheduledReviewBoxDetailResponse(input: {
  interval: ScheduledReviewInterval;
  items: ScheduledReviewItemResult[];
  now: Date;
}): ScheduledReviewBoxDetailResponse {
  const box = toScheduledReviewBoxResponse(input);

  return {
    ...box,
    items: input.items.map((item) =>
      toScheduledReviewItemResponse(item, input.now),
    ),
  };
}

export function toScheduledReviewAnswerResponse(
  result: AnswerScheduledReviewResult,
  now: Date,
): ScheduledReviewAnswerResponse {
  return {
    completedScheduleId: result.completedScheduleId,
    result: result.result,
    nextSchedule: result.nextSchedule
      ? toScheduledReviewItemResponse(result.nextSchedule, now)
      : null,
    userWord: {
      id: result.userWord.id,
      status: result.userWord.status,
      masteryStep: result.userWord.masteryStep,
      reviewCount: result.userWord.reviewCount,
      correctCount: result.userWord.correctCount,
      wrongCount: result.userWord.wrongCount,
      lastReviewedAt: result.userWord.lastReviewedAt,
      nextReviewAt: result.userWord.nextReviewAt,
    },
  };
}
