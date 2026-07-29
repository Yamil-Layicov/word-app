/// <reference types="jest" />

import type { PropsWithChildren } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  saveRegisterDraft,
  useLogin,
  useStartSession,
  type AuthTokensResponse,
} from "@/features/auth";
import { consumePendingNotificationDestination } from "@/features/push-notifications";
import { LoginScreen } from "../LoginScreen";
import { RegisterScreen } from "../RegisterScreen";

jest.mock("expo-router", () => ({
  Link: ({ children }: PropsWithChildren) => children,
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/features/auth", () => ({
  ...jest.requireActual("@/features/auth/auth-route-notice"),
  ...jest.requireActual("@/features/auth/form-validation"),
  saveRegisterDraft: jest.fn(),
  useLogin: jest.fn(),
  useStartSession: jest.fn(),
}));

jest.mock("@/features/push-notifications", () => ({
  consumePendingNotificationDestination: jest.fn(),
}));

const useRouterMock = useRouter as jest.Mock;
const useLocalSearchParamsMock = useLocalSearchParams as jest.Mock;
const useLoginMock = useLogin as jest.Mock;
const useStartSessionMock = useStartSession as jest.Mock;
const saveRegisterDraftMock = saveRegisterDraft as jest.Mock;
const consumePendingDestinationMock =
  consumePendingNotificationDestination as jest.Mock;

const router = {
  push: jest.fn(),
  replace: jest.fn(),
};
const login = jest.fn();
const startSession = jest.fn();

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

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    login.mockReset();
    startSession.mockReset();
    useRouterMock.mockReturnValue(router);
    useLocalSearchParamsMock.mockReturnValue({});
    useLoginMock.mockReturnValue({
      mutateAsync: login,
      isPending: false,
    });
    useStartSessionMock.mockReturnValue(startSession);
    consumePendingDestinationMock.mockReturnValue(null);
  });

  it("shows validation errors without sending an empty form", () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByText("Email address is required.")).toBeTruthy();
    expect(screen.getByText("Password is required.")).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("starts a session and navigates after a valid login", async () => {
    login.mockResolvedValue(authResponse);
    startSession.mockResolvedValue(undefined);
    render(<LoginScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Email address"),
      "  USER@Example.COM ",
    );
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password");
    fireEvent.press(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password",
      });
      expect(startSession).toHaveBeenCalledWith(authResponse);
      expect(router.replace).toHaveBeenCalledWith("/(app)");
    });
  });

  it("shows the account-created notice passed by onboarding", () => {
    useLocalSearchParamsMock.mockReturnValue({
      notice: "account-created",
    });

    render(<LoginScreen />);

    expect(
      screen.getByText("Your account was created. Log in to continue."),
    ).toBeTruthy();
  });

  it("opens the forgot-password route", () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Forgot password?" }));

    expect(router.push).toHaveBeenCalledWith("./forgot-password");
  });
});

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    login.mockReset();
    startSession.mockReset();
    useRouterMock.mockReturnValue(router);
  });

  it("shows validation errors without saving an empty draft", () => {
    render(<RegisterScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Full name is required.")).toBeTruthy();
    expect(screen.getByText("Email address is required.")).toBeTruthy();
    expect(screen.getByText("Password is required.")).toBeTruthy();
    expect(screen.getByText("Confirm your password.")).toBeTruthy();
    expect(
      screen.getByText("You need to accept the terms to continue."),
    ).toBeTruthy();
    expect(saveRegisterDraftMock).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("saves a normalized draft and opens language selection", () => {
    render(<RegisterScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Full name"),
      "  Yamil Test  ",
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Email address"),
      "  USER@Example.COM ",
    );
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password");
    fireEvent.changeText(
      screen.getByPlaceholderText("Confirm password"),
      "password",
    );
    fireEvent.press(screen.getByRole("checkbox", { name: "Accept terms" }));
    fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    expect(saveRegisterDraftMock).toHaveBeenCalledWith({
      displayName: "Yamil Test",
      email: "user@example.com",
      password: "password",
    });
    expect(router.push).toHaveBeenCalledWith("/language-pair");
  });
});
