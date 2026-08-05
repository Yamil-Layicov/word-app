/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import { useMeProfileQuery, type MeProfile } from "@/entities/user";
import {
  useMeLanguagePairsQuery,
  type UserLanguagePair,
} from "@/entities/user-language-pair";
import { useAuthFailureRedirect } from "@/features/auth";
import { useSetActiveLanguagePair, useUpdateProfile } from "@/features/me";
import { ApiError } from "@/shared/api/http-error";
import { ProfileScreen } from "../ProfileScreen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/entities/user", () => ({
  useMeProfileQuery: jest.fn(),
}));

jest.mock("@/entities/user-language-pair", () => ({
  useMeLanguagePairsQuery: jest.fn(),
}));

jest.mock("@/features/auth", () => ({
  useAuthFailureRedirect: jest.fn(),
}));

jest.mock("@/features/me", () => ({
  useSetActiveLanguagePair: jest.fn(),
  useUpdateProfile: jest.fn(),
}));

jest.mock("../ProfileConnectedAccountsSection", () => {
  const { Text } = jest.requireActual("react-native");

  return {
    ProfileConnectedAccountsSection: () => <Text>Connected accounts</Text>,
  };
});

jest.mock("../ProfileLogoutSection", () => {
  const { Text } = jest.requireActual("react-native");

  return {
    ProfileLogoutSection: () => <Text>Logout section</Text>,
  };
});

const mockUseRouter = jest.mocked(useRouter);
const mockUseMeProfileQuery = jest.mocked(useMeProfileQuery);
const mockUseMeLanguagePairsQuery = jest.mocked(useMeLanguagePairsQuery);
const mockUseAuthFailureRedirect = jest.mocked(useAuthFailureRedirect);
const mockUseUpdateProfile = jest.mocked(useUpdateProfile);
const mockUseSetActiveLanguagePair = jest.mocked(useSetActiveLanguagePair);
const back = jest.fn();
const push = jest.fn();
const refetchProfile = jest.fn();
const refetchLanguagePairs = jest.fn();
const updateProfile = jest.fn();
const setActiveLanguagePair = jest.fn();

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
    activeLanguagePairId: "pair-en-az",
  },
  activeLanguagePair: {
    id: "pair-en-az",
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

const activePair = createUserLanguagePair(
  "pair-en-az",
  "Azerbaijani",
  true,
);
const inactivePair = createUserLanguagePair(
  "pair-en-tr",
  "Turkish",
  false,
);

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateProfile.mockReset();
    setActiveLanguagePair.mockReset();
    mockUseRouter.mockReturnValue({ back, push } as never);
    mockUseAuthFailureRedirect.mockReturnValue(false);
    mockUseMeProfileQuery.mockReturnValue({
      data: profile,
      error: null,
      isError: false,
      isLoading: false,
      refetch: refetchProfile,
    } as never);
    mockUseMeLanguagePairsQuery.mockReturnValue({
      data: [activePair, inactivePair],
      error: null,
      isError: false,
      isLoading: false,
      refetch: refetchLanguagePairs,
    } as never);
    mockUseUpdateProfile.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      mutateAsync: updateProfile,
    } as never);
    mockUseSetActiveLanguagePair.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      mutateAsync: setActiveLanguagePair,
    } as never);
  });

  it("renders profile data and the user's language pairs", () => {
    render(<ProfileScreen />);

    expect(screen.getAllByText("Yamil")).toHaveLength(2);
    expect(screen.getAllByText("user@example.com")).toHaveLength(2);
    expect(screen.getAllByText("English -> Azerbaijani").length).toBeGreaterThan(0);
    expect(screen.getByText("English -> Turkish")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("validates and saves a trimmed display name", async () => {
    updateProfile.mockResolvedValue({
      ...profile,
      profile: { ...profile.profile!, displayName: "Yamil Test" },
    });
    render(<ProfileScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByPlaceholderText("Your name");
    fireEvent.changeText(input, " ");
    fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByText("Display name must be at least 2 characters."),
    ).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();

    fireEvent.changeText(input, "  Yamil Test  ");
    fireEvent.press(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        displayName: "Yamil Test",
      });
      expect(screen.getByText("Profile updated.")).toBeTruthy();
    });
  });

  it("keeps edit mode open when updating the display name fails", async () => {
    updateProfile.mockRejectedValue(
      new ApiError({ status: 409, message: "Display name is unavailable" }),
    );
    render(<ProfileScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Edit" }));
    fireEvent.changeText(screen.getByPlaceholderText("Your name"), "Other name");
    fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Display name is unavailable"),
    ).toBeTruthy();
    expect(screen.getByPlaceholderText("Your name")).toBeTruthy();
  });

  it("sets another saved language pair as active", async () => {
    setActiveLanguagePair.mockResolvedValue({
      ...profile,
      activeLanguagePair: profile.activeLanguagePair,
    });
    render(<ProfileScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Set active" }));

    await waitFor(() => {
      expect(setActiveLanguagePair).toHaveBeenCalledWith({
        languagePairId: "pair-en-tr",
      });
      expect(
        screen.getByText("Active language pair updated."),
      ).toBeTruthy();
    });
  });

  it("opens the add-language-pair route", () => {
    render(<ProfileScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Add" }));

    expect(push).toHaveBeenCalledWith("/profile/add-language-pair");
  });

  it("provides independent retry actions for profile and pair queries", () => {
    mockUseMeProfileQuery.mockReturnValue({
      data: undefined,
      error: new Error("Profile failed"),
      isError: true,
      isLoading: false,
      refetch: refetchProfile,
    } as never);
    mockUseMeLanguagePairsQuery.mockReturnValue({
      data: undefined,
      error: new Error("Pairs failed"),
      isError: true,
      isLoading: false,
      refetch: refetchLanguagePairs,
    } as never);
    render(<ProfileScreen />);

    expect(screen.getByText("Could not load your profile.")).toBeTruthy();
    expect(screen.getByText("Could not load language pairs.")).toBeTruthy();
    const retryButtons = screen.getAllByRole("button", { name: "Try again" });
    fireEvent.press(retryButtons[0]);
    fireEvent.press(retryButtons[1]);
    expect(refetchProfile).toHaveBeenCalledTimes(1);
    expect(refetchLanguagePairs).toHaveBeenCalledTimes(1);
  });
});

function createUserLanguagePair(
  languagePairId: string,
  targetName: string,
  isActive: boolean,
): UserLanguagePair {
  return {
    id: `user-${languagePairId}`,
    languagePairId,
    languagePair: {
      id: languagePairId,
      sourceLanguage: {
        id: "language-en",
        code: "en",
        name: "English",
        nativeName: "English",
      },
      targetLanguage: {
        id: `language-${targetName.toLowerCase()}`,
        code: targetName.slice(0, 2).toLowerCase(),
        name: targetName,
        nativeName: targetName,
      },
    },
    isLearning: true,
    targetCefrLevel: "B1",
    isActive,
    createdAt: "2026-08-03T08:00:00.000Z",
  };
}
