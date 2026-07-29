/// <reference types="jest" />

import {
  configureAuthSessionHandlers,
  getSuccessfulAuthRefreshVersion,
  requestAuthSessionRefresh,
} from "../refresh-manager";

describe("refresh-manager", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("shares one refresh operation between concurrent callers", async () => {
    const refreshStarted = createDeferred<void>();
    const releaseRefresh = createDeferred<void>();
    const initialVersion = getSuccessfulAuthRefreshVersion();
    const refresh = jest.fn(async () => {
      refreshStarted.resolve();
      await releaseRefresh.promise;
    });

    cleanup = configureAuthSessionHandlers({
      refresh,
      invalidate: jest.fn(),
    });

    const firstRequest = requestAuthSessionRefresh();
    const secondRequest = requestAuthSessionRefresh();

    await refreshStarted.promise;

    expect(firstRequest).toBe(secondRequest);
    expect(refresh).toHaveBeenCalledTimes(1);

    releaseRefresh.resolve();
    await firstRequest;

    expect(getSuccessfulAuthRefreshVersion()).toBe(initialVersion + 1);
  });

  it("allows a new refresh after a failed operation", async () => {
    const refreshError = new Error("Refresh failed");
    const initialVersion = getSuccessfulAuthRefreshVersion();
    const refresh = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(refreshError)
      .mockResolvedValueOnce(undefined);

    cleanup = configureAuthSessionHandlers({
      refresh,
      invalidate: jest.fn(),
    });

    await expect(requestAuthSessionRefresh()).rejects.toBe(refreshError);
    await expect(requestAuthSessionRefresh()).resolves.toBeUndefined();

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(getSuccessfulAuthRefreshVersion()).toBe(initialVersion + 1);
  });

  it("rejects refresh requests when no session handlers are configured", async () => {
    await expect(requestAuthSessionRefresh()).rejects.toThrow(
      "Auth session handlers are not configured.",
    );
  });
});

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
