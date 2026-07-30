import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
import { isApiError } from "@/shared/api/http-error";
import { queryClient } from "@/shared/lib/query-client";
import { logoutSession, refreshSession } from "./api";
import { clearGoogleSignInSession } from "./google-sign-in/google-sign-in-client";
import type { AuthTokensResponse } from "./model";
import { authQueryKeys } from "./query-keys";

export type AuthSessionStatus =
  | "restoring"
  | "authenticated"
  | "unauthenticated"
  | "restore-error";

type EndSessionOptions = {
  revokeServerSession?: boolean;
};

type AuthSessionContextValue = {
  status: AuthSessionStatus;
  startSession: (response: AuthTokensResponse) => Promise<void>;
  endSession: (options?: EndSessionOptions) => Promise<void>;
  retryRestore: () => void;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

let restorePromise: Promise<AuthTokensResponse | null> | null = null;

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthSessionStatus>("restoring");
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const sessionRevision = useRef(0);

  const invalidateSession = useCallback(async () => {
    sessionRevision.current += 1;
    clearAccessToken();
    queryClient.clear();
    setStatus("unauthenticated");

    await clearStoredRefreshToken().catch((error: unknown) => {
      logSessionWarning("Stored refresh token could not be cleared", error);
    });
  }, []);

  const startSession = useCallback(async (response: AuthTokensResponse) => {
    const revision = sessionRevision.current + 1;
    sessionRevision.current = revision;

    try {
      await saveRefreshToken(response.refreshToken);
    } catch (error) {
      await revokeServerSession(response.refreshToken);
      throw error;
    }

    if (revision !== sessionRevision.current) {
      await revokeServerSession(response.refreshToken);
      throw new Error("The auth session changed while it was starting.");
    }

    beginAuthenticatedSession(response);
    setStatus("authenticated");
  }, []);

  const endSession = useCallback(async (options: EndSessionOptions = {}) => {
    const refreshTokenPromise = getStoredRefreshToken();

    const refreshToken = await refreshTokenPromise.catch(() => null);
    await invalidateSession();

    await clearGoogleSignInSession().catch((error: unknown) => {
      logSessionWarning("Google sign-in session could not be cleared", error);
    });

    if (options.revokeServerSession !== false && refreshToken) {
      await logoutSession({ refreshToken }).catch((error: unknown) => {
        logSessionWarning("Server session could not be revoked", error);
      });
    }
  }, [invalidateSession]);

  const refreshCurrentSession = useCallback(async () => {
    const revision = sessionRevision.current;
    const refreshToken = await getStoredRefreshToken();

    if (!refreshToken) {
      await invalidateSession();
      throw new Error("The auth session does not have a refresh token.");
    }

    let response: AuthTokensResponse;

    try {
      response = await refreshSession({ refreshToken });
    } catch (error) {
      if (isRejectedRefreshToken(error)) {
        await invalidateSession();
      }

      throw error;
    }

    if (revision !== sessionRevision.current) {
      await revokeServerSession(response.refreshToken);
      throw new Error("The auth session changed while it was refreshing.");
    }

    try {
      await saveRefreshToken(response.refreshToken);
    } catch (error) {
      await invalidateSession();
      throw error;
    }

    if (revision !== sessionRevision.current) {
      await revokeServerSession(response.refreshToken);
      throw new Error("The auth session changed while it was refreshing.");
    }

    applyRefreshedSession(response);
    setStatus("authenticated");
  }, [invalidateSession]);

  const retryRestore = useCallback(() => {
    setStatus("restoring");
    setRestoreAttempt((current) => current + 1);
  }, []);

  useEffect(
    () =>
      configureAuthSessionHandlers({
        refresh: refreshCurrentSession,
        invalidate: invalidateSession,
      }),
    [invalidateSession, refreshCurrentSession],
  );

  useEffect(() => {
    let active = true;

    void restoreStoredSession()
      .then((response) => {
        if (!active) {
          return;
        }

        if (!response) {
          setStatus("unauthenticated");
          return;
        }

        beginAuthenticatedSession(response);
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        clearAccessToken();
        queryClient.clear();
        logSessionWarning("Stored session could not be restored", error);
        setStatus("restore-error");
      });

    return () => {
      active = false;
    };
  }, [restoreAttempt]);

  const value = useMemo(
    () => ({ status, startSession, endSession, retryRestore }),
    [endSession, retryRestore, startSession, status],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used inside AuthSessionProvider.");
  }

  return context;
}

function restoreStoredSession(): Promise<AuthTokensResponse | null> {
  if (!restorePromise) {
    restorePromise = restoreStoredSessionOnce().finally(() => {
      restorePromise = null;
    });
  }

  return restorePromise;
}

async function restoreStoredSessionOnce(): Promise<AuthTokensResponse | null> {
  const refreshToken = await getStoredRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await refreshSession({ refreshToken });
    await saveRefreshToken(response.refreshToken);
    return response;
  } catch (error) {
    if (isRejectedRefreshToken(error)) {
      await clearStoredRefreshToken();
      return null;
    }

    throw error;
  }
}

function isRejectedRefreshToken(error: unknown): boolean {
  return isApiError(error) && [400, 401, 403].includes(error.status);
}

function beginAuthenticatedSession(response: AuthTokensResponse): void {
  beginAccessTokenSession(response.accessToken);
  queryClient.setQueryData(authQueryKeys.me(), response.user);

  void syncCurrentDevicePushToken().catch((error: unknown) => {
    logSessionWarning("Push token synchronization failed", error);
  });
}

function applyRefreshedSession(response: AuthTokensResponse): void {
  setAccessToken(response.accessToken);
  queryClient.setQueryData(authQueryKeys.me(), response.user);
}

function logSessionWarning(message: string, error: unknown): void {
  if (__DEV__) {
    console.warn(message, error);
  }
}

async function revokeServerSession(refreshToken: string): Promise<void> {
  await logoutSession({ refreshToken }).catch((error: unknown) => {
    logSessionWarning("Superseded server session could not be revoked", error);
  });
}
