/// <reference types="jest" />

import { baseClient } from "@/shared/api/base-client";
import { ApiError } from "@/shared/api/http-error";
import {
  beginAccessTokenSession,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "../access-token-memory";
import { authClient } from "../auth-client";
import { configureAuthSessionHandlers } from "../refresh-manager";

jest.mock("@/shared/api/base-client", () => ({
  baseClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const getMock = baseClient.get as jest.Mock;

describe("authClient", () => {
  let cleanupHandlers: (() => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    clearAccessToken();
  });

  afterEach(() => {
    cleanupHandlers?.();
    cleanupHandlers = undefined;
    clearAccessToken();
  });

  it("refreshes once and retries all concurrent unauthorized requests", async () => {
    const refreshStarted = createDeferred<void>();
    const releaseRefresh = createDeferred<void>();
    const refresh = jest.fn(async () => {
      refreshStarted.resolve();
      await releaseRefresh.promise;
      setAccessToken("new-access-token");
    });

    cleanupHandlers = configureAuthSessionHandlers({
      refresh,
      invalidate: jest.fn(),
    });
    beginAccessTokenSession("old-access-token");

    getMock.mockImplementation(
      async (_path: string, options?: { headers?: HeadersInit }) => {
        const authorization = getAuthorization(options);

        if (authorization === "Bearer old-access-token") {
          throw unauthorizedError();
        }

        return { authorization };
      },
    );

    const firstRequest = authClient.get("/profile");
    const secondRequest = authClient.get("/decks");

    await refreshStarted.promise;
    expect(refresh).toHaveBeenCalledTimes(1);

    releaseRefresh.resolve();

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      { authorization: "Bearer new-access-token" },
      { authorization: "Bearer new-access-token" },
    ]);
    expect(getMock).toHaveBeenCalledTimes(4);
  });

  it("invalidates the session when the retried request is unauthorized", async () => {
    const refresh = jest.fn(async () => {
      setAccessToken("new-access-token");
    });
    const invalidate = jest.fn(async () => {
      clearAccessToken();
    });

    cleanupHandlers = configureAuthSessionHandlers({ refresh, invalidate });
    beginAccessTokenSession("old-access-token");
    getMock.mockRejectedValue(unauthorizedError());

    await expect(authClient.get("/profile")).rejects.toMatchObject({
      status: 401,
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(getAccessToken()).toBeNull();
  });

  it("does not retry an old request after the active account changes", async () => {
    const refresh = jest.fn();
    const invalidate = jest.fn();

    cleanupHandlers = configureAuthSessionHandlers({ refresh, invalidate });
    beginAccessTokenSession("old-access-token");
    getMock.mockImplementation(async () => {
      beginAccessTokenSession("other-account-token");
      throw unauthorizedError();
    });

    await expect(authClient.get("/profile")).rejects.toMatchObject({
      status: 401,
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("other-account-token");
  });
});

function getAuthorization(options?: { headers?: HeadersInit }) {
  return new Headers(options?.headers).get("Authorization");
}

function unauthorizedError() {
  return new ApiError({
    status: 401,
    message: "Unauthorized",
  });
}

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}
