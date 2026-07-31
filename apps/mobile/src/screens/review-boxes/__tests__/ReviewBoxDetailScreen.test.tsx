/// <reference types="jest" />

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useRouter } from "expo-router";

import { useAuthFailureRedirect } from "@/features/auth";
import {
  useCancelScheduledReview,
  useScheduleUserWord,
  useScheduledReviewBoxDetailQuery,
  useStartScheduledReviewBox,
  type ScheduledReviewItem,
} from "@/features/review-boxes";
import { ReviewBoxDetailScreen } from "../ReviewBoxDetailScreen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/practice", () => ({
  canStartMatchingSession: jest.fn(() => true),
}));

jest.mock("@/features/review-boxes", () => ({
  ...jest.requireActual("@/features/review-boxes/model"),
  useCancelScheduledReview: jest.fn(),
  useScheduleUserWord: jest.fn(),
  useScheduledReviewBoxDetailQuery: jest.fn(),
  useStartScheduledReviewBox: jest.fn(),
}));

const useRouterMock = useRouter as jest.Mock;
const useAuthFailureRedirectMock = useAuthFailureRedirect as jest.Mock;
const useCancelScheduledReviewMock =
  useCancelScheduledReview as jest.Mock;
const useScheduleUserWordMock = useScheduleUserWord as jest.Mock;
const useScheduledReviewBoxDetailQueryMock =
  useScheduledReviewBoxDetailQuery as jest.Mock;
const useStartScheduledReviewBoxMock =
  useStartScheduledReviewBox as jest.Mock;

const router = {
  back: jest.fn(),
  push: jest.fn(),
};
const cancelScheduledReview = jest.fn();
const refetchBoxDetail = jest.fn();
const scheduleUserWord = jest.fn();
const startScheduledReviewBox = jest.fn();

const queuedItem = createScheduledReviewItem({
  scheduleId: "schedule-queued",
  state: "QUEUED",
});
const dueItem = createScheduledReviewItem({
  scheduleId: "schedule-due",
  state: "DUE",
});

describe("ReviewBoxDetailScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-30T10:00:00.000Z"));
    jest.clearAllMocks();
    useRouterMock.mockReturnValue(router);
    useAuthFailureRedirectMock.mockReturnValue(false);
    useScheduledReviewBoxDetailQueryMock.mockReturnValue(
      createBoxDetailQuery(),
    );
    useCancelScheduledReviewMock.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: cancelScheduledReview,
    });
    useScheduleUserWordMock.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: scheduleUserWord,
    });
    useStartScheduledReviewBoxMock.mockReturnValue({
      error: null,
      isPending: false,
      mutate: startScheduledReviewBox,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows a safe not-found state for an invalid interval", () => {
    render(<ReviewBoxDetailScreen boxId="INVALID_INTERVAL" />);

    expect(screen.getByText("Review box not found.")).toBeTruthy();
    expect(useScheduledReviewBoxDetailQueryMock).toHaveBeenCalledWith(
      undefined,
    );
  });

  it("conceals queued translations and starts the current interval", () => {
    useScheduledReviewBoxDetailQueryMock.mockReturnValue(
      createBoxDetailQuery([queuedItem]),
    );
    render(<ReviewBoxDetailScreen boxId="ONE_HOUR" />);

    expect(screen.getByText("1 hour box")).toBeTruthy();
    expect(screen.getByText("1 word")).toBeTruthy();
    expect(screen.getByText("Words")).toBeTruthy();
    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("Hidden")).toBeTruthy();
    expect(screen.queryByText("salam")).toBeNull();

    fireEvent.press(screen.getByText("Start"));

    expect(startScheduledReviewBox).toHaveBeenCalledTimes(1);
    expect(startScheduledReviewBox).toHaveBeenCalledWith("ONE_HOUR");
  });

  it("opens the selected review mode for due words", () => {
    useScheduledReviewBoxDetailQueryMock.mockReturnValue(
      createBoxDetailQuery([dueItem]),
    );
    render(<ReviewBoxDetailScreen boxId="ONE_HOUR" />);

    expect(screen.getByText("Ready to review")).toBeTruthy();

    fireEvent.press(screen.getByText("Play"));

    expect(screen.getByText("Choose a review mode")).toBeTruthy();
    expect(screen.getByText("1 word ready")).toBeTruthy();

    fireEvent.press(screen.getByText("Flashcards"));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/decks/[boxId]/review",
      params: {
        boxId: "ONE_HOUR",
        mode: "FLASHCARD",
      },
    });
  });

  it("moves a scheduled word to another queued interval", async () => {
    scheduleUserWord.mockResolvedValue(undefined);
    useScheduledReviewBoxDetailQueryMock.mockReturnValue(
      createBoxDetailQuery([queuedItem]),
    );
    render(<ReviewBoxDetailScreen boxId="ONE_HOUR" />);

    fireEvent.press(
      screen.getByRole("button", { name: "Open actions for hello" }),
    );
    fireEvent.press(screen.getByText("6 hours"));

    await waitFor(() => {
      expect(scheduleUserWord).toHaveBeenCalledWith({
        userWordId: "user-word-1",
        interval: "SIX_HOURS",
      });
      expect(
        screen.getByText("hello moved to 6 hours."),
      ).toBeTruthy();
    });
  });

  it("removes a scheduled word from its review box", async () => {
    cancelScheduledReview.mockResolvedValue(undefined);
    useScheduledReviewBoxDetailQueryMock.mockReturnValue(
      createBoxDetailQuery([queuedItem]),
    );
    render(<ReviewBoxDetailScreen boxId="ONE_HOUR" />);

    fireEvent.press(
      screen.getByRole("button", { name: "Open actions for hello" }),
    );
    fireEvent.press(screen.getByText("Remove from review box"));

    await waitFor(() => {
      expect(cancelScheduledReview).toHaveBeenCalledWith("schedule-queued");
      expect(
        screen.getByText("hello removed from the review box."),
      ).toBeTruthy();
    });
  });
});

function createBoxDetailQuery(items: ScheduledReviewItem[] = []) {
  return {
    data: {
      interval: "ONE_HOUR" as const,
      label: "1 hour" as const,
      totalWords: items.length,
      queuedWords: items.filter((item) => item.state === "QUEUED").length,
      startedWords: items.filter((item) => item.state === "STARTED").length,
      dueWords: items.filter((item) => item.state === "DUE").length,
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
    state: "QUEUED",
    startedAt: null,
    dueAt: null,
    userWordId: "user-word-1",
    vocabularyItemId: "vocabulary-item-1",
    sourceText: "hello",
    targetText: "salam",
    wordType: "NOUN",
    cefrLevel: "A1",
    definition: null,
    note: null,
    examples: [],
    status: "LEARNING",
    masteryStep: 1,
    reviewCount: 1,
    correctCount: 1,
    wrongCount: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    ...overrides,
  };
}
