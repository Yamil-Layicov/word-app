/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import {
  useInfiniteVocabularyItemsQuery,
  type VocabularyItem,
} from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import {
  useScheduleUserWord,
  useScheduledReviewsQuery,
  type ScheduledReviewItem,
} from "@/features/review-boxes";
import {
  useDeleteVocabularyItemPermanently,
  useUpdateVocabularyItem,
} from "@/features/vocabulary";
import { VocabularyListScreen } from "../VocabularyListScreen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/entities/vocabulary-item", () => ({
  useInfiniteVocabularyItemsQuery: jest.fn(),
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/review-boxes", () => ({
  ...jest.requireActual("@/features/review-boxes/model"),
  useScheduleUserWord: jest.fn(),
  useScheduledReviewsQuery: jest.fn(),
}));

jest.mock("@/features/vocabulary", () => ({
  useDeleteVocabularyItemPermanently: jest.fn(),
  useUpdateVocabularyItem: jest.fn(),
}));

const useRouterMock = useRouter as jest.Mock;
const useInfiniteVocabularyItemsQueryMock =
  useInfiniteVocabularyItemsQuery as jest.Mock;
const useAuthFailureRedirectMock = useAuthFailureRedirect as jest.Mock;
const useScheduleUserWordMock = useScheduleUserWord as jest.Mock;
const useScheduledReviewsQueryMock = useScheduledReviewsQuery as jest.Mock;
const useDeleteVocabularyItemPermanentlyMock =
  useDeleteVocabularyItemPermanently as jest.Mock;
const useUpdateVocabularyItemMock = useUpdateVocabularyItem as jest.Mock;

const router = {
  back: jest.fn(),
  push: jest.fn(),
};
const fetchNextPage = jest.fn();
const refetchVocabulary = jest.fn();
const scheduleUserWord = jest.fn();
const deleteVocabularyItemPermanently = jest.fn();
const resetDeleteVocabularyItem = jest.fn();
const updateVocabularyItem = jest.fn();

const vocabularyItem = createVocabularyItem();

describe("VocabularyListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchNextPage.mockReset().mockResolvedValue(undefined);
    refetchVocabulary.mockReset().mockResolvedValue(undefined);
    scheduleUserWord.mockReset().mockResolvedValue(undefined);
    deleteVocabularyItemPermanently.mockReset().mockResolvedValue(undefined);
    updateVocabularyItem.mockReset().mockResolvedValue(undefined);

    useRouterMock.mockReturnValue(router);
    useAuthFailureRedirectMock.mockReturnValue(false);
    useInfiniteVocabularyItemsQueryMock.mockReturnValue(
      createVocabularyQuery([vocabularyItem]),
    );
    useScheduleUserWordMock.mockReturnValue(
      createMutation(scheduleUserWord),
    );
    useScheduledReviewsQueryMock.mockReturnValue({
      data: { items: [] },
      error: null,
    });
    useUpdateVocabularyItemMock.mockReturnValue(
      createMutation(updateVocabularyItem),
    );
    useDeleteVocabularyItemPermanentlyMock.mockReturnValue(
      createMutation(
        deleteVocabularyItemPermanently,
        resetDeleteVocabularyItem,
      ),
    );
  });

  it("shows the loading state while the first page is pending", () => {
    useInfiniteVocabularyItemsQueryMock.mockReturnValue(
      createVocabularyQuery([], { isLoading: true }),
    );

    render(<VocabularyListScreen />);

    expect(screen.getByText("Loading words...")).toBeTruthy();
    expect(screen.queryByText("No words added yet.")).toBeNull();
  });

  it("retries a failed vocabulary query", () => {
    useInfiniteVocabularyItemsQueryMock.mockReturnValue(
      createVocabularyQuery([], {
        error: new Error("Network unavailable"),
        isError: true,
      }),
    );

    render(<VocabularyListScreen />);

    expect(screen.getByText("Could not load words.")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(refetchVocabulary).toHaveBeenCalledTimes(1);
  });

  it("leaves unauthorized query errors to the auth redirect flow", () => {
    useInfiniteVocabularyItemsQueryMock.mockReturnValue(
      createVocabularyQuery([], {
        error: new Error("Unauthorized"),
        isError: true,
      }),
    );
    useAuthFailureRedirectMock.mockReturnValue(true);

    render(<VocabularyListScreen />);

    expect(screen.queryByText("Could not load words.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("shows an empty state after the first page loads without words", () => {
    useInfiniteVocabularyItemsQueryMock.mockReturnValue(
      createVocabularyQuery([]),
    );

    render(<VocabularyListScreen />);

    expect(screen.getByText("No words added yet.")).toBeTruthy();
  });

  it("renders scheduled word state and opens the word detail", () => {
    useScheduledReviewsQueryMock.mockReturnValue({
      data: { items: [createScheduledReviewItem()] },
      error: null,
    });

    render(<VocabularyListScreen />);

    expect(useInfiniteVocabularyItemsQueryMock).toHaveBeenCalledWith({
      limit: 20,
    });
    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("salam")).toBeTruthy();
    expect(screen.getByText("In 1 hour box")).toBeTruthy();
    expect(screen.getByLabelText("2 reviews completed")).toBeTruthy();

    fireEvent.press(screen.getByText("hello"));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/vocabulary/[id]",
      params: { id: "vocabulary-item-1" },
    });
  });

  it("loads the next vocabulary page on demand", () => {
    useInfiniteVocabularyItemsQueryMock.mockReturnValue(
      createVocabularyQuery([vocabularyItem], { hasNextPage: true }),
    );

    render(<VocabularyListScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Load more" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("schedules a word in the selected review box", async () => {
    render(<VocabularyListScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Open actions for hello" }),
    );
    fireEvent.press(screen.getByText("Review in 6 hours"));

    await waitFor(() => {
      expect(scheduleUserWord).toHaveBeenCalledWith({
        userWordId: "user-word-1",
        interval: "SIX_HOURS",
      });
      expect(screen.getByText("hello added to 6 hours.")).toBeTruthy();
    });
  });

  it("marks a word as mastered with one update command", async () => {
    render(<VocabularyListScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Open actions for hello" }),
    );
    fireEvent.press(screen.getByText("I know this word"));

    await waitFor(() => {
      expect(updateVocabularyItem).toHaveBeenCalledWith({
        id: "vocabulary-item-1",
        data: { status: "MASTERED" },
      });
      expect(screen.getByText("hello marked as mastered.")).toBeTruthy();
    });
  });

  it("requires confirmation before permanently deleting a word", async () => {
    render(<VocabularyListScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Open actions for hello" }),
    );
    fireEvent.press(screen.getByText("Delete permanently"));

    expect(screen.getByText("Delete word permanently?")).toBeTruthy();
    expect(
      screen.getByText(
        '"hello" will be removed from My Vocabulary, every deck and collection, review boxes, learning progress and history.',
      ),
    ).toBeTruthy();
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
});

function createMutation(mutateAsync: jest.Mock, reset = jest.fn()) {
  return {
    error: null,
    isPending: false,
    mutateAsync,
    reset,
  };
}

function createVocabularyQuery(
  items: VocabularyItem[],
  overrides: Partial<{
    error: Error | null;
    hasNextPage: boolean;
    isError: boolean;
    isFetchingNextPage: boolean;
    isLoading: boolean;
  }> = {},
) {
  return {
    data: {
      pages: [
        {
          items,
          nextCursor: overrides.hasNextPage ? "next-page" : null,
        },
      ],
      pageParams: [undefined],
    },
    error: null,
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isLoading: false,
    fetchNextPage,
    refetch: refetchVocabulary,
    ...overrides,
  };
}

function createVocabularyItem(): VocabularyItem {
  return {
    id: "vocabulary-item-1",
    languagePairId: "language-pair-1",
    sourceText: "hello",
    targetText: "salam",
    wordType: "NOUN",
    cefrLevel: "A1",
    definition: "A greeting",
    note: null,
    visibility: "PRIVATE",
    isActive: true,
    examples: [],
    userWord: {
      id: "user-word-1",
      vocabularyItemId: "vocabulary-item-1",
      status: "LEARNING",
      isFavorite: false,
      masteryStep: 2,
      reviewCount: 2,
      correctCount: 2,
      wrongCount: 0,
      lastReviewedAt: "2026-08-02T08:00:00.000Z",
      nextReviewAt: null,
      createdAt: "2026-08-01T08:00:00.000Z",
    },
    createdAt: "2026-08-01T08:00:00.000Z",
  };
}

function createScheduledReviewItem(): ScheduledReviewItem {
  return {
    scheduleId: "schedule-1",
    interval: "ONE_HOUR",
    state: "STARTED",
    startedAt: "2026-08-03T08:00:00.000Z",
    dueAt: "2026-08-03T09:00:00.000Z",
    userWordId: "user-word-1",
    vocabularyItemId: "vocabulary-item-1",
    sourceText: "hello",
    targetText: "salam",
    wordType: "NOUN",
    cefrLevel: "A1",
    definition: "A greeting",
    note: null,
    examples: [],
    status: "LEARNING",
    masteryStep: 2,
    reviewCount: 2,
    correctCount: 2,
    wrongCount: 0,
    lastReviewedAt: "2026-08-02T08:00:00.000Z",
    nextReviewAt: null,
  };
}
