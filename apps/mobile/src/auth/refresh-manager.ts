type AuthSessionHandlers = {
  refresh: () => Promise<void>;
  invalidate: () => Promise<void>;
};

let handlers: AuthSessionHandlers | null = null;
let refreshPromise: Promise<void> | null = null;
let successfulRefreshVersion = 0;

export function configureAuthSessionHandlers(
  nextHandlers: AuthSessionHandlers,
): () => void {
  handlers = nextHandlers;

  return () => {
    if (handlers === nextHandlers) {
      handlers = null;
    }
  };
}

export function requestAuthSessionRefresh(): Promise<void> {
  if (refreshPromise) {
    return refreshPromise;
  }

  if (!handlers) {
    return Promise.reject(new Error("Auth session handlers are not configured."));
  }

  refreshPromise = handlers
    .refresh()
    .then(() => {
      successfulRefreshVersion += 1;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function invalidateAuthSession(): Promise<void> {
  return handlers?.invalidate() ?? Promise.resolve();
}

export function getSuccessfulAuthRefreshVersion(): number {
  return successfulRefreshVersion;
}
