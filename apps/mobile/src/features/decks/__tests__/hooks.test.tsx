/// <reference types="jest" />

import { renderHook } from "@testing-library/react-native";

import {
  addDeckWords,
  createDeck,
  deleteDeck,
  deckQueryKeys,
  removeDeckWord,
  type AddDeckWordsRequest,
  type CreateDeckRequest,
  type DeckDetail,
  type DecksResponse,
} from "@/entities/deck";
import { vocabularyItemQueryKeys } from "@/entities/vocabulary-item";
import { scheduledReviewQueryKeys } from "@/features/review-boxes";
import { queryClient } from "@/shared/lib/query-client";
import {
  useAddDeckWords,
  useCreateDeck,
  useDeleteDeck,
  useRemoveDeckWord,
} from "../index";

jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn((options: unknown) => options),
}));

jest.mock("@/entities/deck", () => ({
  ...jest.requireActual("@/entities/deck/query-keys"),
  addDeckWords: jest.fn(),
  createDeck: jest.fn(),
  deleteDeck: jest.fn(),
  removeDeckWord: jest.fn(),
}));

jest.mock("@/shared/lib/query-client", () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
    removeQueries: jest.fn(),
    setQueryData: jest.fn(),
  },
}));

const mockAddDeckWords = jest.mocked(addDeckWords);
const mockCreateDeck = jest.mocked(createDeck);
const mockDeleteDeck = jest.mocked(deleteDeck);
const mockRemoveDeckWord = jest.mocked(removeDeckWord);
const mockInvalidateQueries = jest.mocked(queryClient.invalidateQueries);
const mockRemoveQueries = jest.mocked(queryClient.removeQueries);
const mockSetQueryData = jest.mocked(queryClient.setQueryData);

type MutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess: (data: TData, variables: TVariables) => void;
};

const deck = createDeckDetail();

describe("deck mutation cache behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores a newly created deck and invalidates the deck list", async () => {
    const request: CreateDeckRequest = {
      title: "Travel words",
      description: "Useful travel vocabulary",
      isDefault: true,
    };
    mockCreateDeck.mockResolvedValue(deck);
    const mutation = getCreateDeckMutation();

    const response = await mutation.mutationFn(request);
    mutation.onSuccess(response, request);

    expect(mockCreateDeck).toHaveBeenCalledWith(request);
    expect(mockSetQueryData).toHaveBeenCalledWith(
      deckQueryKeys.detail("deck-1"),
      deck,
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: deckQueryKeys.lists(),
    });
  });

  it("removes a deleted deck from cache and invalidates the deck list", async () => {
    mockDeleteDeck.mockResolvedValue(undefined);
    const mutation = getDeleteDeckMutation();

    await mutation.mutationFn("deck-1");
    mutation.onSuccess(undefined, "deck-1");

    expect(mockDeleteDeck).toHaveBeenCalledWith("deck-1");
    expect(mockSetQueryData).toHaveBeenCalledWith(
      deckQueryKeys.list(),
      expect.any(Function),
    );
    const updateDeckList = mockSetQueryData.mock.calls[0]?.[1] as (
      current: DecksResponse | undefined,
    ) => DecksResponse | undefined;
    const cachedDecks = {
      items: [deck, { ...deck, id: "deck-2", title: "Keep me" }],
    };

    expect(updateDeckList(cachedDecks)).toEqual({
      items: [{ ...deck, id: "deck-2", title: "Keep me" }],
    });
    expect(mockRemoveQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: deckQueryKeys.detail("deck-1"),
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: deckQueryKeys.lists(),
    });
  });

  it("updates every cache affected by adding words to a deck", async () => {
    const request: AddDeckWordsRequest = {
      words: [
        {
          sourceText: "hello",
          targetText: "salam",
          wordType: "NOUN",
        },
      ],
    };
    mockAddDeckWords.mockResolvedValue(deck);
    const mutation = getAddDeckWordsMutation("deck-1");

    const response = await mutation.mutationFn(request);
    mutation.onSuccess(response, request);

    expect(mockAddDeckWords).toHaveBeenCalledWith("deck-1", request);
    expect(mockSetQueryData).toHaveBeenCalledWith(
      deckQueryKeys.detail("deck-1"),
      deck,
    );
    expect(
      mockInvalidateQueries.mock.calls.map(([filters]) => filters),
    ).toEqual([
      { queryKey: deckQueryKeys.lists() },
      { queryKey: vocabularyItemQueryKeys.lists() },
      { queryKey: scheduledReviewQueryKeys.all },
    ]);
  });

  it("invalidates the selected deck and deck list after removing a word", async () => {
    mockRemoveDeckWord.mockResolvedValue(undefined);
    const mutation = getRemoveDeckWordMutation("deck-1");

    await mutation.mutationFn("deck-card-1");
    mutation.onSuccess(undefined, "deck-card-1");

    expect(mockRemoveDeckWord).toHaveBeenCalledWith("deck-1", "deck-card-1");
    expect(
      mockInvalidateQueries.mock.calls.map(([filters]) => filters),
    ).toEqual([
      { queryKey: deckQueryKeys.detail("deck-1") },
      { queryKey: deckQueryKeys.lists() },
    ]);
  });

  it("does not update caches when adding words fails", async () => {
    const request: AddDeckWordsRequest = {
      words: [
        {
          sourceText: "hello",
          targetText: "salam",
        },
      ],
    };
    mockAddDeckWords.mockRejectedValue(new Error("Request failed"));
    const mutation = getAddDeckWordsMutation("deck-1");

    await expect(mutation.mutationFn(request)).rejects.toThrow(
      "Request failed",
    );

    expect(mockSetQueryData).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});

function getCreateDeckMutation() {
  const { result } = renderHook(() => useCreateDeck());

  return result.current as unknown as MutationOptions<
    DeckDetail,
    CreateDeckRequest
  >;
}

function getAddDeckWordsMutation(deckId: string) {
  const { result } = renderHook(() => useAddDeckWords(deckId));

  return result.current as unknown as MutationOptions<
    DeckDetail,
    AddDeckWordsRequest
  >;
}

function getDeleteDeckMutation() {
  const { result } = renderHook(() => useDeleteDeck());

  return result.current as unknown as MutationOptions<void, string>;
}

function getRemoveDeckWordMutation(deckId: string) {
  const { result } = renderHook(() => useRemoveDeckWord(deckId));

  return result.current as unknown as MutationOptions<void, string>;
}

function createDeckDetail(): DeckDetail {
  return {
    id: "deck-1",
    title: "Travel words",
    description: "Useful travel vocabulary",
    isDefault: true,
    wordCount: 0,
    masteryScore: 0,
    maxMasteryScore: 0,
    progressPercent: 0,
    items: [],
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-01T08:00:00.000Z",
  };
}
