/// <reference types="jest" />

import { renderHook } from "@testing-library/react-native";

import { deckQueryKeys } from "@/entities/deck";
import { masteredCollectionQueryKeys } from "@/entities/mastered-collection";
import {
  createVocabularyItem,
  updateVocabularyItem,
  vocabularyItemQueryKeys,
  type CreateVocabularyItemRequest,
  type UpdateVocabularyItemRequest,
  type VocabularyItem,
} from "@/entities/vocabulary-item";
import { scheduledReviewQueryKeys } from "@/features/review-boxes";
import { queryClient } from "@/shared/lib/query-client";
import { useCreateVocabularyItem } from "../hooks/useCreateVocabularyItem";
import { useUpdateVocabularyItem } from "../hooks/useUpdateVocabularyItem";

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn((options: unknown) => options),
}));

jest.mock("@/entities/vocabulary-item", () => ({
  ...jest.requireActual("@/entities/vocabulary-item/query-keys"),
  createVocabularyItem: jest.fn(),
  updateVocabularyItem: jest.fn(),
}));

jest.mock("@/shared/lib/query-client", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  },
}));

const mockCreateVocabularyItem = jest.mocked(createVocabularyItem);
const mockUpdateVocabularyItem = jest.mocked(updateVocabularyItem);
const mockInvalidateQueries = jest.mocked(queryClient.invalidateQueries);
const mockSetQueryData = jest.mocked(queryClient.setQueryData);

type CreateMutationOptions = {
  mutationFn: (input: CreateVocabularyItemRequest) => Promise<VocabularyItem>;
  onSuccess: (item: VocabularyItem) => void;
};

type UpdateInput = {
  id: string;
  data: UpdateVocabularyItemRequest;
};

type UpdateMutationOptions = {
  mutationFn: (input: UpdateInput) => Promise<VocabularyItem>;
  onSuccess: (item: VocabularyItem) => void;
};

const item = createVocabularyItemResponse();

describe("vocabulary mutation cache behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores a created word and refreshes vocabulary lists", async () => {
    const request: CreateVocabularyItemRequest = {
      sourceText: "hello",
      targetText: "salam",
      wordType: "NOUN",
    };
    mockCreateVocabularyItem.mockResolvedValue(item);
    const mutation = getCreateMutation();

    await expect(mutation.mutationFn(request)).resolves.toBe(item);
    mutation.onSuccess(item);

    expect(mockCreateVocabularyItem).toHaveBeenCalledWith(request);
    expect(mockSetQueryData).toHaveBeenCalledWith(
      vocabularyItemQueryKeys.detail("vocabulary-item-1"),
      item,
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: vocabularyItemQueryKeys.lists(),
    });
  });

  it("refreshes every projection affected by a vocabulary update", async () => {
    const input: UpdateInput = {
      id: "vocabulary-item-1",
      data: { status: "MASTERED" },
    };
    mockUpdateVocabularyItem.mockResolvedValue(item);
    const mutation = getUpdateMutation();

    await expect(mutation.mutationFn(input)).resolves.toBe(item);
    mutation.onSuccess(item);

    expect(mockUpdateVocabularyItem).toHaveBeenCalledWith(
      "vocabulary-item-1",
      input.data,
    );
    expect(mockSetQueryData).toHaveBeenCalledWith(
      vocabularyItemQueryKeys.detail("vocabulary-item-1"),
      item,
    );
    expect(
      mockInvalidateQueries.mock.calls.map(([filters]) => filters),
    ).toEqual([
      { queryKey: vocabularyItemQueryKeys.lists() },
      { queryKey: masteredCollectionQueryKeys.all },
      { queryKey: scheduledReviewQueryKeys.all },
      { queryKey: deckQueryKeys.all },
    ]);
  });

  it("does not update caches when vocabulary creation fails", async () => {
    const request: CreateVocabularyItemRequest = {
      sourceText: "hello",
      targetText: "salam",
    };
    mockCreateVocabularyItem.mockRejectedValue(new Error("Request failed"));
    const mutation = getCreateMutation();

    await expect(mutation.mutationFn(request)).rejects.toThrow(
      "Request failed",
    );

    expect(mockSetQueryData).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});

function getCreateMutation(): CreateMutationOptions {
  const { result } = renderHook(() => useCreateVocabularyItem());

  return result.current as unknown as CreateMutationOptions;
}

function getUpdateMutation(): UpdateMutationOptions {
  const { result } = renderHook(() => useUpdateVocabularyItem());

  return result.current as unknown as UpdateMutationOptions;
}

function createVocabularyItemResponse(): VocabularyItem {
  return {
    id: "vocabulary-item-1",
    languagePairId: "language-pair-1",
    sourceText: "hello",
    targetText: "salam",
    wordType: "NOUN",
    cefrLevel: "A1",
    definition: null,
    note: null,
    visibility: "PRIVATE",
    isActive: true,
    examples: [],
    userWord: {
      id: "user-word-1",
      vocabularyItemId: "vocabulary-item-1",
      status: "MASTERED",
      isFavorite: false,
      masteryStep: 5,
      reviewCount: 5,
      correctCount: 5,
      wrongCount: 0,
      lastReviewedAt: "2026-08-03T08:00:00.000Z",
      nextReviewAt: null,
      createdAt: "2026-08-01T08:00:00.000Z",
    },
    createdAt: "2026-08-01T08:00:00.000Z",
  };
}
