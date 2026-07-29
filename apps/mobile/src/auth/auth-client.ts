import { baseClient } from "@/shared/api/base-client";
import { isApiError } from "@/shared/api/http-error";
import {
  getAccessToken,
  getAccessTokenSessionVersion,
} from "./access-token-memory";
import {
  getSuccessfulAuthRefreshVersion,
  invalidateAuthSession,
  requestAuthSessionRefresh,
} from "./refresh-manager";

type ReadOptions = Parameters<typeof baseClient.get>[1];
type WriteOptions = Parameters<typeof baseClient.post>[2];
type AuthorizedOptions = { headers?: HeadersInit } | undefined;

export const authClient = {
  get<TResponse>(path: string, options?: ReadOptions) {
    return requestWithAuthRetry(
      (nextOptions) => baseClient.get<TResponse>(path, nextOptions),
      options,
    );
  },

  post<TResponse>(path: string, body?: unknown, options?: WriteOptions) {
    return requestWithAuthRetry(
      (nextOptions) => baseClient.post<TResponse>(path, body, nextOptions),
      options,
    );
  },

  put<TResponse>(path: string, body?: unknown, options?: WriteOptions) {
    return requestWithAuthRetry(
      (nextOptions) => baseClient.put<TResponse>(path, body, nextOptions),
      options,
    );
  },

  patch<TResponse>(path: string, body?: unknown, options?: WriteOptions) {
    return requestWithAuthRetry(
      (nextOptions) => baseClient.patch<TResponse>(path, body, nextOptions),
      options,
    );
  },

  delete<TResponse>(path: string, options?: ReadOptions) {
    return requestWithAuthRetry(
      (nextOptions) => baseClient.delete<TResponse>(path, nextOptions),
      options,
    );
  },
};

async function requestWithAuthRetry<
  TResponse,
  TOptions extends AuthorizedOptions,
>(
  request: (options: TOptions) => Promise<TResponse>,
  options: TOptions,
): Promise<TResponse> {
  const requestAccessToken = getAccessToken();
  const requestSessionVersion = getAccessTokenSessionVersion();
  const requestRefreshVersion = getSuccessfulAuthRefreshVersion();

  try {
    return await request(withAuthorization(options, requestAccessToken));
  } catch (error) {
    if (!isUnauthorized(error) || !requestAccessToken) {
      throw error;
    }

    if (getAccessTokenSessionVersion() !== requestSessionVersion) {
      throw error;
    }

    const currentAccessToken = getAccessToken();
    const currentRefreshVersion = getSuccessfulAuthRefreshVersion();

    if (
      currentAccessToken === requestAccessToken ||
      currentRefreshVersion === requestRefreshVersion
    ) {
      await requestAuthSessionRefresh();
    }

    if (getAccessTokenSessionVersion() !== requestSessionVersion) {
      throw error;
    }

    const refreshedAccessToken = getAccessToken();

    if (!refreshedAccessToken) {
      throw error;
    }

    try {
      return await request(withAuthorization(options, refreshedAccessToken));
    } catch (retryError) {
      if (isUnauthorized(retryError)) {
        await invalidateAuthSession();
      }

      throw retryError;
    }
  }
}

function withAuthorization<TOptions extends AuthorizedOptions>(
  options: TOptions,
  accessToken: string | null,
): TOptions {
  if (!accessToken) {
    return options;
  }

  const headers = new Headers(options?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return {
    ...(options ?? {}),
    headers,
  } as TOptions;
}

function isUnauthorized(error: unknown): boolean {
  return isApiError(error) && error.status === 401;
}
