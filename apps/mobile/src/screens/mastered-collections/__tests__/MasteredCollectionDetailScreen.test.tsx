/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  useMasteredCollectionQuery,
  type MasteredCollectionDetail,
  type MasteredCollectionWord,
} from "@/entities/mastered-collection";
import { useAuthFailureRedirect } from "@/features/auth";
import {
  useDeleteMasteredCollection,
  useRemoveMasteredCollectionWord,
} from "@/features/mastered-collections";
import { useScheduleUserWord } from "@/features/review-boxes";
import { MasteredCollectionDetailScreen } from "../MasteredCollectionDetailScreen";

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

jest.mock("@/features/mastered-collections", () => ({
  useDeleteMasteredCollection: jest.fn(),
  useRemoveMasteredCollectionWord: jest.fn(),
}));

jest.mock("@/features/review-boxes", () => ({
  ...jest.requireActual("@/features/review-boxes/model"),
  useScheduleUserWord: jest.fn(),
}));

const useLocalSearchParamsMock = useLocalSearchParams as jest.Mock;
const useRouterMock = useRouter as jest.Mock;
const useMasteredCollectionQueryMock =
  useMasteredCollectionQuery as jest.Mock;
const useAuthFailureRedirectMock = useAuthFailureRedirect as jest.Mock;
const useDeleteMasteredCollectionMock =
  useDeleteMasteredCollection as jest.Mock;
const useRemoveMasteredCollectionWordMock =
  useRemoveMasteredCollectionWord as jest.Mock;
const useScheduleUserWordMock = useScheduleUserWord as jest.Mock;

const router = {
  back: jest.fn(),
  push: jest.fn(),
};
const deleteCollection = jest.fn();
const removeCollectionWord = jest.fn();
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

describe("MasteredCollectionDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deleteCollection.mockReset().mockResolvedValue(undefined);
    removeCollectionWord.mockReset().mockResolvedValue(undefined);
    scheduleUserWord.mockReset().mockResolvedValue(undefined);

    useLocalSearchParamsMock.mockReturnValue({ collectionId: "collection-1" });
    useRouterMock.mockReturnValue(router);
    useAuthFailureRedirectMock.mockReturnValue(false);
    useMasteredCollectionQueryMock.mockReturnValue(
      createCollectionQuery(collection),
    );
    useDeleteMasteredCollectionMock.mockReturnValue(
      createMutation(deleteCollection),
    );
    useRemoveMasteredCollectionWordMock.mockReturnValue(
      createMutation(removeCollectionWord),
    );
    useScheduleUserWordMock.mockReturnValue(
      createMutation(scheduleUserWord),
    );
  });

  it("loads the route collection and opens vocabulary detail", () => {
    render(<MasteredCollectionDetailScreen />);

    expect(useMasteredCollectionQuery).toHaveBeenCalledWith("collection-1");
    expect(screen.getByText("Travel Collection")).toBeTruthy();
    expect(screen.getByText("2 words")).toBeTruthy();

    fireEvent.press(screen.getByText("hello"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/vocabulary/[id]",
      params: { id: "vocabulary-item-1" },
    });
  });

  it("starts collection practice with the selected mode", () => {
    render(<MasteredCollectionDetailScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Practice collection" }),
    );
    expect(screen.getByText("2 words ready")).toBeTruthy();
    fireEvent.press(screen.getByText("Matching"));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/decks/collections/[collectionId]/practice",
      params: {
        collectionId: "collection-1",
        mode: "MATCHING",
      },
    });
  });

  it("schedules a collection word in the selected review box", async () => {
    render(<MasteredCollectionDetailScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Open actions for hello" }),
    );
    fireEvent.press(screen.getByText("Review later"));
    fireEvent.press(screen.getByText("1 day"));

    await waitFor(() => {
      expect(scheduleUserWord).toHaveBeenCalledWith({
        userWordId: "user-word-1",
        interval: "ONE_DAY",
      });
      expect(screen.getByText("hello added to 1 day.")).toBeTruthy();
    });
  });

  it("requires confirmation before removing only collection membership", async () => {
    render(<MasteredCollectionDetailScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Open actions for hello" }),
    );
    fireEvent.press(screen.getByText("Remove from collection"));

    expect(screen.getByText("Remove word")).toBeTruthy();
    expect(
      screen.getByText(
        "Remove hello from this collection? The word and its progress will stay in your account.",
      ),
    ).toBeTruthy();
    expect(removeCollectionWord).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(removeCollectionWord).toHaveBeenCalledWith({
        collectionId: "collection-1",
        collectionWordId: "collection-word-1",
      });
      expect(
        screen.getByText("hello removed from this collection."),
      ).toBeTruthy();
    });
  });

  it("requires confirmation before deleting the collection", async () => {
    render(<MasteredCollectionDetailScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Delete collection" }),
    );

    expect(
      screen.getByText(
        "Delete this collection? Its words and learning progress will not be deleted.",
      ),
    ).toBeTruthy();
    expect(deleteCollection).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(deleteCollection).toHaveBeenCalledWith("collection-1");
      expect(router.back).toHaveBeenCalledTimes(1);
    });
  });

  it("stays on the detail screen when collection deletion fails", async () => {
    deleteCollection.mockRejectedValueOnce(new Error("Network unavailable"));
    render(<MasteredCollectionDetailScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Delete collection" }),
    );
    fireEvent.press(screen.getByRole("button", { name: "Delete" }));

    expect(
      await screen.findByText("Could not delete this collection."),
    ).toBeTruthy();
    expect(deleteCollection).toHaveBeenCalledWith("collection-1");
    expect(router.back).not.toHaveBeenCalled();
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
