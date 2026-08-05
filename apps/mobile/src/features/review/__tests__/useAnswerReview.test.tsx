/// <reference types="jest" />

import { renderHook } from "@testing-library/react-native";

import { masteredCollectionQueryKeys } from "@/entities/mastered-collection";
import { practiceItemQueryKeys } from "@/entities/practice";
import {
  answerReview,
  reviewQueryKeys,
  type AnswerReviewRequest,
  type AnswerReviewResponse,
} from "@/entities/review";
import { vocabularyItemQueryKeys } from "@/entities/vocabulary-item";
import { queryClient } from "@/shared/lib/query-client";
import { useAnswerReview } from "../hooks/useAnswerReview";

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn((options: unknown) => options),
}));

jest.mock("@/entities/review", () => ({
  ...jest.requireActual("@/entities/review/query-keys"),
  answerReview: jest.fn(),
}));

jest.mock("@/shared/lib/query-client", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

const mockAnswerReview = jest.mocked(answerReview);
const mockInvalidateQueries = jest.mocked(queryClient.invalidateQueries);

type MutationOptions = {
  mutationFn: (input: AnswerReviewRequest) => Promise<AnswerReviewResponse>;
  onSuccess: () => void;
};

const request: AnswerReviewRequest = {
  userWordId: "user-word-1",
  rating: "GOOD",
  isCorrect: true,
};

const response: AnswerReviewResponse = {
  userWordId: "user-word-1",
  vocabularyItemId: "vocabulary-item-1",
  status: "REVIEWING",
  reviewCount: 3,
  correctCount: 2,
  wrongCount: 1,
  lastReviewedAt: "2026-08-03T08:00:00.000Z",
  nextReviewAt: "2026-08-05T08:00:00.000Z",
  reviewLog: {
    id: "review-log-1",
    rating: "GOOD",
    isCorrect: true,
    answeredAt: "2026-08-03T08:00:00.000Z",
  },
};

describe("useAnswerReview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("invalidates every cache affected by an official review answer", async () => {
    mockAnswerReview.mockResolvedValue(response);
    const mutation = getMutation();

    await expect(mutation.mutationFn(request)).resolves.toBe(response);
    mutation.onSuccess();

    expect(mockAnswerReview).toHaveBeenCalledWith(request);
    expect(
      mockInvalidateQueries.mock.calls.map(([filters]) => filters),
    ).toEqual([
      { queryKey: reviewQueryKeys.all },
      { queryKey: practiceItemQueryKeys.lists() },
      { queryKey: vocabularyItemQueryKeys.lists() },
      { queryKey: masteredCollectionQueryKeys.all },
    ]);
  });

  it("does not invalidate caches when the review answer fails", async () => {
    mockAnswerReview.mockRejectedValue(new Error("Request failed"));
    const mutation = getMutation();

    await expect(mutation.mutationFn(request)).rejects.toThrow(
      "Request failed",
    );

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});

function getMutation(): MutationOptions {
  const { result } = renderHook(() => useAnswerReview());

  return result.current as unknown as MutationOptions;
}
