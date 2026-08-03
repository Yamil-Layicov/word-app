/// <reference types="jest" />

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  useMasteredCollectionQuery,
  type MasteredCollectionDetail,
  type MasteredCollectionWord,
} from "@/entities/mastered-collection";
import { useAuthFailureRedirect } from "@/features/auth";
import { useAnswerPractice } from "@/features/practice";
import { useScheduleUserWord } from "@/features/review-boxes";
import type {
  MatchingBoardItem,
  MatchingBoardResult,
} from "@/screens/practice/MatchingPracticeBoard";
import { CollectionPracticeSessionScreen } from "../CollectionPracticeSessionScreen";

type MatchingBoardProps = {
  items: MatchingBoardItem[];
  onComplete: () => void;
  onProgressChange?: (completed: number) => void;
  onResolve: (result: MatchingBoardResult) => Promise<void>;
};

let matchingBoardProps: MatchingBoardProps | null = null;

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/entities/mastered-collection", () => ({
  useMasteredCollectionQuery: jest.fn(),
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/practice", () => ({
  ...jest.requireActual("@/features/practice/session"),
  useAnswerPractice: jest.fn(),
}));

jest.mock("@/features/review-boxes", () => ({
  ...jest.requireActual("@/features/review-boxes/model"),
  useScheduleUserWord: jest.fn(),
}));

jest.mock("@/screens/practice/MatchingPracticeBoard", () => ({
  MatchingPracticeBoard: (props: MatchingBoardProps) => {
    matchingBoardProps = props;
    return null;
  },
}));

const useLocalSearchParamsMock = useLocalSearchParams as jest.Mock;
const useRouterMock = useRouter as jest.Mock;
const useMasteredCollectionQueryMock =
  useMasteredCollectionQuery as jest.Mock;
const useAuthFailureRedirectMock = useAuthFailureRedirect as jest.Mock;
const useAnswerPracticeMock = useAnswerPractice as jest.Mock;
const useScheduleUserWordMock = useScheduleUserWord as jest.Mock;

const router = {
  back: jest.fn(),
  replace: jest.fn(),
};
const answerPractice = jest.fn();
const scheduleUserWord = jest.fn();
const refetchCollection = jest.fn();

const hello = createCollectionWord({
  collectionWordId: "collection-word-1",
  id: "vocabulary-item-1",
  sourceText: "hello",
  targetText: "salam",
  userWordId: "user-word-1",
});
const goodbye = createCollectionWord({
  collectionWordId: "collection-word-2",
  id: "vocabulary-item-2",
  sourceText: "goodbye",
  targetText: "sag ol",
  userWordId: "user-word-2",
});
const collection = createCollectionDetail([hello, goodbye]);

describe("CollectionPracticeSessionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    matchingBoardProps = null;
    answerPractice.mockReset().mockResolvedValue(undefined);
    scheduleUserWord.mockReset().mockResolvedValue(undefined);

    useLocalSearchParamsMock.mockReturnValue({
      collectionId: "collection-1",
      mode: "FLASHCARD",
    });
    useRouterMock.mockReturnValue(router);
    useAuthFailureRedirectMock.mockReturnValue(false);
    useMasteredCollectionQueryMock.mockReturnValue(
      createCollectionQuery(collection),
    );
    useAnswerPracticeMock.mockReturnValue(createMutation(answerPractice));
    useScheduleUserWordMock.mockReturnValue(
      createMutation(scheduleUserWord),
    );
  });

  it("rejects an invalid practice route", () => {
    useLocalSearchParamsMock.mockReturnValue({
      collectionId: "collection-1",
      mode: "INVALID_MODE",
    });
    render(<CollectionPracticeSessionScreen />);

    expect(screen.getByText("This practice session is not valid.")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Go back" }));

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(answerPractice).not.toHaveBeenCalled();
  });

  it("records flashcard answers and completes the collection session", async () => {
    render(<CollectionPracticeSessionScreen />);

    expect(await screen.findByText("hello")).toBeTruthy();
    expect(screen.getByText("Flashcards")).toBeTruthy();
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(screen.queryByText("salam")).toBeNull();

    fireEvent.press(screen.getByText("Show answer"));
    fireEvent.press(screen.getByText("Knew it"));

    expect(await screen.findByText("Correct")).toBeTruthy();
    expect(answerPractice).toHaveBeenNthCalledWith(1, {
      userWordId: "user-word-1",
      isCorrect: true,
      practiceMode: "FLASHCARD",
    });
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("goodbye")).toBeTruthy();
    fireEvent.press(screen.getByText("Show answer"));
    fireEvent.press(screen.getByText("Didn't know"));

    expect(await screen.findByText("Keep reviewing")).toBeTruthy();
    expect(answerPractice).toHaveBeenNthCalledWith(2, {
      userWordId: "user-word-2",
      isCorrect: false,
      practiceMode: "FLASHCARD",
    });
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Practice complete")).toBeTruthy();
    expect(screen.getByText("1/2 correct")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Done" }));

    expect(router.replace).toHaveBeenCalledWith({
      pathname: "/decks/collections/[collectionId]",
      params: { collectionId: "collection-1" },
    });
  });

  it("moves an answered word to a review box before advancing", async () => {
    render(<CollectionPracticeSessionScreen />);

    expect(await screen.findByText("hello")).toBeTruthy();
    fireEvent.press(screen.getByText("Show answer"));
    fireEvent.press(screen.getByText("Knew it"));
    expect(await screen.findByText("Review this word later")).toBeTruthy();
    fireEvent.press(screen.getByText("1 day"));

    await waitFor(() => {
      expect(scheduleUserWord).toHaveBeenCalledWith({
        userWordId: "user-word-1",
        interval: "ONE_DAY",
      });
      expect(screen.getByText("goodbye")).toBeTruthy();
    });
  });

  it("keeps the current prompt available when saving an answer fails", async () => {
    answerPractice
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(undefined);
    render(<CollectionPracticeSessionScreen />);

    expect(await screen.findByText("hello")).toBeTruthy();
    fireEvent.press(screen.getByText("Show answer"));
    fireEvent.press(screen.getByText("Knew it"));

    expect(
      await screen.findByText("Could not save this answer."),
    ).toBeTruthy();
    expect(screen.queryByText("Correct")).toBeNull();
    expect(screen.getByText("Knew it")).toBeTruthy();

    fireEvent.press(screen.getByText("Knew it"));

    expect(await screen.findByText("Correct")).toBeTruthy();
    expect(answerPractice).toHaveBeenCalledTimes(2);
    expect(answerPractice).toHaveBeenLastCalledWith({
      userWordId: "user-word-1",
      isCorrect: true,
      practiceMode: "FLASHCARD",
    });
  });

  it("normalizes a writing answer before recording it", async () => {
    useLocalSearchParamsMock.mockReturnValue({
      collectionId: "collection-1",
      mode: "TYPING",
    });
    render(<CollectionPracticeSessionScreen />);

    const input = await screen.findByPlaceholderText("Type the translation");
    fireEvent.changeText(input, "  SALAM  ");
    fireEvent.press(screen.getByRole("button", { name: "Check" }));

    await waitFor(() => {
      expect(answerPractice).toHaveBeenCalledWith({
        userWordId: "user-word-1",
        isCorrect: true,
        practiceMode: "TYPING",
      });
      expect(screen.getByText("Correct")).toBeTruthy();
    });
  });

  it("guards multiple-choice deep links without enough answers", async () => {
    useLocalSearchParamsMock.mockReturnValue({
      collectionId: "collection-1",
      mode: "MULTIPLE_CHOICE",
    });
    useMasteredCollectionQueryMock.mockReturnValue(
      createCollectionQuery(createCollectionDetail([hello])),
    );
    render(<CollectionPracticeSessionScreen />);

    expect(
      await screen.findByText("Test mode needs at least 2 different answers."),
    ).toBeTruthy();
    fireEvent.press(
      screen.getByRole("button", { name: "Back to collection" }),
    );

    expect(answerPractice).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith({
      pathname: "/decks/collections/[collectionId]",
      params: { collectionId: "collection-1" },
    });
  });

  it("schedules only matching words that need more practice", async () => {
    useLocalSearchParamsMock.mockReturnValue({
      collectionId: "collection-1",
      mode: "MATCHING",
    });
    render(<CollectionPracticeSessionScreen />);

    await waitFor(() => {
      expect(matchingBoardProps).not.toBeNull();
    });

    await act(async () => {
      await matchingBoardProps?.onResolve({
        itemId: "collection-word-1",
        isCorrect: false,
      });
      await matchingBoardProps?.onResolve({
        itemId: "collection-word-2",
        isCorrect: true,
      });
      matchingBoardProps?.onProgressChange?.(2);
      matchingBoardProps?.onComplete();
    });

    expect(answerPractice).toHaveBeenNthCalledWith(1, {
      userWordId: "user-word-1",
      isCorrect: false,
      practiceMode: "MATCHING",
    });
    expect(answerPractice).toHaveBeenNthCalledWith(2, {
      userWordId: "user-word-2",
      isCorrect: true,
      practiceMode: "MATCHING",
    });
    expect(screen.getByText("Matching complete")).toBeTruthy();
    expect(screen.getByText("1 word needs more practice.")).toBeTruthy();

    fireEvent.press(screen.getByText("6 hours"));

    await waitFor(() => {
      expect(scheduleUserWord).toHaveBeenCalledTimes(1);
      expect(scheduleUserWord).toHaveBeenCalledWith({
        userWordId: "user-word-1",
        interval: "SIX_HOURS",
      });
      expect(router.replace).toHaveBeenCalledWith({
        pathname: "/decks/collections/[collectionId]",
        params: { collectionId: "collection-1" },
      });
    });
  });
});

function createMutation(mutateAsync: jest.Mock) {
  return {
    error: null,
    isPending: false,
    mutateAsync,
  };
}

function createCollectionQuery(data: MasteredCollectionDetail) {
  return {
    data,
    error: null,
    isError: false,
    isLoading: false,
    refetch: refetchCollection,
  };
}

function createCollectionDetail(
  items: MasteredCollectionWord[],
): MasteredCollectionDetail {
  return {
    id: "collection-1",
    title: "Travel Collection",
    description: "Words for travel",
    wordCount: items.length,
    masteredWordCount: items.length,
    createdAt: "2026-08-03T08:00:00.000Z",
    updatedAt: "2026-08-03T08:00:00.000Z",
    items,
  };
}

function createCollectionWord({
  collectionWordId,
  id,
  sourceText,
  targetText,
  userWordId,
}: {
  collectionWordId: string;
  id: string;
  sourceText: string;
  targetText: string;
  userWordId: string;
}): MasteredCollectionWord {
  return {
    collectionWordId,
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
