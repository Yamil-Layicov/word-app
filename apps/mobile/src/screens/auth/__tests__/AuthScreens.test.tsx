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
  AUTH_API_ERROR_CODE,
  clearGoogleAuthDraft,
  isGoogleSignInSupported,
  requestGoogleIdToken,
  saveRegisterDraft,
  saveGoogleAuthDraft,
  useGoogleAuth,
  useLogin,
  useStartSession,
  type AuthTokensResponse,
  type GoogleAuthAuthenticatedResponse,
} from "@/features/auth";
import { consumePendingNotificationDestination } from "@/features/push-notifications";
import { ApiError } from "@/shared/api/http-error";
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
  ...jest.requireActual("@/features/auth/auth-api-error-code"),
  ...jest.requireActual("@/features/auth/form-validation"),
  ...jest.requireActual("@/features/auth/model"),
  ...jest.requireActual(
    "@/features/auth/google-sign-in/google-sign-in.types",
  ),
  clearGoogleAuthDraft: jest.fn(),
  clearRegisterDraft: jest.fn(),
  isGoogleSignInSupported: jest.fn(),
  requestGoogleIdToken: jest.fn(),
  saveGoogleAuthDraft: jest.fn(),
  saveRegisterDraft: jest.fn(),
  useGoogleAuth: jest.fn(),
  useLogin: jest.fn(),
  useStartSession: jest.fn(),
}));

jest.mock("@/features/push-notifications", () => ({
  consumePendingNotificationDestination: jest.fn(),
}));

const useRouterMock = useRouter as jest.Mock;
const useLocalSearchParamsMock = useLocalSearchParams as jest.Mock;
const useLoginMock = useLogin as jest.Mock;
const useGoogleAuthMock = useGoogleAuth as jest.Mock;
const useStartSessionMock = useStartSession as jest.Mock;
const isGoogleSignInSupportedMock = isGoogleSignInSupported as jest.Mock;
const requestGoogleIdTokenMock = requestGoogleIdToken as jest.Mock;
const clearGoogleAuthDraftMock = clearGoogleAuthDraft as jest.Mock;
const saveGoogleAuthDraftMock = saveGoogleAuthDraft as jest.Mock;
const saveRegisterDraftMock = saveRegisterDraft as jest.Mock;
const consumePendingDestinationMock =
  consumePendingNotificationDestination as jest.Mock;

const router = {
  push: jest.fn(),
  replace: jest.fn(),
};
const login = jest.fn();
const googleAuth = jest.fn();
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

const googleAuthResponse: GoogleAuthAuthenticatedResponse = {
  ...authResponse,
  status: "AUTHENTICATED",
};

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    login.mockReset();
    googleAuth.mockReset();
    startSession.mockReset().mockResolvedValue("authenticated");
    useRouterMock.mockReturnValue(router);
    useLocalSearchParamsMock.mockReturnValue({});
    useLoginMock.mockReturnValue({
      mutateAsync: login,
      isPending: false,
    });
    useGoogleAuthMock.mockReturnValue({
      mutateAsync: googleAuth,
      isPending: false,
    });
    useStartSessionMock.mockReturnValue(startSession);
    isGoogleSignInSupportedMock.mockReturnValue(false);
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

  it("opens mandatory onboarding when the signed-in profile has no active language pair", async () => {
    login.mockResolvedValue({
      ...authResponse,
      user: {
        ...authResponse.user,
        profile: null,
      },
    });
    startSession.mockResolvedValue("onboarding-required");
    render(<LoginScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Email address"),
      "user@example.com",
    );
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password");
    fireEvent.press(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/language-pair");
    });
    expect(consumePendingDestinationMock).not.toHaveBeenCalled();
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

  it("shows the password-reset notice passed by recovery", () => {
    useLocalSearchParamsMock.mockReturnValue({
      notice: "password-reset",
    });

    render(<LoginScreen />);

    expect(
      screen.getByText(
        "Your password was reset. Log in with your new password.",
      ),
    ).toBeTruthy();
  });

  it("shows the email-verified notice passed by verification", () => {
    useLocalSearchParamsMock.mockReturnValue({
      notice: "email-verified",
    });

    render(<LoginScreen />);

    expect(
      screen.getByText("Your email was verified. Log in to continue."),
    ).toBeTruthy();
  });

  it("opens verification when the backend requires email confirmation", async () => {
    login.mockRejectedValue(
      new ApiError({
        status: 403,
        message: "Verify your email before logging in.",
        response: {
          statusCode: 403,
          message: "Verify your email before logging in.",
          error: "Forbidden",
          code: AUTH_API_ERROR_CODE.emailVerificationRequired,
        },
      }),
    );
    render(<LoginScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Email address"),
      "  USER@Example.COM ",
    );
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password");
    fireEvent.press(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: "/verify-email",
        params: {
          email: "user@example.com",
        },
      });
    });
    expect(startSession).not.toHaveBeenCalled();
  });

  it("disables login and shows the retry countdown after rate limiting", async () => {
    login.mockRejectedValue(
      new ApiError({
        status: 429,
        message: "Too many attempts. Try again later.",
        response: {
          statusCode: 429,
          message: "Too many attempts. Try again later.",
          error: "Too Many Requests",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfterSeconds: 90,
        },
        retryAfterSeconds: 90,
      }),
    );
    render(<LoginScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Email address"),
      "user@example.com",
    );
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password");
    fireEvent.press(screen.getByRole("button", { name: "Log in" }));

    const retryButton = await screen.findByRole("button", {
      name: "Try again in 1:30",
    });

    expect(retryButton.props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(
      screen.getByText("Too many attempts. Try again later."),
    ).toBeTruthy();
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("opens the forgot-password route", () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Forgot password?" }));

    expect(router.push).toHaveBeenCalledWith("./forgot-password");
  });

  it("starts a session for an existing Google account", async () => {
    isGoogleSignInSupportedMock.mockReturnValue(true);
    requestGoogleIdTokenMock.mockResolvedValue({
      status: "SUCCESS",
      idToken: "google-id-token",
    });
    googleAuth.mockResolvedValue(googleAuthResponse);
    startSession.mockResolvedValue(undefined);
    render(<LoginScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    await waitFor(() => {
      expect(googleAuth).toHaveBeenCalledWith({
        idToken: "google-id-token",
      });
      expect(startSession).toHaveBeenCalledWith(googleAuthResponse);
      expect(router.replace).toHaveBeenCalledWith("/(app)");
    });
    expect(clearGoogleAuthDraftMock).toHaveBeenCalled();
  });

  it("opens email verification when Google matches an unverified account", async () => {
    isGoogleSignInSupportedMock.mockReturnValue(true);
    requestGoogleIdTokenMock.mockResolvedValue({
      status: "SUCCESS",
      idToken: "google-id-token",
      email: "user@example.com",
    });
    googleAuth.mockRejectedValue(
      new ApiError({
        status: 403,
        message: "Verify your email before logging in.",
        response: {
          statusCode: 403,
          message: "Verify your email before logging in.",
          error: "Forbidden",
          code: AUTH_API_ERROR_CODE.emailVerificationRequired,
        },
      }),
    );
    render(<LoginScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: "/verify-email",
        params: {
          email: "user@example.com",
        },
      });
    });
    expect(startSession).not.toHaveBeenCalled();
  });

  it("saves a temporary draft when Google onboarding is required", async () => {
    isGoogleSignInSupportedMock.mockReturnValue(true);
    requestGoogleIdTokenMock.mockResolvedValue({
      status: "SUCCESS",
      idToken: "google-id-token",
    });
    googleAuth.mockResolvedValue({
      status: "ONBOARDING_REQUIRED",
      profile: {
        email: "google@example.com",
        displayName: "Google User",
      },
    });
    render(<LoginScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    await waitFor(() => {
      expect(saveGoogleAuthDraftMock).toHaveBeenCalledWith({
        idToken: "google-id-token",
        profile: {
          email: "google@example.com",
          displayName: "Google User",
        },
      });
      expect(router.push).toHaveBeenCalledWith("/language-pair");
    });
    expect(startSession).not.toHaveBeenCalled();
  });

  it("does not call the backend when Google sign-in is cancelled", async () => {
    isGoogleSignInSupportedMock.mockReturnValue(true);
    requestGoogleIdTokenMock.mockResolvedValue({
      status: "CANCELLED",
    });
    render(<LoginScreen />);

    fireEvent.press(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    await waitFor(() => {
      expect(requestGoogleIdTokenMock).toHaveBeenCalledTimes(1);
    });
    expect(googleAuth).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    login.mockReset();
    googleAuth.mockReset();
    startSession.mockReset().mockResolvedValue("authenticated");
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
    expect(clearGoogleAuthDraftMock).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/language-pair");
  });
});
