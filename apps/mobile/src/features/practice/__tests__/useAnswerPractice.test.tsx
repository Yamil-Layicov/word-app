/// <reference types="jest" />

import { renderHook } from "@testing-library/react-native";

import {
  answerPractice,
  practiceItemQueryKeys,
  type AnswerPracticeRequest,
  type AnswerPracticeResponse,
} from "@/entities/practice";
import { queryClient } from "@/shared/lib/query-client";
import { useAnswerPractice } from "../hooks/useAnswerPractice";

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn((options: unknown) => options),
}));

jest.mock("@/entities/practice", () => ({
  ...jest.requireActual("@/entities/practice/query-keys"),
  answerPractice: jest.fn(),
}));

jest.mock("@/shared/lib/query-client", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

const mockAnswerPractice = jest.mocked(answerPractice);
const mockInvalidateQueries = jest.mocked(queryClient.invalidateQueries);

type MutationOptions = {
  mutationFn: (input: AnswerPracticeRequest) => Promise<AnswerPracticeResponse>;
  onSuccess: () => void;
};

const request: AnswerPracticeRequest = {
  userWordId: "user-word-1",
  practiceMode: "MATCHING",
  isCorrect: true,
};

const response: AnswerPracticeResponse = {
  practiceLog: {
    id: "practice-log-1",
    practiceMode: "MATCHING",
    isCorrect: true,
    answeredAt: "2026-08-03T08:00:00.000Z",
  },
  userWordId: "user-word-1",
  vocabularyItemId: "vocabulary-item-1",
  sourceText: "hello",
  targetText: "salam",
  wordType: "NOUN",
  cefrLevel: "A1",
  status: "LEARNING",
  isFavorite: false,
  nextReviewAt: "2026-08-05T08:00:00.000Z",
};

describe("useAnswerPractice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refreshes only practice data after a schedule-neutral answer", async () => {
    mockAnswerPractice.mockResolvedValue(response);
    const mutation = getMutation();

    await expect(mutation.mutationFn(request)).resolves.toBe(response);
    mutation.onSuccess();

    expect(mockAnswerPractice).toHaveBeenCalledWith(request);
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: practiceItemQueryKeys.lists(),
    });
  });

  it("does not invalidate practice data when saving fails", async () => {
    mockAnswerPractice.mockRejectedValue(new Error("Request failed"));
    const mutation = getMutation();

    await expect(mutation.mutationFn(request)).rejects.toThrow(
      "Request failed",
    );

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});

function getMutation(): MutationOptions {
  const { result } = renderHook(() => useAnswerPractice());

  return result.current as unknown as MutationOptions;
}
