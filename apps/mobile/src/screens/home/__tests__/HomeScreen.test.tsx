/// <reference types="jest" />

import { fireEvent, render, screen } from "@testing-library/react-native";

import { useMeProfileQuery, type MeProfile } from "@/entities/user";
import { useAuthFailureRedirect } from "@/features/auth";
import { HomeScreen } from "../HomeScreen";

jest.mock("@/entities/user", () => ({
  useMeProfileQuery: jest.fn(),
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("../HomeDecksSection", () => {
  const { Text } = jest.requireActual("react-native");

  return {
    HomeDecksSection: () => <Text>Deck list</Text>,
  };
});

jest.mock("../HomeTopBar", () => {
  const { Text } = jest.requireActual("react-native");

  return {
    HomeTopBar: ({ activePairCodeLabel }: { activePairCodeLabel: string }) => (
      <Text>Top bar: {activePairCodeLabel}</Text>
    ),
  };
});

const mockUseMeProfileQuery = jest.mocked(useMeProfileQuery);
const mockUseAuthFailureRedirect = jest.mocked(useAuthFailureRedirect);
const refetch = jest.fn();

const profile: MeProfile = {
  id: "user-1",
  email: "user@example.com",
  role: "USER",
  status: "ACTIVE",
  profile: {
    id: "profile-1",
    displayName: "Yamil",
    countryCode: "AZ",
    interfaceLanguage: "en",
    activeLanguagePairId: "pair-1",
  },
  activeLanguagePair: {
    id: "pair-1",
    sourceLanguage: {
      id: "language-en",
      code: "en",
      name: "English",
      nativeName: "English",
    },
    targetLanguage: {
      id: "language-az",
      code: "az",
      name: "Azerbaijani",
      nativeName: "Azerbaijani",
    },
  },
  createdAt: "2026-08-03T08:00:00.000Z",
};

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthFailureRedirect.mockReturnValue(false);
    mockUseMeProfileQuery.mockReturnValue({
      data: profile,
      error: null,
      isError: false,
      isLoading: false,
      refetch,
    } as never);
  });

  it("passes the active language codes to the top bar", () => {
    render(<HomeScreen />);

    expect(screen.getByText("Top bar: EN -> AZ")).toBeTruthy();
    expect(screen.getByText("Deck list")).toBeTruthy();
  });

  it("uses a neutral pair label while no active pair is available", () => {
    mockUseMeProfileQuery.mockReturnValue({
      data: { ...profile, activeLanguagePair: null },
      error: null,
      isError: false,
      isLoading: false,
      refetch,
    } as never);

    render(<HomeScreen />);

    expect(screen.getByText("Top bar: Pair")).toBeTruthy();
  });

  it("shows a retryable profile error without hiding the deck list", () => {
    mockUseMeProfileQuery.mockReturnValue({
      data: undefined,
      error: new Error("Request failed"),
      isError: true,
      isLoading: false,
      refetch,
    } as never);

    render(<HomeScreen />);

    expect(screen.getByText("Could not load your profile.")).toBeTruthy();
    expect(screen.getByText("Deck list")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("does not show a transient profile error during auth redirection", () => {
    mockUseAuthFailureRedirect.mockReturnValue(true);
    mockUseMeProfileQuery.mockReturnValue({
      data: undefined,
      error: new Error("Unauthorized"),
      isError: true,
      isLoading: false,
      refetch,
    } as never);

    render(<HomeScreen />);

    expect(screen.queryByText("Could not load your profile.")).toBeNull();
  });
});
