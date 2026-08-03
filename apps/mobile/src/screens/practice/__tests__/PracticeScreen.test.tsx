/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import {
  usePracticeItemsQuery,
  type PracticeItem,
} from "@/entities/practice";
import { useAuthFailureRedirect } from "@/features/auth";
import { useAnswerPractice } from "@/features/practice";
import { ApiError } from "@/shared/api/http-error";
import { PracticeScreen } from "../PracticeScreen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/entities/practice", () => ({
  usePracticeItemsQuery: jest.fn(),
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/practice", () => ({
  useAnswerPractice: jest.fn(),
}));

const useRouterMock = useRouter as jest.Mock;
const usePracticeItemsQueryMock = usePracticeItemsQuery as jest.Mock;
const useAuthFailureRedirectMock = useAuthFailureRedirect as jest.Mock;
const useAnswerPracticeMock = useAnswerPractice as jest.Mock;

const router = {
  back: jest.fn(),
};
const answerPractice = jest.fn();
const refetchPracticeItems = jest.fn();

const practiceItem = createPracticeItem();

describe("PracticeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    answerPractice.mockReset().mockResolvedValue(undefined);
    refetchPracticeItems.mockReset().mockResolvedValue(undefined);

    useRouterMock.mockReturnValue(router);
    useAuthFailureRedirectMock.mockReturnValue(false);
    usePracticeItemsQueryMock.mockReturnValue(
      createPracticeItemsQuery([practiceItem]),
    );
    useAnswerPracticeMock.mockReturnValue(createMutation(answerPractice));
  });

  it("shows the loading state while practice words are pending", () => {
    usePracticeItemsQueryMock.mockReturnValue(
      createPracticeItemsQuery([], { isLoading: true }),
    );

    render(<PracticeScreen />);

    expect(usePracticeItemsQueryMock).toHaveBeenCalledWith({ limit: 20 });
    expect(screen.getByText("Loading practice words...")).toBeTruthy();
    expect(
      screen.queryByText(
        "No practice words yet. Add words to your vocabulary first.",
      ),
    ).toBeNull();
  });

  it("retries a failed practice request", () => {
    usePracticeItemsQueryMock.mockReturnValue(
      createPracticeItemsQuery([], {
        error: new Error("Network unavailable"),
        isError: true,
      }),
    );

    render(<PracticeScreen />);

    expect(screen.getByText("Could not load practice words.")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(refetchPracticeItems).toHaveBeenCalledTimes(1);
  });

  it("leaves unauthorized query errors to the auth redirect flow", () => {
    usePracticeItemsQueryMock.mockReturnValue(
      createPracticeItemsQuery([], {
        error: new Error("Unauthorized"),
        isError: true,
      }),
    );
    useAuthFailureRedirectMock.mockReturnValue(true);

    render(<PracticeScreen />);

    expect(screen.queryByText("Could not load practice words.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("shows an empty state when no vocabulary is available", () => {
    usePracticeItemsQueryMock.mockReturnValue(createPracticeItemsQuery([]));

    render(<PracticeScreen />);

    expect(
      screen.getByText(
        "No practice words yet. Add words to your vocabulary first.",
      ),
    ).toBeTruthy();
  });

  it("reveals the flashcard details and records a correct answer", async () => {
    render(<PracticeScreen />);

    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.queryByText("salam")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Show answer" }));

    expect(screen.getByText("salam")).toBeTruthy();
    expect(screen.getByText("A greeting")).toBeTruthy();
    expect(screen.getByText("Hello, how are you?")).toBeTruthy();
    expect(screen.getByText("Salam, necesen?")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "I knew it" }));

    await waitFor(() => {
      expect(answerPractice).toHaveBeenCalledWith({
        userWordId: "user-word-1",
        isCorrect: true,
        practiceMode: "FLASHCARD",
      });
      expect(screen.getByText("Practice complete")).toBeTruthy();
    });
    expect(
      screen.getByText(
        "You answered 1 and skipped 0 flashcards: 1 correct and 0 missed.",
      ),
    ).toBeTruthy();
  });

  it("records a missed flashcard without changing practice mode", async () => {
    render(<PracticeScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Show answer" }));
    fireEvent.press(screen.getByRole("button", { name: "I missed it" }));

    await waitFor(() => {
      expect(answerPractice).toHaveBeenCalledWith({
        userWordId: "user-word-1",
        isCorrect: false,
        practiceMode: "FLASHCARD",
      });
      expect(
        screen.getByText(
          "You answered 1 and skipped 0 flashcards: 0 correct and 1 missed.",
        ),
      ).toBeTruthy();
    });
  });

  it("skips a flashcard locally without creating a practice answer", () => {
    render(<PracticeScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Skip" }));

    expect(answerPractice).not.toHaveBeenCalled();
    expect(screen.getByText("Practice complete")).toBeTruthy();
    expect(
      screen.getByText(
        "You answered 0 and skipped 1 flashcards: 0 correct and 0 missed.",
      ),
    ).toBeTruthy();
  });

  it("moves to the next card with its answer concealed", async () => {
    const secondItem = createPracticeItem({
      userWordId: "user-word-2",
      vocabularyItemId: "vocabulary-item-2",
      sourceText: "book",
      targetText: "kitab",
    });
    usePracticeItemsQueryMock.mockReturnValue(
      createPracticeItemsQuery([practiceItem, secondItem]),
    );
    render(<PracticeScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Show answer" }));
    fireEvent.press(screen.getByRole("button", { name: "I knew it" }));

    await waitFor(() => {
      expect(screen.getByText("Card 2 of 2")).toBeTruthy();
      expect(screen.getByText("book")).toBeTruthy();
    });
    expect(screen.queryByText("hello")).toBeNull();
    expect(screen.queryByText("kitab")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Show answer" }),
    ).toBeTruthy();
  });

  it("keeps the current answer visible when saving fails", async () => {
    answerPractice.mockRejectedValueOnce(
      new ApiError({ status: 409, message: "Practice answer was rejected." }),
    );
    render(<PracticeScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Show answer" }));
    fireEvent.press(screen.getByRole("button", { name: "I knew it" }));

    expect(
      await screen.findByText("Practice answer was rejected."),
    ).toBeTruthy();
    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("salam")).toBeTruthy();
    expect(screen.queryByText("Practice complete")).toBeNull();
  });

  it("resets a completed session and requests fresh practice words", async () => {
    render(<PracticeScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Show answer" }));
    fireEvent.press(screen.getByRole("button", { name: "I knew it" }));
    expect(await screen.findByText("Practice complete")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Practice again" }));

    expect(refetchPracticeItems).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Card 1 of 1")).toBeTruthy();
    expect(screen.getByText("hello")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Show answer" }),
    ).toBeTruthy();
  });
});

function createMutation(mutateAsync: jest.Mock) {
  return {
    error: null,
    isPending: false,
    mutateAsync,
  };
}

function createPracticeItemsQuery(
  items: PracticeItem[],
  overrides: Partial<{
    error: Error | null;
    isError: boolean;
    isLoading: boolean;
  }> = {},
) {
  return {
    data: { items, nextCursor: null },
    error: null,
    isError: false,
    isLoading: false,
    refetch: refetchPracticeItems,
    ...overrides,
  };
}

function createPracticeItem(
  overrides: Partial<PracticeItem> = {},
): PracticeItem {
  return {
    userWordId: "user-word-1",
    vocabularyItemId: "vocabulary-item-1",
    sourceText: "hello",
    targetText: "salam",
    wordType: "NOUN",
    cefrLevel: "A1",
    definition: "A greeting",
    note: null,
    visibility: "PRIVATE",
    examples: [
      {
        id: "example-1",
        sourceSentence: "Hello, how are you?",
        targetSentence: "Salam, necesen?",
      },
    ],
    status: "LEARNING",
    isFavorite: false,
    reviewCount: 2,
    correctCount: 1,
    wrongCount: 1,
    lastReviewedAt: "2026-08-02T08:00:00.000Z",
    nextReviewAt: "2026-08-04T08:00:00.000Z",
    ...overrides,
  };
}
