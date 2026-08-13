/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  useVocabularyItemQuery,
  type VocabularyItem,
} from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import { useReplaceVocabularyItemContent } from "@/features/vocabulary";
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
  useReplaceVocabularyItemContent: jest.fn(),
}));

const useLocalSearchParamsMock = jest.mocked(useLocalSearchParams);
const useRouterMock = jest.mocked(useRouter);
const useVocabularyItemQueryMock = jest.mocked(useVocabularyItemQuery);
const useAuthFailureRedirectMock = jest.mocked(useAuthFailureRedirect);
const useReplaceVocabularyItemContentMock = jest.mocked(
  useReplaceVocabularyItemContent,
);

const router = {
  back: jest.fn(),
};
const refetchVocabularyItem = jest.fn();
const replaceVocabularyItemContent = jest.fn();
const vocabularyItem = createVocabularyItem();

describe("VocabularyDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refetchVocabularyItem.mockReset().mockResolvedValue(undefined);
    replaceVocabularyItemContent
      .mockReset()
      .mockResolvedValue(vocabularyItem);

    useLocalSearchParamsMock.mockReturnValue({ id: "vocabulary-item-1" });
    useRouterMock.mockReturnValue(router as never);
    useAuthFailureRedirectMock.mockReturnValue(false);
    useVocabularyItemQueryMock.mockReturnValue(
      createVocabularyItemQuery(vocabularyItem) as never,
    );
    useReplaceVocabularyItemContentMock.mockReturnValue(
      createMutation(replaceVocabularyItemContent) as never,
    );
  });

  it("loads the selected word into an editable form", () => {
    render(<VocabularyDetailScreen />);

    expect(useVocabularyItemQueryMock).toHaveBeenCalledWith(
      "vocabulary-item-1",
    );
    expect(screen.getByDisplayValue("hello")).toBeTruthy();
    expect(screen.getByDisplayValue("salam")).toBeTruthy();
    expect(screen.getByDisplayValue("Hello, how are you?")).toBeTruthy();
    expect(screen.getByDisplayValue("Salam, necesen?")).toBeTruthy();
  });

  it("adds and removes example editors", () => {
    render(<VocabularyDetailScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Add example" }));

    expect(screen.getByText("Example 2")).toBeTruthy();
    fireEvent.press(
      screen.getByRole("button", { name: "Remove example 2" }),
    );
    expect(screen.queryByText("Example 2")).toBeNull();
  });

  it("validates a partially completed example before saving", () => {
    render(<VocabularyDetailScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Add example" }));
    fireEvent.changeText(
      screen.getAllByPlaceholderText("I read a book every evening.")[1],
      "A new source sentence.",
    );
    fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("Translation is required.")).toBeTruthy();
    expect(replaceVocabularyItemContent).not.toHaveBeenCalled();
  });

  it("saves the word and every complete example in one request", async () => {
    render(<VocabularyDetailScreen />);

    fireEvent.changeText(screen.getByDisplayValue("hello"), "  welcome  ");
    fireEvent.changeText(screen.getByDisplayValue("salam"), "  xoş gəldin  ");
    fireEvent.press(screen.getByRole("button", { name: "Add example" }));
    fireEvent.changeText(
      screen.getAllByPlaceholderText("I read a book every evening.")[1],
      "Welcome to Baku.",
    );
    fireEvent.changeText(
      screen.getAllByPlaceholderText("Mən hər axşam kitab oxuyuram.")[1],
      "Bakıya xoş gəldin.",
    );
    fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(replaceVocabularyItemContent).toHaveBeenCalledWith({
        id: "vocabulary-item-1",
        data: {
          sourceText: "welcome",
          targetText: "xoş gəldin",
          examples: [
            {
              sourceSentence: "Hello, how are you?",
              targetSentence: "Salam, necesen?",
            },
            {
              sourceSentence: "Welcome to Baku.",
              targetSentence: "Bakıya xoş gəldin.",
            },
          ],
        },
      });
      expect(screen.getByText("Changes saved.")).toBeTruthy();
    });
  });

  it("shows the API message when content cannot be edited", async () => {
    replaceVocabularyItemContent.mockRejectedValueOnce(
      new ApiError({
        status: 409,
        message: "Shared vocabulary content cannot be edited",
      }),
    );
    render(<VocabularyDetailScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Shared vocabulary content cannot be edited"),
    ).toBeTruthy();
  });

  it("shows loading and retry states without rendering the form", () => {
    useVocabularyItemQueryMock.mockReturnValue(
      createVocabularyItemQuery(undefined, {
        error: new Error("Network unavailable"),
        isError: true,
      }) as never,
    );

    render(<VocabularyDetailScreen />);

    expect(screen.getByText("Could not load this word.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(refetchVocabularyItem).toHaveBeenCalledTimes(1);
  });

  it("leaves unauthorized errors to the auth redirect flow", () => {
    useVocabularyItemQueryMock.mockReturnValue(
      createVocabularyItemQuery(undefined, {
        error: new Error("Unauthorized"),
        isError: true,
      }) as never,
    );
    useAuthFailureRedirectMock.mockReturnValue(true);

    render(<VocabularyDetailScreen />);

    expect(screen.queryByText("Could not load this word.")).toBeNull();
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
