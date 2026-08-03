/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert } from "react-native";

import {
  useVocabularyItemQuery,
  type VocabularyItem,
} from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import {
  useArchiveVocabularyItem,
  useUpdateVocabularyItem,
} from "@/features/vocabulary";
import { ApiError } from "@/shared/api/http-error";
import { VocabularyDetailScreen } from "../VocabularyDetailScreen";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/entities/vocabulary-item", () => ({
  useVocabularyItemQuery: jest.fn(),
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/vocabulary", () => ({
  useArchiveVocabularyItem: jest.fn(),
  useUpdateVocabularyItem: jest.fn(),
}));

const useLocalSearchParamsMock = useLocalSearchParams as jest.Mock;
const useRouterMock = useRouter as jest.Mock;
const useVocabularyItemQueryMock = useVocabularyItemQuery as jest.Mock;
const useAuthFailureRedirectMock = useAuthFailureRedirect as jest.Mock;
const useArchiveVocabularyItemMock = useArchiveVocabularyItem as jest.Mock;
const useUpdateVocabularyItemMock = useUpdateVocabularyItem as jest.Mock;

const router = {
  back: jest.fn(),
  replace: jest.fn(),
};
const archiveVocabularyItem = jest.fn();
const refetchVocabularyItem = jest.fn();
const updateVocabularyItem = jest.fn();
const alertSpy = jest.spyOn(Alert, "alert");

const vocabularyItem = createVocabularyItem();

describe("VocabularyDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockReset();
    archiveVocabularyItem.mockReset().mockResolvedValue(undefined);
    refetchVocabularyItem.mockReset().mockResolvedValue(undefined);
    updateVocabularyItem.mockReset().mockResolvedValue(undefined);

    useLocalSearchParamsMock.mockReturnValue({ id: "vocabulary-item-1" });
    useRouterMock.mockReturnValue(router);
    useAuthFailureRedirectMock.mockReturnValue(false);
    useVocabularyItemQueryMock.mockReturnValue(
      createVocabularyItemQuery(vocabularyItem),
    );
    useArchiveVocabularyItemMock.mockReturnValue(
      createMutation(archiveVocabularyItem),
    );
    useUpdateVocabularyItemMock.mockReturnValue(
      createMutation(updateVocabularyItem),
    );
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  it("loads the vocabulary item selected by the route", () => {
    render(<VocabularyDetailScreen />);

    expect(useVocabularyItemQueryMock).toHaveBeenCalledWith(
      "vocabulary-item-1",
    );
    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("salam")).toBeTruthy();
    expect(screen.getByText("noun - A1 - learning")).toBeTruthy();
    expect(screen.getByText("A greeting")).toBeTruthy();
    expect(screen.getByText("Common greeting")).toBeTruthy();
    expect(screen.getByText("2 / 1")).toBeTruthy();
    expect(screen.getByText("Not scheduled")).toBeTruthy();
    expect(screen.getByText("Hello, how are you?")).toBeTruthy();
    expect(screen.getByText("Salam, necesen?")).toBeTruthy();
  });

  it("shows the loading state while the detail request is pending", () => {
    useVocabularyItemQueryMock.mockReturnValue(
      createVocabularyItemQuery(undefined, { isLoading: true }),
    );

    render(<VocabularyDetailScreen />);

    expect(screen.getByText("Loading word...")).toBeTruthy();
    expect(screen.queryByText("hello")).toBeNull();
  });

  it("retries a failed detail request", () => {
    useVocabularyItemQueryMock.mockReturnValue(
      createVocabularyItemQuery(undefined, {
        error: new Error("Network unavailable"),
        isError: true,
      }),
    );

    render(<VocabularyDetailScreen />);

    expect(screen.getByText("Could not load this word.")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(refetchVocabularyItem).toHaveBeenCalledTimes(1);
  });

  it("leaves unauthorized detail errors to the auth redirect flow", () => {
    useVocabularyItemQueryMock.mockReturnValue(
      createVocabularyItemQuery(undefined, {
        error: new Error("Unauthorized"),
        isError: true,
      }),
    );
    useAuthFailureRedirectMock.mockReturnValue(true);

    render(<VocabularyDetailScreen />);

    expect(screen.queryByText("Could not load this word.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("adds the word to favorites with one update command", async () => {
    render(<VocabularyDetailScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Add favorite" }));

    await waitFor(() => {
      expect(updateVocabularyItem).toHaveBeenCalledWith({
        id: "vocabulary-item-1",
        data: { isFavorite: true },
      });
      expect(screen.getByText("Added to favorites.")).toBeTruthy();
    });
  });

  it("updates the learning status selected by the user", async () => {
    render(<VocabularyDetailScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Reviewing" }));

    await waitFor(() => {
      expect(updateVocabularyItem).toHaveBeenCalledWith({
        id: "vocabulary-item-1",
        data: { status: "REVIEWING" },
      });
      expect(screen.getByText("Status changed to Reviewing.")).toBeTruthy();
    });
  });

  it("archives only after the destructive action is confirmed", async () => {
    render(<VocabularyDetailScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Archive word" }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Archive word",
      "This word will be removed from your active vocabulary list.",
      expect.any(Array),
    );
    expect(archiveVocabularyItem).not.toHaveBeenCalled();

    const buttons = alertSpy.mock.calls[0]?.[2];
    const archiveButton = buttons?.find((button) => button.text === "Archive");
    archiveButton?.onPress?.();

    await waitFor(() => {
      expect(archiveVocabularyItem).toHaveBeenCalledWith(
        "vocabulary-item-1",
      );
      expect(router.replace).toHaveBeenCalledWith("/vocabulary");
    });
  });

  it("keeps the detail open and shows an API archive error", async () => {
    archiveVocabularyItem.mockRejectedValueOnce(
      new ApiError({ status: 409, message: "Word cannot be archived." }),
    );
    render(<VocabularyDetailScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Archive word" }));
    const buttons = alertSpy.mock.calls[0]?.[2];
    const archiveButton = buttons?.find((button) => button.text === "Archive");
    archiveButton?.onPress?.();

    expect(await screen.findByText("Word cannot be archived.")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

function createMutation(mutateAsync: jest.Mock) {
  return {
    error: null,
    isError: false,
    isPending: false,
    mutateAsync,
  };
}

function createVocabularyItemQuery(
  data: VocabularyItem | undefined,
  overrides: Partial<{
    error: Error | null;
    isError: boolean;
    isLoading: boolean;
  }> = {},
) {
  return {
    data,
    error: null,
    isError: false,
    isLoading: false,
    refetch: refetchVocabularyItem,
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
    note: "Common greeting",
    visibility: "PRIVATE",
    isActive: true,
    examples: [
      {
        id: "example-1",
        sourceSentence: "Hello, how are you?",
        targetSentence: "Salam, necesen?",
        createdAt: "2026-08-01T08:00:00.000Z",
      },
    ],
    userWord: {
      id: "user-word-1",
      vocabularyItemId: "vocabulary-item-1",
      status: "LEARNING",
      isFavorite: false,
      masteryStep: 2,
      reviewCount: 3,
      correctCount: 2,
      wrongCount: 1,
      lastReviewedAt: "2026-08-02T08:00:00.000Z",
      nextReviewAt: null,
      createdAt: "2026-08-01T08:00:00.000Z",
    },
    createdAt: "2026-08-01T08:00:00.000Z",
  };
}
