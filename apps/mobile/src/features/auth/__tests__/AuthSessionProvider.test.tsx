/// <reference types="jest" />

import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  beginAccessTokenSession,
  clearAccessToken,
  clearStoredRefreshToken,
  configureAuthSessionHandlers,
  getStoredRefreshToken,
  saveRefreshToken,
  setAccessToken,
} from "@/auth";
import { syncCurrentDevicePushToken } from "@/features/push-notifications";
import { ApiError } from "@/shared/api/http-error";
import { queryClient } from "@/shared/lib/query-client";
import { getCurrentUser, logoutSession, refreshSession } from "../api";
import {
  AuthSessionProvider,
  useAuthSession,
} from "../AuthSessionProvider";
import { clearGoogleSignInSession } from "../google-sign-in/google-sign-in-client";
import type { AuthTokensResponse } from "../model";
import { authQueryKeys } from "../query-keys";

jest.mock("@/auth", () => ({
  beginAccessTokenSession: jest.fn(),
  clearAccessToken: jest.fn(),
  clearStoredRefreshToken: jest.fn(),
  configureAuthSessionHandlers: jest.fn(),
  getStoredRefreshToken: jest.fn(),
  saveRefreshToken: jest.fn(),
  setAccessToken: jest.fn(),
}));

jest.mock("@/features/push-notifications", () => ({
  syncCurrentDevicePushToken: jest.fn(),
}));

jest.mock("@/shared/lib/query-client", () => ({
  queryClient: {
    clear: jest.fn(),
    setQueryData: jest.fn(),
  },
}));

jest.mock("../api", () => ({
  getCurrentUser: jest.fn(),
  logoutSession: jest.fn(),
  refreshSession: jest.fn(),
}));

jest.mock("../google-sign-in/google-sign-in-client", () => ({
  clearGoogleSignInSession: jest.fn(),
}));

const mockBeginAccessTokenSession = jest.mocked(beginAccessTokenSession);
const mockClearAccessToken = jest.mocked(clearAccessToken);
const mockClearStoredRefreshToken = jest.mocked(clearStoredRefreshToken);
const mockConfigureAuthSessionHandlers = jest.mocked(
  configureAuthSessionHandlers,
);
const mockGetStoredRefreshToken = jest.mocked(getStoredRefreshToken);
const mockSaveRefreshToken = jest.mocked(saveRefreshToken);
const mockSetAccessToken = jest.mocked(setAccessToken);
const mockSyncCurrentDevicePushToken = jest.mocked(
  syncCurrentDevicePushToken,
);
const mockQueryClientClear = jest.mocked(queryClient.clear);
const mockSetQueryData = jest.mocked(queryClient.setQueryData);
const mockGetCurrentUser = jest.mocked(getCurrentUser);
const mockLogoutSession = jest.mocked(logoutSession);
const mockRefreshSession = jest.mocked(refreshSession);
const mockClearGoogleSignInSession = jest.mocked(clearGoogleSignInSession);

let currentSession: ReturnType<typeof useAuthSession> | null = null;

const authResponse: AuthTokensResponse = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  user: {
    id: "user-1",
    email: "user@example.com",
    role: "USER",
    status: "ACTIVE",
    profile: {
      id: "profile-1",
      displayName: "Test User",
      countryCode: null,
      interfaceLanguage: "az",
      activeLanguagePairId: "pair-1",
    },
    createdAt: "2026-08-03T08:00:00.000Z",
  },
};

const incompleteAuthResponse: AuthTokensResponse = {
  ...authResponse,
  user: {
    ...authResponse.user,
    profile: {
      ...authResponse.user.profile!,
      activeLanguagePairId: null,
    },
  },
};

describe("AuthSessionProvider", () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    currentSession = null;
    mockGetStoredRefreshToken.mockResolvedValue(null);
    mockSaveRefreshToken.mockResolvedValue(undefined);
    mockClearStoredRefreshToken.mockResolvedValue(undefined);
    mockConfigureAuthSessionHandlers.mockReturnValue(jest.fn());
    mockSyncCurrentDevicePushToken.mockResolvedValue(undefined);
    mockLogoutSession.mockResolvedValue(undefined);
    mockGetCurrentUser.mockResolvedValue(authResponse.user);
    mockClearGoogleSignInSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("finishes unauthenticated when no stored refresh token exists", async () => {
    renderProvider();

    expect(await screen.findByText("unauthenticated")).toBeTruthy();
    expect(mockRefreshSession).not.toHaveBeenCalled();
    expect(mockBeginAccessTokenSession).not.toHaveBeenCalled();
  });

  it("restores a valid session and synchronizes the current device", async () => {
    mockGetStoredRefreshToken.mockResolvedValue("stored-refresh-token");
    mockRefreshSession.mockResolvedValue(authResponse);

    renderProvider();

    expect(await screen.findByText("authenticated")).toBeTruthy();
    expect(mockRefreshSession).toHaveBeenCalledWith({
      refreshToken: "stored-refresh-token",
    });
    expect(mockSaveRefreshToken).toHaveBeenCalledWith("refresh-token");
    expect(mockBeginAccessTokenSession).toHaveBeenCalledWith("access-token");
    expect(mockSetQueryData).toHaveBeenCalledWith(
      authQueryKeys.me(),
      authResponse.user,
    );
    expect(mockSyncCurrentDevicePushToken).toHaveBeenCalledTimes(1);
  });

  it("restores an incomplete session into mandatory onboarding", async () => {
    mockGetStoredRefreshToken.mockResolvedValue("stored-refresh-token");
    mockRefreshSession.mockResolvedValue(incompleteAuthResponse);

    renderProvider();

    expect(await screen.findByText("onboarding-required")).toBeTruthy();
    expect(getCurrentSession().user).toEqual(incompleteAuthResponse.user);
  });

  it.each([400, 401, 403])(
    "removes a rejected stored refresh token for status %s",
    async (status) => {
      mockGetStoredRefreshToken.mockResolvedValue("rejected-refresh-token");
      mockRefreshSession.mockRejectedValue(
        new ApiError({ status, message: "Refresh token rejected" }),
      );

      renderProvider();

      expect(await screen.findByText("unauthenticated")).toBeTruthy();
      expect(mockClearStoredRefreshToken).toHaveBeenCalledTimes(1);
      expect(mockBeginAccessTokenSession).not.toHaveBeenCalled();
    },
  );

  it("keeps a recoverable restore error retryable", async () => {
    mockGetStoredRefreshToken.mockResolvedValue("stored-refresh-token");
    mockRefreshSession
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(authResponse);

    renderProvider();

    expect(await screen.findByText("restore-error")).toBeTruthy();
    expect(mockClearAccessToken).toHaveBeenCalledTimes(1);
    expect(mockQueryClientClear).toHaveBeenCalledTimes(1);

    act(() => getCurrentSession().retryRestore());

    expect(await screen.findByText("authenticated")).toBeTruthy();
    expect(mockRefreshSession).toHaveBeenCalledTimes(2);
  });

  it("starts a session only after persisting its refresh token", async () => {
    renderProvider();
    await screen.findByText("unauthenticated");

    await act(async () => {
      await getCurrentSession().startSession(authResponse);
    });

    expect(mockSaveRefreshToken).toHaveBeenCalledWith("refresh-token");
    expect(mockBeginAccessTokenSession).toHaveBeenCalledWith("access-token");
    expect(screen.getByText("authenticated")).toBeTruthy();
  });

  it("promotes an incomplete session after onboarding is completed", async () => {
    renderProvider();
    await screen.findByText("unauthenticated");

    await act(async () => {
      await getCurrentSession().startSession(incompleteAuthResponse);
    });

    expect(screen.getByText("onboarding-required")).toBeTruthy();
    mockGetCurrentUser.mockResolvedValue(authResponse.user);

    await act(async () => {
      await getCurrentSession().completeOnboarding();
    });

    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    expect(screen.getByText("authenticated")).toBeTruthy();
    expect(getCurrentSession().user).toEqual(authResponse.user);
  });

  it("revokes a new server session when local token persistence fails", async () => {
    const storageError = new Error("Secure storage unavailable");
    mockSaveRefreshToken.mockRejectedValueOnce(storageError);
    renderProvider();
    await screen.findByText("unauthenticated");

    await expect(
      act(async () => getCurrentSession().startSession(authResponse)),
    ).rejects.toThrow(storageError);

    expect(mockLogoutSession).toHaveBeenCalledWith({
      refreshToken: "refresh-token",
    });
    expect(mockBeginAccessTokenSession).not.toHaveBeenCalled();
    expect(screen.getByText("unauthenticated")).toBeTruthy();
  });

  it("clears local, Google, and server state when ending a session", async () => {
    renderProvider();
    await screen.findByText("unauthenticated");

    await act(async () => {
      await getCurrentSession().startSession(authResponse);
    });
    mockGetStoredRefreshToken.mockResolvedValue("refresh-token");

    await act(async () => {
      await getCurrentSession().endSession();
    });

    expect(mockClearAccessToken).toHaveBeenCalledTimes(1);
    expect(mockClearStoredRefreshToken).toHaveBeenCalledTimes(1);
    expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
    expect(mockClearGoogleSignInSession).toHaveBeenCalledTimes(1);
    expect(mockLogoutSession).toHaveBeenCalledWith({
      refreshToken: "refresh-token",
    });
    expect(screen.getByText("unauthenticated")).toBeTruthy();
  });

  it("can end locally without revoking the server session", async () => {
    renderProvider();
    await screen.findByText("unauthenticated");
    mockGetStoredRefreshToken.mockResolvedValue("refresh-token");

    await act(async () => {
      await getCurrentSession().endSession({ revokeServerSession: false });
    });

    expect(mockClearStoredRefreshToken).toHaveBeenCalledTimes(1);
    expect(mockLogoutSession).not.toHaveBeenCalled();
  });

  it("registers working refresh and invalidation handlers with the auth client", async () => {
    const removeHandlers = jest.fn();
    mockConfigureAuthSessionHandlers.mockReturnValue(removeHandlers);

    const view = renderProvider();
    await screen.findByText("unauthenticated");

    expect(mockConfigureAuthSessionHandlers).toHaveBeenCalledWith({
      refresh: expect.any(Function),
      invalidate: expect.any(Function),
    });

    mockGetStoredRefreshToken.mockResolvedValue("stored-refresh-token");
    mockRefreshSession.mockResolvedValue(authResponse);
    const handlers = mockConfigureAuthSessionHandlers.mock.calls[0][0];

    await act(async () => handlers.refresh());

    expect(mockSetAccessToken).toHaveBeenCalledWith("access-token");
    expect(mockSetQueryData).toHaveBeenLastCalledWith(
      authQueryKeys.me(),
      authResponse.user,
    );
    expect(screen.getByText("authenticated")).toBeTruthy();

    view.unmount();
    expect(removeHandlers).toHaveBeenCalledTimes(1);
  });
});

function SessionProbe() {
  currentSession = useAuthSession();
  return <Text>{currentSession.status}</Text>;
}

function renderProvider() {
  return render(
    <AuthSessionProvider>
      <SessionProbe />
    </AuthSessionProvider>,
  );
}

function getCurrentSession() {
  if (!currentSession) {
    throw new Error("Auth session context was not rendered.");
  }

  return currentSession;
}
