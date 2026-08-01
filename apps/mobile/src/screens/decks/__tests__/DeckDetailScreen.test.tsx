/// <reference types="jest" />

import type { ReactNode } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useDeckQuery, type DeckDetail, type DeckWord } from "@/entities/deck";
import { useAuthFailureRedirect } from "@/features/auth";
import { useAddDeckWords, useRemoveDeckWord } from "@/features/decks";
import {
  useCancelScheduledReview,
  useScheduleUserWord,
  useScheduledReviewsQuery,
  type ScheduledReviewItem,
} from "@/features/review-boxes";
import { useUpdateVocabularyItem } from "@/features/vocabulary";
import { DeckDetailScreen } from "../DeckDetailScreen";

type MockSwipeableProps = {
  children: ReactNode;
  renderRightActions: (
    progress: unknown,
    translation: unknown,
    methods: { close: () => void },
  ) => ReactNode;
};

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("react-native-gesture-handler/ReanimatedSwipeable", () => {
  const { View } = jest.requireActual("react-native");

  function MockSwipeable({ children, renderRightActions }: MockSwipeableProps) {
    return (
      <View>
        {children}
        {renderRightActions(null, null, { close: jest.fn() })}
      </View>
    );
  }

  return {
    __esModule: true,
    default: MockSwipeable,
  };
});

jest.mock("@/entities/deck", () => ({
  useDeckQuery: jest.fn(),
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/decks", () => ({
  useAddDeckWords: jest.fn(),
  useRemoveDeckWord: jest.fn(),
}));

jest.mock("@/features/review-boxes", () => ({
  ...jest.requireActual("@/features/review-boxes/model"),
  useCancelScheduledReview: jest.fn(),
  useScheduleUserWord: jest.fn(),
  useScheduledReviewsQuery: jest.fn(),
}));

jest.mock("@/features/vocabulary", () => ({
  useUpdateVocabularyItem: jest.fn(),
}));

const useLocalSearchParamsMock = useLocalSearchParams as jest.Mock;
const useRouterMock = useRouter as jest.Mock;
const useDeckQueryMock = useDeckQuery as jest.Mock;
const useAuthFailureRedirectMock = useAuthFailureRedirect as jest.Mock;
const useAddDeckWordsMock = useAddDeckWords as jest.Mock;
const useRemoveDeckWordMock = useRemoveDeckWord as jest.Mock;
const useCancelScheduledReviewMock = useCancelScheduledReview as jest.Mock;
const useScheduleUserWordMock = useScheduleUserWord as jest.Mock;
const useScheduledReviewsQueryMock = useScheduledReviewsQuery as jest.Mock;
const useUpdateVocabularyItemMock = useUpdateVocabularyItem as jest.Mock;

const router = {
  back: jest.fn(),
  push: jest.fn(),
};
const addDeckWords = jest.fn();
const removeDeckWord = jest.fn();
const cancelScheduledReview = jest.fn();
const scheduleUserWord = jest.fn();
const updateVocabularyItem = jest.fn();
const refetchDeck = jest.fn();

const deckWord = createDeckWord();
const deck = createDeckDetail([deckWord]);

describe("DeckDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addDeckWords.mockReset().mockResolvedValue(undefined);
    removeDeckWord.mockReset().mockResolvedValue(undefined);
    cancelScheduledReview.mockReset().mockResolvedValue(undefined);
    scheduleUserWord.mockReset().mockResolvedValue(undefined);
    updateVocabularyItem.mockReset().mockResolvedValue(undefined);

    useLocalSearchParamsMock.mockReturnValue({ deckId: "deck-1" });
    useRouterMock.mockReturnValue(router);
    useAuthFailureRedirectMock.mockReturnValue(false);
    useDeckQueryMock.mockReturnValue(createDeckQuery(deck));
    useAddDeckWordsMock.mockReturnValue(createMutation(addDeckWords));
    useRemoveDeckWordMock.mockReturnValue(createMutation(removeDeckWord));
    useCancelScheduledReviewMock.mockReturnValue(
      createMutation(cancelScheduledReview),
    );
    useScheduleUserWordMock.mockReturnValue(createMutation(scheduleUserWord));
    useScheduledReviewsQueryMock.mockReturnValue({
      data: { items: [] },
      error: null,
    });
    useUpdateVocabularyItemMock.mockReturnValue(
      createMutation(updateVocabularyItem),
    );
  });

  it("schedules a deck word in the selected review box", async () => {
    render(<DeckDetailScreen />);

    expect(screen.getByText("Travel words")).toBeTruthy();
    expect(screen.getByText("1 word - 20%")).toBeTruthy();

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

  it("adds multiple trimmed words and applies the default word type", async () => {
    render(<DeckDetailScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Add words" }));
    fireEvent.changeText(
      screen.getByPlaceholderText("English"),
      "  first word  ",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Translation"),
      "  birinci soz  ",
    );
    fireEvent.press(
      screen.getByRole("button", { name: "Add another word row" }),
    );

    const sourceInputs = screen.getAllByPlaceholderText("English");
    const targetInputs = screen.getAllByPlaceholderText("Translation");

    fireEvent.changeText(sourceInputs[1], "second word");
    fireEvent.changeText(targetInputs[1], "ikinci soz");
    fireEvent.press(screen.getByRole("button", { name: "Add to deck" }));

    await waitFor(() => {
      expect(addDeckWords).toHaveBeenCalledWith({
        words: [
          {
            sourceText: "first word",
            targetText: "birinci soz",
            wordType: "OTHER",
          },
          {
            sourceText: "second word",
            targetText: "ikinci soz",
            wordType: "OTHER",
          },
        ],
      });
      expect(screen.getByText("2 words added.")).toBeTruthy();
    });
  });

  it("keeps the add form intact when saving words fails", async () => {
    addDeckWords.mockRejectedValueOnce(new Error("Network unavailable"));
    render(<DeckDetailScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Add words" }));
    fireEvent.changeText(screen.getByPlaceholderText("English"), "hello");
    fireEvent.changeText(screen.getByPlaceholderText("Translation"), "salam");
    fireEvent.press(screen.getByRole("button", { name: "Add to deck" }));

    expect(await screen.findByText("Could not add these words.")).toBeTruthy();
    expect(screen.getByDisplayValue("hello")).toBeTruthy();
    expect(screen.getByDisplayValue("salam")).toBeTruthy();
    expect(screen.queryByText("1 word added.")).toBeNull();
  });

  it("validates incomplete word rows before calling the API", () => {
    render(<DeckDetailScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Add words" }));
    fireEvent.changeText(screen.getByPlaceholderText("English"), "hello");
    fireEvent.press(screen.getByRole("button", { name: "Add to deck" }));

    expect(
      screen.getByText("Every word needs both source and target text."),
    ).toBeTruthy();
    expect(addDeckWords).not.toHaveBeenCalled();
  });

  it("marks a word as mastered and cancels its active schedule", async () => {
    useScheduledReviewsQueryMock.mockReturnValue({
      data: { items: [createScheduledReviewItem()] },
      error: null,
    });
    render(<DeckDetailScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Open actions for hello" }),
    );
    fireEvent.press(screen.getByText("I know this word"));

    await waitFor(() => {
      expect(updateVocabularyItem).toHaveBeenCalledWith({
        id: "vocabulary-item-1",
        data: { status: "MASTERED" },
      });
      expect(cancelScheduledReview).toHaveBeenCalledWith("schedule-1");
      expect(screen.getByText("hello marked as mastered.")).toBeTruthy();
    });
  });

  it("requires confirmation before removing only the deck membership", async () => {
    render(<DeckDetailScreen />);

    fireEvent.press(
      screen.getByRole("button", {
        name: "Remove hello from this deck",
      }),
    );

    expect(screen.getByText("Remove word?")).toBeTruthy();
    expect(
      screen.getByText(
        '"hello" will be removed from Travel words. Your learning progress and review boxes will stay.',
      ),
    ).toBeTruthy();
    expect(removeDeckWord).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(removeDeckWord).toHaveBeenCalledWith("deck-card-1");
      expect(screen.getByText("hello removed from this deck.")).toBeTruthy();
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

function createDeckQuery(data: DeckDetail) {
  return {
    data,
    error: null,
    isError: false,
    isLoading: false,
    refetch: refetchDeck,
  };
}

function createDeckDetail(items: DeckWord[]): DeckDetail {
  return {
    id: "deck-1",
    title: "Travel words",
    description: "Useful phrases",
    isDefault: false,
    wordCount: items.length,
    masteryScore: 1,
    maxMasteryScore: items.length * 5,
    progressPercent: 20,
    createdAt: "2026-07-30T08:00:00.000Z",
    updatedAt: "2026-07-30T08:00:00.000Z",
    items,
  };
}

function createDeckWord(): DeckWord {
  return {
    deckCardId: "deck-card-1",
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
      status: "LEARNING",
      isFavorite: false,
      masteryStep: 1,
      reviewCount: 1,
      correctCount: 1,
      wrongCount: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
      createdAt: "2026-07-30T08:00:00.000Z",
    },
    createdAt: "2026-07-30T08:00:00.000Z",
  };
}

function createScheduledReviewItem(): ScheduledReviewItem {
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
  };
}
