/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import {
  useDueReviewsQuery,
  type DueReviewItem,
} from "@/entities/review";
import { useAuthFailureRedirect } from "@/features/auth";
import { useAnswerReview } from "@/features/review";
import { ApiError } from "@/shared/api/http-error";
import { ReviewScreen } from "../ReviewScreen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/entities/review", () => ({
  useDueReviewsQuery: jest.fn(),
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/review", () => ({
  useAnswerReview: jest.fn(),
}));

const useRouterMock = useRouter as jest.Mock;
const useDueReviewsQueryMock = useDueReviewsQuery as jest.Mock;
const useAuthFailureRedirectMock = useAuthFailureRedirect as jest.Mock;
const useAnswerReviewMock = useAnswerReview as jest.Mock;

const router = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
const answerReview = jest.fn();
const refetchDueReviews = jest.fn();

const dueReviewItem = createDueReviewItem();

describe("ReviewScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    answerReview.mockReset().mockResolvedValue(undefined);
    refetchDueReviews.mockReset().mockResolvedValue(undefined);

    useRouterMock.mockReturnValue(router);
    useAuthFailureRedirectMock.mockReturnValue(false);
    useDueReviewsQueryMock.mockReturnValue(
      createDueReviewsQuery([dueReviewItem]),
    );
    useAnswerReviewMock.mockReturnValue(createMutation(answerReview));
  });

  it("shows the loading state while due reviews are pending", () => {
    useDueReviewsQueryMock.mockReturnValue(
      createDueReviewsQuery([], { isLoading: true }),
    );

    render(<ReviewScreen />);

    expect(useDueReviewsQueryMock).toHaveBeenCalledWith({ limit: 20 });
    expect(screen.getByText("Loading due reviews...")).toBeTruthy();
    expect(screen.queryByText("No reviews due right now.")).toBeNull();
  });

  it("retries a failed due-review request", () => {
    useDueReviewsQueryMock.mockReturnValue(
      createDueReviewsQuery([], {
        error: new Error("Network unavailable"),
        isError: true,
      }),
    );

    render(<ReviewScreen />);

    expect(screen.getByText("Could not load due reviews.")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(refetchDueReviews).toHaveBeenCalledTimes(1);
  });

  it("leaves unauthorized query errors to the auth redirect flow", () => {
    useDueReviewsQueryMock.mockReturnValue(
      createDueReviewsQuery([], {
        error: new Error("Unauthorized"),
        isError: true,
      }),
    );
    useAuthFailureRedirectMock.mockReturnValue(true);

    render(<ReviewScreen />);

    expect(screen.queryByText("Could not load due reviews.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("offers practice and vocabulary destinations when nothing is due", () => {
    useDueReviewsQueryMock.mockReturnValue(createDueReviewsQuery([]));

    render(<ReviewScreen />);

    expect(screen.getByText("No reviews due right now.")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", { name: "Practice flashcards" }),
    );
    fireEvent.press(
      screen.getByRole("button", { name: "View vocabulary" }),
    );

    expect(router.push).toHaveBeenNthCalledWith(1, "/practice");
    expect(router.push).toHaveBeenNthCalledWith(2, "/vocabulary");
  });

  it.each([
    ["Again", "AGAIN", false],
    ["Hard", "HARD", true],
    ["Good", "GOOD", true],
    ["Easy", "EASY", true],
  ] as const)(
    "maps the %s rating to the expected review answer",
    async (buttonLabel, rating, isCorrect) => {
      render(<ReviewScreen />);

      expect(screen.getByText("hello")).toBeTruthy();
      expect(screen.queryByText("salam")).toBeNull();

      fireEvent.press(screen.getByRole("button", { name: "Show answer" }));
      expect(screen.getByText("salam")).toBeTruthy();
      fireEvent.press(
        screen.getByRole("button", {
          name: new RegExp(`^${buttonLabel}`),
        }),
      );

      await waitFor(() => {
        expect(answerReview).toHaveBeenCalledWith({
          userWordId: "user-word-1",
          rating,
          isCorrect,
        });
      });
    },
  );

  it("moves to the next due word with its answer concealed", async () => {
    const secondItem = createDueReviewItem({
      userWordId: "user-word-2",
      vocabularyItemId: "vocabulary-item-2",
      sourceText: "book",
      targetText: "kitab",
    });
    useDueReviewsQueryMock.mockReturnValue(
      createDueReviewsQuery([dueReviewItem, secondItem]),
    );
    render(<ReviewScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Show answer" }));
    fireEvent.press(screen.getByText("Good"));

    await waitFor(() => {
      expect(screen.getByText("book")).toBeTruthy();
      expect(screen.getByText("1 due in this session")).toBeTruthy();
    });
    expect(screen.queryByText("hello")).toBeNull();
    expect(screen.queryByText("kitab")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Show answer" }),
    ).toBeTruthy();
  });

  it("keeps the current card open when saving an answer fails", async () => {
    answerReview.mockRejectedValueOnce(
      new ApiError({ status: 409, message: "Review answer was rejected." }),
    );
    render(<ReviewScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Show answer" }));
    fireEvent.press(screen.getByText("Good"));

    expect(
      await screen.findByText("Review answer was rejected."),
    ).toBeTruthy();
    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("salam")).toBeTruthy();
    expect(screen.queryByText("Reviews complete")).toBeNull();
  });

  it("resets the completed session and requests fresh due reviews", async () => {
    render(<ReviewScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Show answer" }));
    fireEvent.press(screen.getByText("Good"));

    expect(await screen.findByText("Reviews complete")).toBeTruthy();
    expect(
      screen.getByText(
        "You reviewed 1 words: 1 correct and 0 marked again.",
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Check again" }));

    expect(refetchDueReviews).toHaveBeenCalledTimes(1);
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

function createDueReviewsQuery(
  items: DueReviewItem[],
  overrides: Partial<{
    error: Error | null;
    isError: boolean;
    isLoading: boolean;
  }> = {},
) {
  return {
    data: { items },
    error: null,
    isError: false,
    isLoading: false,
    refetch: refetchDueReviews,
    ...overrides,
  };
}

function createDueReviewItem(
  overrides: Partial<DueReviewItem> = {},
): DueReviewItem {
  return {
    userWordId: "user-word-1",
    vocabularyItemId: "vocabulary-item-1",
    sourceText: "hello",
    targetText: "salam",
    wordType: "NOUN",
    cefrLevel: "A1",
    definition: "A greeting",
    note: null,
    examples: [
      {
        id: "example-1",
        sourceSentence: "Hello, how are you?",
        targetSentence: "Salam, necesen?",
      },
    ],
    status: "REVIEWING",
    reviewCount: 2,
    correctCount: 1,
    wrongCount: 1,
    lastReviewedAt: "2026-08-02T08:00:00.000Z",
    nextReviewAt: "2026-08-03T08:00:00.000Z",
    ...overrides,
  };
}
