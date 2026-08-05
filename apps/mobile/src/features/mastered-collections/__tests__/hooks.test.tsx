/// <reference types="jest" />

import { renderHook } from "@testing-library/react-native";

import {
  addMasteredCollectionWords,
  createMasteredCollection,
  deleteMasteredCollection,
  masteredCollectionQueryKeys,
  removeMasteredCollectionWord,
  type AddMasteredCollectionWordsRequest,
  type CreateMasteredCollectionRequest,
  type MasteredCollectionDetail,
} from "@/entities/mastered-collection";
import { queryClient } from "@/shared/lib/query-client";
import {
  useAddMasteredCollectionWords,
  useCreateMasteredCollection,
  useDeleteMasteredCollection,
  useRemoveMasteredCollectionWord,
} from "../index";

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn((options: unknown) => options),
}));

jest.mock("@/entities/mastered-collection", () => ({
  ...jest.requireActual("@/entities/mastered-collection/query-keys"),
  addMasteredCollectionWords: jest.fn(),
  createMasteredCollection: jest.fn(),
  deleteMasteredCollection: jest.fn(),
  removeMasteredCollectionWord: jest.fn(),
}));

jest.mock("@/shared/lib/query-client", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
    removeQueries: jest.fn(),
    setQueryData: jest.fn(),
  },
}));

const mockAddWords = jest.mocked(addMasteredCollectionWords);
const mockCreateCollection = jest.mocked(createMasteredCollection);
const mockDeleteCollection = jest.mocked(deleteMasteredCollection);
const mockRemoveWord = jest.mocked(removeMasteredCollectionWord);
const mockInvalidateQueries = jest.mocked(queryClient.invalidateQueries);
const mockRemoveQueries = jest.mocked(queryClient.removeQueries);
const mockSetQueryData = jest.mocked(queryClient.setQueryData);

type MutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess: (data: TData, variables: TVariables) => void;
};

type AddWordsInput = {
  collectionId: string;
  input: AddMasteredCollectionWordsRequest;
};

type RemoveWordInput = {
  collectionId: string;
  collectionWordId: string;
};

const collection = createCollection();

describe("mastered collection mutation cache behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores a created collection and refreshes collection lists", async () => {
    const request: CreateMasteredCollectionRequest = { title: "Travel" };
    mockCreateCollection.mockResolvedValue(collection);
    const mutation = getCreateMutation();

    const response = await mutation.mutationFn(request);
    mutation.onSuccess(response, request);

    expect(mockCreateCollection).toHaveBeenCalledWith(request);
    expectCollectionStoredAndListInvalidated();
  });

  it("stores collection detail after adding multiple words", async () => {
    const request: AddWordsInput = {
      collectionId: "collection-1",
      input: { userWordIds: ["user-word-1", "user-word-2"] },
    };
    mockAddWords.mockResolvedValue(collection);
    const mutation = getAddWordsMutation();

    const response = await mutation.mutationFn(request);
    mutation.onSuccess(response, request);

    expect(mockAddWords).toHaveBeenCalledWith(
      "collection-1",
      request.input,
    );
    expectCollectionStoredAndListInvalidated();
  });

  it("refreshes collection detail and lists after removing one word", async () => {
    const request: RemoveWordInput = {
      collectionId: "collection-1",
      collectionWordId: "collection-word-1",
    };
    mockRemoveWord.mockResolvedValue(undefined);
    const mutation = getRemoveWordMutation();

    await mutation.mutationFn(request);
    mutation.onSuccess(undefined, request);

    expect(mockRemoveWord).toHaveBeenCalledWith(
      "collection-1",
      "collection-word-1",
    );
    expect(
      mockInvalidateQueries.mock.calls.map(([filters]) => filters),
    ).toEqual([
      { queryKey: masteredCollectionQueryKeys.detail("collection-1") },
      { queryKey: masteredCollectionQueryKeys.lists() },
    ]);
  });

  it("removes deleted detail cache and refreshes collection lists", async () => {
    mockDeleteCollection.mockResolvedValue(undefined);
    const mutation = getDeleteMutation();

    await mutation.mutationFn("collection-1");
    mutation.onSuccess(undefined, "collection-1");

    expect(mockDeleteCollection).toHaveBeenCalledWith("collection-1");
    expect(mockRemoveQueries).toHaveBeenCalledWith({
      queryKey: masteredCollectionQueryKeys.detail("collection-1"),
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: masteredCollectionQueryKeys.lists(),
    });
  });

  it("does not update caches when collection creation fails", async () => {
    const request: CreateMasteredCollectionRequest = { title: "Travel" };
    mockCreateCollection.mockRejectedValue(new Error("Request failed"));
    const mutation = getCreateMutation();

    await expect(mutation.mutationFn(request)).rejects.toThrow(
      "Request failed",
    );

    expect(mockSetQueryData).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});

function getCreateMutation() {
  const { result } = renderHook(() => useCreateMasteredCollection());
  return result.current as unknown as MutationOptions<
    MasteredCollectionDetail,
    CreateMasteredCollectionRequest
  >;
}

function getAddWordsMutation() {
  const { result } = renderHook(() => useAddMasteredCollectionWords());
  return result.current as unknown as MutationOptions<
    MasteredCollectionDetail,
    AddWordsInput
  >;
}

function getRemoveWordMutation() {
  const { result } = renderHook(() => useRemoveMasteredCollectionWord());
  return result.current as unknown as MutationOptions<void, RemoveWordInput>;
}

function getDeleteMutation() {
  const { result } = renderHook(() => useDeleteMasteredCollection());
  return result.current as unknown as MutationOptions<void, string>;
}

function expectCollectionStoredAndListInvalidated() {
  expect(mockSetQueryData).toHaveBeenCalledWith(
    masteredCollectionQueryKeys.detail("collection-1"),
    collection,
  );
  expect(mockInvalidateQueries).toHaveBeenCalledWith({
    queryKey: masteredCollectionQueryKeys.lists(),
  });
}

function createCollection(): MasteredCollectionDetail {
  return {
    id: "collection-1",
    title: "Travel",
    description: null,
    wordCount: 0,
    masteredWordCount: 0,
    items: [],
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-01T08:00:00.000Z",
  };
}
