/// <reference types="jest" />

import { renderHook } from "@testing-library/react-native";

import { deckQueryKeys } from "@/entities/deck";
import { masteredCollectionQueryKeys } from "@/entities/mastered-collection";
import { practiceItemQueryKeys } from "@/entities/practice";
import { reviewQueryKeys } from "@/entities/review";
import {
  createVocabularyItem,
  deleteVocabularyItemPermanently,
  replaceVocabularyItemContent,
  updateVocabularyItem,
  vocabularyItemQueryKeys,
  type CreateVocabularyItemRequest,
  type ReplaceVocabularyItemContentRequest,
  type UpdateVocabularyItemRequest,
  type VocabularyItem,
} from "@/entities/vocabulary-item";
import { scheduledReviewQueryKeys } from "@/features/review-boxes";
import { queryClient } from "@/shared/lib/query-client";
import { useCreateVocabularyItem } from "../hooks/useCreateVocabularyItem";
import { useDeleteVocabularyItemPermanently } from "../hooks/useDeleteVocabularyItemPermanently";
import { useReplaceVocabularyItemContent } from "../hooks/useReplaceVocabularyItemContent";
import { useUpdateVocabularyItem } from "../hooks/useUpdateVocabularyItem";

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn((options: unknown) => options),
}));

jest.mock("@/entities/vocabulary-item", () => ({
  ...jest.requireActual("@/entities/vocabulary-item/query-keys"),
  createVocabularyItem: jest.fn(),
  deleteVocabularyItemPermanently: jest.fn(),
  replaceVocabularyItemContent: jest.fn(),
  updateVocabularyItem: jest.fn(),
}));

jest.mock("@/shared/lib/query-client", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
    removeQueries: jest.fn(),
    setQueryData: jest.fn(),
  },
}));

const mockCreateVocabularyItem = jest.mocked(createVocabularyItem);
const mockDeleteVocabularyItemPermanently = jest.mocked(
  deleteVocabularyItemPermanently,
);
const mockReplaceVocabularyItemContent = jest.mocked(
  replaceVocabularyItemContent,
);
const mockUpdateVocabularyItem = jest.mocked(updateVocabularyItem);
const mockInvalidateQueries = jest.mocked(queryClient.invalidateQueries);
const mockRemoveQueries = jest.mocked(queryClient.removeQueries);
const mockSetQueryData = jest.mocked(queryClient.setQueryData);

type CreateMutationOptions = {
  mutationFn: (input: CreateVocabularyItemRequest) => Promise<VocabularyItem>;
  onSuccess: (item: VocabularyItem) => void;
};

type UpdateInput = {
  id: string;
  data: UpdateVocabularyItemRequest;
};

type ReplaceContentInput = {
  id: string;
  data: ReplaceVocabularyItemContentRequest;
};

type UpdateMutationOptions = {
  mutationFn: (input: UpdateInput) => Promise<VocabularyItem>;
  onSuccess: (item: VocabularyItem) => void;
};

type ReplaceContentMutationOptions = {
  mutationFn: (input: ReplaceContentInput) => Promise<VocabularyItem>;
  onSuccess: (item: VocabularyItem) => void;
};

type DeleteMutationOptions = {
  mutationFn: (id: string) => Promise<void>;
  onSuccess: (response: void, id: string) => void;
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
      { queryKey: reviewQueryKeys.all },
      { queryKey: practiceItemQueryKeys.lists() },
    ]);
  });

  it("refreshes every projection affected by edited vocabulary content", async () => {
    const input: ReplaceContentInput = {
      id: "vocabulary-item-1",
      data: {
        sourceText: "welcome",
        targetText: "xoş gəldin",
        examples: [],
      },
    };
    mockReplaceVocabularyItemContent.mockResolvedValue(item);
    const mutation = getReplaceContentMutation();

    await expect(mutation.mutationFn(input)).resolves.toBe(item);
    mutation.onSuccess(item);

    expect(mockReplaceVocabularyItemContent).toHaveBeenCalledWith(
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
      { queryKey: deckQueryKeys.all },
      { queryKey: masteredCollectionQueryKeys.all },
      { queryKey: scheduledReviewQueryKeys.all },
      { queryKey: reviewQueryKeys.all },
      { queryKey: practiceItemQueryKeys.lists() },
    ]);
  });

  it("clears every user projection after permanent deletion", async () => {
    mockDeleteVocabularyItemPermanently.mockResolvedValue(undefined);
    const mutation = getDeleteMutation();

    await expect(
      mutation.mutationFn("vocabulary-item-1"),
    ).resolves.toBeUndefined();
    mutation.onSuccess(undefined, "vocabulary-item-1");

    expect(mockDeleteVocabularyItemPermanently).toHaveBeenCalledWith(
      "vocabulary-item-1",
    );
    expect(mockRemoveQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: vocabularyItemQueryKeys.detail("vocabulary-item-1"),
    });
    expect(
      mockInvalidateQueries.mock.calls.map(([filters]) => filters),
    ).toEqual([
      { queryKey: vocabularyItemQueryKeys.lists() },
      { queryKey: masteredCollectionQueryKeys.all },
      { queryKey: scheduledReviewQueryKeys.all },
      { queryKey: deckQueryKeys.all },
      { queryKey: reviewQueryKeys.all },
      { queryKey: practiceItemQueryKeys.lists() },
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

function getReplaceContentMutation(): ReplaceContentMutationOptions {
  const { result } = renderHook(() => useReplaceVocabularyItemContent());

  return result.current as unknown as ReplaceContentMutationOptions;
}

function getDeleteMutation(): DeleteMutationOptions {
  const { result } = renderHook(() =>
    useDeleteVocabularyItemPermanently(),
  );

  return result.current as unknown as DeleteMutationOptions;
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
