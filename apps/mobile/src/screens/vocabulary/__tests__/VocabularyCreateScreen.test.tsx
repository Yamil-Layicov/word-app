/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import type { VocabularyItem } from "@/entities/vocabulary-item";
import { useAuthFailureRedirect } from "@/features/auth";
import { useCreateVocabularyItem } from "@/features/vocabulary";
import { ApiError } from "@/shared/api/http-error";
import { VocabularyCreateScreen } from "../VocabularyCreateScreen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/vocabulary", () => ({
  useCreateVocabularyItem: jest.fn(),
}));

const useRouterMock = useRouter as jest.Mock;
const useAuthFailureRedirectMock = useAuthFailureRedirect as jest.Mock;
const useCreateVocabularyItemMock = useCreateVocabularyItem as jest.Mock;

const router = {
  back: jest.fn(),
  replace: jest.fn(),
};
const createVocabularyItem = jest.fn();

describe("VocabularyCreateScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createVocabularyItem.mockReset().mockResolvedValue(createVocabularyItemResult());
    useRouterMock.mockReturnValue(router);
    useAuthFailureRedirectMock.mockReturnValue(false);
    useCreateVocabularyItemMock.mockReturnValue(
      createMutation(createVocabularyItem),
    );
  });

  it("validates required source and target text before mutation", () => {
    render(<VocabularyCreateScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Create word" }));

    expect(screen.getByText("Source text is required.")).toBeTruthy();
    expect(screen.getByText("Target text is required.")).toBeTruthy();
    expect(createVocabularyItem).not.toHaveBeenCalled();
  });

  it("requires example sentences to be supplied as a pair", () => {
    render(<VocabularyCreateScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("book"), "book");
    fireEvent.changeText(screen.getByPlaceholderText("kitab"), "kitab");
    fireEvent.changeText(
      screen.getByPlaceholderText("I read a book."),
      "I read every day.",
    );
    fireEvent.press(screen.getByRole("button", { name: "Create word" }));

    expect(screen.getByText("Target example is required.")).toBeTruthy();
    expect(createVocabularyItem).not.toHaveBeenCalled();
  });

  it("creates a normalized full vocabulary item and opens its detail", async () => {
    render(<VocabularyCreateScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("book"), "  travel  ");
    fireEvent.changeText(screen.getByPlaceholderText("kitab"), "  seyahet  ");
    fireEvent.press(screen.getByText("Verb"));
    fireEvent.press(screen.getByText("B2"));
    fireEvent.changeText(
      screen.getByPlaceholderText("A written or printed work"),
      "  To move between places  ",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Common daily word"),
      "  Useful for holidays  ",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("I read a book."),
      "  I travel every summer.  ",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Men kitab oxudum."),
      "  Men her yay seyahet edirem.  ",
    );
    fireEvent.press(screen.getByRole("button", { name: "Create word" }));

    await waitFor(() => {
      expect(createVocabularyItem).toHaveBeenCalledWith({
        sourceText: "travel",
        targetText: "seyahet",
        wordType: "VERB",
        cefrLevel: "B2",
        definition: "To move between places",
        note: "Useful for holidays",
        examples: [
          {
            sourceSentence: "I travel every summer.",
            targetSentence: "Men her yay seyahet edirem.",
          },
        ],
      });
      expect(router.replace).toHaveBeenCalledWith({
        pathname: "/vocabulary/[id]",
        params: { id: "vocabulary-item-1" },
      });
    });
  });

  it("omits empty optional fields from the create request", async () => {
    render(<VocabularyCreateScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("book"), "hello");
    fireEvent.changeText(screen.getByPlaceholderText("kitab"), "salam");
    fireEvent.changeText(
      screen.getByPlaceholderText("A written or printed work"),
      "   ",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Common daily word"),
      "   ",
    );
    fireEvent.press(screen.getByRole("button", { name: "Create word" }));

    await waitFor(() => {
      expect(createVocabularyItem).toHaveBeenCalledWith({
        sourceText: "hello",
        targetText: "salam",
        wordType: "NOUN",
        cefrLevel: "A1",
      });
    });
  });

  it("keeps form values available when creation fails", async () => {
    createVocabularyItem.mockRejectedValueOnce(
      new ApiError({ status: 409, message: "This word already exists." }),
    );
    render(<VocabularyCreateScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("book"), "hello");
    fireEvent.changeText(screen.getByPlaceholderText("kitab"), "salam");
    fireEvent.press(screen.getByRole("button", { name: "Create word" }));

    expect(
      await screen.findByText("This word already exists."),
    ).toBeTruthy();
    expect(screen.getByDisplayValue("hello")).toBeTruthy();
    expect(screen.getByDisplayValue("salam")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("does not present an unauthorized response as a form error", async () => {
    createVocabularyItem.mockRejectedValueOnce(
      new ApiError({ status: 401, message: "Session expired." }),
    );
    render(<VocabularyCreateScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("book"), "hello");
    fireEvent.changeText(screen.getByPlaceholderText("kitab"), "salam");
    fireEvent.press(screen.getByRole("button", { name: "Create word" }));

    await waitFor(() => {
      expect(createVocabularyItem).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText("Session expired.")).toBeNull();
    expect(screen.queryByText("Could not create word.")).toBeNull();
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

function createVocabularyItemResult(): VocabularyItem {
  return {
    id: "vocabulary-item-1",
    languagePairId: "language-pair-1",
    sourceText: "travel",
    targetText: "seyahet",
    wordType: "VERB",
    cefrLevel: "B2",
    definition: "To move between places",
    note: "Useful for holidays",
    visibility: "PRIVATE",
    isActive: true,
    examples: [],
    userWord: {
      id: "user-word-1",
      vocabularyItemId: "vocabulary-item-1",
      status: "NEW",
      isFavorite: false,
      masteryStep: 0,
      reviewCount: 0,
      correctCount: 0,
      wrongCount: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
      createdAt: "2026-08-03T08:00:00.000Z",
    },
    createdAt: "2026-08-03T08:00:00.000Z",
  };
}
