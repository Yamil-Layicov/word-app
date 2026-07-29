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
  AUTH_ROUTE_NOTICE,
  clearRegisterDraft,
  getRegisterDraft,
  saveRegisterDraft,
  useRegister,
  useStartSession,
  type AuthTokensResponse,
} from "@/features/auth";
import {
  useLanguagePairsQuery,
  type LanguagePair,
} from "@/entities/lookups";
import { consumePendingNotificationDestination } from "@/features/push-notifications";
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

jest.mock("@/features/auth", () => ({
  ...jest.requireActual("@/features/auth/auth-route-notice"),
  ...jest.requireActual("@/features/auth/register-draft"),
  useRegister: jest.fn(),
  useStartSession: jest.fn(),
}));

jest.mock("@/features/push-notifications", () => ({
  consumePendingNotificationDestination: jest.fn(),
}));

const useRouterMock = useRouter as jest.Mock;
const useLanguagePairsQueryMock = useLanguagePairsQuery as jest.Mock;
const useRegisterMock = useRegister as jest.Mock;
const useStartSessionMock = useStartSession as jest.Mock;
const consumePendingDestinationMock =
  consumePendingNotificationDestination as jest.Mock;

const router = {
  replace: jest.fn(),
};
const register = jest.fn();
const startSession = jest.fn();
const refetch = jest.fn();

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

const authResponse: AuthTokensResponse = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  user: {
    id: "user-1",
    email: "user@example.com",
    role: "USER",
    status: "ACTIVE",
    profile: null,
    createdAt: "2026-07-29T00:00:00.000Z",
  },
};

describe("LanguagePairSelectionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    register.mockReset();
    startSession.mockReset();
    refetch.mockReset();
    clearRegisterDraft();
    useRouterMock.mockReturnValue(router);
    useRegisterMock.mockReturnValue({
      mutateAsync: register,
      isPending: false,
    });
    useStartSessionMock.mockReturnValue(startSession);
    useLanguagePairsQueryMock.mockReturnValue({
      data: [languagePair],
      isError: false,
      isLoading: false,
      refetch,
    });
    consumePendingDestinationMock.mockReturnValue(null);
  });

  afterEach(() => {
    clearRegisterDraft();
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
    fireEvent.press(
      screen.getByRole("button", { name: "Create account" }),
    );

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
    fireEvent.press(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(await screen.findByText("Email already in use")).toBeTruthy();
    expect(startSession).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(getRegisterDraft()).toMatchObject({
      languagePairId: "pair-1",
    });
  });

  it("starts the session, clears the draft, and opens the app", async () => {
    saveDraft();
    register.mockResolvedValue(authResponse);
    startSession.mockResolvedValue(undefined);
    render(<LanguagePairSelectionScreen />);

    selectLanguagePair();
    fireEvent.press(
      screen.getByRole("button", { name: "Create account" }),
    );

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password",
        displayName: "Yamil Test",
        languagePairId: "pair-1",
      });
      expect(startSession).toHaveBeenCalledWith(authResponse);
      expect(router.replace).toHaveBeenCalledWith("/(app)");
    });
    expect(getRegisterDraft()).toBeNull();
  });

  it("prevents duplicate registration when local session start fails", async () => {
    saveDraft();
    register.mockResolvedValue(authResponse);
    startSession.mockRejectedValue(new Error("Secure storage failed"));
    render(<LanguagePairSelectionScreen />);

    selectLanguagePair();
    fireEvent.press(
      screen.getByRole("button", { name: "Create account" }),
    );

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: "/login",
        params: {
          notice: AUTH_ROUTE_NOTICE.accountCreated,
        },
      });
    });
    expect(register).toHaveBeenCalledTimes(1);
    expect(getRegisterDraft()).toBeNull();
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
