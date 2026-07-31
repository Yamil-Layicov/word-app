/// <reference types="jest" />

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuthFailureRedirect } from "@/features/auth";
import {
  useAnswerScheduledReview,
  useScheduledReviewBoxDetailQuery,
  type ScheduledReviewItem,
} from "@/features/review-boxes";
import type {
  MatchingBoardItem,
  MatchingBoardResult,
} from "@/screens/practice/MatchingPracticeBoard";
import { ReviewSessionScreen } from "../ReviewSessionScreen";

type MatchingBoardProps = {
  items: MatchingBoardItem[];
  onComplete: () => void;
  onProgressChange?: (completed: number) => void;
  onResolve: (result: MatchingBoardResult) => Promise<void>;
};

let mockMatchingBoardProps: MatchingBoardProps | null = null;

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/practice", () => ({
  ...jest.requireActual("@/features/practice/session"),
}));

jest.mock("@/features/review-boxes", () => ({
  ...jest.requireActual("@/features/review-boxes/model"),
  useAnswerScheduledReview: jest.fn(),
  useScheduledReviewBoxDetailQuery: jest.fn(),
}));

jest.mock("@/screens/practice/MatchingPracticeBoard", () => ({
  MatchingPracticeBoard: (props: MatchingBoardProps) => {
    mockMatchingBoardProps = props;
    return null;
  },
}));

const useLocalSearchParamsMock = useLocalSearchParams as jest.Mock;
const useRouterMock = useRouter as jest.Mock;
const useAuthFailureRedirectMock = useAuthFailureRedirect as jest.Mock;
const useAnswerScheduledReviewMock =
  useAnswerScheduledReview as jest.Mock;
const useScheduledReviewBoxDetailQueryMock =
  useScheduledReviewBoxDetailQuery as jest.Mock;

const router = {
  back: jest.fn(),
  replace: jest.fn(),
};
const answerScheduledReview = jest.fn();
const refetchBoxDetail = jest.fn();
const dueItem = createScheduledReviewItem();

describe("ReviewSessionScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-30T10:00:00.000Z"));
    jest.clearAllMocks();
    mockMatchingBoardProps = null;
    answerScheduledReview.mockReset();
    answerScheduledReview.mockResolvedValue(undefined);
    useLocalSearchParamsMock.mockReturnValue({
      boxId: "ONE_HOUR",
      mode: "FLASHCARD",
    });
    useRouterMock.mockReturnValue(router);
    useAuthFailureRedirectMock.mockReturnValue(false);
    useScheduledReviewBoxDetailQueryMock.mockReturnValue(
      createBoxDetailQuery([dueItem]),
    );
    useAnswerScheduledReviewMock.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: answerScheduledReview,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("rejects an invalid session route and returns safely", () => {
    useLocalSearchParamsMock.mockReturnValue({
      boxId: "INVALID_INTERVAL",
      mode: "INVALID_MODE",
    });
    render(<ReviewSessionScreen />);

    expect(screen.getByText("This review session is not valid.")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Go back" }));

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(answerScheduledReview).not.toHaveBeenCalled();
  });

  it("reschedules a correct answer and completes the session", async () => {
    render(<ReviewSessionScreen />);

    expect(await screen.findByText("hello")).toBeTruthy();
    expect(screen.getByText("1 hour review")).toBeTruthy();
    expect(screen.getByText("Flashcards")).toBeTruthy();
    expect(screen.getByText("1/1")).toBeTruthy();
    expect(screen.queryByText("salam")).toBeNull();

    fireEvent.press(screen.getByText("Show answer"));
    fireEvent.press(screen.getByText("Knew it"));

    expect(screen.getByText("Correct")).toBeTruthy();
    expect(screen.getByText("Choose the next box")).toBeTruthy();

    fireEvent.press(screen.getByText("6 hours"));

    await waitFor(() => {
      expect(answerScheduledReview).toHaveBeenCalledWith({
        practiceMode: "FLASHCARD",
        scheduleId: "schedule-1",
        result: "CORRECT",
        nextInterval: "SIX_HOURS",
      });
      expect(screen.getByText("Review complete")).toBeTruthy();
    });

    fireEvent.press(screen.getByRole("button", { name: "Done" }));

    expect(router.replace).toHaveBeenCalledWith({
      pathname: "/decks/[boxId]",
      params: {
        boxId: "ONE_HOUR",
      },
    });
  });

  it("marks a word as known without creating another schedule", async () => {
    render(<ReviewSessionScreen />);

    expect(await screen.findByText("hello")).toBeTruthy();

    fireEvent.press(screen.getByText("Show answer"));
    fireEvent.press(screen.getByText("Didn't know"));
    fireEvent.press(screen.getByText("I know this"));

    await waitFor(() => {
      expect(answerScheduledReview).toHaveBeenCalledWith({
        practiceMode: "FLASHCARD",
        scheduleId: "schedule-1",
        result: "KNOWN",
      });
      expect(screen.getByText("Review complete")).toBeTruthy();
    });
  });

  it("saves matching results with a separate destination for each word", async () => {
    const secondDueItem = createScheduledReviewItem({
      scheduleId: "schedule-2",
      userWordId: "user-word-2",
      vocabularyItemId: "vocabulary-item-2",
      sourceText: "world",
      targetText: "dunya",
    });
    useLocalSearchParamsMock.mockReturnValue({
      boxId: "ONE_HOUR",
      mode: "MATCHING",
    });
    useScheduledReviewBoxDetailQueryMock.mockReturnValue(
      createBoxDetailQuery([dueItem, secondDueItem]),
    );
    render(<ReviewSessionScreen />);

    await waitFor(() => {
      expect(mockMatchingBoardProps).not.toBeNull();
    });

    await act(async () => {
      await mockMatchingBoardProps?.onResolve({
        itemId: "schedule-1",
        isCorrect: false,
      });
      await mockMatchingBoardProps?.onResolve({
        itemId: "schedule-2",
        isCorrect: true,
      });
      mockMatchingBoardProps?.onProgressChange?.(2);
      mockMatchingBoardProps?.onComplete();
    });

    expect(screen.getByText("Keep reviewing")).toBeTruthy();
    expect(screen.getByText("hello")).toBeTruthy();

    fireEvent.press(screen.getByText("1 day"));

    await waitFor(() => {
      expect(answerScheduledReview).toHaveBeenNthCalledWith(1, {
        practiceMode: "MATCHING",
        scheduleId: "schedule-1",
        result: "INCORRECT",
        nextInterval: "ONE_DAY",
      });
      expect(screen.getByText("Correct")).toBeTruthy();
      expect(screen.getByText("world")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("I know this"));

    await waitFor(() => {
      expect(answerScheduledReview).toHaveBeenNthCalledWith(2, {
        practiceMode: "MATCHING",
        scheduleId: "schedule-2",
        result: "KNOWN",
      });
      expect(screen.getByText("Review complete")).toBeTruthy();
    });
  });

  it("keeps the current word available when saving an answer fails", async () => {
    answerScheduledReview.mockRejectedValueOnce(new Error("Network failure"));
    render(<ReviewSessionScreen />);

    expect(await screen.findByText("hello")).toBeTruthy();

    fireEvent.press(screen.getByText("Show answer"));
    fireEvent.press(screen.getByText("Knew it"));
    fireEvent.press(screen.getByText("6 hours"));

    expect(
      await screen.findByText("Could not save this answer."),
    ).toBeTruthy();
    expect(screen.getByText("Correct")).toBeTruthy();
    expect(screen.queryByText("Review complete")).toBeNull();

    fireEvent.press(screen.getByText("1 day"));

    await waitFor(() => {
      expect(answerScheduledReview).toHaveBeenCalledTimes(2);
      expect(answerScheduledReview).toHaveBeenLastCalledWith({
        practiceMode: "FLASHCARD",
        scheduleId: "schedule-1",
        result: "CORRECT",
        nextInterval: "ONE_DAY",
      });
      expect(screen.getByText("Review complete")).toBeTruthy();
    });
  });
});

function createBoxDetailQuery(items: ScheduledReviewItem[]) {
  return {
    data: {
      interval: "ONE_HOUR" as const,
      label: "1 hour" as const,
      totalWords: items.length,
      queuedWords: 0,
      startedWords: 0,
      dueWords: items.length,
      nextDueAt: null,
      items,
    },
    error: null,
    isError: false,
    isLoading: false,
    refetch: refetchBoxDetail,
  };
}

function createScheduledReviewItem(
  overrides: Partial<ScheduledReviewItem> = {},
): ScheduledReviewItem {
  return {
    scheduleId: "schedule-1",
    interval: "ONE_HOUR",
    state: "DUE",
    startedAt: "2026-07-30T09:00:00.000Z",
    dueAt: "2026-07-30T10:00:00.000Z",
    userWordId: "user-word-1",
    vocabularyItemId: "vocabulary-item-1",
    sourceText: "hello",
    targetText: "salam",
    wordType: "NOUN",
    cefrLevel: "A1",
    definition: null,
    note: null,
    examples: [],
    status: "REVIEWING",
    masteryStep: 2,
    reviewCount: 2,
    correctCount: 1,
    wrongCount: 1,
    lastReviewedAt: "2026-07-29T10:00:00.000Z",
    nextReviewAt: null,
    ...overrides,
  };
}
