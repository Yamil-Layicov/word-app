/// <reference types="jest" />

import { renderHook } from "@testing-library/react-native";

import { deckQueryKeys } from "@/entities/deck";
import { masteredCollectionQueryKeys } from "@/entities/mastered-collection";
import { practiceItemQueryKeys } from "@/entities/practice";
import { reviewQueryKeys } from "@/entities/review";
import { vocabularyItemQueryKeys } from "@/entities/vocabulary-item";
import { queryClient } from "@/shared/lib/query-client";
import { answerScheduledReview } from "../api";
import { useAnswerScheduledReview } from "../hooks";
import type {
  AnswerScheduledReviewRequest,
  AnswerScheduledReviewResponse,
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
