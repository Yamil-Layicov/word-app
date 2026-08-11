/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import {
  useMasteredCollectionsQuery,
  type MasteredCollectionSummary,
} from "@/entities/mastered-collection";
import {
  useInfiniteVocabularyItemsQuery,
  type VocabularyItem,
} from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import {
  useAddMasteredCollectionWords,
  useCreateMasteredCollection,
} from "@/features/mastered-collections";
import { useScheduleUserWord } from "@/features/review-boxes";
import { useDeleteVocabularyItemPermanently } from "@/features/vocabulary";
import { MasteredWordsScreen } from "../MasteredWordsScreen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/entities/mastered-collection", () => ({
  useMasteredCollectionsQuery: jest.fn(),
}));

jest.mock("@/entities/vocabulary-item", () => ({
  useInfiniteVocabularyItemsQuery: jest.fn(),
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/mastered-collections", () => ({
  useAddMasteredCollectionWords: jest.fn(),
  useCreateMasteredCollection: jest.fn(),
}));

jest.mock("@/features/review-boxes", () => ({
  ...jest.requireActual("@/features/review-boxes/model"),
  useScheduleUserWord: jest.fn(),
}));

jest.mock("@/features/vocabulary", () => ({
  useDeleteVocabularyItemPermanently: jest.fn(),
}));

const useRouterMock = useRouter as jest.Mock;
const useMasteredCollectionsQueryMock =
  useMasteredCollectionsQuery as jest.Mock;
const useInfiniteVocabularyItemsQueryMock =
  useInfiniteVocabularyItemsQuery as jest.Mock;
const useAuthFailureRedirectMock = useAuthFailureRedirect as jest.Mock;
const useAddMasteredCollectionWordsMock =
  useAddMasteredCollectionWords as jest.Mock;
const useCreateMasteredCollectionMock =
  useCreateMasteredCollection as jest.Mock;
const useScheduleUserWordMock = useScheduleUserWord as jest.Mock;
const useDeleteVocabularyItemPermanentlyMock =
  useDeleteVocabularyItemPermanently as jest.Mock;

const router = {
  back: jest.fn(),
  push: jest.fn(),
};
const addCollectionWords = jest.fn();
const createCollection = jest.fn();
const scheduleUserWord = jest.fn();
const deleteVocabularyItemPermanently = jest.fn();
const resetDeleteVocabularyItem = jest.fn();
const resetAddCollectionWords = jest.fn();
const resetCreateCollection = jest.fn();
const refetchCollections = jest.fn();
const refetchMasteredWords = jest.fn();
const fetchNextPage = jest.fn();

const travelCollection = createCollectionSummary({
  id: "collection-1",
  title: "Travel Collection",
  wordCount: 3,
});
const hello = createVocabularyItem({
  id: "vocabulary-item-1",
  sourceText: "hello",
  targetText: "salam",
  userWordId: "user-word-1",
});
const goodbye = createVocabularyItem({
  id: "vocabulary-item-2",
  sourceText: "goodbye",
  targetText: "sag ol",
  userWordId: "user-word-2",
});

describe("MasteredWordsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addCollectionWords.mockReset().mockResolvedValue(travelCollection);
    createCollection.mockReset().mockResolvedValue(travelCollection);
    scheduleUserWord.mockReset().mockResolvedValue(undefined);
    deleteVocabularyItemPermanently.mockReset().mockResolvedValue(undefined);

    useRouterMock.mockReturnValue(router);
    useAuthFailureRedirectMock.mockReturnValue(false);
    useMasteredCollectionsQueryMock.mockReturnValue(
      createCollectionsQuery([travelCollection]),
    );
    useInfiniteVocabularyItemsQueryMock.mockReturnValue(
      createMasteredWordsQuery([hello, goodbye]),
    );
    useAddMasteredCollectionWordsMock.mockReturnValue(
      createMutation(addCollectionWords, resetAddCollectionWords),
    );
    useCreateMasteredCollectionMock.mockReturnValue(
      createMutation(createCollection, resetCreateCollection),
    );
    useScheduleUserWordMock.mockReturnValue(
      createMutation(scheduleUserWord),
    );
    useDeleteVocabularyItemPermanentlyMock.mockReturnValue(
      createMutation(
        deleteVocabularyItemPermanently,
        resetDeleteVocabularyItem,
      ),
    );
  });

  it("opens collection and vocabulary detail routes", () => {
    render(<MasteredWordsScreen />);

    fireEvent.press(screen.getByText("Travel Collection"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/decks/collections/[collectionId]",
      params: { collectionId: "collection-1" },
    });

    fireEvent.press(screen.getByText("hello"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/vocabulary/[id]",
      params: { id: "vocabulary-item-1" },
    });
  });

  it("adds selected mastered words to an existing collection", async () => {
    render(<MasteredWordsScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Select mastered words" }),
    );
    fireEvent.press(screen.getByText("hello"));
    fireEvent.press(screen.getByText("goodbye"));

    expect(screen.getByLabelText("hello selected")).toBeTruthy();
    expect(screen.getByLabelText("goodbye selected")).toBeTruthy();
    expect(screen.getByText("2 selected")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("2 words are selected.")).toBeTruthy();
    fireEvent.press(screen.getByText("Travel Collection"));

    await waitFor(() => {
      expect(addCollectionWords).toHaveBeenCalledWith({
        collectionId: "collection-1",
        input: {
          userWordIds: ["user-word-1", "user-word-2"],
        },
      });
      expect(
        screen.getByText("2 words added to Travel Collection."),
      ).toBeTruthy();
    });

    expect(screen.queryByText("2 selected")).toBeNull();
  });

  it("creates a standalone collection with normalized values", async () => {
    const personalCollection = createCollectionSummary({
      id: "collection-2",
      title: "Personal List",
      wordCount: 0,
    });
    createCollection.mockResolvedValueOnce(personalCollection);
    render(<MasteredWordsScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Create collection" }),
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Collection name"),
      "  Personal List  ",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Description (optional)"),
      "  Words for work  ",
    );
    fireEvent.press(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createCollection).toHaveBeenCalledWith({
        title: "Personal List",
        description: "Words for work",
      });
      expect(screen.getByText("Personal List created.")).toBeTruthy();
    });

    expect(addCollectionWords).not.toHaveBeenCalled();
  });

  it("schedules a mastered word in the selected review box", async () => {
    render(<MasteredWordsScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Open actions for hello" }),
    );
    fireEvent.press(screen.getByText("Review later"));
    fireEvent.press(screen.getByText("6 hours"));

    await waitFor(() => {
      expect(scheduleUserWord).toHaveBeenCalledWith({
        userWordId: "user-word-1",
        interval: "SIX_HOURS",
      });
      expect(screen.getByText("hello added to 6 hours.")).toBeTruthy();
    });
  });

  it("permanently deletes a mastered word only after confirmation", async () => {
    render(<MasteredWordsScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Open actions for hello" }),
    );
    fireEvent.press(screen.getByText("Delete permanently"));

    expect(screen.getByText("Delete word permanently?")).toBeTruthy();
    expect(deleteVocabularyItemPermanently).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByRole("button", { name: "Delete permanently" }),
    );

    await waitFor(() => {
      expect(deleteVocabularyItemPermanently).toHaveBeenCalledWith(
        "vocabulary-item-1",
      );
      expect(screen.getByText("hello permanently deleted.")).toBeTruthy();
    });
  });

  it("preserves selected words when assignment fails after creation", async () => {
    const recoveryCollection = createCollectionSummary({
      id: "collection-2",
      title: "Recovery List",
      wordCount: 0,
    });
    createCollection.mockResolvedValueOnce(recoveryCollection);
    addCollectionWords
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(travelCollection);
    render(<MasteredWordsScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Select mastered words" }),
    );
    fireEvent.press(screen.getByText("hello"));
    fireEvent.press(screen.getByRole("button", { name: "Add" }));
    fireEvent.press(screen.getByText("Create new collection"));
    fireEvent.changeText(
      screen.getByPlaceholderText("Collection name"),
      "Recovery List",
    );
    fireEvent.press(screen.getByRole("button", { name: "Create" }));

    expect(
      await screen.findByText(
        "Recovery List was created, but the words were not added.",
      ),
    ).toBeTruthy();
    expect(addCollectionWords).toHaveBeenNthCalledWith(1, {
      collectionId: "collection-2",
      input: { userWordIds: ["user-word-1"] },
    });

    fireEvent.press(screen.getByText("Travel Collection"));

    await waitFor(() => {
      expect(addCollectionWords).toHaveBeenNthCalledWith(2, {
        collectionId: "collection-1",
        input: { userWordIds: ["user-word-1"] },
      });
      expect(
        screen.getByText("1 word added to Travel Collection."),
      ).toBeTruthy();
    });
  });
});

function createMutation(mutateAsync: jest.Mock, reset = jest.fn()) {
  return {
    error: null,
    isPending: false,
    mutateAsync,
    reset,
  };
}

function createCollectionsQuery(items: MasteredCollectionSummary[]) {
  return {
    data: { items },
    error: null,
    isError: false,
    isLoading: false,
    refetch: refetchCollections,
  };
}

function createMasteredWordsQuery(items: VocabularyItem[]) {
  return {
    data: {
      pages: [{ items, nextCursor: null }],
    },
    error: null,
    fetchNextPage,
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isLoading: false,
    refetch: refetchMasteredWords,
  };
}

function createCollectionSummary(
  overrides: Partial<MasteredCollectionSummary> = {},
): MasteredCollectionSummary {
  return {
    id: "collection-1",
    title: "Travel Collection",
    description: null,
    wordCount: 0,
    masteredWordCount: 0,
    createdAt: "2026-08-03T08:00:00.000Z",
    updatedAt: "2026-08-03T08:00:00.000Z",
    ...overrides,
  };
}

function createVocabularyItem({
  id,
  sourceText,
  targetText,
  userWordId,
}: {
  id: string;
  sourceText: string;
  targetText: string;
  userWordId: string;
}): VocabularyItem {
  return {
    id,
    languagePairId: "language-pair-1",
    sourceText,
    targetText,
    wordType: "OTHER",
    cefrLevel: null,
    definition: null,
    note: null,
    visibility: "PRIVATE",
    isActive: true,
    examples: [],
    userWord: {
      id: userWordId,
      vocabularyItemId: id,
      status: "MASTERED",
      isFavorite: false,
      masteryStep: 5,
      reviewCount: 5,
      correctCount: 5,
      wrongCount: 0,
      lastReviewedAt: "2026-08-03T08:00:00.000Z",
      nextReviewAt: null,
      createdAt: "2026-08-03T08:00:00.000Z",
    },
    createdAt: "2026-08-03T08:00:00.000Z",
  };
}
