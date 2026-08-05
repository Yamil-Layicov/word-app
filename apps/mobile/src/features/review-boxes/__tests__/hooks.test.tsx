/// <reference types="jest" />

import { renderHook } from "@testing-library/react-native";

import { deckQueryKeys } from "@/entities/deck";
import { masteredCollectionQueryKeys } from "@/entities/mastered-collection";
import { practiceItemQueryKeys } from "@/entities/practice";
import { reviewQueryKeys } from "@/entities/review";
import { vocabularyItemQueryKeys } from "@/entities/vocabulary-item";
import { queryClient } from "@/shared/lib/query-client";
import {
  answerScheduledReview,
  cancelScheduledReview,
  scheduleUserWord,
  startScheduledReviewBox,
} from "../api";
import {
  useAnswerScheduledReview,
  useCancelScheduledReview,
  useScheduleUserWord,
  useStartScheduledReviewBox,
} from "../hooks";
import type {
  AnswerScheduledReviewRequest,
  AnswerScheduledReviewResponse,
  ScheduledReviewInterval,
  ScheduleUserWordRequest,
} from "../model";
import { scheduledReviewQueryKeys } from "../query-keys";

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn((options: unknown) => options),
}));

jest.mock("../api", () => ({
  answerScheduledReview: jest.fn(),
  cancelScheduledReview: jest.fn(),
  scheduleUserWord: jest.fn(),
  startScheduledReviewBox: jest.fn(),
}));

jest.mock("@/shared/lib/query-client", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

const mockAnswerScheduledReview = jest.mocked(answerScheduledReview);
const mockCancelScheduledReview = jest.mocked(cancelScheduledReview);
const mockScheduleUserWord = jest.mocked(scheduleUserWord);
const mockStartScheduledReviewBox = jest.mocked(startScheduledReviewBox);
const mockInvalidateQueries = jest.mocked(queryClient.invalidateQueries);

type MutationOptions<TVariables> = {
  mutationFn: (variables: TVariables) => Promise<unknown>;
  onSuccess: () => void;
};

const request: AnswerScheduledReviewRequest = {
  scheduleId: "schedule-1",
  practiceMode: "FLASHCARD",
  result: "KNOWN",
};

const response: AnswerScheduledReviewResponse = {
  completedScheduleId: "schedule-1",
  result: "KNOWN",
  nextSchedule: null,
  userWord: {
    id: "user-word-1",
    status: "MASTERED",
    masteryStep: 5,
    reviewCount: 2,
    correctCount: 2,
    wrongCount: 0,
    lastReviewedAt: "2026-07-30T10:00:00.000Z",
    nextReviewAt: null,
  },
};

function getAnswerMutationOptions(): MutationOptions<AnswerScheduledReviewRequest> {
  const { result } = renderHook(() => useAnswerScheduledReview());

  return result.current as unknown as MutationOptions<AnswerScheduledReviewRequest>;
}

function getScheduleMutationOptions(): MutationOptions<ScheduleUserWordRequest> {
  const { result } = renderHook(() => useScheduleUserWord());

  return result.current as unknown as MutationOptions<ScheduleUserWordRequest>;
}

function getStartMutationOptions(): MutationOptions<ScheduledReviewInterval> {
  const { result } = renderHook(() => useStartScheduledReviewBox());

  return result.current as unknown as MutationOptions<ScheduledReviewInterval>;
}

function getCancelMutationOptions(): MutationOptions<string> {
  const { result } = renderHook(() => useCancelScheduledReview());

  return result.current as unknown as MutationOptions<string>;
}

describe("scheduled review mutation cache invalidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("invalidates every affected cache after an answer succeeds", async () => {
    mockAnswerScheduledReview.mockResolvedValue(response);
    const mutation = getAnswerMutationOptions();

    await mutation.mutationFn(request);
    mutation.onSuccess();

    expect(mockAnswerScheduledReview).toHaveBeenCalledWith(request);
    expectAllAffectedCachesInvalidated();
  });

  it("invalidates affected caches after scheduling a word", async () => {
    const scheduleRequest: ScheduleUserWordRequest = {
      userWordId: "user-word-1",
      interval: "ONE_DAY",
    };
    mockScheduleUserWord.mockResolvedValue({} as never);
    const mutation = getScheduleMutationOptions();

    await mutation.mutationFn(scheduleRequest);
    mutation.onSuccess();

    expect(mockScheduleUserWord).toHaveBeenCalledWith(scheduleRequest);
    expectAllAffectedCachesInvalidated();
  });

  it("invalidates affected caches after starting one review box", async () => {
    mockStartScheduledReviewBox.mockResolvedValue({} as never);
    const mutation = getStartMutationOptions();

    await mutation.mutationFn("SIX_HOURS");
    mutation.onSuccess();

    expect(mockStartScheduledReviewBox).toHaveBeenCalledWith("SIX_HOURS");
    expectAllAffectedCachesInvalidated();
  });

  it("invalidates affected caches after cancelling a schedule", async () => {
    mockCancelScheduledReview.mockResolvedValue(undefined);
    const mutation = getCancelMutationOptions();

    await mutation.mutationFn("schedule-1");
    mutation.onSuccess();

    expect(mockCancelScheduledReview).toHaveBeenCalledWith("schedule-1");
    expectAllAffectedCachesInvalidated();
  });

  it("does not invalidate caches when saving the answer fails", async () => {
    mockAnswerScheduledReview.mockRejectedValue(new Error("Request failed"));
    const mutation = getAnswerMutationOptions();

    await expect(mutation.mutationFn(request)).rejects.toThrow(
      "Request failed",
    );

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});

function expectAllAffectedCachesInvalidated() {
  expect(
    mockInvalidateQueries.mock.calls.map(([filters]) => filters),
  ).toEqual([
    { queryKey: scheduledReviewQueryKeys.all },
    { queryKey: vocabularyItemQueryKeys.lists() },
    { queryKey: vocabularyItemQueryKeys.details() },
    { queryKey: reviewQueryKeys.all },
    { queryKey: practiceItemQueryKeys.lists() },
    { queryKey: masteredCollectionQueryKeys.all },
    { queryKey: deckQueryKeys.all },
  ]);
}
