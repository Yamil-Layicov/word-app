/// <reference types="jest" />

import type { PropsWithChildren } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useRouter } from "expo-router";

import {
  clearGoogleAuthDraft,
  clearRegisterDraft,
  getGoogleAuthDraft,
  getRegisterDraft,
  saveGoogleAuthDraft,
  saveRegisterDraft,
  useAuthSession,
  useGoogleAuth,
  useRegister,
  useStartSession,
  type GoogleAuthAuthenticatedResponse,
  type RegisterResponse,
} from "@/features/auth";
import { consumePendingNotificationDestination } from "@/features/push-notifications";
import { useLanguagePairsQuery, type LanguagePair } from "@/entities/lookups";
import { useMeLanguagePairsQuery } from "@/entities/user-language-pair";
import { useAddLanguagePair, useSetActiveLanguagePair } from "@/features/me";
import { ApiError } from "@/shared/api/http-error";
import { LanguagePairSelectionScreen } from "../LanguagePairSelectionScreen";

jest.mock("expo-router", () => ({
  Link: ({ children }: PropsWithChildren) => children,
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
  ...jest.requireActual("@/features/auth/auth-route-notice"),
  ...jest.requireActual("@/features/auth/register-draft"),
  ...jest.requireActual("@/features/auth/google-auth-draft"),
  ...jest.requireActual("@/features/auth/model"),
  useAuthSession: jest.fn(),
  useGoogleAuth: jest.fn(),
  useRegister: jest.fn(),
  useStartSession: jest.fn(),
}));

jest.mock("@/features/me", () => ({
  useAddLanguagePair: jest.fn(),
  useSetActiveLanguagePair: jest.fn(),
}));

jest.mock("@/features/push-notifications", () => ({
  consumePendingNotificationDestination: jest.fn(),
}));

const useRouterMock = useRouter as jest.Mock;
const useLanguagePairsQueryMock = useLanguagePairsQuery as jest.Mock;
const useMeLanguagePairsQueryMock = useMeLanguagePairsQuery as jest.Mock;
const useAuthSessionMock = useAuthSession as jest.Mock;
const useRegisterMock = useRegister as jest.Mock;
const useGoogleAuthMock = useGoogleAuth as jest.Mock;
const useStartSessionMock = useStartSession as jest.Mock;
const useAddLanguagePairMock = useAddLanguagePair as jest.Mock;
const useSetActiveLanguagePairMock = useSetActiveLanguagePair as jest.Mock;
const consumePendingDestinationMock =
  consumePendingNotificationDestination as jest.Mock;

const router = {
  replace: jest.fn(),
};
const register = jest.fn();
const googleAuth = jest.fn();
const startSession = jest.fn();
const completeOnboarding = jest.fn();
const endSession = jest.fn();
const addLanguagePair = jest.fn();
const setActiveLanguagePair = jest.fn();
const refetch = jest.fn();
const refetchMeLanguagePairs = jest.fn();

const languagePair: LanguagePair = {
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
    nativeName: "Azərbaycan dili",
  },
};

const registerResponse: RegisterResponse = {
  id: "user-1",
  email: "user@example.com",
  role: "USER",
  status: "ACTIVE",
  profile: null,
  createdAt: "2026-07-29T00:00:00.000Z",
};

const googleAuthResponse: GoogleAuthAuthenticatedResponse = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  status: "AUTHENTICATED",
  user: {
    ...registerResponse,
    profile: {
      id: "profile-1",
      displayName: "Google User",
      countryCode: null,
      interfaceLanguage: "en",
      activeLanguagePairId: "pair-1",
    },
  },
};

describe("LanguagePairSelectionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    register.mockReset();
    googleAuth.mockReset();
    startSession.mockReset().mockResolvedValue("authenticated");
    completeOnboarding.mockReset().mockResolvedValue(undefined);
    endSession.mockReset().mockResolvedValue(undefined);
    addLanguagePair.mockReset().mockResolvedValue([]);
    setActiveLanguagePair.mockReset().mockResolvedValue(undefined);
    refetch.mockReset();
    refetchMeLanguagePairs.mockReset();
    clearRegisterDraft();
    clearGoogleAuthDraft();
    useRouterMock.mockReturnValue(router);
    useRegisterMock.mockReturnValue({
      mutateAsync: register,
      isPending: false,
    });
    useGoogleAuthMock.mockReturnValue({
      mutateAsync: googleAuth,
      isPending: false,
    });
    useAuthSessionMock.mockReturnValue({
      completeOnboarding,
      endSession,
      status: "unauthenticated",
      user: null,
    });
    useStartSessionMock.mockReturnValue(startSession);
    useMeLanguagePairsQueryMock.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
      refetch: refetchMeLanguagePairs,
    });
    useAddLanguagePairMock.mockReturnValue({
      mutateAsync: addLanguagePair,
      isPending: false,
    });
    useSetActiveLanguagePairMock.mockReturnValue({
      mutateAsync: setActiveLanguagePair,
      isPending: false,
    });
    consumePendingDestinationMock.mockReturnValue(null);
    useLanguagePairsQueryMock.mockReturnValue({
      data: [languagePair],
      isError: false,
      isLoading: false,
      refetch,
    });
  });

  afterEach(() => {
    clearRegisterDraft();
    clearGoogleAuthDraft();
  });

  it("shows loading and API error states with a working retry", () => {
    useLanguagePairsQueryMock.mockReturnValueOnce({
      data: undefined,
      isError: false,
      isLoading: true,
      refetch,
    });

    const view = render(<LanguagePairSelectionScreen />);

    expect(screen.getByText("Loading languages...")).toBeTruthy();

    view.unmount();
    useLanguagePairsQueryMock.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      refetch,
    });
    render(<LanguagePairSelectionScreen />);

    expect(screen.getByText("Could not load language pairs.")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("does not register when the screen was opened without a draft", () => {
    render(<LanguagePairSelectionScreen />);

    selectLanguagePair();
    fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    expect(
      screen.getByText("Start from the register screen first."),
    ).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it("keeps the draft and displays the backend error when registration fails", async () => {
    saveDraft();
    register.mockRejectedValue(
      new ApiError({
        status: 409,
        message: "Email already in use",
      }),
    );
    render(<LanguagePairSelectionScreen />);

    selectLanguagePair();
    fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Email already in use")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
    expect(getRegisterDraft()).toMatchObject({
      languagePairId: "pair-1",
    });
  });

  it("disables registration while a rate-limit countdown is active", async () => {
    saveDraft();
    register.mockRejectedValue(
      new ApiError({
        status: 429,
        message: "Too many attempts. Try again later.",
        retryAfterSeconds: 3_600,
      }),
    );
    render(<LanguagePairSelectionScreen />);

    selectLanguagePair();
    fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByRole("button", {
        name: "Try again in 1:00:00",
      }),
    ).toBeDisabled();
    expect(register).toHaveBeenCalledTimes(1);
    expect(getRegisterDraft()).not.toBeNull();
  });

  it("clears the draft and opens email verification after registration", async () => {
    saveDraft();
    register.mockResolvedValue(registerResponse);
    render(<LanguagePairSelectionScreen />);

    selectLanguagePair();
    fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password",
        displayName: "Yamil Test",
        languagePairId: "pair-1",
      });
      expect(router.replace).toHaveBeenCalledWith({
        pathname: "/verify-email",
        params: {
          email: "user@example.com",
        },
      });
    });
    expect(register).toHaveBeenCalledTimes(1);
    expect(getRegisterDraft()).toBeNull();
  });

  it("finishes Google onboarding and starts the authenticated session", async () => {
    saveGoogleAuthDraft({
      idToken: "google-id-token",
      profile: {
        email: "google@example.com",
        displayName: "Google User",
      },
    });
    googleAuth.mockResolvedValue(googleAuthResponse);
    render(<LanguagePairSelectionScreen />);

    selectLanguagePair();
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(googleAuth).toHaveBeenCalledWith({
        idToken: "google-id-token",
        languagePairId: "pair-1",
      });
      expect(startSession).toHaveBeenCalledWith(googleAuthResponse);
      expect(router.replace).toHaveBeenCalledWith("/(app)");
    });
    expect(getGoogleAuthDraft()).toBeNull();
    expect(register).not.toHaveBeenCalled();
  });

  it("adds the first pair before completing an authenticated legacy session", async () => {
    useAuthSessionMock.mockReturnValue({
      completeOnboarding,
      endSession,
      status: "onboarding-required",
      user: {
        ...registerResponse,
        profile: null,
      },
    });
    render(<LanguagePairSelectionScreen />);

    selectLanguagePair();
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(addLanguagePair).toHaveBeenCalledWith({
        languagePairId: "pair-1",
      });
      expect(completeOnboarding).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith("/(app)");
    });
    expect(setActiveLanguagePair).not.toHaveBeenCalled();
  });

  it("activates an existing pair before completing an authenticated legacy session", async () => {
    useAuthSessionMock.mockReturnValue({
      completeOnboarding,
      endSession,
      status: "onboarding-required",
      user: registerResponse,
    });
    useMeLanguagePairsQueryMock.mockReturnValue({
      data: [{ languagePairId: "pair-1" }],
      isError: false,
      isLoading: false,
      refetch: refetchMeLanguagePairs,
    });
    render(<LanguagePairSelectionScreen />);

    selectLanguagePair();
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(setActiveLanguagePair).toHaveBeenCalledWith({
        languagePairId: "pair-1",
      });
      expect(completeOnboarding).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith("/(app)");
    });
    expect(addLanguagePair).not.toHaveBeenCalled();
  });
});

function saveDraft() {
  saveRegisterDraft({
    displayName: "Yamil Test",
    email: "user@example.com",
    password: "password",
  });
}

function selectLanguagePair() {
  fireEvent.press(screen.getByText("English to Azerbaijani"));
}
