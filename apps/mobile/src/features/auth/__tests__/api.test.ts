/// <reference types="jest" />

import { authClient } from "@/auth";
import { baseClient } from "@/shared/api/base-client";
import {
  authenticateWithGoogle,
  confirmEmailVerification,
  getCurrentUser,
  getLinkedAuthIdentities,
  linkGoogleAccount,
  login,
  logoutSession,
  refreshSession,
  register,
  requestEmailVerification,
  requestPasswordReset,
  resetPassword,
} from "../api";
import type {
  ConfirmEmailVerificationRequest,
  ForgotPasswordRequest,
  GoogleAuthRequest,
  LinkGoogleAccountRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  RequestEmailVerificationRequest,
  ResetPasswordRequest,
} from "../model";

jest.mock("@/auth", () => ({
  authClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock("@/shared/api/base-client", () => ({
  baseClient: {
    post: jest.fn(),
  },
}));

const authGetMock = authClient.get as jest.Mock;
const authPostMock = authClient.post as jest.Mock;
const basePostMock = baseClient.post as jest.Mock;

describe("auth API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers through the public API client", async () => {
    const input: RegisterRequest = {
      email: "learner@example.com",
      password: "password-123",
      displayName: "Learner",
      countryCode: "AZ",
      languagePairId: "pair-1",
    };
    const response = { id: "user-1" };
    basePostMock.mockResolvedValue(response);

    await expect(register(input)).resolves.toBe(response);

    expect(basePostMock).toHaveBeenCalledWith("/auth/register", input);
  });

  it("logs in through the public API client", async () => {
    const input: LoginRequest = {
      email: "learner@example.com",
      password: "password-123",
    };
    const response = { accessToken: "access-token" };
    basePostMock.mockResolvedValue(response);

    await expect(login(input)).resolves.toBe(response);

    expect(basePostMock).toHaveBeenCalledWith("/auth/login", input);
  });

  it("authenticates with Google through the public API client", async () => {
    const input: GoogleAuthRequest = {
      idToken: "google-id-token",
      languagePairId: "pair-1",
    };
    const response = { status: "AUTHENTICATED" };
    basePostMock.mockResolvedValue(response);

    await expect(authenticateWithGoogle(input)).resolves.toBe(response);

    expect(basePostMock).toHaveBeenCalledWith("/auth/google", input);
  });

  it("gets linked identities through the authenticated API client", async () => {
    const response = [{ provider: "GOOGLE" }];
    authGetMock.mockResolvedValue(response);

    await expect(getLinkedAuthIdentities()).resolves.toBe(response);

    expect(authGetMock).toHaveBeenCalledWith("/auth/identities");
  });

  it("links a Google account through the authenticated API client", async () => {
    const input: LinkGoogleAccountRequest = {
      idToken: "google-id-token",
    };
    const response = { provider: "GOOGLE" };
    authPostMock.mockResolvedValue(response);

    await expect(linkGoogleAccount(input)).resolves.toBe(response);

    expect(authPostMock).toHaveBeenCalledWith("/auth/google/link", input);
  });

  it("requests password reset through the public API client", async () => {
    const input: ForgotPasswordRequest = {
      email: "learner@example.com",
    };
    const response = { message: "Reset instructions sent." };
    basePostMock.mockResolvedValue(response);

    await expect(requestPasswordReset(input)).resolves.toBe(response);

    expect(basePostMock).toHaveBeenCalledWith("/auth/forgot-password", input);
  });

  it("resets a password through the public API client", async () => {
    const input: ResetPasswordRequest = {
      token: "reset-token",
      newPassword: "new-password-123",
    };
    const response = { message: "Password reset." };
    basePostMock.mockResolvedValue(response);

    await expect(resetPassword(input)).resolves.toBe(response);

    expect(basePostMock).toHaveBeenCalledWith("/auth/reset-password", input);
  });

  it("requests email verification through the public API client", async () => {
    const input: RequestEmailVerificationRequest = {
      email: "learner@example.com",
    };
    const response = { message: "Verification instructions sent." };
    basePostMock.mockResolvedValue(response);

    await expect(requestEmailVerification(input)).resolves.toBe(response);

    expect(basePostMock).toHaveBeenCalledWith(
      "/auth/email-verification/request",
      input,
    );
  });

  it("confirms email verification through the public API client", async () => {
    const input: ConfirmEmailVerificationRequest = {
      token: "verification-token",
    };
    const response = { message: "Email verified." };
    basePostMock.mockResolvedValue(response);

    await expect(confirmEmailVerification(input)).resolves.toBe(response);

    expect(basePostMock).toHaveBeenCalledWith(
      "/auth/email-verification/confirm",
      input,
    );
  });

  it("refreshes a session through the public API client", async () => {
    const input: RefreshTokenRequest = {
      refreshToken: "refresh-token",
    };
    const response = { accessToken: "new-access-token" };
    basePostMock.mockResolvedValue(response);

    await expect(refreshSession(input)).resolves.toBe(response);

    expect(basePostMock).toHaveBeenCalledWith("/auth/refresh", input);
  });

  it("logs out without expecting a response body", async () => {
    const input: RefreshTokenRequest = {
      refreshToken: "refresh-token",
    };
    basePostMock.mockResolvedValue(undefined);

    await expect(logoutSession(input)).resolves.toBeUndefined();

    expect(basePostMock).toHaveBeenCalledWith("/auth/logout", input);
  });

  it("gets the current user through the authenticated API client", async () => {
    const response = { id: "user-1" };
    authGetMock.mockResolvedValue(response);

    await expect(getCurrentUser()).resolves.toBe(response);

    expect(authGetMock).toHaveBeenCalledWith("/auth/me");
  });
});
