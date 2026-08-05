/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import { useLanguagePairsQuery, type LanguagePair } from "@/entities/lookups";
import {
  useMeLanguagePairsQuery,
  type UserLanguagePair,
} from "@/entities/user-language-pair";
import { useAuthFailureRedirect } from "@/features/auth";
import { useAddLanguagePair } from "@/features/me";
import { ApiError } from "@/shared/api/http-error";
import { AddLanguagePairScreen } from "../AddLanguagePairScreen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/entities/lookups", () => ({
  useLanguagePairsQuery: jest.fn(),
}));

jest.mock("@/entities/user-language-pair", () => ({
  useMeLanguagePairsQuery: jest.fn(),
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/me", () => ({
  useAddLanguagePair: jest.fn(),
}));

const mockUseRouter = jest.mocked(useRouter);
const mockUseLanguagePairsQuery = jest.mocked(useLanguagePairsQuery);
const mockUseMeLanguagePairsQuery = jest.mocked(useMeLanguagePairsQuery);
const mockUseAuthFailureRedirect = jest.mocked(useAuthFailureRedirect);
const mockUseAddLanguagePair = jest.mocked(useAddLanguagePair);
const back = jest.fn();
const refetchLookups = jest.fn();
const refetchUserPairs = jest.fn();
const addLanguagePair = jest.fn();

const englishToAzerbaijani = createLanguagePair(
  "pair-en-az",
  "en",
  "English",
  "az",
  "Azerbaijani",
);
const englishToTurkish = createLanguagePair(
  "pair-en-tr",
  "en",
  "English",
  "tr",
  "Turkish",
);

describe("AddLanguagePairScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addLanguagePair.mockReset();
    mockUseRouter.mockReturnValue({ back } as never);
    mockUseAuthFailureRedirect.mockReturnValue(false);
    mockUseLanguagePairsQuery.mockReturnValue({
      data: [englishToAzerbaijani, englishToTurkish],
      error: null,
      isError: false,
      isLoading: false,
      refetch: refetchLookups,
    } as never);
    mockUseMeLanguagePairsQuery.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isLoading: false,
      refetch: refetchUserPairs,
    } as never);
    mockUseAddLanguagePair.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      mutateAsync: addLanguagePair,
    } as never);
  });

  it("shows loading and independent retry states", () => {
    mockUseLanguagePairsQuery.mockReturnValueOnce({
      data: undefined,
      error: null,
      isError: false,
      isLoading: true,
      refetch: refetchLookups,
    } as never);

    const view = render(<AddLanguagePairScreen />);
    expect(screen.getByText("Loading language pairs...")).toBeTruthy();

    view.unmount();
    mockUseLanguagePairsQuery.mockReturnValue({
      data: undefined,
      error: new Error("Lookup failed"),
      isError: true,
      isLoading: false,
      refetch: refetchLookups,
    } as never);
    render(<AddLanguagePairScreen />);

    expect(
      screen.getByText("Could not load available language pairs."),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(refetchLookups).toHaveBeenCalledTimes(1);
  });

  it("filters language pairs that the user already owns", () => {
    mockUseMeLanguagePairsQuery.mockReturnValue({
      data: [createUserLanguagePair(englishToAzerbaijani, true)],
      error: null,
      isError: false,
      isLoading: false,
      refetch: refetchUserPairs,
    } as never);

    render(<AddLanguagePairScreen />);

    expect(screen.queryByText("English to Azerbaijani")).toBeNull();
    expect(screen.getByText("English to Turkish")).toBeTruthy();
  });

  it("shows an empty state when every language pair is already added", () => {
    mockUseMeLanguagePairsQuery.mockReturnValue({
      data: [
        createUserLanguagePair(englishToAzerbaijani, true),
        createUserLanguagePair(englishToTurkish, false),
      ],
      error: null,
      isError: false,
      isLoading: false,
      refetch: refetchUserPairs,
    } as never);

    render(<AddLanguagePairScreen />);

    expect(screen.getByText("No new language pairs available.")).toBeTruthy();
  });

  it("adds the selected pair with the selected target level", async () => {
    addLanguagePair.mockResolvedValue(
      createUserLanguagePair(englishToTurkish, false),
    );
    render(<AddLanguagePairScreen />);

    fireEvent.press(screen.getByText("English to Turkish"));
    fireEvent.press(screen.getByRole("button", { name: "C1" }));
    fireEvent.press(
      screen.getByRole("button", { name: "Add language pair" }),
    );

    await waitFor(() => {
      expect(addLanguagePair).toHaveBeenCalledWith({
        languagePairId: "pair-en-tr",
        targetCefrLevel: "C1",
      });
      expect(back).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps the screen open and displays the backend error", async () => {
    addLanguagePair.mockRejectedValue(
      new ApiError({ status: 409, message: "Language pair already exists" }),
    );
    render(<AddLanguagePairScreen />);

    fireEvent.press(screen.getByText("English to Turkish"));
    fireEvent.press(
      screen.getByRole("button", { name: "Add language pair" }),
    );

    expect(
      await screen.findByText("Language pair already exists"),
    ).toBeTruthy();
    expect(back).not.toHaveBeenCalled();
  });

  it("hides the owned-pairs error while redirecting an expired session", () => {
    mockUseAuthFailureRedirect.mockReturnValue(true);
    mockUseMeLanguagePairsQuery.mockReturnValue({
      data: undefined,
      error: new Error("Unauthorized"),
      isError: true,
      isLoading: false,
      refetch: refetchUserPairs,
    } as never);

    render(<AddLanguagePairScreen />);

    expect(screen.queryByText("Could not load your language pairs.")).toBeNull();
  });
});

function createLanguagePair(
  id: string,
  sourceCode: string,
  sourceName: string,
  targetCode: string,
  targetName: string,
): LanguagePair {
  return {
    id,
    sourceLanguage: {
      id: `language-${sourceCode}`,
      code: sourceCode,
      name: sourceName,
      nativeName: sourceName,
    },
    targetLanguage: {
      id: `language-${targetCode}`,
      code: targetCode,
      name: targetName,
      nativeName: targetName,
    },
  };
}

function createUserLanguagePair(
  languagePair: LanguagePair,
  isActive: boolean,
): UserLanguagePair {
  return {
    id: `user-${languagePair.id}`,
    languagePairId: languagePair.id,
    languagePair,
    isLearning: true,
    targetCefrLevel: "B1",
    isActive,
    createdAt: "2026-08-03T08:00:00.000Z",
  };
}
